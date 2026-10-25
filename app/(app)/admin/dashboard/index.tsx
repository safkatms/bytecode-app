import React from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
} from "react-native";
import { useQuery } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import {
  getAdminOverview,
  getAdminDepartmentBreakdown,
  getAdminRecentActivity,
} from "@/lib/api/dashboard-admin.api";
import { getEmployeeOverview } from "@/lib/api/dashboard-employee.api";
import { useAuthStore } from "@/store/auth.store";
import { Spinner } from "@/components/ui/Spinner";
import { AlertUI } from "@/components/ui/Alert";
import { getApiErrorMessage } from "@/lib/api-error";
import { colors } from "@/components/ui/theme";
import {
  ATTENDANCE_STATUS_COLOR,
  ATTENDANCE_STATUS_LABEL,
} from "@/lib/attendance-status";
import {
  usePresence,
  DashboardHero,
  FloatingCard,
  CheckInCta,
  Section,
  Card,
  CardDivider,
  StatsGrid,
  STAT_PALETTE,
  QuickActions,
  PersonRow,
  ProgressRow,
  fmtClockTime,
  fmtLongDate,
  fmtShortDate,
  fmtMonth,
} from "@/components/dashboard";

const PERSONAL_ACTIONS = [
  {
    icon: "thermometer" as const,
    label: "Sick Leave",
    sub: "Apply for sick leave",
    bg: colors.bytecode[50],
    color: colors.bytecode[600],
    path: "/(app)/leave/apply-sick",
  },
  {
    icon: "umbrella" as const,
    label: "Casual Leave",
    sub: "Apply for casual leave",
    bg: colors.green[100],
    color: colors.green[600],
    path: "/(app)/leave/apply-casual",
  },
  {
    icon: "clock" as const,
    label: "Timesheet",
    sub: "View your timesheet",
    bg: colors.bytecode[50],
    color: colors.bytecode[600],
    path: "/(app)/attendance/timesheet",
  },
];

const ADMIN_ACTIONS = [
  {
    icon: "calendar" as const,
    label: "Attendance",
    path: "/(app)/admin/attendance",
  },
  {
    icon: "thermometer" as const,
    label: "Sick Leave",
    path: "/(app)/admin/sick-leave",
  },
  {
    icon: "umbrella" as const,
    label: "Casual Leave",
    bg: colors.green[100],
    color: colors.green[600],
    path: "/(app)/admin/casual-leave",
  },
  {
    icon: "sun" as const,
    label: "Holidays",
    bg: colors.amber[50],
    color: colors.amber[600],
    path: "/(app)/admin/holidays",
  },
  {
    icon: "bar-chart-2" as const,
    label: "Reports",
    path: "/(app)/admin/attendance/reports",
  },
];

function deptName(d: { id: number; name: string } | string | null | undefined) {
  if (!d) return "—";
  return typeof d === "object" ? d.name : d;
}

