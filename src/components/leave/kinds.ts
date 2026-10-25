import type Feather from "@expo/vector-icons/Feather";
import type React from "react";
import { colors } from "@/components/ui/theme";

export type LeaveKind = "sick" | "casual";

type Icon = React.ComponentProps<typeof Feather>["name"];

const ACCENT = {
  color: colors.bytecode[600],
  tint: colors.bytecode[50],
  tile: colors.bytecode[100],
};

/**
 * Icon per leave type. Both share the app's bytecode accent; swap `ACCENT` for
 * per-type colours here if they ever need to be told apart by colour.
 */
export const LEAVE_KIND: Record<
  LeaveKind,
  {
    label: string;
    icon: Icon;
    color: string;
    tint: string;
    tile: string;
  }
> = {
  sick: { label: "Sick leave", icon: "thermometer", ...ACCENT },
  casual: { label: "Casual leave", icon: "umbrella", ...ACCENT },
};
