import { assert, assertAllowedStagingUrls, parseCsv, safeErrorMessage } from "./lib.mjs";
import { pathToFileURL } from "node:url";

function requireQaCredentials(env, roles) {
  for (const role of roles) {
    assert(env[`QA_${role}_EMAIL`], `QA_${role}_EMAIL es obligatoria.`);
    assert(env[`QA_${role}_PASSWORD`], `QA_${role}_PASSWORD es obligatoria.`);
  }
}

export function assertSmokeSafety(env = process.env, { mutating = false } = {}) {
  assert(env.STAGING_QA_ENVIRONMENT === "1", "STAGING_QA_ENVIRONMENT=1 es obligatorio para ejecutar un smoke remoto.");
  const urls = assertAllowedStagingUrls(env);
  if (mutating) {
    assert(env.ALLOW_STAGING_MUTATIONS === "1", "El full-loop es destructivo y exige ALLOW_STAGING_MUTATIONS=1.");
    assert(env.STAGING_QA_CITY_ID && env.STAGING_QA_CATEGORY_ID, "El full-loop exige STAGING_QA_CITY_ID y STAGING_QA_CATEGORY_ID QA.");
  }
  return urls;
}

class StagingClient {
  constructor(baseUrl, platform = "web") {
    this.baseUrl = baseUrl.replace(/\/$/, "");
    this.platform = platform;
    this.cookies = new Map();
  }

