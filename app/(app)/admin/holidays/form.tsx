// app/(app)/admin/holidays/form.tsx

import React, { useEffect, useState } from "react";
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  TextInput, KeyboardAvoidingView, Platform, Modal, FlatList,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import DateTimePicker from "@react-native-community/datetimepicker";
import Feather from "@expo/vector-icons/Feather";
import { createHoliday, getHoliday, updateHoliday } from "@/lib/api/holiday.api";
import { adminListEmployees } from "@/lib/api/attendance.api";
import { adminListActiveTeams } from "@/lib/api/teams.api";
import { getApiErrorMessage } from "@/lib/api-error";
import { colors } from "@/components/ui/theme";
import { PageHeader } from "@/components/ui/PageHeader";
import { AlertUI } from "@/components/ui/Alert";
import type { Employee, Team } from "@/types/attendance";

function pad(n: number) { return String(n).padStart(2, "0"); }
function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
function fmtDisplay(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    weekday: "short", day: "numeric", month: "short", year: "numeric",
  });
}
function isoFromDate(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

type DateField = "start" | "end";
type PickerModal = "emp" | "team" | null;

export default function AdminHolidayFormScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const isEdit = !!id;

  const [name, setName] = useState("");
  const [startDate, setStartDate] = useState(todayISO());
  const [endDate, setEndDate] = useState(todayISO());
  const [description, setDescription] = useState("");
  const [excludeEmpIds, setExcludeEmpIds] = useState<number[]>([]);
  const [excludeTeamIds, setExcludeTeamIds] = useState<number[]>([]);
  const [error, setError] = useState("");
  const [activePicker, setActivePicker] = useState<DateField | null>(null);
  const [pickerModal, setPickerModal] = useState<PickerModal>(null);
  const [search, setSearch] = useState("");

  const { data: existing } = useQuery({
    queryKey: ["admin-holiday", id],
    queryFn: () => getHoliday(Number(id)),
    enabled: isEdit,
  });

  const { data: empData } = useQuery({
    queryKey: ["admin-employees-pick"],
    queryFn: () => adminListEmployees({ limit: 200 }),
    staleTime: 2 * 60 * 1000,
  });

  const { data: teams } = useQuery({
    queryKey: ["admin-teams-active"],
    queryFn: () => adminListActiveTeams(),
    staleTime: 2 * 60 * 1000,
  });

  useEffect(() => {
    if (!existing) return;
    setName(existing.name);
    setStartDate(existing.startDate.slice(0, 10));
    setEndDate(existing.endDate.slice(0, 10));
    setDescription(existing.description ?? "");
    if (existing.exclusions) {
      setExcludeEmpIds(existing.exclusions.filter((x) => x.employee).map((x) => x.employee!.id));
      setExcludeTeamIds(existing.exclusions.filter((x) => x.team).map((x) => x.team!.id));
    }
  }, [existing]);

  const mut = useMutation({
    mutationFn: () => {
      if (!name.trim()) throw new Error("Name is required");
      if (endDate < startDate) throw new Error("End date must be on or after start date");
      const payload = {
        name: name.trim(),
        startDate,
        endDate,
        description: description.trim() || undefined,
        excludeEmployeeIds: excludeEmpIds,
        excludeTeamIds,
      };
      return isEdit ? updateHoliday(Number(id), payload) : createHoliday(payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-holidays"] });
      if (isEdit) qc.invalidateQueries({ queryKey: ["admin-holiday", id] });
      router.back();
    },
    onError: (e) => setError(getApiErrorMessage(e, "Failed to save holiday")),
  });

  function handleDateChange(_: unknown, selected?: Date) {
    if (Platform.OS === "android") setActivePicker(null);
    if (!selected) return;
    const iso = isoFromDate(selected);
    if (activePicker === "start") {
      setStartDate(iso);
      if (iso > endDate) setEndDate(iso);
    } else {
      setEndDate(iso);
    }
  }

  function toggleEmp(id: number) {
    setExcludeEmpIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  }

  function toggleTeam(id: number) {
    setExcludeTeamIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  }

  const pickerValue = new Date(activePicker === "end" ? endDate : startDate);
  const allEmps = empData?.data ?? [];
  const allTeams = teams ?? [];

  const filteredEmps = allEmps.filter((e) => {
    const q = search.toLowerCase();
    return `${e.user.firstName ?? ""} ${e.user.lastName ?? ""}`.toLowerCase().includes(q)
      || e.employeeCode.toLowerCase().includes(q);
  });
  const filteredTeams = allTeams.filter((t) =>
    t.name.toLowerCase().includes(search.toLowerCase())
  );

  const selectedEmps = allEmps.filter((e) => excludeEmpIds.includes(e.id));
  const selectedTeams = allTeams.filter((t) => excludeTeamIds.includes(t.id));

  return (
    <KeyboardAvoidingView
      style={s.root}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <PageHeader
        title={isEdit ? "Edit Holiday" : "New Holiday"}
        variant="bytecode"
        insetTop
        rightTextAction={{
          label: mut.isPending ? "Saving…" : "Save",
          onPress: () => mut.mutate(),
          disabled: !name.trim() || mut.isPending,
        }}
      />

      <ScrollView
        contentContainerStyle={[s.content, { paddingBottom: insets.bottom + 32 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {error ? <AlertUI message={error} type="error" /> : null}

        {/* Details */}
        <View style={s.sectionLabel}>
          <Feather name="sun" size={13} color={colors.bytecode[600]} />
          <Text style={s.sectionLabelText}>Holiday details</Text>
        </View>
        <View style={s.group}>
          <View style={s.field}>
            <Text style={s.label}>NAME *</Text>
            <View style={s.inputRow}>
              <View style={s.inputPrefix}>
                <Feather name="tag" size={14} color={colors.bytecode[500]} />
              </View>
              <TextInput
                style={s.textInput}
                value={name}
                onChangeText={setName}
                placeholder="e.g. Eid ul-Fitr"
                placeholderTextColor={colors.gray[400]}
              />
            </View>
          </View>

          <View style={s.field}>
            <Text style={s.label}>START DATE *</Text>
            <TouchableOpacity style={s.inputRow} onPress={() => setActivePicker("start")} activeOpacity={0.7}>
              <View style={s.inputPrefix}>
                <Feather name="calendar" size={14} color={colors.bytecode[500]} />
              </View>
              <Text style={[s.textInput, { lineHeight: 50 }]}>{fmtDisplay(startDate)}</Text>
            </TouchableOpacity>
          </View>

          <View style={s.field}>
            <Text style={s.label}>END DATE *</Text>
            <TouchableOpacity style={s.inputRow} onPress={() => setActivePicker("end")} activeOpacity={0.7}>
              <View style={s.inputPrefix}>
                <Feather name="calendar" size={14} color={colors.bytecode[500]} />
              </View>
              <Text style={[s.textInput, { lineHeight: 50 }]}>{fmtDisplay(endDate)}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Description */}
        <View style={s.sectionLabel}>
          <Feather name="file-text" size={13} color={colors.bytecode[600]} />
          <Text style={s.sectionLabelText}>Description</Text>
        </View>
        <View style={s.group}>
          <View style={s.field}>
            <Text style={s.label}>DESCRIPTION (OPTIONAL)</Text>
            <View style={[s.inputRow, { height: "auto" as any }]}>
              <View style={[s.inputPrefix, { height: "auto" as any, paddingTop: 14, alignSelf: "flex-start" }]}>
                <Feather name="message-square" size={14} color={colors.bytecode[500]} />
              </View>
              <TextInput
                style={[s.textInput, s.textarea]}
                value={description}
                onChangeText={setDescription}
                multiline
                numberOfLines={3}
                placeholder="e.g. National public holiday"
                placeholderTextColor={colors.gray[400]}
                textAlignVertical="top"
              />
            </View>
          </View>
        </View>

        {/* Exclusions */}
        <View style={s.sectionLabel}>
          <Feather name="user-minus" size={13} color={colors.bytecode[600]} />
          <Text style={s.sectionLabelText}>Exclusions (optional)</Text>
        </View>
        <View style={s.group}>
          <View style={s.field}>
            <Text style={s.label}>EXCLUDE EMPLOYEES</Text>
            <TouchableOpacity
              style={s.inputRow}
              onPress={() => { setSearch(""); setPickerModal("emp"); }}
              activeOpacity={0.7}
            >
              <View style={s.inputPrefix}>
                <Feather name="users" size={14} color={colors.bytecode[500]} />
              </View>
              <Text style={[s.textInput, { lineHeight: 50, color: excludeEmpIds.length ? colors.gray[900] : colors.gray[400] }]}>
                {excludeEmpIds.length ? `${excludeEmpIds.length} employee${excludeEmpIds.length > 1 ? "s" : ""} excluded` : "Select employees…"}
              </Text>
              <View style={{ paddingRight: 12 }}>
                <Feather name="chevron-down" size={16} color={colors.gray[400]} />
              </View>
            </TouchableOpacity>
            {selectedEmps.length > 0 && (
              <View style={s.chips}>
                {selectedEmps.map((e) => (
                  <TouchableOpacity key={e.id} style={s.chip} onPress={() => toggleEmp(e.id)}>
                    <Text style={s.chipText}>{e.user.firstName} {e.user.lastName}</Text>
                    <Feather name="x" size={11} color={colors.bytecode[600]} />
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          <View style={s.field}>
            <Text style={s.label}>EXCLUDE TEAMS</Text>
            <TouchableOpacity
              style={s.inputRow}
              onPress={() => { setSearch(""); setPickerModal("team"); }}
              activeOpacity={0.7}
            >
              <View style={s.inputPrefix}>
                <Feather name="briefcase" size={14} color={colors.bytecode[500]} />
              </View>
              <Text style={[s.textInput, { lineHeight: 50, color: excludeTeamIds.length ? colors.gray[900] : colors.gray[400] }]}>
                {excludeTeamIds.length ? `${excludeTeamIds.length} team${excludeTeamIds.length > 1 ? "s" : ""} excluded` : "Select teams…"}
              </Text>
              <View style={{ paddingRight: 12 }}>
                <Feather name="chevron-down" size={16} color={colors.gray[400]} />
              </View>
            </TouchableOpacity>
            {selectedTeams.length > 0 && (
              <View style={s.chips}>
                {selectedTeams.map((t) => (
                  <TouchableOpacity key={t.id} style={s.chip} onPress={() => toggleTeam(t.id)}>
                    <Text style={s.chipText}>{t.name}</Text>
                    <Feather name="x" size={11} color={colors.bytecode[600]} />
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        </View>
      </ScrollView>

      {/* Date pickers */}
      {activePicker !== null && Platform.OS === "android" && (
        <DateTimePicker value={pickerValue} mode="date" display="default" onChange={handleDateChange} />
      )}
      {Platform.OS === "ios" && (
        <Modal transparent animationType="slide" visible={activePicker !== null}
          onRequestClose={() => setActivePicker(null)}>
          <View style={s.iosOverlay}>
            <View style={s.iosSheet}>
              <View style={s.iosSheetHeader}>
                <Text style={s.iosSheetTitle}>{activePicker === "start" ? "Start Date" : "End Date"}</Text>
                <TouchableOpacity onPress={() => setActivePicker(null)} hitSlop={8}>
                  <Text style={s.iosDone}>Done</Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={pickerValue} mode="date" display="spinner"
                onChange={handleDateChange} themeVariant="light" style={{ width: "100%" }}
              />
            </View>
          </View>
        </Modal>
      )}

      {/* Employee / Team picker modal */}
      <Modal
        visible={pickerModal !== null}
        animationType="slide"
        onRequestClose={() => setPickerModal(null)}
      >
        <View style={[s.empModal, { paddingTop: insets.top }]}>
          <View style={s.empModalHeader}>
            <Text style={s.empModalTitle}>
              {pickerModal === "emp" ? "Exclude Employees" : "Exclude Teams"}
            </Text>
            <TouchableOpacity onPress={() => setPickerModal(null)} hitSlop={8}>
              <Feather name="x" size={22} color={colors.gray[700]} />
            </TouchableOpacity>
          </View>
          <View style={s.empSearchBox}>
            <Feather name="search" size={16} color={colors.gray[400]} />
            <TextInput
              style={s.empSearchInput}
              placeholder={pickerModal === "emp" ? "Search by name or code…" : "Search teams…"}
              placeholderTextColor={colors.gray[400]}
              value={search}
              onChangeText={setSearch}
              autoFocus
            />
          </View>
          {pickerModal === "emp" ? (
            <FlatList
              data={filteredEmps}
              keyExtractor={(item) => String(item.id)}
              contentContainerStyle={s.empList}
              keyboardShouldPersistTaps="handled"
              ItemSeparatorComponent={() => <View style={{ height: 1, backgroundColor: colors.gray[50] }} />}
              renderItem={({ item }) => {
                const selected = excludeEmpIds.includes(item.id);
                return (
                  <TouchableOpacity style={s.empItem} onPress={() => toggleEmp(item.id)} activeOpacity={0.8}>
                    <View style={[s.empItemAvatar, selected && s.empItemAvatarSelected]}>
                      <Text style={[s.empItemInitials, selected && { color: "#fff" }]}>
                        {(item.user.firstName?.[0] ?? "?").toUpperCase()}{(item.user.lastName?.[0] ?? "").toUpperCase()}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={s.empItemName}>{item.user.firstName} {item.user.lastName}</Text>
                      <Text style={s.empItemSub}>{item.employeeCode}</Text>
                    </View>
                    {selected && <Feather name="check" size={16} color={colors.bytecode[600]} />}
                  </TouchableOpacity>
                );
              }}
              ListEmptyComponent={<View style={s.empEmpty}><Text style={s.empEmptyText}>No results found</Text></View>}
            />
          ) : (
            <FlatList
              data={filteredTeams}
              keyExtractor={(item) => String(item.id)}
              contentContainerStyle={s.empList}
              keyboardShouldPersistTaps="handled"
              ItemSeparatorComponent={() => <View style={{ height: 1, backgroundColor: colors.gray[50] }} />}
              renderItem={({ item }) => {
                const selected = excludeTeamIds.includes(item.id);
                return (
                  <TouchableOpacity style={s.empItem} onPress={() => toggleTeam(item.id)} activeOpacity={0.8}>
                    <View style={[s.empItemAvatar, selected && s.empItemAvatarSelected]}>
                      <Text style={[s.empItemInitials, selected && { color: "#fff" }]}>
                        {item.name[0].toUpperCase()}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={s.empItemName}>{item.name}</Text>
                    </View>
                    {selected && <Feather name="check" size={16} color={colors.bytecode[600]} />}
                  </TouchableOpacity>
                );
              }}
              ListEmptyComponent={<View style={s.empEmpty}><Text style={s.empEmptyText}>No results found</Text></View>}
            />
          )}
          <View style={[s.empModalFooter, { paddingBottom: insets.bottom + 12 }]}>
            <TouchableOpacity style={s.doneBtn} onPress={() => setPickerModal(null)}>
              <Text style={s.doneBtnText}>Done</Text>
            </TouchableOpacity>
          </View>
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
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 4 },
  chip: {
    flexDirection: "row", alignItems: "center", gap: 5,
    backgroundColor: colors.bytecode[50], borderRadius: 20,
    paddingHorizontal: 10, paddingVertical: 5,
    borderWidth: 1, borderColor: colors.bytecode[100],
  },
  chipText: { fontSize: 12, fontWeight: "600", color: colors.bytecode[700] },
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
  empList: { paddingHorizontal: 16, paddingBottom: 16 },
  empItem: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 13 },
  empItemAvatar: {
    width: 38, height: 38, borderRadius: 10,
    backgroundColor: colors.bytecode[50], alignItems: "center", justifyContent: "center",
  },
  empItemAvatarSelected: { backgroundColor: colors.bytecode[600] },
  empItemInitials: { fontSize: 13, fontWeight: "800", color: colors.bytecode[700] },
  empItemName: { fontSize: 14, fontWeight: "700", color: colors.gray[900] },
  empItemSub: { fontSize: 11, color: colors.gray[400], marginTop: 1 },
  empEmpty: { alignItems: "center", paddingTop: 48 },
  empEmptyText: { fontSize: 14, color: colors.gray[400] },
  empModalFooter: { padding: 16, borderTopWidth: 1, borderTopColor: colors.gray[100] },
  doneBtn: {
    backgroundColor: colors.bytecode[600], borderRadius: 14,
    paddingVertical: 14, alignItems: "center",
  },
  doneBtnText: { fontSize: 15, fontWeight: "800", color: "#fff" },
});
