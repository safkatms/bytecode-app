// app/(app)/admin/employees/[id]/index.tsx

import React from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Feather from "@expo/vector-icons/Feather";
import {
  adminGetEmployee,
  adminToggleEmployee,
  adminGetDevices,
  adminRevokeDevice,
} from "@/lib/api/attendance.api";
import { colors } from "@/components/ui/theme";
import { Spinner } from "@/components/ui/Spinner";
import { PageHeader } from "@/components/ui/PageHeader";
import type { TrustedDevice } from "@/types/attendance";

function DeviceRow({
  device,
  onRevoke,
}: {
  device: TrustedDevice;
  onRevoke: () => void;
}) {
  return (
    <View style={s.deviceRow}>
      <View style={s.deviceIcon}>
        <Feather
          name="smartphone"
          size={16}
          color={device.isActive ? colors.teal[600] : colors.gray[400]}
        />
      </View>
      <View style={s.deviceInfo}>
        <Text style={s.deviceName}>{device.deviceName ?? device.deviceId}</Text>
        <Text style={s.deviceMeta}>
          Last seen: {new Date(device.lastSeenAt).toLocaleDateString()}
          {!device.isActive && "  · Revoked"}
        </Text>
      </View>
      {device.isActive && (
        <TouchableOpacity onPress={onRevoke} style={s.revokeBtn} hitSlop={8}>
          <Text style={s.revokeBtnText}>Revoke</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

export default function AdminEmployeeDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();

  const { data: emp, isLoading } = useQuery({
    queryKey: ["admin-employee", id],
    queryFn: () => adminGetEmployee(Number(id)),
    enabled: !!id,
  });

  const { data: devices = [] } = useQuery({
    queryKey: ["admin-employee-devices", id],
    queryFn: () => adminGetDevices(Number(id)),
    enabled: !!id,
  });

  const toggleMut = useMutation({
    mutationFn: () => adminToggleEmployee(Number(id)),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-employee", id] }),
  });

  const revokeMut = useMutation({
    mutationFn: adminRevokeDevice,
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["admin-employee-devices", id] }),
    onError: () => Alert.alert("Error", "Failed to revoke device"),
  });

  function confirmRevoke(device: TrustedDevice) {
    Alert.alert(
      "Revoke Device",
      `Revoke "${device.deviceName ?? device.deviceId}"? The employee won't be able to check in from this device.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Revoke",
          style: "destructive",
          onPress: () => revokeMut.mutate(device.id),
        },
      ],
    );
  }

  if (isLoading || !emp) {
    return (
      <View style={[s.center, { paddingTop: insets.top }]}>
        <Spinner />
      </View>
    );
  }

  const initials =
    `${emp.user.firstName?.[0] ?? ""}${emp.user.lastName?.[0] ?? ""}` || "?";

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      <PageHeader
        title="Employee Detail"
        variant="teal"
        rightActions={[
          {
            icon: "edit-2",
            onPress: () =>
              router.push({
                pathname: "/(app)/admin/employees/form",
                params: { id: emp.id },
              }),
          },
        ]}
      />
      <ScrollView
        contentContainerStyle={[
          s.content,
          { paddingBottom: insets.bottom + 32 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile */}
        <View style={s.profileCard}>
          <View style={s.avatar}>
            <Text style={s.avatarText}>{initials}</Text>
          </View>
          <Text style={s.profileName}>
            {emp.user.firstName} {emp.user.lastName}
          </Text>
          <Text style={s.profileEmail}>{emp.user.email}</Text>
          {emp.user.phone && (
            <Text style={s.profilePhone}>{emp.user.phone}</Text>
          )}
          <TouchableOpacity
            style={[
              s.statusToggle,
              {
                backgroundColor: emp.isActive
                  ? colors.green[50]
                  : colors.red[50],
              },
            ]}
            onPress={() => toggleMut.mutate()}
          >
            <View
              style={[
                s.statusDot,
                {
                  backgroundColor: emp.isActive
                    ? colors.green[500]
                    : colors.red[400],
                },
              ]}
            />
            <Text
              style={[
                s.statusToggleText,
                { color: emp.isActive ? colors.green[700] : colors.red[600] },
              ]}
            >
              {emp.isActive
                ? "Active — tap to deactivate"
                : "Inactive — tap to activate"}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Details */}
        <View style={s.infoCard}>
          {[
            ["Employee Code", emp.employeeCode],
            ["Department", emp.department ?? "—"],
            ["Designation", emp.designation ?? "—"],
            [
              "Joining Date",
              new Date(emp.joiningDate).toLocaleDateString("en-BD", {
                day: "numeric",
                month: "long",
                year: "numeric",
              }),
            ],
          ].map(([label, value]) => (
            <View key={label} style={s.infoRow}>
              <Text style={s.infoLabel}>{label}</Text>
              <Text style={s.infoValue}>{value}</Text>
            </View>
          ))}
        </View>

        {/* Quick actions */}
        <View style={s.actionsCard}>
          <TouchableOpacity
            style={s.actionItem}
            onPress={() =>
              router.push({
                pathname: "/(app)/admin/attendance",
                params: { employeeId: emp.id },
              })
            }
          >
            <View style={s.actionIcon}>
              <Feather name="calendar" size={17} color={colors.teal[600]} />
            </View>
            <Text style={s.actionLabel}>View Attendance</Text>
            <Feather name="chevron-right" size={16} color={colors.gray[400]} />
          </TouchableOpacity>
        </View>

        {/* Devices */}
        <Text style={s.sectionTitle}>Trusted Devices ({devices.length})</Text>
        <View style={s.devicesCard}>
          {devices.length === 0 ? (
            <View style={s.emptyDevices}>
              <Feather name="smartphone" size={24} color={colors.gray[300]} />
              <Text style={s.emptyDevicesText}>No devices registered</Text>
            </View>
          ) : (
            devices.map((device, i) => (
              <React.Fragment key={device.id}>
                <DeviceRow
                  device={device}
                  onRevoke={() => confirmRevoke(device)}
                />
                {i < devices.length - 1 && <View style={s.sep} />}
              </React.Fragment>
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.gray[50] },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  content: { padding: 16, gap: 16 },
  profileCard: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 20,
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: colors.gray[100],
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.teal[100],
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { fontSize: 26, fontWeight: "800", color: colors.teal[700] },
  profileName: { fontSize: 20, fontWeight: "800", color: colors.gray[900] },
  profileEmail: { fontSize: 13, color: colors.gray[400] },
  profilePhone: { fontSize: 13, color: colors.gray[400] },
  statusToggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    marginTop: 4,
  },
  statusDot: { width: 7, height: 7, borderRadius: 4 },
  statusToggleText: { fontSize: 12, fontWeight: "700" },
  infoCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.gray[100],
    overflow: "hidden",
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[50],
  },
  infoLabel: { fontSize: 12, color: colors.gray[400], fontWeight: "600" },
  infoValue: { fontSize: 13, fontWeight: "700", color: colors.gray[800] },
  actionsCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.gray[100],
    overflow: "hidden",
  },
  actionItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  actionIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.teal[50],
    alignItems: "center",
    justifyContent: "center",
  },
  actionLabel: {
    flex: 1,
    fontSize: 14,
    fontWeight: "700",
    color: colors.gray[800],
  },
  sectionTitle: { fontSize: 15, fontWeight: "800", color: colors.gray[800] },
  devicesCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.gray[100],
    overflow: "hidden",
  },
  deviceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
  },
  deviceIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: colors.gray[50],
    alignItems: "center",
    justifyContent: "center",
  },
  deviceInfo: { flex: 1 },
  deviceName: { fontSize: 13, fontWeight: "700", color: colors.gray[800] },
  deviceMeta: { fontSize: 11, color: colors.gray[400], marginTop: 2 },
  revokeBtn: {
    backgroundColor: colors.red[50],
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  revokeBtnText: { fontSize: 12, fontWeight: "700", color: colors.red[600] },
  emptyDevices: { alignItems: "center", padding: 24, gap: 8 },
  emptyDevicesText: { fontSize: 13, color: colors.gray[400] },
  sep: { height: 1, backgroundColor: colors.gray[100] },
});
