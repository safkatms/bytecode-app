// app/(app)/admin/holidays/index.tsx

import React, { useState } from "react";
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  Alert, RefreshControl,
} from "react-native";
import { useRouter } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Feather from "@expo/vector-icons/Feather";
import { listHolidays, deleteHoliday } from "@/lib/api/holiday.api";
import { getApiErrorMessage } from "@/lib/api-error";
import { colors } from "@/components/ui/theme";
import { Spinner } from "@/components/ui/Spinner";
import { PageHeader } from "@/components/ui/PageHeader";
import { YearNav } from "@/components/ui/YearNav";
import type { Holiday } from "@/types/holiday";

function pad(n: number) { return String(n).padStart(2, "0"); }
function fmtDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" });
}
function isSingleDay(h: Holiday) {
  return h.startDate.slice(0, 10) === h.endDate.slice(0, 10);
}
function dayCount(h: Holiday) {
  const diff = (new Date(h.endDate).getTime() - new Date(h.startDate).getTime()) / 86400000;
  return Math.round(diff) + 1;
}

export default function AdminHolidaysScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const qc = useQueryClient();
  const [year, setYear] = useState(new Date().getFullYear());

  const { data, isLoading, isRefetching, refetch } = useQuery({
    queryKey: ["admin-holidays", year],
    queryFn: () => listHolidays(year),
  });

  const deleteMut = useMutation({
    mutationFn: deleteHoliday,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-holidays"] }),
    onError: (e) => Alert.alert("Error", getApiErrorMessage(e, "Failed to delete holiday")),
  });

  function confirmDelete(h: Holiday) {
    Alert.alert(
      "Delete Holiday",
      `Delete "${h.name}"? This will remove attendance entries for all affected employees.`,
      [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: () => deleteMut.mutate(h.id) },
      ],
    );
  }

  const holidays = data?.data ?? [];

  return (
    <View style={s.root}>
      <PageHeader
        title="Holidays"
        variant="bytecode"
        insetTop
        rightActions={[{
          icon: "plus",
          onPress: () => router.push("/(app)/admin/holidays/form" as any),
        }]}
      />

      <YearNav year={year} onChange={setYear} />

      {isLoading ? (
        <View style={s.center}><Spinner /></View>
      ) : (
        <FlatList
          data={holidays}
          keyExtractor={(h) => String(h.id)}
          contentContainerStyle={[s.list, { paddingBottom: insets.bottom + 32 }]}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.bytecode[600]} />
          }
          ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
          ListEmptyComponent={
            <View style={s.empty}>
              <Feather name="sun" size={36} color={colors.gray[300]} />
              <Text style={s.emptyText}>No holidays for {year}</Text>
            </View>
          }
          renderItem={({ item }: { item: Holiday }) => (
            <View style={s.row}>
              <View style={s.dateStrip}>
                <Text style={s.dateDay}>
                  {new Date(item.startDate).toLocaleDateString("en-US", { day: "numeric" })}
                </Text>
                <Text style={s.dateMon}>
                  {new Date(item.startDate).toLocaleDateString("en-US", { month: "short" })}
                </Text>
              </View>
              <View style={s.rowBody}>
                <Text style={s.rowName}>{item.name}</Text>
                <Text style={s.rowSub}>
                  {isSingleDay(item)
                    ? fmtDate(item.startDate)
                    : `${fmtDate(item.startDate)} – ${fmtDate(item.endDate)} · ${dayCount(item)} days`}
                </Text>
                {item.description ? <Text style={s.rowDesc}>{item.description}</Text> : null}
                {item.exclusions && item.exclusions.length > 0 && (
                  <View style={s.exclusionRow}>
                    <Feather name="user-minus" size={11} color={colors.amber[600]} />
                    <Text style={s.exclusionText}>{item.exclusions.length} exclusion{item.exclusions.length > 1 ? "s" : ""}</Text>
                  </View>
                )}
              </View>
              <View style={s.rowActions}>
                <TouchableOpacity
                  hitSlop={8}
                  onPress={() => router.push({ pathname: "/(app)/admin/holidays/form" as any, params: { id: item.id } })}
                >
                  <Feather name="edit-2" size={15} color={colors.bytecode[500]} />
                </TouchableOpacity>
                <TouchableOpacity hitSlop={8} onPress={() => confirmDelete(item)}>
                  <Feather name="trash-2" size={15} color={colors.red[400]} />
                </TouchableOpacity>
              </View>
            </View>
          )}
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.gray[50] },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  list: { padding: 16 },
  empty: { alignItems: "center", paddingTop: 60, gap: 10 },
  emptyText: { fontSize: 14, color: colors.gray[400] },
  row: {
    flexDirection: "row", alignItems: "flex-start",
    backgroundColor: "#fff", borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: colors.gray[100], gap: 12,
  },
  dateStrip: {
    width: 42, alignItems: "center", paddingTop: 2,
    backgroundColor: colors.bytecode[50], borderRadius: 10,
    paddingVertical: 8,
  },
  dateDay: { fontSize: 18, fontWeight: "900", color: colors.bytecode[700] },
  dateMon: { fontSize: 10, fontWeight: "700", color: colors.bytecode[500], textTransform: "uppercase" },
  rowBody: { flex: 1, gap: 3 },
  rowName: { fontSize: 15, fontWeight: "800", color: colors.gray[900] },
  rowSub: { fontSize: 12, color: colors.gray[500] },
  rowDesc: { fontSize: 12, color: colors.gray[600], fontStyle: "italic" },
  exclusionRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 },
  exclusionText: { fontSize: 11, color: colors.amber[600], fontWeight: "600" },
  rowActions: { gap: 12, paddingTop: 2 },
});
