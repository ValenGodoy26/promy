import assert from "node:assert/strict";
import { sanitizeSentryEvent } from "../src/lib/sentrySanitizer.ts";

const event = sanitizeSentryEvent({
  request: {
    url: "promy://reset-password?token=SECRET#fragment",
    headers: { Authorization: "Bearer SECRET", Cookie: "refresh=SECRET" },
  },
  contexts: { route: { link: "/verify?code=SECRET", params: { resetToken: "SECRET" } } },
});

assert.equal(event.request.url, "/reset-password");
assert.equal(event.request.headers.Authorization, "[Filtered]");
assert.equal(event.request.headers.Cookie, "[Filtered]");
assert.equal(event.contexts.route.link, "/verify");
assert.equal(JSON.stringify(event).includes("SECRET"), false);
console.log("mobile Sentry sanitizer cases: PASS");
