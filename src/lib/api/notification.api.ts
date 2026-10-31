// src/lib/api/notification.api.ts

import { api } from "@/lib/axios";
import type { ApiResponse, PaginatedResponse } from "@/types/api";
import type { AppNotification } from "@/types/notification";

export async function listNotifications(
  page = 1,
  limit = 10,
  unreadOnly = false,
): Promise<PaginatedResponse<AppNotification>> {
  const res = await api.get<PaginatedResponse<AppNotification>>(
    "/notifications",
    { params: { page, limit, ...(unreadOnly && { unreadOnly: true }) } },
  );
  return res.data;
}

export async function getUnreadCount(): Promise<number> {
  const res = await api.get<ApiResponse<{ count: number }>>(
    "/notifications/unread-count",
  );
  return res.data.data?.count ?? 0;
}

export async function markNotificationRead(id: number): Promise<void> {
  await api.patch(`/notifications/${id}/read`);
}

export async function markAllNotificationsRead(): Promise<void> {
  await api.patch("/notifications/read-all");
}

export async function deleteNotification(id: number): Promise<void> {
  await api.delete(`/notifications/${id}`);
}

export async function clearAllNotifications(): Promise<void> {
  await api.delete("/notifications");
}

export async function registerPushToken(payload: {
  token: string;
  platform?: string;
  deviceId?: string;
}): Promise<void> {
  await api.post("/notifications/push-token", payload);
}

export async function unregisterPushToken(token: string): Promise<void> {
  await api.delete("/notifications/push-token", { data: { token } });
}

export type BroadcastTarget = "all" | "department" | "team" | "employees";

export async function broadcastAnnouncement(payload: {
  title: string;
  body: string;
  target: BroadcastTarget;
  ids?: number[];
  sendEmail?: boolean;
}): Promise<{ recipients: number }> {
  const res = await api.post<ApiResponse<{ recipients: number }>>(
    "/notifications/broadcast",
    payload,
  );
  return res.data.data!;
}
