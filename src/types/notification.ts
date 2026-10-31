export type NotificationType =
  | "leave_request_submitted"
  | "leave_request_cancelled"
  | "leave_request_reviewed"
  | "leave_marked_by_admin"
  | "holiday_created"
  | "holiday_updated"
  | "holiday_removed"
  | "attendance_marked"
  | "attendance_updated"
  | "attendance_removed"
  | "announcement";

export interface AppNotification {
  id: number;
  userId: number;
  type: NotificationType;
  title: string;
  body: string;
  data: Record<string, unknown> | null;
  readAt: string | null;
  createdAt: string;
}
