// app/(app)/admin/menu/index.tsx

import React from "react";
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Feather from "@expo/vector-icons/Feather";
import { PageHeader } from "@/components/ui/PageHeader";
import { colors } from "@/components/ui/theme";

type MenuItem = {
  icon: React.ComponentProps<typeof Feather>["name"];
  label: string;
  sublabel: string;
  path: string;
};

const SECTIONS: { title: string; items: MenuItem[] }[] = [
  {
    title: "PEOPLE",
    items: [
      {
        icon: "users",
        label: "Employees",
        sublabel: "Create and manage employees",
        path: "/(app)/admin/employees",
      },
      {
        icon: "briefcase",
        label: "Departments",
        sublabel: "Create and manage departments",
        path: "/(app)/admin/departments",
      },
      {
        icon: "share-2",
        label: "Teams",
        sublabel: "Create and manage teams",
        path: "/(app)/admin/teams",
      },
    ],
  },
  {
    title: "ATTENDANCE",
    items: [
      {
        icon: "calendar",
        label: "Attendance",
        sublabel: "View and manage attendance records",
        path: "/(app)/admin/attendance",
      },
      {
        icon: "thermometer",
        label: "Sick Leave",
        sublabel: "Review sick leave requests",
        path: "/(app)/admin/sick-leave",
      },
      {
        icon: "bar-chart-2",
        label: "Reports",
        sublabel: "Attendance reports and exports",
        path: "/(app)/admin/attendance/reports",
      },
    ],
  },
  {
    title: "SETTINGS",
    items: [
      {
        icon: "map-pin",
        label: "Office Location",
        sublabel: "Set up office location and radius",
        path: "/(app)/admin/locations",
      },
      {
        icon: "repeat",
        label: "Switch User",
        sublabel: "View the app as another user",
        path: "/(app)/switch-user",
      },
    ],
  },
];

function MenuRow({ item, onPress }: { item: MenuItem; onPress: () => void }) {
  return (
    <TouchableOpacity style={s.row} onPress={onPress} activeOpacity={0.7}>
      <View style={s.rowIcon}>
        <Feather name={item.icon} size={17} color={colors.bytecode[600]} />
      </View>
      <View style={s.rowText}>
        <Text style={s.rowLabel}>{item.label}</Text>
        <Text style={s.rowSublabel}>{item.sublabel}</Text>
      </View>
      <Feather name="chevron-right" size={16} color={colors.gray[300]} />
    </TouchableOpacity>
  );
}

export default function AdminMenuScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      <PageHeader title="Admin Menu" variant="bytecode" />
      <ScrollView
        contentContainerStyle={[s.content, { paddingBottom: insets.bottom + 32 }]}
        showsVerticalScrollIndicator={false}
      >
        {SECTIONS.map((section) => (
          <React.Fragment key={section.title}>
            <Text style={s.sectionLabel}>{section.title}</Text>
            <View style={s.card}>
              {section.items.map((item, index) => (
                <React.Fragment key={item.label}>
                  <MenuRow item={item} onPress={() => router.push(item.path as any)} />
                  {index < section.items.length - 1 && <View style={s.separator} />}
                </React.Fragment>
              ))}
            </View>
          </React.Fragment>
        ))}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.gray[50] },
  content: { padding: 16, gap: 10 },
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
    backgroundColor: colors.bytecode[50],
    alignItems: "center",
    justifyContent: "center",
  },
  rowText: { flex: 1 },
  rowLabel: { fontSize: 14, fontWeight: "700", color: colors.gray[900] },
  rowSublabel: { fontSize: 12, color: colors.gray[400], marginTop: 2 },
});
