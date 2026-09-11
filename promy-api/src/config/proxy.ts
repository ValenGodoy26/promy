import { isIP } from "node:net";
import type { NextFunction, Request, Response } from "express";

const TRUST_PROXY_ALIASES = new Set(["loopback", "linklocal", "uniquelocal"]);
const FORWARDED_HEADERS = [
  "forwarded",
  "x-forwarded-for",
  "x-forwarded-host",
  "x-forwarded-port",
  "x-forwarded-proto",
] as const;

function isValidCidr(value: string) {
  const [address, rawPrefix, extra] = value.split("/");
  if (!address || !rawPrefix || extra !== undefined) return false;

  const family = isIP(address);
  const prefix = Number(rawPrefix);
  const maxPrefix = family === 4 ? 32 : family === 6 ? 128 : -1;
  return Number.isInteger(prefix) && prefix >= 0 && prefix <= maxPrefix;
}

export function parseTrustProxy(value: string | undefined) {
  const normalized = value?.trim().toLowerCase() || "none";
  if (normalized === "none") return { mode: "none" as const, entries: [] as string[] };

  const entries = normalized.split(",").map((entry) => entry.trim()).filter(Boolean);
  if (
    entries.length === 0 ||
    entries.includes("none") ||
    entries.some((entry) =>
      ["true", "false", "*"].includes(entry) ||
      /^\d+$/.test(entry) ||
      (!TRUST_PROXY_ALIASES.has(entry) && !isIP(entry) && !isValidCidr(entry)),
    )
  ) {
    throw new Error(
      "TRUST_PROXY debe ser 'none' o una lista explicita de aliases seguros, IPs o rangos CIDR; no se aceptan booleanos, comodines ni cantidades de saltos.",
    );
  }

  return { mode: "explicit" as const, entries };
}

export function buildExpressTrustProxy(value: string | undefined) {
  const policy = parseTrustProxy(value);
  return policy.mode === "none" ? false : policy.entries;
}

export function discardUntrustedForwardedHeaders(
  trustProxy: string | undefined,
) {
  const directMode = parseTrustProxy(trustProxy).mode === "none";

  return (req: Request, _res: Response, next: NextFunction) => {
    if (directMode) {
      for (const header of FORWARDED_HEADERS) delete req.headers[header];
    }
    next();
  };
}
