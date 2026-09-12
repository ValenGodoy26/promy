const assert = require("node:assert/strict");
const http = require("node:http");
const test = require("node:test");
const { createShutdownController } = require("../dist/shared/server/shutdown");
const { isServerShuttingDown, resetServerRuntimeStateForTests } = require("../dist/shared/server/runtimeState");

async function listen(server) {
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  return `http://127.0.0.1:${server.address().port}`;
}

function makeController(server, closeRealtime, exit, timeoutMs = 300, overrides = {}) {
  return createShutdownController({
    server,
    timeoutMs,
    stopBackgroundWork() {},
    closeRealtime,
    closeCache: overrides.closeCache || (async () => {}),
    disconnectDatabase: overrides.disconnectDatabase || (async () => {}),
    flushTelemetry: overrides.flushTelemetry || (async () => true),
    exit,
  });
}

test("shutdown drains a normal request, closes SSE and exits within its deadline", async () => {
  resetServerRuntimeStateForTests();
  const streams = new Set();
  const lifecycle = [];
  let markSlowStarted;
  const slowStarted = new Promise((resolve) => { markSlowStarted = resolve; });
  const server = http.createServer((request, response) => {
    if (request.url === "/events") {
      streams.add(response);
      response.writeHead(200, { "Content-Type": "text/event-stream" });
      response.write("data: connected\n\n");
      return;
    }
    markSlowStarted();
    setTimeout(() => {
      lifecycle.push("request-complete");
      response.end("done");
    }, 40);
  });
  const baseUrl = await listen(server);
  const streamResponse = await fetch(`${baseUrl}/events`);
  const streamBody = streamResponse.text();
  const slowResponse = fetch(`${baseUrl}/slow`).then((response) => response.text());
  await slowStarted;
  const exited = new Promise((resolve) => {
    const shutdown = makeController(
      server,
      () => streams.forEach((response) => {
        const socket = response.socket;
        response.end();
        socket?.end();
      }),
      resolve,
      300,
      {
        closeCache: async () => lifecycle.push("cache-closed"),
        disconnectDatabase: async () => lifecycle.push("database-closed"),
      },
    );
    void shutdown(0);
  });

  assert.equal(await slowResponse, "done");
  assert.match(await streamBody, /connected/);
  assert.equal(await exited, 0);
  assert.equal(isServerShuttingDown(), true);
  assert(lifecycle.indexOf("cache-closed") > lifecycle.indexOf("request-complete"));
  assert(lifecycle.indexOf("database-closed") > lifecycle.indexOf("request-complete"));
});

test("shutdown force-closes stuck connections and reports non-zero", async () => {
  resetServerRuntimeStateForTests();
  const server = http.createServer((_request, _response) => {});
  const baseUrl = await listen(server);
  void fetch(baseUrl).catch(() => undefined);
  await new Promise((resolve) => setTimeout(resolve, 10));
  const code = await new Promise((resolve) => {
    const shutdown = makeController(server, () => {}, resolve, 30);
    void shutdown(0);
  });
  assert.equal(code, 1);
});

test("fatal shutdown preserves a non-zero exit code", async () => {
  resetServerRuntimeStateForTests();
  const server = http.createServer((_request, response) => response.end("ok"));
  await listen(server);
  const code = await new Promise((resolve) => {
    const shutdown = makeController(server, () => {}, resolve);
    void shutdown(1);
  });
  assert.equal(code, 1);
});
