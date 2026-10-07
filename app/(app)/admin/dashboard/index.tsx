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
  getAdminOverview,
  getAdminAttendanceTrend,
  getAdminDepartmentBreakdown,
  getAdminRecentActivity,
  getAdminLateReport,
} from "@/lib/api/dashboard-admin.api";
import { useAuthStore } from "@/store/auth.store";
import { Spinner } from "@/components/ui/Spinner";
import { AlertUI } from "@/components/ui/Alert";
import { getApiErrorMessage } from "@/lib/api-error";
import { colors } from "@/components/ui/theme";
import type {
  RecentActivityItem,
  LateReportItem,
} from "@/lib/api/dashboard-admin.api";

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
          <Feather name="chevron-right" size={14} color={colors.teal[500]} />
        </TouchableOpacity>
      )}
    </View>
  );
}

function TrendChart({
  data,
}: {
  data: Array<{ month: string; present: number; absent: number; late: number }>;
}) {
  const max = Math.max(...data.flatMap((d) => [d.present, d.absent]), 1);
  return (
    <View style={styles.chartCard}>
      <View style={styles.chartHeader}>
        <View>
          <Text style={styles.chartTitle}>Attendance trend</Text>
          <Text style={styles.chartSubtitle}>
            All employees · last 6 months
          </Text>
        </View>
        <View style={styles.chartLegend}>
          <View style={styles.legendItem}>
            <View
              style={[styles.legendDot, { backgroundColor: colors.teal[400] }]}
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

function ActivityRow({ item }: { item: RecentActivityItem }) {
  const STATUS_COLOR: Record<string, string> = {
    present: colors.teal[500],
    late: "#EAB308",
    absent: colors.red[500],
    on_leave: colors.gray[400],
    half_day: colors.teal[300],
  };
  const color = STATUS_COLOR[item.status] ?? colors.gray[400];
  const fmtTime = (iso: string | null) =>
    iso
      ? new Date(iso).toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
        })
      : "—";

  return (
    <View style={styles.activityRow}>
      <View style={[styles.activityAvatar, { backgroundColor: `${color}18` }]}>
        <Text style={[styles.activityAvatarText, { color }]}>
          {item.employee
            .split(" ")
            .map((n) => n[0])
            .join("")
            .slice(0, 2)
            .toUpperCase()}
        </Text>
      </View>
      <View style={styles.activityInfo}>
        <Text style={styles.activityName} numberOfLines={1}>
          {item.employee}
        </Text>
        <Text style={styles.activityMeta}>
          {item.department ?? "—"} · {fmtTime(item.checkInTime)}
          {item.isManual ? " · Manual" : ""}
        </Text>
      </View>
      <View style={[styles.statusPill, { backgroundColor: `${color}15` }]}>
        <Text style={[styles.statusPillText, { color }]}>
          {item.status.replace("_", " ")}
        </Text>
      </View>
    </View>
  );
}

function LateRow({ item }: { item: LateReportItem }) {
  const hours = Math.floor(item.totalLateMinutes / 60);
  const mins = item.totalLateMinutes % 60;
  const timeStr = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  return (
    <View style={styles.lateRow}>
      <View style={styles.lateAvatar}>
        <Text style={styles.lateAvatarText}>
          {`${item.employee.user.firstName[0]}${item.employee.user.lastName[0]}`.toUpperCase()}
        </Text>
      </View>
      <View style={styles.lateInfo}>
        <Text style={styles.lateName}>
          {item.employee.user.firstName} {item.employee.user.lastName}
        </Text>
        <Text style={styles.lateMeta}>
          {item.employee.department ?? "—"} · {item.count} times
        </Text>
      </View>
      <Text style={styles.lateTime}>{timeStr}</Text>
    </View>
  );
}

