import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  TextInput,
} from "react-native";
import { useRouter } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Feather from "@expo/vector-icons/Feather";
import {
  applySickLeave,
  getMySickLeaveBalance,
} from "@/lib/api/sick-leave.api";
import {
  applyCasualLeave,
  getMyCasualLeaveBalance,
} from "@/lib/api/casual-leave.api";
import { getApiErrorMessage } from "@/lib/api-error";
import { colors } from "@/components/ui/theme";
import { PageHeader } from "@/components/ui/PageHeader";
import { AlertUI } from "@/components/ui/Alert";
import { Section } from "@/components/dashboard";
import { TimeField, TimePickerSheet } from "@/components/attendance/TimePicker";
import type { SickLeaveBalance } from "@/types/sick-leave";
import type { CasualLeaveBalance } from "@/types/casual-leave";
import { LEAVE_KIND, type LeaveKind } from "./kinds";
import { LeaveBalance } from "./LeaveBalance";

// ─── helpers ──────────────────────────────────────────────────

function pad(n: number) {
  return String(n).padStart(2, "0");
}
function toIso(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
function fromIso(iso: string) {
  return new Date(`${iso}T00:00:00`);
}
function fmtDate(d: Date) {
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

type PickerTarget = "start" | "end";
type Payload = { startDate: string; endDate: string; reason?: string };

interface Config {
  title: string;
  success: string;
  placeholder: string;
  info: string;
  balanceKey: string;
  listKey: string;
  balanceFn: (year?: number) => Promise<SickLeaveBalance | CasualLeaveBalance>;
  applyFn: (p: Payload) => Promise<unknown>;
}

const CONFIG: Record<LeaveKind, Config> = {
  sick: {
    title: "Apply Sick Leave",
    success: "Your sick leave request has been submitted.",
    placeholder: "Describe your symptoms or reason…",
    info: "Weekends are excluded from the day count automatically. The request will be reviewed by an admin.",
    balanceKey: "sick-leave-balance",
    listKey: "sick-leave-mine",
    balanceFn: getMySickLeaveBalance,
    applyFn: applySickLeave,
  },
  casual: {
    title: "Apply Casual Leave",
    success: "Your casual leave request has been submitted.",
    placeholder: "Describe your reason…",
    info: "Weekends are excluded from the day count automatically. Carry-forward days are used first, and days earned by working a weekend or holiday are added to your balance. The request will be reviewed by an admin.",
    balanceKey: "casual-leave-balance",
    listKey: "casual-leave-mine",
    balanceFn: getMyCasualLeaveBalance,
    applyFn: applyCasualLeave,
  },
};

// ─── screen ───────────────────────────────────────────────────

export function ApplyLeaveScreen({ kind }: { kind: LeaveKind }) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const cfg = CONFIG[kind];
  const accent = LEAVE_KIND[kind];

  const year = new Date().getFullYear();
  const balanceQ = useQuery({
    queryKey: [cfg.balanceKey, year],
    queryFn: () => cfg.balanceFn(year),
  });

  const [startDate, setStartDate] = useState(toIso(new Date()));
  const [endDate, setEndDate] = useState(toIso(new Date()));
  const [reason, setReason] = useState("");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [activePicker, setActivePicker] = useState<PickerTarget | null>(null);

  const mut = useMutation({
    mutationFn: cfg.applyFn,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [cfg.listKey] });
      qc.invalidateQueries({ queryKey: [cfg.balanceKey] });
      Alert.alert("Submitted", cfg.success);
      router.back();
    },
    onError: (e) =>
      setSubmitError(getApiErrorMessage(e, "Failed to submit request")),
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

  function submit() {
    setSubmitError(null);
    if (endDate < startDate)
      return setSubmitError("End date must be on or after start date");
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
        title={cfg.title}
        variant="bytecode"
        insetTop
        rightTextAction={{
          label: mut.isPending ? "Saving…" : "Submit",
          onPress: submit,
          disabled: mut.isPending,
        }}
      />

      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {submitError && (
          <View style={s.alert}>
            <AlertUI message={submitError} type="error" />
          </View>
        )}

        <LeaveBalance kind={kind} balance={balanceQ.data} year={year} />

        <Section title="Leave period">
          <View style={s.stack}>
            <TimeField
              icon="calendar"
              label="Start date"
              value={fromIso(startDate)}
              format={fmtDate}
              tint={colors.bytecode[600]}
              tintBg={colors.bytecode[50]}
              onPress={() => setActivePicker("start")}
            />
            <TimeField
              icon="calendar"
              label="End date"
              value={fromIso(endDate)}
              format={fmtDate}
              tint={colors.bytecode[600]}
              tintBg={colors.bytecode[50]}
              onPress={() => setActivePicker("end")}
            />
          </View>
        </Section>

        <Section title="Details">
          <View style={s.reasonCard}>
            <View style={s.reasonHead}>
              <View
                style={[s.reasonIcon, { backgroundColor: colors.bytecode[50] }]}
              >
                <Feather
                  name="message-square"
                  size={16}
                  color={colors.bytecode[600]}
                />
              </View>
              <Text style={s.reasonLabel}>Reason</Text>
              <Text style={s.optional}>Optional</Text>
            </View>
            <TextInput
              style={s.textArea}
              placeholder={cfg.placeholder}
              placeholderTextColor={colors.gray[400]}
              value={reason}
              onChangeText={setReason}
              multiline
              maxLength={500}
              textAlignVertical="top"
            />
            <Text style={s.counter}>{reason.length}/500</Text>
          </View>

          <View style={s.infoBox}>
            <Feather name="info" size={15} color={colors.bytecode[600]} />
            <Text style={s.infoText}>{cfg.info}</Text>
          </View>
        </Section>
      </ScrollView>

      <TimePickerSheet
        visible={activePicker !== null}
        value={pickerValue}
        title={activePicker === "end" ? "End date" : "Start date"}
        mode="date"
        minimumDate={minDate}
        onChange={(d) => activePicker && applyPicked(activePicker, d)}
        onClose={() => setActivePicker(null)}
      />
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.gray[50] },
  alert: { marginHorizontal: 16, marginTop: 12 },
  stack: { gap: 10 },

  reasonCard: {
    backgroundColor: "#fff",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.gray[100],
    padding: 14,
    gap: 10,
  },
  reasonHead: { flexDirection: "row", alignItems: "center", gap: 12 },
  reasonIcon: {
    width: 38,
    height: 38,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  reasonLabel: {
    flex: 1,
    fontSize: 14,
    fontWeight: "700",
    color: colors.gray[800],
  },
  optional: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.gray[400],
    backgroundColor: colors.gray[100],
    borderRadius: 20,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  textArea: {
    minHeight: 100,
    backgroundColor: colors.gray[50],
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.gray[100],
    paddingHorizontal: 13,
    paddingVertical: 12,
    fontSize: 15,
    color: colors.gray[900],
  },
  counter: {
    alignSelf: "flex-end",
    fontSize: 11,
    color: colors.gray[400],
    fontWeight: "600",
  },

  infoBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    backgroundColor: colors.bytecode[50],
    borderRadius: 16,
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
});
