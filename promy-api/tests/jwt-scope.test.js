require("dotenv/config");
const test = require("node:test");
const assert = require("node:assert/strict");

const {
  signAccessToken,
  signRealtimeStreamToken,
  verifyAccessToken,
  verifyRealtimeStreamToken,
} = require("../dist/shared/utils/jwt.js");

const identity = {
  userId: 1,
  role: "ADMIN",
  sessionId: 2,
  sessionVersion: 0,
};

test("access and realtime JWTs are accepted only by their intended verifier", () => {
  const accessToken = signAccessToken(identity);
  const realtimeToken = signRealtimeStreamToken(identity);

  assert.equal(verifyAccessToken(accessToken).tokenKind, "access");
  assert.equal(verifyRealtimeStreamToken(realtimeToken).tokenKind, "realtime-stream");
  assert.throws(() => verifyAccessToken(realtimeToken));
  assert.throws(() => verifyRealtimeStreamToken(accessToken));
});
