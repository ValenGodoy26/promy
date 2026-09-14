import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  CameraStartupTimeoutError,
  getCameraStartupErrorMessage,
  stopMediaStreamIfLate,
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

test("a media stream that resolves after timeout is stopped", async () => {
  let resolveStream;
  const streamPromise = new Promise((resolve) => {
    resolveStream = resolve;
  });
  let stopCalls = 0;

  const cleanup = stopMediaStreamIfLate(streamPromise, () => true);
  resolveStream({
    getTracks: () => [{ stop: () => { stopCalls += 1; } }],
  });
  await cleanup;

  assert.equal(stopCalls, 1);
});

test("camera recovery keeps retry and manual-code actions wired", async () => {
  const [validatorSource, pageSource] = await Promise.all([
    readFile(new URL("../src/features/commerce/CommerceRedemptionValidator.tsx", import.meta.url), "utf8"),
    readFile(new URL("../src/features/commerce/CommerceRedemptionsPage.tsx", import.meta.url), "utf8"),
  ]);

  assert.match(validatorSource, /onClick=\{onRetryScanner\}[\s\S]*Reintentar camara/);
  assert.match(validatorSource, /onClick=\{onUseManualCode\}[\s\S]*Ingresar codigo manualmente/);
  assert.match(pageSource, /setScannerAttempt\(\(current\) => current \+ 1\)/);
  assert.match(pageSource, /setScannerOpen\(false\);[\s\S]*focusValidationInput\(\)/);
});
