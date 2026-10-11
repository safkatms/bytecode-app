// app/(app)/sick-leave/index.tsx

import React, { useState } from "react";
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, RefreshControl, Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Feather from "@expo/vector-icons/Feather";
import {
  getMySickLeaveBalance, getMySickLeaveRequests, cancelSickLeave,
} from "@/lib/api/sick-leave.api";
import { getApiErrorMessage } from "@/lib/api-error";
import { colors } from "@/components/ui/theme";
import { Spinner } from "@/components/ui/Spinner";
import { PageHeader } from "@/components/ui/PageHeader";
import { YearNav } from "@/components/ui/YearNav";
import { SickLeaveStatusBadge, formatRange } from "@/components/ui/SickLeaveStatusBadge";
import type { SickLeaveRequest, SickLeaveStatus } from "@/types/sick-leave";

const FILTERS: (SickLeaveStatus | undefined)[] = [undefined, "pending", "approved", "rejected", "cancelled"];

export default function MySickLeaveScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const [status, setStatus] = useState<SickLeaveStatus | undefined>();
  const [page, setPage] = useState(1);
  const [year, setYear] = useState(new Date().getFullYear());

  const balanceQ = useQuery({
    queryKey: ["sick-leave-balance", year],
    queryFn: () => getMySickLeaveBalance(year),
  });

  const listQ = useQuery({
    queryKey: ["sick-leave-mine", status, page, year],
    queryFn: () => getMySickLeaveRequests({ status, page, year, limit: 20 }),
  });

  const cancelMut = useMutation({
    mutationFn: cancelSickLeave,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sick-leave-mine"] });
      qc.invalidateQueries({ queryKey: ["sick-leave-balance"] });
    },
    onError: (e) => Alert.alert("Error", getApiErrorMessage(e, "Failed to cancel request")),
  });

  function confirmCancel(r: SickLeaveRequest) {
    Alert.alert("Cancel Request", "Cancel this sick leave request?", [
      { text: "No", style: "cancel" },
      { text: "Yes, cancel", style: "destructive", onPress: () => cancelMut.mutate(r.id) },
    ]);
  }

  const b = balanceQ.data;
  const meta = listQ.data?.meta;

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      <PageHeader
        title="Sick Leave"
        variant="bytecode"
        rightActions={[{ icon: "plus", onPress: () => router.push("/(app)/sick-leave/apply") }]}
      />

      <YearNav year={year} onChange={(y) => { setYear(y); setPage(1); }} />

      <View style={s.balanceCard}>
        {[
          { label: "Total", value: b?.totalDays },
          { label: "Used", value: b?.usedDays },
          { label: "Remaining", value: b?.remainingDays },
        ].map((x) => (
          <View key={x.label} style={s.balanceItem}>
            <Text style={s.balanceValue}>{x.value ?? "—"}</Text>
            <Text style={s.balanceLabel}>{x.label}</Text>
          </View>
        ))}
      </View>
      {b && b.totalDays === null && (
        <Text style={s.noPolicy}>No sick leave policy set for {b.year}.</Text>
      )}

      <View style={s.filters}>
        {FILTERS.map((f) => {
          const active = f === status;
          return (
            <TouchableOpacity
              key={f ?? "all"}
              style={[s.chip, active && s.chipActive]}
              onPress={() => { setStatus(f); setPage(1); }}
            >
              <Text style={[s.chipText, active && s.chipTextActive]}>
                {f ? f[0].toUpperCase() + f.slice(1) : "All"}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {listQ.isLoading ? (
        <View style={s.center}><Spinner /></View>
      ) : (
        <FlatList
          data={listQ.data?.data ?? []}
          keyExtractor={(i) => String(i.id)}
          contentContainerStyle={s.list}
          refreshControl={
            <RefreshControl
              refreshing={listQ.isRefetching}
              onRefresh={() => { listQ.refetch(); balanceQ.refetch(); }}
              tintColor={colors.bytecode[600]}
            />
          }
          ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
          ListEmptyComponent={
            <View style={s.empty}>
              <Feather name="thermometer" size={36} color={colors.gray[300]} />
              <Text style={s.emptyText}>No sick leave requests</Text>
            </View>
          }
          renderItem={({ item }) => (
            <View style={s.row}>
              <View style={s.rowTop}>
                <Text style={s.rowDate}>{formatRange(item.startDate, item.endDate)}</Text>
                <SickLeaveStatusBadge status={item.status} />
              </View>
              <Text style={s.rowDays}>{item.totalDays} working day{item.totalDays > 1 ? "s" : ""}</Text>
              {item.reason ? <Text style={s.rowReason}>{item.reason}</Text> : null}
              {item.reviewNote ? <Text style={s.rowNote}>Note: {item.reviewNote}</Text> : null}
              {item.status === "pending" && (
                <TouchableOpacity style={s.cancelBtn} onPress={() => confirmCancel(item)}>
                  <Feather name="x-circle" size={13} color={colors.red[500]} />
                  <Text style={s.cancelText}>Cancel</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
          ListFooterComponent={
            meta && meta.totalPages > 1 ? (
              <View style={s.pagination}>
                <TouchableOpacity disabled={page === 1} onPress={() => setPage((p) => p - 1)}>
                  <Feather name="chevron-left" size={20} color={page === 1 ? colors.gray[300] : colors.bytecode[600]} />
                </TouchableOpacity>
                <Text style={s.pageLabel}>{page} / {meta.totalPages}</Text>
                <TouchableOpacity disabled={page === meta.totalPages} onPress={() => setPage((p) => p + 1)}>
                  <Feather name="chevron-right" size={20} color={page === meta.totalPages ? colors.gray[300] : colors.bytecode[600]} />
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
  balanceCard: {
    flexDirection: "row", margin: 16, marginBottom: 8, backgroundColor: "#fff",
    borderRadius: 14, borderWidth: 1, borderColor: colors.gray[100], paddingVertical: 14,
  },
  balanceItem: { flex: 1, alignItems: "center", gap: 2 },
  balanceValue: { fontSize: 22, fontWeight: "800", color: colors.bytecode[700] },
  balanceLabel: { fontSize: 11, color: colors.gray[500], fontWeight: "600" },
  noPolicy: { fontSize: 12, color: colors.amber[700], marginHorizontal: 16 },
  filters: { flexDirection: "row", flexWrap: "wrap", gap: 6, paddingHorizontal: 16, marginVertical: 8 },
  chip: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20,
    backgroundColor: "#fff", borderWidth: 1, borderColor: colors.gray[200],
  },
  chipActive: { backgroundColor: colors.bytecode[600], borderColor: colors.bytecode[600] },
  chipText: { fontSize: 12, fontWeight: "600", color: colors.gray[600] },
  chipTextActive: { color: "#fff" },
  list: { paddingHorizontal: 16, paddingBottom: 40 },
  row: {
    backgroundColor: "#fff", borderRadius: 14, padding: 14, gap: 4,
    borderWidth: 1, borderColor: colors.gray[100],
  },
  rowTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  rowDate: { fontSize: 14, fontWeight: "800", color: colors.gray[900], flex: 1 },
  rowDays: { fontSize: 12, color: colors.gray[500] },
  rowReason: { fontSize: 13, color: colors.gray[700] },
  rowNote: { fontSize: 12, color: colors.gray[500], fontStyle: "italic" },
  cancelBtn: { flexDirection: "row", alignItems: "center", gap: 4, alignSelf: "flex-end", marginTop: 4 },
  cancelText: { fontSize: 12, fontWeight: "700", color: colors.red[500] },
  empty: { alignItems: "center", paddingTop: 60, gap: 10 },
  emptyText: { fontSize: 14, color: colors.gray[400] },
  pagination: { flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 16, paddingVertical: 12 },
  pageLabel: { fontSize: 13, fontWeight: "600", color: colors.gray[600] },
});
