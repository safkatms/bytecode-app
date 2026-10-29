import { colors } from "@/components/ui/theme";
import type { AttendanceStatus } from "@/types/attendance";

export const ATTENDANCE_STATUS_COLOR: Record<AttendanceStatus, string> = {
  present: colors.bytecode[500],
  late: "#EAB308",
  holiday: colors.amber[500],
  sick_leave: colors.pink[500],
  casual_leave: colors.red[500],
  weekend: colors.gray[300],
  half_day: colors.red[500],
};

export const ATTENDANCE_STATUS_LABEL: Record<AttendanceStatus, string> = {
  present: "Present",
  late: "Late",
  holiday: "Holiday",
  sick_leave: "Sick Leave",
  casual_leave: "Casual Leave",
  weekend: "Weekend",
  half_day: "Half Day",
};

export const ALL_ATTENDANCE_STATUSES = Object.keys(
  ATTENDANCE_STATUS_LABEL,
) as AttendanceStatus[];
