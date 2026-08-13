const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const QA_BASE_URL = process.env.QA_BASE_URL || "http://localhost:4013/api";

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

  return response.data;
}

async function loginAdmin() {
  const knownPasswords = ["Admin1234", "demo1234"];
  let lastError = null;

  for (const password of knownPasswords) {
    try {
      return await login("admin@promy.com", password);
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError || new Error("No se pudo loguear admin@promy.com");
}

async function main() {
  const runId = `real-e2e-${Date.now()}`;
  const clientPassword = "Client1234";
  const commercePassword = "Commerce1234";
  const clientEmail = `${runId}-client@promy.test`;
  const commerceEmail = `${runId}-commerce@promy.test`;
  const commerceName = `QA Real ${runId}`;
  const promotionTitle = `QA Promo Real ${runId}`;

  let createdClientUserId = null;
  let createdCommerceUserId = null;
  let createdCommerceId = null;
  let createdPromotionId = null;
  let createdRedemptionId = null;

  try {
    const health = await request("/health");
    assert(health.ok, "El QA server no responde en /health");

    const [citiesResponse, categoriesResponse] = await Promise.all([
      request("/cities"),
      request("/categories"),
    ]);

    assert(citiesResponse.ok, "No pudimos cargar ciudades para la smoke QA");
    assert(categoriesResponse.ok, "No pudimos cargar categorias para la smoke QA");

    const city = citiesResponse.data?.cities?.find((item) => item.slug === "concordia");
    const category = categoriesResponse.data?.categories?.find((item) => item.slug === "gastronomia");

    assert(city?.id, "No se encontro la ciudad Concordia");
    assert(category?.id, "No se encontro la categoria Gastronomia");

    const registerCommerce = await request("/auth/register-commerce", {
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
      "El registro de comercio no devolvio token de verificacion en development",
    );

    createdCommerceUserId = registerCommerce.data?.user?.id ?? null;
    createdCommerceId = registerCommerce.data?.commerce?.id ?? null;

    const verifyCommerceEmail = await request("/auth/verify-email", {
      method: "POST",
      body: JSON.stringify({
        token: registerCommerce.data.verification.token,
      }),
    });
    assert(
      verifyCommerceEmail.ok,
      `No se pudo verificar el email del comercio: ${JSON.stringify(verifyCommerceEmail.data)}`,
    );

    const commerceSession = await login(commerceEmail, commercePassword);

    const updateProfile = await request("/commerce/me", {
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

    const adminSession = await loginAdmin();

    const approveCommerce = await request(`/admin/commerces/${createdCommerceId}/status`, {
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

    const myCommerce = await request("/commerce/me", {
      headers: {
        Authorization: `Bearer ${commerceSession.accessToken}`,
      },
    });
    assert(myCommerce.ok, "El comercio QA no pudo cargar su perfil");
    assert(
      myCommerce.data?.commerce?.status === "APPROVED",
      "El perfil del comercio deberia verse aprobado",
    );

    const createPromotion = await request("/commerce/promotions", {
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

    const sendPromotionToReview = await request(`/commerce/promotions/${createdPromotionId}`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${commerceSession.accessToken}`,
      },
      body: JSON.stringify({
        status: "PENDING_REVIEW",
      }),
    });
    assert(sendPromotionToReview.ok, "El comercio no pudo mandar la promo a revision");

    const approvePromotion = await request(`/admin/promotions/${createdPromotionId}/status`, {
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
        request(`/promotions?search=${encodeURIComponent(promotionTitle)}`),
        request(`/search?q=${encodeURIComponent(promotionTitle)}`),
        request(`/map/markers?search=${encodeURIComponent(commerceName)}`),
        request(`/promotions/${createdPromotionId}`),
        request(`/commerces/${createdCommerceId}`),
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

    const registerClient = await request("/auth/register", {
      method: "POST",
      body: JSON.stringify({
        fullName: "QA Cliente Real",
        email: clientEmail,
        password: clientPassword,
        phone: "3454332211",
      }),
    });
    assert(registerClient.ok, `No se pudo registrar el cliente QA: ${JSON.stringify(registerClient.data)}`);
    createdClientUserId = registerClient.data?.user?.id ?? null;

    const clientSession = await login(clientEmail, clientPassword);

    const createRedemption = await request("/redemptions", {
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

    const pendingHistory = await request("/redemptions/me", {
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

    const commerceRedemptions = await request("/commerce/redemptions", {
      headers: {
        Authorization: `Bearer ${commerceSession.accessToken}`,
      },
    });
    assert(commerceRedemptions.ok, "Fallo GET /commerce/redemptions");
    const pendingCommerceRedemption = commerceRedemptions.data?.redemptions?.find(
      (item) => item.id === createdRedemptionId,
    );
    assert(pendingCommerceRedemption, "El comercio no vio el canje pendiente");

    const validateRedemption = await request("/commerce/redemptions/validate", {
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

    const finalHistory = await request("/redemptions/me", {
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

    const [adminDashboard, commerceDashboard] = await Promise.all([
      request("/admin/dashboard", {
        headers: {
          Authorization: `Bearer ${adminSession.accessToken}`,
        },
      }),
      request("/commerce/dashboard", {
        headers: {
          Authorization: `Bearer ${commerceSession.accessToken}`,
        },
      }),
    ]);

    assert(adminDashboard.ok, "Fallo GET /admin/dashboard en smoke real");
    assert(commerceDashboard.ok, "Fallo GET /commerce/dashboard en smoke real");

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
