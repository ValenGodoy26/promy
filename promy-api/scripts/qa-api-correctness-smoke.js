const prisma = require("../dist/config/prisma").default;
const { signAccessToken } = require("../dist/shared/utils/jwt");
const { isPromotionScheduleActiveNow } = require("../dist/shared/utils/promotionStatus");
const { assert, createMobileClient } = require("./qa-http-client");

const marker = `BlockFive${Date.now()}`;
const catalogMarker = `${marker}Catalog`;
const signupEmail = `${marker.toLowerCase()}@promy.test`;

function statusCounts(responses) {
  return responses.reduce((counts, response) => {
    counts[response.status] = (counts[response.status] || 0) + 1;
    return counts;
  }, {});
}

async function main() {
  const identity = await prisma.$queryRaw`SELECT DATABASE() AS databaseName`;
  assert(
    identity[0]?.databaseName === "promy_integration_test",
    `Base insegura para API correctness: ${identity[0]?.databaseName}`,
  );

  const request = (suffix) => createMobileClient({ forwardedIp: `127.70.0.${suffix}` });

  try {
    const malformed = await request(1).request("/auth/login", {
      method: "POST",
      body: "{",
    });
    assert(malformed.status === 400, `JSON malformado devolvio ${malformed.status}`);
    assert(typeof malformed.data?.requestId === "string", "JSON malformado no recibio requestId");

    const oversized = await request(2).request("/auth/login", {
      method: "POST",
      body: JSON.stringify({ value: "x".repeat(1024 * 1024 + 1) }),
    });
    assert(oversized.status === 413, `Payload grande devolvio ${oversized.status}`);

    const nullLogin = await request(3).request("/auth/login", {
      method: "POST",
      body: "null",
    });
    assert(nullLogin.status === 400, `Login null devolvio ${nullLogin.status}`);

    const longName = await request(4).request("/auth/register", {
      method: "POST",
      body: JSON.stringify({
        fullName: "A".repeat(1000),
        email: `${marker.toLowerCase()}-long@promy.test`,
        password: "BlockFive123",
      }),
    });
    assert(longName.status === 400, `Nombre excesivo devolvio ${longName.status}`);

    for (const response of [malformed, oversized, nullLogin, longName]) {
      const serialized = JSON.stringify(response.data);
      assert(!/PrismaClient|node_modules|\.ts:\d+|stack/i.test(serialized), "Una respuesta filtro detalles internos");
    }

    const signupResponses = await Promise.all(
      Array.from({ length: 10 }, (_, index) =>
        request(10 + index).request("/auth/register", {
          method: "POST",
          body: JSON.stringify({
            fullName: "Block Five Concurrent",
            email: signupEmail,
            password: "BlockFive123",
          }),
        }),
      ),
    );
    const signupCounts = statusCounts(signupResponses);
    assert(signupCounts[201] === 1, `Registro concurrente produjo ${signupCounts[201] || 0} exitos`);
    assert(signupCounts[409] === 9, `Registro concurrente no produjo 9 conflictos: ${JSON.stringify(signupCounts)}`);
    assert(
      (await prisma.user.count({ where: { email: signupEmail } })) === 1,
      "Registro concurrente creo una cantidad incorrecta de usuarios",
    );

    const user = await prisma.user.update({
      where: { email: signupEmail },
      data: { emailVerifiedAt: new Date() },
    });
    const commerce = await prisma.commerce.findFirstOrThrow({
      where: {
        status: "APPROVED",
        isHiddenByAdmin: false,
        latitude: { not: null },
        longitude: { not: null },
      },
      select: { id: true, latitude: true, longitude: true },
    });
    const redemptionPromotion = await prisma.promotion.create({
      data: {
        commerceId: commerce.id,
        title: `${marker} Concurrent Redemption`,
        description: "Promocion sintetica para concurrencia determinista",
        promotionType: "BENEFIT",
        validationMethod: "QR",
        status: "APPROVED_VISIBLE",
      },
    });
    const accessToken = signAccessToken({
      userId: user.id,
      role: user.role,
      sessionId: 999999,
      sessionVersion: user.sessionVersion,
    });
    const redemptionResponses = await Promise.all(
      Array.from({ length: 10 }, (_, index) =>
        request(30 + index).request("/redemptions", {
          method: "POST",
          headers: { Authorization: `Bearer ${accessToken}` },
          body: JSON.stringify({ promotionId: redemptionPromotion.id }),
        }),
      ),
    );
    const redemptionCounts = statusCounts(redemptionResponses);
    assert(redemptionCounts[201] === 1, `Canje concurrente produjo ${redemptionCounts[201] || 0} creaciones`);
    assert(redemptionCounts[200] === 9, `Canje concurrente no reutilizo 9 resultados: ${JSON.stringify(redemptionCounts)}`);
    assert(
      (await prisma.redemption.count({ where: { promotionId: redemptionPromotion.id, userId: user.id } })) === 1,
      "Canje concurrente creo mas de una fila",
    );
    assert(
      new Set(redemptionResponses.map((response) => response.data?.redemption?.id)).size === 1,
      "Canje concurrente no devolvio el mismo recurso",
    );

    const mondayOvernight = { weekday: "MONDAY", startTime: "22:00", endTime: "02:00" };
    const overnightCases = [
      ["2026-09-08T00:59:00.000Z", false],
      ["2026-09-08T01:00:00.000Z", true],
      ["2026-09-08T02:59:00.000Z", true],
      ["2026-09-08T03:00:00.000Z", true],
      ["2026-09-08T04:59:00.000Z", true],
      ["2026-09-08T05:00:00.000Z", true],
      ["2026-09-08T05:01:00.000Z", false],
      ["2026-09-07T04:00:00.000Z", false],
    ];
    for (const [timestamp, expected] of overnightCases) {
      assert(
        isPromotionScheduleActiveNow(mondayOvernight, new Date(timestamp)) === expected,
        `Horario nocturno incorrecto en ${timestamp}`,
      );
    }

    await prisma.promotion.createMany({
      data: [
        ...Array.from({ length: 4 }, (_, index) => ({
          commerceId: commerce.id,
          title: `${catalogMarker} A Closed ${index}`,
          description: "Cerrada por horario para probar paginacion",
          promotionType: "BENEFIT",
          status: "APPROVED_VISIBLE",
          startTime: "01:00",
          endTime: "01:01",
          isFeatured: true,
          featuredRank: -100 - index,
        })),
        ...Array.from({ length: 3 }, (_, index) => ({
          commerceId: commerce.id,
          title: `${catalogMarker} Z Open ${index}`,
          description: "Elegible despues de candidatos cerrados",
          promotionType: "BENEFIT",
          status: "APPROVED_VISIBLE",
          isFeatured: false,
          featuredRank: index,
        })),
      ],
    });

    const catalogPageOne = await request(50).request(`/promotions?search=${catalogMarker}&limit=2&page=1`);
    const catalogPageTwo = await request(51).request(`/promotions?search=${catalogMarker}&limit=2&page=2`);
    assert(catalogPageOne.status === 200, "Catalogo paginado fallo");
    assert(catalogPageOne.data.promotions.length === 2, "Catalogo no completo la primera pagina elegible");
    assert(catalogPageOne.data.hasMore === true, "Catalogo declaro hasMore falso prematuramente");
    assert(catalogPageTwo.data.promotions.length === 1, "Catalogo no permitio alcanzar el resultado posterior");
    assert(catalogPageTwo.data.hasMore === false, "Ultima pagina del catalogo declaro hasMore incorrecto");

    const search = await request(52).request(`/search?q=${catalogMarker}&limit=2`);
    assert(search.status === 200, "Busqueda de regresion fallo");
    assert(search.data.promotions.length === 2, "Busqueda filtro antes de completar resultados elegibles");

    const nearbyCity = await request(53).request(`/promotions/nearby?search=${catalogMarker}&limit=2&page=1`);
    assert(nearbyCity.status === 200, "Nearby por ciudad fallo");
    assert(nearbyCity.data.promotions.length === 2 && nearbyCity.data.hasMore === true, "Nearby por ciudad conserva falso vacio/hasMore");

    const nearbyDevice = await request(54).request(
      `/promotions/nearby?search=${catalogMarker}&limit=2&page=1&lat=${commerce.latitude}&lng=${commerce.longitude}`,
    );
    assert(nearbyDevice.status === 200, "Nearby por ubicacion fallo");
    assert(nearbyDevice.data.promotions.length === 2 && nearbyDevice.data.hasMore === true, "Nearby por ubicacion conserva falso vacio/hasMore");

    console.log(JSON.stringify({
      smoke: "api-correctness",
      database: identity[0].databaseName,
      api001: {
        malformedJson: 400,
        oversizedJson: 413,
        nullValidation: 400,
        excessiveLength: 400,
        internalDetailsExposed: false,
      },
      api002: {
        concurrentSignup: signupCounts,
        concurrentRedemption: redemptionCounts,
        signupRows: 1,
        redemptionRows: 1,
        redemptionResourceIds: 1,
      },
      dom001: {
        schedule: "MONDAY 22:00-TUESDAY 02:00",
        boundaries: "21:59=false,22:00=true,23:59=true,00:00=true,01:59=true,02:00=true,02:01=false",
        monday0100: false,
      },
      cat001: {
        catalogPages: [2, 1],
        catalogHasMore: [true, false],
        searchCount: search.data.promotions.length,
        nearbyCityCount: nearbyCity.data.promotions.length,
        nearbyDeviceCount: nearbyDevice.data.promotions.length,
      },
      status: "PASS",
    }));
  } finally {
    await prisma.promotion.deleteMany({ where: { title: { contains: marker } } });
    await prisma.user.deleteMany({ where: { email: { startsWith: marker.toLowerCase() } } });
  }
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.stack || error.message : error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
