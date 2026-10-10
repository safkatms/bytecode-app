import React from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
} from "react-native";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Feather from "@expo/vector-icons/Feather";
import { getOfficeLocation } from "@/lib/api/location.api";
import { colors } from "@/components/ui/theme";
import { Spinner } from "@/components/ui/Spinner";
import { PageHeader } from "@/components/ui/PageHeader";

export default function AdminLocationsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const {
    data: location,
    isLoading,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ["office-location"],
    queryFn: getOfficeLocation,
  });

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      <PageHeader title="Office Location" variant="bytecode" />

      {isLoading ? (
        <View style={s.center}>
          <Spinner />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={s.content}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              tintColor={colors.bytecode[600]}
            />
          }
        >
          {!location ? (
            <View style={s.emptyCard}>
              <View style={s.emptyIcon}>
                <Feather name="map-pin" size={28} color={colors.gray[300]} />
              </View>
              <Text style={s.emptyTitle}>No location configured</Text>
              <Text style={s.emptyBody}>
                Set up the office location so employees can check in.
              </Text>
              <TouchableOpacity
                style={s.setupBtn}
                onPress={() => router.push("/(app)/admin/locations/form")}
              >
                <Feather name="plus" size={15} color="#fff" />
                <Text style={s.setupBtnText}>Set up location</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={s.card}>
              <View style={s.cardHeader}>
                <View style={s.iconWrap}>
                  <Feather
                    name="map-pin"
                    size={20}
                    color={colors.bytecode[600]}
                  />
                </View>
                <View style={s.cardMeta}>
                  <Text style={s.cardName}>{location.name}</Text>
                  <Text style={s.cardCoords}>
                    {Number(location.latitude).toFixed(6)},{" "}
                    {Number(location.longitude).toFixed(6)}
                  </Text>
                </View>
                <TouchableOpacity
                  style={s.editBtn}
                  onPress={() => router.push("/(app)/admin/locations/form")}
                  hitSlop={8}
                >
                  <Feather
                    name="edit-2"
                    size={15}
                    color={colors.bytecode[600]}
                  />
                </TouchableOpacity>
              </View>

              <View style={s.divider} />

              {[
                {
                  icon: "disc" as const,
                  label: "Check-in radius",
                  value: `${location.radiusMeters} meters`,
                },
                {
                  icon: "navigation" as const,
                  label: "Latitude",
                  value: String(Number(location.latitude).toFixed(6)),
                },
                {
                  icon: "navigation-2" as const,
                  label: "Longitude",
                  value: String(Number(location.longitude).toFixed(6)),
                },
              ].map(({ icon, label, value }) => (
                <View key={label} style={s.detailRow}>
                  <View style={s.detailIcon}>
                    <Feather
                      name={icon}
                      size={14}
                      color={colors.bytecode[500]}
                    />
                  </View>
                  <Text style={s.detailLabel}>{label}</Text>
                  <Text style={s.detailValue}>{value}</Text>
                </View>
              ))}
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.gray[50] },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  content: { padding: 16 },

  emptyCard: {
    backgroundColor: "#fff",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.gray[100],
    padding: 32,
    alignItems: "center",
    gap: 10,
  },
  emptyIcon: {
    width: 60,
    height: 60,
    borderRadius: 18,
    backgroundColor: colors.gray[50],
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  emptyTitle: { fontSize: 16, fontWeight: "800", color: colors.gray[800] },
  emptyBody: {
    fontSize: 13,
    color: colors.gray[400],
    textAlign: "center",
    lineHeight: 19,
  },
  setupBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 8,
    backgroundColor: colors.bytecode[600],
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 11,
  },
  setupBtnText: { fontSize: 14, fontWeight: "700", color: "#fff" },

  card: {
    backgroundColor: "#fff",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.gray[100],
    overflow: "hidden",
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 16,
  },
  iconWrap: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: colors.bytecode[50],
    alignItems: "center",
    justifyContent: "center",
  },
  cardMeta: { flex: 1 },
  cardName: { fontSize: 16, fontWeight: "800", color: colors.gray[900] },
  cardCoords: {
    fontSize: 11,
    color: colors.gray[400],
    marginTop: 2,
    fontFamily: "monospace",
  },
  editBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.bytecode[50],
    alignItems: "center",
    justifyContent: "center",
  },
  divider: { height: 1, backgroundColor: colors.gray[100] },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[50],
  },
  detailIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: colors.bytecode[50],
    alignItems: "center",
    justifyContent: "center",
  },
  detailLabel: {
    flex: 1,
    fontSize: 13,
    color: colors.gray[500],
    fontWeight: "600",
  },
  detailValue: { fontSize: 13, fontWeight: "700", color: colors.gray[800] },
});