  async request(path, options = {}) {
    const headers = new Headers(options.headers || {});
    headers.set("x-promy-client", this.platform);
    if (options.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
    if (this.platform === "web" && this.cookies.size) headers.set("Cookie", [...this.cookies.entries()].map(([name, value]) => `${name}=${value}`).join("; "));
    const response = await fetch(`${this.baseUrl}${path}`, { ...options, headers });
    if (this.platform === "web") {
      const values = typeof response.headers.getSetCookie === "function" ? response.headers.getSetCookie() : [response.headers.get("set-cookie")].filter(Boolean);
      for (const value of values) {
        const [pair] = value.split(";", 1);
        const separator = pair.indexOf("=");
        if (separator > 0) this.cookies.set(pair.slice(0, separator), pair.slice(separator + 1));
      }
    }
    const text = await response.text();
    let data = null;
    try { data = text ? JSON.parse(text) : null; } catch { data = text; }
    return { ok: response.ok, status: response.status, data };
  }
}

function assertOk(response, operation) {
  assert(response.ok, `${operation} falló con HTTP ${response.status}.`);
  return response.data;
}

async function login(client, email, password) {
  const data = assertOk(await client.request("/auth/login", { method: "POST", body: JSON.stringify({ email, password }) }), "login QA");
  assert(data?.accessToken, "login QA no devolvió accessToken.");
  return data.accessToken;
}

function bearer(accessToken) {
  return { Authorization: `Bearer ${accessToken}` };
}

export async function runReadOnlySmoke(env = process.env) {
  const urls = assertSmokeSafety(env);
  requireQaCredentials(env, ["ADMIN", "COMMERCE", "CLIENT"]);
  const api = new StagingClient(urls.STAGING_API_URL.toString().replace(/\/$/, ""), "web");
  const mobile = new StagingClient(urls.STAGING_API_URL.toString().replace(/\/$/, ""), "mobile");
  assertOk(await api.request("/health"), "GET /health");
  assertOk(await api.request("/readiness"), "GET /readiness");
  const adminToken = await login(api, env.QA_ADMIN_EMAIL, env.QA_ADMIN_PASSWORD);
  const commerceToken = await login(api, env.QA_COMMERCE_EMAIL, env.QA_COMMERCE_PASSWORD);
  const clientToken = await login(mobile, env.QA_CLIENT_EMAIL, env.QA_CLIENT_PASSWORD);
  assertOk(await api.request("/admin/dashboard", { headers: bearer(adminToken) }), "ADMIN dashboard");
  assertOk(await api.request("/commerce/me", { headers: bearer(commerceToken) }), "COMMERCE profile");
  assertOk(await api.request("/commerce/promotions", { headers: bearer(commerceToken) }), "COMMERCE promotions");
  assertOk(await api.request("/commerce/redemptions", { headers: bearer(commerceToken) }), "COMMERCE redemptions");
  assertOk(await mobile.request("/promotions"), "CLIENT catalog");
  assertOk(await mobile.request("/redemptions/me", { headers: bearer(clientToken) }), "CLIENT history");
  const web = await fetch(urls.STAGING_WEB_URL, { redirect: "error" });
  assert(web.ok, `STAGING_WEB_URL devolvió HTTP ${web.status}.`);
  return { ok: true, mode: "read", destructive: false };
}

export async function runFullLoopSmoke(env = process.env) {
  const urls = assertSmokeSafety(env, { mutating: true });
  requireQaCredentials(env, ["ADMIN", "COMMERCE", "CLIENT"]);
  const api = new StagingClient(urls.STAGING_API_URL.toString().replace(/\/$/, ""), "web");
  const mobile = new StagingClient(urls.STAGING_API_URL.toString().replace(/\/$/, ""), "mobile");
  const [adminToken, commerceToken, clientToken] = await Promise.all([
    login(api, env.QA_ADMIN_EMAIL, env.QA_ADMIN_PASSWORD),
    login(api, env.QA_COMMERCE_EMAIL, env.QA_COMMERCE_PASSWORD),
    login(mobile, env.QA_CLIENT_EMAIL, env.QA_CLIENT_PASSWORD),
  ]);
  const runId = `staging-${Date.now()}`;
  const title = `${env.STAGING_QA_PROMOTION_PREFIX || "QA staging"} ${runId}`;
  const created = assertOk(await api.request("/commerce/promotions", {
    method: "POST",
    headers: bearer(commerceToken),
    body: JSON.stringify({ title, description: "Fixture QA temporal para smoke de staging.", promotionType: "BENEFIT", validationMethod: "QR", status: "DRAFT" }),
  }), "COMMERCE create promotion");
  const promotionId = created?.promotion?.id;
  assert(promotionId, "La promoción QA no devolvió id.");
  assertOk(await api.request(`/commerce/promotions/${promotionId}`, { method: "PUT", headers: bearer(commerceToken), body: JSON.stringify({ status: "PENDING_REVIEW" }) }), "COMMERCE submit promotion");
  assertOk(await api.request(`/admin/promotions/${promotionId}/status`, { method: "PATCH", headers: bearer(adminToken), body: JSON.stringify({ status: "APPROVED_VISIBLE" }) }), "ADMIN moderation");
  const catalog = assertOk(await mobile.request(`/promotions?search=${encodeURIComponent(title)}`), "CLIENT discovery");
  assert(catalog?.promotions?.some((promotion) => promotion.id === promotionId), "La promoción QA aprobada no apareció en catálogo.");
  assertOk(await mobile.request(`/promotions/${promotionId}`), "CLIENT promotion detail");
  const redemption = assertOk(await mobile.request("/redemptions", { method: "POST", headers: bearer(clientToken), body: JSON.stringify({ promotionId }) }), "CLIENT redemption");
  const validationCode = redemption?.redemption?.validationCode;
  const redemptionId = redemption?.redemption?.id;
  assert(validationCode && redemptionId, "El canje QA no devolvió código e id.");
  const validated = assertOk(await api.request("/commerce/redemptions/validate", { method: "POST", headers: bearer(commerceToken), body: JSON.stringify({ validationCode }) }), "COMMERCE validate redemption");
  assert(validated?.redemption?.status === "SUCCESS", "El canje QA no terminó en SUCCESS.");
  const history = assertOk(await mobile.request("/redemptions/me", { headers: bearer(clientToken) }), "CLIENT history after validation");
  assert(history?.redemptions?.some((item) => item.id === redemptionId && item.status === "SUCCESS"), "El historial QA no reflejó el canje SUCCESS.");
  return { ok: true, mode: "full-loop", destructive: true, promotionId, redemptionId };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const mode = process.argv.includes("--full-loop") ? "full-loop" : "read";
  const run = mode === "full-loop" ? runFullLoopSmoke : runReadOnlySmoke;
  run().then((result) => console.log(JSON.stringify({ status: "PASS", ...result }, null, 2))).catch((error) => {
    console.error(JSON.stringify({ status: "FAIL", mode, error: safeErrorMessage(error) }));
    process.exitCode = 1;
  });
}
