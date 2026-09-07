import { apiRequest } from "./client";
import {
  AuthActionResponse,
  ChangePasswordResponse,
  DeleteAccountResponse,
  PushTokenDeactivateResponse,
  PushTokenResponse,
  RevokeSessionResponse,
  UserSessionsResponse,
  UpdateProfileResponse,
} from "../types/api";

export async function registerPushToken(token: string, platform: "ios" | "android", deviceLabel?: string) {
  return apiRequest<PushTokenResponse>("/users/me/push-tokens", {
    method: "POST",
    body: {
      token,
      platform,
      deviceLabel,
    },
  });
}

export async function unregisterPushToken(token: string) {
  return apiRequest<PushTokenDeactivateResponse>("/users/me/push-tokens", {
    method: "DELETE",
    body: {
      token,
    },
  });
}

export async function deleteMyAccount() {
  return apiRequest<DeleteAccountResponse>("/users/me", {
    method: "DELETE",
  });
}

export async function updateMyProfile(input: {
  fullName: string;
  phone?: string;
  birthDate?: string | null;
  country?: string;
  gender?: string;
}) {
  return apiRequest<UpdateProfileResponse>("/users/me", {
    method: "PATCH",
    body: input,
  });
}

export async function changeMyPassword(input: {
  currentPassword: string;
  nextPassword: string;
}) {
  return apiRequest<ChangePasswordResponse>("/users/me/change-password", {
    method: "POST",
    body: input,
  });
}

export async function requestMyEmailChange(input: {
  nextEmail: string;
  currentPassword: string;
}) {
  return apiRequest<AuthActionResponse>("/users/me/change-email", {
    method: "POST",
    body: input,
  });
}

export async function fetchMySessions() {
  return apiRequest<UserSessionsResponse>("/users/me/sessions");
}

export async function revokeMySession(sessionId: number) {
  return apiRequest<RevokeSessionResponse>(`/users/me/sessions/${sessionId}`, {
    method: "DELETE",
  });
}

export async function revokeMyOtherSessions() {
  return apiRequest<RevokeSessionResponse>("/users/me/sessions/others", {
    method: "DELETE",
  });
}
