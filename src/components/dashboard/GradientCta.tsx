import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import Feather from "@expo/vector-icons/Feather";
import { colors } from "@/components/ui/theme";

const TONES = {
  blue: { base: colors.bytecode[600], accent: colors.bytecode[400] },
  red: { base: colors.red[600], accent: colors.red[400] },
} as const;

/**
 * Full-width call-to-action card with the layered gradient look used by the
 * check-in/out buttons. Carries its own side + top margin, like the other
 * dashboard blocks, so the screen container needs no padding.
 */
export function GradientCta({
  icon,
  title,
  subtitle,
  tone = "blue",
  onPress,
  loading = false,
  disabled = false,
}: {
  icon: React.ComponentProps<typeof Feather>["name"];
  title: string;
  subtitle?: string;
  tone?: keyof typeof TONES;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
}) {
  const t = TONES[tone];
  const off = disabled || loading;

  return (
    <TouchableOpacity
      style={[s.card, off && s.cardOff]}
      onPress={onPress}
      disabled={off}
      activeOpacity={0.9}
    >
      <View style={[s.base, { backgroundColor: t.base }]} />
      <View style={[s.accent, { backgroundColor: t.accent }]} />
      <View style={s.inner}>
        <View style={s.titleRow}>
          <Feather name={icon} size={20} color="#fff" />
          <Text style={s.title}>{title}</Text>
        </View>
        {subtitle && <Text style={s.subtitle}>{subtitle}</Text>}
      </View>
      {loading ? (
        <ActivityIndicator color="#fff" />
      ) : (
        <Feather name="chevron-right" size={22} color="rgba(255,255,255,0.9)" />
      )}
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
  cardOff: { opacity: 0.6 },
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
