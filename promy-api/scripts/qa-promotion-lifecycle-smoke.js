const bcrypt = require("bcrypt");
const { PrismaClient, PromotionStatus, UserRole, UserStatus } = require("@prisma/client");
const { createCommerceWithLocation } = require("../prisma/commerce.spatial");
const { assert, createWebClient, loginWeb } = require("./qa-http-client");

const prisma = new PrismaClient();

async function main() {
  const runId = `promo-lifecycle-${Date.now()}`;
  const password = "demo1234";
  const email = `${runId}@promy.test`;
  const commerceName = `QA Lifecycle ${runId}`;
  const basePromotionTitle = `QA Promo ${runId}`;
  const publicApi = createWebClient();
  const adminApi = createWebClient({ forwardedIp: "203.0.113.51" });
  const commerceApi = createWebClient({ forwardedIp: "203.0.113.52" });

  let createdUser = null;
  let createdCommerce = null;
  let createdPromotionId = null;

  try {
    const health = await publicApi.request("/health");
    assert(health.ok, "El QA server no responde en /health");

    const adminSession = await loginWeb(adminApi, "admin@promy.com", password);

    const [city, category] = await Promise.all([
      prisma.city.findFirst({
        where: { slug: "concordia" },
        select: { id: true },
      }),
      prisma.category.findFirst({
        where: { slug: "gastronomia" },
        select: { id: true },
      }),
    ]);

    assert(city?.id, "No se encontro la ciudad Concordia");
    assert(category?.id, "No se encontro la categoria gastronomia");

    const passwordHash = await bcrypt.hash(password, 10);

    createdUser = await prisma.user.create({
      data: {
        fullName: `QA Commerce ${runId}`,
        email,
        passwordHash,
        emailVerifiedAt: new Date(),
        role: UserRole.COMMERCE,
        status: UserStatus.ACTIVE,
      },
      select: { id: true, email: true },
    });

    createdCommerce = await createCommerceWithLocation(prisma, {
        ownerUserId: createdUser.id,
        cityId: city.id,
        categoryId: category.id,
        name: commerceName,
        slug: `${runId}-commerce`,
        shortDescription: "Smoke QA lifecycle",
        description: "Comercio temporal para validar el lifecycle de promociones.",
        address: "QA Street 4013",
        latitude: -31.392,
        longitude: -58.021,
        phone: "+5493450000000",
        instagram: "@qa.lifecycle",
        status: "APPROVED",
    });

    const commerceSession = await loginWeb(commerceApi, email, password);

    const createdDraft = await commerceApi.request("/commerce/promotions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${commerceSession.accessToken}`,
      },
      body: JSON.stringify({
        title: basePromotionTitle,
        description: "Promo temporal para smoke QA del lifecycle.",
        promotionType: "BENEFIT",
        validationMethod: "QR",
        status: "DRAFT",
      }),
    });
    assert(createdDraft.ok, `No se pudo crear promo draft: ${JSON.stringify(createdDraft.data)}`);
    assert(
      createdDraft.data?.promotion?.status === PromotionStatus.DRAFT,
      "La promo creada deberia quedar en DRAFT",
    );
    createdPromotionId = createdDraft.data.promotion.id;

    const sentToReview = await commerceApi.request(`/commerce/promotions/${createdPromotionId}`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${commerceSession.accessToken}`,
      },
      body: JSON.stringify({
        status: "PENDING_REVIEW",
      }),
    });
    assert(sentToReview.ok, "El comercio no pudo mandar la promo a revision");
    assert(
      sentToReview.data?.promotion?.status === PromotionStatus.PENDING_REVIEW,
      "La promo deberia pasar a PENDING_REVIEW",
    );

    const rejected = await adminApi.request(`/admin/promotions/${createdPromotionId}/status`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${adminSession.accessToken}`,
      },
      body: JSON.stringify({
        status: "REJECTED",
        note: "Falta una descripcion mas clara para aprobacion.",
      }),
    });
    assert(rejected.ok, `Admin no pudo rechazar promo: ${JSON.stringify(rejected.data)}`);
    assert(
      rejected.data?.promotion?.status === PromotionStatus.REJECTED,
      "La promo deberia quedar en REJECTED",
    );

    const resubmitted = await commerceApi.request(`/commerce/promotions/${createdPromotionId}`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${commerceSession.accessToken}`,
      },
      body: JSON.stringify({
        title: `${basePromotionTitle} Ajustada`,
      }),
    });
    assert(resubmitted.ok, `Comercio no pudo corregir y reenviar: ${JSON.stringify(resubmitted.data)}`);
    assert(
      resubmitted.data?.promotion?.status === PromotionStatus.PENDING_REVIEW,
      "La promo rechazada deberia volver a PENDING_REVIEW al corregirse",
    );
    assert(
      !resubmitted.data?.promotion?.moderationNote,
      "La observacion deberia limpiarse al reenviar la promo a revision",
    );

    const approved = await adminApi.request(`/admin/promotions/${createdPromotionId}/status`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${adminSession.accessToken}`,
      },
      body: JSON.stringify({
        status: "APPROVED_VISIBLE",
      }),
    });
    assert(approved.ok, `Admin no pudo aprobar promo: ${JSON.stringify(approved.data)}`);
    assert(
      approved.data?.promotion?.status === PromotionStatus.APPROVED_VISIBLE,
      "La promo deberia quedar en APPROVED_VISIBLE",
    );

    const publicPromotions = await publicApi.request(
      `/promotions?search=${encodeURIComponent(`${basePromotionTitle} Ajustada`)}`,
    );
    assert(publicPromotions.ok, "Fallo GET /promotions en smoke lifecycle");
    assert(
      publicPromotions.data?.promotions?.some((item) => item.id === createdPromotionId),
      "La promo aprobada deberia aparecer en el catalogo publico",
    );

    const publicSearch = await publicApi.request(
      `/search?q=${encodeURIComponent(`${basePromotionTitle} Ajustada`)}`,
    );
    assert(publicSearch.ok, "Fallo GET /search en smoke lifecycle");
    assert(
      publicSearch.data?.promotions?.some((item) => item.id === createdPromotionId),
      "La promo aprobada deberia aparecer en /search",
    );

    const mapMarkers = await publicApi.request(`/map/markers?search=${encodeURIComponent(commerceName)}`);
    assert(mapMarkers.ok, "Fallo GET /map/markers en smoke lifecycle");
    const commerceMarker = Array.isArray(mapMarkers.data?.markers)
      ? mapMarkers.data.markers.find((item) => item.name === commerceName)
      : null;
    assert(commerceMarker, "No se encontro el marker del comercio QA");
    assert(
      Array.isArray(commerceMarker.promotions) &&
        commerceMarker.promotions.some((item) => item.id === createdPromotionId),
      "La promo aprobada deberia aparecer dentro del marker del comercio",
    );

    const editedVisible = await commerceApi.request(`/commerce/promotions/${createdPromotionId}`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${commerceSession.accessToken}`,
      },
      body: JSON.stringify({
        description: "Promo ajustada despues de estar visible.",
      }),
    });
    assert(editedVisible.ok, "Comercio no pudo editar la promo visible");
    assert(
      editedVisible.data?.promotion?.status === PromotionStatus.PENDING_REVIEW,
      "La promo visible deberia volver a PENDING_REVIEW al editarse",
    );

    const hiddenFromPublic = await publicApi.request(
      `/promotions?search=${encodeURIComponent(`${basePromotionTitle} Ajustada`)}`,
    );
    assert(hiddenFromPublic.ok, "Fallo GET /promotions despues de re-editar");
    assert(
      !hiddenFromPublic.data?.promotions?.some((item) => item.id === createdPromotionId),
      "La promo editada y vuelta a revision no deberia seguir visible en catalogo publico",
    );

    console.log(
      JSON.stringify(
        {
          ok: true,
          runId,
          promotionId: createdPromotionId,
          commerceId: createdCommerce.id,
          finalStatus: PromotionStatus.PENDING_REVIEW,
          message: "Smoke QA del lifecycle de promociones completada correctamente.",
        },
        null,
        2,
      ),
    );
  } finally {
    if (createdPromotionId) {
      await prisma.redemption.deleteMany({
        where: { promotionId: createdPromotionId },
      });

      await prisma.adminActionLog.deleteMany({
        where: { promotionId: createdPromotionId },
      });

      await prisma.promotion.deleteMany({
        where: { id: createdPromotionId },
      });
    }

    if (createdCommerce?.id) {
      await prisma.adminActionLog.deleteMany({
        where: { commerceId: createdCommerce.id },
      });

      await prisma.commerce.deleteMany({
        where: { id: createdCommerce.id },
      });
    }

    if (createdUser?.id) {
      await prisma.session.deleteMany({
        where: { userId: createdUser.id },
      });

      await prisma.user.deleteMany({
        where: { id: createdUser.id },
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
