const bcrypt = require("bcrypt");
const prisma = require("../dist/config/prisma").default;
const {
  validateCommerceRedemptionByCode,
} = require("../dist/modules/redemptions/redemptions.service");
const {
  assert,
  createMobileClient,
  createWebClient,
  loginMobile,
  loginWeb,
} = require("./qa-http-client");

const PASSWORD = "DomainIntegrity123!";
const DEMO_PASSWORD = "demo1234";
const stamp = `${Date.now()}-${process.pid}`;
const marker = `IntegrityProbe${process.pid}`;

function includesId(value, id) {
  if (Array.isArray(value)) return value.some((item) => includesId(item, id));
  if (!value || typeof value !== "object") return false;
  if (value.id === id) return true;
  return Object.values(value).some((item) => includesId(item, id));
}

async function createPromotion(commerceId, title, extra = {}) {
  return prisma.promotion.create({
    data: {
      commerceId,
      title,
      description: "Promocion sintetica para integridad de dominio",
      promotionType: "PERCENTAGE",
      validationMethod: "QR",
      discountValue: 20,
      status: "APPROVED_VISIBLE",
      startDate: new Date(Date.now() - 60_000),
      endDate: new Date(Date.now() + 3_600_000),
      ...extra,
    },
  });
}

async function createPendingRedemption({ promotionId, userId, commerceId, suffix }) {
  return prisma.redemption.create({
    data: {
      promotionId,
      userId,
      commerceId,
      validationMethod: "QR",
      validationCode: `DOMAIN-${stamp}-${suffix}`,
      status: "PENDING",
      validationExpiresAt: new Date(Date.now() + 3_600_000),
    },
  });
}

async function expectValidationRejected(ownerUserId, redemption, expectedCode) {
  let validationError = null;
  try {
    await validateCommerceRedemptionByCode({
      ownerUserId,
      validationCode: redemption.validationCode,
    });
  } catch (error) {
    validationError = error;
  }
  assert(
    validationError?.statusCode === 409 && validationError?.details?.code === expectedCode,
    `${expectedCode} no fue rechazado con el contrato esperado`,
  );
  const persisted = await prisma.redemption.findUnique({ where: { id: redemption.id } });
  assert(persisted.status === "CANCELLED", `${expectedCode} no cancelo el codigo pendiente`);
}

