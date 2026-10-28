// app/(app)/admin/casual-leave/index.tsx

import React, { useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  Alert,
  TextInput,
} from "react-native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import Feather from "@expo/vector-icons/Feather";
import {
  adminListCasualLeaveRequests,
  adminReviewCasualLeave,
  adminGetCasualLeavePolicy,
  adminSetCasualLeavePolicy,
  adminBackfillEarnedLeave,
} from "@/lib/api/casual-leave.api";
import { getApiErrorMessage } from "@/lib/api-error";
import { colors } from "@/components/ui/theme";
import { Spinner } from "@/components/ui/Spinner";
import { PageHeader } from "@/components/ui/PageHeader";
import { YearNav } from "@/components/ui/YearNav";
import {
  CasualLeaveStatusBadge,
  formatRange,
} from "@/components/ui/CasualLeaveStatusBadge";
import type {
  CasualLeaveRequest,
  CasualLeaveStatus,
} from "@/types/casual-leave";

const FILTERS: (CasualLeaveStatus | undefined)[] = [
  "pending",
  "approved",
  "rejected",
  "cancelled",
  undefined,
];

function employeeName(r: CasualLeaveRequest) {
  const u = r.employee?.user;
  const name = [u?.firstName, u?.lastName].filter(Boolean).join(" ");
  return (
    name || u?.email || r.employee?.employeeCode || `Employee #${r.employeeId}`
  );
}

// ─── Policy Card ─────────────────────────────────────────────

