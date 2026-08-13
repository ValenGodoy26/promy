const { ensureBaseCatalog, ensureBootstrapAdmin } = require("./seed.shared");

async function runBootstrapSeed() {
  await ensureBaseCatalog();
  await ensureBootstrapAdmin({
    requirePassword: process.env.APP_ENV === "production",
  });

  console.log("[seed] modo bootstrap: solo catalogos base + admin inicial");
}

module.exports = {
  runBootstrapSeed,
};
