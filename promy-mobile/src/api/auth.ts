import { apiRequest } from "./client";
import {
  AuthActionResponse,
  LoginResponse,
  RegisterResponse,
  LogoutResponse,
  MeResponse,
  RefreshResponse,
} from "../types/api";

export async function loginWithEmail(email: string, password: string) {
  return apiRequest<LoginResponse>("/auth/login", {
    method: "POST",
    body: { email, password },
    auth: false,
    skipAuthRefresh: true,
  });
}

export async function registerClientAccount(input: {
  fullName: string;
  email: string;
  password: string;
  phone?: string;
}) {
  return apiRequest<RegisterResponse>("/auth/register", {
    method: "POST",
    body: input,
    auth: false,
    skipAuthRefresh: true,
  });
}

export async function refreshAccessToken(refreshToken: string) {
  return apiRequest<RefreshResponse>("/auth/refresh", {
    method: "POST",
    body: { refreshToken },
    auth: false,
    skipAuthRefresh: true,
  });
}

export async function requestEmailVerification(email: string) {
  return apiRequest<AuthActionResponse>("/auth/request-email-verification", {
    method: "POST",
    body: { email },
    auth: false,
    skipAuthRefresh: true,
  });
}

export async function requestPasswordReset(email: string) {
  return apiRequest<AuthActionResponse>("/auth/forgot-password", {
    method: "POST",
    body: { email },
    auth: false,
    skipAuthRefresh: true,
  });
}

export async function verifyEmailToken(token: string) {
  return apiRequest<AuthActionResponse>("/auth/verify-email", {
    method: "POST",
    body: { token },
    auth: false,
    skipAuthRefresh: true,
  });
}

export async function resetPasswordWithToken(token: string, password: string) {
  return apiRequest<AuthActionResponse>("/auth/reset-password", {
    method: "POST",
    body: { token, password },
    auth: false,
    skipAuthRefresh: true,
  });
}

export async function logoutSession(refreshToken?: string | null) {
  return apiRequest<LogoutResponse>("/auth/logout", {
    method: "POST",
    body: refreshToken ? { refreshToken } : {},
    auth: false,
    skipAuthRefresh: true,
  });
}

export async function fetchCurrentUser(accessToken: string) {
  return apiRequest<MeResponse>("/auth/me", {
    token: accessToken,
    skipAuthRefresh: true,
  });
}
