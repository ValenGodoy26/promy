import { apiRequest } from "./client";
import { PushTokenDeactivateResponse, PushTokenResponse } from "../types/api";

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
