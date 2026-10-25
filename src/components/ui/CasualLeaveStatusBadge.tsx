import React from "react";
import { Text, View, StyleSheet } from "react-native";
import { colors } from "./theme";
import type { CasualLeaveStatus } from "@/types/casual-leave";

const MAP: Record<CasualLeaveStatus, { bg: string; fg: string; label: string }> = {
  pending: { bg: colors.amber[50], fg: colors.amber[700], label: "Pending" },
  approved: { bg: colors.green[50], fg: colors.green[700], label: "Approved" },
  rejected: { bg: colors.red[50], fg: colors.red[500], label: "Rejected" },
  cancelled: { bg: colors.gray[100], fg: colors.gray[500], label: "Cancelled" },
};

export function CasualLeaveStatusBadge({ status }: { status: CasualLeaveStatus }) {
  const c = MAP[status];
  return (
    <View style={[s.badge, { backgroundColor: c.bg }]}>
      <Text style={[s.text, { color: c.fg }]}>{c.label}</Text>
    </View>
  );
}

export function formatRange(start: string, end: string) {
  const f = (d: string) =>
    new Date(d).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
  return start.slice(0, 10) === end.slice(0, 10) ? f(start) : `${f(start)} – ${f(end)}`;
}

const s = StyleSheet.create({
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  text: { fontSize: 11, fontWeight: "700" },
});
