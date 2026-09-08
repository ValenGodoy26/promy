import assert from "node:assert/strict";
import { createSessionStorage, MOBILE_SESSION_STORAGE_KEY } from "../src/auth/sessionStorageCore.ts";

function memoryStorage(initial = null) {
  let value = initial;
  return {
    getItem: async () => value,
    setItem: async (_key, next) => { value = next; },
    removeItem: async () => { value = null; },
    value: () => value,
  };
}

const secure = memoryStorage();
const legacy = memoryStorage();
const native = createSessionStorage({
  native: true,
  secure: { ...secure, isAvailable: async () => true },
  browser: legacy,
});

await native.write("session-v1");
assert.equal(secure.value(), "session-v1");
assert.equal(legacy.value(), null);
assert.equal(await native.read(), "session-v1");

await native.write("session-v2");
assert.equal(await native.read(), "session-v2", "refresh rotation replaces the secure session");
await native.clear();
assert.equal(secure.value(), null, "logout clears SecureStore");
assert.equal(legacy.value(), null, "logout clears legacy storage");

const legacySource = memoryStorage("legacy-session");
const migratedSecure = memoryStorage();
const migrating = createSessionStorage({
  native: true,
  secure: { ...migratedSecure, isAvailable: async () => true },
  browser: legacySource,
});
assert.equal(await migrating.read(), "legacy-session");
assert.equal(migratedSecure.value(), "legacy-session");
assert.equal(legacySource.value(), null);

const insecure = memoryStorage("must-be-deleted");
const unavailable = createSessionStorage({
  native: true,
  secure: { ...memoryStorage(), isAvailable: async () => false },
  browser: insecure,
});
await assert.rejects(() => unavailable.write("secret"));
assert.equal(insecure.value(), null, "native failure removes insecure legacy data");
await assert.rejects(() => unavailable.read());

const empty = createSessionStorage({
  native: true,
  secure: { ...memoryStorage(), isAvailable: async () => true },
  browser: memoryStorage(),
});
assert.equal(await empty.read(), null, "first launch without a session is supported");

const browser = memoryStorage();
const web = createSessionStorage({
  native: false,
  secure: { ...memoryStorage(), isAvailable: async () => false },
  browser,
});
await web.write("web-session");
assert.equal(browser.value(), "web-session", "browser persistence is explicit and separate");
assert.equal(MOBILE_SESSION_STORAGE_KEY, "@promy/mobile-session");

console.log("mobile session storage security cases: PASS");
