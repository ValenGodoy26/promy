const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();
const ROOT = path.resolve(__dirname, "..");
const DIRECTORY = path.join(ROOT, "uploads", "commerce");
const NPM = process.platform === "win32" ? "npm.cmd" : "npm";
const names = {
  referenced: "00000000-0000-4000-8000-000000000001-referenced.webp",
  recent: "00000000-0000-4000-8000-000000000002-recent.webp",
  old: "00000000-0000-4000-8000-000000000003-old.webp",
  unmanaged: "unmanaged-block12.webp",
};

function runAudit(deleteExplicitly = false) {
  const args = ["run", "uploads:audit"];
  if (deleteExplicitly) args.push("--", "--delete");
  const result = spawnSync(NPM, args, {
    cwd: ROOT,
    env: { ...process.env, UPLOADS_DRIVER: "local" },
    encoding: "utf8",
  });
  if (result.status !== 0) throw new Error(result.stderr || result.stdout || "uploads:audit falló");
  const marker = result.stdout.lastIndexOf("{\n  \"mode\"");
  assert.notEqual(marker, -1, "uploads:audit no devolvió su reporte JSON");
  return JSON.parse(result.stdout.slice(marker));
}

async function exists(filename) {
  try {
    await fs.access(path.join(DIRECTORY, filename));
    return true;
  } catch {
    return false;
  }
}

async function main() {
  const commerce = await prisma.commerce.findFirstOrThrow({ select: { id: true, logoUrl: true } });
  const oldDate = new Date(Date.now() - 48 * 60 * 60 * 1000);
  await fs.mkdir(DIRECTORY, { recursive: true });
  try {
    for (const filename of Object.values(names)) await fs.writeFile(path.join(DIRECTORY, filename), "synthetic-block12");
    await fs.utimes(path.join(DIRECTORY, names.referenced), oldDate, oldDate);
    await fs.utimes(path.join(DIRECTORY, names.old), oldDate, oldDate);
    await fs.utimes(path.join(DIRECTORY, names.unmanaged), oldDate, oldDate);
    await prisma.commerce.update({ where: { id: commerce.id }, data: { logoUrl: `/uploads/commerce/${names.referenced}` } });

    const dryRun = runAudit(false);
    assert.equal(dryRun.mode, "dry-run");
    assert.deepEqual(dryRun.eligibleOrphans, [`commerce/${names.old}`]);
    assert.equal(dryRun.deleted, 0);
    assert.equal(await exists(names.referenced), true);
    assert.equal(await exists(names.recent), true);
    assert.equal(await exists(names.old), true);
    assert.equal(await exists(names.unmanaged), true);

    const deletion = runAudit(true);
    assert.equal(deletion.mode, "delete-explicit");
    assert.deepEqual(deletion.eligibleOrphans, [`commerce/${names.old}`]);
    assert.equal(deletion.deleted, 1);
    assert.equal(await exists(names.referenced), true);
    assert.equal(await exists(names.recent), true);
    assert.equal(await exists(names.old), false);
    assert.equal(await exists(names.unmanaged), true);
    console.log(JSON.stringify({ smoke: "upload-orphan-audit", dryRun: "safe", delete: "old-managed-only", gracePeriod: "protected", unmanaged: "ignored", status: "PASS" }));
  } finally {
    await prisma.commerce.update({ where: { id: commerce.id }, data: { logoUrl: commerce.logoUrl } }).catch(() => undefined);
    await Promise.all(Object.values(names).map((filename) => fs.rm(path.join(DIRECTORY, filename), { force: true })));
    await prisma.$disconnect();
  }
}

main().catch(async (error) => {
  console.error(error instanceof Error ? error.message : error);
  await prisma.$disconnect().catch(() => undefined);
  process.exit(1);
});
