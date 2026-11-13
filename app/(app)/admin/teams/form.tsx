// app/(app)/admin/teams/form.tsx

import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Switch,
  Alert,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Feather from "@expo/vector-icons/Feather";
import {
  adminCreateTeam,
  adminUpdateTeam,
  adminGetTeam,
  adminAddTeamMember,
  adminRemoveTeamMember,
} from "@/lib/api/teams.api";
import { adminListEmployees } from "@/lib/api/attendance.api";
import { getApiErrorMessage } from "@/lib/api-error";
import { colors } from "@/components/ui/theme";
import { PageHeader } from "@/components/ui/PageHeader";
import { AlertUI } from "@/components/ui/Alert";
import { Spinner } from "@/components/ui/Spinner";
import { Avatar } from "@/components/ui/Avatar";
import { EmployeePickerModal } from "@/components/ui/EmployeePickerModal";
import type { Employee, TeamMember } from "@/types/attendance";

// ─── Schema ───────────────────────────────────────────────────

const schema = z.object({
  name: z.string().min(1, "Required").max(100, "Max 100 characters"),
  description: z.string().max(255, "Max 255 characters").optional(),
  leaderId: z.number({ required_error: "Leader is required" }),
  isActive: z.boolean().optional(),
});
type FormData = z.infer<typeof schema>;

// ─── Employee picker ──────────────────────────────────────────

function EmployeePicker({
  employees,
  value,
  onChange,
  label,
  error,
}: {
  employees: Employee[];
  value?: number;
  onChange: (id: number) => void;
  label: string;
  error?: string;
}) {
  const [open, setOpen] = useState(false);
  const selected = employees.find((e) => e.id === value);

  return (
    <View style={s.field}>
      <Text style={s.label}>{label}</Text>
      <TouchableOpacity
        style={[s.inputRow, !!error && s.inputRowError]}
        onPress={() => setOpen(true)}
        activeOpacity={0.75}
      >
        <View style={s.inputPrefix}>
          <Feather name="user" size={14} color={colors.bytecode[500]} />
        </View>
        {selected ? (
          <View style={s.selectedEmp}>
            <Avatar
              uri={selected.user.avatarUrl}
              firstName={selected.user.firstName}
              lastName={selected.user.lastName}
              size={32}
            />
            <View style={{ flex: 1 }}>
              <Text style={s.selectedEmpName} numberOfLines={1}>
                {`${selected.user.firstName ?? ""} ${selected.user.lastName ?? ""}`.trim() ||
                  selected.employeeCode}
              </Text>
              <Text style={s.selectedEmpCode}>{selected.employeeCode}</Text>
            </View>
          </View>
        ) : (
          <Text
            style={[s.textInput, { lineHeight: 50, color: colors.gray[400] }]}
            numberOfLines={1}
          >
            Select employee…
          </Text>
        )}
        <View style={{ paddingRight: 12 }}>
          <Feather name="chevron-down" size={16} color={colors.gray[400]} />
        </View>
      </TouchableOpacity>
      {error && <Text style={s.fieldError}>{error}</Text>}

      <EmployeePickerModal
        visible={open}
        title="Select Team Leader"
        employees={employees}
        selectedId={value}
        onSelect={(emp) => {
          onChange(emp.id);
          setOpen(false);
        }}
        onClose={() => setOpen(false)}
      />
    </View>
  );
}

// ─── Member row ───────────────────────────────────────────────

