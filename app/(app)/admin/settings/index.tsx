import React, { useEffect, useState } from "react";
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from "react-native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { getSettings, adminUpdateSettings } from "@/lib/api/settings.api";
import { PageHeader } from "@/components/ui/PageHeader";
import { Spinner } from "@/components/ui/Spinner";
import { AlertUI } from "@/components/ui/Alert";
import { getApiErrorMessage } from "@/lib/api-error";
import { colors } from "@/components/ui/theme";
import { TimeField, TimePickerSheet, fmtTimeDisplay } from "@/components/attendance/TimePicker";

function toDate(hhmm: string): Date {
  const [h, m] = hhmm.split(":").map(Number);
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d;
}

function toHHmm(d: Date): string {
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export default function AdminSettingsScreen() {
  const router = useRouter();
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["system-settings"], queryFn: getSettings });

  const [reminder, setReminder] = useState<Date>(toDate("10:00"));
  const [picking, setPicking] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (data) setReminder(toDate(data.officeReminderTime));
  }, [data]);

  const save = useMutation({
    mutationFn: () => adminUpdateSettings({ officeReminderTime: toHHmm(reminder) }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["system-settings"] });
      router.back();
    },
    onError: (e) => setError(getApiErrorMessage(e, "Failed to save settings")),
  });

  return (
    <View style={s.root}>
      <PageHeader title="System Settings" variant="bytecode" insetTop />
      {isLoading ? (
        <View style={s.center}>
          <Spinner />
        </View>
      ) : (
        <ScrollView contentContainerStyle={s.content}>
          {error ? <AlertUI message={error} type="error" /> : null}
          <TimeField
            icon="bell"
            label="Office arrival reminder"
            value={reminder}
            onPress={() => setPicking(true)}
          />
          <Text style={s.hint}>
            Employees arriving at the office before this time get a check-in reminder at this
            time; after it, they get the reminder as soon as they arrive.
          </Text>
          <TouchableOpacity
            style={[s.save, save.isPending && { opacity: 0.6 }]}
            disabled={save.isPending}
            onPress={() => save.mutate()}
          >
            <Text style={s.saveLabel}>{save.isPending ? "Saving…" : "Save"}</Text>
          </TouchableOpacity>
        </ScrollView>
      )}
      <TimePickerSheet
        visible={picking}
        value={reminder}
        title={`Reminder time (${fmtTimeDisplay(reminder)})`}
        onChange={setReminder}
        onClose={() => setPicking(false)}
      />
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.gray[50] },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  content: { padding: 16, gap: 14 },
  hint: { fontSize: 13, color: colors.gray[500], lineHeight: 19 },
  save: {
    backgroundColor: colors.bytecode[600],
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
  },
  saveLabel: { color: "#fff", fontWeight: "800", fontSize: 15 },
});
