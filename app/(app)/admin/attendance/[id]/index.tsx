// app/(app)/admin/attendance/[id]/index.tsx

import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  TextInput,
  Platform,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import DateTimePicker from "@react-native-community/datetimepicker";
import Feather from "@expo/vector-icons/Feather";
import {
  adminGetAttendance,
  adminUpdateAttendance,
  adminDeleteAttendance,
} from "@/lib/api/attendance.api";
import { getApiErrorMessage } from "@/lib/api-error";
import { colors } from "@/components/ui/theme";
import { Spinner } from "@/components/ui/Spinner";
import { PageHeader } from "@/components/ui/PageHeader";
import type { AttendanceStatus } from "@/types/attendance";
import { AlertUI } from "@/components/ui/Alert";

const STATUS_COLOR: Record<AttendanceStatus, string> = {
  present: colors.green[600],
  absent: colors.red[500],
  late: colors.orange[500],
  half_day: colors.amber[500],
  on_leave: colors.bytecode[500],
  holiday: colors.bytecode[700],
  weekend: colors.gray[400],
};
const STATUS_LABEL: Record<AttendanceStatus, string> = {
  present: "Present",
  absent: "Absent",
  late: "Late",
  half_day: "Half Day",
  on_leave: "On Leave",
  holiday: "Holiday",
  weekend: "Weekend",
};
const ALL_STATUSES = Object.keys(STATUS_LABEL) as AttendanceStatus[];

