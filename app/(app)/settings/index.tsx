// app/(app)/settings/index.tsx

import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Feather from "@expo/vector-icons/Feather";

import { PageHeader } from "@/components/ui/PageHeader";
import { colors } from "@/components/ui/theme";
import { useAuthStore } from "@/store/auth.store";
import { logout } from "@/lib/auth";
import { setTokens } from "@/lib/axios";
import { useQueryClient } from "@tanstack/react-query";

type SettingItem = {
  icon: React.ComponentProps<typeof Feather>["name"];
  label: string;
  sublabel?: string;
  onPress: () => void;
  destructive?: boolean;
  chevron?: boolean;
};

function SettingRow({ item }: { item: SettingItem }) {
  return (
    <TouchableOpacity
      style={styles.row}
      onPress={item.onPress}
      activeOpacity={0.7}
    >
      <View
        style={[
          styles.rowIcon,
          {
            backgroundColor: item.destructive
              ? colors.red[50]
              : colors.bytecode[50],
          },
        ]}
      >
        <Feather
          name={item.icon}
          size={17}
          color={item.destructive ? colors.red[500] : colors.bytecode[600]}
        />
      </View>
      <View style={styles.rowText}>
        <Text
          style={[
            styles.rowLabel,
            item.destructive && { color: colors.red[500] },
          ]}
        >
          {item.label}
        </Text>
        {item.sublabel && (
          <Text style={styles.rowSublabel}>{item.sublabel}</Text>
        )}
      </View>
      {item.chevron !== false && (
        <Feather
          name="chevron-right"
          size={16}
          color={item.destructive ? colors.red[300] : colors.gray[300]}
        />
      )}
    </TouchableOpacity>
  );
}

function SectionCard({ items }: { items: SettingItem[] }) {
  return (
    <View style={styles.card}>
      {items.map((item, index) => (
        <React.Fragment key={item.label}>
          <SettingRow item={item} />
          {index < items.length - 1 && <View style={styles.separator} />}
        </React.Fragment>
      ))}
    </View>
  );
}

function SectionLabel({ label }: { label: string }) {
  return <Text style={styles.sectionLabel}>{label}</Text>;
}

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const qc = useQueryClient();
  const {
    user,
    setAuthenticated,
    setUser,
    originalAdmin,
    adminToken,
    clearImpersonation,
  } = useAuthStore();

  const isAdmin = user?.role === "admin";
  const isImpersonating = !!originalAdmin && !!adminToken;

  const handleLogout = () => {
    Alert.alert("Log out", "Are you sure you want to log out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Log out",
        style: "destructive",
        onPress: async () => {
          await logout();
          setAuthenticated(false);
          setUser(null);
          router.replace("/(auth)/login");
        },
      },
    ]);
  };

  const handleExitImpersonation = async () => {
    try {
      await setTokens(adminToken!, null);
      setUser(originalAdmin);
      clearImpersonation();
      await qc.invalidateQueries();
      router.back();
    } catch {
      await logout();
      setAuthenticated(false);
      setUser(null);
      router.replace("/(auth)/login");
    }
  };

  const adminItems: SettingItem[] = [
    {
      icon: "users",
      label: "Employees",
      sublabel: "Create and manage employees",
      onPress: () => router.push("/(app)/admin/employees"),
      chevron: true,
    },
    {
      icon: "briefcase",
      label: "Departments",
      sublabel: "Create and manage departments",
      onPress: () => router.push("/(app)/admin/departments"),
      chevron: true,
    },
    {
      icon: "map-pin",
      label: "Location",
      sublabel: "Set up office location",
      onPress: () => router.push("/(app)/admin/locations"),
      chevron: true,
    },
    {
      icon: "repeat",
      label: "Switch user",
      sublabel: "View the app as another user",
      onPress: () => router.push("/(app)/switch-user"),
      chevron: true,
    },
  ];

  const accountItems: SettingItem[] = [
    {
      icon: "user",
      label: "Edit profile",
      sublabel: "Update your personal information",
      onPress: () => router.push("/(app)/profile" as any),
      chevron: true,
    },
    {
      icon: "lock",
      label: "Change password",
      sublabel: "Update your login password",
      onPress: () => router.push("/(app)/change-password"),
      chevron: true,
    },
  ];

  const dangerItems: SettingItem[] = [
    ...(isImpersonating
      ? [
          {
            icon: "log-out" as const,
            label: "Exit impersonation",
            sublabel: `Return to ${originalAdmin?.firstName ?? "admin"} account`,
            onPress: handleExitImpersonation,
            destructive: true,
            chevron: false,
          },
        ]
      : []),
    {
      icon: "log-out" as const,
      label: "Log out",
      onPress: handleLogout,
      destructive: true,
      chevron: false,
    },
  ];

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <PageHeader title="Settings" variant="bytecode" />

      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + 32 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* User info */}
        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {user?.firstName?.[0] ?? ""}
              {user?.lastName?.[0] ?? ""}
            </Text>
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>
              {user?.firstName} {user?.lastName}
            </Text>
            <Text style={styles.profileEmail}>{user?.email}</Text>
          </View>
          <View
            style={[
              styles.roleBadge,
              {
                backgroundColor: isAdmin
                  ? colors.bytecode[50]
                  : colors.gray[100],
              },
            ]}
          >
            <Text
              style={[
                styles.roleText,
                { color: isAdmin ? colors.bytecode[700] : colors.gray[500] },
              ]}
            >
              {user?.role}
            </Text>
          </View>
        </View>

        {isImpersonating && (
          <View style={styles.impersonationBanner}>
            <Feather name="eye" size={14} color={colors.bytecode[600]} />
            <Text style={styles.impersonationText}>
              Viewing as{" "}
              <Text style={{ fontWeight: "800" }}>
                {user?.firstName} {user?.lastName}
              </Text>
            </Text>
          </View>
        )}

        {isAdmin && (
          <>
            <SectionLabel label="ADMIN" />
            <SectionCard items={adminItems} />
          </>
        )}

        <SectionLabel label="ACCOUNT" />
        <SectionCard items={accountItems} />

        <SectionLabel label="SESSION" />
        <SectionCard items={dangerItems} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.gray[50] },
  content: { padding: 16, gap: 10 },

  profileCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 14,
    gap: 12,
    borderWidth: 1,
    borderColor: colors.gray[100],
    marginBottom: 6,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.bytecode[100],
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { fontSize: 17, fontWeight: "900", color: colors.bytecode[700] },
  profileInfo: { flex: 1 },
  profileName: { fontSize: 15, fontWeight: "800", color: colors.gray[900] },
  profileEmail: { fontSize: 12, color: colors.gray[400], marginTop: 2 },
  roleBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  roleText: { fontSize: 11, fontWeight: "800", textTransform: "capitalize" },

  impersonationBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.bytecode[50],
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.bytecode[100],
    marginBottom: 4,
  },
  impersonationText: { fontSize: 13, color: colors.bytecode[800] },

  sectionLabel: {
    fontSize: 10,
    fontWeight: "800",
    color: colors.gray[400],
    letterSpacing: 1,
    marginTop: 6,
    marginLeft: 4,
    marginBottom: 2,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.gray[100],
    overflow: "hidden",
  },
  separator: {
    height: 1,
    backgroundColor: colors.gray[100],
    marginHorizontal: 14,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 13,
    gap: 12,
  },
  rowIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  rowText: { flex: 1 },
  rowLabel: { fontSize: 14, fontWeight: "700", color: colors.gray[900] },
  rowSublabel: { fontSize: 12, color: colors.gray[400], marginTop: 2 },
});
