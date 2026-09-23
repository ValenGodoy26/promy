const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const { PrismaClient } = require("@prisma/client");
const { runCommand } = require("./qa-process");
const { validateTestDatabaseUrl } = require("./qa-database-guard");

const ROOT = path.resolve(__dirname, "..");
const TARGET_MIGRATION = "20260914193000_anonymize_deleted_client_redemptions";
const UPGRADE_DATABASE = "promy_upgrade_24_25_test";
const NPX = process.platform === "win32" ? "npx.cmd" : "npx";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function databaseUrlFor(baseUrl, databaseName) {
  const parsed = new URL(baseUrl);
  parsed.pathname = `/${databaseName}`;
  return parsed.toString();
}

async function seedPreMigrationFixtures() {
  const prisma = new PrismaClient();
  const passwordHash = "$2b$12$synthetic.block12.fixture.only.not.for.login.000000000000";
  const now = new Date();
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  const [clientA, clientB, commerceOwner, admin, city, category] = await Promise.all([
    prisma.user.create({ data: { fullName: "Synthetic Client A", email: "block12-client-a@promy.test", phone: "3454000001", passwordHash, role: "CLIENT", status: "ACTIVE", emailVerifiedAt: now } }),
    prisma.user.create({ data: { fullName: "Synthetic Client B", email: "block12-client-b@promy.test", phone: "3454000002", passwordHash, role: "CLIENT", status: "ACTIVE", emailVerifiedAt: now } }),
    prisma.user.create({ data: { fullName: "Synthetic Commerce", email: "block12-commerce@promy.test", passwordHash, role: "COMMERCE", status: "ACTIVE", emailVerifiedAt: now } }),
    prisma.user.create({ data: { fullName: "Synthetic Admin", email: "block12-admin@promy.test", passwordHash, role: "ADMIN", status: "ACTIVE", emailVerifiedAt: now } }),
    prisma.city.create({ data: { name: "Synthetic City", province: "Entre Ríos", slug: "block12-city" } }),
    prisma.category.create({ data: { name: "Synthetic Category", slug: "block12-category" } }),
  ]);
  await prisma.$executeRaw`
    INSERT INTO Commerce (
      ownerUserId, cityId, categoryId, name, slug, address,
      latitude, longitude, status, isFeatured, featuredRank,
      isHiddenByAdmin, isSuspendedByAdmin, createdAt, updatedAt
    ) VALUES (
      ${commerceOwner.id}, ${city.id}, ${category.id}, ${"Synthetic Commerce"},
      ${"block12-commerce"}, ${"Synthetic 123"}, ${-31.39}, ${-58.02},
      ${"APPROVED"}, false, 0, false, false, NOW(), NOW()
    )
  `;
  const commerce = await prisma.commerce.findUniqueOrThrow({ where: { slug: "block12-commerce" } });
  const [globalCap, perUser, secondSuccess, pendingPromo, controlPromo] = await Promise.all([
    prisma.promotion.create({ data: { commerceId: commerce.id, title: "Global cap", description: "Synthetic", promotionType: "BENEFIT", validationMethod: "MANUAL_CODE", maxRedemptions: 1, startDate: yesterday, endDate: tomorrow, status: "APPROVED_VISIBLE" } }),
    prisma.promotion.create({ data: { commerceId: commerce.id, title: "Per user", description: "Synthetic", promotionType: "BENEFIT", validationMethod: "MANUAL_CODE", maxRedemptions: 10, startDate: yesterday, endDate: tomorrow, status: "APPROVED_VISIBLE" } }),
    prisma.promotion.create({ data: { commerceId: commerce.id, title: "Second success", description: "Synthetic", promotionType: "BENEFIT", validationMethod: "MANUAL_CODE", startDate: yesterday, endDate: tomorrow, status: "APPROVED_VISIBLE" } }),
    prisma.promotion.create({ data: { commerceId: commerce.id, title: "Pending", description: "Synthetic", promotionType: "BENEFIT", validationMethod: "MANUAL_CODE", startDate: yesterday, endDate: tomorrow, status: "APPROVED_VISIBLE" } }),
    prisma.promotion.create({ data: { commerceId: commerce.id, title: "Control", description: "Synthetic", promotionType: "BENEFIT", validationMethod: "MANUAL_CODE", startDate: yesterday, endDate: tomorrow, status: "APPROVED_VISIBLE" } }),
  ]);
  const redemptions = await prisma.$transaction([
    prisma.redemption.create({ data: { promotionId: globalCap.id, commerceId: commerce.id, userId: clientA.id, validationMethod: "MANUAL_CODE", validationCode: "BLOCK12-A-GLOBAL", status: "SUCCESS", redeemedAt: now } }),
    prisma.redemption.create({ data: { promotionId: perUser.id, commerceId: commerce.id, userId: clientA.id, validationMethod: "MANUAL_CODE", validationCode: "BLOCK12-A-PERUSER", status: "SUCCESS", redeemedAt: now } }),
    prisma.redemption.create({ data: { promotionId: secondSuccess.id, commerceId: commerce.id, userId: clientA.id, validationMethod: "MANUAL_CODE", validationCode: "BLOCK12-A-SECOND", status: "SUCCESS", redeemedAt: now } }),
    prisma.redemption.create({ data: { promotionId: pendingPromo.id, commerceId: commerce.id, userId: clientA.id, validationMethod: "MANUAL_CODE", validationCode: "BLOCK12-A-PENDING", status: "PENDING", validationExpiresAt: tomorrow } }),
    prisma.redemption.create({ data: { promotionId: controlPromo.id, commerceId: commerce.id, userId: clientB.id, validationMethod: "MANUAL_CODE", validationCode: "BLOCK12-B-CONTROL", status: "SUCCESS", redeemedAt: now } }),
  ]);
  await prisma.$transaction([
    prisma.session.create({ data: { userId: clientA.id, refreshTokenHash: "block12-refresh-hash-a", userAgent: "Synthetic QA", ipAddress: "192.0.2.10", expiresAt: tomorrow } }),
    prisma.pushToken.create({ data: { userId: clientA.id, token: "ExponentPushToken[block12-client-a]", platform: "android", deviceLabel: "Synthetic QA" } }),
    prisma.appNotification.create({ data: { userId: clientA.id, type: "REDEMPTION_CREATED", title: "Synthetic", body: "Synthetic notification" } }),
    prisma.adminActionLog.create({ data: { adminUserId: admin.id, action: "BLOCK12_FIXTURE", targetType: "PROMOTION", targetId: globalCap.id, commerceId: commerce.id, promotionId: globalCap.id, metadata: JSON.stringify({ synthetic: true }) } }),
  ]);

  console.log(JSON.stringify({ phase: "pre-migration", users: { clientA: clientA.id, clientB: clientB.id }, redemptionIds: redemptions.map((item) => item.id), success: 4, pending: 1, status: "PASS" }));
  await prisma.$disconnect();
}

