import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import Feather from "@expo/vector-icons/Feather";
import { colors } from "@/components/ui/theme";

/** Section wrapper with a title, an optional info pill and an optional "See all" action. */
export function Section({
  title,
  pillIcon,
  pillText,
  onSeeAll,
  children,
}: {
  title: string;
  pillIcon?: React.ComponentProps<typeof Feather>["name"];
  pillText?: string;
  onSeeAll?: () => void;
  children: React.ReactNode;
}) {
  const hasAside = !!pillText || !!onSeeAll;
  return (
    <View style={s.section}>
      <View style={s.header}>
        <Text style={s.title}>{title}</Text>
        {hasAside &&
          (pillText ? (
            <View style={s.pill}>
              {pillIcon && (
                <Feather name={pillIcon} size={13} color={colors.gray[600]} />
              )}
              <Text style={s.pillText}>{pillText}</Text>
            </View>
          ) : (
            <TouchableOpacity
              onPress={onSeeAll}
              hitSlop={8}
              style={s.seeAll}
              activeOpacity={0.7}
            >
              <Text style={s.seeAllText}>See all</Text>
              <Feather
                name="chevron-right"
                size={14}
                color={colors.bytecode[600]}
              />
            </TouchableOpacity>
          ))}
      </View>
      {children}
    </View>
  );
}

/** Plain white rounded container used to group rows. */
export function Card({ children }: { children: React.ReactNode }) {
  return <View style={s.card}>{children}</View>;
}

export function CardDivider() {
  return <View style={s.divider} />;
}

const s = StyleSheet.create({
  section: { marginTop: 26, paddingHorizontal: 16, gap: 12 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10,
  },
  title: {
    fontSize: 21,
    lineHeight: 26,
    fontWeight: "800",
    color: colors.gray[900],
  },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    backgroundColor: "#fff",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.gray[200],
    paddingHorizontal: 13,
    paddingVertical: 8,
  },
  pillText: { fontSize: 13, fontWeight: "700", color: colors.gray[700] },
  seeAll: { flexDirection: "row", alignItems: "center", gap: 3 },
  seeAllText: { fontSize: 13, fontWeight: "700", color: colors.bytecode[600] },
  card: {
    backgroundColor: "#fff",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.gray[100],
    overflow: "hidden",
  },
  divider: { height: 1, backgroundColor: colors.gray[100], marginHorizontal: 16 },
});
