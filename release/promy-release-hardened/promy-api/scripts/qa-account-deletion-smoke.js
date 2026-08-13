const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const QA_BASE_URL = process.env.QA_BASE_URL || "http://localhost:4017/api";
const QA_IP = `203.0.113.${Math.floor(Math.random() * 120) + 140}`;
const PUSH_TOKEN = "ExponentPushToken[qa-account-deletion-smoke-token-0001]";

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
  return response.data;
}

async function main() {
  const runId = `account-deletion-${Date.now()}`;
  const email = `${runId}@promy.test`;
  const password = "Delete1234";
  let createdUserId = null;

  try {
    const register = await request("/auth/register", {
      method: "POST",
      body: JSON.stringify({
        fullName: "QA Delete User",
        email,
        password,
        phone: "3454223344",
      }),
    });

    assert(register.ok, `No se pudo registrar el usuario QA: ${JSON.stringify(register.data)}`);
    assert(register.data?.verification?.token, "El registro no devolvio token de verificacion");
    createdUserId = register.data?.user?.id ?? null;

    const verify = await request("/auth/verify-email", {
      method: "POST",
      body: JSON.stringify({
        token: register.data.verification.token,
      }),
    });
    assert(verify.ok, `No se pudo verificar el email: ${JSON.stringify(verify.data)}`);

    const session = await login(email, password);

    const registerPushToken = await request("/users/me/push-tokens", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${session.accessToken}`,
      },
      body: JSON.stringify({
        token: PUSH_TOKEN,
        platform: "android",
        deviceLabel: "QA Delete Device",
      }),
    });
    assert(
      registerPushToken.ok,
      `No se pudo registrar el push token QA: ${JSON.stringify(registerPushToken.data)}`,
    );

    const deleteAccount = await request("/users/me", {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${session.accessToken}`,
      },
    });
    assert(
      deleteAccount.ok,
      `No se pudo eliminar la cuenta cliente: ${JSON.stringify(deleteAccount.data)}`,
    );

    const loginAfterDelete = await request("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    assert(
      loginAfterDelete.status === 401,
      `Una cuenta eliminada no deberia iniciar sesion: ${JSON.stringify(loginAfterDelete.data)}`,
    );

    const deletedUser = await prisma.user.findUnique({
      where: { id: createdUserId },
      select: { id: true },
    });
    assert(!deletedUser, "La cuenta deberia haberse eliminado de la base");

    const [sessions, pushTokens, notifications] = await Promise.all([
      prisma.session.count({ where: { userId: createdUserId } }),
      prisma.pushToken.count({ where: { userId: createdUserId } }),
      prisma.appNotification.count({ where: { userId: createdUserId } }),
    ]);

    assert(sessions === 0, "Las sesiones del usuario eliminado deberian borrarse");
    assert(pushTokens === 0, "Los push tokens del usuario eliminado deberian borrarse");
    assert(
      notifications === 0,
      "Las notificaciones del usuario eliminado deberian borrarse",
    );

    console.log(
      JSON.stringify(
        {
          ok: true,
          runId,
          userId: createdUserId,
          message: "Smoke QA de eliminacion de cuenta completada correctamente.",
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
