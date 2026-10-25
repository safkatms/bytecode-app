import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import Feather from "@expo/vector-icons/Feather";
import { colors } from "@/components/ui/theme";

export type QuickAction = {
  icon: React.ComponentProps<typeof Feather>["name"];
  label: string;
  sub?: string;
  bg?: string;
  color?: string;
  path: string;
};

/**
 * `split` — up to 3 actions as divided columns with a description line.
 * `grid`  — any number of actions as wrapped tiles.
 */
export function QuickActions({
  items,
  layout = "split",
  onPress,
}: {
  items: QuickAction[];
  layout?: "split" | "grid";
  onPress: (path: string) => void;
}) {
  if (layout === "grid") {
    return (
      <View style={s.grid}>
        {items.map(({ icon, label, bg, color, path }) => (
          <TouchableOpacity
            key={label}
            style={s.gridItem}
            onPress={() => onPress(path)}
            activeOpacity={0.75}
          >
            <View
              style={[
                s.icon,
                { backgroundColor: bg ?? colors.bytecode[50] },
              ]}
            >
              <Feather
                name={icon}
                size={20}
                color={color ?? colors.bytecode[600]}
              />
            </View>
            <Text style={s.gridLabel} numberOfLines={1}>
              {label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  }

  return (
    <View style={s.splitCard}>
      {items.map(({ icon, label, sub, bg, color, path }, i) => (
        <React.Fragment key={label}>
          <TouchableOpacity
            style={s.splitItem}
            onPress={() => onPress(path)}
            activeOpacity={0.75}
          >
            <View
              style={[s.icon, { backgroundColor: bg ?? colors.bytecode[50] }]}
            >
              <Feather
                name={icon}
                size={20}
                color={color ?? colors.bytecode[600]}
              />
            </View>
            <View style={s.labelRow}>
              <Text style={s.label}>{label}</Text>
              <Feather
                name="chevron-right"
                size={14}
                color={colors.gray[400]}
              />
            </View>
            {sub && <Text style={s.sub}>{sub}</Text>}
          </TouchableOpacity>
          {i < items.length - 1 && <View style={s.divider} />}
        </React.Fragment>
      ))}
    </View>
  );
}

const s = StyleSheet.create({
  splitCard: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.gray[100],
    paddingVertical: 18,
  },
  splitItem: {
    flex: 1,
    alignItems: "flex-start",
    gap: 8,
    paddingHorizontal: 12,
  },
  divider: {
    width: 1,
    alignSelf: "stretch",
    backgroundColor: colors.gray[100],
  },
  icon: {
    width: 48,
    height: 48,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 2,
  },
  labelRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  label: { fontSize: 13, fontWeight: "800", color: colors.gray[900] },
  sub: { fontSize: 11, color: colors.gray[400], fontWeight: "500" },

  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  gridItem: {
    width: "31.5%",
    backgroundColor: "#fff",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.gray[100],
    alignItems: "center",
    gap: 8,
    paddingVertical: 16,
    paddingHorizontal: 6,
  },
  gridLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.gray[800],
    textAlign: "center",
  },
});
