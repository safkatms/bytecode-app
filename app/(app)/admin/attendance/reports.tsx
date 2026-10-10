import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Feather from "@expo/vector-icons/Feather";
import { PageHeader } from "@/components/ui/PageHeader";
import { colors } from "@/components/ui/theme";

export default function ReportsScreen() {
  const insets = useSafeAreaInsets();

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      <PageHeader title="Reports" variant="bytecode" />

      <View style={[s.body, { paddingBottom: insets.bottom + 32 }]}>
        <View style={s.card}>
          <View style={s.iconWrap}>
            <Feather name="bar-chart-2" size={40} color={colors.bytecode[400]} />
          </View>
          <Text style={s.title}>Coming Soon</Text>
          <Text style={s.sub}>
            Attendance reports, export to CSV/PDF, and advanced analytics are
            on the way.
          </Text>
          <View style={s.chips}>
            {[
              "Monthly Summary",
              "Late Report",
              "Leave Overview",
              "Export to PDF",
              "Export to CSV",
            ].map((label) => (
              <View key={label} style={s.chip}>
                <Feather name="clock" size={11} color={colors.bytecode[400]} />
                <Text style={s.chipText}>{label}</Text>
              </View>
            ))}
          </View>
        </View>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.gray[50] },
  body: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  card: {
    width: "100%",
    backgroundColor: "#fff",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.gray[100],
    padding: 32,
    alignItems: "center",
    gap: 16,
  },
  iconWrap: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: colors.bytecode[50],
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  title: {
    fontSize: 22,
    fontWeight: "800",
    color: colors.gray[900],
    letterSpacing: -0.3,
  },
  sub: {
    fontSize: 14,
    color: colors.gray[400],
    textAlign: "center",
    lineHeight: 21,
  },
  chips: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 8,
    marginTop: 8,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: colors.bytecode[50],
    borderWidth: 1,
    borderColor: colors.bytecode[100],
  },
  chipText: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.bytecode[600],
  },
});
