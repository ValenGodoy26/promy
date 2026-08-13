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

async function main() {
  const runId = `commerce-onboarding-${Date.now()}`;
  const password = "DemoPass123";
  const email = `${runId}@promy.test`;
  const commerceName = `QA Alta ${runId}`;

  let createdUserId = null;
  let createdCommerceId = null;
  let createdPromotionId = null;

  try {
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

    const registerResponse = await request("/auth/register-commerce", {
      method: "POST",
      body: JSON.stringify({
        fullName: "QA Comercio",
        email,
        password,
        phone: "3454556677",
        commerceName,
        shortDescription: "Alta QA para onboarding real",
        description: "Comercio temporal para smoke test de onboarding con email verificado.",
        address: "Smoke QA 123",
        cityId: city.id,
        categoryId: category.id,
        instagram: "@qa.onboarding",
      }),
    });

    assert(registerResponse.ok, `No se pudo registrar comercio: ${JSON.stringify(registerResponse.data)}`);
    assert(
      registerResponse.data?.verification?.token,
      "El registro de comercio no devolvio token de verificacion en development",
    );

    createdUserId = registerResponse.data?.user?.id ?? null;
    createdCommerceId = registerResponse.data?.commerce?.id ?? null;

    const verifyResponse = await request("/auth/verify-email", {
      method: "POST",
      body: JSON.stringify({
        token: registerResponse.data.verification.token,
      }),
    });

    assert(verifyResponse.ok, `No se pudo verificar el email: ${JSON.stringify(verifyResponse.data)}`);
    assert(
      verifyResponse.data?.user?.emailVerifiedAt,
      "El usuario deberia quedar marcado como verificado",
    );

    const commerceSession = await login(email, password);

    const completeProfile = await request("/commerce/me", {
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
      completeProfile.ok,
      `El comercio QA no pudo completar su perfil antes de aprobacion: ${JSON.stringify(completeProfile.data)}`,
    );

    const adminSession = await login("admin@promy.com", "demo1234");

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
    assert(myCommerce.data?.commerce?.status === "APPROVED", "El perfil del comercio deberia verse aprobado");

    const createPromotion = await request("/commerce/promotions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${commerceSession.accessToken}`,
      },
      body: JSON.stringify({
        title: `Promo QA ${runId}`,
        description: "Promo temporal para validar operacion luego del onboarding.",
        promotionType: "BENEFIT",
        validationMethod: "QR",
        status: "DRAFT",
      }),
    });

    assert(
      createPromotion.ok,
      `El comercio aprobado y verificado no pudo operar: ${JSON.stringify(createPromotion.data)}`,
    );
    assert(
      createPromotion.data?.promotion?.status === "DRAFT",
      "La promo QA deberia crearse en DRAFT",
    );

    createdPromotionId = createPromotion.data?.promotion?.id ?? null;

    console.log(
      JSON.stringify(
        {
          ok: true,
          runId,
          userId: createdUserId,
          commerceId: createdCommerceId,
          promotionId: createdPromotionId,
          message: "Smoke QA de onboarding de comercio completada correctamente.",
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

    if (createdCommerceId) {
      await prisma.adminActionLog.deleteMany({
        where: { commerceId: createdCommerceId },
      });

      await prisma.appNotification.deleteMany({
        where: {
          OR: [
            { data: { contains: `"commerceId":${createdCommerceId}` } },
            { data: { contains: `"commerceId":"${createdCommerceId}"` } },
          ],
        },
      }).catch(() => undefined);

      await prisma.commerce.deleteMany({
        where: { id: createdCommerceId },
      });
    }

    if (createdUserId) {
      await prisma.session.deleteMany({
        where: { userId: createdUserId },
      });

      await prisma.pushToken.deleteMany({
        where: { userId: createdUserId },
      });

      await prisma.appNotification.deleteMany({
        where: { userId: createdUserId },
      });

      await prisma.user.deleteMany({
        where: { id: createdUserId },
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