function fmtDatetime(iso: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  return `${d.toLocaleDateString()} ${d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
}

function toDatetimeLocal(iso: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function AdminAttendanceDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();

  const [editing, setEditing] = useState(false);
  const [status, setStatus] = useState<AttendanceStatus>("present");
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [note, setNote] = useState("");
  const [lateMinutes, setLateMinutes] = useState("");
  const [error, setError] = useState("");
  const [showCheckInPicker, setShowCheckInPicker] = useState(false);
  const [showCheckOutPicker, setShowCheckOutPicker] = useState(false);

  const { data: record, isLoading } = useQuery({
    queryKey: ["admin-attendance-detail", id],
    queryFn: () => adminGetAttendance(Number(id)),
    enabled: !!id,
  });

  React.useEffect(() => {
    if (record && !editing) {
      setStatus(record.status);
      setCheckIn(toDatetimeLocal(record.checkInTime));
      setCheckOut(toDatetimeLocal(record.checkOutTime));
      setNote(record.note ?? "");
      setLateMinutes(String(record.lateMinutes ?? 0));
    }
  }, [record]);

  const updateMut = useMutation({
    mutationFn: () =>
      adminUpdateAttendance(Number(id), {
        status,
        checkInTime: checkIn ? new Date(checkIn).toISOString() : undefined,
        checkOutTime: checkOut ? new Date(checkOut).toISOString() : undefined,
        note: note || undefined,
        lateMinutes: parseInt(lateMinutes) || 0,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-attendance"] });
      qc.invalidateQueries({ queryKey: ["admin-attendance-detail", id] });
      setEditing(false);
      setError("");
    },
    onError: (err) => setError(getApiErrorMessage(err)),
  });

  const deleteMut = useMutation({
    mutationFn: () => adminDeleteAttendance(Number(id)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-attendance"] });
      router.back();
    },
    onError: () => Alert.alert("Error", "Failed to delete"),
  });

  function confirmDelete() {
    Alert.alert("Delete", "Delete this attendance record?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => deleteMut.mutate(),
      },
    ]);
  }

  if (isLoading || !record) {
    return (
      <View style={[s.center, { paddingTop: insets.top }]}>
        <Spinner />
      </View>
    );
  }

  const statusColor = STATUS_COLOR[record.status];
  const empName = record.employee
    ? `${record.employee.user.firstName ?? ""} ${record.employee.user.lastName ?? ""}`.trim() ||
      record.employee.employeeCode
    : `Employee #${record.employeeId}`;

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      <PageHeader
        title="Attendance Detail"
        variant="bytecode"
        rightActions={[
          {
            icon: editing ? "x" : "edit-2",
            onPress: () => setEditing((v) => !v),
          },
          { icon: "trash-2", onPress: confirmDelete },
        ]}
      />
      <ScrollView
        contentContainerStyle={[
          s.content,
          { paddingBottom: insets.bottom + 32 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Employee card */}
        <View style={s.empCard}>
          <View style={s.empAvatar}>
            <Text style={s.empInitials}>
              {record.employee?.user.firstName?.[0] ?? "?"}
              {record.employee?.user.lastName?.[0] ?? ""}
            </Text>
          </View>
          <View style={s.empInfo}>
            <Text style={s.empName}>{empName}</Text>
            <Text style={s.empCode}>{record.employee?.employeeCode ?? ""}</Text>
            {record.employee?.department && (
              <Text style={s.empDept}>{record.employee.department}</Text>
            )}
          </View>
          <View
            style={[s.statusBadge, { backgroundColor: statusColor + "18" }]}
          >
            <View style={[s.statusDot, { backgroundColor: statusColor }]} />
            <Text style={[s.statusText, { color: statusColor }]}>
              {STATUS_LABEL[record.status]}
            </Text>
          </View>
        </View>

        {/* Info grid */}
        {!editing && (
          <View style={s.infoCard}>
            {[
              [
                "Date",
                new Date(record.attendanceDate).toLocaleDateString("en-BD", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                }),
              ],
              ["Check In", fmtDatetime(record.checkInTime)],
              ["Check Out", fmtDatetime(record.checkOutTime)],
              [
                "Work Hours",
                record.workHours
                  ? `${Number(record.workHours).toFixed(2)} hrs`
                  : "—",
              ],
              ["Late Minutes", String(record.lateMinutes ?? 0)],
              ["Type", record.isManual ? "Manual (Admin)" : "Self Check-in"],
              ["Note", record.note ?? "—"],
            ].map(([label, value]) => (
              <View key={label} style={s.infoRow}>
                <Text style={s.infoLabel}>{label}</Text>
                <Text style={s.infoValue}>{value}</Text>
              </View>
            ))}
            {record.checkInLat && (
              <View style={s.infoRow}>
                <Text style={s.infoLabel}>Check-in GPS</Text>
                <Text style={s.infoValue}>
                  {Number(record.checkInLat).toFixed(5)},{" "}
                  {Number(record.checkInLng).toFixed(5)}
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Edit form */}
        {editing && (
          <View style={s.editCard}>
            {error ? <AlertUI message={error} type="error" /> : null}

            <Text style={s.fieldLabel}>STATUS</Text>
            <View style={s.statusChips}>
              {ALL_STATUSES.map((st) => (
                <TouchableOpacity
                  key={st}
                  style={[
                    s.statusChip,
                    status === st && {
                      backgroundColor: STATUS_COLOR[st],
                      borderColor: STATUS_COLOR[st],
                    },
                  ]}
                  onPress={() => setStatus(st)}
                >
                  <Text
                    style={[
                      s.statusChipText,
                      status === st && { color: "#fff" },
                    ]}
                  >
                    {STATUS_LABEL[st]}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={s.fieldLabel}>CHECK-IN TIME</Text>
            <TouchableOpacity
              style={s.inputRow}
              onPress={() => setShowCheckInPicker(true)}
            >
              <Feather name="log-in" size={14} color={colors.bytecode[500]} />
              <Text
                style={[s.inputText, !checkIn && { color: colors.gray[400] }]}
              >
                {checkIn ? new Date(checkIn).toLocaleString() : "Select time"}
              </Text>
            </TouchableOpacity>
            {showCheckInPicker && Platform.OS === "android" && (
              <DateTimePicker
                mode="datetime"
                value={checkIn ? new Date(checkIn) : new Date()}
                display="default"
                onChange={(_, d) => {
                  setShowCheckInPicker(false);
                  if (d) setCheckIn(d.toISOString());
                }}
              />
            )}

            <Text style={s.fieldLabel}>CHECK-OUT TIME</Text>
            <TouchableOpacity
              style={s.inputRow}
              onPress={() => setShowCheckOutPicker(true)}
            >
              <Feather name="log-out" size={14} color={colors.orange[500]} />
              <Text
                style={[s.inputText, !checkOut && { color: colors.gray[400] }]}
              >
                {checkOut ? new Date(checkOut).toLocaleString() : "Select time"}
              </Text>
            </TouchableOpacity>
            {showCheckOutPicker && Platform.OS === "android" && (
              <DateTimePicker
                mode="datetime"
                value={checkOut ? new Date(checkOut) : new Date()}
                display="default"
                onChange={(_, d) => {
                  setShowCheckOutPicker(false);
                  if (d) setCheckOut(d.toISOString());
                }}
              />
            )}

            <Text style={s.fieldLabel}>LATE MINUTES</Text>
            <TextInput
              style={s.textInput}
              value={lateMinutes}
              onChangeText={setLateMinutes}
              keyboardType="number-pad"
              placeholder="0"
              placeholderTextColor={colors.gray[400]}
            />

            <Text style={s.fieldLabel}>NOTE</Text>
            <TextInput
              style={[s.textInput, s.textarea]}
              value={note}
              onChangeText={setNote}
              multiline
              numberOfLines={3}
              placeholder="Optional note…"
              placeholderTextColor={colors.gray[400]}
              textAlignVertical="top"
            />

            <TouchableOpacity
              style={[s.saveBtn, updateMut.isPending && { opacity: 0.6 }]}
              onPress={() => updateMut.mutate()}
              disabled={updateMut.isPending}
            >
              <Text style={s.saveBtnText}>
                {updateMut.isPending ? "Saving…" : "Save Changes"}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.gray[50] },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  content: { padding: 16, gap: 16 },

  empCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    borderColor: colors.gray[100],
  },
  empAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.bytecode[100],
    alignItems: "center",
    justifyContent: "center",
  },
  empInitials: { fontSize: 17, fontWeight: "800", color: colors.bytecode[700] },
  empInfo: { flex: 1 },
  empName: { fontSize: 15, fontWeight: "800", color: colors.gray[900] },
  empCode: { fontSize: 12, color: colors.gray[400], marginTop: 2 },
  empDept: { fontSize: 12, color: colors.gray[400] },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 12, fontWeight: "700" },

  infoCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.gray[100],
    overflow: "hidden",
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[50],
  },
  infoLabel: { fontSize: 12, color: colors.gray[400], fontWeight: "600" },
  infoValue: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.gray[800],
    maxWidth: "60%",
    textAlign: "right",
  },

  editCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: colors.gray[100],
  },
  fieldLabel: {
    fontSize: 10,
    fontWeight: "800",
    color: colors.gray[400],
    letterSpacing: 1,
    marginTop: 4,
  },
  statusChips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  statusChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: colors.gray[200],
    backgroundColor: "#fff",
  },
  statusChipText: { fontSize: 12, fontWeight: "600", color: colors.gray[500] },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: colors.gray[50],
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.gray[200],
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  inputText: { fontSize: 14, color: colors.gray[900] },
  textInput: {
    backgroundColor: colors.gray[50],
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.gray[200],
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: colors.gray[900],
  },
  textarea: { height: 80, textAlignVertical: "top", paddingTop: 10 },
  saveBtn: {
    backgroundColor: colors.bytecode[600],
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: "center",
    marginTop: 4,
  },
  saveBtnText: { color: "#fff", fontSize: 15, fontWeight: "800" },
});
