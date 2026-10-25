import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Platform,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import Feather from "@expo/vector-icons/Feather";
import { colors } from "@/components/ui/theme";

export function fmtTimeDisplay(d: Date) {
  return d.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

/** Labelled row that opens a picker. Shows a time unless `format` says otherwise. */
export function TimeField({
  icon = "clock",
  label,
  value,
  tint = colors.bytecode[600],
  tintBg = colors.bytecode[50],
  format = fmtTimeDisplay,
  onPress,
}: {
  icon?: React.ComponentProps<typeof Feather>["name"];
  label: string;
  value: Date;
  tint?: string;
  tintBg?: string;
  format?: (d: Date) => string;
  onPress: () => void;
}) {
  return (
    <View style={s.field}>
      <View style={[s.fieldIcon, { backgroundColor: tintBg }]}>
        <Feather name={icon} size={16} color={tint} />
      </View>
      <Text style={s.fieldLabel}>{label}</Text>
      <TouchableOpacity
        style={[s.fieldBtn, { backgroundColor: tintBg }]}
        onPress={onPress}
        activeOpacity={0.8}
      >
        <Text style={[s.fieldBtnText, { color: tint }]}>
          {format(value)}
        </Text>
        <Feather name="chevron-down" size={14} color={tint} />
      </TouchableOpacity>
    </View>
  );
}

/**
 * Cross-platform picker: Android renders the OS dialog inline, iOS gets a
 * bottom sheet with a Done button.
 */
export function TimePickerSheet({
  visible,
  value,
  title,
  mode = "time",
  minimumDate,
  maximumDate,
  onChange,
  onClose,
}: {
  visible: boolean;
  value: Date;
  title: string;
  mode?: "time" | "date";
  minimumDate?: Date;
  maximumDate?: Date;
  onChange: (d: Date) => void;
  onClose: () => void;
}) {
  function handle(_: unknown, selected?: Date) {
    if (Platform.OS === "android") onClose();
    if (selected) onChange(selected);
  }

  if (Platform.OS === "android") {
    return visible ? (
      <DateTimePicker
        value={value}
        mode={mode}
        display="default"
        minimumDate={minimumDate}
        maximumDate={maximumDate}
        onChange={handle}
      />
    ) : null;
  }

  return (
    <Modal
      transparent
      animationType="slide"
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={s.overlay}>
        <View style={s.sheet}>
          <View style={s.sheetHeader}>
            <Text style={s.sheetTitle}>{title}</Text>
            <TouchableOpacity onPress={onClose} hitSlop={8}>
              <Text style={s.done}>Done</Text>
            </TouchableOpacity>
          </View>
          <DateTimePicker
            value={value}
            mode={mode}
            display="spinner"
            minimumDate={minimumDate}
            maximumDate={maximumDate}
            onChange={handle}
            themeVariant="light"
            style={{ width: "100%" }}
          />
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  field: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#fff",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.gray[100],
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  fieldIcon: {
    width: 38,
    height: 38,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  fieldLabel: {
    flex: 1,
    fontSize: 14,
    fontWeight: "700",
    color: colors.gray[800],
  },
  fieldBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 12,
    paddingHorizontal: 13,
    paddingVertical: 9,
  },
  fieldBtnText: { fontSize: 14, fontWeight: "800" },

  overlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  sheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingBottom: 32,
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 18,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[100],
  },
  sheetTitle: { fontSize: 16, fontWeight: "800", color: colors.gray[900] },
  done: { fontSize: 15, fontWeight: "700", color: colors.bytecode[600] },
});
