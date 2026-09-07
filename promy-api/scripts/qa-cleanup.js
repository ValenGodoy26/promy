const { PrismaClient } = require("@prisma/client");
const { validateTestDatabaseUrl } = require("./qa-database-guard");

function assertSafeTestEnvironment() {
  if (process.env.APP_ENV !== "test") {
    throw new Error("qa-cleanup solo puede ejecutarse con APP_ENV=test.");
  }

  validateTestDatabaseUrl(process.env.DATABASE_URL);
}

async function main() {
  assertSafeTestEnvironment();
  const prisma = new PrismaClient();

  try {
    const sessions = await prisma.session.deleteMany();
    console.log(`[integration] cleanup: ${sessions.count} sesiones temporales eliminadas`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
