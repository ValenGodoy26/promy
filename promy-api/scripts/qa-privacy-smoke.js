const bcrypt = require("bcrypt");
const fs = require("fs");
const path = require("path");
const prisma = require("../dist/config/prisma").default;
const { createCommerceWithLocation } = require("../prisma/commerce.spatial");
const { assert, createWebClient, loginWeb } = require("./qa-http-client");

const PASSWORD = "PrivacySmoke123!";
const stamp = `${Date.now()}-${process.pid}`;
const clientEmail = `privacy-client-${stamp}@promy.test`;
const clientPhone = `+598${String(Date.now()).slice(-8)}`;

function assertNoClientContact(value, context) {
  const serialized = JSON.stringify(value);
  assert(!serialized.includes(clientEmail), `${context} expuso email del cliente`);
  assert(!serialized.includes(clientPhone), `${context} expuso telefono del cliente`);

  function inspect(item) {
    if (Array.isArray(item)) return item.forEach(inspect);
    if (!item || typeof item !== "object") return;
    for (const [key, nested] of Object.entries(item)) {
      assert(!["email", "phone"].includes(key.toLowerCase()), `${context} incluyo campo ${key}`);
      inspect(nested);
    }
  }
  inspect(value);
}

async function createOwnerWithCommerce(suffix, passwordHash, cityId, categoryId) {
  const owner = await prisma.user.create({
    data: {
      fullName: `Privacy Owner ${suffix}`,
      email: `privacy-owner-${suffix}-${stamp}@promy.test`,
      passwordHash,
      role: "COMMERCE",
      status: "ACTIVE",
      emailVerifiedAt: new Date(),
    },
  });
  const commerce = await createCommerceWithLocation(prisma, {
      ownerUserId: owner.id,
      cityId,
      categoryId,
      name: `Privacy Commerce ${suffix} ${stamp}`,
      slug: `privacy-commerce-${suffix}-${stamp}`.toLowerCase(),
      shortDescription: "Comercio sintetico de privacidad",
      description: "Comercio sintetico para verificar minimizacion de datos",
      address: `Privacy ${suffix} 123`,
      latitude: -31.392,
      longitude: -58.017,
      phone: "+59899000000",
      status: "APPROVED",
  });
  return { owner, commerce };
}

async function main() {
  const identity = await prisma.$queryRaw`SELECT DATABASE() AS databaseName`;
  assert(
    identity[0]?.databaseName === "promy_integration_test",
    `Base insegura para privacy smoke: ${identity[0]?.databaseName || "desconocida"}`,
  );
  const [city, category] = await Promise.all([
    prisma.city.findFirst({ where: { isActive: true } }),
    prisma.category.findFirst({ where: { isActive: true } }),
  ]);
  assert(city && category, "Faltan ciudad/categoria activas para privacy smoke");

  const passwordHash = await bcrypt.hash(PASSWORD, 8);
  const [{ owner: ownerA, commerce: commerceA }, { owner: ownerB }] = await Promise.all([
    createOwnerWithCommerce("a", passwordHash, city.id, category.id),
    createOwnerWithCommerce("b", passwordHash, city.id, category.id),
  ]);
  const client = await prisma.user.create({
    data: {
      fullName: "Privacy Client",
      email: clientEmail,
      phone: clientPhone,
      passwordHash,
      role: "CLIENT",
      status: "ACTIVE",
      emailVerifiedAt: new Date(),
    },
  });
  const promotion = await prisma.promotion.create({
    data: {
      commerceId: commerceA.id,
      title: `Privacy Promotion ${stamp}`,
      description: "Promocion sintetica de privacidad",
      promotionType: "PERCENTAGE",
      validationMethod: "QR",
      discountValue: 15,
      status: "APPROVED_VISIBLE",
      startDate: new Date(Date.now() - 60_000),
      endDate: new Date(Date.now() + 3_600_000),
    },
  });
  const redemption = await prisma.redemption.create({
    data: {
      promotionId: promotion.id,
      userId: client.id,
      commerceId: commerceA.id,
      validationMethod: "QR",
      validationCode: `PRIV-${stamp}`,
      status: "PENDING",
      validationExpiresAt: new Date(Date.now() + 3_600_000),
    },
  });

  const httpA = createWebClient({ forwardedIp: "198.18.30.1" });
  const httpB = createWebClient({ forwardedIp: "198.18.30.2" });
  const [sessionA, sessionB] = await Promise.all([
    loginWeb(httpA, ownerA.email, PASSWORD),
    loginWeb(httpB, ownerB.email, PASSWORD),
  ]);
  const headersA = { Authorization: `Bearer ${sessionA.accessToken}` };
  const headersB = { Authorization: `Bearer ${sessionB.accessToken}` };

  const [listA, dashboardA, listB] = await Promise.all([
    httpA.request("/commerce/redemptions", { headers: headersA }),
    httpA.request("/commerce/dashboard", { headers: headersA }),
    httpB.request("/commerce/redemptions", { headers: headersB }),
  ]);
  assert(listA.status === 200, `Listado Commerce A respondio ${listA.status}`);
  assert(dashboardA.status === 200, `Dashboard Commerce A respondio ${dashboardA.status}`);
  assert(listB.status === 200, `Listado Commerce B respondio ${listB.status}`);
  assert(listA.data.redemptions.some((item) => item.id === redemption.id), "Commerce A no vio su canje");
  assert(!listB.data.redemptions.some((item) => item.id === redemption.id), "Commerce B vio canje ajeno");
  assertNoClientContact(listA.data.redemptions, "listado Commerce");
  assertNoClientContact(dashboardA.data.dashboard.recentRedemptions, "dashboard Commerce");

  const forbiddenValidation = await httpB.request("/commerce/redemptions/validate", {
    method: "POST",
    headers: headersB,
    body: JSON.stringify({ validationCode: redemption.validationCode }),
  });
  assert(forbiddenValidation.status === 404, "Commerce B pudo consultar/validar un canje ajeno");

  const validation = await httpA.request("/commerce/redemptions/validate", {
    method: "POST",
    headers: headersA,
    body: JSON.stringify({ validationCode: redemption.validationCode }),
  });
  assert(validation.status === 200, `Validacion Commerce A respondio ${validation.status}`);
  assert(validation.data.redemption.status === "SUCCESS", "La validacion no completo el canje");
  assertNoClientContact(validation.data.redemption, "respuesta de validacion Commerce");

  const csvSource = fs.readFileSync(
    path.resolve(__dirname, "../../promy-web/src/features/commerce/CommerceRedemptionsHistoryTable.tsx"),
    "utf8",
  );
  assert(!csvSource.includes('"Email"'), "CSV Commerce conserva columna Email");
  assert(!csvSource.includes('"Telefono"'), "CSV Commerce conserva columna Telefono");
  assert(!csvSource.includes("r.user.email"), "CSV Commerce conserva valor email");
  assert(!csvSource.includes("r.user.phone"), "CSV Commerce conserva valor telefono");

  console.log(JSON.stringify({
    smoke: "privacy",
    database: identity[0].databaseName,
    priv001: {
      ownListing: "no-email-no-phone",
      dashboard: "no-email-no-phone",
      validationResponse: "no-email-no-phone",
      crossCommerce: "404-and-no-foreign-listing",
      validationFlow: "SUCCESS",
      csv: "no-email-no-phone",
    },
    status: "PASS",
  }));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
