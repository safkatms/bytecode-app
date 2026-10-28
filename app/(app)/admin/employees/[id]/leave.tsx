// app/(app)/admin/employees/[id]/leave.tsx

import React, { useState } from "react";
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, RefreshControl,
  Modal, TextInput, Alert,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Feather from "@expo/vector-icons/Feather";

import {
  adminListSickLeaveRequests,
} from "@/lib/api/sick-leave.api";
import {
  adminListCasualLeaveRequests,
} from "@/lib/api/casual-leave.api";
import {
  adminGetSickLeaveBalance, adminGetCasualLeaveBalance,
  adminAdjustSickLeaveBalance, adminAdjustCasualLeaveBalance,
} from "@/lib/api/leave-balance.api";
import { colors } from "@/components/ui/theme";
import { Spinner } from "@/components/ui/Spinner";
import { PageHeader } from "@/components/ui/PageHeader";
import { YearNav } from "@/components/ui/YearNav";
import { SickLeaveStatusBadge, formatRange as fmtSick } from "@/components/ui/SickLeaveStatusBadge";
import { CasualLeaveStatusBadge, formatRange as fmtCasual } from "@/components/ui/CasualLeaveStatusBadge";
import type { SickLeaveRequest, SickLeaveStatus } from "@/types/sick-leave";
import type { CasualLeaveRequest, CasualLeaveStatus } from "@/types/casual-leave";

type Tab = "sick" | "casual";

// ─── Sick Tab ─────────────────────────────────────────────────

