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
import { getEmployeeOverview } from "@/lib/api/dashboard-employee.api";
import { useAuthStore } from "@/store/auth.store";
import { Spinner } from "@/components/ui/Spinner";
import { AlertUI } from "@/components/ui/Alert";
import { getApiErrorMessage } from "@/lib/api-error";
import { colors } from "@/components/ui/theme";
import {
  ATTENDANCE_STATUS_COLOR as STATUS_COLOR,
  ATTENDANCE_STATUS_LABEL as STATUS_LABEL,
} from "@/lib/attendance-status";
import {
  usePresence,
  DashboardHero,
  FloatingCard,
  CheckInCta,
  Section,
  StatsGrid,
  STAT_PALETTE,
  QuickActions,
  InfoCard,
  fmtClockTime,
  fmtWorkHours,
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

export default function EmployeeDashboardScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuthStore();
  const presence = usePresence();

  const { data, isLoading, isError, error, refetch, isRefetching } = useQuery({
    queryKey: ["employee-dashboard-overview"],
    queryFn: getEmployeeOverview,
  });

  if (isLoading)
    return (
      <View style={styles.center}>
        <Spinner />
      </View>
    );

  if (isError || !data) {
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

  const { today, thisMonth } = data;
  const statusColor = today.status
    ? (STATUS_COLOR[today.status as keyof typeof STATUS_COLOR] ??
      colors.gray[400])
    : colors.gray[400];
  const statusLabel = today.status
    ? (STATUS_LABEL[today.status as keyof typeof STATUS_LABEL] ?? today.status)
    : today.checkedIn
      ? "Checked in"
      : "Not checked in";

  const canCheckIn =
    !today.checkedIn &&
    today.status !== "sick_leave" &&
    today.status !== "casual_leave" &&
    today.status !== "holiday";
  const canCheckOut = today.checkedIn && !today.checkedOut;

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={{ paddingBottom: insets.bottom + 110 }}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={isRefetching} onRefresh={refetch} />
      }
    >
      <DashboardHero
        paddingTop={insets.top + 14}
        date={fmtLongDate()}
        greeting={user?.firstName ? `Hi, ${user.firstName} 👋` : "My Attendance"}
        statusLabel={statusLabel}
        statusColor={statusColor}
        presence={presence}
        onSettings={() => router.push("/(app)/settings")}
      />

      <FloatingCard
        title="Today's attendance"
        pillText={fmtShortDate()}
        metrics={[
          {
            key: "in",
            icon: "log-in",
            iconBg: colors.green[100],
            iconColor: colors.green[600],
            label: "Check-in",
            value: fmtClockTime(today.checkInTime),
            sub: today.checkInTime ? "Checked in" : "Not checked in",
          },
          {
            key: "out",
            icon: "log-out",
            iconBg: colors.red[100],
            iconColor: colors.red[600],
            label: "Check-out",
            value: fmtClockTime(today.checkOutTime),
            sub: today.checkOutTime ? "Checked out" : "Not checked out",
          },
          {
            key: "hours",
            icon: "clock",
            iconBg: colors.bytecode[50],
            iconColor: colors.bytecode[600],
            label: "Working hours",
            value: fmtWorkHours(
              today.workHours != null ? Number(today.workHours) : null,
            ),
            sub: "Total for today",
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

      <Section title="This month" pillIcon="calendar" pillText={fmtMonth()}>
        <StatsGrid
          items={[
            {
              label: "Present",
              value: thisMonth.present,
              icon: "users",
              ...STAT_PALETTE.present,
            },
            {
              label: "Late",
              value: thisMonth.late,
              icon: "clock",
              ...STAT_PALETTE.late,
            },
            {
              label: "On Leave",
              value: thisMonth.onLeave,
              icon: "sun",
              ...STAT_PALETTE.leave,
            },
          ]}
        />
      </Section>

      <Section title="Quick actions">
        <QuickActions
          items={PERSONAL_ACTIONS}
          onPress={(path) => router.push(path as any)}
        />
      </Section>

      {data.devices.length > 0 && (
        <Section
          title="Trusted devices"
          pillIcon="shield"
          pillText={`${data.devices.length} active`}
        >
          <View style={styles.deviceList}>
            {data.devices.map((device) => (
              <InfoCard
                key={device.id}
                icon="smartphone"
                title={device.deviceName ?? "Unknown device"}
                metaIcon="clock"
                meta={
                  device.lastSeenAt
                    ? `Last seen ${new Date(device.lastSeenAt).toLocaleDateString(
                        "en-US",
                        { month: "short", day: "numeric", year: "numeric" },
                      )}`
                    : "Never seen"
                }
                badgeText="Active"
              />
            ))}
          </View>
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
  deviceList: { gap: 10 },
  retryButton: {
    marginTop: 16,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: colors.bytecode[600],
    borderRadius: 12,
  },
  retryLabel: { color: "#FFFFFF", fontWeight: "800" },
});
