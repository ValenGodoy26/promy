require("dotenv/config");
const test = require("node:test");
const assert = require("node:assert/strict");

const {
  getCommerceReadiness,
} = require("../dist/modules/admin/admin.service.js");
const {
  withFullTextSearchFallback,
} = require("../dist/shared/utils/service.js");

test("withFullTextSearchFallback retries with contains fallback when fulltext index is missing", async () => {
  let usedFallback = false;

  const result = await withFullTextSearchFallback(
    async () => {
      throw new Error("Cannot find a fulltext index to use for the native search");
    },
    async () => {
      usedFallback = true;
      return ["ok"];
    },
    "tests.search-fallback",
  );

  assert.equal(usedFallback, true);
  assert.deepEqual(result, ["ok"]);
});

test("withFullTextSearchFallback rethrows non-fulltext errors", async () => {
  await assert.rejects(
    () =>
      withFullTextSearchFallback(
        async () => {
          throw new Error("database connection lost");
        },
        async () => ["ok"],
        "tests.search-fallback",
      ),
    /database connection lost/,
  );
});

test("getCommerceReadiness blocks approved commerce when owner email is not verified", () => {
  const readiness = getCommerceReadiness({
    status: "APPROVED",
    address: "San Martin 123",
    latitude: -31.39,
    longitude: -58.02,
    shortDescription: "Cafe de especialidad",
    description: "Promos reales",
    phone: "3455555555",
    instagram: "@cafe",
    logoUrl: "https://cdn.example.com/logo.png",
    coverUrl: "https://cdn.example.com/cover.png",
    owner: {
      emailVerifiedAt: null,
    },
    city: {
      isActive: true,
    },
    category: {
      isActive: true,
    },
  });

  assert.equal(readiness.isApproved, true);
  assert.equal(readiness.isMapReady, false);
  assert.equal(readiness.isProfileComplete, false);
  assert.ok(readiness.blockingFields.includes("emailNotVerified"));
  assert.ok(readiness.missingFields.includes("emailNotVerified"));
});