async function verifyMigrationAndDeletion() {
  const prisma = new PrismaClient();
  const { deleteCurrentUserAccount } = require("../dist/modules/users/users.service");
  const { getCommerceDashboardByOwner } = require("../dist/modules/commerce/commerce.service");
  const { getAdminDashboardData } = require("../dist/modules/admin/admin.service");
  const { createRedemptionForUser } = require("../dist/modules/redemptions/redemptions.service");

  const clientA = await prisma.user.findUniqueOrThrow({ where: { email: "block12-client-a@promy.test" } });
  const clientB = await prisma.user.findUniqueOrThrow({ where: { email: "block12-client-b@promy.test" } });
  const owner = await prisma.user.findUniqueOrThrow({ where: { email: "block12-commerce@promy.test" } });
  const perUser = await prisma.promotion.findFirstOrThrow({ where: { title: "Per user" } });
  const globalCap = await prisma.promotion.findFirstOrThrow({ where: { title: "Global cap" } });
  const beforeRows = await prisma.redemption.findMany({ orderBy: { id: "asc" }, select: { id: true, userId: true, status: true } });
  assert(beforeRows.length === 5, "La migración 24→25 perdió redemptions");
  assert(beforeRows.filter((item) => item.userId === clientA.id).length === 4, "La migración alteró asociaciones existentes de CLIENT A");
  assert(beforeRows.some((item) => item.userId === clientB.id), "CLIENT B dejó de estar asociado después de migrar");

  const columns = await prisma.$queryRawUnsafe("SELECT IS_NULLABLE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Redemption' AND COLUMN_NAME = 'userId'");
  const fks = await prisma.$queryRawUnsafe("SELECT DELETE_RULE FROM INFORMATION_SCHEMA.REFERENTIAL_CONSTRAINTS WHERE CONSTRAINT_SCHEMA = DATABASE() AND TABLE_NAME = 'Redemption' AND CONSTRAINT_NAME = 'Redemption_userId_fkey'");
  assert(columns[0]?.IS_NULLABLE === "YES", "Redemption.userId no quedó nullable");
  assert(fks[0]?.DELETE_RULE === "SET NULL", "La FK Redemption.userId no quedó ON DELETE SET NULL");

  const commerceBefore = await getCommerceDashboardByOwner(owner.id);
  const adminBefore = await getAdminDashboardData();
  const successBefore = await prisma.redemption.count({ where: { status: "SUCCESS" } });
  const globalCapBefore = await prisma.redemption.count({ where: { promotionId: globalCap.id, status: "SUCCESS" } });
  const auditBefore = await prisma.adminActionLog.count();

  await deleteCurrentUserAccount(clientA.id);

  const [deletedClient, sessions, pushes, notifications, pending, anonymousSuccess, successAfter, controlAfter, auditAfter] = await Promise.all([
    prisma.user.findUnique({ where: { id: clientA.id } }),
    prisma.session.count({ where: { userId: clientA.id } }),
    prisma.pushToken.count({ where: { userId: clientA.id } }),
    prisma.appNotification.count({ where: { userId: clientA.id } }),
    prisma.redemption.count({ where: { status: { not: "SUCCESS" }, validationCode: { startsWith: "BLOCK12-A" } } }),
    prisma.redemption.count({ where: { userId: null, status: "SUCCESS", validationCode: { startsWith: "BLOCK12-A" } } }),
    prisma.redemption.count({ where: { status: "SUCCESS" } }),
    prisma.user.findUnique({ where: { id: clientB.id } }),
    prisma.adminActionLog.count(),
  ]);
  const commerceAfter = await getCommerceDashboardByOwner(owner.id);
  const adminAfter = await getAdminDashboardData();
  const serialized = JSON.stringify({ commerceAfter, adminAfter });
  assert(!deletedClient && sessions === 0 && pushes === 0 && notifications === 0, "La baja no eliminó identidad o relaciones personales");
  assert(pending === 0 && anonymousSuccess === 3, "La baja no aplicó la política SUCCESS/PENDING");
  assert(successAfter === successBefore, "La baja alteró el total histórico SUCCESS");
  assert(controlAfter?.email === "block12-client-b@promy.test", "CLIENT B fue alterado");
  assert(auditAfter === auditBefore, "La auditoría sintética fue alterada");
  assert(commerceAfter.metrics.redemptions.success === commerceBefore.metrics.redemptions.success, "La métrica Commerce SUCCESS cambió");
  assert(adminAfter.metrics.redemptions.success === adminBefore.metrics.redemptions.success, "La métrica ADMIN SUCCESS cambió");
  assert(!serialized.includes("block12-client-a@promy.test") && !serialized.includes("Synthetic Client A") && !serialized.includes("3454000001"), "Commerce o ADMIN reconstruyen PII eliminada");
  assert((await prisma.redemption.count({ where: { promotionId: globalCap.id, status: "SUCCESS" } })) === globalCapBefore, "El cupo global fue liberado");

  const newClientA = await prisma.user.create({ data: { fullName: "New Synthetic Account", email: "block12-client-a@promy.test", passwordHash: clientA.passwordHash, role: "CLIENT", status: "ACTIVE", emailVerifiedAt: new Date() } });
  let globalCapStatus = null;
  try {
    await createRedemptionForUser({ userId: newClientA.id, promotionId: globalCap.id });
  } catch (error) {
    globalCapStatus = error?.statusCode ?? null;
  }
  const perUserResult = await createRedemptionForUser({ userId: newClientA.id, promotionId: perUser.id });
  assert(globalCapStatus === 409, "El cupo global histórico quedó disponible después de anonimizar");
  assert(perUserResult.statusCode === 201, "La cuenta nueva no pudo consumir una promo limitada por identidad de cuenta");

  console.log(JSON.stringify({
    phase: "post-migration-and-deletion",
    schema: { userIdNullable: true, deleteRule: "SET NULL" },
    success: { before: successBefore, after: successAfter },
    commerceSuccess: { before: commerceBefore.metrics.redemptions.success, after: commerceAfter.metrics.redemptions.success },
    adminSuccess: { before: adminBefore.metrics.redemptions.success, after: adminAfter.metrics.redemptions.success },
    totalRedemptions: { before: commerceBefore.metrics.redemptions.total, after: commerceAfter.metrics.redemptions.total },
    leaderboardRedemptions: { before: adminBefore.leaderboards.topCommerces[0]?.redemptionsCount, after: adminAfter.leaderboards.topCommerces[0]?.redemptionsCount },
    globalCap: "preserved-409",
    perUserAfterReregistration: "new-account-can-redeem-DECISION_REQUIRED",
    auditRows: { before: auditBefore, after: auditAfter },
    status: "PASS",
  }));
  await prisma.$disconnect();
}

