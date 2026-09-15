require("dotenv/config");
const test = require("node:test");
const assert = require("node:assert/strict");

const {
  findNearbyCommerceDistanceRows,
  getSpatialBoundingPolygonWkt,
} = require("../dist/shared/services/spatial.service.js");

test("spatial bounding polygon is closed and uses longitude-latitude order", () => {
  assert.equal(
    getSpatialBoundingPolygonWkt({
      minLatitude: -31.5,
      maxLatitude: -31.3,
      minLongitude: -58.2,
      maxLongitude: -58.0,
    }),
    "POLYGON((-58.2 -31.5,-58 -31.5,-58 -31.3,-58.2 -31.3,-58.2 -31.5))",
  );
});

test("nearby query keeps exact distance/order and adds an indexable spatial prefilter", async () => {
  let capturedQuery;
  const rows = [{ id: 7, distanceKm: 1.25 }];
  const db = {
    async $queryRaw(query) {
      capturedQuery = query;
      return rows;
    },
  };

  assert.deepEqual(
    await findNearbyCommerceDistanceRows(db, {
      origin: { latitude: -31.392, longitude: -58.017 },
      radiusKm: 8,
      take: 24,
    }),
    rows,
  );

  const sql = capturedQuery.strings.join("?");
  assert.match(sql, /FORCE INDEX \(Commerce_location_spatial_idx\)/);
  assert.match(sql, /MBRContains\(ST_GeomFromText\(\?\), location\)/);
  assert.match(sql, /ST_Distance_Sphere/);
  assert.match(sql, /ORDER BY distanceKm ASC, id ASC/);
  assert.match(sql, /LIMIT \? OFFSET \?/);
});