function SickTab({ employeeId, year, onMark }: { employeeId: number; year: number; onMark: () => void }) {
  const [status, setStatus] = useState<SickLeaveStatus | undefined>();
  const [page, setPage] = useState(1);

  const balanceQ = useQuery({
    queryKey: ["admin-emp-sick-balance", employeeId, year],
    queryFn: () => adminGetSickLeaveBalance(employeeId, year),
    retry: false,
  });

  const listQ = useQuery({
    queryKey: ["admin-emp-sick-requests", employeeId, status, page, year],
    queryFn: () => adminListSickLeaveRequests({ employeeId, status, page, year, limit: 20 }),
  });

  const b = balanceQ.data;
  const meta = listQ.data?.meta;

  const queryClient = useQueryClient();
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [usedInput, setUsedInput] = useState("");

  const adjustM = useMutation({
    mutationFn: (usedDays: number) => adminAdjustSickLeaveBalance(employeeId, { year, usedDays }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-emp-sick-balance", employeeId] });
      setAdjustOpen(false);
    },
    onError: (e: any) => Alert.alert("Error", e?.response?.data?.message ?? "Failed to update balance"),
  });

  function openAdjust() {
    setUsedInput(b ? String(b.usedDays) : "");
    setAdjustOpen(true);
  }

  function submitAdjust() {
    const n = Number(usedInput);
    if (usedInput.trim() === "" || !Number.isInteger(n) || n < 0) {
      Alert.alert("Invalid value", "Used days must be a whole number, 0 or more.");
      return;
    }
    adjustM.mutate(n);
  }

  return (
    <>
    <Modal visible={adjustOpen} transparent animationType="fade" onRequestClose={() => setAdjustOpen(false)}>
      <View style={s.modalBackdrop}>
        <View style={s.modalCard}>
          <Text style={s.modalTitle}>Adjust Sick Leave — {year}</Text>
          <Text style={s.modalHint}>Sets the already-used days (overwrites current value).</Text>

          <Text style={s.inputLabel}>Used days</Text>
          <TextInput
            style={s.input}
            value={usedInput}
            onChangeText={setUsedInput}
            keyboardType="number-pad"
            placeholder="e.g. 3"
          />

          <View style={s.modalActions}>
            <TouchableOpacity style={s.cancelBtn} onPress={() => setAdjustOpen(false)} disabled={adjustM.isPending}>
              <Text style={s.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.saveBtn} onPress={submitAdjust} disabled={adjustM.isPending} activeOpacity={0.8}>
              <Text style={s.saveBtnText}>{adjustM.isPending ? "Saving…" : "Save"}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
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
      ListHeaderComponent={
        <>
          <View style={s.balanceCard}>
            {[
              { label: "Total", value: b?.totalDays },
              { label: "Used", value: b?.usedDays },
              { label: "Remaining", value: b?.remainingDays },
            ].map((x) => (
              <View key={x.label} style={s.balanceItem}>
                <Text style={[
                  s.balanceValue,
                  x.label === "Remaining" && { color: (x.value ?? 0) > 0 ? colors.green[600] : colors.red[500] },
                ]}>
                  {x.value ?? "—"}
                </Text>
                <Text style={s.balanceLabel}>{x.label}</Text>
              </View>
            ))}
          </View>
          {b === undefined && !balanceQ.isLoading && (
            <Text style={s.noPolicy}>No sick leave policy set for {year}.</Text>
          )}

          <TouchableOpacity style={s.markBtn} onPress={onMark} activeOpacity={0.8}>
            <Feather name="plus" size={15} color="#fff" />
            <Text style={s.markBtnText}>Mark Sick Leave</Text>
          </TouchableOpacity>

          <TouchableOpacity style={s.adjustBtn} onPress={openAdjust} activeOpacity={0.8}>
            <Feather name="edit-2" size={14} color={colors.bytecode[600]} />
            <Text style={s.adjustBtnText}>Adjust Balance</Text>
          </TouchableOpacity>

          <View style={s.filters}>
            {([undefined, "pending", "approved", "rejected", "cancelled"] as (SickLeaveStatus | undefined)[]).map((f) => {
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
          {listQ.isLoading && <View style={s.center}><Spinner /></View>}
        </>
      }
      ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
      ListEmptyComponent={
        listQ.isLoading ? null : (
          <View style={s.empty}>
            <Feather name="thermometer" size={32} color={colors.gray[300]} />
            <Text style={s.emptyText}>No sick leave requests</Text>
          </View>
        )
      }
      renderItem={({ item }: { item: SickLeaveRequest }) => (
        <View style={s.row}>
          <View style={s.rowTop}>
            <Text style={s.rowDate}>{fmtSick(item.startDate, item.endDate)}</Text>
            <SickLeaveStatusBadge status={item.status} />
          </View>
          <Text style={s.rowDays}>{item.totalDays} working day{item.totalDays > 1 ? "s" : ""}</Text>
          {item.reason ? <Text style={s.rowReason}>{item.reason}</Text> : null}
          {item.reviewNote ? <Text style={s.rowNote}>Note: {item.reviewNote}</Text> : null}
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
    </>
  );
}

// ─── Casual Tab ───────────────────────────────────────────────

function CasualTab({ employeeId, year, onMark }: { employeeId: number; year: number; onMark: () => void }) {
  const [status, setStatus] = useState<CasualLeaveStatus | undefined>();
  const [page, setPage] = useState(1);

  const balanceQ = useQuery({
    queryKey: ["admin-emp-casual-balance", employeeId, year],
    queryFn: () => adminGetCasualLeaveBalance(employeeId, year),
    retry: false,
  });

  const listQ = useQuery({
    queryKey: ["admin-emp-casual-requests", employeeId, status, page, year],
    queryFn: () => adminListCasualLeaveRequests({ employeeId, status, page, year, limit: 20 }),
  });

  const b = balanceQ.data;
  const meta = listQ.data?.meta;

  const queryClient = useQueryClient();
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [usedInput, setUsedInput] = useState("");
  const [carryInput, setCarryInput] = useState("");

  const adjustM = useMutation({
    mutationFn: (payload: { usedDays?: number; carryForwardDays?: number }) =>
      adminAdjustCasualLeaveBalance(employeeId, { year, ...payload }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-emp-casual-balance", employeeId] });
      setAdjustOpen(false);
    },
    onError: (e: any) => Alert.alert("Error", e?.response?.data?.message ?? "Failed to update balance"),
  });

  function openAdjust() {
    setUsedInput(b ? String(b.usedDays) : "");
    setCarryInput(b ? String(b.carryForwardDays) : "");
    setAdjustOpen(true);
  }

  function submitAdjust() {
    const payload: { usedDays?: number; carryForwardDays?: number } = {};
    for (const [key, raw] of [["usedDays", usedInput], ["carryForwardDays", carryInput]] as const) {
      if (raw.trim() === "") continue;
      const n = Number(raw);
      if (!Number.isInteger(n) || n < 0) {
        Alert.alert("Invalid value", "Days must be a whole number, 0 or more.");
        return;
      }
      payload[key] = n;
    }
    if (Object.keys(payload).length === 0) {
      Alert.alert("Nothing to update", "Enter used days or carry-forward days.");
      return;
    }
    adjustM.mutate(payload);
  }

  return (
    <>
    <Modal visible={adjustOpen} transparent animationType="fade" onRequestClose={() => setAdjustOpen(false)}>
      <View style={s.modalBackdrop}>
        <View style={s.modalCard}>
          <Text style={s.modalTitle}>Adjust Casual Leave — {year}</Text>
          <Text style={s.modalHint}>Sets the opening balance (overwrites current values).</Text>

          <Text style={s.inputLabel}>Used days</Text>
          <TextInput
            style={s.input}
            value={usedInput}
            onChangeText={setUsedInput}
            keyboardType="number-pad"
            placeholder="e.g. 4"
          />
          <Text style={s.inputLabel}>Carry-forward days</Text>
          <TextInput
            style={s.input}
            value={carryInput}
            onChangeText={setCarryInput}
            keyboardType="number-pad"
            placeholder="e.g. 2"
          />

          <View style={s.modalActions}>
            <TouchableOpacity style={s.cancelBtn} onPress={() => setAdjustOpen(false)} disabled={adjustM.isPending}>
              <Text style={s.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.saveBtn} onPress={submitAdjust} disabled={adjustM.isPending} activeOpacity={0.8}>
              <Text style={s.saveBtnText}>{adjustM.isPending ? "Saving…" : "Save"}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
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
      ListHeaderComponent={
        <>
          <View style={s.balanceCard}>
            {[
              { label: "Allocated", value: b?.allocatedDays },
              { label: "Carry Fwd", value: b?.carryForwardDays },
              { label: "Earned", value: b?.earnedDays },
              { label: "Used", value: b?.usedDays },
              { label: "Remaining", value: b?.remainingDays },
            ].map((x) => (
              <View key={x.label} style={s.balanceItem}>
                <Text style={[
                  s.balanceValue,
                  x.label === "Remaining" && { color: (x.value ?? 0) > 0 ? colors.green[600] : colors.red[500] },
                ]}>
                  {x.value ?? "—"}
                </Text>
                <Text style={s.balanceLabel}>{x.label}</Text>
              </View>
            ))}
          </View>
          {b === undefined && !balanceQ.isLoading && (
            <Text style={s.noPolicy}>No casual leave policy set for {year}.</Text>
          )}

          <TouchableOpacity style={s.markBtn} onPress={onMark} activeOpacity={0.8}>
            <Feather name="plus" size={15} color="#fff" />
            <Text style={s.markBtnText}>Mark Casual Leave</Text>
          </TouchableOpacity>

          <TouchableOpacity style={s.adjustBtn} onPress={openAdjust} activeOpacity={0.8}>
            <Feather name="edit-2" size={14} color={colors.bytecode[600]} />
            <Text style={s.adjustBtnText}>Adjust Balance</Text>
          </TouchableOpacity>

          <View style={s.filters}>
            {([undefined, "pending", "approved", "rejected", "cancelled"] as (CasualLeaveStatus | undefined)[]).map((f) => {
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
          {listQ.isLoading && <View style={s.center}><Spinner /></View>}
        </>
      }
      ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
      ListEmptyComponent={
        listQ.isLoading ? null : (
          <View style={s.empty}>
            <Feather name="umbrella" size={32} color={colors.gray[300]} />
            <Text style={s.emptyText}>No casual leave requests</Text>
          </View>
        )
      }
      renderItem={({ item }: { item: CasualLeaveRequest }) => (
        <View style={s.row}>
          <View style={s.rowTop}>
            <Text style={s.rowDate}>{fmtCasual(item.startDate, item.endDate)}</Text>
            <CasualLeaveStatusBadge status={item.status} />
          </View>
          <Text style={s.rowDays}>{item.totalDays} working day{item.totalDays > 1 ? "s" : ""}</Text>
          {item.reason ? <Text style={s.rowReason}>{item.reason}</Text> : null}
          {item.reviewNote ? <Text style={s.rowNote}>Note: {item.reviewNote}</Text> : null}
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
    </>
  );
}

// ─── Screen ───────────────────────────────────────────────────

export default function AdminEmployeeLeaveScreen() {
  const { id, name, tab: initialTab } = useLocalSearchParams<{ id: string; name?: string; tab?: Tab }>();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>(initialTab === "casual" ? "casual" : "sick");

  function handleMark() {
    router.push({
      pathname: tab === "sick"
        ? "/(app)/admin/sick-leave/mark"
        : "/(app)/admin/casual-leave/mark",
      params: { employeeId: id, employeeName: name ?? "" },
    } as any);
  }
  const [year, setYear] = useState(new Date().getFullYear());
  const employeeId = Number(id);

  return (
    <View style={s.root}>
      <PageHeader
        title={name ? `${name} — Leave` : "Employee Leave"}
        variant="bytecode"
        insetTop
      />

      <View style={s.tabBar}>
        <TouchableOpacity
          style={[s.tabBtn, tab === "sick" && s.tabBtnActive]}
          onPress={() => setTab("sick")}
          activeOpacity={0.8}
        >
          <Feather name="thermometer" size={14} color={tab === "sick" ? "#fff" : colors.gray[500]} />
          <Text style={[s.tabBtnText, tab === "sick" && s.tabBtnTextActive]}>Sick Leave</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[s.tabBtn, tab === "casual" && s.tabBtnActive]}
          onPress={() => setTab("casual")}
          activeOpacity={0.8}
        >
          <Feather name="umbrella" size={14} color={tab === "casual" ? "#fff" : colors.gray[500]} />
          <Text style={[s.tabBtnText, tab === "casual" && s.tabBtnTextActive]}>Casual Leave</Text>
        </TouchableOpacity>
      </View>

      <YearNav year={year} onChange={setYear} />

      {tab === "sick"
        ? <SickTab employeeId={employeeId} year={year} onMark={handleMark} />
        : <CasualTab employeeId={employeeId} year={year} onMark={handleMark} />
      }
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.gray[50] },
  center: { alignItems: "center", paddingVertical: 24 },

  tabBar: {
    flexDirection: "row", marginHorizontal: 16, marginTop: 12, marginBottom: 4,
    backgroundColor: colors.gray[100], borderRadius: 12, padding: 3, gap: 3,
  },
  tabBtn: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 6, paddingVertical: 9, borderRadius: 10,
  },
  tabBtnActive: { backgroundColor: colors.bytecode[600] },
  tabBtnText: { fontSize: 13, fontWeight: "700", color: colors.gray[500] },
  tabBtnTextActive: { color: "#fff" },

  balanceCard: {
    flexDirection: "row", marginBottom: 8, backgroundColor: "#fff",
    borderRadius: 14, borderWidth: 1, borderColor: colors.gray[100], paddingVertical: 14,
  },
  balanceItem: { flex: 1, alignItems: "center", gap: 2 },
  balanceValue: { fontSize: 22, fontWeight: "800", color: colors.bytecode[700] },
  balanceLabel: { fontSize: 11, color: colors.gray[500], fontWeight: "600" },
  noPolicy: { fontSize: 12, color: colors.amber[700], marginBottom: 8 },

  markBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 8, backgroundColor: colors.bytecode[600], borderRadius: 14,
    paddingVertical: 13, marginBottom: 12,
  },
  markBtnText: { fontSize: 14, fontWeight: "800", color: "#fff" },
  adjustBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 8, backgroundColor: "#fff", borderRadius: 14, borderWidth: 1,
    borderColor: colors.bytecode[600], paddingVertical: 11, marginBottom: 12,
  },
  adjustBtnText: { fontSize: 13, fontWeight: "700", color: colors.bytecode[600] },

  modalBackdrop: {
    flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "center", padding: 24,
  },
  modalCard: { backgroundColor: "#fff", borderRadius: 16, padding: 20, gap: 6 },
  modalTitle: { fontSize: 16, fontWeight: "800", color: colors.gray[900] },
  modalHint: { fontSize: 12, color: colors.gray[500], marginBottom: 8 },
  inputLabel: { fontSize: 12, fontWeight: "700", color: colors.gray[600], marginTop: 6 },
  input: {
    borderWidth: 1, borderColor: colors.gray[200], borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: colors.gray[900],
  },
  modalActions: { flexDirection: "row", gap: 10, marginTop: 14 },
  cancelBtn: {
    flex: 1, alignItems: "center", paddingVertical: 12, borderRadius: 12,
    backgroundColor: colors.gray[100],
  },
  cancelBtnText: { fontSize: 14, fontWeight: "700", color: colors.gray[600] },
  saveBtn: {
    flex: 1, alignItems: "center", paddingVertical: 12, borderRadius: 12,
    backgroundColor: colors.bytecode[600],
  },
  saveBtnText: { fontSize: 14, fontWeight: "800", color: "#fff" },

  filters: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 12 },
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
  empty: { alignItems: "center", paddingTop: 60, gap: 10 },
  emptyText: { fontSize: 14, color: colors.gray[400] },
  pagination: { flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 16, paddingVertical: 12 },
  pageLabel: { fontSize: 13, fontWeight: "600", color: colors.gray[600] },
});
