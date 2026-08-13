const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const QA_BASE_URL = process.env.QA_BASE_URL || "http://localhost:4017/api";
const QA_IP = `203.0.113.${Math.floor(Math.random() * 120) + 20}`;

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function request(path, options = {}) {
  const response = await fetch(`${QA_BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "X-Forwarded-For": QA_IP,
      ...(options.headers || {}),
    },
  });

  const text = await response.text();
  let data = null;

  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  return {
    ok: response.ok,
    status: response.status,
    data,
  };
}

async function login(email, password) {
  const response = await request("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });

  assert(response.ok, `No se pudo iniciar sesion: ${JSON.stringify(response.data)}`);
  assert(response.data?.accessToken, "Login sin accessToken");
  assert(response.data?.refreshToken, "Login sin refreshToken");
  return response.data;
}

async function main() {
  const runId = `auth-smoke-${Date.now()}`;
  const email = `${runId}@promy.test`;
  const initialPassword = "Initial1234";
  const newPassword = "Updated1234";
  let createdUserId = null;

  try {
    const register = await request("/auth/register", {
      method: "POST",
      body: JSON.stringify({
        fullName: "QA Auth Smoke",
        email,
        password: initialPassword,
        phone: "3454001122",
      }),
    });

    assert(register.ok, `No se pudo registrar el usuario QA: ${JSON.stringify(register.data)}`);
    assert(register.data?.verification?.token, "El registro no devolvio token de verificacion");
    createdUserId = register.data?.user?.id ?? null;

    const resendVerification = await request("/auth/request-email-verification", {
      method: "POST",
      body: JSON.stringify({ email }),
    });
    assert(
      resendVerification.ok,
      `No se pudo reenviar la verificacion: ${JSON.stringify(resendVerification.data)}`,
    );
    assert(
      resendVerification.data?.verification?.token,
      "El reenvio no devolvio token de verificacion en development",
    );

    const verify = await request("/auth/verify-email", {
      method: "POST",
      body: JSON.stringify({
        token: resendVerification.data.verification.token,
      }),
    });
    assert(verify.ok, `No se pudo verificar el email: ${JSON.stringify(verify.data)}`);

    const session = await login(email, initialPassword);

    const me = await request("/auth/me", {
      headers: {
        Authorization: `Bearer ${session.accessToken}`,
      },
    });
    assert(me.ok, `No se pudo consultar /auth/me: ${JSON.stringify(me.data)}`);
    assert(me.data?.user?.emailVerifiedAt, "El usuario deberia figurar como verificado");

    const refresh = await request("/auth/refresh", {
      method: "POST",
      body: JSON.stringify({
        refreshToken: session.refreshToken,
      }),
    });
    assert(refresh.ok, `No se pudo refrescar la sesion: ${JSON.stringify(refresh.data)}`);
    assert(refresh.data?.accessToken, "Refresh sin accessToken");
    assert(refresh.data?.refreshToken, "Refresh sin refreshToken");
    assert(
      refresh.data.refreshToken !== session.refreshToken,
      "El refresh token deberia rotar al renovar la sesion",
    );

    const forgotPassword = await request("/auth/forgot-password", {
      method: "POST",
      body: JSON.stringify({ email }),
    });
    assert(
      forgotPassword.ok,
      `No se pudo iniciar forgot-password: ${JSON.stringify(forgotPassword.data)}`,
    );
    assert(forgotPassword.data?.reset?.token, "Forgot password no devolvio token en development");

    const resetPassword = await request("/auth/reset-password", {
      method: "POST",
      body: JSON.stringify({
        token: forgotPassword.data.reset.token,
        password: newPassword,
      }),
    });
    assert(
      resetPassword.ok,
      `No se pudo resetear la contrasena: ${JSON.stringify(resetPassword.data)}`,
    );

    const oldPasswordLogin = await request("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password: initialPassword }),
    });
    assert(
      oldPasswordLogin.status === 401,
      `La contrasena anterior no deberia seguir funcionando: ${JSON.stringify(oldPasswordLogin.data)}`,
    );

    const newSession = await login(email, newPassword);

    const logout = await request("/auth/logout", {
      method: "POST",
      body: JSON.stringify({
        refreshToken: newSession.refreshToken,
      }),
    });
    assert(logout.ok, `No se pudo cerrar sesion: ${JSON.stringify(logout.data)}`);

    const refreshAfterLogout = await request("/auth/refresh", {
      method: "POST",
      body: JSON.stringify({
        refreshToken: newSession.refreshToken,
      }),
    });
    assert(
      refreshAfterLogout.status === 401,
      `Un refresh token cerrado no deberia seguir activo: ${JSON.stringify(refreshAfterLogout.data)}`,
    );

    console.log(
      JSON.stringify(
        {
          ok: true,
          runId,
          userId: createdUserId,
          message: "Smoke QA de auth completada correctamente.",
        },
        null,
        2,
      ),
    );
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
