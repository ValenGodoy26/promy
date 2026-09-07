const { assert, createWebClient } = require("./qa-http-client");

async function main() {
  const client = createWebClient({ forwardedIp: "127.13.0.1" });
  let lastResponse;

  for (let attempt = 1; attempt <= 9; attempt += 1) {
    lastResponse = await client.request("/auth/login", {
      method: "POST",
      body: JSON.stringify({
        email: "rate-limit-missing@promy.test",
        password: "WrongPassword123!",
      }),
    });

    if (attempt <= 8) {
      assert(lastResponse.status === 401, `Intento ${attempt} esperaba 401 y obtuvo ${lastResponse.status}`);
      assert(
        lastResponse.headers.has("ratelimit-limit") &&
          lastResponse.headers.has("ratelimit-remaining") &&
          lastResponse.headers.has("ratelimit-reset"),
        "Faltan headers estandar RateLimit draft-6",
      );
      assert(!lastResponse.headers.has("x-ratelimit-limit"), "Se emitio un header legacy de rate limit");
    }
  }

  assert(lastResponse.status === 429, `El noveno intento esperaba 429 y obtuvo ${lastResponse.status}`);

  console.log(JSON.stringify({
    ok: true,
    attemptsBeforeBlock: 8,
    blockedStatus: lastResponse.status,
    standardHeaders: "draft-6",
    legacyHeaders: false,
    message: "Smoke QA de rate limiting completada correctamente.",
  }, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
