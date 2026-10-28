import React from "react";
import { View, Text, StyleSheet } from "react-native";
import Feather from "@expo/vector-icons/Feather";
import { colors } from "@/components/ui/theme";
import { FloatingCard, type FloatingMetric } from "@/components/dashboard";
import type { SickLeaveBalance } from "@/types/sick-leave";
import type { CasualLeaveBalance } from "@/types/casual-leave";
import { LEAVE_KIND, type LeaveKind } from "./kinds";

const show = (v: number | null | undefined) => (v == null ? "—" : String(v));

// Plain value-over-label columns with no icons. The only colour is on
// Remaining, where it carries meaning (green = days left, red = none).
function metricsFor(
  kind: LeaveKind,
  b?: SickLeaveBalance | CasualLeaveBalance,
): FloatingMetric[] {
  const remaining = b?.remainingDays;
  const m = (key: string, label: string, v: number | null | undefined) =>
    ({ key, label, value: show(v), emphasize: true }) satisfies FloatingMetric;

  const remainingMetric: FloatingMetric = {
    ...m("remaining", "Remaining", remaining),
    valueColor: (remaining ?? 0) > 0 ? colors.green[600] : colors.red[500],
  };

  if (kind === "sick") {
    const sb = b as SickLeaveBalance | undefined;
    return [
      m("total", "Total", sb?.totalDays),
      m("used", "Used", b?.usedDays),
      remainingMetric,
    ];
  }

  const cb = b as CasualLeaveBalance | undefined;
  return [
    m("allocated", "Allocated", cb?.allocatedDays),
    m("carry", "Carry fwd", cb?.carryForwardDays),
    m("earned", "Earned", cb?.earnedDays),
    m("used", "Used", b?.usedDays),
    remainingMetric,
  ];
}

/** Balance card for one leave type, plus a note when no policy is set. */
export function LeaveBalance({
  kind,
  balance,
  year,
}: {
  kind: LeaveKind;
  balance?: SickLeaveBalance | CasualLeaveBalance;
  year: number;
}) {
  const cfg = LEAVE_KIND[kind];
  const noPolicy = !!balance && balance.totalDays === null;

  return (
    <>
      <View style={s.wrap}>
        <FloatingCard
          float={false}
          valueFirst
          metrics={metricsFor(kind, balance)}
        />
      </View>

      {noPolicy && (
        <View style={s.noPolicy}>
          <Feather name="alert-circle" size={14} color={colors.amber[700]} />
          <Text style={s.noPolicyText}>
            No {cfg.label.toLowerCase()} policy is set for {year}.
          </Text>
        </View>
      )}
    </>
  );
}

const s = StyleSheet.create({
  wrap: { paddingHorizontal: 16, paddingTop: 12 },
  noPolicy: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginHorizontal: 16,
    marginTop: 10,
    backgroundColor: colors.amber[50],
    borderRadius: 14,
    paddingHorizontal: 13,
    paddingVertical: 11,
  },
  noPolicyText: {
    flex: 1,
    fontSize: 12.5,
    fontWeight: "600",
    color: colors.amber[700],
  },
});
