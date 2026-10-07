// app/(app)/admin/attendance/index.tsx

import React, { useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  TextInput,
  RefreshControl,
} from "react-native";
import { useRouter } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Feather from "@expo/vector-icons/Feather";
import {
  adminListAttendance,
  adminDeleteAttendance,
  adminGetDailySummary,
} from "@/lib/api/attendance.api";
import { colors } from "@/components/ui/theme";
import { Spinner } from "@/components/ui/Spinner";
import { PageHeader } from "@/components/ui/PageHeader";
import type {
  AttendanceRecord,
  AttendanceStatus,
  DailySummaryItem,
} from "@/types/attendance";

const STATUS_COLOR: Record<AttendanceStatus, string> = {
  present: colors.green[600],
  absent: colors.red[500],
  late: colors.orange[500],
  half_day: colors.amber[500],
  on_leave: colors.bytecode[500],
  holiday: colors.bytecode[700],
  weekend: colors.gray[400],
};
const STATUS_LABEL: Record<AttendanceStatus, string> = {
  present: "Present",
  absent: "Absent",
  late: "Late",
  half_day: "Half Day",
  on_leave: "On Leave",
  holiday: "Holiday",
  weekend: "Weekend",
};
const ALL_STATUSES = Object.keys(STATUS_LABEL) as AttendanceStatus[];

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function fmt(iso: string | null) {
  if (!iso) return "--:--";
  return new Date(iso).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}
function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-BD", {
    day: "numeric",
    month: "short",
  });
}

function DailySummaryBar({ items }: { items: DailySummaryItem[] }) {
  const total = items.reduce((s, i) => s + i._count.id, 0) || 1;
  const order: AttendanceStatus[] = [
    "present",
    "late",
    "absent",
    "on_leave",
    "half_day",
  ];
  return (
    <View style={s.summaryBar}>
      {order.map((status) => {
        const item = items.find((i) => i.status === status);
        if (!item) return null;
        const pct = Math.round((item._count.id / total) * 100);
        return (
          <View key={status} style={s.summaryCell}>
            <Text style={[s.summaryVal, { color: STATUS_COLOR[status] }]}>
              {item._count.id}
            </Text>
            <Text style={s.summaryLbl}>{STATUS_LABEL[status]}</Text>
          </View>
        );
      })}
    </View>
  );
}

