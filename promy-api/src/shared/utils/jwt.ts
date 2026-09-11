import jwt, { SignOptions } from "jsonwebtoken";
import { UserRole } from "@prisma/client";
import { env } from "../../config/env";

export interface AccessTokenPayload {
  userId: number;
  role: UserRole;
  sessionId: number;
  sessionVersion: number;
  tokenKind: "access";
}

export interface RefreshTokenPayload {
  userId: number;
  role: UserRole;
  sessionId: number;
  sessionVersion: number;
  tokenId: string;
  tokenKind: "refresh";
}

export interface RealtimeStreamTokenPayload {
  userId: number;
  role: UserRole;
  sessionId: number;
  sessionVersion: number;
  tokenKind: "realtime-stream";
}

const ACCESS_SECRET = env.JWT_SECRET;
const REFRESH_SECRET = env.JWT_REFRESH_SECRET;
const TOKEN_ISSUER = "promy";
const ACCESS_AUDIENCE = "promy-api";
const REFRESH_AUDIENCE = "promy-refresh";
const REALTIME_AUDIENCE = "promy-realtime";

const ACCESS_EXPIRES_IN = env.JWT_EXPIRES_IN as SignOptions["expiresIn"];
const REFRESH_EXPIRES_IN = env.JWT_REFRESH_EXPIRES_IN as SignOptions["expiresIn"];

const durationToMs = (value: string) => {
  const normalizedValue = value.trim().toLowerCase();

  if (normalizedValue.endsWith("d")) {
    return Number(normalizedValue.slice(0, -1)) * 24 * 60 * 60 * 1000;
  }

  if (normalizedValue.endsWith("h")) {
    return Number(normalizedValue.slice(0, -1)) * 60 * 60 * 1000;
  }

  if (normalizedValue.endsWith("m")) {
    return Number(normalizedValue.slice(0, -1)) * 60 * 1000;
  }

  if (normalizedValue.endsWith("s")) {
    return Number(normalizedValue.slice(0, -1)) * 1000;
  }

  return 7 * 24 * 60 * 60 * 1000;
};

export const getRefreshExpiresAt = () => {
  return new Date(Date.now() + durationToMs(env.JWT_REFRESH_EXPIRES_IN));
};

export const getRefreshTtlMs = () => {
  return durationToMs(env.JWT_REFRESH_EXPIRES_IN);
};

export const signAccessToken = (payload: Omit<AccessTokenPayload, "tokenKind">) => {
  return jwt.sign({ ...payload, tokenKind: "access" }, ACCESS_SECRET, {
    expiresIn: ACCESS_EXPIRES_IN,
    issuer: TOKEN_ISSUER,
    audience: ACCESS_AUDIENCE,
  });
};

export const signRefreshToken = (payload: Omit<RefreshTokenPayload, "tokenKind">) => {
  return jwt.sign({ ...payload, tokenKind: "refresh" }, REFRESH_SECRET, {
    expiresIn: REFRESH_EXPIRES_IN,
    issuer: TOKEN_ISSUER,
    audience: REFRESH_AUDIENCE,
  });
};

export const verifyAccessToken = (token: string) => {
  const payload = jwt.verify(token, ACCESS_SECRET, {
    issuer: TOKEN_ISSUER,
    audience: ACCESS_AUDIENCE,
  }) as AccessTokenPayload;

  if (payload.tokenKind !== "access") {
    throw new Error("Invalid access token kind");
  }

  return payload;
};

export const verifyRefreshToken = (token: string) => {
  const payload = jwt.verify(token, REFRESH_SECRET, {
    issuer: TOKEN_ISSUER,
    audience: REFRESH_AUDIENCE,
  }) as RefreshTokenPayload;

  if (payload.tokenKind !== "refresh") {
    throw new Error("Invalid refresh token kind");
  }

  return payload;
};

export const signRealtimeStreamToken = (
  payload: Omit<RealtimeStreamTokenPayload, "tokenKind">,
) => {
  return jwt.sign(
    {
      ...payload,
      tokenKind: "realtime-stream",
    } satisfies RealtimeStreamTokenPayload,
    ACCESS_SECRET,
    {
      expiresIn: "5m",
      issuer: TOKEN_ISSUER,
      audience: REALTIME_AUDIENCE,
    },
  );
};

export const verifyRealtimeStreamToken = (token: string) => {
  const payload = jwt.verify(token, ACCESS_SECRET, {
    issuer: TOKEN_ISSUER,
    audience: REALTIME_AUDIENCE,
  }) as RealtimeStreamTokenPayload;

  if (payload.tokenKind !== "realtime-stream") {
    throw new Error("Invalid realtime token kind");
  }

  return payload;
};
