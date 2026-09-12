const assert = require("node:assert/strict");
const test = require("node:test");
const bcrypt = require("bcrypt");
const {
  BCRYPT_PASSWORD_MAX_UTF8_BYTES,
  getPasswordUtf8ByteLength,
  isPasswordWithinBcryptByteLimit,
  newPasswordSchema,
} = require("../dist/shared/security/passwordPolicy");
const { loginSchema, registerSchema, resetPasswordSchema } = require("../dist/modules/auth/auth.service");
const { changeCurrentUserPasswordSchema } = require("../dist/modules/users/users.service");

const exactly72Bytes = `Aa1${"x".repeat(69)}`;
const over72Bytes = `${exactly72Bytes}x`;
const multibyte72Bytes = `Aa1${"é".repeat(34)}x`;
const multibyte73Bytes = `Aa1${"é".repeat(35)}`;

test("new password policy measures UTF-8 bytes at bcrypt's supported boundary", () => {
  assert.equal(BCRYPT_PASSWORD_MAX_UTF8_BYTES, 72);
  assert.equal(getPasswordUtf8ByteLength(exactly72Bytes), 72);
  assert.equal(getPasswordUtf8ByteLength(multibyte72Bytes), 72);
  assert.equal(getPasswordUtf8ByteLength(multibyte73Bytes), 73);
  assert.equal(isPasswordWithinBcryptByteLimit(exactly72Bytes), true);
  assert.equal(isPasswordWithinBcryptByteLimit(over72Bytes), false);
  assert.equal(newPasswordSchema.safeParse("NormalPass123").success, true);
});

test("registration, reset and password change reject values over 72 UTF-8 bytes", () => {
  assert.equal(registerSchema.safeParse({ fullName: "Usuario QA", email: "qa@promy.test", password: exactly72Bytes }).success, true);
  assert.equal(registerSchema.safeParse({ fullName: "Usuario QA", email: "qa@promy.test", password: over72Bytes }).success, false);
  assert.equal(resetPasswordSchema.safeParse({ token: "a".repeat(20), password: multibyte73Bytes }).success, false);
  assert.equal(changeCurrentUserPasswordSchema.safeParse({ currentPassword: "ExistingPass123", nextPassword: over72Bytes }).success, false);
});

test("login keeps accepting legacy passwords longer than 72 bytes", () => {
  assert.equal(loginSchema.safeParse({ email: "legacy@promy.test", password: over72Bytes }).success, true);
});

test("an existing bcrypt hash remains compatible with its legacy long password", async () => {
  const legacyHash = await bcrypt.hash(over72Bytes, 10);
  assert.equal(await bcrypt.compare(over72Bytes, legacyHash), true);
});