function PolicyCard({ year }: { year: number }) {
  const qc = useQueryClient();
  const [days, setDays] = useState("");
  const [carry, setCarry] = useState("");

  const policyQ = useQuery({
    queryKey: ["casual-leave-policy", year],
    queryFn: () => adminGetCasualLeavePolicy(year),
    retry: false,
  });

  React.useEffect(() => {
    setDays(policyQ.data ? String(policyQ.data.totalDays) : "");
    setCarry(policyQ.data ? String(policyQ.data.maxCarryForward) : "");
  }, [policyQ.data, year]);

  const saveMut = useMutation({
    mutationFn: adminSetCasualLeavePolicy,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["casual-leave-policy", year] });
      Alert.alert("Saved", `Casual leave policy for ${year} saved.`);
    },
    onError: (e) =>
      Alert.alert("Error", getApiErrorMessage(e, "Failed to save policy")),
  });

  function save() {
    const n = parseInt(days, 10);
    const c = parseInt(carry, 10);
    if (!n || n <= 0)
      return Alert.alert("Invalid", "Enter a valid number of days");
    if (isNaN(c) || c < 0)
      return Alert.alert("Invalid", "Enter a valid carry-forward value");
    saveMut.mutate({ year, totalDays: n, maxCarryForward: c });
  }

  return (
    <View style={s.policyCard}>
      <View style={{ flex: 1 }}>
        <Text style={s.policyTitle}>{year} policy</Text>
        <Text style={s.policySub}>
          {policyQ.data
            ? `${policyQ.data.totalDays} days · max carry ${policyQ.data.maxCarryForward}`
            : policyQ.isLoading
              ? "Loading…"
              : "Not set yet"}
        </Text>
      </View>
      <TextInput
        style={s.policyInput}
        value={days}
        onChangeText={setDays}
        keyboardType="number-pad"
        placeholder="12"
        placeholderTextColor={colors.gray[300]}
      />
      <TextInput
        style={s.policyInput}
        value={carry}
        onChangeText={setCarry}
        keyboardType="number-pad"
        placeholder="5"
        placeholderTextColor={colors.gray[300]}
      />
      <TouchableOpacity
        style={s.policyBtn}
        onPress={save}
        disabled={saveMut.isPending}
      >
        <Feather name="check" size={16} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────

export default function AdminCasualLeaveScreen() {
  const router = useRouter();
  const qc = useQueryClient();
  const [status, setStatus] = useState<CasualLeaveStatus | undefined>(
    "pending",
  );
  const [page, setPage] = useState(1);
  const [year, setYear] = useState(new Date().getFullYear());

  const listQ = useQuery({
    queryKey: ["admin-casual-leave", status, page, year],
    queryFn: () =>
      adminListCasualLeaveRequests({ status, page, year, limit: 20 }),
  });

  const reviewMut = useMutation({
    mutationFn: ({
      id,
      action,
    }: {
      id: number;
      action: "approved" | "rejected";
    }) => adminReviewCasualLeave(id, { action }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-casual-leave"] }),
    onError: (e) =>
      Alert.alert("Error", getApiErrorMessage(e, "Failed to review request")),
  });

  const backfillMut = useMutation({
    mutationFn: adminBackfillEarnedLeave,
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: ["admin-casual-leave-balances"] });
      Alert.alert(
        "Backfill complete",
        `Scanned ${r.scanned} attendance records. ${r.earnedDaysOnRecord} earned day(s) on record for ${r.year}.`,
      );
    },
    onError: (e) =>
      Alert.alert("Error", getApiErrorMessage(e, "Failed to backfill earned leave")),
  });

  function confirmBackfill() {
    Alert.alert(
      "Backfill Earned Leave",
      `Grant earned days for weekend / holiday work found in ${year} attendance? Safe to repeat.`,
      [
        { text: "Cancel", style: "cancel" },
        { text: "Backfill", onPress: () => backfillMut.mutate(year) },
      ],
    );
  }

  function confirmReview(
    r: CasualLeaveRequest,
    action: "approved" | "rejected",
  ) {
    const verb = action === "approved" ? "Approve" : "Reject";
    Alert.alert(
      `${verb} Request`,
      `${verb} ${r.totalDays} day(s) for ${employeeName(r)}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: verb,
          style: action === "rejected" ? "destructive" : "default",
          onPress: () => reviewMut.mutate({ id: r.id, action }),
        },
      ],
    );
  }

  const meta = listQ.data?.meta;

  return (
    <View style={s.root}>
      <PageHeader
        title="Casual Leave"
        variant="bytecode"
        insetTop
        rightActions={[
          { icon: "refresh-cw", onPress: confirmBackfill },
          {
            icon: "users",
            onPress: () => router.push("/(app)/admin/casual-leave/balances"),
          },
          {
            icon: "plus",
            onPress: () => router.push("/(app)/admin/casual-leave/mark"),
          },
        ]}
      />
      <YearNav
        year={year}
        onChange={(y) => {
          setYear(y);
          setPage(1);
        }}
      />
      <PolicyCard year={year} />

      <View style={s.filters}>
        {FILTERS.map((f) => {
          const active = f === status;
          return (
            <TouchableOpacity
              key={f ?? "all"}
              style={[s.chip, active && s.chipActive]}
              onPress={() => {
                setStatus(f);
                setPage(1);
              }}
            >
              <Text style={[s.chipText, active && s.chipTextActive]}>
                {f ? f[0].toUpperCase() + f.slice(1) : "All"}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {listQ.isLoading ? (
        <View style={s.center}>
          <Spinner />
        </View>
      ) : (
        <FlatList
          data={listQ.data?.data ?? []}
          keyExtractor={(i) => String(i.id)}
          contentContainerStyle={s.list}
          refreshControl={
            <RefreshControl
              refreshing={listQ.isRefetching}
              onRefresh={listQ.refetch}
              tintColor={colors.bytecode[600]}
            />
          }
          ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
          ListEmptyComponent={
            <View style={s.empty}>
              <Feather name="umbrella" size={36} color={colors.gray[300]} />
              <Text style={s.emptyText}>No requests</Text>
            </View>
          }
          renderItem={({ item }) => (
            <View style={s.row}>
              <View style={s.rowTop}>
                <Text style={s.rowName} numberOfLines={1}>
                  {employeeName(item)}
                </Text>
                <CasualLeaveStatusBadge status={item.status} />
              </View>
              <Text style={s.rowDate}>
                {formatRange(item.startDate, item.endDate)} · {item.totalDays}{" "}
                day{item.totalDays > 1 ? "s" : ""}
              </Text>
              {item.reason ? (
                <Text style={s.rowReason}>{item.reason}</Text>
              ) : null}
              {item.reviewNote ? (
                <Text style={s.rowNote}>Note: {item.reviewNote}</Text>
              ) : null}
              {item.status === "pending" && (
                <View style={s.actions}>
                  <TouchableOpacity
                    style={[s.actionBtn, { backgroundColor: colors.red[50] }]}
                    onPress={() => confirmReview(item, "rejected")}
                    disabled={reviewMut.isPending}
                  >
                    <Feather name="x" size={14} color={colors.red[500]} />
                    <Text style={[s.actionText, { color: colors.red[500] }]}>
                      Reject
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[s.actionBtn, { backgroundColor: colors.green[50] }]}
                    onPress={() => confirmReview(item, "approved")}
                    disabled={reviewMut.isPending}
                  >
                    <Feather name="check" size={14} color={colors.green[700]} />
                    <Text style={[s.actionText, { color: colors.green[700] }]}>
                      Approve
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}
          ListFooterComponent={
            meta && meta.totalPages > 1 ? (
              <View style={s.pagination}>
                <TouchableOpacity
                  disabled={page === 1}
                  onPress={() => setPage((p) => p - 1)}
                >
                  <Feather
                    name="chevron-left"
                    size={20}
                    color={page === 1 ? colors.gray[300] : colors.bytecode[600]}
                  />
                </TouchableOpacity>
                <Text style={s.pageLabel}>
                  {page} / {meta.totalPages}
                </Text>
                <TouchableOpacity
                  disabled={page === meta.totalPages}
                  onPress={() => setPage((p) => p + 1)}
                >
                  <Feather
                    name="chevron-right"
                    size={20}
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
  policyCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    margin: 16,
    marginBottom: 8,
    backgroundColor: "#fff",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.gray[100],
    padding: 14,
  },
  policyTitle: { fontSize: 14, fontWeight: "800", color: colors.gray[900] },
  policySub: { fontSize: 11, color: colors.gray[500] },
  policyInput: {
    width: 52,
    height: 38,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.gray[200],
    textAlign: "center",
    fontSize: 14,
    fontWeight: "700",
    color: colors.gray[900],
  },
  policyBtn: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: colors.bytecode[600],
    alignItems: "center",
    justifyContent: "center",
  },
  filters: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    paddingHorizontal: 16,
    marginVertical: 8,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: colors.gray[200],
  },
  chipActive: {
    backgroundColor: colors.bytecode[600],
    borderColor: colors.bytecode[600],
  },
  chipText: { fontSize: 12, fontWeight: "600", color: colors.gray[600] },
  chipTextActive: { color: "#fff" },
  list: { paddingHorizontal: 16, paddingBottom: 40 },
  row: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 14,
    gap: 4,
    borderWidth: 1,
    borderColor: colors.gray[100],
  },
  rowTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
  },
  rowName: {
    fontSize: 14,
    fontWeight: "800",
    color: colors.gray[900],
    flex: 1,
  },
  rowDate: { fontSize: 12, color: colors.gray[500] },
  rowReason: { fontSize: 13, color: colors.gray[700] },
  rowNote: { fontSize: 12, color: colors.gray[500], fontStyle: "italic" },
  actions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 8,
    marginTop: 6,
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
  },
  actionText: { fontSize: 12, fontWeight: "700" },
  empty: { alignItems: "center", paddingTop: 60, gap: 10 },
  emptyText: { fontSize: 14, color: colors.gray[400] },
  pagination: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 16,
    paddingVertical: 12,
  },
  pageLabel: { fontSize: 13, fontWeight: "600", color: colors.gray[600] },
});
