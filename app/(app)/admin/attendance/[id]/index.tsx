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
  Modal,
  ActivityIndicator,
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

// ─── constants ───────────────────────────────────────────────────────────────

const STATUS_COLOR: Record<AttendanceStatus, string> = {
  present: colors.bytecode[500],
  absent: colors.red[500],
  late: "#EAB308",
  half_day: colors.bytecode[300],
  on_leave: colors.gray[400],
  holiday: "#818CF8",
  weekend: colors.gray[300],
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

// ─── helpers ─────────────────────────────────────────────────────────────────

function fmtTime(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

function fmtHours(h: number) {
  const hrs = Math.floor(h);
  const mins = Math.round((h - hrs) * 60);
  if (hrs === 0) return `${mins}m`;
  if (mins === 0) return `${hrs}h`;
  return `${hrs}h ${mins}m`;
}

function fmtDateLong(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function deptName(d: { id: number; name: string } | string | null | undefined) {
  if (!d) return null;
  return typeof d === "object" ? d.name : d;
}

// ─── screen ──────────────────────────────────────────────────────────────────

type PickerTarget = "checkIn" | "checkOut";

export default function AdminAttendanceDetailScreen() {
  const { id, edit } = useLocalSearchParams<{ id: string; edit?: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();

  const [editing, setEditing] = useState(edit === "1");
  const [status, setStatus] = useState<AttendanceStatus>("present");
  const [checkInDate, setCheckInDate] = useState<Date | null>(null);
  const [checkOutDate, setCheckOutDate] = useState<Date | null>(null);
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [activePicker, setActivePicker] = useState<PickerTarget | null>(null);

  const { data: record, isLoading } = useQuery({
    queryKey: ["admin-attendance-detail", id],
    queryFn: () => adminGetAttendance(Number(id)),
    enabled: !!id,
  });

  React.useEffect(() => {
    if (record) {
      setStatus(record.status);
      setCheckInDate(record.checkInTime ? new Date(record.checkInTime) : null);
      setCheckOutDate(
        record.checkOutTime ? new Date(record.checkOutTime) : null,
      );
      setNote(record.note ?? "");
    }
  }, [record]);

  // Auto-calculate late minutes: minutes after 09:00 AM on the attendance date
  const lateMinutes = React.useMemo(() => {
    if (!checkInDate) return 0;
    const officeStart = new Date(checkInDate);
    officeStart.setHours(10, 0, 0, 0);
    return Math.max(
      0,
      Math.floor((checkInDate.getTime() - officeStart.getTime()) / 60000),
    );
  }, [checkInDate]);

  const updateMut = useMutation({
    mutationFn: () =>
      adminUpdateAttendance(Number(id), {
        status,
        checkInTime: checkInDate?.toISOString(),
        checkOutTime: checkOutDate?.toISOString(),
        note: note.trim() || undefined,
        lateMinutes,
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

  function handlePickerChange(_: unknown, selected?: Date) {
    if (Platform.OS === "android") setActivePicker(null);
    if (!selected) return;
    if (activePicker === "checkIn") setCheckInDate(selected);
    else if (activePicker === "checkOut") setCheckOutDate(selected);
  }

  const pickerValue =
    activePicker === "checkIn"
      ? (checkInDate ?? new Date())
      : (checkOutDate ?? new Date());

  if (isLoading || !record) {
    return (
      <View style={[s.center, { paddingTop: insets.top }]}>
        <Spinner />
      </View>
    );
  }

  const statusColor = STATUS_COLOR[record.status] ?? colors.gray[400];
  const empName = record.employee
    ? `${record.employee.user.firstName ?? ""} ${record.employee.user.lastName ?? ""}`.trim() ||
      record.employee.employeeCode
    : `Employee #${record.employeeId}`;
  const dept = deptName((record.employee as any)?.department);

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      <PageHeader
        title="Attendance Detail"
        variant="bytecode"
        rightActions={[
          {
            icon: editing ? "x" : "edit-2",
            onPress: () => {
              setEditing((v) => !v);
              setError("");
            },
          },
          { icon: "trash-2", onPress: confirmDelete },
        ]}
      />

      <ScrollView
        contentContainerStyle={[
          s.content,
          { paddingBottom: insets.bottom + 40 },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Employee card */}
        <View style={s.empCard}>
          <View style={s.empAvatar}>
            <Text style={s.empInitials}>
              {(record.employee?.user.firstName?.[0] ?? "?").toUpperCase()}
              {(record.employee?.user.lastName?.[0] ?? "").toUpperCase()}
            </Text>
          </View>
          <View style={s.empInfo}>
            <Text style={s.empName}>{empName}</Text>
            <Text style={s.empSub}>
              {record.employee?.employeeCode ?? ""}
              {dept ? ` · ${dept}` : ""}
            </Text>
          </View>
          <View
            style={[s.statusBadge, { backgroundColor: `${statusColor}18` }]}
          >
            <View style={[s.statusDot, { backgroundColor: statusColor }]} />
            <Text style={[s.statusText, { color: statusColor }]}>
              {STATUS_LABEL[record.status] ?? record.status}
            </Text>
          </View>
        </View>

        {/* View mode */}
        {!editing && (
          <View style={s.infoCard}>
            {(
              [
                ["Date", fmtDateLong(record.attendanceDate)],
                ["Check-in", fmtTime(record.checkInTime)],
                ["Check-out", fmtTime(record.checkOutTime)],
                [
                  "Work Hours",
                  record.workHours
                    ? fmtHours(Number(record.workHours))
                    : "—",
                ],
                ["Late Minutes", String(record.lateMinutes ?? 0)],
                ["Type", record.isManual ? "Manual (Admin)" : "Self Check-in"],
                ["Note", record.note ?? "—"],
              ] as [string, string][]
            ).map(([label, value]) => (
              <View key={label} style={s.infoRow}>
                <Text style={s.infoLabel}>{label}</Text>
                <Text style={s.infoValue}>{value}</Text>
              </View>
            ))}
            {record.checkInLat ? (
              <View style={s.infoRow}>
                <Text style={s.infoLabel}>Check-in GPS</Text>
                <Text style={s.infoValue}>
                  {Number(record.checkInLat).toFixed(5)},{" "}
                  {Number(record.checkInLng).toFixed(5)}
                </Text>
              </View>
            ) : null}
          </View>
        )}

        {/* Edit mode */}
        {editing && (
          <View style={s.editCard}>
            {error ? <AlertUI message={error} type="error" /> : null}

            {/* Status */}
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
                  activeOpacity={0.8}
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

            {/* Check-in time */}
            <Text style={s.fieldLabel}>CHECK-IN TIME</Text>
            <View style={s.timeRow}>
              <TouchableOpacity
                style={[s.timeBtn, s.timeBtnbytecode]}
                onPress={() => setActivePicker("checkIn")}
                activeOpacity={0.8}
              >
                <Feather name="log-in" size={15} color={colors.bytecode[600]} />
                <Text style={[s.timeBtnText, { color: colors.bytecode[700] }]}>
                  {checkInDate ? fmtTime(checkInDate.toISOString()) : "Not set"}
                </Text>
                <Feather
                  name="chevron-down"
                  size={13}
                  color={colors.bytecode[500]}
                />
              </TouchableOpacity>
              {checkInDate && (
                <TouchableOpacity
                  style={s.clearBtn}
                  onPress={() => setCheckInDate(null)}
                  hitSlop={8}
                >
                  <Feather name="x" size={15} color={colors.gray[400]} />
                </TouchableOpacity>
              )}
            </View>

            {/* Check-out time */}
            <Text style={s.fieldLabel}>CHECK-OUT TIME</Text>
            <View style={s.timeRow}>
              <TouchableOpacity
                style={[s.timeBtn, s.timeBtnRed]}
                onPress={() => setActivePicker("checkOut")}
                activeOpacity={0.8}
              >
                <Feather name="log-out" size={15} color={colors.red[500]} />
                <Text style={[s.timeBtnText, { color: colors.red[600] }]}>
                  {checkOutDate
                    ? fmtTime(checkOutDate.toISOString())
                    : "Not set"}
                </Text>
                <Feather
                  name="chevron-down"
                  size={13}
                  color={colors.red[400]}
                />
              </TouchableOpacity>
              {checkOutDate && (
                <TouchableOpacity
                  style={s.clearBtn}
                  onPress={() => setCheckOutDate(null)}
                  hitSlop={8}
                >
                  <Feather name="x" size={15} color={colors.gray[400]} />
                </TouchableOpacity>
              )}
            </View>

            {/* Late minutes — auto-calculated */}
            <Text style={s.fieldLabel}>LATE MINUTES (auto)</Text>
            <View style={s.lateDisplay}>
              <Feather
                name="clock"
                size={14}
                color={lateMinutes > 0 ? "#D97706" : colors.bytecode[500]}
              />
              <Text
                style={[
                  s.lateDisplayText,
                  { color: lateMinutes > 0 ? "#D97706" : colors.bytecode[600] },
                ]}
              >
                {lateMinutes > 0 ? `${lateMinutes} min late` : "On time"}
              </Text>
            </View>

            {/* Note */}
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

            {/* Save */}
            <TouchableOpacity
              style={[s.saveBtn, updateMut.isPending && { opacity: 0.6 }]}
              onPress={() => updateMut.mutate()}
              disabled={updateMut.isPending}
              activeOpacity={0.85}
            >
              {updateMut.isPending ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={s.saveBtnText}>Save Changes</Text>
              )}
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* Android: inline time picker */}
      {activePicker !== null && Platform.OS === "android" && (
        <DateTimePicker
          value={pickerValue}
          mode="time"
          display="default"
          onChange={handlePickerChange}
        />
      )}

      {/* iOS: bottom-sheet time picker */}
      {Platform.OS === "ios" && (
        <Modal
          transparent
          animationType="slide"
          visible={activePicker !== null}
          onRequestClose={() => setActivePicker(null)}
        >
          <View style={s.iosOverlay}>
            <View style={s.iosSheet}>
              <View style={s.iosSheetHeader}>
                <Text style={s.iosSheetTitle}>
                  {activePicker === "checkIn"
                    ? "Check-in Time"
                    : "Check-out Time"}
                </Text>
                <TouchableOpacity
                  onPress={() => setActivePicker(null)}
                  hitSlop={8}
                >
                  <Text style={s.iosDone}>Done</Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={pickerValue}
                mode="time"
                display="spinner"
                onChange={handlePickerChange}
                style={{ width: "100%" }}
              />
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}

// ─── styles ──────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.gray[50] },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  content: { padding: 16, gap: 16 },

  empCard: {
    backgroundColor: "#fff",
    borderRadius: 18,
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
    borderRadius: 14,
    backgroundColor: colors.bytecode[50],
    alignItems: "center",
    justifyContent: "center",
  },
  empInitials: { fontSize: 17, fontWeight: "800", color: colors.bytecode[700] },
  empInfo: { flex: 1 },
  empName: { fontSize: 15, fontWeight: "800", color: colors.gray[900] },
  empSub: { fontSize: 12, color: colors.gray[400], marginTop: 2 },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 12, fontWeight: "700" },

  infoCard: {
    backgroundColor: "#fff",
    borderRadius: 18,
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
    borderRadius: 18,
    padding: 18,
    gap: 10,
    borderWidth: 1,
    borderColor: colors.gray[100],
  },
  fieldLabel: {
    fontSize: 10,
    fontWeight: "800",
    color: colors.gray[400],
    letterSpacing: 1,
    marginTop: 6,
  },

  statusChips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  statusChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: colors.gray[200],
    backgroundColor: "#fff",
  },
  statusChipText: { fontSize: 12, fontWeight: "700", color: colors.gray[500] },

  timeRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  timeBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
  },
  timeBtnbytecode: {
    backgroundColor: colors.bytecode[50],
    borderColor: colors.bytecode[100],
  },
  timeBtnRed: {
    backgroundColor: colors.red[50],
    borderColor: colors.red[100],
  },
  timeBtnText: { flex: 1, fontSize: 14, fontWeight: "700" },
  clearBtn: {
    width: 42,
    height: 46,
    borderRadius: 14,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: colors.gray[200],
    alignItems: "center",
    justifyContent: "center",
  },

  textInput: {
    backgroundColor: colors.gray[50],
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.gray[200],
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 14,
    color: colors.gray[900],
  },
  textarea: { height: 80, textAlignVertical: "top", paddingTop: 10 },

  saveBtn: {
    backgroundColor: colors.bytecode[600],
    borderRadius: 14,
    height: 52,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 6,
  },
  saveBtnText: { color: "#fff", fontSize: 15, fontWeight: "800" },

  iosOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.3)",
  },
  iosSheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 32,
  },
  iosSheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 18,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[100],
  },
  iosSheetTitle: { fontSize: 16, fontWeight: "800", color: colors.gray[900] },
  lateDisplay: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.gray[50],
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.gray[200],
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  lateDisplayText: { fontSize: 14, fontWeight: "700" },
  lateDisplaySub: { fontSize: 11, color: colors.gray[400], marginLeft: "auto" },

  iosDone: { fontSize: 15, fontWeight: "700", color: colors.bytecode[600] },
});
