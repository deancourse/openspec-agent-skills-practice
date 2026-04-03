import test from "node:test";
import assert from "node:assert/strict";
import { createJwt, hashToken, randomToken, verifyJwt } from "../src/lib/security.js";

test("hashToken produces deterministic sha256 hash", () => {
  assert.equal(hashToken("abc"), hashToken("abc"));
});

test("randomToken returns a non-empty string", () => {
  assert.ok(randomToken().length > 10);
});

test("createJwt and verifyJwt round-trip payload", () => {
  const token = createJwt({ sub: "user-1", role: "admin" });
  const payload = verifyJwt(token);

  assert.equal(payload.sub, "user-1");
  assert.equal(payload.role, "admin");
});

