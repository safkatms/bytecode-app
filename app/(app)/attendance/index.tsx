import React, { useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
} from "react-native";
import { useRouter } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { useQuery } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Feather from "@expo/vector-icons/Feather";
import { getTodayStatus } from "@/lib/api/attendance-employee.api";
import { PageHeader } from "@/components/ui/PageHeader";
import { Spinner } from "@/components/ui/Spinner";
import { colors } from "@/components/ui/theme";
import {
  ATTENDANCE_STATUS_COLOR as STATUS_COLOR,
  ATTENDANCE_STATUS_LABEL as STATUS_LABEL,
} from "@/lib/attendance-status";
import {
  FloatingCard,
  CheckInCta,
  Section,
  Card,
  CardDivider,
  LinkRow,
  fmtClockTime,
  fmtWorkHours,
  fmtLongDate,
} from "@/components/dashboard";

const RECORD_LINKS = [
  {
    icon: "calendar" as const,
    label: "Weekly Timesheet",
    sub: "Mon–Sun breakdown",
    path: "/(app)/attendance/timesheet",
  },
];

export default function AttendanceIndexScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const {
    data: today,
    isLoading,
    isRefetching,
    refetch,
  } = useQuery({
    queryKey: ["employee-today-status"],
    queryFn: getTodayStatus,
    staleTime: 30 * 1000,
  });

  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch]),
  );

  const statusColor = today?.status
    ? (STATUS_COLOR[today.status] ?? colors.gray[400])
    : colors.gray[400];
  const statusLabel = today?.status
    ? (STATUS_LABEL[today.status] ?? today.status)
    : today?.checkedIn
      ? "Checked in"
      : "Not checked in";

  const onLeave =
    today?.status === "sick_leave" ||
    today?.status === "casual_leave" ||
    today?.status === "holiday";
  const canCheckIn = !isLoading && !today?.checkedIn && !onLeave;
  const canCheckOut = !isLoading && !!today?.checkedIn && !today?.checkedOut;
  const lateMinutes = today?.lateMinutes ?? 0;

  return (
    <View style={s.root}>
      <PageHeader
        title="Attendance"
        subtitle={fmtLongDate()}
        variant="bytecode"
        insetTop
      />

      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + 110 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor={colors.bytecode[500]}
          />
        }
      >
        {isLoading ? (
          <View style={s.center}>
            <Spinner />
          </View>
        ) : (
          <>
            <View style={s.todayWrap}>
            <FloatingCard
              float={false}
              title="Today"
              pillIcon={null}
              pillText={statusLabel}
              pillColor={statusColor}
              pillBg={`${statusColor}18`}
              metrics={[
                {
                  key: "in",
                  icon: "log-in",
                  iconBg: colors.green[100],
                  iconColor: colors.green[600],
                  label: "Check-in",
                  value: fmtClockTime(today?.checkInTime ?? null),
                  sub: today?.checkInTime ? "Checked in" : "Not checked in",
                },
                {
                  key: "out",
                  icon: "log-out",
                  iconBg: colors.red[100],
                  iconColor: colors.red[600],
                  label: "Check-out",
                  value: fmtClockTime(today?.checkOutTime ?? null),
                  sub: today?.checkOutTime ? "Checked out" : "Not checked out",
                },
                {
                  key: "hours",
                  icon: "clock",
                  iconBg: colors.bytecode[50],
                  iconColor: colors.bytecode[600],
                  label: "Working hours",
                  value: fmtWorkHours(
                    today?.workHours != null ? Number(today.workHours) : null,
                  ),
                  sub: "Total for today",
                  emphasize: true,
                },
              ]}
            />
            </View>

            {lateMinutes > 0 && (
              <View style={s.lateBadge}>
                <Feather
                  name="alert-circle"
                  size={14}
                  color={colors.amber[600]}
                />
                <Text style={s.lateText}>
                  You were {lateMinutes} min late today
                </Text>
              </View>
            )}

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
            {!canCheckIn && !canCheckOut && (
              <View style={s.restPanel}>
                <View style={s.restIcon}>
                  <Feather
                    name={onLeave ? "sun" : "check-circle"}
                    size={20}
                    color={onLeave ? statusColor : colors.green[600]}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.restTitle}>
                    {onLeave ? statusLabel : "All done for today"}
                  </Text>
                  <Text style={s.restSub}>
                    {onLeave
                      ? "No check-in needed today."
                      : "You've checked in and out."}
                  </Text>
                </View>
              </View>
            )}
          </>
        )}

        <Section title="My records">
          <Card>
            {RECORD_LINKS.map(({ icon, label, sub, path }, i, arr) => (
              <React.Fragment key={path}>
                <LinkRow
                  icon={icon}
                  label={label}
                  sub={sub}
                  onPress={() => router.push(path as any)}
                />
                {i < arr.length - 1 && <CardDivider />}
              </React.Fragment>
            ))}
          </Card>
        </Section>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.gray[50] },
  center: { paddingTop: 48, alignItems: "center" },
  todayWrap: { paddingHorizontal: 16, paddingTop: 16 },

  lateBadge: {
    marginHorizontal: 16,
    marginTop: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    backgroundColor: colors.amber[50],
    borderRadius: 14,
    paddingVertical: 11,
  },
  lateText: { fontSize: 12.5, fontWeight: "700", color: colors.amber[700] },

  restPanel: {
    marginHorizontal: 16,
    marginTop: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 13,
    backgroundColor: "#fff",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.gray[100],
    paddingHorizontal: 15,
    paddingVertical: 15,
  },
  restIcon: {
    width: 44,
    height: 44,
    borderRadius: 15,
    backgroundColor: colors.gray[50],
    alignItems: "center",
    justifyContent: "center",
  },
  restTitle: { fontSize: 14, fontWeight: "800", color: colors.gray[900] },
  restSub: { fontSize: 12, color: colors.gray[400], marginTop: 2 },
});
