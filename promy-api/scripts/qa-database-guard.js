function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function validateTestDatabaseUrl(rawUrl) {
  assert(rawUrl, "TEST_DATABASE_URL es obligatoria para correr integration tests.");

  let parsed;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new Error("TEST_DATABASE_URL no es una URL valida.");
  }

  assert(parsed.protocol === "mysql:", "TEST_DATABASE_URL debe utilizar mysql://.");

  const databaseName = decodeURIComponent(parsed.pathname.replace(/^\/+/, "")).trim();
  assert(databaseName, "TEST_DATABASE_URL debe indicar el nombre de la base.");

  const normalized = databaseName.toLowerCase();
  const testNamed = /(^|[_-])(test|tests|qa)([_-]|$)/.test(normalized);
  const productionLike = /(^|[_-])(prod|production|staging|stage|dev|development)([_-]|$)/.test(
    normalized,
  );
  const explicitlyForbidden = new Set(["promy", "promy_db"]);

  assert(
    testNamed && !productionLike && !explicitlyForbidden.has(normalized),
    `Base rechazada: '${databaseName}'. Debe contener test/tests/qa y no puede parecer development, staging o production.`,
  );

  return { databaseName, url: rawUrl };
}

module.exports = {
  validateTestDatabaseUrl,
};
