const fs = require("fs/promises");
const path = require("path");
const sharp = require("sharp");
const { assert, createWebClient, loginWeb } = require("./qa-http-client");

const createdFiles = [];

async function buildPng() {
  return sharp({
    create: {
      width: 32,
      height: 24,
      channels: 4,
      background: { r: 255, g: 190, b: 0, alpha: 1 },
    },
  })
    .png()
    .toBuffer();
}

async function upload(client, accessToken, { buffer, mimeType, filename, fields = [] }) {
  const body = new FormData();
  for (const [name, value] of fields) body.append(name, value);
  body.append("file", new Blob([buffer], { type: mimeType }), filename);

  return client.request("/uploads/commerce-image", {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}` },
    body,
  });
}

async function trackCreatedFile(response) {
  const relativeUrl = response.data?.file?.relativeUrl;
  if (!relativeUrl) return;
  createdFiles.push(path.resolve(process.cwd(), relativeUrl.replace(/^\/+/, "")));
}

async function main() {
  const client = createWebClient({ forwardedIp: "127.12.0.1" });
  const auth = await loginWeb(client, "comercio@promy.com", "demo1234");
  const png = await buildPng();

  try {
    const valid = await upload(client, auth.accessToken, {
      buffer: png,
      mimeType: "image/png",
      filename: "valid.png",
    });
    assert(valid.status === 201, `Upload valido fallo: ${JSON.stringify(valid.data)}`);
    assert(valid.data?.file?.mimeType === "image/webp", "Sharp no recodifico la imagen a WebP");
    assert(valid.data?.file?.size > 0, "Sharp produjo una imagen vacia");
    await trackCreatedFile(valid);

    const oversized = await upload(client, auth.accessToken, {
      buffer: Buffer.alloc(5 * 1024 * 1024 + 1, 0x41),
      mimeType: "image/png",
      filename: "too-large.png",
    });
    assert(oversized.status === 413, `Multer no devolvio 413: ${JSON.stringify(oversized.data)}`);

    const invalidMime = await upload(client, auth.accessToken, {
      buffer: png,
      mimeType: "text/plain",
      filename: "fake.txt",
    });
    assert(invalidMime.status === 415, `MIME invalido no devolvio 415: ${JSON.stringify(invalidMime.data)}`);

    const invalidMagic = await upload(client, auth.accessToken, {
      buffer: Buffer.from("not-a-real-png"),
      mimeType: "image/png",
      filename: "fake.png",
    });
    assert(invalidMagic.status === 400, "La validacion de magic bytes no rechazo contenido falso");

    const corrupt = await upload(client, auth.accessToken, {
      buffer: png.subarray(0, 18),
      mimeType: "image/png",
      filename: "corrupt.png",
    });
    assert(corrupt.status === 415, `Imagen corrupta no devolvio 415: ${JSON.stringify(corrupt.data)}`);

    const twoFilesBody = new FormData();
    twoFilesBody.append("file", new Blob([png], { type: "image/png" }), "first.png");
    twoFilesBody.append("file", new Blob([png], { type: "image/png" }), "second.png");
    const twoFiles = await client.request("/uploads/commerce-image", {
      method: "POST",
      headers: { Authorization: `Bearer ${auth.accessToken}` },
      body: twoFilesBody,
    });
    assert(twoFiles.status === 400, `Multiples archivos no devolvieron 400: ${JSON.stringify(twoFiles.data)}`);

    const maliciousName = await upload(client, auth.accessToken, {
      buffer: png,
      mimeType: "image/png",
      filename: "../../PROMY secret <script>.png",
    });
    assert(maliciousName.status === 201, `Upload con nombre hostil fallo: ${JSON.stringify(maliciousName.data)}`);
    await trackCreatedFile(maliciousName);
    const storedName = maliciousName.data?.file?.filename || "";
    assert(!storedName.includes("..") && !/[<>\\/]/.test(storedName), "El filename almacenado no fue sanitizado");
    assert(storedName.endsWith(".webp"), "El filename sanitizado no conserva el formato recodificado");

    const nestedField = await upload(client, auth.accessToken, {
      buffer: png,
      mimeType: "image/png",
      filename: "nested.png",
      fields: [["items[1]", "blocked"]],
    });
    assert(!nestedField.ok, "Multer acepto un indice array superior al limite configurado");

    console.log(JSON.stringify({
      ok: true,
      checks: ["valid-image", "5mb-413", "mime-415", "magic-bytes-400", "corrupt-415", "multiple-files-400", "safe-filename", "array-index-limit"],
      outputMimeType: valid.data.file.mimeType,
      message: "Smoke QA de uploads y Sharp completada correctamente.",
    }, null, 2));
  } finally {
    await Promise.all(createdFiles.map((file) => fs.rm(file, { force: true })));
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