function MemberRow({
  member,
  isLeader,
  onRemove,
}: {
  member: TeamMember;
  isLeader: boolean;
  onRemove: () => void;
}) {
  const name =
    `${member.user.firstName ?? ""} ${member.user.lastName ?? ""}`.trim() ||
    member.employeeCode;
  return (
    <View style={s.memberRow}>
      <Avatar
        uri={member.user.avatarUrl}
        firstName={member.user.firstName}
        lastName={member.user.lastName}
        size={36}
      />
      <View style={s.memberInfo}>
        <Text style={s.memberName}>{name}</Text>
        <Text style={s.memberCode}>{member.employeeCode}</Text>
      </View>
      {isLeader ? (
        <View style={s.leaderBadge}>
          <Text style={s.leaderBadgeText}>Leader</Text>
        </View>
      ) : (
        <TouchableOpacity
          onPress={onRemove}
          hitSlop={8}
          style={s.removeMemberBtn}
        >
          <Feather name="x" size={13} color={colors.red[500]} />
        </TouchableOpacity>
      )}
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────

export default function AdminTeamFormScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const isEdit = !!id;

  const [addMemberOpen, setAddMemberOpen] = useState(false);

  const { data: existing, isLoading: loadingExisting } = useQuery({
    queryKey: ["admin-team", id],
    queryFn: () => adminGetTeam(Number(id)),
    enabled: isEdit,
  });

  const { data: empData } = useQuery({
    queryKey: ["admin-employees-all"],
    queryFn: () => adminListEmployees({ limit: 200 }),
  });
  const employees = empData?.data ?? [];

  const {
    control,
    handleSubmit,
    reset,
    setError,
    watch,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", description: "", isActive: true },
  });

  const watchedLeaderId = watch("leaderId");

  useEffect(() => {
    if (existing && isEdit) {
      reset({
        name: existing.name,
        description: existing.description ?? "",
        leaderId: existing.leaderId,
        isActive: existing.isActive,
      });
    }
  }, [existing, isEdit, reset]);

  const saveMut = useMutation({
    mutationFn: (data: FormData) => {
      const payload = {
        name: data.name,
        description: data.description || undefined,
        leaderId: data.leaderId,
        ...(isEdit ? { isActive: data.isActive } : {}),
      };
      return isEdit
        ? adminUpdateTeam(Number(id), payload)
        : adminCreateTeam(payload as any);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-teams"] });
      if (isEdit) qc.invalidateQueries({ queryKey: ["admin-team", id] });
      router.back();
    },
    onError: (err) =>
      setError("root", {
        message: getApiErrorMessage(err, "Failed to save team"),
      }),
  });

  const addMembersMut = useMutation({
    mutationFn: async (selected: Employee[]) => {
      const failed: string[] = [];
      for (const emp of selected) {
        try {
          await adminAddTeamMember(Number(id), emp.id);
        } catch (err) {
          failed.push(
            `${emp.user.firstName ?? ""} ${emp.user.lastName ?? ""}`.trim() ||
              emp.employeeCode,
          );
        }
      }
      return failed;
    },
    onSuccess: (failed) => {
      qc.invalidateQueries({ queryKey: ["admin-team", id] });
      setAddMemberOpen(false);
      if (failed.length > 0)
        Alert.alert("Some members were not added", failed.join(", "));
    },
  });

  const removeMemberMut = useMutation({
    mutationFn: (employeeId: number) =>
      adminRemoveTeamMember(Number(id), employeeId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-team", id] }),
    onError: (err) =>
      Alert.alert("Error", getApiErrorMessage(err, "Failed to remove member")),
  });

  const isPending = saveMut.isPending;

  const memberIds = new Set(existing?.members?.map((m) => m.id) ?? []);
  const availableToAdd = employees.filter((e) => !memberIds.has(e.id));

  if (isEdit && loadingExisting) {
    return (
      <View style={[s.center, { paddingTop: insets.top }]}>
        <Spinner />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={s.root}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <PageHeader
        title={isEdit ? "Edit Team" : "New Team"}
        variant="bytecode"
        insetTop
        rightTextAction={{
          label: isPending ? "Saving…" : "Save",
          onPress: handleSubmit((d) => saveMut.mutate(d)),
          disabled: isPending,
        }}
      />
      <ScrollView
        contentContainerStyle={[
          s.content,
          { paddingBottom: insets.bottom + 10 },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {errors.root?.message ? (
          <AlertUI message={errors.root.message} type="error" />
        ) : null}

        {/* Team info */}
        <View style={s.sectionLabel}>
          <Feather name="users" size={13} color={colors.bytecode[600]} />
          <Text style={s.sectionLabelText}>Team details</Text>
        </View>
        <View style={s.group}>
          <View style={s.field}>
            <Text style={s.label}>TEAM NAME *</Text>
            <Controller
              control={control}
              name="name"
              render={({ field: { onChange, onBlur, value } }) => (
                <View style={[s.inputRow, !!errors.name && s.inputRowError]}>
                  <View style={s.inputPrefix}>
                    <Feather
                      name="users"
                      size={14}
                      color={colors.bytecode[500]}
                    />
                  </View>
                  <TextInput
                    style={s.textInput}
                    placeholder="e.g. Backend Team"
                    placeholderTextColor={colors.gray[400]}
                    onBlur={onBlur}
                    onChangeText={onChange}
                    value={value}
                  />
                </View>
              )}
            />
            {errors.name && (
              <Text style={s.fieldError}>{errors.name.message}</Text>
            )}
          </View>

          <View style={s.field}>
            <Text style={s.label}>DESCRIPTION</Text>
            <Controller
              control={control}
              name="description"
              render={({ field: { onChange, onBlur, value } }) => (
                <View style={[s.inputRow, s.inputRowMulti]}>
                  <View style={[s.inputPrefix, s.inputPrefixTop]}>
                    <Feather
                      name="align-left"
                      size={14}
                      color={colors.bytecode[500]}
                    />
                  </View>
                  <TextInput
                    style={[s.textInput, s.textInputMulti]}
                    placeholder="Short description (optional)"
                    placeholderTextColor={colors.gray[400]}
                    onBlur={onBlur}
                    onChangeText={onChange}
                    value={value}
                    multiline
                    textAlignVertical="top"
                  />
                </View>
              )}
            />
            {errors.description && (
              <Text style={s.fieldError}>{errors.description.message}</Text>
            )}
          </View>

          <Controller
            control={control}
            name="leaderId"
            render={({ field: { onChange, value } }) => (
              <EmployeePicker
                employees={employees}
                value={value}
                onChange={onChange}
                label="TEAM LEADER *"
                error={errors.leaderId?.message}
              />
            )}
          />

          {isEdit && (
            <View style={s.field}>
              <Text style={s.label}>STATUS</Text>
              <Controller
                control={control}
                name="isActive"
                render={({ field: { onChange, value } }) => (
                  <View style={s.switchRow}>
                    <View style={s.switchInfo}>
                      <Text style={s.switchLabel}>
                        {value ? "Active" : "Inactive"}
                      </Text>
                      <Text style={s.switchSub}>
                        {value
                          ? "Team is visible and active"
                          : "Team is hidden and inactive"}
                      </Text>
                    </View>
                    <Switch
                      value={value}
                      onValueChange={onChange}
                      trackColor={{
                        false: colors.gray[200],
                        true: colors.bytecode[400],
                      }}
                      thumbColor="#fff"
                    />
                  </View>
                )}
              />
            </View>
          )}
        </View>

        {/* Members — edit only */}
        {isEdit && existing && (
          <>
            <View style={s.sectionLabel}>
              <Feather
                name="user-check"
                size={13}
                color={colors.bytecode[600]}
              />
              <Text style={s.sectionLabelText}>
                Members ({existing.members?.length ?? 0})
              </Text>
            </View>
            <View style={s.membersCard}>
              {(existing.members ?? []).map((member, i) => (
                <React.Fragment key={member.id}>
                  <MemberRow
                    member={member}
                    isLeader={member.id === watchedLeaderId}
                    onRemove={() =>
                      Alert.alert(
                        "Remove Member",
                        `Remove ${member.user.firstName ?? ""} ${member.user.lastName ?? ""} from the team?`,
                        [
                          { text: "Cancel", style: "cancel" },
                          {
                            text: "Remove",
                            style: "destructive",
                            onPress: () => removeMemberMut.mutate(member.id),
                          },
                        ],
                      )
                    }
                  />
                  {i < (existing.members?.length ?? 0) - 1 && (
                    <View style={s.memberSep} />
                  )}
                </React.Fragment>
              ))}

              {existing.members?.length === 0 && (
                <View style={s.emptyMembers}>
                  <Text style={s.emptyMembersText}>No members yet</Text>
                </View>
              )}
            </View>

            <EmployeePickerModal
              visible={addMemberOpen}
              title="Add Member"
              employees={availableToAdd}
              multiple
              busy={addMembersMut.isPending}
              confirmLabel={(n) => `Add ${n} member${n > 1 ? "s" : ""}`}
              onConfirm={(emps) => addMembersMut.mutate(emps)}
              onClose={() => setAddMemberOpen(false)}
            />

            <TouchableOpacity
              style={s.addMemberBtn}
              onPress={() => setAddMemberOpen(true)}
              activeOpacity={0.75}
            >
              <Feather
                name="user-plus"
                size={14}
                color={colors.bytecode[600]}
              />
              <Text style={s.addMemberBtnText}>Add member</Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ─── Styles ───────────────────────────────────────────────────

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.gray[50] },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
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
  inputRowMulti: { alignItems: "flex-start", minHeight: 90 },
  inputRowError: { borderColor: colors.red[400] },
  inputPrefix: {
    width: 44,
    height: 50,
    alignItems: "center",
    justifyContent: "center",
    borderRightWidth: 1,
    borderRightColor: colors.bytecode[50],
  },
  inputPrefixTop: { height: undefined, paddingVertical: 14 },
  textInput: {
    flex: 1,
    height: 50,
    paddingHorizontal: 12,
    fontSize: 15,
    color: colors.gray[900],
  },
  textInputMulti: {
    height: undefined,
    minHeight: 70,
    paddingTop: 14,
    paddingBottom: 10,
  },
  fieldError: { fontSize: 12, color: colors.red[500] },

  selectedEmp: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  selectedEmpName: { fontSize: 14, fontWeight: "700", color: colors.gray[900] },
  selectedEmpCode: { fontSize: 11, color: colors.gray[400], marginTop: 1 },

  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: colors.bytecode[100],
    padding: 14,
    gap: 12,
  },
  switchInfo: { flex: 1 },
  switchLabel: { fontSize: 15, fontWeight: "700", color: colors.gray[900] },
  switchSub: { fontSize: 12, color: colors.gray[400], marginTop: 2 },

  membersCard: {
    backgroundColor: "#fff",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.gray[100],
    overflow: "hidden",
  },
  memberRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
  },
  memberInfo: { flex: 1 },
  memberName: { fontSize: 14, fontWeight: "700", color: colors.gray[900] },
  memberCode: { fontSize: 11, color: colors.gray[400], marginTop: 1 },
  memberSep: { height: 1, backgroundColor: colors.gray[100] },
  leaderBadge: {
    backgroundColor: colors.bytecode[50],
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  leaderBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.bytecode[700],
  },
  removeMemberBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: colors.red[50],
    alignItems: "center",
    justifyContent: "center",
  },
  emptyMembers: { padding: 16, alignItems: "center" },
  emptyMembersText: { fontSize: 13, color: colors.gray[400] },

  addMemberBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    backgroundColor: colors.bytecode[50],
    borderRadius: 12,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: colors.bytecode[100],
  },
  addMemberBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.bytecode[700],
  },
});