async function main() {
  const identity = await prisma.$queryRaw`SELECT DATABASE() AS databaseName`;
  assert(
    identity[0]?.databaseName === "promy_integration_test",
    `Base insegura para domain integrity: ${identity[0]?.databaseName || "desconocida"}`,
  );

  const [city, category] = await Promise.all([
    prisma.city.findFirst({ where: { isActive: true } }),
    prisma.category.findFirst({ where: { isActive: true } }),
  ]);
  assert(city && category, "Faltan ciudad/categoria activas para domain integrity");

  const passwordHash = await bcrypt.hash(PASSWORD, 8);
  const [owner, admin] = await Promise.all([
    prisma.user.findUnique({ where: { email: "comercio@promy.com" } }),
    prisma.user.findUnique({ where: { email: "admin@promy.com" } }),
  ]);
  assert(owner && admin, "Faltan usuarios demo para domain integrity");

  const clientRows = Array.from({ length: 120 }, (_, index) => ({
    fullName: `Domain Integrity Client ${index}`,
    email: `domain-client-${stamp}-${index}@promy.test`,
    passwordHash,
    role: "CLIENT",
    status: "ACTIVE",
    emailVerifiedAt: new Date(),
  }));
  await prisma.user.createMany({ data: clientRows });
  const clients = await prisma.user.findMany({
    where: { email: { startsWith: `domain-client-${stamp}-` } },
    orderBy: { id: "asc" },
  });

  const commerce = await prisma.commerce.update({
    where: { ownerUserId: owner.id },
    data: {
      name: `${marker} Commerce`,
      shortDescription: "Comercio sintetico de pruebas",
      description: "Comercio sintetico para verificar integridad de dominio",
      address: "QA 123",
      latitude: -31.392,
      longitude: -58.017,
      phone: "+5493456000000",
      logoUrl: "https://example.invalid/domain-logo.webp",
      coverUrl: "https://example.invalid/domain-cover.webp",
      status: "APPROVED",
      isHiddenByAdmin: false,
    },
  });

  const ownerHttp = createWebClient({ forwardedIp: "198.18.20.1" });
  const adminHttp = createWebClient({ forwardedIp: "198.18.20.2" });
  const clientHttp = createMobileClient({ forwardedIp: "198.18.20.3" });
  const ownerSession = await loginWeb(ownerHttp, owner.email, DEMO_PASSWORD);
  const adminSession = await loginWeb(adminHttp, admin.email, DEMO_PASSWORD);
  const clientSession = await loginMobile(clientHttp, clients[0].email, PASSWORD);

  const concurrencyResults = [];
  let clientOffset = 1;
  for (const concurrency of [2, 10, 100]) {
    const promotion = await createPromotion(
      commerce.id,
      `${marker} Cap ${concurrency}`,
      { maxRedemptions: 1 },
    );
    const redemptions = [];
    for (let index = 0; index < concurrency; index += 1) {
      redemptions.push(
        await createPendingRedemption({
          promotionId: promotion.id,
          userId: clients[clientOffset + index].id,
          commerceId: commerce.id,
          suffix: `cap-${concurrency}-${index}`,
        }),
      );
    }
    clientOffset += concurrency;

    const attempts = await Promise.allSettled(
      redemptions.map((redemption) =>
        validateCommerceRedemptionByCode({
          ownerUserId: owner.id,
          validationCode: redemption.validationCode,
        }),
      ),
    );
    const successRows = await prisma.redemption.count({
      where: { promotionId: promotion.id, status: "SUCCESS" },
    });
    const fulfilled = attempts.filter((result) => result.status === "fulfilled").length;
    const cleanCapRejections = attempts.filter(
      (result) =>
        result.status === "rejected" &&
        result.reason?.statusCode === 409 &&
        result.reason?.details?.code === "PROMOTION_CAP_REACHED",
    ).length;
    assert(successRows === 1, `RED-001: cupo 1 produjo ${successRows} exitos`);
    assert(fulfilled === 1, `RED-001: concurrencia ${concurrency} tuvo ${fulfilled} respuestas exitosas`);
    assert(
      cleanCapRejections === concurrency - 1,
      `RED-001: concurrencia ${concurrency} no rechazo limpiamente el resto`,
    );
    concurrencyResults.push({ concurrency, successRows, cleanCapRejections });
  }

  for (const scenario of ["expired", "rejected", "hidden"]) {
    const promotion = await createPromotion(commerce.id, `${marker} ${scenario}`);
    const redemption = await createPendingRedemption({
      promotionId: promotion.id,
      userId: clients[clientOffset++].id,
      commerceId: commerce.id,
      suffix: scenario,
    });
    const data =
      scenario === "expired"
        ? { status: "EXPIRED", endDate: new Date(Date.now() - 1_000) }
        : scenario === "rejected"
          ? { status: "REJECTED" }
          : { isHiddenByAdmin: true };
    await prisma.promotion.update({ where: { id: promotion.id }, data });
    await expectValidationRejected(owner.id, redemption, "PROMOTION_NOT_AVAILABLE");
  }

  const happyPromotion = await createPromotion(commerce.id, `${marker} Happy path`);
  const happyRedemption = await createPendingRedemption({
    promotionId: happyPromotion.id,
    userId: clients[clientOffset++].id,
    commerceId: commerce.id,
    suffix: "happy",
  });
  const happyResult = await validateCommerceRedemptionByCode({
    ownerUserId: owner.id,
    validationCode: happyRedemption.validationCode,
  });
  assert(happyResult.statusCode === 200, "RED-002 rompio el happy path de validacion");

  const selfPause = await ownerHttp.request("/commerce/me/status", {
    method: "PATCH",
    headers: { Authorization: `Bearer ${ownerSession.accessToken}` },
    body: JSON.stringify({ status: "INACTIVE" }),
  });
  assert(selfPause.status === 200, "COM-001: fallo la pausa legitima del comercio");
  const selfReactivate = await ownerHttp.request("/commerce/me/status", {
    method: "PATCH",
    headers: { Authorization: `Bearer ${ownerSession.accessToken}` },
    body: JSON.stringify({ status: "APPROVED" }),
  });
  assert(selfReactivate.status === 200, "COM-001: fallo la reactivacion legitima del comercio");

  const adminInactive = await adminHttp.request(`/admin/commerces/${commerce.id}/status`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${adminSession.accessToken}` },
    body: JSON.stringify({ status: "INACTIVE", note: "Suspension sintetica" }),
  });
  assert(adminInactive.status === 200, `COM-001: admin no pudo inactivar: ${adminInactive.status}`);
  const editorialUnhideWhileInactive = await adminHttp.request(
    `/admin/commerces/${commerce.id}`,
    {
      method: "PATCH",
      headers: { Authorization: `Bearer ${adminSession.accessToken}` },
      body: JSON.stringify({ isHiddenByAdmin: false, note: "Separar ocultamiento de suspension" }),
    },
  );
  assert(
    editorialUnhideWhileInactive.status === 200,
    "COM-001: no se pudo aislar suspension de ocultamiento editorial",
  );
  const forbiddenReactivate = await ownerHttp.request("/commerce/me/status", {
    method: "PATCH",
    headers: { Authorization: `Bearer ${ownerSession.accessToken}` },
    body: JSON.stringify({ status: "APPROVED" }),
  });
  assert(forbiddenReactivate.status === 409, "COM-001: owner levanto suspension administrativa");
  const suspended = await prisma.commerce.findUnique({ where: { id: commerce.id } });
  assert(suspended.status === "INACTIVE", "COM-001: cambio el estado suspendido en DB");

  const adminApproved = await adminHttp.request(`/admin/commerces/${commerce.id}/status`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${adminSession.accessToken}` },
    body: JSON.stringify({ status: "APPROVED", note: "Restauracion sintetica" }),
  });
  assert(adminApproved.status === 200, "Admin no pudo restaurar el comercio para MOD-001");
  const adminUnhide = await adminHttp.request(`/admin/commerces/${commerce.id}`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${adminSession.accessToken}` },
    body: JSON.stringify({ isHiddenByAdmin: false, note: "Visible para prueba" }),
  });
  assert(adminUnhide.status === 200, "Admin no pudo desocultar el comercio para MOD-001");

  const publicPromotion = await createPromotion(commerce.id, `${marker} Public`);
  const pendingBeforeHide = await createPendingRedemption({
    promotionId: publicPromotion.id,
    userId: clients[clientOffset++].id,
    commerceId: commerce.id,
    suffix: "commerce-hidden-validation",
  });
  const hideCommerce = await adminHttp.request(`/admin/commerces/${commerce.id}`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${adminSession.accessToken}` },
    body: JSON.stringify({ isHiddenByAdmin: true, note: "MOD-001" }),
  });
  assert(hideCommerce.status === 200, "MOD-001: admin no pudo ocultar comercio");

  const publicChecks = await Promise.all([
    clientHttp.request(`/promotions?search=${marker}`),
    clientHttp.request(`/search?q=${marker}`),
    clientHttp.request(`/promotions/nearby?lat=-31.392&lng=-58.017&radiusKm=8&search=${marker}`),
    clientHttp.request(`/map/markers?lat=-31.392&lng=-58.017&radiusKm=8&search=${marker}`),
    clientHttp.request(`/commerces?search=${marker}`),
    clientHttp.request(`/commerces/nearby?lat=-31.392&lng=-58.017&radiusKm=8&search=${marker}`),
  ]);
  for (const response of publicChecks) {
    assert(response.status === 200, `MOD-001: canal publico respondio ${response.status}`);
    assert(
      !JSON.stringify(response.data).includes(marker),
      "MOD-001: canal publico expuso comercio o promo ocultos",
    );
  }
  const commerceDetail = await clientHttp.request(`/commerces/${commerce.id}`);
  const promotionDetail = await clientHttp.request(`/promotions/${publicPromotion.id}`);
  assert(commerceDetail.status === 404, "MOD-001: detalle expuso comercio oculto");
  assert(promotionDetail.status === 404, "MOD-001: detalle expuso promo de comercio oculto");
  const hiddenCreate = await clientHttp.request("/redemptions", {
    method: "POST",
    headers: { Authorization: `Bearer ${clientSession.accessToken}` },
    body: JSON.stringify({ promotionId: publicPromotion.id }),
  });
  assert(hiddenCreate.status === 404, "MOD-001: se creo canje en comercio oculto");
  await expectValidationRejected(owner.id, pendingBeforeHide, "PROMOTION_NOT_AVAILABLE");

  await adminHttp.request(`/admin/commerces/${commerce.id}`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${adminSession.accessToken}` },
    body: JSON.stringify({ isHiddenByAdmin: false, note: "MOD-002" }),
  });
  const cachePromotion = await prisma.promotion.create({
    data: {
      commerceId: commerce.id,
      title: `${marker} Cache`,
      description: "Promocion sintetica para cache",
      promotionType: "PERCENTAGE",
      validationMethod: "QR",
      discountValue: 20,
      status: "PENDING_REVIEW",
      isFeatured: true,
      featuredRank: -1000,
      startDate: new Date(Date.now() - 60_000),
      endDate: new Date(Date.now() + 3_600_000),
    },
  });
  const approveCachePromotion = await adminHttp.request(
    `/admin/promotions/${cachePromotion.id}/status`,
    {
      method: "PATCH",
      headers: { Authorization: `Bearer ${adminSession.accessToken}` },
      body: JSON.stringify({ status: "APPROVED_VISIBLE" }),
    },
  );
  assert(approveCachePromotion.status === 200, "MOD-002: no se pudo aprobar promo de cache");
  const warmed = await clientHttp.request("/promotions/featured");
  assert(includesId(warmed.data, cachePromotion.id), "MOD-002: no se calento cache con la promo");
  const ownerEdit = await ownerHttp.request(`/commerce/promotions/${cachePromotion.id}`, {
    method: "PUT",
    headers: { Authorization: `Bearer ${ownerSession.accessToken}` },
    body: JSON.stringify({ title: `${marker} Cache edited` }),
  });
  assert(ownerEdit.status === 200, `MOD-002: edicion owner fallo ${ownerEdit.status}`);
  const editedState = await prisma.promotion.findUnique({ where: { id: cachePromotion.id } });
  assert(editedState.status === "PENDING_REVIEW", "MOD-002: edicion no regreso a revision");
  const afterEdit = await clientHttp.request("/promotions/featured");
  assert(!includesId(afterEdit.data, cachePromotion.id), "MOD-002: cache expuso promo retirada");

  const reapproveCachePromotion = await adminHttp.request(
    `/admin/promotions/${cachePromotion.id}/status`,
    {
      method: "PATCH",
      headers: { Authorization: `Bearer ${adminSession.accessToken}` },
      body: JSON.stringify({ status: "APPROVED_VISIBLE" }),
    },
  );
  assert(reapproveCachePromotion.status === 200, "MOD-002: no se pudo reaprobar promo");
  const rewarmed = await clientHttp.request("/promotions/featured");
  assert(includesId(rewarmed.data, cachePromotion.id), "MOD-002: no se recalento cache");
  await prisma.promotion.update({
    where: { id: cachePromotion.id },
    data: { isHiddenByAdmin: true },
  });
  const defenseInDepth = await clientHttp.request("/promotions/featured");
  assert(
    !includesId(defenseInDepth.data, cachePromotion.id),
    "MOD-002: revalidacion defensiva sirvio contenido retirado",
  );

  console.log(
    JSON.stringify({
      smoke: "domain-integrity",
      database: identity[0].databaseName,
      red001: concurrencyResults,
      red002: ["expired", "rejected", "hidden", "happy-path"],
      com001: "self-pause-preserved-admin-reactivation-blocked",
      mod001: "catalog-search-nearby-map-details-redemption-blocked",
      mod002: "warm-cache-invalidated-and-live-eligibility-revalidated",
      status: "PASS",
    }),
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
