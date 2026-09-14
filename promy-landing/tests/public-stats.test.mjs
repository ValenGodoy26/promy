import assert from "node:assert/strict";
import test from "node:test";
import {
  displayPublicStat,
  INITIAL_PUBLIC_STATS,
  parsePublicStats,
} from "../src/publicStats.ts";

test("real zero metrics remain valid data", () => {
  const data = parsePublicStats({ approvedCommerces: 0, activePromotions: 0, activeCities: 0 });
  assert.deepEqual(data, { approvedCommerces: 0, activePromotions: 0, activeCities: 0 });
  assert.equal(displayPublicStat({ status: "available", data }, "approvedCommerces"), "0");
});

test("loading and unavailable metrics never masquerade as zero", () => {
  assert.equal(displayPublicStat(INITIAL_PUBLIC_STATS, "approvedCommerces"), "—");
  assert.equal(displayPublicStat({ status: "unavailable", data: null }, "activePromotions"), "—");
  assert.equal(parsePublicStats(undefined), null);
  assert.equal(parsePublicStats({ approvedCommerces: "0", activePromotions: 0, activeCities: 1 }), null);
});
