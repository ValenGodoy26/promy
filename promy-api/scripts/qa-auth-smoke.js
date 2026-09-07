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
const QA_IP = `203.0.113.${Math.floor(Math.random() * 120) + 20}`;

async function main() {
  const runId = `auth-smoke-${Date.now()}`;
  const email = `${runId}@promy.test`;
  const initialPassword = "Initial1234";
  const newPassword = "Updated1234";
  const mobile = createMobileClient({ forwardedIp: QA_IP });
  const web = createWebClient({ forwardedIp: QA_IP });
  let createdUserId = null;

  try {
    const register = await mobile.request("/auth/register", {
      method: "POST",
      body: JSON.stringify({
        fullName: "QA Auth Smoke",
        email,
        password: initialPassword,
        phone: "3454001122",
      }),
    });

    assert(register.ok, `No se pudo registrar el usuario QA: ${JSON.stringify(register.data)}`);
    assert(register.data?.verification?.token, "El provider test no devolvio token de verificacion");
    createdUserId = register.data?.user?.id ?? null;

    const resendVerification = await mobile.request("/auth/request-email-verification", {
      method: "POST",
      body: JSON.stringify({ email }),
    });
    assert(
      resendVerification.ok,
      `No se pudo reenviar la verificacion: ${JSON.stringify(resendVerification.data)}`,
    );
    assert(
      resendVerification.data?.verification?.token,
      "El provider test no devolvio token al reenviar la verificacion",
    );

    const verify = await mobile.request("/auth/verify-email", {
      method: "POST",
      body: JSON.stringify({ token: resendVerification.data.verification.token }),
    });
    assert(verify.ok, `No se pudo verificar el email: ${JSON.stringify(verify.data)}`);

    const mobileSession = await loginMobile(mobile, email, initialPassword);
    const me = await mobile.request("/auth/me", {
      headers: { Authorization: `Bearer ${mobileSession.accessToken}` },
    });
    assert(me.ok, `No se pudo consultar /auth/me: ${JSON.stringify(me.data)}`);
    assert(me.data?.user?.emailVerifiedAt, "El usuario deberia figurar como verificado");

    const mobileRefresh = await refreshMobile(mobile, mobileSession.refreshToken);
    assert(mobileRefresh.ok, `No se pudo refrescar mobile: ${JSON.stringify(mobileRefresh.data)}`);
    assert(mobileRefresh.data?.accessToken, "Refresh mobile sin accessToken");
    assert(mobileRefresh.data?.refreshToken, "Refresh mobile sin refreshToken");
    assert(
      mobileRefresh.data.refreshToken !== mobileSession.refreshToken,
      "El refresh token mobile deberia rotar",
    );

    const reusedRotatedToken = await refreshMobile(mobile, mobileSession.refreshToken);
    assert(
      reusedRotatedToken.status === 401,
      `Un refresh token rotado no debe reutilizarse: ${JSON.stringify(reusedRotatedToken.data)}`,
    );

    const forgotPassword = await mobile.request("/auth/forgot-password", {
      method: "POST",
      body: JSON.stringify({ email }),
    });
    assert(forgotPassword.ok, `No se pudo iniciar forgot-password: ${JSON.stringify(forgotPassword.data)}`);
    assert(forgotPassword.data?.reset?.token, "El provider test no devolvio token de reset");

    const resetPassword = await mobile.request("/auth/reset-password", {
      method: "POST",
      body: JSON.stringify({ token: forgotPassword.data.reset.token, password: newPassword }),
    });
    assert(resetPassword.ok, `No se pudo resetear la contrasena: ${JSON.stringify(resetPassword.data)}`);

    const oldPasswordLogin = await mobile.request("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password: initialPassword }),
    });
    assert(oldPasswordLogin.status === 401, "La contrasena anterior no deberia funcionar");

    const webSession = await loginWeb(web, email, newPassword);
    const webCookieBeforeRefresh = web.getCookie("promy_refresh_token");
    const webRefresh = await refreshWeb(web);
    assert(webRefresh.ok, `No se pudo refrescar web: ${JSON.stringify(webRefresh.data)}`);
    assert(webRefresh.data?.accessToken, "Refresh web sin accessToken");
    assert(!webRefresh.data?.refreshToken, "Refresh web no debe exponer refreshToken en JSON");
    assert(
      web.getCookie("promy_refresh_token") !== webCookieBeforeRefresh,
      "La cookie httpOnly web deberia rotar",
    );
    assert(webSession.accessToken, "Login web sin accessToken");

    const webLogout = await logoutWeb(web);
    assert(webLogout.ok, `No se pudo cerrar la sesion web: ${JSON.stringify(webLogout.data)}`);
    const webRefreshAfterLogout = await refreshWeb(web);
    assert(webRefreshAfterLogout.status === 400, "Web sin cookie no deberia poder refrescar");

    const finalMobileSession = await loginMobile(mobile, email, newPassword);
    const mobileLogout = await logoutMobile(mobile, finalMobileSession.refreshToken);
    assert(mobileLogout.ok, `No se pudo cerrar la sesion mobile: ${JSON.stringify(mobileLogout.data)}`);
    const mobileRefreshAfterLogout = await refreshMobile(mobile, finalMobileSession.refreshToken);
    assert(
      mobileRefreshAfterLogout.status === 401,
      `Un refresh cerrado no debe seguir activo: ${JSON.stringify(mobileRefreshAfterLogout.data)}`,
    );

    console.log(JSON.stringify({
      ok: true,
      runId,
      userId: createdUserId,
      contracts: ["mobile-body-refresh", "web-http-only-cookie"],
      message: "Smoke QA de auth completada correctamente.",
    }, null, 2));
  } finally {
    if (createdUserId) {
      await prisma.session.deleteMany({ where: { userId: createdUserId } });
      await prisma.pushToken.deleteMany({ where: { userId: createdUserId } });
      await prisma.appNotification.deleteMany({ where: { userId: createdUserId } });
      await prisma.user.deleteMany({ where: { id: createdUserId } });
    }

    await prisma.$disconnect();
  }
}

main().catch(async (error) => {
  console.error(error);
  await prisma.$disconnect().catch(() => undefined);
  process.exit(1);
});