async function orchestrate() {
  const validated = validateTestDatabaseUrl(process.env.TEST_DATABASE_URL);
  const upgradeUrl = databaseUrlFor(validated.url, UPGRADE_DATABASE);
  const admin = new PrismaClient({ datasourceUrl: validated.url });
  const temporary = await fs.mkdtemp(path.join(os.tmpdir(), "promy-migrations-24-"));
  const temporaryPrisma = path.join(temporary, "prisma");
  const migrationSource = path.join(ROOT, "prisma", "migrations");
  const workerEnv = { ...process.env, DATABASE_URL: upgradeUrl, TEST_DATABASE_URL: upgradeUrl };

  try {
    await admin.$executeRawUnsafe(`DROP DATABASE IF EXISTS \`${UPGRADE_DATABASE}\``);
    await admin.$executeRawUnsafe(`CREATE DATABASE \`${UPGRADE_DATABASE}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    await fs.mkdir(path.join(temporaryPrisma, "migrations"), { recursive: true });
    await fs.copyFile(path.join(ROOT, "prisma", "schema.prisma"), path.join(temporaryPrisma, "schema.prisma"));
    await fs.copyFile(path.join(migrationSource, "migration_lock.toml"), path.join(temporaryPrisma, "migrations", "migration_lock.toml"));
    const migrations = (await fs.readdir(migrationSource, { withFileTypes: true }))
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .sort();
    const targetIndex = migrations.indexOf(TARGET_MIGRATION);
    assert(migrations.length === 27 && targetIndex === 24, "Se esperaban 27 migraciones y anonimización en la posición 25");
    for (const migration of migrations.slice(0, targetIndex)) {
      await fs.cp(path.join(migrationSource, migration), path.join(temporaryPrisma, "migrations", migration), { recursive: true });
    }

    await runCommand(NPX, ["prisma", "migrate", "deploy", "--schema", path.join(temporaryPrisma, "schema.prisma")], { root: ROOT, env: workerEnv });
    await runCommand(process.execPath, [__filename, "--seed-pre-migration"], { root: ROOT, env: workerEnv });
    await runCommand(NPX, ["prisma", "migrate", "deploy", "--schema", path.join(ROOT, "prisma", "schema.prisma")], { root: ROOT, env: workerEnv });
    await runCommand(process.execPath, [__filename, "--verify-post-migration"], { root: ROOT, env: workerEnv });
    console.log("[migration-24-to-25] PASS");
  } finally {
    await admin.$executeRawUnsafe(`DROP DATABASE IF EXISTS \`${UPGRADE_DATABASE}\``).catch(() => undefined);
    await admin.$disconnect();
    await fs.rm(temporary, { recursive: true, force: true });
  }
}

if (process.argv.includes("--seed-pre-migration")) {
  seedPreMigrationFixtures().catch((error) => { console.error(error); process.exit(1); });
} else if (process.argv.includes("--verify-post-migration")) {
  verifyMigrationAndDeletion().catch((error) => { console.error(error); process.exit(1); });
} else {
  orchestrate().catch((error) => { console.error(error instanceof Error ? error.message : error); process.exit(1); });
}
