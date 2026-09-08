import assert from "node:assert/strict";
import { sanitizeSentryEvent } from "../src/lib/sentrySanitizer.ts";

const event = sanitizeSentryEvent({
  request: {
    url: "https://promy.test/reset-password?token=SECRET#fragment",
    headers: { Authorization: "Bearer SECRET", Cookie: "refresh=SECRET" },
    data: { password: "SECRET", verificationToken: "SECRET" },
  },
  breadcrumbs: [{ data: { url: "/verify?code=SECRET", accessToken: "SECRET" } }],
});

assert.equal(event.request.url, "/reset-password");
assert.equal(event.request.headers.Authorization, "[Filtered]");
assert.equal(event.request.headers.Cookie, "[Filtered]");
assert.equal(event.request.data.password, "[Filtered]");
assert.equal(event.breadcrumbs[0].data.url, "/verify");
assert.equal(JSON.stringify(event).includes("SECRET"), false);
console.log("web Sentry sanitizer cases: PASS");
