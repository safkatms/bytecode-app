import React, { useState } from "react";
import { Modal, View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { getPendingCheckouts } from "@/lib/api/attendance-employee.api";
import { parseLocalIsoDate } from "@/lib/date";
import { colors } from "@/components/ui/theme";
import { fmtShortDate } from "@/components/dashboard";

/** Asks the user to log a check-out for a day they checked in but never checked out. */
export function PendingCheckoutPrompt() {
  const router = useRouter();
  const [dismissed, setDismissed] = useState(false);
  const { data } = useQuery({
    queryKey: ["pending-checkout"],
    queryFn: getPendingCheckouts,
    retry: false, // e.g. admin without an employee profile
  });
  const pending = data?.records[0];

  return (
    <Modal
      visible={!!pending && !dismissed}
      transparent
      animationType="fade"
      onRequestClose={() => setDismissed(true)}
    >
      <View style={s.backdrop}>
        <View style={s.card}>
          <Text style={s.title}>You forgot to check out</Text>
          <Text style={s.body}>
            You checked in on{" "}
            {pending ? fmtShortDate(parseLocalIsoDate(pending.attendanceDate)) : ""} but
            never checked out. Please log your check-out time.
          </Text>
          <TouchableOpacity
            style={s.primary}
            onPress={() => {
              setDismissed(true);
              router.push({
                pathname: "/(app)/attendance/timesheet",
                params: { date: pending!.attendanceDate },
              });
            }}
          >
            <Text style={s.primaryLabel}>Log check-out</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setDismissed(true)}>
            <Text style={s.later}>Later</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    padding: 24,
  },
  card: { backgroundColor: "#fff", borderRadius: 20, padding: 22, gap: 12 },
  title: { fontSize: 18, fontWeight: "800", color: colors.gray[900] },
  body: { fontSize: 14, color: colors.gray[600], lineHeight: 20 },
  primary: {
    backgroundColor: colors.red[600],
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 4,
  },
  primaryLabel: { color: "#fff", fontWeight: "800", fontSize: 15 },
  later: {
    textAlign: "center",
    color: colors.gray[500],
    fontWeight: "700",
    paddingVertical: 6,
  },
});
