import React from "react";
import { View, Text, StyleSheet } from "react-native";
import Feather from "@expo/vector-icons/Feather";
import { colors } from "@/components/ui/theme";

export type FloatingMetric = {
  key: string;
  icon: React.ComponentProps<typeof Feather>["name"];
  iconBg: string;
  iconColor: string;
  label: string;
  value: string;
  sub?: string;
  emphasize?: boolean;
};

/**
 * White card with evenly divided metric columns. Floats up over the hero by
 * default; pass `float={false}` to use it as a normal in-flow card.
 */
export function FloatingCard({
  title,
  pillIcon = "calendar",
  pillText,
  pillColor = colors.bytecode[700],
  pillBg = colors.bytecode[50],
  float = true,
  metrics,
}: {
  title: string;
  pillIcon?: React.ComponentProps<typeof Feather>["name"] | null;
  pillText?: string;
  pillColor?: string;
  pillBg?: string;
  float?: boolean;
  metrics: FloatingMetric[];
}) {
  return (
    <View style={[s.card, !float && s.cardFlat]}>
      <View style={s.header}>
        <Text style={s.title}>{title}</Text>
        {pillText && (
          <View style={[s.pill, { backgroundColor: pillBg }]}>
            {pillIcon && (
              <Feather name={pillIcon} size={13} color={pillColor} />
            )}
            <Text style={[s.pillText, { color: pillColor }]}>{pillText}</Text>
          </View>
        )}
      </View>

      <View style={s.body}>
        {metrics.map((m, i) => (
          <React.Fragment key={m.key}>
            <View style={s.item}>
              <View style={[s.icon, { backgroundColor: m.iconBg }]}>
                <Feather name={m.icon} size={18} color={m.iconColor} />
              </View>
              <Text style={s.label}>{m.label}</Text>
              <Text style={m.emphasize ? s.valueBig : s.value}>{m.value}</Text>
              {m.sub && <Text style={s.sub}>{m.sub}</Text>}
            </View>
            {i < metrics.length - 1 && <View style={s.divider} />}
          </React.Fragment>
        ))}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  card: {
    backgroundColor: "#fff",
    borderRadius: 22,
    marginHorizontal: 16,
    marginTop: -34,
    paddingVertical: 18,
    paddingHorizontal: 16,
    gap: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.09,
    shadowRadius: 18,
    elevation: 7,
  },
  cardFlat: {
    marginHorizontal: 0,
    marginTop: 0,
    shadowOpacity: 0,
    elevation: 0,
    borderWidth: 1,
    borderColor: colors.gray[100],
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  title: { fontSize: 17, fontWeight: "800", color: colors.gray[900], flex: 1 },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  pillText: { fontSize: 12, fontWeight: "700" },
  body: { flexDirection: "row", alignItems: "flex-start" },
  item: { flex: 1, alignItems: "center", gap: 6, paddingHorizontal: 4 },
  icon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 2,
  },
  label: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.gray[700],
    textAlign: "center",
  },
  value: { fontSize: 17, fontWeight: "800", color: colors.gray[900] },
  valueBig: { fontSize: 19, fontWeight: "900", color: colors.gray[900] },
  sub: {
    fontSize: 10,
    color: colors.gray[400],
    fontWeight: "500",
    textAlign: "center",
  },
  divider: {
    width: 1,
    alignSelf: "stretch",
    backgroundColor: colors.gray[100],
    marginVertical: 6,
  },
});
