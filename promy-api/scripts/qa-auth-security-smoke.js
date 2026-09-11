const bcrypt = require("bcrypt");
const { PrismaClient } = require("@prisma/client");
const {
  assert,
  createMobileClient,
  createWebClient,
  loginMobile,
  loginWeb,
  logoutMobile,
  logoutWeb,
  refreshMobile,
  refreshWeb,
} = require("./qa-http-client");

const prisma = new PrismaClient();
const PASSWORD = "AuthSecurity1234";
const REFRESH_COOKIE_NAME = process.env.REFRESH_COOKIE_NAME || "promy_refresh_token";
const BASE_URL = process.env.QA_BASE_URL || "http://localhost:4017/api";

function clientForAttempt(batch, index) {
  return createMobileClient({ forwardedIp: `198.18.${40 + batch}.${index + 1}` });
}

async function readSseConnection(streamToken) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 3_000);

  try {
    const response = await fetch(
      `${BASE_URL}/realtime/events?streamToken=${encodeURIComponent(streamToken)}`,
      { signal: controller.signal },
    );
    const reader = response.body?.getReader();
    const chunk = reader ? await reader.read() : { value: null };
    await reader?.cancel().catch(() => undefined);
    return {
      status: response.status,
      contentType: response.headers.get("content-type"),
      receivedEvent: Boolean(chunk.value?.length),
    };
  } finally {
    clearTimeout(timeout);
  }
}

