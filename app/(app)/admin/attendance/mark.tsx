// app/(app)/admin/attendance/mark.tsx

import React, { useEffect, useMemo, useState } from "react";
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  TextInput, KeyboardAvoidingView, Platform, FlatList, Modal, Alert,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import DateTimePicker from "@react-native-community/datetimepicker";
import Feather from "@expo/vector-icons/Feather";
import { adminMarkAttendance, adminListEmployees } from "@/lib/api/attendance.api";
import { getApiErrorMessage } from "@/lib/api-error";
import { colors } from "@/components/ui/theme";
import { PageHeader } from "@/components/ui/PageHeader";
import { AlertUI } from "@/components/ui/Alert";
import type { AttendanceStatus, Employee } from "@/types/attendance";

// ─── Constants ────────────────────────────────────────────────

const STATUS_LABEL: Record<AttendanceStatus, string> = {
  present: "Present", absent: "Absent", late: "Late",
  half_day: "Half Day", on_leave: "On Leave",
  holiday: "Holiday", sick_leave: "Sick Leave", weekend: "Weekend",
};

const STATUS_COLOR: Record<AttendanceStatus, string> = {
  present: colors.bytecode[500], absent: colors.red[500], late: "#EAB308",
  half_day: colors.bytecode[300], on_leave: colors.gray[400],
  holiday: "#818CF8", sick_leave: colors.red[400], weekend: colors.gray[300],
};

const ALL_STATUSES = Object.keys(STATUS_LABEL) as AttendanceStatus[];
const TIME_STATUSES: AttendanceStatus[] = ["present", "late", "half_day"];

// ─── Helpers ──────────────────────────────────────────────────

function pad(n: number) { return String(n).padStart(2, "0"); }
function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
function fmtDateDisplay(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    weekday: "short", day: "numeric", month: "short", year: "numeric",
  });
}
function fmtTime(d: Date | null) {
  if (!d) return "Not set";
  return d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true });
}
function deptName(d: { id: number; name: string } | string | null | undefined) {
  if (!d) return "";
  return typeof d === "object" ? d.name : d;
}

type PickerTarget = "date" | "checkIn" | "checkOut";

// ─── Screen ───────────────────────────────────────────────────