function DeptRow({
  item,
}: {
  item: {
    department: string;
    total: number;
    present: number;
    absent: number;
    late: number;
  };
}) {
  const pct =
    item.total > 0 ? Math.round((item.present / item.total) * 100) : 0;
  const barColor =
    pct >= 80 ? colors.teal[500] : pct >= 50 ? "#EAB308" : colors.red[500];
  return (
    <View style={styles.deptRow}>
      <View style={styles.deptHeader}>
        <Text style={styles.deptName} numberOfLines={1}>
          {item.department}
        </Text>
        <Text style={styles.deptPct}>{pct}%</Text>
      </View>
      <View style={styles.deptTrack}>
        <View
          style={[
            styles.deptFill,
            { width: `${pct}%`, backgroundColor: barColor },
          ]}
        />
      </View>
      <Text style={styles.deptMeta}>
        {item.present}/{item.total} present · {item.late} late
      </Text>
    </View>
  );
}

export default function AdminDashboardScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuthStore();

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
  const { data: trend } = useQuery({
    queryKey: ["admin-dashboard-trend"],
    queryFn: () => getAdminAttendanceTrend(6),
  });
  const { data: deptData } = useQuery({
    queryKey: ["admin-dashboard-dept"],
    queryFn: getAdminDepartmentBreakdown,
  });
  const { data: activity } = useQuery({
    queryKey: ["admin-dashboard-activity"],
    queryFn: () => getAdminRecentActivity(8),
  });
  const { data: lateData } = useQuery({
    queryKey: ["admin-dashboard-late"],
    queryFn: () => getAdminLateReport(),
  });

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

  const greeting = user?.firstName
    ? `Hi, ${user.firstName} 👋`
    : "Admin Dashboard";
  const { todayAttendance: ta, employees } = overview;
  const presentPct =
    employees.active > 0
      ? Math.round(((ta.present + ta.late) / employees.active) * 100)
      : 0;

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
            <Text style={styles.heroEyebrow}>ADMIN · ATTENDANCE</Text>
            <Text style={styles.heroGreeting}>{greeting}</Text>
          </View>
          <TouchableOpacity
            onPress={() => router.push("/(app)/employees")}
            style={styles.heroActionButton}
            hitSlop={8}
          >
            <Feather name="users" size={17} color="rgba(255,255,255,0.9)" />
          </TouchableOpacity>
        </View>

        {/* Attendance rate */}
        <View style={styles.rateBlock}>
          <Text style={styles.rateLabel}>Today's attendance rate</Text>
          <Text style={styles.rateValue}>{presentPct}%</Text>
          <View style={styles.rateBarTrack}>
            <View style={[styles.rateBarFill, { width: `${presentPct}%` }]} />
          </View>
        </View>

        {/* Today breakdown */}
        <View style={styles.metricsCard}>
          {[
            {
              label: "Present",
              value: ta.present,
              icon: "check-circle" as const,
              color: "#99F6E4",
            },
            {
              label: "Late",
              value: ta.late,
              icon: "clock" as const,
              color: "#FDE68A",
            },
            {
              label: "Absent",
              value: ta.absent,
              icon: "x-circle" as const,
              color: "#FCA5A5",
            },
            {
              label: "Leave",
              value: ta.onLeave,
              icon: "umbrella" as const,
              color: "#A5F3FC",
            },
          ].map((item, i, arr) => (
            <React.Fragment key={item.label}>
              <View style={styles.metric}>
                <View
                  style={[
                    styles.metricIcon,
                    { backgroundColor: `${item.color}22` },
                  ]}
                >
                  <Feather name={item.icon} size={13} color={item.color} />
                </View>
                <Text style={styles.metricLabel}>{item.label}</Text>
                <Text style={[styles.metricValue, { color: item.color }]}>
                  {item.value}
                </Text>
              </View>
              {i < arr.length - 1 && <View style={styles.metricDivider} />}
            </React.Fragment>
          ))}
        </View>

        <View style={styles.heroFooter}>
          <View style={styles.monthBadge}>
            <View style={styles.monthDot} />
            <Text style={styles.monthText}>
              {new Date().toLocaleDateString("en-US", {
                weekday: "long",
                month: "long",
                day: "numeric",
              })}
            </Text>
          </View>
          <Text style={styles.notMarkedText}>{ta.notMarked} not marked</Text>
        </View>
      </View>

      {/* EMPLOYEE COUNTS */}
      <View style={styles.section}>
        <SectionHeader
          title="Employees"
          onPress={() => router.push("/(app)/employees")}
        />
        <View style={styles.empRow}>
          {[
            {
              label: "Total",
              value: employees.total,
              color: colors.teal[600],
              bg: colors.teal[50],
            },
            {
              label: "Active",
              value: employees.active,
              color: colors.teal[600],
              bg: colors.teal[50],
            },
            {
              label: "Inactive",
              value: employees.inactive,
              color: colors.red[500],
              bg: colors.red[50],
            },
          ].map((e) => (
            <View
              key={e.label}
              style={[styles.empCard, { borderColor: `${e.color}20` }]}
            >
              <Text style={[styles.empValue, { color: e.color }]}>
                {e.value}
              </Text>
              <Text style={styles.empLabel}>{e.label}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* QUICK ACTIONS */}
      <View style={styles.section}>
        <SectionHeader title="Quick actions" />
        <View style={styles.quickActionsCard}>
          {[
            {
              icon: "user-plus" as const,
              label: "Add Employee",
              path: "/(app)/employees/create",
            },
            {
              icon: "edit-2" as const,
              label: "Mark Attend.",
              path: "/(app)/attendance/admin-mark",
            },
            {
              icon: "map-pin" as const,
              label: "Locations",
              path: "/(app)/office-locations",
            },
            {
              icon: "bar-chart-2" as const,
              label: "Reports",
              path: "/(app)/attendance/reports",
            },
          ].map(({ icon, label, path }) => (
            <TouchableOpacity
              key={label}
              style={styles.quickAction}
              onPress={() => router.push(path as any)}
              activeOpacity={0.75}
            >
              <View style={styles.quickIcon}>
                <Feather name={icon} size={19} color={colors.teal[600]} />
              </View>
              <Text style={styles.quickLabel}>{label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* TREND CHART */}
      {trend && trend.length > 0 && (
        <View style={styles.section}>
          <TrendChart data={trend} />
        </View>
      )}

      {/* DEPARTMENT BREAKDOWN */}
      {deptData && deptData.length > 0 && (
        <View style={styles.section}>
          <SectionHeader title="By department · today" />
          <View style={styles.card}>
            {deptData.map((item, index) => (
              <React.Fragment key={item.department}>
                <DeptRow item={item} />
                {index < deptData.length - 1 && <View style={styles.divider} />}
              </React.Fragment>
            ))}
          </View>
        </View>
      )}

      {/* LATE REPORT */}
      {lateData && lateData.length > 0 && (
        <View style={styles.section}>
          <SectionHeader title="Late this month" />
          <View style={styles.card}>
            {lateData.slice(0, 5).map((item, index) => (
              <React.Fragment key={item.employee.id}>
                <LateRow item={item} />
                {index < Math.min(lateData.length, 5) - 1 && (
                  <View style={styles.divider} />
                )}
              </React.Fragment>
            ))}
            {lateData.length > 5 && (
              <>
                <View style={styles.divider} />
                <TouchableOpacity
                  style={styles.viewMoreRow}
                  onPress={() =>
                    router.push("/(app)/attendance/reports" as any)
                  }
                >
                  <Text style={styles.viewMoreText}>
                    View {lateData.length - 5} more
                  </Text>
                  <Feather
                    name="arrow-right"
                    size={15}
                    color={colors.teal[500]}
                  />
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      )}

      {/* RECENT ACTIVITY */}
      {activity && activity.length > 0 && (
        <View style={styles.section}>
          <SectionHeader
            title="Recent activity"
            onPress={() => router.push("/(app)/attendance" as any)}
          />
          <View style={styles.card}>
            {activity.map((item, index) => (
              <React.Fragment key={item.id}>
                <ActivityRow item={item} />
                {index < activity.length - 1 && <View style={styles.divider} />}
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
    backgroundColor: colors.teal[700],
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

  rateBlock: { gap: 6 },
  rateLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "rgba(204,251,241,0.7)",
  },
  rateValue: {
    fontSize: 38,
    lineHeight: 44,
    fontWeight: "900",
    color: "#FFFFFF",
    letterSpacing: -1,
  },
  rateBarTrack: {
    height: 6,
    borderRadius: 4,
    backgroundColor: "rgba(255,255,255,0.15)",
    overflow: "hidden",
  },
  rateBarFill: { height: 6, borderRadius: 4, backgroundColor: "#99F6E4" },

  metricsCard: {
    flexDirection: "row",
    borderRadius: 17,
    overflow: "hidden",
    backgroundColor: "rgba(0,0,0,0.18)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  metric: {
    flex: 1,
    paddingVertical: 11,
    paddingHorizontal: 5,
    alignItems: "center",
  },
  metricIcon: {
    width: 24,
    height: 24,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  metricLabel: {
    fontSize: 10,
    color: "rgba(204,251,241,0.6)",
    fontWeight: "600",
  },
  metricValue: { fontSize: 13, fontWeight: "800", marginTop: 3 },
  metricDivider: { width: 1, backgroundColor: "rgba(255,255,255,0.10)" },

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
  notMarkedText: {
    fontSize: 11,
    fontWeight: "700",
    color: "rgba(252,165,165,0.9)",
  },

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
  sectionAction: { fontSize: 13, color: colors.teal[600], fontWeight: "700" },

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
  viewMoreRow: {
    minHeight: 45,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
  },
  viewMoreText: { fontSize: 12, fontWeight: "700", color: colors.teal[600] },

  empRow: { flexDirection: "row", gap: 10 },
  empCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1.5,
    padding: 14,
    alignItems: "center",
    gap: 4,
  },
  empValue: { fontSize: 26, fontWeight: "900" },
  empLabel: { fontSize: 11, fontWeight: "600", color: colors.gray[400] },

  quickActionsCard: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.gray[100],
    paddingVertical: 13,
    paddingHorizontal: 7,
  },
  quickAction: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  quickIcon: {
    width: 43,
    height: 43,
    borderRadius: 14,
    backgroundColor: colors.teal[50],
    alignItems: "center",
    justifyContent: "center",
  },
  quickLabel: { fontSize: 11, fontWeight: "700", color: colors.gray[700] },

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
  presentBar: { backgroundColor: colors.teal[400] },
  absentBar: { backgroundColor: colors.red[400] },
  chartMonth: {
    fontSize: 9,
    fontWeight: "600",
    color: colors.gray[400],
    marginTop: 7,
  },

  deptRow: { paddingHorizontal: 14, paddingVertical: 12, gap: 6 },
  deptHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  deptName: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.gray[800],
    flex: 1,
  },
  deptPct: { fontSize: 13, fontWeight: "800", color: colors.gray[900] },
  deptTrack: {
    height: 6,
    borderRadius: 4,
    backgroundColor: colors.teal[50],
    overflow: "hidden",
  },
  deptFill: { height: 6, borderRadius: 4, minWidth: 4 },
  deptMeta: { fontSize: 10, color: colors.gray[400], fontWeight: "600" },

  activityRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 13,
    gap: 11,
  },
  activityAvatar: {
    width: 39,
    height: 39,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  activityAvatarText: { fontSize: 13, fontWeight: "900" },
  activityInfo: { flex: 1 },
  activityName: { fontSize: 14, fontWeight: "700", color: colors.gray[900] },
  activityMeta: {
    fontSize: 11,
    color: colors.gray[400],
    marginTop: 2,
    textTransform: "capitalize",
  },
  statusPill: { borderRadius: 8, paddingHorizontal: 9, paddingVertical: 5 },
  statusPillText: {
    fontSize: 10,
    fontWeight: "800",
    textTransform: "capitalize",
  },

  lateRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 13,
    gap: 11,
  },
  lateAvatar: {
    width: 39,
    height: 39,
    borderRadius: 12,
    backgroundColor: "#FEF3C7",
    alignItems: "center",
    justifyContent: "center",
  },
  lateAvatarText: { fontSize: 13, fontWeight: "900", color: "#D97706" },
  lateInfo: { flex: 1 },
  lateName: { fontSize: 14, fontWeight: "700", color: colors.gray[900] },
  lateMeta: { fontSize: 11, color: colors.gray[400], marginTop: 2 },
  lateTime: { fontSize: 14, fontWeight: "900", color: "#D97706" },

  retryButton: {
    marginTop: 16,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: colors.teal[600],
    borderRadius: 12,
  },
  retryLabel: { color: "#FFFFFF", fontWeight: "800" },
});