async function main() {
  const runId = `auth-security-${Date.now()}`;
  const passwordHash = await bcrypt.hash(PASSWORD, 10);
  const [clientUser, adminUser] = await prisma.$transaction([
    prisma.user.create({
      data: {
        fullName: "QA Auth Security Client",
        email: `${runId}-client@promy.test`,
        passwordHash,
        emailVerifiedAt: new Date(),
        role: "CLIENT",
        status: "ACTIVE",
      },
    }),
    prisma.user.create({
      data: {
        fullName: "QA Auth Security Admin",
        email: `${runId}-admin@promy.test`,
        passwordHash,
        emailVerifiedAt: new Date(),
        role: "ADMIN",
        status: "ACTIVE",
      },
    }),
  ]);

  const concurrencyResults = [];
  let clientAccessAfterLogoutStatus = null;

  try {
    for (const [batch, concurrency] of [2, 10, 100].entries()) {
      const loginClient = clientForAttempt(batch, 120);
      const session = await loginMobile(loginClient, clientUser.email, PASSWORD);
      const attempts = await Promise.all(
        Array.from({ length: concurrency }, (_, index) =>
          refreshMobile(clientForAttempt(batch, index), session.refreshToken),
        ),
      );
      const successes = attempts.filter((result) => result.status === 200);
      const safeRejections = attempts.filter((result) => result.status === 401);

      assert(
        successes.length === 1,
        `AUTH-001: concurrencia ${concurrency} produjo ${successes.length} rotaciones exitosas`,
      );
      assert(
        safeRejections.length === concurrency - 1,
        `AUTH-001: concurrencia ${concurrency} no rechazo el resto de forma segura`,
      );

      const firstWinnerToken = successes[0].data.refreshToken;
      const oldTokenReuse = await refreshMobile(clientForAttempt(batch, 121), session.refreshToken);
      assert(oldTokenReuse.status === 401, "AUTH-001: el refresh original revivio tras rotar");

      const normalRotation = await refreshMobile(clientForAttempt(batch, 122), firstWinnerToken);
      assert(normalRotation.status === 200, "AUTH-001: la sesion ganadora quedo corrupta");

      const deliberateReuse = await refreshMobile(clientForAttempt(batch, 123), firstWinnerToken);
      assert(deliberateReuse.status === 401, "AUTH-001: un refresh ya consumido fue reutilizado");

      const staleLogout = await logoutMobile(clientForAttempt(batch, 124), firstWinnerToken);
      assert(staleLogout.status === 200, "AUTH-001: logout idempotente con token antiguo fallo");

      const coherentRotation = await refreshMobile(
        clientForAttempt(batch, 125),
        normalRotation.data.refreshToken,
      );
      assert(
        coherentRotation.status === 200,
        "AUTH-001: reuse/logout antiguo invalido la sesion legitima",
      );

      const logout = await logoutMobile(
        clientForAttempt(batch, 126),
        coherentRotation.data.refreshToken,
      );
      assert(logout.status === 200, "AUTH-001: logout Mobile fallo");
      const refreshAfterLogout = await refreshMobile(
        clientForAttempt(batch, 127),
        coherentRotation.data.refreshToken,
      );
      assert(refreshAfterLogout.status === 401, "AUTH-001: refresh Mobile sobrevivio al logout");

      if (concurrency === 2) {
        const clientAccessAfterLogout = await loginClient.request("/auth/me", {
          headers: { Authorization: `Bearer ${session.accessToken}` },
        });
        clientAccessAfterLogoutStatus = clientAccessAfterLogout.status;
        assert(
          clientAccessAfterLogout.status === 200,
          "AUTH-002: cambio inesperado en politica de access CLIENT tras logout",
        );
      }

      concurrencyResults.push({
        concurrency,
        successfulRotations: successes.length,
        safeRejections: safeRejections.length,
      });
    }

    const loginBrowser = createWebClient({ forwardedIp: "198.18.50.1" });
    const adminSession = await loginWeb(loginBrowser, adminUser.email, PASSWORD);
    const initialCookie = loginBrowser.getCookie(REFRESH_COOKIE_NAME);
    const tabA = createWebClient({ forwardedIp: "198.18.50.1" });
    const tabB = createWebClient({ forwardedIp: "198.18.50.1" });
    tabA.setCookie(REFRESH_COOKIE_NAME, initialCookie);
    tabB.setCookie(REFRESH_COOKIE_NAME, initialCookie);

    const tabResults = await Promise.all([refreshWeb(tabA), refreshWeb(tabB)]);
    const winningTabIndex = tabResults.findIndex((result) => result.status === 200);
    const losingTabIndex = winningTabIndex === 0 ? 1 : 0;
    assert(winningTabIndex >= 0, "AUTH-001: ninguna tab Web gano la rotacion");
    assert(tabResults[losingTabIndex].status === 401, "AUTH-001: ambas tabs Web rotaron");
    assert(
      !tabResults[losingTabIndex].headers.get("set-cookie"),
      "AUTH-001: la respuesta perdedora intento borrar la cookie compartida",
    );
    const winningTab = winningTabIndex === 0 ? tabA : tabB;
    const nextWebRotation = await refreshWeb(winningTab);
    assert(nextWebRotation.status === 200, "AUTH-001: dos tabs corrompieron la sesion Web");

    const adminDashboard = await loginBrowser.request("/admin/dashboard", {
      headers: { Authorization: `Bearer ${adminSession.accessToken}` },
    });
    assert(adminDashboard.status === 200, "AUTH-002: access ADMIN inicial no funciono");

    const streamTokenResponse = await loginBrowser.request("/realtime/stream-token", {
      method: "POST",
      headers: { Authorization: `Bearer ${adminSession.accessToken}` },
    });
    assert(streamTokenResponse.status === 200, "AUTH-003: no se pudo emitir token SSE");
    const streamToken = streamTokenResponse.data.streamToken;

    const sseAsBearer = await loginBrowser.request("/admin/dashboard", {
      headers: { Authorization: `Bearer ${streamToken}` },
    });
    assert(sseAsBearer.status === 401, "AUTH-003: token SSE fue aceptado como Bearer API");

    const accessAsSse = await loginBrowser.request(
      `/realtime/events?streamToken=${encodeURIComponent(adminSession.accessToken)}`,
    );
    assert(accessAsSse.status === 401, "AUTH-003: access API fue aceptado como token SSE");

    const validSse = await readSseConnection(streamToken);
    assert(validSse.status === 200, "AUTH-003: token SSE valido fue rechazado");
    assert(validSse.receivedEvent, "AUTH-003: canal SSE valido no emitio evento inicial");

    await prisma.user.update({ where: { id: adminUser.id }, data: { status: "BLOCKED" } });
    const blockedAdmin = await loginBrowser.request("/admin/dashboard", {
      headers: { Authorization: `Bearer ${adminSession.accessToken}` },
    });
    assert(blockedAdmin.status === 403, "AUTH-002: ADMIN bloqueado conservo acceso");
    const blockedSse = await loginBrowser.request(
      `/realtime/events?streamToken=${encodeURIComponent(streamToken)}`,
    );
    assert(blockedSse.status === 403, "AUTH-002: ADMIN bloqueado pudo abrir SSE nuevo");

    await prisma.user.update({ where: { id: adminUser.id }, data: { status: "ACTIVE" } });
    const restoredAdmin = await loginBrowser.request("/admin/dashboard", {
      headers: { Authorization: `Bearer ${adminSession.accessToken}` },
    });
    assert(restoredAdmin.status === 200, "AUTH-002: restaurar ADMIN no recupero la sesion valida");

    const webLogout = await logoutWeb(winningTab);
    assert(webLogout.status === 200, "AUTH-002: logout Web fallo");
    const adminAfterLogout = await loginBrowser.request("/admin/dashboard", {
      headers: { Authorization: `Bearer ${adminSession.accessToken}` },
    });
    assert(adminAfterLogout.status === 401, "AUTH-002: access ADMIN sobrevivio al logout");

    console.log(JSON.stringify({
      smoke: "auth-security",
      auth001: {
        mobile: concurrencyResults,
        webTwoTabs: "one-winner-session-coherent",
        oldRefresh: "rejected",
        deliberateReuse: "rejected-session-preserved",
        refreshAfterLogout: "rejected",
      },
      auth002: {
        blockedAdminAccess: 403,
        adminAccessAfterLogout: 401,
        clientAccessAfterLogout: clientAccessAfterLogoutStatus,
        policy: "privileged-session-immediate-client-access-until-expiry",
      },
      auth003: {
        sseAsApiBearer: 401,
        accessAsSse: 401,
        validSse: 200,
      },
      status: "PASS",
    }));
  } finally {
    await prisma.user.deleteMany({ where: { id: { in: [clientUser.id, adminUser.id] } } });
    await prisma.$disconnect();
  }
}

main().catch(async (error) => {
  console.error(error);
  await prisma.$disconnect().catch(() => undefined);
  process.exit(1);
});
