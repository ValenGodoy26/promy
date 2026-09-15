const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const path = require("node:path");
const test = require("node:test");
const sharp = require("sharp");
const { env } = require("../dist/config/env");
const {
  assertCommerceImageMetadataWithinBudget,
  buildSafeUploadFilename,
  cleanupCommerceImages,
  deleteCommerceImageUpload,
  isManagedCommerceUploadUrl,
  listCommerceImageUploads,
  setUploadsS3ClientForTests,
  storeCommerceImageUpload,
  withCommerceImageProcessingSlot,
} = require("../dist/shared/services/uploads.service");

test("image metadata budget rejects extreme dimensions before decoding", () => {
  assert.doesNotThrow(() => assertCommerceImageMetadataWithinBudget({ width: 4000, height: 3000 }));
  assert.throws(() => assertCommerceImageMetadataWithinBudget({ width: 12001, height: 1 }), (error) => error.statusCode === 413);
  assert.throws(() => assertCommerceImageMetadataWithinBudget({ width: 8000, height: 6000 }), (error) => error.statusCode === 413);
});

test("image processing concurrency is bounded without blocking unrelated API work", async () => {
  let active = 0;
  let maximum = 0;
  let release;
  const gate = new Promise((resolve) => { release = resolve; });
  const attempts = Array.from({ length: 10 }, () => withCommerceImageProcessingSlot(async () => {
    active += 1;
    maximum = Math.max(maximum, active);
    await gate;
    active -= 1;
    return true;
  }).then(
    () => ({ status: "fulfilled" }),
    (reason) => ({ status: "rejected", reason }),
  ));
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(maximum, 2);
  release();
  const results = await Promise.all(attempts);
  assert.equal(results.filter((item) => item.status === "fulfilled").length, 8);
  assert.equal(results.filter((item) => item.status === "rejected" && item.reason?.statusCode === 429).length, 2);
});

test("local deletion is path-safe and idempotent", async () => {
  const originalDriver = env.UPLOADS_DRIVER;
  env.UPLOADS_DRIVER = "local";
  const filename = buildSafeUploadFilename("lifecycle.png");
  const directory = path.resolve(process.cwd(), "uploads", "commerce");
  const file = path.join(directory, filename);
  try {
    await fs.mkdir(directory, { recursive: true });
    await fs.writeFile(file, "synthetic");
    assert.equal(isManagedCommerceUploadUrl(`/uploads/commerce/${filename}`), true);
    assert.equal(await deleteCommerceImageUpload(`/uploads/commerce/${filename}`), true);
    assert.equal(await deleteCommerceImageUpload(`/uploads/commerce/${filename}`), true);
    assert.equal(await deleteCommerceImageUpload("/uploads/commerce/../../secret.webp"), false);
    assert.equal(await deleteCommerceImageUpload(`https://untrusted.example/commerce/${filename}`), false);
  } finally {
    env.UPLOADS_DRIVER = originalDriver;
    await fs.rm(file, { force: true });
  }
});

test("fake S3 receives deterministic idempotent delete commands", async () => {
  const originalDriver = env.UPLOADS_DRIVER;
  const commands = [];
  env.UPLOADS_DRIVER = "s3";
  setUploadsS3ClientForTests({ send: async (command) => { commands.push(command); return {}; } });
  const filename = buildSafeUploadFilename("remote.png");
  try {
    await deleteCommerceImageUpload(`/commerce/${filename}`);
    await deleteCommerceImageUpload(`/commerce/${filename}`);
    assert.equal(commands.length, 2);
    assert.equal(commands.every((command) => command.input.Key === `commerce/${filename}`), true);
  } finally {
    setUploadsS3ClientForTests(null);
    env.UPLOADS_DRIVER = originalDriver;
  }
});

test("fake S3 stores optimized WebP uploads and lists managed objects across pages", async () => {
  const originalDriver = env.UPLOADS_DRIVER;
  const commands = [];
  let listPage = 0;
  env.UPLOADS_DRIVER = "s3";
  setUploadsS3ClientForTests({
    send: async (command) => {
      commands.push(command);
      if (command.constructor.name !== "ListObjectsV2Command") return {};
      listPage += 1;
      if (listPage === 1) {
        return {
          IsTruncated: true,
          NextContinuationToken: "page-2",
          Contents: [{ Key: `commerce/${buildSafeUploadFilename("first.png")}`, LastModified: new Date(1) }],
        };
      }
      return {
        IsTruncated: false,
        Contents: [
          { Key: `commerce/${buildSafeUploadFilename("second.png")}`, LastModified: new Date(2) },
          { Key: "commerce/not-managed.jpg", LastModified: new Date(3) },
        ],
      };
    },
  });

  try {
    const source = await sharp({
      create: { width: 32, height: 24, channels: 3, background: "#ffbe00" },
    }).png().toBuffer();
    const stored = await storeCommerceImageUpload({
      buffer: source,
      originalName: "synthetic.png",
      mimeType: "image/png",
    });
    const put = commands.find((command) => command.constructor.name === "PutObjectCommand");
    assert.ok(put);
    assert.equal(put.input.ContentType, "image/webp");
    assert.match(put.input.Key, /^commerce\/[0-9a-f-]+-synthetic\.webp$/);
    assert.equal(stored.mimeType, "image/webp");
    assert.equal(stored.relativeUrl, `/${put.input.Key}`);

    const listed = await listCommerceImageUploads();
    assert.equal(listed.length, 2);
    assert.equal(commands.filter((command) => command.constructor.name === "ListObjectsV2Command").length, 2);
  } finally {
    setUploadsS3ClientForTests(null);
    env.UPLOADS_DRIVER = originalDriver;
  }
});

test("storage cleanup failures are reported without replacing the committed record result", async () => {
  const originalDriver = env.UPLOADS_DRIVER;
  env.UPLOADS_DRIVER = "s3";
  setUploadsS3ClientForTests({ send: async () => { throw new Error("synthetic provider outage"); } });
  const filename = buildSafeUploadFilename("cleanup.png");
  try {
    const failures = await cleanupCommerceImages([`/commerce/${filename}`]);
    assert.equal(failures.length, 1);
  } finally {
    setUploadsS3ClientForTests(null);
    env.UPLOADS_DRIVER = originalDriver;
  }
});
