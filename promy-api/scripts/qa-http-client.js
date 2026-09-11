const DEFAULT_BASE_URL = process.env.QA_BASE_URL || "http://localhost:4017/api";
const REFRESH_COOKIE_NAME = process.env.REFRESH_COOKIE_NAME || "promy_refresh_token";

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

class QaHttpClient {
  constructor({ platform, baseUrl = DEFAULT_BASE_URL, forwardedIp } = {}) {
    this.platform = platform === "mobile" ? "mobile" : "web";
    this.baseUrl = baseUrl;
    this.forwardedIp = forwardedIp;
    this.cookies = new Map();
  }

  getCookie(name) {
    return this.cookies.get(name) || null;
  }

  setCookie(name, value) {
    if (value) this.cookies.set(name, value);
    else this.cookies.delete(name);
  }

  storeResponseCookies(headers) {
    const values =
      typeof headers.getSetCookie === "function"
        ? headers.getSetCookie()
        : [headers.get("set-cookie")].filter(Boolean);

    for (const value of values) {
      const [pair] = value.split(";", 1);
      const separator = pair.indexOf("=");
      if (separator < 1) continue;

      const name = pair.slice(0, separator).trim();
      const cookieValue = pair.slice(separator + 1).trim();

      if (!cookieValue) {
        this.cookies.delete(name);
      } else {
        this.cookies.set(name, cookieValue);
      }
    }
  }

  async request(path, options = {}) {
    const headers = new Headers(options.headers || {});
    if (!(options.body instanceof FormData) && !headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }
    headers.set("x-promy-client", this.platform);

    if (this.forwardedIp) {
      headers.set("X-Forwarded-For", this.forwardedIp);
    }

    if (this.platform === "web" && this.cookies.size > 0) {
      headers.set(
        "Cookie",
        [...this.cookies.entries()].map(([name, value]) => `${name}=${value}`).join("; "),
      );
    }

    const response = await fetch(`${this.baseUrl}${path}`, {
      ...options,
      headers,
    });

    if (this.platform === "web") {
      this.storeResponseCookies(response.headers);
    }

    const text = await response.text();
    let data = null;

    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = text;
    }

    return {
      ok: response.ok,
      status: response.status,
      data,
      headers: response.headers,
    };
  }
}

function createMobileClient(options = {}) {
  return new QaHttpClient({ ...options, platform: "mobile" });
}

function createWebClient(options = {}) {
  return new QaHttpClient({ ...options, platform: "web" });
}

async function loginMobile(client, email, password) {
  assert(client.platform === "mobile", "loginMobile requiere un cliente mobile");
  const response = await client.request("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });

  assert(response.ok, `No se pudo loguear ${email}: ${JSON.stringify(response.data)}`);
  assert(response.data?.accessToken, `Login mobile sin accessToken para ${email}`);
  assert(response.data?.refreshToken, `Login mobile sin refreshToken para ${email}`);
  return response.data;
}

async function loginWeb(client, email, password) {
  assert(client.platform === "web", "loginWeb requiere un cliente web");
  const response = await client.request("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });

  assert(response.ok, `No se pudo loguear ${email}: ${JSON.stringify(response.data)}`);
  assert(response.data?.accessToken, `Login web sin accessToken para ${email}`);
  assert(!response.data?.refreshToken, "Login web no debe exponer refreshToken en JSON");
  assert(client.getCookie(REFRESH_COOKIE_NAME), "Login web no entrego cookie httpOnly de refresh");
  return response.data;
}

async function refreshMobile(client, refreshToken) {
  assert(client.platform === "mobile", "refreshMobile requiere un cliente mobile");
  return client.request("/auth/refresh", {
    method: "POST",
    body: JSON.stringify({ refreshToken }),
  });
}

async function refreshWeb(client) {
  assert(client.platform === "web", "refreshWeb requiere un cliente web");
  return client.request("/auth/refresh", {
    method: "POST",
  });
}

async function logoutMobile(client, refreshToken) {
  assert(client.platform === "mobile", "logoutMobile requiere un cliente mobile");
  return client.request("/auth/logout", {
    method: "POST",
    body: JSON.stringify({ refreshToken }),
  });
}

async function logoutWeb(client) {
  assert(client.platform === "web", "logoutWeb requiere un cliente web");
  return client.request("/auth/logout", {
    method: "POST",
  });
}

module.exports = {
  QaHttpClient,
  assert,
  createMobileClient,
  createWebClient,
  loginMobile,
  loginWeb,
  refreshMobile,
  refreshWeb,
  logoutMobile,
  logoutWeb,
};
