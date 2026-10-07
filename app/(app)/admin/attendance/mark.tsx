// app/(app)/admin/attendance/mark.tsx

import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  FlatList,
  Modal,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import DateTimePicker from "@react-native-community/datetimepicker";
import Feather from "@expo/vector-icons/Feather";
import {
  adminMarkAttendance,
  adminListEmployees,
} from "@/lib/api/attendance.api";
import { getApiErrorMessage } from "@/lib/api-error";
import { colors } from "@/components/ui/theme";
import { PageHeader } from "@/components/ui/PageHeader";
import type { AttendanceStatus, Employee } from "@/types/attendance";
import { AlertUI } from "@/components/ui/Alert";

const STATUS_LABEL: Record<AttendanceStatus, string> = {
  present: "Present",
  absent: "Absent",
  late: "Late",
  half_day: "Half Day",
  on_leave: "On Leave",
  holiday: "Holiday",
  weekend: "Weekend",
};
const STATUS_COLOR: Record<AttendanceStatus, string> = {
  present: colors.green[600],
  absent: colors.red[500],
  late: colors.orange[500],
  half_day: colors.amber[500],
  on_leave: colors.teal[500],
  holiday: colors.teal[700],
  weekend: colors.gray[400],
};
const ALL_STATUSES = Object.keys(STATUS_LABEL) as AttendanceStatus[];

