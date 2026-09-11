require("dotenv/config");
const test = require("node:test");
const assert = require("node:assert/strict");
const express = require("express");
const multer = require("multer");
const { Prisma } = require("@prisma/client");
const { z } = require("zod");

const { errorHandler } = require("../dist/middlewares/errorHandler.js");
const { attachRequestContext } = require("../dist/middlewares/requestContext.middleware.js");
const { ServiceError } = require("../dist/shared/utils/service.js");

async function withErrorServer(run) {
  const app = express();
  app.use(attachRequestContext);
  app.use(express.json({ limit: "64b" }));
  app.post("/zod", () => z.object({ name: z.string() }).parse(null));
  app.post("/multer-size", () => {
    throw new multer.MulterError("LIMIT_FILE_SIZE", "file");
  });
  app.post("/multer-count", () => {
    throw new multer.MulterError("LIMIT_UNEXPECTED_FILE", "file");
  });
  app.post("/media", () => {
    throw new ServiceError("Formato no soportado", 415);
  });
  app.post("/unique", () => {
    throw new Prisma.PrismaClientKnownRequestError("Unique constraint failed", {
      code: "P2002",
      clientVersion: "6.19.3",
      meta: { target: ["email"] },
    });
  });
  app.post("/unexpected", () => {
    throw new Error("synthetic internal detail");
  });
  app.post("/json", (_req, res) => res.json({ ok: true }));
  app.use(errorHandler);

  const server = await new Promise((resolve) => {
    const instance = app.listen(0, "127.0.0.1", () => resolve(instance));
  });
  const { port } = server.address();

  try {
    await run(`http://127.0.0.1:${port}`);
  } finally {
    await new Promise((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
  }
}

async function requestJson(baseUrl, path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    body: options.body,
  });
  return { status: response.status, body: await response.json() };
}

test("JSON parser maps malformed and oversized payloads without internal details", async () => {
  await withErrorServer(async (baseUrl) => {
    const malformed = await requestJson(baseUrl, "/json", { body: "{" });
    const oversized = await requestJson(baseUrl, "/json", {
      body: JSON.stringify({ value: "x".repeat(100) }),
    });
    const unsupportedEncoding = await requestJson(baseUrl, "/json", {
      headers: { "Content-Encoding": "compress" },
      body: "{}",
    });

    assert.equal(malformed.status, 400);
    assert.equal(malformed.body.message, "JSON invalido");
    assert.equal(typeof malformed.body.requestId, "string");
    assert.equal(JSON.stringify(malformed.body).includes("SyntaxError"), false);

    assert.equal(oversized.status, 413);
    assert.equal(typeof oversized.body.requestId, "string");
    assert.equal(JSON.stringify(oversized.body).includes("PayloadTooLargeError"), false);

    assert.equal(unsupportedEncoding.status, 415);
    assert.equal(typeof unsupportedEncoding.body.requestId, "string");
  });
});

test("Zod, Multer and Prisma client conflicts receive deterministic 4xx responses", async () => {
  await withErrorServer(async (baseUrl) => {
    const zod = await requestJson(baseUrl, "/zod", { body: "{}" });
    const multerSize = await requestJson(baseUrl, "/multer-size", { body: "{}" });
    const multerCount = await requestJson(baseUrl, "/multer-count", { body: "{}" });
    const media = await requestJson(baseUrl, "/media", { body: "{}" });
    const unique = await requestJson(baseUrl, "/unique", { body: "{}" });

    assert.equal(zod.status, 400);
    assert.ok(zod.body.errors);
    assert.equal(multerSize.status, 413);
    assert.equal(multerCount.status, 400);
    assert.equal(media.status, 415);
    assert.equal(unique.status, 409);
  });
});

test("unexpected server failures remain sanitized 500 responses", async () => {
  await withErrorServer(async (baseUrl) => {
    const unexpected = await requestJson(baseUrl, "/unexpected", { body: "{}" });

    assert.equal(unexpected.status, 500);
    assert.equal(unexpected.body.message, "Error interno del servidor");
    assert.equal(JSON.stringify(unexpected.body).includes("synthetic internal detail"), false);
    assert.equal(typeof unexpected.body.requestId, "string");
  });
});
