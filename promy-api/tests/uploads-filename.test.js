const assert = require("node:assert/strict");
const test = require("node:test");
const { buildSafeUploadFilename } = require("../dist/shared/services/uploads.service");

test("upload filenames remain unique and safe under a rapid same-input burst", () => {
  const filenames = Array.from({ length: 1_000 }, () => buildSafeUploadFilename("../../PROMY secret <script>.png"));

  assert.equal(new Set(filenames).size, 1_000);
  for (const filename of filenames) {
    assert.match(filename, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}-promy-secret-script-\.webp$/);
    assert.equal(filename.includes(".."), false);
    assert.equal(/[<>\\/]/.test(filename), false);
  }
});
