// app/(app)/leave/apply-sick.tsx

import React, { useState } from "react";
import {
  View, Text, StyleSheet, ScrollView, Alert,
  TouchableOpacity, KeyboardAvoidingView, Platform, TextInput, Modal,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Feather from "@expo/vector-icons/Feather";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { applySickLeave, getMySickLeaveBalance } from "@/lib/api/sick-leave.api";
import { getApiErrorMessage } from "@/lib/api-error";
import { colors } from "@/components/ui/theme";
import { PageHeader } from "@/components/ui/PageHeader";
import { AlertUI } from "@/components/ui/Alert";

// ─── Helpers ──────────────────────────────────────────────────

function pad(n: number) {
  return String(n).padStart(2, "0");
}
function toIso(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
function fromIso(iso: string) {
  return new Date(`${iso}T00:00:00`);
}
function displayFmt(iso: string) {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

type PickerTarget = "start" | "end";

// ─── Date Field ───────────────────────────────────────────────

function DateField({
  label,
  value,
  onPress,
}: {
  label: string;
  value: string;
  onPress: () => void;
}) {
  return (
    <View style={s.field}>
      <Text style={s.label}>{label}</Text>
      <TouchableOpacity style={s.inputRow} onPress={onPress} activeOpacity={0.7}>
        <View style={s.inputPrefix}>
          <Feather name="calendar" size={14} color={colors.bytecode[500]} />
        </View>
        <Text style={[s.textInput, { lineHeight: 50, color: value ? colors.gray[900] : colors.gray[400] }]}>
          {value ? displayFmt(value) : "Select date"}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────

export default function ApplySickLeaveScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();

  const year = new Date().getFullYear();
  const balanceQ = useQuery({
    queryKey: ["sick-leave-balance", year],
    queryFn: () => getMySickLeaveBalance(year),
  });

  const [startDate, setStartDate] = useState(toIso(new Date()));
  const [endDate, setEndDate] = useState(toIso(new Date()));
  const [reason, setReason] = useState("");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [activePicker, setActivePicker] = useState<PickerTarget | null>(null);

  const mut = useMutation({
    mutationFn: applySickLeave,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sick-leave-mine"] });
      qc.invalidateQueries({ queryKey: ["sick-leave-balance"] });
      Alert.alert("Submitted", "Your sick leave request has been submitted.");
      router.back();
    },
    onError: (e) => setSubmitError(getApiErrorMessage(e, "Failed to submit request")),
  });

  function applyPicked(target: PickerTarget, date: Date) {
    const iso = toIso(date);
    if (target === "start") {
      setStartDate(iso);
      if (endDate < iso) setEndDate(iso);
    } else {
      setEndDate(iso);
    }
  }

  function handleChange(_: unknown, date?: Date) {
    const target = activePicker;
    if (Platform.OS === "android") setActivePicker(null);
    if (date && target) applyPicked(target, date);
  }

  function submit() {
    setSubmitError(null);
    if (endDate < startDate) return setSubmitError("End date must be on or after start date");
    mut.mutate({ startDate, endDate, reason: reason.trim() || undefined });
  }

  const pickerValue = fromIso(activePicker === "end" ? endDate : startDate);
  const minDate = activePicker === "end" ? fromIso(startDate) : undefined;

  return (
    <KeyboardAvoidingView
      style={s.root}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <PageHeader
        title="Apply Sick Leave"
        variant="bytecode"
        insetTop
        rightTextAction={{
          label: mut.isPending ? "Saving…" : "Submit",
          onPress: submit,
          disabled: mut.isPending,
        }}
      />

      <ScrollView
        contentContainerStyle={[s.content, { paddingBottom: insets.bottom + 32 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {submitError && <AlertUI message={submitError} type="error" />}

        {/* Balance */}
        {balanceQ.data && (
          <View style={s.balanceCard}>
            {[
              { label: "Total", value: balanceQ.data.totalDays },
              { label: "Used", value: balanceQ.data.usedDays },
              { label: "Remaining", value: balanceQ.data.remainingDays },
            ].map((x) => (
              <View key={x.label} style={s.balanceItem}>
                <Text style={[s.balanceValue, x.label === "Remaining" && { color: (x.value ?? 0) > 0 ? colors.green[600] : colors.red[500] }]}>
                  {x.value ?? "—"}
                </Text>
                <Text style={s.balanceLabel}>{x.label}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Dates */}
        <View style={s.sectionLabel}>
          <Feather name="calendar" size={13} color={colors.bytecode[600]} />
          <Text style={s.sectionLabelText}>Leave period</Text>
        </View>
        <View style={s.group}>
          <DateField label="START DATE" value={startDate} onPress={() => setActivePicker("start")} />
          <DateField label="END DATE" value={endDate} onPress={() => setActivePicker("end")} />
        </View>

        {/* Reason */}
        <View style={s.sectionLabel}>
          <Feather name="file-text" size={13} color={colors.bytecode[600]} />
          <Text style={s.sectionLabelText}>Details</Text>
        </View>
        <View style={s.group}>
          <View style={s.field}>
            <Text style={s.label}>REASON (OPTIONAL)</Text>
            <View style={[s.inputRow, { height: "auto" as any }]}>
              <View style={[s.inputPrefix, { height: "auto" as any, paddingTop: 14, alignSelf: "flex-start" }]}>
                <Feather name="message-square" size={14} color={colors.bytecode[500]} />
              </View>
              <TextInput
                style={[s.textInput, s.textArea]}
                placeholder="Describe your symptoms or reason…"
                placeholderTextColor={colors.gray[400]}
                value={reason}
                onChangeText={setReason}
                multiline
                maxLength={500}
                textAlignVertical="top"
              />
            </View>
          </View>
        </View>

        <View style={s.infoBox}>
          <Feather name="info" size={14} color={colors.bytecode[600]} />
          <Text style={s.infoText}>
            Weekends are excluded from the day count automatically. The request will be reviewed by an admin.
          </Text>
        </View>
      </ScrollView>

      {/* Android date picker */}
      {activePicker !== null && Platform.OS === "android" && (
        <DateTimePicker
          value={pickerValue}
          mode="date"
          display="default"
          minimumDate={minDate}
          onChange={handleChange}
        />
      )}

      {/* iOS bottom-sheet date picker */}
      {Platform.OS === "ios" && (
        <Modal
          transparent
          animationType="slide"
          visible={activePicker !== null}
          onRequestClose={() => setActivePicker(null)}
        >
          <TouchableOpacity style={s.iosOverlay} activeOpacity={1} onPress={() => setActivePicker(null)} />
          <View style={s.iosSheet}>
            <View style={s.iosPickerHeader}>
              <Text style={s.iosPickerTitle}>
                {activePicker === "end" ? "End date" : "Start date"}
              </Text>
              <TouchableOpacity onPress={() => setActivePicker(null)}>
                <Text style={s.iosPickerDone}>Done</Text>
              </TouchableOpacity>
            </View>
            <DateTimePicker
              value={pickerValue}
              mode="date"
              display="spinner"
              minimumDate={minDate}
              onChange={handleChange}
              themeVariant="light"
              style={{ width: "100%" }}
            />
          </View>
        </Modal>
      )}
    </KeyboardAvoidingView>
  );
}

// ─── Styles ───────────────────────────────────────────────────

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.gray[50] },
  content: { padding: 16, gap: 20 },

  sectionLabel: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingLeft: 2,
  },
  sectionLabelText: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.bytecode[700],
  },

  group: { gap: 14 },

  field: { gap: 6 },
  label: {
    fontSize: 10,
    fontWeight: "800",
    color: colors.gray[400],
    letterSpacing: 1,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderWidth: 1.5,
    borderColor: colors.bytecode[100],
    borderRadius: 14,
    overflow: "hidden",
  },
  inputPrefix: {
    width: 44,
    height: 50,
    alignItems: "center",
    justifyContent: "center",
    borderRightWidth: 1,
    borderRightColor: colors.bytecode[50],
  },
  textInput: {
    flex: 1,
    height: 50,
    paddingHorizontal: 12,
    fontSize: 15,
    color: colors.gray[900],
  },
  textArea: {
    height: undefined,
    minHeight: 100,
    paddingTop: 14,
    paddingBottom: 14,
  },

  infoBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    backgroundColor: colors.bytecode[50],
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.bytecode[100],
    padding: 14,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: colors.bytecode[700],
    lineHeight: 19,
  },

  iosOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.35)" },
  iosSheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 32,
  },
  iosPickerHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[100],
  },
  iosPickerTitle: { fontSize: 14, fontWeight: "600", color: colors.gray[700] },
  iosPickerDone: { fontSize: 14, fontWeight: "700", color: colors.bytecode[600] },

  balanceCard: {
    flexDirection: "row", marginBottom: 8, backgroundColor: "#fff",
    borderRadius: 14, borderWidth: 1, borderColor: colors.gray[100], paddingVertical: 14,
  },
  balanceItem: { flex: 1, alignItems: "center", gap: 2 },
  balanceValue: { fontSize: 22, fontWeight: "800", color: colors.bytecode[700] },
  balanceLabel: { fontSize: 11, color: colors.gray[500], fontWeight: "600" },
});
