require("dotenv/config");
const { PrismaClient } = require("@prisma/client");
const { validateTestDatabaseUrl, assertCurrentTestDatabase } = require("./qa-database-guard");
const { createCommerceWithLocation } = require("../prisma/commerce.spatial");

const prisma = new PrismaClient();
const fulltextProbe = new PrismaClient({ log: [{ emit: "event", level: "query" }] });
const fulltextQueries = [];

fulltextProbe.$on("query", (event) => {
  if (/MATCH\s*\(|AGAINST\s*\(/i.test(event.query)) {
    fulltextQueries.push({ query: event.query, params: event.params });
  }
});
const COMMERCE_COUNT = Number(process.env.QA_DB_COMMERCE_COUNT || 1100);
const PROMOTION_COUNT = Number(process.env.QA_DB_PROMOTION_COUNT || 5500);
const ORIGIN = { latitude: -31.392, longitude: -58.017 };
const RADIUS_KM = 8;
const EXPLAIN_POSITIONAL_FIELDS = {
  id: "f0",
  select_type: "f1",
  table: "f2",
  partitions: "f3",
  type: "f4",
  possible_keys: "f5",
  key: "f6",
  key_len: "f7",
  ref: "f8",
  rows: "f9",
  filtered: "f10",
  extra: "f11",
};

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function explainValue(row, name) {
  const target = name.toLowerCase();
  const matchingKey = Object.keys(row).find((key) => key.toLowerCase() === target);
  if (matchingKey !== undefined) return row[matchingKey];
  const positionalKey = EXPLAIN_POSITIONAL_FIELDS[target];
  return positionalKey === undefined ? undefined : row[positionalKey];
}

function planSummary(rows) {
  return rows.map((row) => ({
    table: explainValue(row, "table") ?? null,
    accessType: explainValue(row, "type") ?? null,
    possibleKeys: explainValue(row, "possible_keys") ?? null,
    key: explainValue(row, "key") ?? null,
    keyLength: explainValue(row, "key_len") ?? null,
    rows: explainValue(row, "rows") == null ? null : Number(explainValue(row, "rows")),
    filtered: explainValue(row, "filtered") == null ? null : Number(explainValue(row, "filtered")),
    extra: explainValue(row, "Extra") ?? null,
  }));
}

function stringify(value) {
  return JSON.stringify(value, (_, current) => (typeof current === "bigint" ? current.toString() : current));
}

function elapsedMs(start) {
  return Number(process.hrtime.bigint() - start) / 1_000_000;
}

async function main() {
  validateTestDatabaseUrl(process.env.TEST_DATABASE_URL);
  await assertCurrentTestDatabase(prisma, "qa-db-performance");
  const versionRows = await prisma.$queryRawUnsafe("SELECT VERSION() AS version");
  const version = String(versionRows[0]?.version || "unknown");
  assert(/^8\.4\./.test(version), `El harness autoritativo requiere MySQL 8.4; recibido ${version}`);

  const marker = `block13-${Date.now()}`;
  const city = await prisma.city.findFirstOrThrow({ where: { isActive: true } });
  const category = await prisma.category.findFirstOrThrow({ where: { isActive: true } });
  const passwordHash = "$2b$12$C6UzMDM.H6dfI/f/IKxGhuM/0BNTVnPtuNnTjk6kXyMnYpIzcW6i";

  try {
    await prisma.user.createMany({
      data: Array.from({ length: COMMERCE_COUNT }, (_, index) => ({
        fullName: `Performance Owner ${index}`,
        email: `${marker}-${index}@promy.test`,
        passwordHash,
        role: "COMMERCE",
        status: "ACTIVE",
        emailVerifiedAt: new Date(),
      })),
    });
    const owners = await prisma.user.findMany({
      where: { email: { startsWith: marker } },
      orderBy: { id: "asc" },
      select: { id: true },
    });

    for (let index = 0; index < owners.length; index += 1) {
      const near = index < 100;
      const ring = index % 10;
      await createCommerceWithLocation(prisma, {
        ownerUserId: owners[index].id,
        cityId: city.id,
        categoryId: category.id,
        name: `${marker} comercio ${index}`,
        slug: `${marker}-commerce-${index}`,
        shortDescription: `Comercio performance ${marker}`,
        description: `Fixture geográfico ${marker}`,
        address: `Calle ${index}`,
        latitude: near ? ORIGIN.latitude + ring * 0.003 : ORIGIN.latitude + 1 + (index % 50) * 0.01,
        longitude: near ? ORIGIN.longitude + ring * 0.003 : ORIGIN.longitude + 1 + (index % 50) * 0.01,
        status: "APPROVED",
      });
    }

    const commerces = await prisma.commerce.findMany({
      where: { slug: { startsWith: `${marker}-commerce-` } },
      orderBy: { id: "asc" },
      select: { id: true },
    });
    await prisma.promotion.createMany({
      data: Array.from({ length: PROMOTION_COUNT }, (_, index) => ({
        commerceId: commerces[index % commerces.length].id,
        title: `${marker} promoción ${index}`,
        description: `Oferta performance ${marker}`,
        conditions: `Condiciones ${marker}`,
        promotionType: "BENEFIT",
        status: "APPROVED_VISIBLE",
        startDate: new Date("2026-01-01T00:00:00.000Z"),
        endDate: new Date("2027-12-31T23:59:59.999Z"),
      })),
    });

    const latitudeDelta = RADIUS_KM / 111.32;
    const longitudeDelta = RADIUS_KM / (111.32 * Math.cos((ORIGIN.latitude * Math.PI) / 180));
    const minLat = ORIGIN.latitude - latitudeDelta;
    const maxLat = ORIGIN.latitude + latitudeDelta;
    const minLng = ORIGIN.longitude - longitudeDelta;
    const maxLng = ORIGIN.longitude + longitudeDelta;
    const polygon = `POLYGON((${minLng} ${minLat},${maxLng} ${minLat},${maxLng} ${maxLat},${minLng} ${maxLat},${minLng} ${minLat}))`;
    const distance = `ST_Distance_Sphere(location, POINT(${ORIGIN.longitude}, ${ORIGIN.latitude})) / 1000`;
    const originalSql = `SELECT id, ${distance} AS distanceKm FROM Commerce WHERE status='APPROVED' AND isHiddenByAdmin=false AND latitude IS NOT NULL AND longitude IS NOT NULL AND latitude BETWEEN ${minLat} AND ${maxLat} AND longitude BETWEEN ${minLng} AND ${maxLng} AND ${distance} <= ${RADIUS_KM} ORDER BY distanceKm ASC, id ASC LIMIT 50`;
    const optimizedSql = `SELECT id, ${distance} AS distanceKm FROM Commerce FORCE INDEX (Commerce_location_spatial_idx) WHERE status='APPROVED' AND isHiddenByAdmin=false AND latitude IS NOT NULL AND longitude IS NOT NULL AND MBRWithin(location, ST_GeomFromText('${polygon}')) AND latitude BETWEEN ${minLat} AND ${maxLat} AND longitude BETWEEN ${minLng} AND ${maxLng} AND ${distance} <= ${RADIUS_KM} ORDER BY distanceKm ASC, id ASC LIMIT 50`;

    const beforePlan = await prisma.$queryRawUnsafe(`EXPLAIN ${originalSql}`);
    const afterPlan = await prisma.$queryRawUnsafe(`EXPLAIN ${optimizedSql}`);
    const beforeStart = process.hrtime.bigint();
    const beforeRows = await prisma.$queryRawUnsafe(originalSql);
    const beforeMs = elapsedMs(beforeStart);
    const afterStart = process.hrtime.bigint();
    const afterRows = await prisma.$queryRawUnsafe(optimizedSql);
    const afterMs = elapsedMs(afterStart);
    assert(
      JSON.stringify(beforeRows.map((row) => row.id)) === JSON.stringify(afterRows.map((row) => row.id)),
      "La consulta optimizada no conserva el conjunto/orden de resultados",
    );
    const optimizedCommercePlan = planSummary(afterPlan).find((row) => row.table === "Commerce");
    const spatialColumn = await prisma.$queryRawUnsafe(
      "SELECT COLUMN_TYPE AS columnType, IS_NULLABLE AS isNullable, SRS_ID AS srsId FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='Commerce' AND COLUMN_NAME='location'",
    );
    const spatialIndexes = await prisma.$queryRawUnsafe(
      "SELECT INDEX_NAME AS indexName, INDEX_TYPE AS indexType, COLUMN_NAME AS columnName FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='Commerce' AND INDEX_TYPE='SPATIAL' ORDER BY INDEX_NAME, SEQ_IN_INDEX",
    );
    console.log(stringify({
      phase: "geo-query-plans",
      sql: { before: originalSql, after: optimizedSql },
      before: planSummary(beforePlan),
      after: planSummary(afterPlan),
      spatialColumn: spatialColumn[0] ?? null,
      spatialIndexes,
    }));
    assert(Number(spatialColumn[0]?.srsId) === 0, "Commerce.location no está restringida a SRID 0");
    assert(optimizedCommercePlan?.key === "Commerce_location_spatial_idx", "MySQL no eligió el índice espacial");
    assert(optimizedCommercePlan?.accessType !== "ALL", "La consulta optimizada conserva full table scan");

    const fulltextIndexes = await prisma.$queryRawUnsafe(
      "SELECT TABLE_NAME AS tableName, INDEX_NAME AS indexName, INDEX_TYPE AS indexType FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA=DATABASE() AND INDEX_TYPE='FULLTEXT' AND TABLE_NAME IN ('Commerce','Promotion') ORDER BY TABLE_NAME, INDEX_NAME",
    );
    assert(fulltextIndexes.length === 7, `Se esperaban 7 índices FULLTEXT y se encontraron ${fulltextIndexes.length}`);
    let nativeSearch = null;
    let nativeSearchError = null;
    try {
      nativeSearch = await fulltextProbe.promotion.findMany({
        where: {
          OR: [
            { title: { search: marker } },
            { description: { search: marker } },
            { conditions: { search: marker } },
            { commerce: { is: { name: { search: marker } } } },
          ],
        },
        take: 10,
        select: { id: true },
      });
    } catch (error) {
      nativeSearchError = error instanceof Error ? error.message : String(error);
    }
    console.log(stringify({
      phase: "fulltext-native-search",
      indexes: fulltextIndexes,
      queries: fulltextQueries,
      nativeSearchError,
      resultCount: nativeSearch?.length ?? null,
    }));
    assert(!nativeSearchError, "La búsqueda FULLTEXT nativa de Prisma falló");
    assert(nativeSearch.length > 0, "La consulta FULLTEXT real de Prisma no devolvió fixtures");

    console.log(stringify({
      harness: "db-performance",
      engine: version,
      dataset: { commerces: COMMERCE_COUNT, promotions: PROMOTION_COUNT, nearby: 100 },
      before: { plan: planSummary(beforePlan), approximateMs: Number(beforeMs.toFixed(3)) },
      after: { plan: planSummary(afterPlan), approximateMs: Number(afterMs.toFixed(3)) },
      equivalentResultIds: beforeRows.length,
      fulltext: { indexes: fulltextIndexes.length, prismaNativeResults: nativeSearch.length, classification: "MYSQL_FIXED" },
      status: "PASS",
    }));
  } finally {
    await prisma.user.deleteMany({ where: { email: { startsWith: marker } } });
    await prisma.$disconnect();
    await fulltextProbe.$disconnect();
  }
}

main().catch(async (error) => {
  console.error(error instanceof Error ? error.stack || error.message : error);
  await prisma.$disconnect().catch(() => undefined);
  await fulltextProbe.$disconnect().catch(() => undefined);
  process.exit(1);
});
