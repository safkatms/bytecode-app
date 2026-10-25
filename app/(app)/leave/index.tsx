// app/(app)/leave/index.tsx

import React, { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import Feather from "@expo/vector-icons/Feather";
import { colors } from "@/components/ui/theme";
import { PageHeader } from "@/components/ui/PageHeader";
import { YearNav } from "@/components/ui/YearNav";
import { LeaveTab, LEAVE_KIND, type LeaveKind } from "@/components/leave";

const TABS: LeaveKind[] = ["sick", "casual"];

export default function LeaveScreen() {
  const [tab, setTab] = useState<LeaveKind>("sick");
  const [year, setYear] = useState(new Date().getFullYear());

  return (
    <View style={s.root}>
      <PageHeader title="Leave" variant="bytecode" insetTop />

      {/* Segmented switcher: the active type lifts onto a white tile */}
      <View style={s.tabBar}>
        {TABS.map((kind) => {
          const cfg = LEAVE_KIND[kind];
          const active = tab === kind;
          return (
            <TouchableOpacity
              key={kind}
              style={[s.tabBtn, active && s.tabBtnActive]}
              onPress={() => setTab(kind)}
              activeOpacity={0.8}
            >
              <View
                style={[
                  s.tabIcon,
                  { backgroundColor: active ? cfg.tint : "transparent" },
                ]}
              >
                <Feather
                  name={cfg.icon}
                  size={15}
                  color={active ? cfg.color : colors.gray[400]}
                />
              </View>
              <Text style={[s.tabText, active && s.tabTextActive]}>
                {cfg.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <YearNav year={year} onChange={setYear} />

      <LeaveTab key={tab} kind={tab} year={year} />
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.gray[50] },

  tabBar: {
    flexDirection: "row",
    marginHorizontal: 16,
    marginTop: 14,
    backgroundColor: colors.gray[100],
    borderRadius: 18,
    padding: 4,
    gap: 4,
  },
  tabBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 8,
    borderRadius: 14,
  },
  tabBtnActive: {
    backgroundColor: "#fff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  tabIcon: {
    width: 28,
    height: 28,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  tabText: { fontSize: 13, fontWeight: "700", color: colors.gray[500] },
  tabTextActive: { color: colors.gray[900] },
});
