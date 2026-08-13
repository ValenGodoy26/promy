const { prisma } = require("./seed.shared");
const { runBootstrapSeed } = require("./seed.bootstrap");
const { runDemoSeed } = require("./seed.demo");

const seedMode = (process.env.SEED_MODE || (process.env.APP_ENV === "production" ? "bootstrap" : "demo"))
  .trim()
  .toLowerCase();

async function main() {
  console.log(`[seed] iniciando modo ${seedMode}`);

  if (seedMode === "bootstrap") {
    await runBootstrapSeed();
    return;
  }

  if (seedMode === "demo") {
    await runDemoSeed();
    return;
  }

  throw new Error(`SEED_MODE invalido: ${seedMode}`);
}

main()
  .catch((error) => {
    console.error("[seed] error:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
