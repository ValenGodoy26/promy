const { PrismaClient } = require("@prisma/client");
const {
  assert,
  createMobileClient,
  createWebClient,
  loginMobile,
  loginWeb,
} = require("./qa-http-client");

const prisma = new PrismaClient();
const QA_IPS = {
  admin: "203.0.113.10",
  commerce: "203.0.113.20",
  client: "203.0.113.30",
};

async function main() {
  const runId = `real-e2e-${Date.now()}`;
  const clientPassword = "Client1234";
  const commercePassword = "Commerce1234";
  const clientEmail = `${runId}-client@promy.test`;
  const commerceEmail = `${runId}-commerce@promy.test`;
  const commerceName = `QA Real ${runId}`;
  const promotionTitle = `QA Promo Real ${runId}`;
  const publicApi = createWebClient();
  const adminApi = createWebClient({ forwardedIp: QA_IPS.admin });
  const commerceApi = createWebClient({ forwardedIp: QA_IPS.commerce });
  const otherCommerceApi = createWebClient({ forwardedIp: "203.0.113.21" });
  const clientApi = createMobileClient({ forwardedIp: QA_IPS.client });

  let createdClientUserId = null;
  let createdCommerceUserId = null;
  let createdCommerceId = null;
  let createdPromotionId = null;
  let createdRedemptionId = null;

  try {
    const health = await publicApi.request("/health");
    assert(health.ok, "El QA server no responde en /health");

    const [citiesResponse, categoriesResponse] = await Promise.all([
      publicApi.request("/cities"),
      publicApi.request("/categories"),
    ]);

    assert(citiesResponse.ok, "No pudimos cargar ciudades para la smoke QA");
    assert(categoriesResponse.ok, "No pudimos cargar categorias para la smoke QA");

    const city = citiesResponse.data?.cities?.find((item) => item.slug === "concordia");
    const category = categoriesResponse.data?.categories?.find((item) => item.slug === "gastronomia");

    assert(city?.id, "No se encontro la ciudad Concordia");
    assert(category?.id, "No se encontro la categoria Gastronomia");

    const registerCommerce = await commerceApi.request("/auth/register-commerce", {
      method: "POST",
      body: JSON.stringify({
        fullName: "QA Comercio Real",
        email: commerceEmail,
        password: commercePassword,
        phone: "3454556677",
        commerceName,
        shortDescription: "Alta QA real para flujo comercio-admin-app",
        description: "Comercio temporal para validar el flujo completo con datos nuevos.",
        address: "Smoke QA 456",
        cityId: city.id,
        categoryId: category.id,
        instagram: "@qa.realflow",
      }),
    });

    assert(
      registerCommerce.ok,
      `No se pudo registrar el comercio QA: ${JSON.stringify(registerCommerce.data)}`,
    );
    assert(
      registerCommerce.data?.verification?.token,
      "El provider test no devolvio token de verificacion del comercio",
    );

    createdCommerceUserId = registerCommerce.data?.user?.id ?? null;
    createdCommerceId = registerCommerce.data?.commerce?.id ?? null;

    const verifyCommerceEmail = await commerceApi.request("/auth/verify-email", {
      method: "POST",
      body: JSON.stringify({
        token: registerCommerce.data.verification.token,
      }),
    });
    assert(
      verifyCommerceEmail.ok,
      `No se pudo verificar el email del comercio: ${JSON.stringify(verifyCommerceEmail.data)}`,
    );

    const commerceSession = await loginWeb(commerceApi, commerceEmail, commercePassword);

    const updateProfile = await commerceApi.request("/commerce/me", {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${commerceSession.accessToken}`,
      },
      body: JSON.stringify({
        latitude: -31.39251,
        longitude: -58.02088,
        logoUrl: "https://placehold.co/400x400/png?text=PROMY+QA+Logo",
        coverUrl: "https://placehold.co/1200x675/png?text=PROMY+QA+Cover",
      }),
    });
    assert(
      updateProfile.ok,
      `El comercio QA no pudo completar su perfil antes de aprobacion: ${JSON.stringify(updateProfile.data)}`,
    );

    const adminSession = await loginWeb(adminApi, "admin@promy.com", "demo1234");

    const approveCommerce = await adminApi.request(`/admin/commerces/${createdCommerceId}/status`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${adminSession.accessToken}`,
      },
      body: JSON.stringify({
        status: "APPROVED",
      }),
    });
    assert(
      approveCommerce.ok,
      `Admin no pudo aprobar el comercio QA: ${JSON.stringify(approveCommerce.data)}`,
    );
    assert(
      approveCommerce.data?.commerce?.status === "APPROVED",
      "El comercio QA deberia quedar APPROVED",
    );

    const myCommerce = await commerceApi.request("/commerce/me", {
      headers: {
        Authorization: `Bearer ${commerceSession.accessToken}`,
      },
    });
    assert(myCommerce.ok, "El comercio QA no pudo cargar su perfil");
    assert(
      myCommerce.data?.commerce?.status === "APPROVED",
      "El perfil del comercio deberia verse aprobado",
    );

    const createPromotion = await commerceApi.request("/commerce/promotions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${commerceSession.accessToken}`,
      },
      body: JSON.stringify({
        title: promotionTitle,
        description: "Promo temporal para validar un flujo completo real.",
        promotionType: "BENEFIT",
        validationMethod: "QR",
        status: "DRAFT",
      }),
    });
    assert(
      createPromotion.ok,
      `El comercio aprobado no pudo crear promo: ${JSON.stringify(createPromotion.data)}`,
    );
    createdPromotionId = createPromotion.data?.promotion?.id ?? null;

    const sendPromotionToReview = await commerceApi.request(`/commerce/promotions/${createdPromotionId}`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${commerceSession.accessToken}`,
      },
      body: JSON.stringify({
        status: "PENDING_REVIEW",
      }),
    });
    assert(sendPromotionToReview.ok, "El comercio no pudo mandar la promo a revision");

    const approvePromotion = await adminApi.request(`/admin/promotions/${createdPromotionId}/status`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${adminSession.accessToken}`,
      },
      body: JSON.stringify({
        status: "APPROVED_VISIBLE",
      }),
    });
    assert(
      approvePromotion.ok,
      `Admin no pudo aprobar la promo QA: ${JSON.stringify(approvePromotion.data)}`,
    );
    assert(
      approvePromotion.data?.promotion?.status === "APPROVED_VISIBLE",
      "La promo QA deberia quedar APPROVED_VISIBLE",
    );

    const [publicPromotions, publicSearch, publicMap, publicPromotionDetail, publicCommerceDetail] =
      await Promise.all([
        publicApi.request(`/promotions?search=${encodeURIComponent(promotionTitle)}`),
        publicApi.request(`/search?q=${encodeURIComponent(promotionTitle)}`),
        publicApi.request(`/map/markers?search=${encodeURIComponent(commerceName)}`),
        publicApi.request(`/promotions/${createdPromotionId}`),
        publicApi.request(`/commerces/${createdCommerceId}`),
      ]);

    assert(publicPromotions.ok, "Fallo GET /promotions en smoke real");
    assert(
      publicPromotions.data?.promotions?.some((item) => item.id === createdPromotionId),
      "La promo aprobada deberia aparecer en el catalogo publico",
    );

    assert(publicSearch.ok, "Fallo GET /search en smoke real");
    assert(
      publicSearch.data?.promotions?.some((item) => item.id === createdPromotionId),
      "La promo aprobada deberia aparecer en /search",
    );

    assert(publicMap.ok, "Fallo GET /map/markers en smoke real");
    const commerceMarker = Array.isArray(publicMap.data?.markers)
      ? publicMap.data.markers.find((item) => item.id === createdCommerceId)
      : null;
    assert(commerceMarker, "No se encontro el marker del comercio QA");
    assert(
      Array.isArray(commerceMarker.promotions) &&
        commerceMarker.promotions.some((item) => item.id === createdPromotionId),
      "La promo aprobada deberia aparecer dentro del marker del comercio",
    );

    assert(publicPromotionDetail.ok, "Fallo GET /promotions/:id en smoke real");
    assert(
      publicPromotionDetail.data?.promotion?.id === createdPromotionId,
      "El detalle publico de promo deberia devolver la promo creada",
    );

    assert(publicCommerceDetail.ok, "Fallo GET /commerces/:id en smoke real");
    assert(
      publicCommerceDetail.data?.commerce?.id === createdCommerceId,
      "El detalle publico de comercio deberia devolver el comercio creado",
    );
    assert(
      publicCommerceDetail.data?.commerce?.promotions?.some((item) => item.id === createdPromotionId),
      "El detalle del comercio deberia incluir la promo visible",
    );

    const registerClient = await clientApi.request("/auth/register", {
      method: "POST",
      body: JSON.stringify({
        fullName: "QA Cliente Real",
        email: clientEmail,
        password: clientPassword,
        phone: "3454332211",
      }),
    });
    assert(registerClient.ok, `No se pudo registrar el cliente QA: ${JSON.stringify(registerClient.data)}`);
    assert(
      registerClient.data?.verification?.token,
      "El provider test no devolvio token de verificacion del cliente",
    );
    createdClientUserId = registerClient.data?.user?.id ?? null;

    const clientSession = await loginMobile(clientApi, clientEmail, clientPassword);

    const blockedUnverifiedRedemption = await clientApi.request("/redemptions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${clientSession.accessToken}`,
      },
      body: JSON.stringify({
        promotionId: createdPromotionId,
      }),
    });
    assert(
      blockedUnverifiedRedemption.status === 403 &&
        blockedUnverifiedRedemption.data?.code === "EMAIL_NOT_VERIFIED",
      `El cliente sin verificar deberia recibir EMAIL_NOT_VERIFIED: ${JSON.stringify(blockedUnverifiedRedemption.data)}`,
    );

    const verifyClientEmail = await clientApi.request("/auth/verify-email", {
      method: "POST",
      body: JSON.stringify({
        token: registerClient.data.verification.token,
      }),
    });
    assert(
      verifyClientEmail.ok,
      `No se pudo verificar el email del cliente QA: ${JSON.stringify(verifyClientEmail.data)}`,
    );

    const createRedemption = await clientApi.request("/redemptions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${clientSession.accessToken}`,
      },
      body: JSON.stringify({
        promotionId: createdPromotionId,
      }),
    });
    assert(createRedemption.ok, `No se pudo crear el canje QA: ${JSON.stringify(createRedemption.data)}`);
    createdRedemptionId = createRedemption.data?.redemption?.id ?? null;
    assert(
      createRedemption.data?.redemption?.status === "PENDING",
      "El canje recien creado deberia quedar en PENDING",
    );
    assert(
      createRedemption.data?.redemption?.validationCode,
      "El canje QA deberia devolver validationCode",
    );

    const pendingHistory = await clientApi.request("/redemptions/me", {
      headers: {
        Authorization: `Bearer ${clientSession.accessToken}`,
      },
    });
    assert(pendingHistory.ok, "Fallo GET /redemptions/me antes de validar");
    const pendingClientRedemption = pendingHistory.data?.redemptions?.find(
      (item) => item.id === createdRedemptionId,
    );
    assert(pendingClientRedemption, "El cliente no vio el canje recien creado en su historial");
    assert(
      pendingClientRedemption.status === "PENDING",
      "El historial del cliente deberia mostrar el canje como PENDING",
    );

    const commerceRedemptions = await commerceApi.request("/commerce/redemptions", {
      headers: {
        Authorization: `Bearer ${commerceSession.accessToken}`,
      },
    });
    assert(commerceRedemptions.ok, "Fallo GET /commerce/redemptions");
    const pendingCommerceRedemption = commerceRedemptions.data?.redemptions?.find(
      (item) => item.id === createdRedemptionId,
    );
    assert(pendingCommerceRedemption, "El comercio no vio el canje pendiente");

    const otherCommerceSession = await loginWeb(
      otherCommerceApi,
      "comercio@promy.com",
      "demo1234",
    );
    const blockedCrossCommerceValidation = await otherCommerceApi.request(
      "/commerce/redemptions/validate",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${otherCommerceSession.accessToken}`,
        },
        body: JSON.stringify({
          validationCode: createRedemption.data.redemption.validationCode,
        }),
      },
    );
    assert(
      blockedCrossCommerceValidation.status === 404,
      `Otro comercio no debe validar el canje: ${JSON.stringify(blockedCrossCommerceValidation.data)}`,
    );

    const validateRedemption = await commerceApi.request("/commerce/redemptions/validate", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${commerceSession.accessToken}`,
      },
      body: JSON.stringify({
        validationCode: createRedemption.data.redemption.validationCode,
      }),
    });
    assert(
      validateRedemption.ok,
      `El comercio no pudo validar el canje: ${JSON.stringify(validateRedemption.data)}`,
    );
    assert(
      validateRedemption.data?.redemption?.status === "SUCCESS",
      "El canje deberia quedar en SUCCESS luego de validar",
    );

    const duplicateValidation = await commerceApi.request("/commerce/redemptions/validate", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${commerceSession.accessToken}`,
      },
      body: JSON.stringify({
        validationCode: createRedemption.data.redemption.validationCode,
      }),
    });
    assert(
      duplicateValidation.status === 409,
      `El mismo canje no debe validarse dos veces: ${JSON.stringify(duplicateValidation.data)}`,
    );

    const finalHistory = await clientApi.request("/redemptions/me", {
      headers: {
        Authorization: `Bearer ${clientSession.accessToken}`,
      },
    });
    assert(finalHistory.ok, "Fallo GET /redemptions/me despues de validar");
    const finalClientRedemption = finalHistory.data?.redemptions?.find(
      (item) => item.id === createdRedemptionId,
    );
    assert(finalClientRedemption, "El cliente perdio el canje en su historial");
    assert(
      finalClientRedemption.status === "SUCCESS",
      "El historial del cliente deberia mostrar el canje como SUCCESS",
    );

    const [adminDashboard, commerceDashboard, clientAdminAccess, commerceAdminAccess] = await Promise.all([
      adminApi.request("/admin/dashboard", {
        headers: {
          Authorization: `Bearer ${adminSession.accessToken}`,
        },
      }),
      commerceApi.request("/commerce/dashboard", {
        headers: {
          Authorization: `Bearer ${commerceSession.accessToken}`,
        },
      }),
      clientApi.request("/admin/dashboard", {
        headers: {
          Authorization: `Bearer ${clientSession.accessToken}`,
        },
      }),
      commerceApi.request("/admin/dashboard", {
        headers: {
          Authorization: `Bearer ${commerceSession.accessToken}`,
        },
      }),
    ]);

    assert(adminDashboard.ok, "Fallo GET /admin/dashboard en smoke real");
    assert(commerceDashboard.ok, "Fallo GET /commerce/dashboard en smoke real");
    assert(clientAdminAccess.status === 403, "CLIENT no debe acceder a endpoints ADMIN");
    assert(commerceAdminAccess.status === 403, "COMMERCE no debe acceder a endpoints ADMIN");

    console.log(
      JSON.stringify(
        {
          ok: true,
          runId,
          clientUserId: createdClientUserId,
          commerceUserId: createdCommerceUserId,
          commerceId: createdCommerceId,
          promotionId: createdPromotionId,
          redemptionId: createdRedemptionId,
          message:
            "Smoke QA real comercio -> admin -> app completada correctamente con datos nuevos.",
        },
        null,
        2,
      ),
    );
  } finally {
    if (createdRedemptionId) {
      await prisma.redemption.deleteMany({
        where: { id: createdRedemptionId },
      });
    }

    if (createdPromotionId) {
      await prisma.adminActionLog.deleteMany({
        where: { promotionId: createdPromotionId },
      });

      await prisma.promotion.deleteMany({
        where: { id: createdPromotionId },
      });
    }

    if (createdCommerceId) {
      await prisma.adminActionLog.deleteMany({
        where: { commerceId: createdCommerceId },
      });

      await prisma.appNotification
        .deleteMany({
          where: {
            OR: [
              { data: { contains: `"commerceId":${createdCommerceId}` } },
              { data: { contains: `"commerceId":"${createdCommerceId}"` } },
            ],
          },
        })
        .catch(() => undefined);

      await prisma.commerce.deleteMany({
        where: { id: createdCommerceId },
      });
    }

    if (createdCommerceUserId) {
      await prisma.session.deleteMany({
        where: { userId: createdCommerceUserId },
      });

      await prisma.pushToken.deleteMany({
        where: { userId: createdCommerceUserId },
      });

      await prisma.appNotification.deleteMany({
        where: { userId: createdCommerceUserId },
      });

      await prisma.user.deleteMany({
        where: { id: createdCommerceUserId },
      });
    }

    if (createdClientUserId) {
      await prisma.session.deleteMany({
        where: { userId: createdClientUserId },
      });

      await prisma.pushToken.deleteMany({
        where: { userId: createdClientUserId },
      });

      await prisma.appNotification.deleteMany({
        where: { userId: createdClientUserId },
      });

      await prisma.user.deleteMany({
        where: { id: createdClientUserId },
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
