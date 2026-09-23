import assert from "node:assert/strict";
import {
  createAsyncMutationQueue,
  createGenerationTaskCoordinator,
  createSessionEpoch,
  isTerminalRefreshStatus,
} from "../src/auth/sessionLifecycle.ts";
import { resolvePromyLocation } from "../src/services/locationCore.ts";

const fallback = {
  latitude: -31.392,
  longitude: -58.017,
  label: "Concordia",
  citySlug: "concordia",
};

const deferred = () => {
  let resolve;
  const promise = new Promise((nextResolve) => {
    resolve = nextResolve;
  });
  return { promise, resolve };
};

async function testSessionResilience() {
  assert.equal(isTerminalRefreshStatus(400), true);
  assert.equal(isTerminalRefreshStatus(401), true);
  assert.equal(isTerminalRefreshStatus(403), true);
  assert.equal(isTerminalRefreshStatus(0), false, "offline remains recoverable");
  assert.equal(isTerminalRefreshStatus(500), false, "server failures remain recoverable");

  const epoch = createSessionEpoch();
  const coordinator = createGenerationTaskCoordinator();
  let refreshCalls = 0;
  const first = coordinator.run(epoch.current(), async () => {
    refreshCalls += 1;
    return "rotated";
  });
  const second = coordinator.run(epoch.current(), async () => {
    refreshCalls += 1;
    return "unexpected";
  });
  assert.equal(await first, "rotated");
  assert.equal(await second, "rotated");
  assert.equal(refreshCalls, 1, "concurrent refreshes share one rotation");

  const storageQueue = createAsyncMutationQueue();
  let storedSession = "previous";
  const pendingRefresh = deferred();
  const refreshEpoch = epoch.current();
  const refresh = storageQueue.enqueue(async () => {
    await pendingRefresh.promise;
    if (epoch.isCurrent(refreshEpoch)) {
      storedSession = "rotated";
    }
  });

  epoch.invalidate();
  const signOut = storageQueue.enqueue(async () => {
    storedSession = null;
  });
  pendingRefresh.resolve();
  await Promise.all([refresh, signOut]);
  assert.equal(storedSession, null, "late refresh cannot restore a signed-out session");

  let localSession = "active";
  const remoteLogout = Promise.reject(new Error("offline"));
  localSession = null;
  await remoteLogout.catch(() => undefined);
  assert.equal(localSession, null, "offline logout still clears local credentials");
}

async function testLocationPermissions() {
  let requests = 0;
  const noPrompt = await resolvePromyLocation(
    {
      getPermission: async () => ({ status: "undetermined", canAskAgain: true }),
      requestPermission: async () => {
        requests += 1;
        return { status: "granted" };
      },
      getPosition: async () => ({ latitude: -31.4, longitude: -58.0 }),
    },
    { fallback },
  );
  assert.equal(noPrompt.source, "city_fallback");
  assert.equal(noPrompt.fallbackReason, "permission_not_requested");
  assert.equal(requests, 0, "catalog fallback never opens the native prompt");

  const granted = await resolvePromyLocation(
    {
      getPermission: async () => ({ status: "granted", canAskAgain: true }),
      requestPermission: async () => ({ status: "granted" }),
      getPosition: async () => ({ latitude: -31.4, longitude: -58.0 }),
    },
    { fallback },
  );
  assert.deepEqual(
    { source: granted.source, latitude: granted.latitude, longitude: granted.longitude },
    { source: "device", latitude: -31.4, longitude: -58.0 },
  );

  const denied = await resolvePromyLocation(
    {
      getPermission: async () => ({ status: "undetermined", canAskAgain: true }),
      requestPermission: async () => ({ status: "denied", canAskAgain: true }),
      getPosition: async () => ({ latitude: 0, longitude: 0 }),
    },
    { fallback, requestPermission: true },
  );
  assert.equal(denied.fallbackReason, "permission_denied");

  const permanentlyDenied = await resolvePromyLocation(
    {
      getPermission: async () => ({ status: "denied", canAskAgain: false }),
      requestPermission: async () => {
        throw new Error("must not request again");
      },
      getPosition: async () => ({ latitude: 0, longitude: 0 }),
    },
    { fallback, requestPermission: true },
  );
  assert.equal(permanentlyDenied.fallbackReason, "permission_permanently_denied");

  const providerError = await resolvePromyLocation(
    {
      getPermission: async () => ({ status: "granted" }),
      requestPermission: async () => ({ status: "granted" }),
      getPosition: async () => {
        throw new Error("provider unavailable");
      },
    },
    { fallback },
  );
  assert.equal(providerError.fallbackReason, "device_error");

  const servicesDisabled = await resolvePromyLocation(
    {
      getPermission: async () => ({ status: "granted" }),
      requestPermission: async () => ({ status: "granted" }),
      hasServicesEnabled: async () => false,
      getPosition: async () => ({ latitude: 0, longitude: 0 }),
    },
    { fallback },
  );
  assert.equal(servicesDisabled.fallbackReason, "location_services_disabled");

  const timeout = await resolvePromyLocation(
    {
      getPermission: async () => ({ status: "granted" }),
      requestPermission: async () => ({ status: "granted" }),
      getPosition: async () => new Promise(() => undefined),
    },
    { fallback, timeoutMs: 5 },
  );
  assert.equal(timeout.fallbackReason, "timeout");
}

await testSessionResilience();
await testLocationPermissions();
console.log("mobile auth and location resilience cases: PASS");
