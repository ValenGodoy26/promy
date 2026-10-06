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
  const srcRoot = new URL("../src/", import.meta.url);
  const source = fs
    .readdirSync(srcRoot, { recursive: true })
    .filter((entry) => /\.(?:ts|tsx)$/.test(String(entry)))
    .map((entry) => fs.readFileSync(new URL(String(entry), srcRoot), "utf8"))
    .join("\n");
  const html = fs.readFileSync(new URL("../index.html", import.meta.url), "utf8");
  assert.doesNotMatch(source, /Ã|Â|ð|â|�/u);
  assert.doesNotMatch(source, /Usuario local|Comercio invitado|Equipo PROMY/u);
  assert.doesNotMatch(source, /https:\/\/(?:www\.)?(?:instagram|tiktok)\.com/u);
  assert.doesNotMatch(html, /https:\/\/(?:www\.)?(?:instagram|tiktok)\.com/u);
  assert.match(source, /etapa interna en Concordia/u);
});

test("landing source remains split into maintainable modules", () => {
  const app = fs.readFileSync(new URL("../src/App.tsx", import.meta.url), "utf8");
  const stylesEntry = fs.readFileSync(new URL("../src/styles.css", import.meta.url), "utf8");

  assert.ok(app.split("\n").length < 300, "App.tsx should remain an orchestration layer");
  assert.doesNotMatch(app, /function (?:StatCounter|ShowcaseHome|ShowcaseExplore|ShowcaseMap|ShowcaseProfile|usePointerEyes)/u);
  assert.match(stylesEntry, /01-base\.css/u);
  assert.match(stylesEntry, /02-editorial\.css/u);
  assert.match(stylesEntry, /03-refinements\.css/u);
  assert.match(stylesEntry, /04-mobile\.css/u);
});


test("performance baseline avoids expensive always-on effects", () => {
  const app = fs.readFileSync(new URL("../src/App.tsx", import.meta.url), "utf8");
  const hooks = fs.readFileSync(new URL("../src/landing/hooks.ts", import.meta.url), "utf8");
  const components = fs.readFileSync(new URL("../src/landing/components.tsx", import.meta.url), "utf8");
  const stylesRoot = new URL("../src/styles/", import.meta.url);
  const css = fs
    .readdirSync(stylesRoot)
    .filter((entry) => String(entry).endsWith(".css"))
    .map((entry) => fs.readFileSync(new URL(String(entry), stylesRoot), "utf8"))
    .join("\n");

  assert.doesNotMatch(css, /feTurbulence/u);
  assert.doesNotMatch(css, /backdrop-filter/u);
  assert.doesNotMatch(css, /filter:\s*blur\(/u);
  assert.doesNotMatch(app, /setInterval/u, "public stats should not poll forever");
  assert.match(hooks, /IntersectionObserver/u);
  assert.match(hooks, /data-motion-loop/u);
  assert.match(components, /data-motion-loop/u);
  assert.ok(fs.existsSync(new URL("../public/grain.png", import.meta.url)));
});

test("hero uses optimized static product assets instead of rebuilding the app UI in DOM", () => {
  const discovery = fs.readFileSync(
    new URL("../src/landing/sections/DiscoverySections.tsx", import.meta.url),
    "utf8",
  );
  const components = fs.readFileSync(
    new URL("../src/landing/components.tsx", import.meta.url),
    "utf8",
  );
  const feed = new URL("../public/hero-app-feed.webp", import.meta.url);
  const promo = new URL("../public/hero-promo-card.webp", import.meta.url);

  assert.match(discovery, /HeroProductShot/u);
  assert.match(components, /hero-app-feed\.webp/u);
  assert.match(components, /hero-promo-card\.webp/u);
  assert.doesNotMatch(discovery, /HeroPhone|DraggableSticker|bigP/u);
  assert.doesNotMatch(components, /export function HeroPhone|export function DraggableSticker/u);
  assert.ok(fs.existsSync(feed), "hero app feed should exist");
  assert.ok(fs.existsSync(promo), "hero promo card should exist");
  assert.ok(fs.statSync(feed).size < 100_000, "hero app feed should remain lightweight");
  assert.ok(fs.statSync(promo).size < 100_000, "hero promo card should remain lightweight");
});

test("prelaunch metadata does not advertise a published mobile app", () => {
  const html = fs.readFileSync(new URL("../index.html", import.meta.url), "utf8");
  assert.match(html, /"@type": "WebSite"/u);
  assert.doesNotMatch(html, /"@type": "MobileApplication"/u);
  assert.doesNotMatch(html, /"price": "0"/u);
  assert.match(html, /acceso anticipado/u);
  assert.match(html, /promy-logo-square\.webp/u);
});

test("release configuration rejects local or incomplete public settings", async () => {
  const { validatePublicReleaseEnv } = await import("../releaseEnv.ts");

  const missing = validatePublicReleaseEnv({});
  assert.ok(missing.includes("Falta VITE_API_BASE_URL."));
  assert.ok(missing.includes("Falta VITE_PANEL_BASE_URL."));
  assert.ok(missing.includes("VITE_LEGAL_REVIEWED debe ser true después de la revisión jurídica final."));

  const invalid = validatePublicReleaseEnv({
    VITE_API_BASE_URL: "http://192.168.1.4:4000/api",
    VITE_PANEL_BASE_URL: "http://localhost:5173",
    VITE_LEGAL_RESPONSIBLE: "REEMPLAZAR",
    VITE_LEGAL_ADDRESS: "pendiente",
    VITE_PRIVACY_EMAIL: "privacidad@example.invalid",
    VITE_SUPPORT_EMAIL: "soporte@example.invalid",
    VITE_COMPLAINTS_EMAIL: "denuncias@example.invalid",
    VITE_RETENTION_POLICY: "pendiente",
    VITE_LEGAL_REVIEWED: "false",
  });
  assert.ok(invalid.length >= 4);

  const valid = validatePublicReleaseEnv({
    VITE_API_BASE_URL: "https://api.promy.test/api",
    VITE_PANEL_BASE_URL: "https://panel.promy.test",
    VITE_LEGAL_RESPONSIBLE: "PROMY Responsable",
    VITE_LEGAL_ADDRESS: "Concordia, Entre Ríos, Argentina",
    VITE_PRIVACY_EMAIL: "privacidad@promy.test",
    VITE_SUPPORT_EMAIL: "hola@promy.test",
    VITE_COMPLAINTS_EMAIL: "denuncias@promy.test",
    VITE_RETENTION_POLICY: "30 días para logs operativos y según política aprobada para backups",
    VITE_LEGAL_REVIEWED: "true",
  });
  assert.deepEqual(valid, []);
});

test("local build script does not select release mode", () => {
  const packageJson = JSON.parse(fs.readFileSync(new URL("../package.json", import.meta.url), "utf8"));
  assert.doesNotMatch(packageJson.scripts["build:local"], /--mode\s+release/u);
  assert.match(packageJson.scripts.build, /--mode\s+release/u);
});
