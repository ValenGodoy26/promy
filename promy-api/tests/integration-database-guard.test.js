const assert = require("node:assert/strict");
const test = require("node:test");
const { validateTestDatabaseUrl } = require("../scripts/qa-database-guard");

test("integration DB guard accepts explicit MySQL test databases", () => {
  assert.equal(
    validateTestDatabaseUrl("mysql://root@127.0.0.1:3306/promy_integration_test").databaseName,
    "promy_integration_test",
  );
  assert.equal(
    validateTestDatabaseUrl("mysql://root@127.0.0.1:3306/promy_qa").databaseName,
    "promy_qa",
  );
});

test("integration DB guard rejects the development database", () => {
  assert.throws(
    () => validateTestDatabaseUrl("mysql://root@127.0.0.1:3306/promy_db"),
    /Base rechazada/,
  );
});

test("integration DB guard rejects production-like names even if they contain test", () => {
  assert.throws(
    () => validateTestDatabaseUrl("mysql://root@127.0.0.1:3306/promy_production_test"),
    /Base rechazada/,
  );
});

test("integration DB guard rejects development-like names even if they contain qa", () => {
  assert.throws(
    () => validateTestDatabaseUrl("mysql://root@127.0.0.1:3306/promy_dev_qa"),
    /Base rechazada/,
  );
});

test("integration DB guard rejects non-MySQL URLs", () => {
  assert.throws(
    () => validateTestDatabaseUrl("postgresql://root@127.0.0.1:5432/promy_test"),
    /mysql/,
  );
});
