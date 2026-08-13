import jwt, { SignOptions } from "jsonwebtoken";
import { UserRole } from "@prisma/client";
import { env } from "../../config/env";

export interface AccessTokenPayload {
  userId: number;
  role: UserRole;
}

export interface RefreshTokenPayload {
  userId: number;
  role: UserRole;
  sessionId: number;
  tokenId: string;
}

export interface RealtimeStreamTokenPayload {
  userId: number;
  role: UserRole;
  kind: "realtime-stream";
}

const ACCESS_SECRET = env.JWT_SECRET;
const REFRESH_SECRET = env.JWT_REFRESH_SECRET;

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

export const signAccessToken = (payload: AccessTokenPayload) => {
  return jwt.sign(payload, ACCESS_SECRET, {
    expiresIn: ACCESS_EXPIRES_IN,
  });
};

export const signRefreshToken = (payload: RefreshTokenPayload) => {
  return jwt.sign(payload, REFRESH_SECRET, {
    expiresIn: REFRESH_EXPIRES_IN,
  });
};

export const verifyAccessToken = (token: string) => {
  return jwt.verify(token, ACCESS_SECRET) as AccessTokenPayload;
};

export const verifyRefreshToken = (token: string) => {
  return jwt.verify(token, REFRESH_SECRET) as RefreshTokenPayload;
};

export const signRealtimeStreamToken = (payload: Omit<RealtimeStreamTokenPayload, "kind">) => {
  return jwt.sign(
    {
      ...payload,
      kind: "realtime-stream",
    } satisfies RealtimeStreamTokenPayload,
    ACCESS_SECRET,
    {
      expiresIn: "5m",
    },
  );
};

export const verifyRealtimeStreamToken = (token: string) => {
  return jwt.verify(token, ACCESS_SECRET) as RealtimeStreamTokenPayload;
};
