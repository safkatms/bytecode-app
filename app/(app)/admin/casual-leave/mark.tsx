// app/(app)/admin/casual-leave/mark.tsx

import React, { useEffect, useState } from "react";
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  TextInput, KeyboardAvoidingView, Platform, FlatList, Modal, Alert,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import DateTimePicker from "@react-native-community/datetimepicker";
import Feather from "@expo/vector-icons/Feather";
import { adminMarkCasualLeave } from "@/lib/api/casual-leave.api";
import { adminListEmployees } from "@/lib/api/attendance.api";
import { getApiErrorMessage } from "@/lib/api-error";
import { colors } from "@/components/ui/theme";
import { PageHeader } from "@/components/ui/PageHeader";
import { AlertUI } from "@/components/ui/Alert";
import type { Employee } from "@/types/attendance";

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

export default function AdminMarkCasualLeaveScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const { employeeId: empIdParam, employeeName: empNameParam } = useLocalSearchParams<{
    employeeId?: string; employeeName?: string;
  }>();

  const [empPickerOpen, setEmpPickerOpen] = useState(false);
  const [selectedEmp, setSelectedEmp] = useState<Employee | null>(null);
  const [empSearch, setEmpSearch] = useState("");
  const [date, setDate] = useState(todayISO());
  const [isHalfDay, setIsHalfDay] = useState(false);
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [showDatePicker, setShowDatePicker] = useState(false);

  const { data: empData } = useQuery({
    queryKey: ["admin-employees-pick"],
    queryFn: () => adminListEmployees({ limit: 200 }),
    staleTime: 2 * 60 * 1000,
  });

  useEffect(() => {
    if (!empIdParam || !empData?.data.length || selectedEmp) return;
    const found = empData.data.find((e) => e.id === Number(empIdParam));
    if (found) setSelectedEmp(found);
  }, [empData, empIdParam]);

  const employees = (empData?.data ?? []).filter((e) => {
    if (!empSearch.trim()) return true;
    const q = empSearch.toLowerCase();
    const name = `${e.user.firstName ?? ""} ${e.user.lastName ?? ""}`.toLowerCase();
    return name.includes(q) || e.employeeCode.toLowerCase().includes(q);
  });

  const markMut = useMutation({
    mutationFn: () => {
      if (!selectedEmp) throw new Error("Select an employee");
      return adminMarkCasualLeave({
        employeeId: selectedEmp.id,
        date,
        note: note.trim() || undefined,
        isHalfDay,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-casual-leave"] });
      Alert.alert("Done", "Casual leave marked successfully");
      router.back();
    },
    onError: (e) => setError(getApiErrorMessage(e, "Failed to mark casual leave")),
  });

  return (
    <KeyboardAvoidingView
      style={s.root}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <PageHeader
        title="Mark Casual Leave"
        variant="bytecode"
        insetTop
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

        <View style={s.sectionLabel}>
          <Feather name="users" size={13} color={colors.bytecode[600]} />
          <Text style={s.sectionLabelText}>Employee & date</Text>
        </View>
        <View style={s.group}>
          <View style={s.field}>
            <Text style={s.label}>EMPLOYEE *</Text>
            <TouchableOpacity style={s.inputRow} onPress={() => setEmpPickerOpen(true)} activeOpacity={0.7}>
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
                    <Text style={s.empName}>{selectedEmp.user.firstName} {selectedEmp.user.lastName}</Text>
                    <Text style={s.empSub}>{selectedEmp.employeeCode}</Text>
                  </View>
                </View>
              ) : empNameParam ? (
                <Text style={s.textInput}>{empNameParam}</Text>
              ) : (
                <Text style={s.placeholder}>Select employee…</Text>
              )}
              <View style={{ paddingRight: 12 }}>
                <Feather name="chevron-down" size={16} color={colors.gray[400]} />
              </View>
            </TouchableOpacity>
          </View>

          <View style={s.field}>
            <Text style={s.label}>DATE *</Text>
            <TouchableOpacity style={s.inputRow} onPress={() => setShowDatePicker(true)} activeOpacity={0.7}>
              <View style={s.inputPrefix}>
                <Feather name="calendar" size={14} color={colors.bytecode[500]} />
              </View>
              <Text style={[s.textInput, { lineHeight: 50 }]}>{fmtDateDisplay(date)}</Text>
            </TouchableOpacity>
          </View>

          <View style={s.field}>
            <Text style={s.label}>DURATION</Text>
            <View style={s.segment}>
              <TouchableOpacity
                style={[s.segmentOption, !isHalfDay && s.segmentOptionActive]}
                onPress={() => setIsHalfDay(false)}
                activeOpacity={0.8}
              >
                <Text style={[s.segmentText, !isHalfDay && s.segmentTextActive]}>Full day</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.segmentOption, isHalfDay && s.segmentOptionActive]}
                onPress={() => setIsHalfDay(true)}
                activeOpacity={0.8}
              >
                <Text style={[s.segmentText, isHalfDay && s.segmentTextActive]}>Half day</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

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
                placeholder="e.g. Approved via phone…"
                placeholderTextColor={colors.gray[400]}
                textAlignVertical="top"
              />
            </View>
          </View>
        </View>
      </ScrollView>

      {showDatePicker && Platform.OS === "android" && (
        <DateTimePicker
          value={new Date(date)}
          mode="date"
          display="default"
          maximumDate={new Date()}
          onChange={(_, d) => {
            setShowDatePicker(false);
            if (d) setDate(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`);
          }}
        />
      )}

      {Platform.OS === "ios" && (
        <Modal transparent animationType="slide" visible={showDatePicker}
          onRequestClose={() => setShowDatePicker(false)}>
          <View style={s.iosOverlay}>
            <View style={s.iosSheet}>
              <View style={s.iosSheetHeader}>
                <Text style={s.iosSheetTitle}>Select Date</Text>
                <TouchableOpacity onPress={() => setShowDatePicker(false)} hitSlop={8}>
                  <Text style={s.iosDone}>Done</Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={new Date(date)}
                mode="date"
                display="spinner"
                maximumDate={new Date()}
                onChange={(_, d) => {
                  if (d) setDate(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`);
                }}
                themeVariant="light"
                style={{ width: "100%" }}
              />
            </View>
          </View>
        </Modal>
      )}

      <Modal visible={empPickerOpen} animationType="slide"
        onRequestClose={() => { setEmpPickerOpen(false); setEmpSearch(""); }}>
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
                  <Text style={s.empItemSub}>{item.employeeCode}</Text>
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

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.gray[50] },
  content: { padding: 16, gap: 20 },
  sectionLabel: { flexDirection: "row", alignItems: "center", gap: 6, paddingLeft: 2 },
  sectionLabelText: { fontSize: 13, fontWeight: "700", color: colors.bytecode[700] },
  group: { gap: 14 },
  field: { gap: 6 },
  label: { fontSize: 10, fontWeight: "800", color: colors.gray[400], letterSpacing: 1 },
  inputRow: {
    flexDirection: "row", alignItems: "center", backgroundColor: "#fff",
    borderWidth: 1.5, borderColor: colors.bytecode[100], borderRadius: 14, overflow: "hidden",
  },
  inputPrefix: {
    width: 44, height: 50, alignItems: "center", justifyContent: "center",
    borderRightWidth: 1, borderRightColor: colors.bytecode[50],
  },
  textInput: { flex: 1, height: 50, paddingHorizontal: 12, fontSize: 15, color: colors.gray[900] },
  textarea: { height: undefined, minHeight: 90, paddingTop: 14, paddingBottom: 14 },
  placeholder: { flex: 1, height: 50, lineHeight: 50, paddingHorizontal: 12, fontSize: 15, color: colors.gray[400] },
  empSelectedInner: { flex: 1, flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 12, paddingVertical: 8 },
  empAvatar: {
    width: 32, height: 32, borderRadius: 9,
    backgroundColor: colors.bytecode[50], alignItems: "center", justifyContent: "center",
  },
  empInitials: { fontSize: 12, fontWeight: "800", color: colors.bytecode[700] },
  empName: { fontSize: 14, fontWeight: "700", color: colors.gray[900] },
  empSub: { fontSize: 11, color: colors.gray[400], marginTop: 1 },
  segment: {
    flexDirection: "row", backgroundColor: colors.bytecode[50],
    borderRadius: 14, padding: 4, gap: 4,
  },
  segmentOption: {
    flex: 1, alignItems: "center", justifyContent: "center",
    height: 42, borderRadius: 11,
  },
  segmentOptionActive: { backgroundColor: "#fff" },
  segmentText: { fontSize: 13, fontWeight: "700", color: colors.gray[400] },
  segmentTextActive: { color: colors.bytecode[700] },
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
