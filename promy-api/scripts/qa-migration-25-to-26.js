const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const { PrismaClient } = require("@prisma/client");
const { runCommand } = require("./qa-process");
const { validateTestDatabaseUrl } = require("./qa-database-guard");

const ROOT = path.resolve(__dirname, "..");
const TARGET_MIGRATION = "20260915121500_restrict_commerce_location_srid";
const UPGRADE_DATABASE = "promy_upgrade_25_26_test";
const NPX = process.platform === "win32" ? "npx.cmd" : "npx";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function stringify(value) {
  return JSON.stringify(value, (_key, item) => (typeof item === "bigint" ? Number(item) : item));
}

function databaseUrlFor(baseUrl, databaseName) {
  const parsed = new URL(baseUrl);
  parsed.pathname = `/${databaseName}`;
  return parsed.toString();
}

async function seedAndSnapshot() {
  const prisma = new PrismaClient();
  await prisma.$executeRawUnsafe(`
    INSERT INTO City (name, province, slug, isActive) VALUES
      ('Block 13 City', 'Entre Ríos', 'block13-city', true);
  `);
  await prisma.$executeRawUnsafe(`
    INSERT INTO Category (name, slug, isActive) VALUES
      ('Block 13 Category', 'block13-category', true);
  `);
  await prisma.$executeRawUnsafe(`
    INSERT INTO User (fullName, email, passwordHash, role, status, sessionVersion, createdAt, updatedAt) VALUES
      ('Block 13 Owner', 'block13-owner@promy.test', 'synthetic-not-for-login', 'COMMERCE', 'ACTIVE', 0, NOW(), NOW());
  `);
  await prisma.$executeRawUnsafe(`
    INSERT INTO Commerce (
      ownerUserId, cityId, categoryId, name, slug, address, latitude, longitude,
      status, isFeatured, featuredRank, isHiddenByAdmin, isSuspendedByAdmin,
      createdAt, updatedAt
    ) SELECT User.id, City.id, Category.id, 'Block 13 Commerce', 'block13-commerce',
      'Synthetic 123', -31.392, -58.017, 'APPROVED', false, 0, false, false, NOW(), NOW()
      FROM User JOIN City ON City.slug='block13-city'
      JOIN Category ON Category.slug='block13-category'
      WHERE User.email='block13-owner@promy.test';
  `);
  const rows = await prisma.$queryRawUnsafe(
    "SELECT id, ST_SRID(location) AS srid, ST_X(location) AS longitude, ST_Y(location) AS latitude FROM Commerce WHERE slug='block13-commerce'",
  );
  assert(rows.length === 1 && Number(rows[0].srid) === 0, "Fixture previo no usa SRID 0");
  console.log(stringify({ phase: "pre-migration-26", row: rows[0], status: "PASS" }));
  await prisma.$disconnect();
}

async function verifyAfterMigration() {
  const prisma = new PrismaClient();
  const [columns, indexes, rows] = await Promise.all([
    prisma.$queryRawUnsafe("SELECT SRS_ID AS srsId, IS_NULLABLE AS nullable FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='Commerce' AND COLUMN_NAME='location'"),
    prisma.$queryRawUnsafe("SELECT INDEX_NAME AS indexName, INDEX_TYPE AS indexType FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='Commerce' AND INDEX_NAME='Commerce_location_spatial_idx'"),
    prisma.$queryRawUnsafe("SELECT id, ST_SRID(location) AS srid, ST_X(location) AS longitude, ST_Y(location) AS latitude FROM Commerce WHERE slug='block13-commerce'"),
  ]);
  assert(Number(columns[0]?.srsId) === 0 && columns[0]?.nullable === "NO", "location no quedó NOT NULL SRID 0");
  assert(indexes[0]?.indexType === "SPATIAL", "Índice espacial no fue recreado");
  assert(rows.length === 1 && Number(rows[0].srid) === 0, "La migración alteró o perdió la geometría");
  assert(Number(rows[0].longitude) === -58.017 && Number(rows[0].latitude) === -31.392, "La migración alteró coordenadas");
  console.log(stringify({ phase: "post-migration-26", schema: columns[0], index: indexes[0], row: rows[0], status: "PASS" }));
  await prisma.$disconnect();
}

async function orchestrate() {
  const validated = validateTestDatabaseUrl(process.env.TEST_DATABASE_URL);
  const upgradeUrl = databaseUrlFor(validated.url, UPGRADE_DATABASE);
  const admin = new PrismaClient({ datasourceUrl: validated.url });
  const temporary = await fs.mkdtemp(path.join(os.tmpdir(), "promy-migrations-25-"));
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
    assert(targetIndex === 25 && migrations.length > targetIndex, "La migración SRID debe conservar la posición 26");
    for (const migration of migrations.slice(0, targetIndex)) {
      await fs.cp(path.join(migrationSource, migration), path.join(temporaryPrisma, "migrations", migration), { recursive: true });
    }
    await runCommand(NPX, ["prisma", "migrate", "deploy", "--schema", path.join(temporaryPrisma, "schema.prisma")], { root: ROOT, env: workerEnv });
    await runCommand(process.execPath, [__filename, "--seed"], { root: ROOT, env: workerEnv });
    await runCommand(NPX, ["prisma", "migrate", "deploy", "--schema", path.join(ROOT, "prisma", "schema.prisma")], { root: ROOT, env: workerEnv });
    await runCommand(process.execPath, [__filename, "--verify"], { root: ROOT, env: workerEnv });
    console.log("[migration-25-to-26] PASS");
  } finally {
    await admin.$executeRawUnsafe(`DROP DATABASE IF EXISTS \`${UPGRADE_DATABASE}\``).catch(() => undefined);
    await admin.$disconnect();
    await fs.rm(temporary, { recursive: true, force: true });
  }
}

if (process.argv.includes("--seed")) seedAndSnapshot().catch((error) => { console.error(error); process.exit(1); });
else if (process.argv.includes("--verify")) verifyAfterMigration().catch((error) => { console.error(error); process.exit(1); });
else orchestrate().catch((error) => { console.error(error instanceof Error ? error.message : error); process.exit(1); });
