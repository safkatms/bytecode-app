// app/(app)/admin/casual-leave/balances.tsx

import React, { useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  TextInput,
} from "react-native";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import Feather from "@expo/vector-icons/Feather";
import { adminListCasualLeaveBalances } from "@/lib/api/leave-balance.api";
import { colors } from "@/components/ui/theme";
import { Spinner } from "@/components/ui/Spinner";
import { PageHeader } from "@/components/ui/PageHeader";
import { YearNav } from "@/components/ui/YearNav";
import type { CasualLeaveEmployeeBalance } from "@/types/casual-leave";

function employeeName(b: CasualLeaveEmployeeBalance) {
  const u = b.employee.user;
  const name = [u?.firstName, u?.lastName].filter(Boolean).join(" ");
  return name || u?.email || b.employee.employeeCode || `Employee #${b.employee.id}`;
}

export default function AdminCasualLeaveBalancesScreen() {
  const router = useRouter();
  const [year, setYear] = useState(new Date().getFullYear());
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");

  const listQ = useQuery({
    queryKey: ["admin-casual-leave-balances", year, page, query],
    queryFn: () =>
      adminListCasualLeaveBalances({ year, page, limit: 20, search: query || undefined }),
  });

  const meta = listQ.data?.meta;

  return (
    <View style={s.root}>
      <PageHeader title="Casual Leave Balances" variant="bytecode" insetTop />
      <YearNav
        year={year}
        onChange={(y) => {
          setYear(y);
          setPage(1);
        }}
      />

      <View style={s.searchWrap}>
        <Feather name="search" size={15} color={colors.gray[400]} />
        <TextInput
          style={s.searchInput}
          value={search}
          onChangeText={setSearch}
          onSubmitEditing={() => {
            setQuery(search.trim());
            setPage(1);
          }}
          returnKeyType="search"
          placeholder="Search employee"
          placeholderTextColor={colors.gray[400]}
        />
      </View>

      {listQ.isLoading ? (
        <View style={s.center}>
          <Spinner />
        </View>
      ) : (
        <FlatList
          data={listQ.data?.data ?? []}
          keyExtractor={(i, idx) => String(i.employee.id)}
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
              <Feather name="users" size={36} color={colors.gray[300]} />
              <Text style={s.emptyText}>No employees found</Text>
            </View>
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              style={s.row}
              activeOpacity={0.8}
              onPress={() =>
                router.push({
                  pathname: "/(app)/admin/employees/[id]/leave",
                  params: {
                    id: String(item.employee.id),
                    name: employeeName(item),
                    tab: "casual",
                  },
                } as any)
              }
            >
              <View style={s.rowTop}>
                <Text style={s.rowName} numberOfLines={1}>
                  {employeeName(item)}
                </Text>
                {item.employee.employeeCode ? (
                  <Text style={s.rowCode}>{item.employee.employeeCode}</Text>
                ) : null}
              </View>
              <View style={s.stats}>
                {[
                  { label: "Allocated", value: item.allocatedDays },
                  { label: "Carry Fwd", value: item.carryForwardDays },
                  { label: "Earned", value: item.earnedDays },
                  { label: "Used", value: item.usedDays },
                  { label: "Remaining", value: item.remainingDays },
                ].map((x) => (
                  <View key={x.label} style={s.stat}>
                    <Text
                      style={[
                        s.statValue,
                        x.label === "Remaining" && {
                          color: (x.value ?? 0) > 0 ? colors.green[600] : colors.red[500],
                        },
                      ]}
                    >
                      {x.value ?? "—"}
                    </Text>
                    <Text style={s.statLabel}>{x.label}</Text>
                  </View>
                ))}
              </View>
            </TouchableOpacity>
          )}
          ListFooterComponent={
            meta && meta.totalPages > 1 ? (
              <View style={s.pagination}>
                <TouchableOpacity disabled={page === 1} onPress={() => setPage((p) => p - 1)}>
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
                    color={page === meta.totalPages ? colors.gray[300] : colors.bytecode[600]}
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
  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginHorizontal: 16,
    marginVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.gray[200],
  },
  searchInput: { flex: 1, paddingVertical: 10, fontSize: 14, color: colors.gray[900] },
  list: { paddingHorizontal: 16, paddingBottom: 40 },
  row: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 14,
    gap: 10,
    borderWidth: 1,
    borderColor: colors.gray[100],
  },
  rowTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 8 },
  rowName: { fontSize: 14, fontWeight: "800", color: colors.gray[900], flex: 1 },
  rowCode: { fontSize: 12, color: colors.gray[500], fontWeight: "600" },
  stats: { flexDirection: "row" },
  stat: { flex: 1, alignItems: "center", gap: 2 },
  statValue: { fontSize: 18, fontWeight: "800", color: colors.bytecode[700] },
  statLabel: { fontSize: 11, color: colors.gray[500], fontWeight: "600" },
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
