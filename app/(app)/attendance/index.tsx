import React, { useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { useRouter } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { useQuery } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Feather from "@expo/vector-icons/Feather";
import { getTodayStatus } from "@/lib/api/attendance-employee.api";
import { PageHeader } from "@/components/ui/PageHeader";
import { colors } from "@/components/ui/theme";

const STATUS_COLOR: Record<string, string> = {
  present: colors.bytecode[500],
  late: "#EAB308",
  absent: colors.red[500],
  on_leave: colors.gray[400],
  half_day: colors.bytecode[300],
  holiday: "#818CF8",
  weekend: colors.gray[300],
};

const STATUS_LABEL: Record<string, string> = {
  present: "Present",
  late: "Late",
  absent: "Absent",
  on_leave: "On Leave",
  half_day: "Half Day",
  holiday: "Holiday",
  weekend: "Weekend",
};

function fmtTime(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

function fmtHours(h: number) {
  const hrs = Math.floor(h);
  const mins = Math.round((h - hrs) * 60);
  if (hrs === 0) return `${mins}m`;
  if (mins === 0) return `${hrs}h`;
  return `${hrs}h ${mins}m`;
}

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
    : colors.gray[300];
  const statusLabel = today?.status
    ? (STATUS_LABEL[today.status] ?? today.status)
    : "No record";

  const canCheckIn = !isLoading && !today?.checkedIn;
  const canCheckOut = !isLoading && today?.checkedIn && !today?.checkedOut;

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      <PageHeader title="Attendance" variant="bytecode" />

      <ScrollView
        contentContainerStyle={[
          s.content,
          { paddingBottom: insets.bottom + 32 },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor={colors.bytecode[500]}
          />
        }
      >
        {/* Today card */}
        <View style={s.todayCard}>
          <View style={s.todayHeader}>
            <View>
              <Text style={s.todayLabel}>Today</Text>
              <Text style={s.todayDate}>
                {new Date().toLocaleDateString("en-US", {
                  weekday: "long",
                  month: "long",
                  day: "numeric",
                })}
              </Text>
            </View>
            {isLoading ? (
              <ActivityIndicator color={colors.bytecode[500]} />
            ) : (
              <View
                style={[s.statusPill, { backgroundColor: `${statusColor}18` }]}
              >
                <Text style={[s.statusText, { color: statusColor }]}>
                  {statusLabel}
                </Text>
              </View>
            )}
          </View>

          {!isLoading && today && (
            <View style={s.timesRow}>
              <View style={s.timeBox}>
                <Feather name="log-in" size={14} color={colors.bytecode[500]} />
                <Text style={s.timeBoxLabel}>Check-in</Text>
                <Text style={s.timeBoxValue}>{fmtTime(today.checkInTime)}</Text>
              </View>
              <View style={s.timeDivider} />
              <View style={s.timeBox}>
                <Feather name="log-out" size={14} color={colors.red[400]} />
                <Text style={s.timeBoxLabel}>Check-out</Text>
                <Text style={s.timeBoxValue}>
                  {fmtTime(today.checkOutTime)}
                </Text>
              </View>
              <View style={s.timeDivider} />
              <View style={s.timeBox}>
                <Feather name="clock" size={14} color={colors.gray[400]} />
                <Text style={s.timeBoxLabel}>Hours</Text>
                <Text style={s.timeBoxValue}>
                  {today.workHours != null
                    ? fmtHours(Number(today.workHours))
                    : "—"}
                </Text>
              </View>
            </View>
          )}

          {/* Action buttons */}
          <View style={s.actionRow}>
            <TouchableOpacity
              style={[
                s.actionBtn,
                s.actionBtnbytecode,
                !canCheckIn && s.actionBtnOff,
              ]}
              onPress={() => router.push("/(app)/attendance/check-in")}
              disabled={!canCheckIn}
              activeOpacity={0.85}
            >
              <Feather name="log-in" size={18} color="#fff" />
              <Text style={s.actionBtnText}>Check In</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                s.actionBtn,
                s.actionBtnRed,
                !canCheckOut && s.actionBtnOff,
              ]}
              onPress={() => router.push("/(app)/attendance/check-out")}
              disabled={!canCheckOut}
              activeOpacity={0.85}
            >
              <Feather name="log-out" size={18} color="#fff" />
              <Text style={s.actionBtnText}>Check Out</Text>
            </TouchableOpacity>
          </View>

          {!isLoading && (today?.lateMinutes ?? 0) > 0 && (
            <View style={s.lateBadge}>
              <Feather name="alert-circle" size={12} color="#D97706" />
              <Text style={s.lateText}>
                {today?.lateMinutes} min late today
              </Text>
            </View>
          )}
        </View>

        {/* Quick links */}
        <Text style={s.sectionTitle}>My Records</Text>
        <View style={s.linksCard}>
          {[
            {
              icon: "calendar" as const,
              label: "Weekly Timesheet",
              sub: "Mon–Sun breakdown",
              href: "/(app)/attendance/timesheet",
            },
            // {
            //   icon: "list" as const,
            //   label: "Attendance History",
            //   sub: "Full record with filters",
            //   href: "/(app)/attendance/history",
            // },
          ].map(({ icon, label, sub, href }, i, arr) => (
            <React.Fragment key={href}>
              <TouchableOpacity
                style={s.linkRow}
                onPress={() => router.push(href as any)}
                activeOpacity={0.8}
              >
                <View style={s.linkIcon}>
                  <Feather name={icon} size={18} color={colors.bytecode[600]} />
                </View>
                <View style={s.linkText}>
                  <Text style={s.linkLabel}>{label}</Text>
                  <Text style={s.linkSub}>{sub}</Text>
                </View>
                <Feather
                  name="chevron-right"
                  size={16}
                  color={colors.gray[300]}
                />
              </TouchableOpacity>
              {i < arr.length - 1 && <View style={s.linkDivider} />}
            </React.Fragment>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.gray[50] },
  content: { padding: 16, gap: 16 },

  todayCard: {
    backgroundColor: "#fff",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.gray[100],
    padding: 18,
    gap: 14,
  },
  todayHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  todayLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.gray[400],
    letterSpacing: 0.5,
  },
  todayDate: {
    fontSize: 16,
    fontWeight: "800",
    color: colors.gray[900],
    marginTop: 2,
  },
  statusPill: {
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  statusText: { fontSize: 12, fontWeight: "700" },

  timesRow: {
    flexDirection: "row",
    backgroundColor: colors.gray[50],
    borderRadius: 14,
    padding: 14,
  },
  timeBox: { flex: 1, alignItems: "center", gap: 4 },
  timeBoxLabel: { fontSize: 10, fontWeight: "600", color: colors.gray[400] },
  timeBoxValue: { fontSize: 14, fontWeight: "800", color: colors.gray[900] },
  timeDivider: { width: 1, backgroundColor: colors.gray[200] },

  actionRow: { flexDirection: "row", gap: 10 },
  actionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 14,
    height: 50,
  },
  actionBtnbytecode: { backgroundColor: colors.bytecode[600] },
  actionBtnRed: { backgroundColor: colors.red[500] },
  actionBtnOff: { opacity: 0.35 },
  actionBtnText: { fontSize: 14, fontWeight: "800", color: "#fff" },

  lateBadge: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#FEF3C7",
    borderRadius: 10,
    paddingVertical: 7,
  },
  lateText: { fontSize: 12, fontWeight: "700", color: "#D97706" },

  sectionTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.gray[500],
    letterSpacing: 0.5,
    marginBottom: -8,
  },
  linksCard: {
    backgroundColor: "#fff",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.gray[100],
    overflow: "hidden",
  },
  linkRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    gap: 14,
  },
  linkIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.bytecode[50],
    alignItems: "center",
    justifyContent: "center",
  },
  linkText: { flex: 1 },
  linkLabel: { fontSize: 14, fontWeight: "700", color: colors.gray[900] },
  linkSub: { fontSize: 11, color: colors.gray[400], marginTop: 1 },
  linkDivider: { height: 1, backgroundColor: colors.gray[50], marginLeft: 70 },
});