function RecordRow({
  item,
  onPress,
  onDelete,
}: {
  item: AttendanceRecord;
  onPress: () => void;
  onDelete: () => void;
}) {
  const color = STATUS_COLOR[item.status];
  const name = item.employee
    ? `${item.employee.user.firstName ?? ""} ${item.employee.user.lastName ?? ""}`.trim() ||
      item.employee.employeeCode
    : `#${item.employeeId}`;
  return (
    <TouchableOpacity style={s.row} onPress={onPress} activeOpacity={0.7}>
      <View style={[s.rowAccent, { backgroundColor: color }]} />
      <View style={s.rowBody}>
        <View style={s.rowTop}>
          <Text style={s.rowName} numberOfLines={1}>
            {name}
          </Text>
          <View style={[s.badge, { backgroundColor: color + "18" }]}>
            <Text style={[s.badgeText, { color }]}>
              {STATUS_LABEL[item.status]}
            </Text>
          </View>
        </View>
        <View style={s.rowMeta}>
          <Text style={s.rowDate}>{fmtDate(item.attendanceDate)}</Text>
          {item.employee?.department && (
            <Text style={s.rowDept}>{item.employee.department}</Text>
          )}
          {item.isManual && (
            <View style={s.manualBadge}>
              <Text style={s.manualText}>Manual</Text>
            </View>
          )}
        </View>
        <View style={s.rowTimes}>
          <Feather name="log-in" size={11} color={colors.green[500]} />
          <Text style={s.rowTime}>{fmt(item.checkInTime)}</Text>
          <Feather
            name="log-out"
            size={11}
            color={colors.orange[400]}
            style={{ marginLeft: 8 }}
          />
          <Text style={s.rowTime}>{fmt(item.checkOutTime)}</Text>
          {item.workHours && (
            <Text style={s.rowHours}>{Number(item.workHours).toFixed(1)}h</Text>
          )}
        </View>
      </View>
      <TouchableOpacity onPress={onDelete} hitSlop={8} style={s.deleteBtn}>
        <Feather name="trash-2" size={15} color={colors.red[400]} />
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

export default function AdminAttendanceScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<AttendanceStatus | "">("");
  const [search, setSearch] = useState("");
  const [selectedDate, setSelectedDate] = useState(todayStr());

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ["admin-attendance", page, statusFilter, selectedDate],
    queryFn: () =>
      adminListAttendance({
        page,
        limit: 20,
        status: statusFilter || undefined,
        fromDate: selectedDate,
        toDate: selectedDate,
      }),
  });

  const { data: dailySummary } = useQuery({
    queryKey: ["admin-attendance-daily", selectedDate],
    queryFn: () => adminGetDailySummary(selectedDate),
  });

  const deleteMut = useMutation({
    mutationFn: adminDeleteAttendance,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-attendance"] }),
    onError: () => Alert.alert("Error", "Failed to delete record"),
  });

  function confirmDelete(id: number) {
    Alert.alert("Delete Record", "Remove this attendance record?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => deleteMut.mutate(id),
      },
    ]);
  }

  function shiftDate(delta: number) {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + delta);
    const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    setSelectedDate(iso);
    setPage(1);
  }

  const records = data?.data ?? [];
  const meta = data?.meta;

  const filtered = search
    ? records.filter((r) => {
        const name =
          `${r.employee?.user.firstName ?? ""} ${r.employee?.user.lastName ?? ""}`.toLowerCase();
        const code = r.employee?.employeeCode?.toLowerCase() ?? "";
        const q = search.toLowerCase();
        return name.includes(q) || code.includes(q);
      })
    : records;

  const displayDate = new Date(selectedDate).toLocaleDateString("en-BD", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      <PageHeader
        title="Attendance"
        variant="bytecode"
        rightActions={[
          {
            icon: "plus",
            onPress: () => router.push("/(app)/admin/attendance/mark"),
          },
        ]}
      />

      {/* Date navigator */}
      <View style={s.dateNav}>
        <TouchableOpacity
          onPress={() => shiftDate(-1)}
          hitSlop={8}
          style={s.navBtn}
        >
          <Feather name="chevron-left" size={20} color={colors.bytecode[600]} />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => {
            setSelectedDate(todayStr());
            setPage(1);
          }}
        >
          <Text style={s.dateLabel}>{displayDate}</Text>
          {selectedDate !== todayStr() && (
            <Text style={s.todayHint}>Tap for today</Text>
          )}
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => shiftDate(1)}
          hitSlop={8}
          style={s.navBtn}
          disabled={selectedDate >= todayStr()}
        >
          <Feather
            name="chevron-right"
            size={20}
            color={
              selectedDate >= todayStr()
                ? colors.gray[300]
                : colors.bytecode[600]
            }
          />
        </TouchableOpacity>
      </View>

      {/* Daily summary */}
      {dailySummary && dailySummary.length > 0 && (
        <DailySummaryBar items={dailySummary} />
      )}

      {/* Status chips */}
      <View style={s.chipsWrap}>
        <FlatList
          horizontal
          data={[
            { value: "", label: "All" },
            ...ALL_STATUSES.map((s) => ({ value: s, label: STATUS_LABEL[s] })),
          ]}
          keyExtractor={(i) => i.value}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.chipsContent}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[s.chip, statusFilter === item.value && s.chipActive]}
              onPress={() => {
                setStatusFilter(item.value as any);
                setPage(1);
              }}
            >
              <Text
                style={[
                  s.chipText,
                  statusFilter === item.value && s.chipTextActive,
                ]}
              >
                {item.label}
              </Text>
            </TouchableOpacity>
          )}
        />
      </View>

      {/* Search */}
      <View style={s.searchRow}>
        <Feather name="search" size={14} color={colors.gray[400]} />
        <TextInput
          style={s.searchInput}
          placeholder="Search employee…"
          placeholderTextColor={colors.gray[300]}
          value={search}
          onChangeText={setSearch}
        />
        {search ? (
          <TouchableOpacity onPress={() => setSearch("")} hitSlop={8}>
            <Feather name="x" size={14} color={colors.gray[400]} />
          </TouchableOpacity>
        ) : null}
      </View>

      {isLoading ? (
        <View style={s.center}>
          <Spinner />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(i) => String(i.id)}
          contentContainerStyle={s.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              tintColor={colors.bytecode[600]}
            />
          }
          ListEmptyComponent={
            <View style={s.empty}>
              <Feather name="calendar" size={36} color={colors.gray[300]} />
              <Text style={s.emptyText}>No records for this date</Text>
            </View>
          }
          renderItem={({ item }) => (
            <RecordRow
              item={item}
              onPress={() => router.push(`/(app)/admin/attendance/${item.id}`)}
              onDelete={() => confirmDelete(item.id)}
            />
          )}
          ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
          ListFooterComponent={
            meta && meta.totalPages > 1 ? (
              <View style={s.pagination}>
                <TouchableOpacity
                  style={[s.pageBtn, page === 1 && s.pageBtnOff]}
                  onPress={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  <Feather
                    name="chevron-left"
                    size={18}
                    color={page === 1 ? colors.gray[300] : colors.bytecode[600]}
                  />
                </TouchableOpacity>
                <Text style={s.pageLabel}>
                  {page} / {meta.totalPages}
                </Text>
                <TouchableOpacity
                  style={[s.pageBtn, page === meta.totalPages && s.pageBtnOff]}
                  onPress={() =>
                    setPage((p) => Math.min(meta.totalPages, p + 1))
                  }
                  disabled={page === meta.totalPages}
                >
                  <Feather
                    name="chevron-right"
                    size={18}
                    color={
                      page === meta.totalPages
                        ? colors.gray[300]
                        : colors.bytecode[600]
                    }
                  />
                </TouchableOpacity>
              </View>
            ) : null
          }
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.gray[50] },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },

  dateNav: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[100],
  },
  navBtn: { padding: 4 },
  dateLabel: {
    fontSize: 15,
    fontWeight: "800",
    color: colors.gray[900],
    textAlign: "center",
  },
  todayHint: {
    fontSize: 10,
    color: colors.bytecode[400],
    textAlign: "center",
    marginTop: 1,
  },

  summaryBar: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[100],
    paddingVertical: 10,
  },
  summaryCell: { flex: 1, alignItems: "center", gap: 2 },
  summaryVal: { fontSize: 18, fontWeight: "800" },
  summaryLbl: { fontSize: 10, color: colors.gray[400], fontWeight: "500" },

  chipsWrap: {
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[100],
  },
  chipsContent: { paddingHorizontal: 16, paddingVertical: 8, gap: 8 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: colors.gray[200],
    backgroundColor: "#fff",
  },
  chipActive: {
    borderColor: colors.bytecode[500],
    backgroundColor: colors.bytecode[50],
  },
  chipText: { fontSize: 12, fontWeight: "600", color: colors.gray[500] },
  chipTextActive: { color: colors.bytecode[700] },

  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginHorizontal: 16,
    marginVertical: 10,
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.gray[200],
    paddingHorizontal: 12,
    height: 40,
  },
  searchInput: { flex: 1, fontSize: 14, color: colors.gray[900] },

  list: { padding: 16, paddingBottom: 40 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.gray[100],
    overflow: "hidden",
  },
  rowAccent: { width: 4, alignSelf: "stretch" },
  rowBody: { flex: 1, padding: 12, gap: 4 },
  rowTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  rowName: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.gray[900],
    flex: 1,
    marginRight: 8,
  },
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 20 },
  badgeText: { fontSize: 11, fontWeight: "700" },
  rowMeta: { flexDirection: "row", alignItems: "center", gap: 8 },
  rowDate: { fontSize: 12, color: colors.gray[400] },
  rowDept: { fontSize: 12, color: colors.gray[400] },
  manualBadge: {
    backgroundColor: colors.amber[50],
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
  },
  manualText: { fontSize: 10, fontWeight: "700", color: colors.amber[700] },
  rowTimes: { flexDirection: "row", alignItems: "center", gap: 4 },
  rowTime: { fontSize: 12, color: colors.gray[600], fontWeight: "500" },
  rowHours: {
    marginLeft: 8,
    fontSize: 12,
    fontWeight: "700",
    color: colors.bytecode[700],
  },
  deleteBtn: { padding: 14 },

  empty: { alignItems: "center", paddingTop: 60, gap: 10 },
  emptyText: { fontSize: 14, color: colors.gray[400] },

  pagination: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
    paddingVertical: 12,
  },
  pageBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: colors.bytecode[100],
    alignItems: "center",
    justifyContent: "center",
  },
  pageBtnOff: { opacity: 0.4 },
  pageLabel: { fontSize: 13, fontWeight: "600", color: colors.gray[600] },
});
