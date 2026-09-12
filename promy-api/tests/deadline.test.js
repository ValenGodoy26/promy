const assert = require("node:assert/strict");
const http = require("node:http");
const test = require("node:test");
const {
  ExternalRequestTimeoutError,
  withRequestDeadline,
} = require("../dist/shared/http/deadline");

async function withServer(handler, run) {
  const server = http.createServer(handler);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  try {
    await run(`http://127.0.0.1:${address.port}`);
  } finally {
    server.closeAllConnections?.();
    await new Promise((resolve) => server.close(resolve));
  }
}

test("deadline aborts before response headers", async () => {
  await withServer((_request, response) => {
    setTimeout(() => response.end("late"), 200);
  }, async (baseUrl) => {
    await assert.rejects(
      withRequestDeadline(30, (signal) => fetch(baseUrl, { signal })),
      ExternalRequestTimeoutError,
    );
  });
});

test("deadline remains active while response body is being read", async () => {
  await withServer((_request, response) => {
    response.writeHead(200, { "Content-Type": "text/plain" });
    response.write("partial");
    setTimeout(() => response.end("late"), 200);
  }, async (baseUrl) => {
    await assert.rejects(
      withRequestDeadline(30, async (signal) => {
        const response = await fetch(baseUrl, { signal });
        return response.text();
      }),
      ExternalRequestTimeoutError,
    );
  });
});

test("completed reads remain available inside the deadline", async () => {
  await withServer((_request, response) => response.end("ok"), async (baseUrl) => {
    const value = await withRequestDeadline(500, async (signal) => {
      const response = await fetch(baseUrl, { signal });
      return response.text();
    });
    assert.equal(value, "ok");
  });
});
