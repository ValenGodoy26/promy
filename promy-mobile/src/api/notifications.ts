import { apiRequest } from "./client";
import {
  MarkAllNotificationsReadResponse,
  NotificationResponse,
  NotificationsResponse,
} from "../types/api";

export async function fetchMyNotifications(token: string) {
  const notifications: NotificationsResponse["notifications"] = [];
  let cursor: number | null = null;
  let unreadCount = 0;
  do {
    const suffix: string = cursor ? `?limit=100&cursor=${cursor}` : "?limit=100";
    const page: NotificationsResponse = await apiRequest<NotificationsResponse>(`/notifications/me${suffix}`, { token });
    notifications.push(...page.notifications);
    unreadCount = page.unreadCount;
    cursor = page.hasMore ? page.nextCursor ?? null : null;
  } while (cursor);
  return { ok: true, notifications, unreadCount, hasMore: false, nextCursor: null };
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
