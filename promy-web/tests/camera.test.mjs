import assert from "node:assert/strict";
import test from "node:test";
import {
  CameraStartupTimeoutError,
  getCameraStartupErrorMessage,
  withCameraStartupTimeout,
} from "../src/features/commerce/camera.ts";

test("camera startup has a finite timeout", async () => {
  await assert.rejects(
    withCameraStartupTimeout(new Promise(() => undefined), 10),
    CameraStartupTimeoutError,
  );
});

test("camera failures have actionable messages", () => {
  for (const name of ["NotAllowedError", "NotFoundError", "NotReadableError", "OverconstrainedError"]) {
    const error = new Error(name);
    error.name = name;
    const message = getCameraStartupErrorMessage(error);
    assert.equal(message.includes("camara"), true);
    assert.equal(message.includes("undefined"), false);
  }

  assert.match(
    getCameraStartupErrorMessage(new CameraStartupTimeoutError()),
    /reintentar|manualmente/i,
  );
});
