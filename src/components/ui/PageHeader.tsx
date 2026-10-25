import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  type ViewStyle,
} from "react-native";
import Feather from "@expo/vector-icons/Feather";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors } from "@/components/ui/theme";

type HeaderVariant = "bytecode" | "white";
type BackIcon = "arrow-left" | "x";

export interface HeaderAction {
  icon: React.ComponentProps<typeof Feather>["name"];
  onPress: () => void;
  badge?: number;
}

export interface HeaderTextAction {
  label: string;
  onPress: () => void;
  disabled?: boolean;
}

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  variant?: HeaderVariant;
  backIcon?: BackIcon;
  rightActions?: HeaderAction[];
  rightTextAction?: HeaderTextAction; // for Save/Done text buttons
  /**
   * Let the header own the top safe-area inset so the gradient runs behind the
   * status bar, matching the dashboard hero. The screen must then stop applying
   * `paddingTop: insets.top` to its own root.
   */
  insetTop?: boolean;
  style?: ViewStyle;
}

const CONFIG: Record<
  HeaderVariant,
  {
    bg: string;
    borderColor?: string;
    titleColor: string;
    subtitleColor: string;
    iconColor: string;
    iconBg: string;
    iconBorder: string;
  }
> = {
  bytecode: {
    bg: "transparent",
    titleColor: "#fff",
    subtitleColor: "rgba(255,255,255,0.68)",
    iconColor: "#fff",
    iconBg: "rgba(255,255,255,0.15)",
    iconBorder: "rgba(255,255,255,0.14)",
  },
  white: {
    bg: "#fff",
    borderColor: colors.gray[100],
    titleColor: colors.gray[900],
    subtitleColor: colors.gray[400],
    iconColor: colors.gray[700],
    iconBg: colors.gray[50],
    iconBorder: colors.gray[100],
  },
};

export function PageHeader({
  title,
  subtitle,
  variant = "white",
  backIcon = "arrow-left",
  rightActions = [],
  rightTextAction,
  insetTop = false,
  style,
}: PageHeaderProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const cfg = CONFIG[variant];
  const isGradient = variant === "bytecode";

  return (
    <View
      style={[
        s.header,
        {
          paddingTop: (insetTop ? insets.top : 0) + 14,
          backgroundColor: cfg.bg,
          borderBottomColor: cfg.borderColor ?? "transparent",
          borderBottomWidth: cfg.borderColor ? 1 : 0,
        },
        style,
      ]}
    >
      {isGradient && (
        <>
          <View style={s.gradientBase} />
          <View style={s.gradientMid} />
          <View style={s.gradientBlobTop} />
          <View style={s.gradientBlobBottom} />
        </>
      )}

      {/* Back button */}
      <TouchableOpacity onPress={() => router.back()} hitSlop={8} activeOpacity={0.8}>
        <View
          style={[
            s.iconBtn,
            { backgroundColor: cfg.iconBg, borderColor: cfg.iconBorder },
          ]}
        >
          <Feather name={backIcon} size={18} color={cfg.iconColor} />
        </View>
      </TouchableOpacity>

      {/* Title */}
      <View style={s.titleWrap}>
        <Text
          style={[s.title, { color: cfg.titleColor }]}
          numberOfLines={1}
        >
          {title}
        </Text>
        {subtitle && (
          <Text
            style={[s.subtitle, { color: cfg.subtitleColor }]}
            numberOfLines={1}
          >
            {subtitle}
          </Text>
        )}
      </View>

      {/* Right side: text action takes priority, then icon actions */}
      {rightTextAction ? (
        <TouchableOpacity
          onPress={rightTextAction.onPress}
          hitSlop={8}
          disabled={rightTextAction.disabled}
          activeOpacity={0.8}
        >
          <View
            style={[
              s.textActionBtn,
              isGradient ? s.textActionBtnGradient : s.textActionBtnLight,
              rightTextAction.disabled && s.textActionBtnDisabled,
            ]}
          >
            <Text
              style={[
                s.textActionLabel,
                { color: isGradient ? "#fff" : colors.bytecode[700] },
              ]}
            >
              {rightTextAction.label}
            </Text>
          </View>
        </TouchableOpacity>
      ) : rightActions.length > 0 ? (
        <View style={s.rightGroup}>
          {rightActions.slice(0, 2).map((action, i) => (
            <TouchableOpacity
              key={i}
              onPress={action.onPress}
              hitSlop={8}
              activeOpacity={0.8}
            >
              <View
                style={[
                  s.iconBtn,
                  { backgroundColor: cfg.iconBg, borderColor: cfg.iconBorder },
                ]}
              >
                <Feather name={action.icon} size={18} color={cfg.iconColor} />
                {!!action.badge && action.badge > 0 && (
                  <View style={s.badge}>
                    <Text style={s.badgeText}>{action.badge}</Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          ))}
        </View>
      ) : (
        <View style={s.placeholder} />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingBottom: 14,
    overflow: "hidden",
    position: "relative",
  },

  // gradient layers — mirror the dashboard hero, tuned for a compact bar
  gradientBase: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.bytecode[800],
  },
  gradientMid: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: "25%",
    backgroundColor: colors.bytecode[600],
    opacity: 0.5,
    borderTopLeftRadius: 140,
    borderBottomLeftRadius: 100,
  },
  gradientBlobTop: {
    position: "absolute",
    width: 190,
    height: 190,
    borderRadius: 95,
    top: -115,
    right: -50,
    backgroundColor: colors.bytecode[500],
    opacity: 0.22,
  },
  gradientBlobBottom: {
    position: "absolute",
    width: 150,
    height: 150,
    borderRadius: 75,
    bottom: -105,
    left: -45,
    backgroundColor: colors.bytecode[500],
    opacity: 0.14,
  },

  titleWrap: { flex: 1 },
  title: { fontSize: 19, fontWeight: "800" },
  subtitle: { fontSize: 12, fontWeight: "500", marginTop: 2 },

  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  rightGroup: { flexDirection: "row", gap: 8 },
  placeholder: { width: 40 },

  badge: {
    position: "absolute",
    top: -4,
    right: -4,
    minWidth: 17,
    height: 17,
    paddingHorizontal: 4,
    borderRadius: 9,
    backgroundColor: colors.red[500],
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: { fontSize: 9, fontWeight: "800", color: "#fff" },

  textActionBtn: {
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderWidth: 1,
  },
  textActionBtnGradient: {
    borderColor: "rgba(255,255,255,0.18)",
    backgroundColor: "rgba(255,255,255,0.18)",
  },
  textActionBtnLight: {
    borderColor: colors.bytecode[100],
    backgroundColor: colors.bytecode[50],
  },
  textActionBtnDisabled: { opacity: 0.5 },
  textActionLabel: { fontSize: 14, fontWeight: "700" },
});
