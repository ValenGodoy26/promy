const bcrypt = require("bcrypt");
const { PrismaClient, PromotionStatus, UserRole, UserStatus } = require("@prisma/client");
const { createCommerceWithLocation } = require("../prisma/commerce.spatial");
const { assert, createWebClient, loginWeb } = require("./qa-http-client");
const { expireOverduePromotions } = require("../dist/shared/utils/promotionExpiration");
const appPrisma = require("../dist/config/prisma").default;

const prisma = new PrismaClient();

async function materializeExpiration(promotionId) {
  const affectedCount = await expireOverduePromotions({
    force: true,
    source: "qa-expiration-smoke",
  });
  assert(affectedCount >= 1, "El barrido real no materializo la promocion vencida");

  const promotion = await prisma.promotion.findUnique({
    where: { id: promotionId },
    select: { id: true, status: true, updatedAt: true },
  });
  assert(promotion?.status === PromotionStatus.EXPIRED, "La promocion no quedo EXPIRED");
  return promotion;
}

async function main() {
  const runId = `expiration-smoke-${Date.now()}`;
  const commerceName = `QA Expiration ${runId}`;
  const promotionTitle = `QA Expired Promo ${runId}`;
  const email = `${runId}@promy.test`;
  const password = "Expiration1234";
  const publicApi = createWebClient();
  const adminApi = createWebClient({ forwardedIp: "203.0.113.61" });
  const commerceApi = createWebClient({ forwardedIp: "203.0.113.62" });

  let owner = null;
  let commerce = null;
  let promotion = null;

  try {
    const health = await publicApi.request("/health");
    assert(health.ok, "El QA server no responde en /health");

    const adminSession = await loginWeb(adminApi, "admin@promy.com", "demo1234");

    const city = await prisma.city.findFirst({
      where: { slug: "concordia" },
      select: { id: true },
    });
    const category = await prisma.category.findFirst({
      where: { slug: "gastronomia" },
      select: { id: true },
    });

    assert(city?.id, "No se encontro la ciudad Concordia");
    assert(category?.id, "No se encontro la categoria gastronomia");

    owner = await prisma.user.create({
      data: {
        fullName: `QA Expiration ${runId}`,
        email,
        passwordHash: await bcrypt.hash(password, 10),
        emailVerifiedAt: new Date(),
        role: UserRole.COMMERCE,
        status: UserStatus.ACTIVE,
      },
      select: { id: true },
    });

    commerce = await createCommerceWithLocation(prisma, {
        ownerUserId: owner.id,
        cityId: city.id,
        categoryId: category.id,
        name: commerceName,
        slug: `${runId}-commerce`,
        shortDescription: "Smoke QA expiracion",
        description: "Comercio temporal para validar expiracion de promociones.",
        address: "QA Street 4013",
        latitude: -31.392,
        longitude: -58.021,
        status: "APPROVED",
    });
    const commerceSession = await loginWeb(commerceApi, email, password);

    promotion = await prisma.promotion.create({
      data: {
        commerceId: commerce.id,
        title: promotionTitle,
        description: "Promocion temporal para smoke QA de expiracion.",
        promotionType: "BENEFIT",
        validationMethod: "QR",
        status: "APPROVED_VISIBLE",
        startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        endDate: new Date(Date.now() - 24 * 60 * 60 * 1000),
      },
      select: {
        id: true,
        title: true,
        status: true,
      },
    });

    const publicPromotions = await publicApi.request(
      `/promotions?search=${encodeURIComponent(promotionTitle)}`,
    );
    assert(publicPromotions.ok, "Fallo GET /promotions en smoke de expiracion");
    assert(
      Array.isArray(publicPromotions.data?.promotions) &&
        publicPromotions.data.promotions.length === 0,
      "La promo vencida no deberia aparecer en /promotions",
    );

    const publicSearch = await publicApi.request(`/search?q=${encodeURIComponent(promotionTitle)}`);
    assert(publicSearch.ok, "Fallo GET /search en smoke de expiracion");
    assert(
      Array.isArray(publicSearch.data?.promotions) && publicSearch.data.promotions.length === 0,
      "La promo vencida no deberia aparecer en /search",
    );

    const nearby = await publicApi.request(
      `/promotions/nearby?lat=-31.392&lng=-58.021&radiusKm=5&search=${encodeURIComponent(promotionTitle)}`,
    );
    assert(nearby.ok, "Fallo GET /promotions/nearby en smoke de expiracion");
    assert(
      Array.isArray(nearby.data?.promotions) && nearby.data.promotions.length === 0,
      "La promo vencida no deberia aparecer en /promotions/nearby",
    );

    const mapSearch = await publicApi.request(`/map/markers?search=${encodeURIComponent(commerceName)}`);
    assert(mapSearch.ok, "Fallo GET /map/markers en smoke de expiracion");
    const qaMarker = Array.isArray(mapSearch.data?.markers)
      ? mapSearch.data.markers.find((marker) => marker.name === commerceName)
      : null;
    assert(qaMarker, "No se encontro el comercio QA en /map/markers");
    assert(
      Array.isArray(qaMarker.promotions) && qaMarker.promotions.length === 0,
      "El marker del comercio QA no deberia exponer promociones vencidas",
    );

    const expiredPromotion = await materializeExpiration(promotion.id);

    const adminPromotions = await adminApi.request(
      `/admin/promotions?search=${encodeURIComponent(promotionTitle)}`,
      {
        headers: {
          Authorization: `Bearer ${adminSession.accessToken}`,
        },
      },
    );
    assert(adminPromotions.ok, "Fallo GET /admin/promotions en smoke de expiracion");
    const adminPromotion = adminPromotions.data?.promotions?.find((item) => item.id === promotion.id);
    assert(adminPromotion, "Admin no encontro la promo QA");
    assert(
      adminPromotion.status === PromotionStatus.EXPIRED,
      "Admin deberia ver la promo QA como EXPIRED",
    );

    const commercePromotions = await commerceApi.request("/commerce/promotions", {
      headers: {
        Authorization: `Bearer ${commerceSession.accessToken}`,
      },
    });
    assert(commercePromotions.ok, "Fallo GET /commerce/promotions en smoke de expiracion");
    const commercePromotion = commercePromotions.data?.promotions?.find(
      (item) => item.id === promotion.id,
    );
    assert(commercePromotion, "Comercio no encontro la promo QA");
    assert(
      commercePromotion.status === PromotionStatus.EXPIRED,
      "Comercio deberia ver la promo QA como EXPIRED",
    );

    const reapprove = await adminApi.request(`/admin/promotions/${promotion.id}/status`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${adminSession.accessToken}`,
      },
      body: JSON.stringify({
        status: "APPROVED_VISIBLE",
      }),
    });
    assert(reapprove.status === 409, "Admin deberia recibir 409 al reaprobar una promo vencida");
    assert(
      typeof reapprove.data?.message === "string" && reapprove.data.message.includes("ya vencio"),
      "El mensaje de bloqueo de reaprobacion no fue el esperado",
    );

    console.log(
      JSON.stringify(
        {
          ok: true,
          runId,
          checkedPromotionId: promotion.id,
          checkedCommerceId: commerce.id,
          expiredStatus: expiredPromotion.status,
          reapproveStatusCode: reapprove.status,
          message: "Smoke QA de expiracion completada correctamente.",
        },
        null,
        2,
      ),
    );
  } finally {
    if (promotion?.id) {
      await prisma.redemption.deleteMany({
        where: { promotionId: promotion.id },
      });

      await prisma.adminActionLog.deleteMany({
        where: { promotionId: promotion.id },
      });

      await prisma.promotion.deleteMany({
        where: { id: promotion.id },
      });
    }

    if (commerce?.id) {
      await prisma.adminActionLog.deleteMany({
        where: { commerceId: commerce.id },
      });

      await prisma.commerce.deleteMany({
        where: { id: commerce.id },
      });
    }

    if (owner?.id) {
      await prisma.session.deleteMany({ where: { userId: owner.id } });
      await prisma.appNotification.deleteMany({ where: { userId: owner.id } });
      await prisma.user.deleteMany({ where: { id: owner.id } });
    }

    await prisma.$disconnect();
    await appPrisma.$disconnect();
  }
}

main().catch(async (error) => {
  console.error(error);
  await prisma.$disconnect().catch(() => undefined);
  await appPrisma.$disconnect().catch(() => undefined);
  process.exit(1);
});
