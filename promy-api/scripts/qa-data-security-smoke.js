const bcrypt = require("bcrypt");
const prisma = require("../dist/config/prisma").default;
const {
  loginSchema,
  registerClient,
  registerSchema,
  requestPasswordReset,
  resetPasswordSchema,
  resetUserPassword,
} = require("../dist/modules/auth/auth.service");
const { createBetaAccessRequest } = require("../dist/modules/beta/beta.service");
const { changeCurrentUserPasswordSchema } = require("../dist/modules/users/users.service");
const {
  clearTestEmailOutbox,
  getTestEmailOutbox,
} = require("../dist/shared/services/email.service");
const { buildSafeUploadFilename } = require("../dist/shared/services/uploads.service");
const { assert } = require("./qa-http-client");

const stamp = `${Date.now()}-${process.pid}`;
const email = `security-data-${stamp}@promy.test`;
const betaEmail = `security-beta-${stamp}@promy.test`;
const maliciousName = `<b>ATTACK</b> <a href="https://evil.example">click</a> " ' & < >`;
const maliciousCity = `<a href="https://evil.example">Concordia</a>`;
const exactly72Bytes = `Aa1${"x".repeat(69)}`;
const over72Bytes = `${exactly72Bytes}x`;
const multibyte73Bytes = `Aa1${"é".repeat(35)}`;

function assertEscapedEmail(emailMessage, rawValue, escapedFragment, context) {
  assert(!emailMessage.html.includes(rawValue), `${context} conserva HTML controlado por usuario`);
  assert(emailMessage.html.includes(escapedFragment), `${context} no conserva el dato como texto escapado`);
}

async function main() {
  const identity = await prisma.$queryRaw`SELECT DATABASE() AS databaseName`;
  assert(identity[0]?.databaseName === "promy_integration_test", "Smoke de seguridad fuera de la DB autorizada");
  assert(process.env.AUTH_EMAIL_PROVIDER === "test", "El smoke requiere el provider de email de test");

  try {
    clearTestEmailOutbox();
    await registerClient({
      fullName: maliciousName,
      email,
      password: "NormalPass123",
    });
    await new Promise((resolve) => setImmediate(resolve));

    const authEmails = getTestEmailOutbox();
    assert(authEmails.length >= 2, "El provider de test no capturo auth/onboarding");
    for (const message of authEmails) {
      assertEscapedEmail(message, "<b>ATTACK</b>", "&lt;b&gt;ATTACK&lt;/b&gt;", "Email auth/onboarding");
    }
    assert(
      authEmails.some((message) => /<a href="http:\/\/localhost:5173\/verify-email\?token=[^"]+">/.test(message.html)),
      "El enlace estatico de verificacion dejo de renderizarse",
    );

    clearTestEmailOutbox();
    await createBetaAccessRequest({
      email: betaEmail,
      city: maliciousCity,
      platform: "ANDROID",
      source: "landing",
    });
    const betaEmails = getTestEmailOutbox();
    assert(betaEmails.length === 1, "El provider de test no capturo el email beta");
    assertEscapedEmail(
      betaEmails[0],
      maliciousCity,
      "&lt;a href=&quot;https://evil.example&quot;&gt;Concordia&lt;/a&gt;",
      "Email beta",
    );

    assert(registerSchema.safeParse({ fullName: "Usuario QA", email, password: exactly72Bytes }).success, "Registro rechazo 72 bytes");
    assert(!registerSchema.safeParse({ fullName: "Usuario QA", email, password: over72Bytes }).success, "Registro acepto 73 bytes");
    assert(!resetPasswordSchema.safeParse({ token: "a".repeat(20), password: multibyte73Bytes }).success, "Reset acepto 73 bytes Unicode");
    assert(!changeCurrentUserPasswordSchema.safeParse({ currentPassword: "NormalPass123", nextPassword: over72Bytes }).success, "Cambio acepto 73 bytes");
    assert(loginSchema.safeParse({ email, password: over72Bytes }).success, "Login rompio compatibilidad con password existente largo");

    const reset = await requestPasswordReset({ email });
    assert(reset.reset?.token, "El provider de test no devolvio token de reset");
    let rejectedLongReset = false;
    try {
      await resetUserPassword({ token: reset.reset.token, password: over72Bytes });
    } catch (error) {
      rejectedLongReset = error?.name === "ZodError";
    }
    assert(rejectedLongReset, "El servicio de reset acepto un password sobre 72 bytes");
    await resetUserPassword({ token: reset.reset.token, password: exactly72Bytes });
    const updatedUser = await prisma.user.findUniqueOrThrow({ where: { email }, select: { passwordHash: true } });
    assert(await bcrypt.compare(exactly72Bytes, updatedUser.passwordHash), "Reset valido no actualizo el hash");

    const filenames = Array.from({ length: 1_000 }, () => buildSafeUploadFilename("../../same <script>.png"));
    assert(new Set(filenames).size === 1_000, "Los nombres de upload no son unicos");
    assert(
      filenames.every((filename) => /^[0-9a-f-]{36}-same-script-\.webp$/.test(filename) && !filename.includes("..")),
      "Los nombres de upload no conservan formato/path seguro",
    );

    console.log(JSON.stringify({
      smoke: "data-security",
      database: identity[0].databaseName,
      sec002: {
        provider: "test",
        authTemplates: authEmails.length,
        betaTemplates: betaEmails.length,
        userMarkupEscaped: true,
        productLinksPreserved: true,
      },
      sec003: {
        exact72Bytes: "accepted",
        byte73: "rejected",
        unicode73Bytes: "rejected",
        registrationResetChange: "covered",
        legacyLoginInput: "accepted",
      },
      upl001: {
        generated: filenames.length,
        unique: new Set(filenames).size,
        extension: "webp",
        pathSafe: true,
      },
      status: "PASS",
    }));
  } finally {
    clearTestEmailOutbox();
    await prisma.betaAccessRequest.deleteMany({ where: { email: betaEmail } });
    await prisma.user.deleteMany({ where: { email } });
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack || error.message : error);
  process.exit(1);
});
