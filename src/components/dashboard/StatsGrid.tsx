import React from "react";
import { View, Text, StyleSheet } from "react-native";
import Feather from "@expo/vector-icons/Feather";
import { colors } from "@/components/ui/theme";

export type StatItem = {
  label: string;
  value: number;
  icon: React.ComponentProps<typeof Feather>["name"];
  color: string;
  bg: string;
  wave: string;
};

export function StatsGrid({ items }: { items: StatItem[] }) {
  return (
    <View style={s.grid}>
      {items.map(({ label, value, icon, color, bg, wave }) => (
        <View key={label} style={[s.card, { backgroundColor: bg }]}>
          <View style={[s.wave, { backgroundColor: wave }]} />
          <View style={[s.icon, { backgroundColor: `${color}1A` }]}>
            <Feather name={icon} size={18} color={color} />
          </View>
          <Text style={[s.value, { color }]}>{value}</Text>
          <Text style={s.label}>{label}</Text>
        </View>
      ))}
    </View>
  );
}

/** Palettes that match the attendance status colours used across the app. */
export const STAT_PALETTE = {
  present: {
    color: colors.bytecode[600],
    bg: colors.bytecode[50],
    wave: colors.bytecode[100],
  },
  late: {
    color: colors.amber[500],
    bg: colors.amber[50],
    wave: colors.amber[100],
  },
  leave: { color: colors.red[500], bg: colors.red[50], wave: colors.red[100] },
  casual: { color: colors.red[500], bg: colors.red[50], wave: colors.red[100] },
  sick: {
    color: colors.pink[500],
    bg: colors.pink[50],
    wave: colors.pink[100],
  },
} as const;

const s = StyleSheet.create({
  grid: { flexDirection: "row", gap: 10 },
  card: {
    flex: 1,
    borderRadius: 18,
    paddingVertical: 18,
    paddingHorizontal: 10,
    alignItems: "center",
    gap: 7,
    overflow: "hidden",
    position: "relative",
  },
  wave: {
    position: "absolute",
    width: 220,
    height: 220,
    borderRadius: 110,
    bottom: -175,
    left: -40,
    opacity: 0.75,
  },
  icon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  value: { fontSize: 28, fontWeight: "900", lineHeight: 34 },
  label: { fontSize: 13, fontWeight: "600", color: colors.gray[600] },
});