function pad(n: number) {
  return String(n).padStart(2, "0");
}
function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export default function AdminMarkAttendanceScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();

  const [empPickerOpen, setEmpPickerOpen] = useState(false);
  const [selectedEmp, setSelectedEmp] = useState<Employee | null>(null);
  const [empSearch, setEmpSearch] = useState("");
  const [date, setDate] = useState(todayISO());
  const [status, setStatus] = useState<AttendanceStatus>("present");
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [lateMinutes, setLateMinutes] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showCheckInPicker, setShowCheckInPicker] = useState(false);
  const [showCheckOutPicker, setShowCheckOutPicker] = useState(false);

  const { data: empData } = useQuery({
    queryKey: ["admin-employees-pick", empSearch],
    queryFn: () => adminListEmployees({ limit: 30, search: empSearch }),
  });

  const markMut = useMutation({
    mutationFn: () => {
      if (!selectedEmp) throw new Error("Select an employee");
      return adminMarkAttendance({
        employeeId: selectedEmp.id,
        attendanceDate: date,
        status,
        checkInTime: checkIn ? new Date(checkIn).toISOString() : undefined,
        checkOutTime: checkOut ? new Date(checkOut).toISOString() : undefined,
        lateMinutes: parseInt(lateMinutes) || 0,
        note: note || undefined,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-attendance"] });
      Alert.alert("Success", "Attendance marked successfully");
      router.back();
    },
    onError: (err) => setError(getApiErrorMessage(err)),
  });

  const employees = empData?.data ?? [];
  const displayDate = new Date(date).toLocaleDateString("en-BD", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  return (
    <KeyboardAvoidingView
      style={[s.root, { paddingTop: insets.top }]}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <PageHeader
        title="Mark Attendance"
        variant="teal"
        rightTextAction={{
          label: markMut.isPending ? "Saving…" : "Save",
          onPress: () => markMut.mutate(),
          disabled: markMut.isPending,
        }}
      />

      <ScrollView
        contentContainerStyle={[
          s.content,
          { paddingBottom: insets.bottom + 32 },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {error ? <AlertUI message={error} type="error" /> : null}

        {/* Employee */}
        <Text style={s.label}>EMPLOYEE *</Text>
        <TouchableOpacity
          style={s.selectBtn}
          onPress={() => setEmpPickerOpen(true)}
        >
          {selectedEmp ? (
            <View style={s.selectedEmp}>
              <View style={s.empAvatar}>
                <Text style={s.empInitials}>
                  {selectedEmp.user.firstName?.[0] ?? "?"}
                  {selectedEmp.user.lastName?.[0] ?? ""}
                </Text>
              </View>
              <View>
                <Text style={s.selectedEmpName}>
                  {selectedEmp.user.firstName} {selectedEmp.user.lastName}
                </Text>
                <Text style={s.selectedEmpCode}>
                  {selectedEmp.employeeCode}
                </Text>
              </View>
            </View>
          ) : (
            <Text style={s.selectPlaceholder}>Select employee…</Text>
          )}
          <Feather name="chevron-down" size={16} color={colors.gray[400]} />
        </TouchableOpacity>

        {/* Date */}
        <Text style={s.label}>DATE *</Text>
        <TouchableOpacity
          style={s.inputRow}
          onPress={() => setShowDatePicker(true)}
        >
          <Feather name="calendar" size={14} color={colors.teal[500]} />
          <Text style={s.inputText}>{displayDate}</Text>
        </TouchableOpacity>
        {showDatePicker && Platform.OS === "android" && (
          <DateTimePicker
            mode="date"
            value={new Date(date)}
            display="default"
            maximumDate={new Date()}
            onChange={(_, d) => {
              setShowDatePicker(false);
              if (d)
                setDate(
                  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
                );
            }}
          />
        )}

        {/* Status */}
        <Text style={s.label}>STATUS *</Text>
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
                style={[s.statusChipText, status === st && { color: "#fff" }]}
              >
                {STATUS_LABEL[st]}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Times (only for present/late/half_day) */}
        {["present", "late", "half_day"].includes(status) && (
          <>
            <Text style={s.label}>CHECK-IN TIME</Text>
            <TouchableOpacity
              style={s.inputRow}
              onPress={() => setShowCheckInPicker(true)}
            >
              <Feather name="log-in" size={14} color={colors.green[500]} />
              <Text
                style={[s.inputText, !checkIn && { color: colors.gray[400] }]}
              >
                {checkIn ? new Date(checkIn).toLocaleString() : "Optional"}
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

            <Text style={s.label}>CHECK-OUT TIME</Text>
            <TouchableOpacity
              style={s.inputRow}
              onPress={() => setShowCheckOutPicker(true)}
            >
              <Feather name="log-out" size={14} color={colors.orange[500]} />
              <Text
                style={[s.inputText, !checkOut && { color: colors.gray[400] }]}
              >
                {checkOut ? new Date(checkOut).toLocaleString() : "Optional"}
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

            {status === "late" && (
              <>
                <Text style={s.label}>LATE MINUTES</Text>
                <TextInput
                  style={s.textInput}
                  value={lateMinutes}
                  onChangeText={setLateMinutes}
                  keyboardType="number-pad"
                  placeholder="0"
                  placeholderTextColor={colors.gray[400]}
                />
              </>
            )}
          </>
        )}

        <Text style={s.label}>NOTE</Text>
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
      </ScrollView>

      {/* Employee picker modal */}
      <Modal
        visible={empPickerOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setEmpPickerOpen(false)}
      >
        <TouchableOpacity
          style={s.overlay}
          activeOpacity={1}
          onPress={() => setEmpPickerOpen(false)}
        />
        <View style={s.sheet}>
          <View style={s.sheetHandle} />
          <Text style={s.sheetTitle}>Select Employee</Text>
          <View style={s.sheetSearch}>
            <Feather name="search" size={14} color={colors.gray[400]} />
            <TextInput
              style={s.sheetSearchInput}
              placeholder="Search…"
              placeholderTextColor={colors.gray[300]}
              value={empSearch}
              onChangeText={setEmpSearch}
              autoFocus
            />
          </View>
          <FlatList
            data={employees}
            keyExtractor={(i) => String(i.id)}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={s.empItem}
                onPress={() => {
                  setSelectedEmp(item);
                  setEmpPickerOpen(false);
                }}
              >
                <View style={s.empItemAvatar}>
                  <Text style={s.empItemInitials}>
                    {item.user.firstName?.[0] ?? "?"}
                    {item.user.lastName?.[0] ?? ""}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.empItemName}>
                    {item.user.firstName} {item.user.lastName}
                  </Text>
                  <Text style={s.empItemCode}>
                    {item.employeeCode}{" "}
                    {item.department ? `· ${item.department}` : ""}
                  </Text>
                </View>
                {selectedEmp?.id === item.id && (
                  <Feather name="check" size={16} color={colors.teal[600]} />
                )}
              </TouchableOpacity>
            )}
            ItemSeparatorComponent={() => (
              <View style={{ height: 1, backgroundColor: colors.gray[100] }} />
            )}
          />
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.gray[50] },
  content: { padding: 16, gap: 12 },
  label: {
    fontSize: 10,
    fontWeight: "800",
    color: colors.gray[400],
    letterSpacing: 1,
    marginTop: 4,
  },
  selectBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.gray[200],
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  selectPlaceholder: { fontSize: 14, color: colors.gray[400] },
  selectedEmp: { flexDirection: "row", alignItems: "center", gap: 10 },
  empAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.teal[100],
    alignItems: "center",
    justifyContent: "center",
  },
  empInitials: { fontSize: 13, fontWeight: "800", color: colors.teal[700] },
  selectedEmpName: { fontSize: 14, fontWeight: "700", color: colors.gray[900] },
  selectedEmpCode: { fontSize: 11, color: colors.gray[400] },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.gray[200],
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  inputText: { fontSize: 14, color: colors.gray[900] },
  textInput: {
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.gray[200],
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: colors.gray[900],
  },
  textarea: { height: 80, textAlignVertical: "top", paddingTop: 10 },
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
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)" },
  sheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: "75%",
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.gray[200],
    alignSelf: "center",
    marginBottom: 16,
  },
  sheetTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: colors.gray[900],
    marginBottom: 12,
  },
  sheetSearch: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.gray[50],
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.gray[200],
    paddingHorizontal: 12,
    height: 40,
    marginBottom: 8,
  },
  sheetSearchInput: { flex: 1, fontSize: 14, color: colors.gray[900] },
  empItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 4,
  },
  empItemAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.teal[100],
    alignItems: "center",
    justifyContent: "center",
  },
  empItemInitials: { fontSize: 13, fontWeight: "800", color: colors.teal[700] },
  empItemName: { fontSize: 14, fontWeight: "700", color: colors.gray[900] },
  empItemCode: { fontSize: 11, color: colors.gray[400] },
});
