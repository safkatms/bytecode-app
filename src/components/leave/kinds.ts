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

const SickLeaveColor = {
  color: colors.pink[600],
  tint: colors.pink[50],
  tile: colors.pink[100],
};

const CasualLeaveColor = {
  color: colors.red[600],
  tint: colors.red[50],
  tile: colors.red[100],
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
  sick: { label: "Sick leave", icon: "thermometer", ...SickLeaveColor },
  casual: { label: "Casual leave", icon: "umbrella", ...CasualLeaveColor },
};