export default function AdminMarkAttendanceScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const { employeeId, employeeName, date: dateParam } = useLocalSearchParams<{
    employeeId?: string; employeeName?: string; date?: string;
  }>();

  const [empPickerOpen, setEmpPickerOpen] = useState(false);
  const [selectedEmp, setSelectedEmp] = useState<Employee | null>(null);
  const [empSearch, setEmpSearch] = useState("");

  const [date, setDate] = useState(dateParam ?? todayISO());
  const [status, setStatus] = useState<AttendanceStatus>("present");
  const [checkInDate, setCheckInDate] = useState<Date | null>(null);
  const [checkOutDate, setCheckOutDate] = useState<Date | null>(null);
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [activePicker, setActivePicker] = useState<PickerTarget | null>(null);

  const lateMinutes = useMemo(() => {
    if (!checkInDate) return 0;
    const officeStart = new Date(checkInDate);
    officeStart.setHours(10, 0, 0, 0);
    return Math.max(0, Math.floor((checkInDate.getTime() - officeStart.getTime()) / 60000));
  }, [checkInDate]);

  const { data: empData } = useQuery({
    queryKey: ["admin-employees-pick"],
    queryFn: () => adminListEmployees({ limit: 200 }),
    staleTime: 2 * 60 * 1000,
  });

  useEffect(() => {
    if (!employeeId || !empData?.data.length || selectedEmp) return;
    const found = empData.data.find((e) => e.id === Number(employeeId));
    if (found) setSelectedEmp(found);
  }, [empData, employeeId]);

  const employees = (empData?.data ?? []).filter((e) => {
    if (!empSearch.trim()) return true;
    const q = empSearch.toLowerCase();
    const name = `${e.user.firstName ?? ""} ${e.user.lastName ?? ""}`.toLowerCase();
    return name.includes(q) || e.employeeCode.toLowerCase().includes(q);
  });

  const markMut = useMutation({
    mutationFn: () => {
      if (!selectedEmp) throw new Error("Select an employee");
      return adminMarkAttendance({
        employeeId: selectedEmp.id,
        attendanceDate: date,
        status,
        checkInTime: checkInDate?.toISOString(),
        checkOutTime: checkOutDate?.toISOString(),
        lateMinutes,
        note: note.trim() || undefined,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-attendance"] });
      Alert.alert("Success", "Attendance marked successfully");
      router.back();
    },
    onError: (err) => setError(getApiErrorMessage(err)),
  });

  function handlePickerChange(_: unknown, selected?: Date) {
    if (Platform.OS === "android") setActivePicker(null);
    if (!selected) return;
    if (activePicker === "date") {
      setDate(`${selected.getFullYear()}-${pad(selected.getMonth() + 1)}-${pad(selected.getDate())}`);
    } else if (activePicker === "checkIn") {
      setCheckInDate(selected);
    } else if (activePicker === "checkOut") {
      setCheckOutDate(selected);
    }
  }

  const pickerValue =
    activePicker === "date" ? new Date(date) :
    activePicker === "checkIn" ? (checkInDate ?? new Date()) :
    (checkOutDate ?? new Date());
  const pickerMode: "date" | "time" = activePicker === "date" ? "date" : "time";
  const showTimes = TIME_STATUSES.includes(status);

  return (
    <KeyboardAvoidingView
      style={[s.root, { paddingTop: insets.top }]}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <PageHeader
        title="Mark Attendance"
        variant="bytecode"
        rightTextAction={{
          label: markMut.isPending ? "Saving…" : "Save",
          onPress: () => markMut.mutate(),
          disabled: !selectedEmp || markMut.isPending,
        }}
      />

      <ScrollView
        contentContainerStyle={[s.content, { paddingBottom: insets.bottom + 32 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {error ? <AlertUI message={error} type="error" /> : null}

        {/* Employee & Date */}
        <View style={s.sectionLabel}>
          <Feather name="users" size={13} color={colors.bytecode[600]} />
          <Text style={s.sectionLabelText}>Employee & date</Text>
        </View>
        <View style={s.group}>
          {/* Employee selector */}
          <View style={s.field}>
            <Text style={s.label}>EMPLOYEE *</Text>
            <TouchableOpacity
              style={s.inputRow}
              onPress={() => setEmpPickerOpen(true)}
              activeOpacity={0.7}
            >
              <View style={s.inputPrefix}>
                <Feather name="user" size={14} color={colors.bytecode[500]} />
              </View>
              {selectedEmp ? (
                <View style={s.empSelectedInner}>
                  <View style={s.empAvatar}>
                    <Text style={s.empInitials}>
                      {(selectedEmp.user.firstName?.[0] ?? "?").toUpperCase()}
                      {(selectedEmp.user.lastName?.[0] ?? "").toUpperCase()}
                    </Text>
                  </View>
                  <View>
                    <Text style={s.empName}>
                      {selectedEmp.user.firstName} {selectedEmp.user.lastName}
                    </Text>
                    <Text style={s.empSub}>
                      {selectedEmp.employeeCode}
                      {deptName((selectedEmp as any).department) ? ` · ${deptName((selectedEmp as any).department)}` : ""}
                    </Text>
                  </View>
                </View>
              ) : employeeName ? (
                <Text style={s.textInput}>{employeeName}</Text>
              ) : (
                <Text style={s.placeholder}>Select employee…</Text>
              )}
              <View style={{ paddingRight: 12 }}>
                <Feather name="chevron-down" size={16} color={colors.gray[400]} />
              </View>
            </TouchableOpacity>
          </View>

          {/* Date */}
          <View style={s.field}>
            <Text style={s.label}>DATE *</Text>
            <TouchableOpacity
              style={s.inputRow}
              onPress={() => setActivePicker("date")}
              activeOpacity={0.7}
            >
              <View style={s.inputPrefix}>
                <Feather name="calendar" size={14} color={colors.bytecode[500]} />
              </View>
              <Text style={[s.textInput, { lineHeight: 50 }]}>{fmtDateDisplay(date)}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Status */}
        <View style={s.sectionLabel}>
          <Feather name="activity" size={13} color={colors.bytecode[600]} />
          <Text style={s.sectionLabelText}>Status</Text>
        </View>
        <View style={s.group}>
          <View style={s.field}>
            <Text style={s.label}>SELECT STATUS *</Text>
            <View style={s.statusChips}>
              {ALL_STATUSES.map((st) => (
                <TouchableOpacity
                  key={st}
                  style={[
                    s.statusChip,
                    status === st && { backgroundColor: STATUS_COLOR[st], borderColor: STATUS_COLOR[st] },
                  ]}
                  onPress={() => setStatus(st)}
                  activeOpacity={0.8}
                >
                  <Text style={[s.statusChipText, status === st && { color: "#fff" }]}>
                    {STATUS_LABEL[st]}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        {/* Times */}
        {showTimes && (
          <>
            <View style={s.sectionLabel}>
              <Feather name="clock" size={13} color={colors.bytecode[600]} />
              <Text style={s.sectionLabelText}>Times</Text>
            </View>
            <View style={s.group}>
              {/* Check-in */}
              <View style={s.field}>
                <Text style={s.label}>CHECK-IN TIME</Text>
                <View style={s.timeRow}>
                  <TouchableOpacity
                    style={[s.inputRow, { flex: 1 }]}
                    onPress={() => setActivePicker("checkIn")}
                    activeOpacity={0.7}
                  >
                    <View style={s.inputPrefix}>
                      <Feather name="log-in" size={14} color={colors.bytecode[500]} />
                    </View>
                    <Text style={[s.textInput, { lineHeight: 50, color: checkInDate ? colors.gray[900] : colors.gray[400] }]}>
                      {fmtTime(checkInDate)}
                    </Text>
                  </TouchableOpacity>
                  {checkInDate && (
                    <TouchableOpacity style={s.clearBtn} onPress={() => setCheckInDate(null)} hitSlop={8}>
                      <Feather name="x" size={15} color={colors.gray[400]} />
                    </TouchableOpacity>
                  )}
                </View>
              </View>

              {/* Check-out */}
              <View style={s.field}>
                <Text style={s.label}>CHECK-OUT TIME</Text>
                <View style={s.timeRow}>
                  <TouchableOpacity
                    style={[s.inputRow, { flex: 1 }]}
                    onPress={() => setActivePicker("checkOut")}
                    activeOpacity={0.7}
                  >
                    <View style={s.inputPrefix}>
                      <Feather name="log-out" size={14} color={colors.red[400]} />
                    </View>
                    <Text style={[s.textInput, { lineHeight: 50, color: checkOutDate ? colors.gray[900] : colors.gray[400] }]}>
                      {fmtTime(checkOutDate)}
                    </Text>
                  </TouchableOpacity>
                  {checkOutDate && (
                    <TouchableOpacity style={s.clearBtn} onPress={() => setCheckOutDate(null)} hitSlop={8}>
                      <Feather name="x" size={15} color={colors.gray[400]} />
                    </TouchableOpacity>
                  )}
                </View>
              </View>

              {/* Late minutes */}
              {checkInDate && (
                <View style={s.field}>
                  <Text style={s.label}>LATE MINUTES (AUTO)</Text>
                  <View style={s.inputRow}>
                    <View style={s.inputPrefix}>
                      <Feather name="clock" size={14} color={lateMinutes > 0 ? "#D97706" : colors.bytecode[500]} />
                    </View>
                    <Text style={[s.textInput, { lineHeight: 50, color: lateMinutes > 0 ? "#D97706" : colors.bytecode[600] }]}>
                      {lateMinutes > 0 ? `${lateMinutes} min late` : "On time"}
                    </Text>
                  </View>
                </View>
              )}
            </View>
          </>
        )}

        {/* Note */}
        <View style={s.sectionLabel}>
          <Feather name="file-text" size={13} color={colors.bytecode[600]} />
          <Text style={s.sectionLabelText}>Note</Text>
        </View>
        <View style={s.group}>
          <View style={s.field}>
            <Text style={s.label}>NOTE (OPTIONAL)</Text>
            <View style={[s.inputRow, { height: "auto" as any }]}>
              <View style={[s.inputPrefix, { height: "auto" as any, paddingTop: 14, alignSelf: "flex-start" }]}>
                <Feather name="message-square" size={14} color={colors.bytecode[500]} />
              </View>
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
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Android picker */}
      {activePicker !== null && Platform.OS === "android" && (
        <DateTimePicker
          value={pickerValue}
          mode={pickerMode}
          display="default"
          maximumDate={pickerMode === "date" ? new Date() : undefined}
          onChange={handlePickerChange}
        />
      )}

      {/* iOS bottom-sheet picker */}
      {Platform.OS === "ios" && (
        <Modal transparent animationType="slide" visible={activePicker !== null}
          onRequestClose={() => setActivePicker(null)}>
          <View style={s.iosOverlay}>
            <View style={s.iosSheet}>
              <View style={s.iosSheetHeader}>
                <Text style={s.iosSheetTitle}>
                  {activePicker === "date" ? "Select Date" :
                   activePicker === "checkIn" ? "Check-in Time" : "Check-out Time"}
                </Text>
                <TouchableOpacity onPress={() => setActivePicker(null)} hitSlop={8}>
                  <Text style={s.iosDone}>Done</Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={pickerValue}
                mode={pickerMode}
                display="spinner"
                maximumDate={pickerMode === "date" ? new Date() : undefined}
                onChange={handlePickerChange}
                themeVariant="light"
                style={{ width: "100%" }}
              />
            </View>
          </View>
        </Modal>
      )}

      {/* Employee picker modal */}
      <Modal visible={empPickerOpen} animationType="slide"
        onRequestClose={() => setEmpPickerOpen(false)}>
        <View style={[s.empModal, { paddingTop: insets.top }]}>
          <View style={s.empModalHeader}>
            <Text style={s.empModalTitle}>Select Employee</Text>
            <TouchableOpacity onPress={() => { setEmpPickerOpen(false); setEmpSearch(""); }} hitSlop={8}>
              <Feather name="x" size={22} color={colors.gray[700]} />
            </TouchableOpacity>
          </View>
          <View style={s.empSearchBox}>
            <Feather name="search" size={16} color={colors.gray[400]} />
            <TextInput
              style={s.empSearchInput}
              placeholder="Search by name or code…"
              placeholderTextColor={colors.gray[400]}
              value={empSearch}
              onChangeText={setEmpSearch}
              autoFocus
            />
          </View>
          <FlatList
            data={employees}
            keyExtractor={(e) => String(e.id)}
            contentContainerStyle={s.empList}
            keyboardShouldPersistTaps="handled"
            ItemSeparatorComponent={() => <View style={{ height: 1, backgroundColor: colors.gray[50] }} />}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={s.empItem}
                onPress={() => { setSelectedEmp(item); setEmpPickerOpen(false); setEmpSearch(""); }}
                activeOpacity={0.8}
              >
                <View style={s.empItemAvatar}>
                  <Text style={s.empItemInitials}>
                    {(item.user.firstName?.[0] ?? "?").toUpperCase()}
                    {(item.user.lastName?.[0] ?? "").toUpperCase()}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.empItemName}>{item.user.firstName} {item.user.lastName}</Text>
                  <Text style={s.empItemSub}>
                    {item.employeeCode}
                    {deptName((item as any).department) ? ` · ${deptName((item as any).department)}` : ""}
                  </Text>
                </View>
                {selectedEmp?.id === item.id && (
                  <Feather name="check" size={16} color={colors.bytecode[600]} />
                )}
              </TouchableOpacity>
            )}
            ListEmptyComponent={
              <View style={s.empEmpty}>
                <Text style={s.empEmptyText}>No employees found</Text>
              </View>
            }
          />
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

// ─── Styles ───────────────────────────────────────────────────

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.gray[50] },
  content: { padding: 16, gap: 20 },

  sectionLabel: { flexDirection: "row", alignItems: "center", gap: 6, paddingLeft: 2 },
  sectionLabelText: { fontSize: 13, fontWeight: "700", color: colors.bytecode[700] },

  group: { gap: 14 },
  field: { gap: 6 },
  label: { fontSize: 10, fontWeight: "800", color: colors.gray[400], letterSpacing: 1 },

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
  textarea: {
    height: undefined,
    minHeight: 90,
    paddingTop: 14,
    paddingBottom: 14,
  },
  placeholder: { flex: 1, height: 50, lineHeight: 50, paddingHorizontal: 12, fontSize: 15, color: colors.gray[400] },

  empSelectedInner: { flex: 1, flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 12, paddingVertical: 8 },
  empAvatar: {
    width: 32, height: 32, borderRadius: 9,
    backgroundColor: colors.bytecode[50], alignItems: "center", justifyContent: "center",
  },
  empInitials: { fontSize: 12, fontWeight: "800", color: colors.bytecode[700] },
  empName: { fontSize: 14, fontWeight: "700", color: colors.gray[900] },
  empSub: { fontSize: 11, color: colors.gray[400], marginTop: 1 },

  statusChips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  statusChip: {
    paddingHorizontal: 13, paddingVertical: 8,
    borderRadius: 20, borderWidth: 1.5,
    borderColor: colors.bytecode[100], backgroundColor: "#fff",
  },
  statusChipText: { fontSize: 12, fontWeight: "700", color: colors.gray[500] },

  timeRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  clearBtn: {
    width: 50, height: 50, borderRadius: 14,
    backgroundColor: "#fff", borderWidth: 1.5,
    borderColor: colors.bytecode[100], alignItems: "center", justifyContent: "center",
  },

  iosOverlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.3)" },
  iosSheet: { backgroundColor: "#fff", borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingBottom: 32 },
  iosSheetHeader: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    padding: 18, borderBottomWidth: 1, borderBottomColor: colors.gray[100],
  },
  iosSheetTitle: { fontSize: 16, fontWeight: "800", color: colors.gray[900] },
  iosDone: { fontSize: 15, fontWeight: "700", color: colors.bytecode[600] },

  empModal: { flex: 1, backgroundColor: "#fff" },
  empModalHeader: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: colors.gray[100],
  },
  empModalTitle: { fontSize: 18, fontWeight: "800", color: colors.gray[900] },
  empSearchBox: {
    flexDirection: "row", alignItems: "center", gap: 10,
    margin: 16, backgroundColor: colors.gray[50], borderRadius: 12,
    borderWidth: 1, borderColor: colors.gray[200], paddingHorizontal: 12, paddingVertical: 10,
  },
  empSearchInput: { flex: 1, fontSize: 14, color: colors.gray[900] },
  empList: { paddingHorizontal: 16, paddingBottom: 40 },
  empItem: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 13 },
  empItemAvatar: {
    width: 38, height: 38, borderRadius: 10,
    backgroundColor: colors.bytecode[50], alignItems: "center", justifyContent: "center",
  },
  empItemInitials: { fontSize: 13, fontWeight: "800", color: colors.bytecode[700] },
  empItemName: { fontSize: 14, fontWeight: "700", color: colors.gray[900] },
  empItemSub: { fontSize: 11, color: colors.gray[400], marginTop: 1 },
  empEmpty: { alignItems: "center", paddingTop: 48 },
  empEmptyText: { fontSize: 14, color: colors.gray[400] },
});
