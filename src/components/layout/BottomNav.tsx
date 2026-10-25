import React, { useEffect, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
} from "react-native";
import { usePathname, useRouter } from "expo-router";
import Feather from "@expo/vector-icons/Feather";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors } from "../ui/theme";

type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentProps<typeof Feather>["name"];
  /** route prefixes that should light this tab up */
  match: string[];
};

const NAV: NavItem[] = [
  {
    href: "/(app)/dashboard",
    label: "Dashboard",
    icon: "home",
    // /dashboard only redirects — the rendered route is role-specific
    match: ["/dashboard", "/admin/dashboard", "/employee/dashboard"],
  },
  {
    href: "/(app)/attendance",
    label: "Attendance",
    icon: "clock",
    match: ["/attendance"],
  },
  { href: "/(app)/leave", label: "Leave", icon: "sun", match: ["/leave"] },
];

function NavTab({
  item,
  active,
  onPress,
}: {
  item: NavItem;
  active: boolean;
  onPress: () => void;
}) {
  const anim = useRef(new Animated.Value(active ? 1 : 0)).current;

  useEffect(() => {
    Animated.spring(anim, {
      toValue: active ? 1 : 0,
      useNativeDriver: true,
      speed: 20,
      bounciness: 6,
    }).start();
  }, [active, anim]);

  return (
    <TouchableOpacity style={s.tab} onPress={onPress} activeOpacity={0.7}>
      <View style={s.iconWrap}>
        <Animated.View
          style={[
            s.activePill,
            {
              opacity: anim,
              transform: [
                {
                  scale: anim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.7, 1],
                  }),
                },
              ],
            },
          ]}
        />
        <Feather
          name={item.icon}
          size={21}
          color={active ? colors.bytecode[600] : colors.gray[400]}
        />
      </View>
      <Text style={[s.label, active ? s.labelActive : s.labelInactive]}>
        {item.label}
      </Text>
    </TouchableOpacity>
  );
}

export function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View style={[s.nav, { paddingBottom: Math.max(insets.bottom, 10) }]}>
      {NAV.map((item) => {
        const active = item.match.some(
          (m) => pathname === m || pathname.startsWith(m + "/"),
        );
        return (
          <NavTab
            key={item.href}
            item={item}
            active={active}
            onPress={() => {
              if (!active) router.push(item.href as any);
            }}
          />
        );
      })}
    </View>
  );
}

const s = StyleSheet.create({
  nav: {
    flexDirection: "row",
    backgroundColor: "#fff",
    paddingTop: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.06,
    shadowRadius: 14,
    elevation: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.gray[100],
  },
  tab: { flex: 1, alignItems: "center", gap: 5 },
  iconWrap: {
    width: 60,
    height: 34,
    alignItems: "center",
    justifyContent: "center",
  },
  activePill: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 13,
    backgroundColor: colors.bytecode[50],
  },
  label: { fontSize: 11 },
  labelActive: { color: colors.bytecode[600], fontWeight: "700" },
  labelInactive: { color: colors.gray[400], fontWeight: "500" },
});
