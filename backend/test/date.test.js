import test from "node:test";
import assert from "node:assert/strict";
import { hoursBetween } from "../src/lib/date.js";

test("hoursBetween returns decimal hours between timestamps", () => {
  assert.equal(
    hoursBetween("2026-04-03T01:00:00.000Z", "2026-04-03T03:30:00.000Z"),
    2.5
  );
});

