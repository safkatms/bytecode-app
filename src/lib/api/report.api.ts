// src/lib/api/report.api.ts

import { api } from "@/lib/axios";
import type { ApiResponse } from "@/types/api";

export type ReportRange = "last_week" | "this_month" | "custom";
export type ReportScope = "all" | "department" | "team" | "employees";

export interface EmailAttendanceReportPayload {
  range: ReportRange;
  startDate?: string;
  endDate?: string;
  scope: ReportScope;
  ids?: number[];
  recipientUserIds: number[];
}

export interface EmailAttendanceReportResult {
  range: { startDate: string; endDate: string };
  employees: number;
  weeks: number;
  sent: number;
  failed: number;
}

export async function emailAttendanceReport(
  payload: EmailAttendanceReportPayload,
): Promise<EmailAttendanceReportResult> {
  const res = await api.post<ApiResponse<EmailAttendanceReportResult>>(
    "/reports/attendance/email",
    payload,
    { timeout: 120_000 }, // big reports are built during the request
  );
  return res.data.data!;
}