export default function AdminDashboardScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuthStore();
  const presence = usePresence();

  const {
    data: overview,
    isLoading,
    isError,
    error,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ["admin-dashboard-overview"],
    queryFn: getAdminOverview,
  });

  // admin may not have an employee profile — that's fine
  const { data: myDay, refetch: refetchMyDay } = useQuery({
    queryKey: ["admin-my-today"],
    queryFn: getEmployeeOverview,
    retry: false,
  });

  const { data: deptData, refetch: refetchDept } = useQuery({
    queryKey: ["admin-dashboard-dept"],
    queryFn: getAdminDepartmentBreakdown,
  });

  const { data: activity, refetch: refetchActivity } = useQuery({
    queryKey: ["admin-dashboard-activity"],
    queryFn: () => getAdminRecentActivity(8),
  });

  const handleRefresh = () => {
    refetch();
    refetchDept();
    refetchActivity();
    refetchMyDay();
  };

  if (isLoading)
    return (
      <View style={styles.center}>
        <Spinner />
      </View>
    );

  if (isError || !overview) {
    return (
      <View style={[styles.center, { padding: 24 }]}>
        <AlertUI
          message={getApiErrorMessage(error, "Failed to load dashboard")}
          type="error"
        />
        <TouchableOpacity style={styles.retryButton} onPress={() => refetch()}>
          <Text style={styles.retryLabel}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const { todayAttendance: ta, employees } = overview;
  const presentPct =
    employees.active > 0
      ? Math.round(((ta.present + ta.late) / employees.active) * 100)
      : 0;

  const canCheckIn =
    myDay &&
    !myDay.today.checkedIn &&
    myDay.today.status !== "sick_leave" &&
    myDay.today.status !== "casual_leave" &&
    myDay.today.status !== "holiday";
  const canCheckOut = myDay && myDay.today.checkedIn && !myDay.today.checkedOut;

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={{ paddingBottom: insets.bottom + 110 }}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={isRefetching} onRefresh={handleRefresh} />
      }
    >
      <DashboardHero
        paddingTop={insets.top + 14}
        date={fmtLongDate()}
        greeting={
          user?.firstName ? `Hi, ${user.firstName} 👋` : "Admin Dashboard"
        }
        statusLabel={`${presentPct}% attendance today`}
        statusColor={colors.green[400]}
        presence={presence}
        onSettings={() => router.push("/(app)/settings")}
      />

      <FloatingCard
        title="Today's overview"
        pillText={fmtShortDate()}
        metrics={[
          {
            key: "present",
            icon: "check-circle",
            iconBg: colors.bytecode[50],
            iconColor: colors.bytecode[600],
            label: "Present",
            value: String(ta.present),
            sub: `of ${employees.active} active`,
            emphasize: true,
          },
          {
            key: "late",
            icon: "clock",
            iconBg: colors.amber[50],
            iconColor: colors.amber[600],
            label: "Late",
            value: String(ta.late),
            sub: "Arrived after 10:30",
            emphasize: true,
          },
          {
            key: "leave",
            icon: "sun",
            iconBg: colors.red[50],
            iconColor: colors.red[500],
            label: "On leave",
            value: String(ta.onCasualLeave + ta.onSickLeave),
            sub: `${ta.onCasualLeave} casual · ${ta.onSickLeave} sick`,
            emphasize: true,
          },
        ]}
      />

      {canCheckIn && (
        <CheckInCta
          variant="in"
          onPress={() => router.push("/(app)/attendance/check-in")}
        />
      )}
      {canCheckOut && (
        <CheckInCta
          variant="out"
          onPress={() => router.push("/(app)/attendance/check-out")}
        />
      )}

      {myDay && (
        <Section title="This month" pillIcon="calendar" pillText={fmtMonth()}>
          <StatsGrid
            items={[
              {
                label: "Present",
                value: myDay.thisMonth.present,
                icon: "users",
                ...STAT_PALETTE.present,
              },
              {
                label: "Late",
                value: myDay.thisMonth.late,
                icon: "clock",
                ...STAT_PALETTE.late,
              },
              {
                label: "On Leave",
                value: myDay.thisMonth.onLeave,
                icon: "sun",
                ...STAT_PALETTE.leave,
              },
            ]}
          />
        </Section>
      )}

      <Section title="Quick actions">
        <QuickActions
          items={PERSONAL_ACTIONS}
          onPress={(path) => router.push(path as any)}
        />
      </Section>

      <Section
        title="Admin menu"
        onSeeAll={() => router.push("/(app)/admin/menu")}
      >
        <QuickActions
          items={ADMIN_ACTIONS}
          layout="grid"
          onPress={(path) => router.push(path as any)}
        />
      </Section>

      {deptData && deptData.length > 0 && (
        <Section title="By department" pillIcon="calendar" pillText="Today">
          <Card>
            {deptData.map((item, i) => {
              const pct =
                item.total > 0
                  ? Math.round((item.present / item.total) * 100)
                  : 0;
              return (
                <React.Fragment key={item.department}>
                  <ProgressRow
                    label={item.department}
                    pct={pct}
                    meta={`${item.present}/${item.total} present · ${item.late} late`}
                    color={
                      pct >= 80
                        ? colors.bytecode[500]
                        : pct >= 50
                          ? colors.amber[500]
                          : colors.red[500]
                    }
                  />
                  {i < deptData.length - 1 && <CardDivider />}
                </React.Fragment>
              );
            })}
          </Card>
        </Section>
      )}

      {activity && activity.length > 0 && (
        <Section
          title="Recent activity"
          onSeeAll={() => router.push("/(app)/admin/attendance")}
        >
          <Card>
            {activity.map((item, i) => (
              <React.Fragment key={item.id}>
                <PersonRow
                  name={item.employee}
                  meta={`${deptName(item.department)} · ${fmtClockTime(
                    item.checkInTime,
                  )}${item.isManual ? " · Manual" : ""}`}
                  pillLabel={
                    ATTENDANCE_STATUS_LABEL[
                      item.status as keyof typeof ATTENDANCE_STATUS_LABEL
                    ] ?? item.status.replace(/_/g, " ")
                  }
                  pillColor={
                    ATTENDANCE_STATUS_COLOR[
                      item.status as keyof typeof ATTENDANCE_STATUS_COLOR
                    ] ?? colors.gray[400]
                  }
                />
                {i < activity.length - 1 && <CardDivider />}
              </React.Fragment>
            ))}
          </Card>
        </Section>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.gray[50] },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.gray[50],
  },
  retryButton: {
    marginTop: 16,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: colors.bytecode[600],
    borderRadius: 12,
  },
  retryLabel: { color: "#FFFFFF", fontWeight: "800" },
});
