// app/(app)/admin/employees/index.tsx

import React, { useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  RefreshControl,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Feather from "@expo/vector-icons/Feather";
import {
  adminListEmployees,
  adminToggleEmployee,
  adminDeleteEmployee,
} from "@/lib/api/attendance.api";
import { colors } from "@/components/ui/theme";
import { Spinner } from "@/components/ui/Spinner";
import { PageHeader } from "@/components/ui/PageHeader";
import type { Employee } from "@/types/attendance";

function EmployeeRow({
  emp,
  onPress,
  onToggle,
  onDelete,
}: {
  emp: Employee;
  onPress: () => void;
  onToggle: () => void;
  onDelete: () => void;
}) {
  const initials =
    `${emp.user.firstName?.[0] ?? ""}${emp.user.lastName?.[0] ?? ""}` || "?";
  return (
    <TouchableOpacity style={s.row} onPress={onPress} activeOpacity={0.7}>
      <View style={s.rowAvatar}>
        <Text style={s.rowInitials}>{initials}</Text>
      </View>
      <View style={s.rowInfo}>
        <Text style={s.rowName} numberOfLines={1}>
          {emp.user.firstName} {emp.user.lastName}
        </Text>
        <Text style={s.rowCode}>
          {emp.employeeCode}
          {emp.department ? ` · ${emp.department}` : ""}
        </Text>
        {emp.designation && <Text style={s.rowDesig}>{emp.designation}</Text>}
      </View>
      <View style={s.rowRight}>
        <TouchableOpacity
          onPress={onToggle}
          style={[
            s.activeBadge,
            {
              backgroundColor: emp.isActive ? colors.green[50] : colors.red[50],
            },
          ]}
        >
          <View
            style={[
              s.activeDot,
              {
                backgroundColor: emp.isActive
                  ? colors.green[500]
                  : colors.red[400],
              },
            ]}
          />
          <Text
            style={[
              s.activeText,
              { color: emp.isActive ? colors.green[700] : colors.red[500] },
            ]}
          >
            {emp.isActive ? "Active" : "Inactive"}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={onDelete} hitSlop={8}>
          <Feather name="trash-2" size={15} color={colors.red[300]} />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

export default function AdminEmployeesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ["admin-employees", page, search],
    queryFn: () =>
      adminListEmployees({ page, limit: 20, search: search || undefined }),
  });

  const toggleMut = useMutation({
    mutationFn: adminToggleEmployee,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-employees"] }),
  });

  const deleteMut = useMutation({
    mutationFn: adminDeleteEmployee,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-employees"] }),
    onError: () => Alert.alert("Error", "Failed to delete employee"),
  });

  function confirmDelete(emp: Employee) {
    Alert.alert(
      "Delete Employee",
      `Remove ${emp.user.firstName} ${emp.user.lastName}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => deleteMut.mutate(emp.id),
        },
      ],
    );
  }

  const employees = data?.data ?? [];
  const meta = data?.meta;

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      <PageHeader
        title="Employees"
        variant="teal"
        rightActions={[
          {
            icon: "user-plus",
            onPress: () => router.push("/(app)/admin/employees/form"),
          },
        ]}
      />

      <View style={s.searchRow}>
        <Feather name="search" size={14} color={colors.gray[400]} />
        <TextInput
          style={s.searchInput}
          placeholder="Search name, code, department…"
          placeholderTextColor={colors.gray[300]}
          value={search}
          onChangeText={(v) => {
            setSearch(v);
            setPage(1);
          }}
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
          data={employees}
          keyExtractor={(i) => String(i.id)}
          contentContainerStyle={s.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              tintColor={colors.teal[600]}
            />
          }
          ListEmptyComponent={
            <View style={s.empty}>
              <Feather name="users" size={36} color={colors.gray[300]} />
              <Text style={s.emptyText}>No employees found</Text>
            </View>
          }
          ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
          renderItem={({ item }) => (
            <EmployeeRow
              emp={item}
              onPress={() => router.push(`/(app)/admin/employees/${item.id}`)}
              onToggle={() => toggleMut.mutate(item.id)}
              onDelete={() => confirmDelete(item)}
            />
          )}
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
                    color={page === 1 ? colors.gray[300] : colors.teal[600]}
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
                        : colors.teal[600]
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
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    margin: 16,
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.gray[200],
    paddingHorizontal: 12,
    height: 42,
  },
  searchInput: { flex: 1, fontSize: 14, color: colors.gray[900] },
  list: { paddingHorizontal: 16, paddingBottom: 40 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 14,
    gap: 12,
    borderWidth: 1,
    borderColor: colors.gray[100],
  },
  rowAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.teal[100],
    alignItems: "center",
    justifyContent: "center",
  },
  rowInitials: { fontSize: 15, fontWeight: "800", color: colors.teal[700] },
  rowInfo: { flex: 1 },
  rowName: { fontSize: 14, fontWeight: "800", color: colors.gray[900] },
  rowCode: { fontSize: 12, color: colors.gray[400], marginTop: 2 },
  rowDesig: { fontSize: 12, color: colors.gray[400] },
  rowRight: { alignItems: "flex-end", gap: 8 },
  activeBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
  },
  activeDot: { width: 6, height: 6, borderRadius: 3 },
  activeText: { fontSize: 11, fontWeight: "700" },
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
    borderColor: colors.teal[100],
    alignItems: "center",
    justifyContent: "center",
  },
  pageBtnOff: { opacity: 0.4 },
  pageLabel: { fontSize: 13, fontWeight: "600", color: colors.gray[600] },
});
