import assert from "node:assert/strict";
import fs from "node:fs";
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

test("public copy remains UTF-8 and does not claim unverified social proof", () => {
  const source = fs.readFileSync(new URL("../src/App.tsx", import.meta.url), "utf8");
  const html = fs.readFileSync(new URL("../index.html", import.meta.url), "utf8");
  assert.doesNotMatch(source, /Ã|Â|ð|â|�/u);
  assert.doesNotMatch(source, /Usuario local|Comercio invitado|Equipo PROMY/u);
  assert.doesNotMatch(source, /https:\/\/(?:www\.)?(?:instagram|tiktok)\.com/u);
  assert.doesNotMatch(html, /https:\/\/(?:www\.)?(?:instagram|tiktok)\.com/u);
  assert.match(source, /etapa interna en Concordia/u);
});
