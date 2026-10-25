import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import Feather from "@expo/vector-icons/Feather";
import { colors } from "@/components/ui/theme";
import type { PresenceStatus } from "./usePresence";

export function DashboardHero({
  paddingTop,
  date,
  greeting,
  statusLabel,
  statusColor,
  presence,
  onSettings,
  overlap = 44,
  children,
}: {
  paddingTop: number;
  date: string;
  greeting: string;
  statusLabel?: string;
  statusColor?: string;
  presence: PresenceStatus;
  onSettings: () => void;
  /** empty space at the bottom for a card that floats over the hero */
  overlap?: number;
  children?: React.ReactNode;
}) {
  return (
    <View style={[s.hero, { paddingTop }]}>
      <View style={s.gradientBase} />
      <View style={s.gradientMid} />
      <View style={s.gradientBlobTop} />
      <View style={s.gradientBlobBottom} />

      <View style={s.header}>
        <View style={{ flex: 1 }}>
          <Text style={s.date}>{date}</Text>
          <Text style={s.greeting}>{greeting}</Text>
        </View>
        <TouchableOpacity
          onPress={onSettings}
          style={s.actionButton}
          hitSlop={8}
          activeOpacity={0.8}
        >
          <Feather name="settings" size={18} color="rgba(255,255,255,0.95)" />
        </TouchableOpacity>
      </View>

      {(statusLabel || presence === "at_office" || presence === "away") && (
        <View style={s.badgeRow}>
          {statusLabel && (
            <View style={s.statusBadge}>
              <View
                style={[
                  s.statusDot,
                  { backgroundColor: statusColor ?? colors.gray[400] },
                ]}
              />
              <Text style={s.statusBadgeText}>{statusLabel}</Text>
            </View>
          )}
          {presence !== "checking" && presence !== "no_location" && (
            <View
              style={[
                s.presenceBadge,
                presence === "at_office" ? s.presenceIn : s.presenceOut,
              ]}
            >
              <View
                style={[
                  s.presenceDot,
                  {
                    backgroundColor:
                      presence === "at_office" ? "#34D399" : "#F87171",
                  },
                ]}
              />
              <Feather name="map-pin" size={11} color="#fff" />
              <Text style={s.presenceText}>
                {presence === "at_office" ? "At office" : "Away"}
              </Text>
            </View>
          )}
        </View>
      )}

      {children}

      <View style={{ height: overlap }} />
    </View>
  );
}

const s = StyleSheet.create({
  hero: {
    paddingHorizontal: 20,
    paddingBottom: 0,
    gap: 16,
    overflow: "hidden",
    position: "relative",
  },
  gradientBase: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.bytecode[800],
  },
  gradientMid: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: "25%",
    backgroundColor: colors.bytecode[600],
    opacity: 0.5,
    borderTopLeftRadius: 200,
    borderBottomLeftRadius: 140,
  },
  gradientBlobTop: {
    position: "absolute",
    width: 260,
    height: 260,
    borderRadius: 130,
    top: -130,
    right: -70,
    backgroundColor: colors.bytecode[500],
    opacity: 0.22,
  },
  gradientBlobBottom: {
    position: "absolute",
    width: 200,
    height: 200,
    borderRadius: 100,
    bottom: -120,
    left: -60,
    backgroundColor: colors.bytecode[500],
    opacity: 0.14,
  },
  header: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  date: { fontSize: 13, fontWeight: "500", color: "rgba(255,255,255,0.68)" },
  greeting: {
    marginTop: 4,
    fontSize: 27,
    lineHeight: 34,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  actionButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
    marginTop: 4,
  },
  badgeRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 22,
    paddingHorizontal: 14,
    paddingVertical: 9,
    backgroundColor: "rgba(0,0,0,0.22)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },
  statusDot: { width: 9, height: 9, borderRadius: 5 },
  statusBadgeText: { fontSize: 13, fontWeight: "600", color: "#fff" },
  presenceBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 13,
    paddingVertical: 9,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },
  presenceIn: { backgroundColor: "rgba(16,122,101,0.5)" },
  presenceOut: { backgroundColor: "rgba(185,28,28,0.4)" },
  presenceDot: { width: 8, height: 8, borderRadius: 4 },
  presenceText: { fontSize: 13, fontWeight: "600", color: "#fff" },
});
