import React from "react";
import { View, Text, StyleSheet } from "react-native";
import Feather from "@expo/vector-icons/Feather";
import { colors } from "@/components/ui/theme";

/** Standalone card with an icon tile, a title/meta block and a trailing badge. */
export function InfoCard({
  icon,
  iconBg = colors.bytecode[50],
  iconColor = colors.bytecode[600],
  title,
  metaIcon,
  meta,
  badgeText,
  badgeColor = colors.green[700],
  badgeBg = colors.green[50],
  badgeDotColor = colors.green[500],
}: {
  icon: React.ComponentProps<typeof Feather>["name"];
  iconBg?: string;
  iconColor?: string;
  title: string;
  metaIcon?: React.ComponentProps<typeof Feather>["name"];
  meta?: string;
  badgeText?: string;
  badgeColor?: string;
  badgeBg?: string;
  badgeDotColor?: string;
}) {
  return (
    <View style={s.infoCard}>
      <View style={[s.infoWave, { backgroundColor: iconBg }]} />
      <View style={[s.infoIcon, { backgroundColor: iconBg }]}>
        <Feather name={icon} size={20} color={iconColor} />
      </View>
      <View style={s.infoBody}>
        <Text style={s.infoTitle} numberOfLines={1}>
          {title}
        </Text>
        {meta && (
          <View style={s.infoMetaRow}>
            {metaIcon && (
              <Feather name={metaIcon} size={11} color={colors.gray[400]} />
            )}
            <Text style={s.infoMeta}>{meta}</Text>
          </View>
        )}
      </View>
      {badgeText && (
        <View style={[s.infoBadge, { backgroundColor: badgeBg }]}>
          <View style={[s.infoBadgeDot, { backgroundColor: badgeDotColor }]} />
          <Text style={[s.infoBadgeText, { color: badgeColor }]}>
            {badgeText}
          </Text>
        </View>
      )}
    </View>
  );
}

/** Row with initials avatar, name/meta and a coloured status pill. */
export function PersonRow({
  name,
  meta,
  pillLabel,
  pillColor,
}: {
  name: string;
  meta: string;
  pillLabel: string;
  pillColor: string;
}) {
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <View style={s.personRow}>
      <View style={[s.avatar, { backgroundColor: `${pillColor}18` }]}>
        <Text style={[s.avatarText, { color: pillColor }]}>{initials}</Text>
      </View>
      <View style={s.personBody}>
        <Text style={s.personName} numberOfLines={1}>
          {name}
        </Text>
        <Text style={s.personMeta}>{meta}</Text>
      </View>
      <View style={[s.pill, { backgroundColor: `${pillColor}15` }]}>
        <Text style={[s.pillText, { color: pillColor }]}>{pillLabel}</Text>
      </View>
    </View>
  );
}

/** Row with a label, a percentage and a progress bar. */
export function ProgressRow({
  label,
  pct,
  meta,
  color,
}: {
  label: string;
  pct: number;
  meta: string;
  color: string;
}) {
  return (
    <View style={s.progressRow}>
      <View style={s.progressHeader}>
        <Text style={s.progressLabel} numberOfLines={1}>
          {label}
        </Text>
        <Text style={s.progressPct}>{pct}%</Text>
      </View>
      <View style={s.progressTrack}>
        <View
          style={[s.progressFill, { width: `${pct}%`, backgroundColor: color }]}
        />
      </View>
      <Text style={s.progressMeta}>{meta}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  infoCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 13,
    backgroundColor: "#fff",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.gray[100],
    paddingHorizontal: 15,
    paddingVertical: 15,
    overflow: "hidden",
    position: "relative",
  },
  infoWave: {
    position: "absolute",
    width: 200,
    height: 200,
    borderRadius: 100,
    bottom: -168,
    left: -30,
    opacity: 0.8,
  },
  infoIcon: {
    width: 46,
    height: 46,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  infoBody: { flex: 1, gap: 4 },
  infoTitle: { fontSize: 14, fontWeight: "800", color: colors.gray[900] },
  infoMetaRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  infoMeta: { fontSize: 11, color: colors.gray[400], fontWeight: "500" },
  infoBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  infoBadgeDot: { width: 6, height: 6, borderRadius: 3 },
  infoBadgeText: { fontSize: 11, fontWeight: "700" },

  personRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { fontSize: 13, fontWeight: "900" },
  personBody: { flex: 1, gap: 2 },
  personName: { fontSize: 14, fontWeight: "800", color: colors.gray[900] },
  personMeta: { fontSize: 11, color: colors.gray[400], fontWeight: "500" },
  pill: { borderRadius: 20, paddingHorizontal: 11, paddingVertical: 6 },
  pillText: { fontSize: 11, fontWeight: "700" },

  progressRow: { paddingHorizontal: 16, paddingVertical: 14, gap: 7 },
  progressHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
  },
  progressLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.gray[800],
    flex: 1,
  },
  progressPct: { fontSize: 14, fontWeight: "900", color: colors.gray[900] },
  progressTrack: {
    height: 7,
    borderRadius: 4,
    backgroundColor: colors.gray[100],
    overflow: "hidden",
  },
  progressFill: { height: 7, borderRadius: 4, minWidth: 4 },
  progressMeta: { fontSize: 11, color: colors.gray[400], fontWeight: "500" },
});
