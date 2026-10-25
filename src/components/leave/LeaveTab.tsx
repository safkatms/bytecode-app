import React, { useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Feather from "@expo/vector-icons/Feather";
import {
  getMySickLeaveBalance,
  getMySickLeaveRequests,
  cancelSickLeave,
} from "@/lib/api/sick-leave.api";
import {
  getMyCasualLeaveBalance,
  getMyCasualLeaveRequests,
  cancelCasualLeave,
} from "@/lib/api/casual-leave.api";
import { getApiErrorMessage } from "@/lib/api-error";
import { colors } from "@/components/ui/theme";
import { Spinner } from "@/components/ui/Spinner";
import {
  SickLeaveStatusBadge,
  formatRange as fmtSick,
} from "@/components/ui/SickLeaveStatusBadge";
import {
  CasualLeaveStatusBadge,
  formatRange as fmtCasual,
} from "@/components/ui/CasualLeaveStatusBadge";
import { GradientCta } from "@/components/dashboard";
import type {
  SickLeaveBalance,
  SickLeaveRequest,
  SickLeaveStatus,
} from "@/types/sick-leave";
import type {
  CasualLeaveBalance,
  CasualLeaveRequest,
} from "@/types/casual-leave";
import { LEAVE_KIND, type LeaveKind } from "./kinds";
import { LeaveBalance } from "./LeaveBalance";
import { LeaveRequestCard } from "./LeaveRequestCard";

// Sick and casual share the same status literals
type Status = SickLeaveStatus;
type Request = SickLeaveRequest | CasualLeaveRequest;
type Balance = SickLeaveBalance | CasualLeaveBalance;

interface Config {
  /** query keys are shared with the apply screens' invalidations */
  balanceKey: string;
  listKey: string;
  balanceFn: (year?: number) => Promise<Balance>;
  listFn: (f: {
    status?: Status;
    page?: number;
    year?: number;
    limit?: number;
  }) => Promise<{ data: Request[]; meta: { totalPages: number } }>;
  cancelFn: (id: number) => Promise<unknown>;
  Badge: React.ComponentType<{ status: Status }>;
  fmtRange: (start: string, end: string) => string;
  applyPath: string;
  ctaTitle: string;
  ctaSubtitle: string;
  emptyTitle: string;
}

const CONFIG: Record<LeaveKind, Config> = {
  sick: {
    balanceKey: "sick-leave-balance",
    listKey: "sick-leave-mine",
    balanceFn: getMySickLeaveBalance,
    listFn: getMySickLeaveRequests,
    cancelFn: cancelSickLeave,
    Badge: SickLeaveStatusBadge,
    fmtRange: fmtSick,
    applyPath: "/(app)/leave/apply-sick",
    ctaTitle: "Apply sick leave",
    ctaSubtitle: "Request time off when you're unwell",
    emptyTitle: "No sick leave requests",
  },
  casual: {
    balanceKey: "casual-leave-balance",
    listKey: "casual-leave-mine",
    balanceFn: getMyCasualLeaveBalance,
    listFn: getMyCasualLeaveRequests,
    cancelFn: cancelCasualLeave,
    Badge: CasualLeaveStatusBadge,
    fmtRange: fmtCasual,
    applyPath: "/(app)/leave/apply-casual",
    ctaTitle: "Apply casual leave",
    ctaSubtitle: "Plan time off in advance",
    emptyTitle: "No casual leave requests",
  },
};

const FILTERS: (Status | undefined)[] = [
  undefined,
  "pending",
  "approved",
  "rejected",
  "cancelled",
];

export function LeaveTab({ kind, year }: { kind: LeaveKind; year: number }) {
  const cfg = CONFIG[kind];
  const accent = LEAVE_KIND[kind];
  const qc = useQueryClient();
  const router = useRouter();
  const [status, setStatus] = useState<Status | undefined>();
  const [page, setPage] = useState(1);

  const balanceQ = useQuery({
    queryKey: [cfg.balanceKey, year],
    queryFn: () => cfg.balanceFn(year),
  });

  const listQ = useQuery({
    queryKey: [cfg.listKey, status, page, year],
    queryFn: () => cfg.listFn({ status, page, year, limit: 20 }),
  });

  const cancelMut = useMutation({
    mutationFn: cfg.cancelFn,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [cfg.listKey] });
      qc.invalidateQueries({ queryKey: [cfg.balanceKey] });
    },
    onError: (e) =>
      Alert.alert("Error", getApiErrorMessage(e, "Failed to cancel")),
  });

  function confirmCancel(id: number) {
    Alert.alert("Cancel request", "Cancel this request?", [
      { text: "No", style: "cancel" },
      {
        text: "Yes",
        style: "destructive",
        onPress: () => cancelMut.mutate(id),
      },
    ]);
  }

  const meta = listQ.data?.meta;

  return (
    <FlatList
      data={listQ.data?.data ?? []}
      keyExtractor={(i) => String(i.id)}
      contentContainerStyle={s.list}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={listQ.isRefetching}
          onRefresh={() => {
            listQ.refetch();
            balanceQ.refetch();
          }}
          tintColor={colors.bytecode[600]}
        />
      }
      ListHeaderComponent={
        <>
          <LeaveBalance kind={kind} balance={balanceQ.data} year={year} />

          <GradientCta
            icon="plus-circle"
            title={cfg.ctaTitle}
            subtitle={cfg.ctaSubtitle}
            onPress={() => router.push(cfg.applyPath as any)}
          />

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
                  activeOpacity={0.8}
                >
                  <Text style={[s.chipText, active && s.chipTextActive]}>
                    {f ? f[0].toUpperCase() + f.slice(1) : "All"}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {listQ.isLoading && (
            <View style={s.center}>
              <Spinner />
            </View>
          )}
        </>
      }
      ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
      ListEmptyComponent={
        listQ.isLoading ? null : (
          <View style={s.empty}>
            <View style={[s.emptyIcon, { backgroundColor: accent.tint }]}>
              <Feather name={accent.icon} size={28} color={accent.color} />
            </View>
            <Text style={s.emptyTitle}>{cfg.emptyTitle}</Text>
            <Text style={s.emptySub}>
              Requests you submit for {year} will show up here.
            </Text>
          </View>
        )
      }
      renderItem={({ item }) => (
        <LeaveRequestCard
          kind={kind}
          startDate={item.startDate}
          range={cfg.fmtRange(item.startDate, item.endDate)}
          totalDays={item.totalDays}
          badge={<cfg.Badge status={item.status} />}
          reason={item.reason}
          reviewNote={item.reviewNote}
          onCancel={
            item.status === "pending" ? () => confirmCancel(item.id) : undefined
          }
        />
      )}
      ListFooterComponent={
        meta && meta.totalPages > 1 ? (
          <View style={s.pagination}>
            <TouchableOpacity
              style={[s.pageBtn, page === 1 && s.pageBtnOff]}
              disabled={page === 1}
              onPress={() => setPage((p) => p - 1)}
              activeOpacity={0.7}
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
              disabled={page === meta.totalPages}
              onPress={() => setPage((p) => p + 1)}
              activeOpacity={0.7}
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
  );
}

const s = StyleSheet.create({
  list: { paddingBottom: 110 },
  center: { alignItems: "center", paddingVertical: 24 },

  filters: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    paddingHorizontal: 16,
    marginTop: 18,
    marginBottom: 14,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: colors.gray[200],
  },
  chipActive: {
    backgroundColor: colors.bytecode[600],
    borderColor: colors.bytecode[600],
  },
  chipText: { fontSize: 12.5, fontWeight: "700", color: colors.gray[600] },
  chipTextActive: { color: "#fff" },

  empty: { alignItems: "center", paddingTop: 36, paddingHorizontal: 32, gap: 8 },
  emptyIcon: {
    width: 68,
    height: 68,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
  },
  emptyTitle: { fontSize: 16, fontWeight: "800", color: colors.gray[900] },
  emptySub: {
    fontSize: 13,
    color: colors.gray[400],
    textAlign: "center",
    lineHeight: 19,
  },

  pagination: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
    paddingVertical: 16,
  },
  pageBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: colors.bytecode[100],
    alignItems: "center",
    justifyContent: "center",
  },
  pageBtnOff: { opacity: 0.4 },
  pageLabel: { fontSize: 13, fontWeight: "700", color: colors.gray[600] },
});
