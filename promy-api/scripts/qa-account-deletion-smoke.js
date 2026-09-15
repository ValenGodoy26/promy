const { PrismaClient } = require("@prisma/client");
const { assert, createMobileClient, createWebClient, loginMobile, loginWeb } = require("./qa-http-client");

const prisma = new PrismaClient();
const QA_IP = `203.0.113.${Math.floor(Math.random() * 120) + 140}`;

async function main() {
  const runId = `account-deletion-${Date.now()}`;
  const email = `${runId}@promy.test`;
  const password = "Delete1234";
  const mobile = createMobileClient({ forwardedIp: QA_IP });
  const web = createWebClient({ forwardedIp: QA_IP });
  let createdUserId = null;
  let createdPromotionIds = [];

  try {
    const register = await mobile.request("/auth/register", {
      method: "POST",
      body: JSON.stringify({ fullName: "QA Delete User", email, password, phone: "3454223344" }),
    });
    assert(register.ok, "No se pudo registrar el usuario QA");
    createdUserId = register.data?.user?.id ?? null;
    const verify = await mobile.request("/auth/verify-email", {
      method: "POST",
      body: JSON.stringify({ token: register.data.verification.token }),
    });
    assert(verify.ok, "No se pudo verificar el email");

    const clientSession = await loginMobile(mobile, email, password);
    const commerceSession = await loginWeb(web, "comercio@promy.com", "demo1234");
    const adminSession = await loginWeb(web, "admin@promy.com", "demo1234");
    const commerce = await prisma.commerce.findFirstOrThrow({ where: { owner: { email: "comercio@promy.com" } } });
    const promotions = await Promise.all(
      ["uno", "dos", "pendiente"].map((suffix) => prisma.promotion.create({
        data: { commerceId: commerce.id, title: `Baja QA ${suffix}`, description: "Fixture sintético de privacidad", promotionType: "BENEFIT", validationMethod: "MANUAL_CODE", status: "APPROVED_VISIBLE" },
      })),
    );
    createdPromotionIds = promotions.map((item) => item.id);

    await prisma.redemption.createMany({ data: [
      { promotionId: promotions[0].id, commerceId: commerce.id, userId: createdUserId, validationMethod: "MANUAL_CODE", validationCode: `${runId}-1`, status: "SUCCESS", redeemedAt: new Date() },
      { promotionId: promotions[1].id, commerceId: commerce.id, userId: createdUserId, validationMethod: "MANUAL_CODE", validationCode: `${runId}-2`, status: "SUCCESS", redeemedAt: new Date() },
      { promotionId: promotions[2].id, commerceId: commerce.id, userId: createdUserId, validationMethod: "MANUAL_CODE", validationCode: `${runId}-3`, status: "PENDING" },
    ] });
    await prisma.pushToken.create({ data: { userId: createdUserId, token: `ExponentPushToken[${runId}]`, platform: "android", deviceLabel: "Synthetic QA" } });

    const successBefore = await prisma.redemption.count({ where: { status: "SUCCESS" } });
    const deleteAccount = await mobile.request("/users/me", { method: "DELETE", headers: { Authorization: `Bearer ${clientSession.accessToken}` } });
    assert(deleteAccount.ok, "No se pudo eliminar la cuenta cliente");
    assert(!JSON.stringify(deleteAccount.data).includes(email), "La baja no debe devolver PII eliminada");

    const [deletedUser, sessions, pushTokens, notifications, anonymousSuccess, pending, successAfter] = await Promise.all([
      prisma.user.findUnique({ where: { id: createdUserId } }),
      prisma.session.count({ where: { userId: createdUserId } }),
      prisma.pushToken.count({ where: { userId: createdUserId } }),
      prisma.appNotification.count({ where: { userId: createdUserId } }),
      prisma.redemption.count({ where: { promotionId: { in: createdPromotionIds.slice(0, 2) }, userId: null, status: "SUCCESS" } }),
      prisma.redemption.count({ where: { promotionId: promotions[2].id } }),
      prisma.redemption.count({ where: { status: "SUCCESS" } }),
    ]);
    assert(!deletedUser && sessions === 0 && pushTokens === 0 && notifications === 0, "La identidad y relaciones personales deben eliminarse");
    assert(anonymousSuccess === 2 && pending === 0, "Sólo los SUCCESS deben sobrevivir anónimos");
    assert(successAfter === successBefore, "Las métricas históricas no deben disminuir");

    const oldRefresh = await mobile.request("/auth/refresh", { method: "POST", body: JSON.stringify({ refreshToken: clientSession.refreshToken }) });
    const oldAccess = await mobile.request("/users/me", { headers: { Authorization: `Bearer ${clientSession.accessToken}` } });
    const relogin = await mobile.request("/auth/login", { method: "POST", body: JSON.stringify({ email, password }) });
    assert(oldRefresh.status >= 400 && oldAccess.status >= 400 && relogin.status === 401, "Credenciales eliminadas deben quedar inutilizables");

    const commerceHistory = await web.request("/commerce/redemptions?limit=100", { headers: { Authorization: `Bearer ${commerceSession.accessToken}` } });
    const adminDashboard = await web.request("/admin/dashboard", { headers: { Authorization: `Bearer ${adminSession.accessToken}` } });
    const serialized = JSON.stringify({ commerceHistory: commerceHistory.data, adminDashboard: adminDashboard.data });
    assert(commerceHistory.ok && adminDashboard.ok, "Commerce y ADMIN deben conservar el hecho histórico");
    assert(!serialized.includes(email) && !serialized.includes("QA Delete User"), "Commerce/ADMIN no deben recuperar PII eliminada");

    console.log(JSON.stringify({ smoke: "account-deletion-history", identity: "deleted", sessions: "revoked", nonHistoricalRelations: "deleted", successfulRedemptions: "preserved-anonymous", metrics: "preserved", commerceAndAdmin: "history-without-pii", status: "PASS" }));
  } finally {
    if (createdPromotionIds.length) await prisma.promotion.deleteMany({ where: { id: { in: createdPromotionIds } } });
    if (createdUserId) await prisma.user.deleteMany({ where: { id: createdUserId } });
    await prisma.$disconnect();
  }
}

main().catch(async (error) => {
  console.error(error instanceof Error ? error.message : error);
  await prisma.$disconnect().catch(() => undefined);
  process.exit(1);
});
