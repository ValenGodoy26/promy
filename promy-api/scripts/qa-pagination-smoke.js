const bcrypt = require("bcrypt");
const prisma = require("../dist/config/prisma").default;
const { assert, createMobileClient, createWebClient, loginMobile, loginWeb } = require("./qa-http-client");
const { assertCurrentTestDatabase } = require("./qa-database-guard");

const stamp = `${Date.now()}-${process.pid}`;
const marker = `pagination-${stamp}`;
const password = "PaginationSmoke123!";

async function collectCursor(client, path, token, limit) {
  const items = [];
  let cursor = null;
  do {
    const response = await client.request(`${path}?limit=${limit}${cursor ? `&cursor=${cursor}` : ""}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    assert(response.ok, `Cursor page failed: ${JSON.stringify(response.data)}`);
    const pageItems = response.data.redemptions || response.data.notifications;
    items.push(...pageItems);
    cursor = response.data.hasMore ? response.data.nextCursor : null;
  } while (cursor);
  return items;
}

async function collectPages(client, path, token, limit, itemKey) {
  const items = [];
  let page = 1;
  let total = 0;
  let hasMore;
  do {
    const separator = path.includes("?") ? "&" : "?";
    const response = await client.request(`${path}${separator}page=${page}&limit=${limit}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    assert(response.ok, `Page ${page} failed: ${JSON.stringify(response.data)}`);
    items.push(...response.data[itemKey]);
    total = response.data.total;
    hasMore = response.data.hasMore;
    page += 1;
  } while (hasMore);
  return { items, total };
}

function paginatedPath(path, parameters) {
  const separator = path.includes("?") ? "&" : "?";
  return `${path}${separator}${new URLSearchParams(parameters)}`;
}

async function assertPaginationContract(client, path, token, itemKey, pageBased = false) {
  const headers = { Authorization: `Bearer ${token}` };
  for (const limit of [0, 101]) {
    const response = await client.request(paginatedPath(path, {
      ...(pageBased ? { page: "1" } : {}),
      limit: String(limit),
    }), { headers });
    assert(response.status === 400, `${path}: limit=${limit} must return 400`);
  }

  for (const limit of [1, 100]) {
    const response = await client.request(paginatedPath(path, {
      ...(pageBased ? { page: "1" } : {}),
      limit: String(limit),
    }), { headers });
    assert(response.ok, `${path}: limit=${limit} must be accepted`);
    assert(Array.isArray(response.data[itemKey]), `${path}: missing ${itemKey}`);
    assert(typeof response.data.hasMore === "boolean", `${path}: hasMore must be boolean`);
    if (pageBased) {
      assert(typeof response.data.total === "number", `${path}: total must be numeric`);
    } else if (response.data.hasMore) {
      assert(typeof response.data.nextCursor === "string" && response.data.nextCursor, `${path}: hasMore requires nextCursor`);
    }
  }

  const deterministicUrl = paginatedPath(path, {
    ...(pageBased ? { page: "1" } : {}),
    limit: "13",
  });
  const first = await client.request(deterministicUrl, { headers });
  const second = await client.request(deterministicUrl, { headers });
  assert(first.ok && second.ok, `${path}: deterministic order requests failed`);
  assert(
    JSON.stringify(first.data[itemKey].map((item) => item.id)) === JSON.stringify(second.data[itemKey].map((item) => item.id)),
    `${path}: repeated first page changed order`,
  );
}

function assertExhaustive(items, expected, label) {
  const ids = items.map((item) => item.id);
  assert(ids.length === expected, `${label}: expected ${expected}, got ${ids.length}`);
  assert(new Set(ids).size === ids.length, `${label}: duplicate IDs across pages`);
}

async function main() {
  await assertCurrentTestDatabase(prisma, "Pagination smoke");
  const [city, category, baseCommerce, admin] = await Promise.all([
    prisma.city.findFirst({ where: { isActive: true } }),
    prisma.category.findFirst({ where: { isActive: true } }),
    prisma.commerce.findFirst({ where: { owner: { email: "comercio@promy.com" } } }),
    prisma.user.findUnique({ where: { email: "admin@promy.com" } }),
  ]);
  assert(city && category && baseCommerce && admin, "Pagination smoke baseline missing");
  const passwordHash = await bcrypt.hash(password, 8);
  const clientUser = await prisma.user.create({
    data: { fullName: marker, email: `${marker}@promy.test`, passwordHash, role: "CLIENT", status: "ACTIVE", emailVerifiedAt: new Date() },
  });
  const ownerEmails = Array.from({ length: 55 }, (_, index) => `${marker}-owner-${index}@promy.test`);
  await prisma.user.createMany({
    data: ownerEmails.map((email, index) => ({ fullName: `${marker} owner ${index}`, email, passwordHash, role: "COMMERCE", status: "ACTIVE", emailVerifiedAt: new Date() })),
  });
  const owners = await prisma.user.findMany({ where: { email: { in: ownerEmails } }, orderBy: { id: "asc" } });
  // Commerce.location is an Unsupported(POINT) required field in Prisma and is
  // populated by the DB trigger. Raw inserts exercise that real write path.
  await Promise.all(owners.map((owner, index) => prisma.$executeRaw`
    INSERT INTO Commerce (ownerUserId, cityId, categoryId, name, slug, address, status, createdAt, updatedAt)
    VALUES (${owner.id}, ${city.id}, ${category.id}, ${`${marker} commerce ${index}`}, ${`${marker}-commerce-${index}`}, 'Synthetic pagination address', 'PENDING', NOW(), NOW())
  `));
  const promotions = await Promise.all(Array.from({ length: 65 }, (_, index) => prisma.promotion.create({
    data: { commerceId: baseCommerce.id, title: `${marker} promo ${index}`, description: marker, promotionType: "PERCENTAGE", validationMethod: "QR", status: "DRAFT" },
  })));
  await prisma.redemption.createMany({
    data: promotions.map((promotion, index) => ({ promotionId: promotion.id, userId: clientUser.id, commerceId: baseCommerce.id, validationMethod: "QR", validationCode: `PG${stamp.replace(/\D/g, "").slice(-8)}${String(index).padStart(3, "0")}`, status: "SUCCESS", redeemedAt: new Date() })),
  });
  await prisma.appNotification.createMany({
    data: Array.from({ length: 73 }, (_, index) => ({ userId: clientUser.id, type: "REDEMPTION_VALIDATED", title: `${marker} ${index}`, body: marker })),
  });
  await prisma.adminActionLog.createMany({
    data: Array.from({ length: 63 }, (_, index) => ({ adminUserId: admin.id, action: "UPDATE_COMMERCE_CONTENT", targetType: "COMMERCE", targetId: baseCommerce.id, commerceId: baseCommerce.id, note: `${marker} audit ${index}` })),
  });

  const mobile = createMobileClient();
  const web = createWebClient();
  const clientSession = await loginMobile(mobile, clientUser.email, password);
  const commerceSession = await loginWeb(web, "comercio@promy.com", "demo1234");
  const adminSession = await loginWeb(web, "admin@promy.com", "demo1234");
  await assertPaginationContract(mobile, "/redemptions/me", clientSession.accessToken, "redemptions");
  await assertPaginationContract(web, "/commerce/redemptions", commerceSession.accessToken, "redemptions");
  await assertPaginationContract(mobile, "/notifications/me", clientSession.accessToken, "notifications");
  await assertPaginationContract(web, `/admin/commerces?search=${encodeURIComponent(marker)}`, adminSession.accessToken, "commerces", true);
  await assertPaginationContract(web, `/admin/promotions?search=${encodeURIComponent(marker)}`, adminSession.accessToken, "promotions", true);
  await assertPaginationContract(web, `/admin/audit-logs?search=${encodeURIComponent(marker)}&incidentOnly=true`, adminSession.accessToken, "auditLogs", true);
  const userRedemptions = await collectCursor(mobile, "/redemptions/me", clientSession.accessToken, 13);
  const commerceRedemptions = await collectCursor(web, "/commerce/redemptions", commerceSession.accessToken, 17);
  const notifications = await collectCursor(mobile, "/notifications/me", clientSession.accessToken, 19);
  const commerces = await collectPages(web, `/admin/commerces?search=${encodeURIComponent(marker)}`, adminSession.accessToken, 13, "commerces");
  const adminPromotions = await collectPages(web, `/admin/promotions?search=${encodeURIComponent(marker)}`, adminSession.accessToken, 17, "promotions");
  const audit = await collectPages(web, `/admin/audit-logs?search=${encodeURIComponent(marker)}&incidentOnly=true`, adminSession.accessToken, 11, "auditLogs");

  assertExhaustive(userRedemptions, 65, "user redemptions");
  assertExhaustive(commerceRedemptions.filter((item) => promotions.some((promotion) => promotion.id === item.promotion.id)), 65, "commerce redemptions");
  assertExhaustive(notifications, 73, "notifications");
  assertExhaustive(commerces.items, 55, "admin commerces");
  assert(commerces.total === 55, "admin commerce total mismatch");
  assertExhaustive(adminPromotions.items, 65, "admin promotions");
  assert(adminPromotions.total === 65, "admin promotion total mismatch");
  assertExhaustive(audit.items, 63, "admin audit");
  assert(audit.total === 63, "admin audit total mismatch");

  console.log(JSON.stringify({ smoke: "pagination", redemptions: 65, notifications: 73, adminCommerces: 55, adminPromotions: 65, auditLogs: 63, duplicates: 0, lastReachable: true, filtersCombined: true, limitsValidated: 6, deterministicOrder: true, hasMoreCoherent: true, status: "PASS" }));

  await prisma.adminActionLog.deleteMany({ where: { note: { startsWith: marker } } });
  await prisma.promotion.deleteMany({ where: { id: { in: promotions.map((item) => item.id) } } });
  await prisma.user.delete({ where: { id: clientUser.id } });
  await prisma.user.deleteMany({ where: { id: { in: owners.map((item) => item.id) } } });
}

main().catch((error) => { console.error(error); process.exitCode = 1; }).finally(() => prisma.$disconnect());
