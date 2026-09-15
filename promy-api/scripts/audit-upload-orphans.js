const { PrismaClient } = require("@prisma/client");
const {
  deleteCommerceImageUpload,
  getManagedCommerceUploadKey,
  listCommerceImageUploads,
} = require("../dist/shared/services/uploads.service");

const prisma = new PrismaClient();
const shouldDelete = process.argv.includes("--delete");
const graceMs = 24 * 60 * 60 * 1000;

async function main() {
  const [commerces, promotions, stored] = await Promise.all([
    prisma.commerce.findMany({ select: { logoUrl: true, coverUrl: true } }),
    prisma.promotion.findMany({ select: { imageUrl: true } }),
    listCommerceImageUploads(),
  ]);
  const referenced = new Set([
    ...commerces.flatMap((item) => [item.logoUrl, item.coverUrl]),
    ...promotions.map((item) => item.imageUrl),
  ].map(getManagedCommerceUploadKey).filter(Boolean));
  const cutoff = Date.now() - graceMs;
  const orphans = stored.filter((item) => !referenced.has(item.key) && item.modifiedAt && item.modifiedAt.getTime() < cutoff);

  if (shouldDelete) {
    for (const orphan of orphans) await deleteCommerceImageUpload(`/${orphan.key}`);
  }

  console.log(JSON.stringify({
    mode: shouldDelete ? "delete-explicit" : "dry-run",
    graceHours: 24,
    stored: stored.length,
    referenced: referenced.size,
    eligibleOrphans: orphans.map((item) => item.key),
    deleted: shouldDelete ? orphans.length : 0,
  }, null, 2));
}

main()
  .catch((error) => {
    console.error(JSON.stringify({
      ok: false,
      mode: shouldDelete ? "delete-explicit" : "dry-run",
      error: error instanceof Error ? error.message.split("\n")[0] : "No se pudo completar la auditoría de uploads",
    }));
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
