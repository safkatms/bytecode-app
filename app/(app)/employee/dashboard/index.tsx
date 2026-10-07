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
import Feather from "@expo/vector-icons/Feather";
import {
  getEmployeeOverview,
  getEmployeeAttendanceTrend,
} from "@/lib/api/dashboard-employee.api";
import { useAuthStore } from "@/store/auth.store";
import { Spinner } from "@/components/ui/Spinner";
import { AlertUI } from "@/components/ui/Alert";
import { getApiErrorMessage } from "@/lib/api-error";
import { colors } from "@/components/ui/theme";

const STATUS_COLOR: Record<string, string> = {
  present: colors.bytecode[500],
  late: colors.yellow[500],
  absent: colors.red[500],
  on_leave: colors.gray[400],
  half_day: colors.bytecode[300],
};

const STATUS_LABEL: Record<string, string> = {
  present: "Present",
  late: "Late",
  absent: "Absent",
  on_leave: "On Leave",
  half_day: "Half Day",
};

function SectionHeader({
  title,
  onPress,
}: {
  title: string;
  onPress?: () => void;
}) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {onPress && (
        <TouchableOpacity
          onPress={onPress}
          hitSlop={8}
          style={styles.sectionActionBtn}
        >
          <Text style={styles.sectionAction}>See all</Text>
          <Feather
            name="chevron-right"
            size={14}
            color={colors.bytecode[500]}
          />
        </TouchableOpacity>
      )}
    </View>
  );
}

