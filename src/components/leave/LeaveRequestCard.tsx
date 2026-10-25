import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import Feather from "@expo/vector-icons/Feather";
import { colors } from "@/components/ui/theme";
import { LEAVE_KIND, type LeaveKind } from "./kinds";

/** One leave request: date tile, range, day count, status badge, notes, cancel. */
export function LeaveRequestCard({
  kind,
  startDate,
  range,
  totalDays,
  badge,
  reason,
  reviewNote,
  onCancel,
}: {
  kind: LeaveKind;
  startDate: string;
  /** already-formatted "12 Oct – 14 Oct 2026" style label */
  range: string;
  totalDays: number;
  badge: React.ReactNode;
  reason?: string | null;
  reviewNote?: string | null;
  /** shown only when provided (i.e. the request is still pending) */
  onCancel?: () => void;
}) {
  const cfg = LEAVE_KIND[kind];
  const d = new Date(startDate);
  const day = d.getDate();
  const month = d.toLocaleDateString("en-US", { month: "short" });

  return (
    <View style={s.card}>
      <View style={s.top}>
        <View style={[s.tile, { backgroundColor: cfg.tint }]}>
          <Text style={[s.tileDay, { color: cfg.color }]}>{day}</Text>
          <Text style={[s.tileMonth, { color: cfg.color }]}>{month}</Text>
        </View>

        <View style={s.body}>
          <Text style={s.range} numberOfLines={2}>
            {range}
          </Text>
          <View style={s.metaRow}>
            <Feather name="sun" size={11} color={colors.gray[400]} />
            <Text style={s.meta}>
              {totalDays} working day{totalDays > 1 ? "s" : ""}
            </Text>
          </View>
        </View>

        {badge}
      </View>

      {reason ? <Text style={s.reason}>{reason}</Text> : null}

      {reviewNote ? (
        <View style={s.note}>
          <Feather name="message-square" size={12} color={colors.gray[400]} />
          <Text style={s.noteText}>{reviewNote}</Text>
        </View>
      ) : null}

      {onCancel && (
        <TouchableOpacity
          style={s.cancelBtn}
          onPress={onCancel}
          activeOpacity={0.8}
        >
          <Feather name="x-circle" size={13} color={colors.red[500]} />
          <Text style={s.cancelText}>Cancel request</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  card: {
    backgroundColor: "#fff",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.gray[100],
    marginHorizontal: 16,
    padding: 14,
    gap: 12,
  },
  top: { flexDirection: "row", alignItems: "center", gap: 12 },
  tile: {
    width: 48,
    height: 52,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  tileDay: { fontSize: 19, fontWeight: "900", lineHeight: 23 },
  tileMonth: { fontSize: 10, fontWeight: "700", textTransform: "uppercase" },
  body: { flex: 1, gap: 4 },
  range: { fontSize: 14, fontWeight: "800", color: colors.gray[900] },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  meta: { fontSize: 12, color: colors.gray[500], fontWeight: "500" },

  reason: { fontSize: 13, lineHeight: 19, color: colors.gray[700] },
  note: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    backgroundColor: colors.gray[50],
    borderRadius: 12,
    padding: 11,
  },
  noteText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 17,
    color: colors.gray[500],
    fontStyle: "italic",
  },

  cancelBtn: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-end",
    gap: 6,
    backgroundColor: colors.red[50],
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  cancelText: { fontSize: 12, fontWeight: "700", color: colors.red[500] },
});
