import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import Feather from "@expo/vector-icons/Feather";
import { colors } from "./theme";

export function YearNav({
  year,
  onChange,
}: {
  year: number;
  onChange: (year: number) => void;
}) {
  const current = new Date().getFullYear();
  const isCurrent = year >= current;

  return (
    <View style={s.nav}>
      <TouchableOpacity onPress={() => onChange(year - 1)} style={s.navBtn} hitSlop={8}>
        <Feather name="chevron-left" size={20} color={colors.bytecode[600]} />
      </TouchableOpacity>

      <TouchableOpacity
        style={s.labelWrap}
        onPress={() => onChange(current)}
        disabled={isCurrent}
        hitSlop={8}
      >
        <Text style={s.label}>{year}</Text>
        {!isCurrent && <Text style={s.todayLink}>Back to current</Text>}
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => onChange(year + 1)}
        style={[s.navBtn, isCurrent && s.navBtnOff]}
        disabled={isCurrent}
        hitSlop={8}
      >
        <Feather
          name="chevron-right"
          size={20}
          color={isCurrent ? colors.gray[300] : colors.bytecode[600]}
        />
      </TouchableOpacity>
    </View>
  );
}

const s = StyleSheet.create({
  nav: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#fff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.gray[100],
    padding: 12,
    marginHorizontal: 16,
    marginTop: 10,
  },
  navBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.bytecode[50],
    alignItems: "center",
    justifyContent: "center",
  },
  navBtnOff: { backgroundColor: colors.gray[50] },
  labelWrap: { flex: 1, alignItems: "center", gap: 4 },
  label: { fontSize: 15, fontWeight: "800", color: colors.gray[900] },
  todayLink: { fontSize: 11, color: colors.bytecode[500], fontWeight: "600" },
});