function StatCard({
  label,
  value,
  color,
  icon,
}: {
  label: string;
  value: number;
  color: string;
  icon: React.ComponentProps<typeof Feather>["name"];
}) {
  return (
    <View style={[styles.statCard, { borderColor: `${color}25` }]}>
      <View style={[styles.statIcon, { backgroundColor: `${color}15` }]}>
        <Feather name={icon} size={15} color={color} />
      </View>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function AttendanceTrendChart({
  data,
}: {
  data: Array<{
    month: string;
    present: number;
    absent: number;
    late: number;
    workHours: number;
  }>;
}) {
  const max = Math.max(...data.flatMap((d) => [d.present, d.absent]), 1);
  return (
    <View style={styles.chartCard}>
      <View style={styles.chartHeader}>
        <View>
          <Text style={styles.chartTitle}>Attendance trend</Text>
          <Text style={styles.chartSubtitle}>Last 6 months</Text>
        </View>
        <View style={styles.chartLegend}>
          <View style={styles.legendItem}>
            <View
              style={[
                styles.legendDot,
                { backgroundColor: colors.bytecode[400] },
              ]}
            />
            <Text style={styles.legendText}>Present</Text>
          </View>
          <View style={styles.legendItem}>
            <View
              style={[styles.legendDot, { backgroundColor: colors.red[400] }]}
            />
            <Text style={styles.legendText}>Absent</Text>
          </View>
        </View>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chartScroll}
      >
        <View style={styles.chartArea}>
          <View style={styles.chartGrid}>
            {[0, 1, 2, 3].map((i) => (
              <View key={i} style={styles.chartGridLine} />
            ))}
          </View>
          <View style={styles.barsContainer}>
            {data.map((item) => {
              const presentH = Math.max((item.present / max) * 150, 4);
              const absentH = Math.max((item.absent / max) * 150, 4);
              return (
                <View key={item.month} style={styles.chartColumn}>
                  <View style={styles.barGroup}>
                    <View
                      style={[
                        styles.bar,
                        styles.presentBar,
                        { height: presentH },
                      ]}
                    />
                    <View
                      style={[
                        styles.bar,
                        styles.absentBar,
                        { height: absentH },
                      ]}
                    />
                  </View>
                  <Text style={styles.chartMonth}>{item.month.slice(5)}</Text>
                </View>
              );
            })}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

export default function EmployeeDashboardScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuthStore();

  const { data, isLoading, isError, error, refetch, isRefetching } = useQuery({
    queryKey: ["employee-dashboard-overview"],
    queryFn: getEmployeeOverview,
  });

  const { data: trend } = useQuery({
    queryKey: ["employee-dashboard-trend"],
    queryFn: () => getEmployeeAttendanceTrend(6),
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

  const greeting = user?.firstName
    ? `Hi, ${user.firstName} 👋`
    : "My Attendance";
  const { today, thisMonth } = data;
  const statusColor = today.status
    ? (STATUS_COLOR[today.status] ?? colors.gray[400])
    : colors.gray[300];
  const statusLabel = today.status
    ? (STATUS_LABEL[today.status] ?? today.status)
    : "Not marked";

  const fmtTime = (iso: string | null) => {
    if (!iso) return "—";
    return new Date(iso).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top, paddingBottom: insets.bottom + 110 },
      ]}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={isRefetching} onRefresh={refetch} />
      }
    >
      {/* HERO */}
      <View style={styles.hero}>
        <View style={styles.heroHeader}>
          <View>
            <Text style={styles.heroEyebrow}>ATTENDANCE OVERVIEW</Text>
            <Text style={styles.heroGreeting}>{greeting}</Text>
          </View>
          <View style={styles.heroActions}>
            <TouchableOpacity
              onPress={() => router.push("/(app)/settings")}
              style={styles.heroActionButton}
              hitSlop={8}
            >
              <Feather
                name="settings"
                size={17}
                color="rgba(255,255,255,0.9)"
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* Today status */}
        <View style={styles.todayBlock}>
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: `${statusColor}22` },
            ]}
          >
            <View
              style={[styles.statusDot, { backgroundColor: statusColor }]}
            />
            <Text style={[styles.statusBadgeText, { color: statusColor }]}>
              {statusLabel}
            </Text>
          </View>
          <View style={styles.checkTimesRow}>
            <View style={styles.checkTimeItem}>
              <View
                style={[
                  styles.checkTimeIcon,
                  { backgroundColor: "rgba(153,246,228,0.14)" },
                ]}
              >
                <Feather name="log-in" size={13} color="#99F6E4" />
              </View>
              <Text style={styles.checkTimeLabel}>Check-in</Text>
              <Text style={styles.checkTimeValue}>
                {fmtTime(today.checkInTime)}
              </Text>
            </View>
            <View style={styles.checkTimeDivider} />
            <View style={styles.checkTimeItem}>
              <View
                style={[
                  styles.checkTimeIcon,
                  { backgroundColor: "rgba(252,165,165,0.14)" },
                ]}
              >
                <Feather name="log-out" size={13} color="#FCA5A5" />
              </View>
              <Text style={styles.checkTimeLabel}>Check-out</Text>
              <Text style={styles.checkTimeValue}>
                {fmtTime(today.checkOutTime)}
              </Text>
            </View>
            <View style={styles.checkTimeDivider} />
            <View style={styles.checkTimeItem}>
              <View
                style={[
                  styles.checkTimeIcon,
                  { backgroundColor: "rgba(165,243,252,0.14)" },
                ]}
              >
                <Feather name="clock" size={13} color="#A5F3FC" />
              </View>
              <Text style={styles.checkTimeLabel}>Hours</Text>
              <Text style={styles.checkTimeValue}>
                {today.workHours != null ? `${today.workHours}h` : "—"}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.heroFooter}>
          <View style={styles.monthBadge}>
            <View style={styles.monthDot} />
            <Text style={styles.monthText}>
              {new Date().toLocaleString("default", {
                month: "long",
                year: "numeric",
              })}
            </Text>
          </View>
          {thisMonth.totalLateMinutes > 0 && (
            <Text style={styles.lateMinutesText}>
              {thisMonth.totalLateMinutes} min late
            </Text>
          )}
        </View>
      </View>

      {/* THIS MONTH STATS */}
      <View style={styles.section}>
        <SectionHeader
          title="This month"
          onPress={() => router.push("/(app)/attendance/history")}
        />
        <View style={styles.statsGrid}>
          <StatCard
            label="Present"
            value={thisMonth.present}
            color={colors.bytecode[500]}
            icon="check-circle"
          />
          <StatCard
            label="Late"
            value={thisMonth.late}
            color="#EAB308"
            icon="clock"
          />
          <StatCard
            label="Absent"
            value={thisMonth.absent}
            color={colors.red[500]}
            icon="x-circle"
          />
          <StatCard
            label="On Leave"
            value={thisMonth.onLeave}
            color={colors.gray[400]}
            icon="umbrella"
          />
        </View>
      </View>

      {/* CHECK IN / OUT CTA */}
      {!today.checkedIn && (
        <View style={styles.section}>
          <TouchableOpacity
            style={styles.checkInBtn}
            onPress={() => router.push("/(app)/attendance/check-in")}
            activeOpacity={0.85}
          >
            <Feather name="map-pin" size={18} color="#fff" />
            <Text style={styles.checkInBtnLabel}>Check in now</Text>
          </TouchableOpacity>
        </View>
      )}
      {today.checkedIn && !today.checkedOut && (
        <View style={styles.section}>
          <TouchableOpacity
            style={[styles.checkInBtn, { backgroundColor: colors.red[500] }]}
            onPress={() => router.push("/(app)/attendance/check-out")}
            activeOpacity={0.85}
          >
            <Feather name="log-out" size={18} color="#fff" />
            <Text style={styles.checkInBtnLabel}>Check out</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* TREND CHART */}
      {trend && trend.length > 0 && (
        <View style={styles.section}>
          <AttendanceTrendChart data={trend} />
        </View>
      )}

      {/* DEVICES */}
      {data.devices.length > 0 && (
        <View style={styles.section}>
          <SectionHeader title="Trusted devices" />
          <View style={styles.card}>
            {data.devices.map((device, index) => (
              <React.Fragment key={device.id}>
                <View style={styles.deviceRow}>
                  <View style={styles.deviceIcon}>
                    <Feather
                      name="smartphone"
                      size={16}
                      color={colors.bytecode[600]}
                    />
                  </View>
                  <View style={styles.deviceInfo}>
                    <Text style={styles.deviceName}>
                      {device.deviceName ?? "Unknown device"}
                    </Text>
                    <Text style={styles.deviceMeta}>
                      {device.lastSeenAt
                        ? `Last seen ${new Date(device.lastSeenAt).toLocaleDateString()}`
                        : "Never seen"}
                    </Text>
                  </View>
                  <View style={styles.deviceActiveBadge}>
                    <Text style={styles.deviceActiveBadgeText}>Active</Text>
                  </View>
                </View>
                {index < data.devices.length - 1 && (
                  <View style={styles.divider} />
                )}
              </React.Fragment>
            ))}
          </View>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.gray[50] },
  content: { paddingBottom: 100 },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.gray[50],
  },

  hero: {
    backgroundColor: colors.bytecode[700],
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 24,
    gap: 18,
  },
  heroHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  heroEyebrow: {
    fontSize: 10,
    fontWeight: "800",
    color: "rgba(204,251,241,0.7)",
    letterSpacing: 1.5,
  },
  heroGreeting: {
    marginTop: 4,
    fontSize: 23,
    lineHeight: 29,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  heroActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  heroActionButton: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.12)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
  },

  todayBlock: { gap: 14 },
  statusBadge: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusBadgeText: { fontSize: 12, fontWeight: "800" },

  checkTimesRow: {
    flexDirection: "row",
    borderRadius: 17,
    overflow: "hidden",
    backgroundColor: "rgba(0,0,0,0.18)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  checkTimeItem: {
    flex: 1,
    paddingVertical: 11,
    paddingHorizontal: 5,
    alignItems: "center",
  },
  checkTimeIcon: {
    width: 24,
    height: 24,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  checkTimeLabel: {
    fontSize: 10,
    color: "rgba(204,251,241,0.6)",
    fontWeight: "600",
  },
  checkTimeValue: {
    fontSize: 13,
    fontWeight: "800",
    color: "#FFFFFF",
    marginTop: 3,
  },
  checkTimeDivider: { width: 1, backgroundColor: "rgba(255,255,255,0.10)" },

  heroFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  monthBadge: { flexDirection: "row", alignItems: "center", gap: 7 },
  monthDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#99F6E4",
  },
  monthText: {
    fontSize: 11,
    fontWeight: "700",
    color: "rgba(204,251,241,0.8)",
  },
  lateMinutesText: { fontSize: 11, fontWeight: "700", color: "#FCA5A5" },

  section: { marginTop: 22, paddingHorizontal: 16, gap: 10 },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  sectionTitle: {
    fontSize: 17,
    lineHeight: 22,
    fontWeight: "800",
    color: colors.gray[900],
  },
  sectionActionBtn: { flexDirection: "row", alignItems: "center", gap: 2 },
  sectionAction: {
    fontSize: 13,
    color: colors.bytecode[600],
    fontWeight: "700",
  },

  statsGrid: { flexDirection: "row", gap: 10 },
  statCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1.5,
    padding: 13,
    alignItems: "center",
    gap: 5,
  },
  statIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  statValue: { fontSize: 22, fontWeight: "900" },
  statLabel: {
    fontSize: 10,
    fontWeight: "600",
    color: colors.gray[400],
    textAlign: "center",
  },

  checkInBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    borderRadius: 16,
    height: 56,
    backgroundColor: colors.bytecode[600],
  },
  checkInBtnLabel: { fontSize: 15, fontWeight: "800", color: "#fff" },

  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 17,
    borderWidth: 1,
    borderColor: colors.gray[100],
    overflow: "hidden",
  },
  divider: {
    height: 1,
    backgroundColor: colors.gray[100],
    marginHorizontal: 14,
  },

  chartCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.gray[100],
    overflow: "hidden",
    paddingTop: 16,
    paddingBottom: 12,
  },
  chartHeader: { paddingHorizontal: 15, gap: 12 },
  chartTitle: { fontSize: 16, fontWeight: "800", color: colors.gray[900] },
  chartSubtitle: { fontSize: 11, color: colors.gray[400], marginTop: 2 },
  chartLegend: { flexDirection: "row", gap: 16 },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 5 },
  legendDot: { width: 7, height: 7, borderRadius: 4 },
  legendText: { fontSize: 10, color: colors.gray[500], fontWeight: "600" },
  chartScroll: { paddingHorizontal: 15, paddingTop: 14 },
  chartArea: { width: 400, height: 195, position: "relative" },
  chartGrid: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 4,
    height: 150,
    justifyContent: "space-between",
  },
  chartGridLine: {
    height: 1,
    backgroundColor: colors.gray[100],
    width: "100%",
  },
  barsContainer: {
    height: 190,
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-around",
    paddingHorizontal: 5,
  },
  chartColumn: {
    width: 39,
    height: 190,
    alignItems: "center",
    justifyContent: "flex-end",
  },
  barGroup: {
    height: 154,
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 3,
  },
  bar: {
    width: 10,
    borderTopLeftRadius: 5,
    borderTopRightRadius: 5,
    minHeight: 4,
  },
  presentBar: { backgroundColor: colors.bytecode[400] },
  absentBar: { backgroundColor: colors.red[400] },
  chartMonth: {
    fontSize: 9,
    fontWeight: "600",
    color: colors.gray[400],
    marginTop: 7,
  },

  deviceRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 13,
    gap: 11,
  },
  deviceIcon: {
    width: 39,
    height: 39,
    borderRadius: 12,
    backgroundColor: colors.bytecode[50],
    alignItems: "center",
    justifyContent: "center",
  },
  deviceInfo: { flex: 1 },
  deviceName: { fontSize: 14, fontWeight: "700", color: colors.gray[900] },
  deviceMeta: { fontSize: 11, color: colors.gray[400], marginTop: 2 },
  deviceActiveBadge: {
    backgroundColor: colors.bytecode[50],
    borderRadius: 8,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  deviceActiveBadgeText: {
    fontSize: 10,
    fontWeight: "800",
    color: colors.bytecode[700],
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
