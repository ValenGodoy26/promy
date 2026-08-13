const { PrismaClient, PromotionStatus } = require("@prisma/client");

const prisma = new PrismaClient();

const QA_BASE_URL = process.env.QA_BASE_URL || "http://localhost:4013/api";
const QA_TIMEOUT_MS = 75_000;
const QA_POLL_INTERVAL_MS = 5_000;

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

  assert(response.ok, `No se pudo loguear ${email}: ${JSON.stringify(response.data)}`);
  assert(response.data?.accessToken, `Login sin accessToken para ${email}`);

  return response.data.accessToken;
}

async function waitForExpiration(promotionId) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < QA_TIMEOUT_MS) {
    const promotion = await prisma.promotion.findUnique({
      where: { id: promotionId },
      select: {
        id: true,
        status: true,
        updatedAt: true,
      },
    });

    if (promotion?.status === PromotionStatus.EXPIRED) {
      return promotion;
    }

    await request(`/promotions?search=${promotionId}`).catch(() => undefined);
    await new Promise((resolve) => setTimeout(resolve, QA_POLL_INTERVAL_MS));
  }

  throw new Error(
    `La promocion ${promotionId} no paso a EXPIRED dentro de ${QA_TIMEOUT_MS / 1000}s`,
  );
}

async function main() {
  const runId = `expiration-smoke-${Date.now()}`;
  const commerceName = `QA Expiration ${runId}`;
  const promotionTitle = `QA Expired Promo ${runId}`;

  let commerce = null;
  let promotion = null;

  try {
    const health = await request("/health");
    assert(health.ok, "El QA server no responde en /health");

    const adminToken = await login("admin@promy.com", "demo1234");
    const commerceToken = await login("comercio@promy.com", "demo1234");

    const owner = await prisma.user.findUnique({
      where: { email: "comercio@promy.com" },
      select: { id: true },
    });
    const city = await prisma.city.findFirst({
      where: { slug: "concordia" },
      select: { id: true },
    });
    const category = await prisma.category.findFirst({
      where: { slug: "gastronomia" },
      select: { id: true },
    });

    assert(owner?.id, "No se encontro el usuario comercio demo");
    assert(city?.id, "No se encontro la ciudad Concordia");
    assert(category?.id, "No se encontro la categoria gastronomia");

    commerce = await prisma.commerce.create({
      data: {
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
      },
      select: {
        id: true,
        name: true,
      },
    });

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

    const publicPromotions = await request(
      `/promotions?search=${encodeURIComponent(promotionTitle)}`,
    );
    assert(publicPromotions.ok, "Fallo GET /promotions en smoke de expiracion");
    assert(
      Array.isArray(publicPromotions.data?.promotions) &&
        publicPromotions.data.promotions.length === 0,
      "La promo vencida no deberia aparecer en /promotions",
    );

    const publicSearch = await request(`/search?q=${encodeURIComponent(promotionTitle)}`);
    assert(publicSearch.ok, "Fallo GET /search en smoke de expiracion");
    assert(
      Array.isArray(publicSearch.data?.promotions) && publicSearch.data.promotions.length === 0,
      "La promo vencida no deberia aparecer en /search",
    );

    const mapSearch = await request(`/map/markers?search=${encodeURIComponent(commerceName)}`);
    assert(mapSearch.ok, "Fallo GET /map/markers en smoke de expiracion");
    const qaMarker = Array.isArray(mapSearch.data?.markers)
      ? mapSearch.data.markers.find((marker) => marker.name === commerceName)
      : null;
    assert(qaMarker, "No se encontro el comercio QA en /map/markers");
    assert(
      Array.isArray(qaMarker.promotions) && qaMarker.promotions.length === 0,
      "El marker del comercio QA no deberia exponer promociones vencidas",
    );

    const expiredPromotion = await waitForExpiration(promotion.id);

    const adminPromotions = await request(
      `/admin/promotions?search=${encodeURIComponent(promotionTitle)}`,
      {
        headers: {
          Authorization: `Bearer ${adminToken}`,
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

    const commercePromotions = await request("/commerce/promotions", {
      headers: {
        Authorization: `Bearer ${commerceToken}`,
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

    const reapprove = await request(`/admin/promotions/${promotion.id}/status`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${adminToken}`,
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

    await prisma.$disconnect();
  }
}

main().catch(async (error) => {
  console.error(error);
  await prisma.$disconnect().catch(() => undefined);
  process.exit(1);
});
