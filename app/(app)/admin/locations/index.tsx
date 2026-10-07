// app/(app)/admin/locations/index.tsx

import React from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  RefreshControl,
} from "react-native";
import { useRouter } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Feather from "@expo/vector-icons/Feather";
import {
  adminListLocations,
  adminDeleteLocation,
} from "@/lib/api/attendance.api";
import { colors } from "@/components/ui/theme";
import { Spinner } from "@/components/ui/Spinner";
import { PageHeader } from "@/components/ui/PageHeader";
import type { OfficeLocation } from "@/types/attendance";

function LocationRow({
  loc,
  onEdit,
  onDelete,
}: {
  loc: OfficeLocation;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <View style={s.row}>
      <View
        style={[
          s.rowIcon,
          {
            backgroundColor: loc.isActive ? colors.teal[50] : colors.gray[100],
          },
        ]}
      >
        <Feather
          name="map-pin"
          size={18}
          color={loc.isActive ? colors.teal[600] : colors.gray[400]}
        />
      </View>
      <View style={s.rowInfo}>
        <Text style={s.rowName}>{loc.name}</Text>
        <Text style={s.rowCoords}>
          {Number(loc.latitude).toFixed(4)}, {Number(loc.longitude).toFixed(4)}
        </Text>
        <View style={s.rowMeta}>
          <Feather name="disc" size={11} color={colors.gray[400]} />
          <Text style={s.rowRadius}>{loc.radiusMeters}m radius</Text>
          {!loc.isActive && (
            <View style={s.inactiveBadge}>
              <Text style={s.inactiveText}>Inactive</Text>
            </View>
          )}
        </View>
      </View>
      <View style={s.rowActions}>
        <TouchableOpacity onPress={onEdit} hitSlop={8} style={s.actionBtn}>
          <Feather name="edit-2" size={15} color={colors.teal[600]} />
        </TouchableOpacity>
        <TouchableOpacity onPress={onDelete} hitSlop={8} style={s.actionBtn}>
          <Feather name="trash-2" size={15} color={colors.red[400]} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function AdminLocationsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();

  const {
    data: locations = [],
    isLoading,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ["admin-locations"],
    queryFn: adminListLocations,
  });

  const deleteMut = useMutation({
    mutationFn: adminDeleteLocation,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-locations"] }),
    onError: () => Alert.alert("Error", "Failed to delete location"),
  });

  function confirmDelete(loc: OfficeLocation) {
    Alert.alert(
      "Delete Location",
      `Remove "${loc.name}"? Employees won't be able to check in from this location.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => deleteMut.mutate(loc.id),
        },
      ],
    );
  }

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      <PageHeader
        title="Office Locations"
        variant="teal"
        rightActions={[
          {
            icon: "plus",
            onPress: () => router.push("/(app)/admin/locations/form"),
          },
        ]}
      />

      {locations.length === 0 && !isLoading && (
        <View style={s.emptyBanner}>
          <Feather name="alert-circle" size={14} color={colors.amber[600]} />
          <Text style={s.emptyBannerText}>
            No active locations — employees cannot check in until at least one
            is configured.
          </Text>
        </View>
      )}

      {isLoading ? (
        <View style={s.center}>
          <Spinner />
        </View>
      ) : (
        <FlatList
          data={locations}
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
              <Feather name="map-pin" size={36} color={colors.gray[300]} />
              <Text style={s.emptyText}>No locations added</Text>
            </View>
          }
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
          renderItem={({ item }) => (
            <LocationRow
              loc={item}
              onEdit={() =>
                router.push({
                  pathname: "/(app)/admin/locations/form",
                  params: { id: item.id },
                })
              }
              onDelete={() => confirmDelete(item)}
            />
          )}
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.gray[50] },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  emptyBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    margin: 16,
    backgroundColor: colors.amber[50],
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.amber[200],
  },
  emptyBannerText: {
    flex: 1,
    fontSize: 12,
    color: colors.amber[800],
    fontWeight: "600",
    lineHeight: 18,
  },
  list: { padding: 16, paddingBottom: 40 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 14,
    gap: 12,
    borderWidth: 1,
    borderColor: colors.gray[100],
  },
  rowIcon: {
    width: 44,
    height: 44,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  rowInfo: { flex: 1, gap: 3 },
  rowName: { fontSize: 15, fontWeight: "800", color: colors.gray[900] },
  rowCoords: { fontSize: 11, color: colors.gray[400], fontFamily: "monospace" },
  rowMeta: { flexDirection: "row", alignItems: "center", gap: 5 },
  rowRadius: { fontSize: 12, color: colors.gray[400] },
  inactiveBadge: {
    backgroundColor: colors.red[50],
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
  },
  inactiveText: { fontSize: 10, fontWeight: "700", color: colors.red[500] },
  rowActions: { flexDirection: "row", gap: 4 },
  actionBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: colors.gray[50],
    alignItems: "center",
    justifyContent: "center",
  },
  empty: { alignItems: "center", paddingTop: 60, gap: 10 },
  emptyText: { fontSize: 14, color: colors.gray[400] },
});
