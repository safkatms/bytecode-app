import React from "react";
import { Text, StyleSheet, TouchableOpacity } from "react-native";
import Feather from "@expo/vector-icons/Feather";

export type DashboardMode = "me" | "admin";

/** Small pill shown beside the location badge; flips between the admin's own and the admin dashboard. */
export function ViewSwitch({
  value,
  onChange,
}: {
  value: DashboardMode;
  onChange: (mode: DashboardMode) => void;
}) {
  const next: DashboardMode = value === "me" ? "admin" : "me";
  return (
    <TouchableOpacity
      style={s.btn}
      onPress={() => onChange(next)}
      activeOpacity={0.85}
      hitSlop={6}
    >
      <Feather name="repeat" size={12} color="#fff" />
      <Text style={s.label}>{value === "me" ? "Admin view" : "My view"}</Text>
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  btn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 13,
    paddingVertical: 9,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.2)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
  },
  label: { fontSize: 13, fontWeight: "700", color: "#fff" },
});
