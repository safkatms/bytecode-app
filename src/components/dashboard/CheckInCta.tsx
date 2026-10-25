import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import Feather from "@expo/vector-icons/Feather";
import { colors } from "@/components/ui/theme";

export function CheckInCta({
  variant,
  onPress,
}: {
  variant: "in" | "out";
  onPress: () => void;
}) {
  const isIn = variant === "in";
  return (
    <TouchableOpacity style={s.card} onPress={onPress} activeOpacity={0.9}>
      <View
        style={[
          s.base,
          { backgroundColor: isIn ? colors.bytecode[600] : colors.red[600] },
        ]}
      />
      <View
        style={[
          s.accent,
          { backgroundColor: isIn ? colors.bytecode[400] : colors.red[400] },
        ]}
      />
      <View style={s.inner}>
        <View style={s.titleRow}>
          <Feather name={isIn ? "map-pin" : "log-out"} size={20} color="#fff" />
          <Text style={s.title}>{isIn ? "Check in now" : "Check out"}</Text>
        </View>
        <Text style={s.subtitle}>
          {isIn
            ? "Verify your location and start your workday"
            : "End your workday and log your hours"}
        </Text>
      </View>
      <Feather name="chevron-right" size={22} color="rgba(255,255,255,0.9)" />
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 20,
    paddingVertical: 20,
    paddingHorizontal: 20,
    overflow: "hidden",
    position: "relative",
  },
  base: { ...StyleSheet.absoluteFillObject },
  accent: {
    position: "absolute",
    width: 220,
    height: 220,
    borderRadius: 110,
    top: -100,
    left: -50,
    opacity: 0.3,
  },
  inner: { flex: 1, alignItems: "center", gap: 5 },
  titleRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  title: { fontSize: 20, fontWeight: "800", color: "#fff" },
  subtitle: {
    fontSize: 13,
    color: "rgba(255,255,255,0.82)",
    fontWeight: "500",
    textAlign: "center",
  },
});
