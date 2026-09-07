import { apiRequest } from "./client";
import {
  MarkAllNotificationsReadResponse,
  NotificationResponse,
  NotificationsResponse,
} from "../types/api";

export async function fetchMyNotifications(token: string) {
  return apiRequest<NotificationsResponse>("/notifications/me", { token });
}

export async function markNotificationAsRead(token: string, notificationId: number) {
  return apiRequest<NotificationResponse>(`/notifications/${notificationId}/read`, {
    method: "POST",
    token,
  });
}

export async function markAllNotificationsAsRead(token: string) {
  return apiRequest<MarkAllNotificationsReadResponse>("/notifications/read-all", {
    method: "POST",
    token,
  });
}
