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
  const selectedName = selected
    ? `${selected.user.firstName ?? ""} ${selected.user.lastName ?? ""}`.trim()
    : undefined;

  return (
    <View style={s.field}>
      <Text style={s.label}>{label}</Text>
      <TouchableOpacity
        style={[s.inputRow, open && s.inputRowOpen, !!error && s.inputRowError]}
        onPress={() => setOpen((p) => !p)}
        activeOpacity={0.75}
      >
        <View style={s.inputPrefix}>
          <Feather name="user" size={14} color={colors.bytecode[500]} />
        </View>
        <Text
          style={[
            s.textInput,
            { lineHeight: 50 },
            !selectedName && { color: colors.gray[400] },
          ]}
          numberOfLines={1}
        >
          {selectedName ?? "Select employee…"}
        </Text>
        <View style={{ paddingRight: 12 }}>
          <Feather
            name={open ? "chevron-up" : "chevron-down"}
            size={16}
            color={colors.gray[400]}
          />
        </View>
      </TouchableOpacity>
      {open && (
        <View style={s.dropdownList}>
          {employees.map((emp) => {
            const name =
              `${emp.user.firstName ?? ""} ${emp.user.lastName ?? ""}`.trim() ||
              emp.employeeCode;
            const isSelected = emp.id === value;
            return (
              <TouchableOpacity
                key={emp.id}
                style={[s.dropdownItem, isSelected && s.dropdownItemActive]}
                onPress={() => {
                  onChange(emp.id);
                  setOpen(false);
                }}
              >
                <View>
                  <Text
                    style={[
                      s.dropdownItemText,
                      isSelected && s.dropdownItemTextActive,
                    ]}
                  >
                    {name}
                  </Text>
                  <Text style={s.dropdownItemSub}>{emp.employeeCode}</Text>
                </View>
                {isSelected && (
                  <Feather name="check" size={14} color={colors.bytecode[600]} />
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      )}
      {error && <Text style={s.fieldError}>{error}</Text>}
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
      <View style={s.memberAvatar}>
        <Text style={s.memberAvatarText}>
          {(member.user.firstName?.[0] ?? "") + (member.user.lastName?.[0] ?? "") || "?"}
        </Text>
      </View>
      <View style={s.memberInfo}>
        <Text style={s.memberName}>{name}</Text>
        <Text style={s.memberCode}>{member.employeeCode}</Text>
      </View>
      {isLeader ? (
        <View style={s.leaderBadge}>
          <Text style={s.leaderBadgeText}>Leader</Text>
        </View>
      ) : (
        <TouchableOpacity onPress={onRemove} hitSlop={8} style={s.removeMemberBtn}>
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

  const addMemberMut = useMutation({
    mutationFn: (employeeId: number) =>
      adminAddTeamMember(Number(id), employeeId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-team", id] });
      setAddMemberOpen(false);
    },
    onError: (err) =>
      Alert.alert("Error", getApiErrorMessage(err, "Failed to add member")),
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
      style={[s.root, { paddingTop: insets.top }]}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <PageHeader
        title={isEdit ? "Edit Team" : "New Team"}
        variant="bytecode"
        rightTextAction={{
          label: isPending ? "Saving…" : "Save",
          onPress: handleSubmit((d) => saveMut.mutate(d)),
          disabled: isPending,
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
                    <Feather name="users" size={14} color={colors.bytecode[500]} />
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
              <Feather name="user-check" size={13} color={colors.bytecode[600]} />
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

              {/* Add member */}
              {addMemberOpen ? (
                <View style={s.addMemberPicker}>
                  <View style={s.memberSep} />
                  {availableToAdd.length === 0 ? (
                    <Text style={s.emptyMembersText}>
                      All employees are already members
                    </Text>
                  ) : (
                    availableToAdd.slice(0, 50).map((emp, i) => {
                      const name =
                        `${emp.user.firstName ?? ""} ${emp.user.lastName ?? ""}`.trim() ||
                        emp.employeeCode;
                      return (
                        <React.Fragment key={emp.id}>
                          <TouchableOpacity
                            style={s.addMemberItem}
                            onPress={() => addMemberMut.mutate(emp.id)}
                            disabled={addMemberMut.isPending}
                          >
                            <Text style={s.addMemberName}>{name}</Text>
                            <Text style={s.addMemberCode}>{emp.employeeCode}</Text>
                          </TouchableOpacity>
                          {i < availableToAdd.length - 1 && (
                            <View style={s.memberSep} />
                          )}
                        </React.Fragment>
                      );
                    })
                  )}
                </View>
              ) : null}
            </View>

            <TouchableOpacity
              style={s.addMemberBtn}
              onPress={() => setAddMemberOpen((p) => !p)}
              activeOpacity={0.75}
            >
              <Feather
                name={addMemberOpen ? "x" : "user-plus"}
                size={14}
                color={colors.bytecode[600]}
              />
              <Text style={s.addMemberBtnText}>
                {addMemberOpen ? "Cancel" : "Add member"}
              </Text>
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
  inputRowOpen: { borderBottomLeftRadius: 0, borderBottomRightRadius: 0 },
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
    paddingBottom: 14,
  },
  fieldError: { fontSize: 12, color: colors.red[500] },

  dropdownList: {
    backgroundColor: "#fff",
    borderWidth: 1.5,
    borderTopWidth: 0,
    borderColor: colors.bytecode[100],
    borderBottomLeftRadius: 14,
    borderBottomRightRadius: 14,
    overflow: "hidden",
  },
  dropdownItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderTopWidth: 1,
    borderTopColor: colors.gray[100],
  },
  dropdownItemActive: { backgroundColor: colors.bytecode[50] },
  dropdownItemText: { fontSize: 14, color: colors.gray[700] },
  dropdownItemTextActive: { fontWeight: "700", color: colors.bytecode[700] },
  dropdownItemSub: { fontSize: 11, color: colors.gray[400], marginTop: 1 },

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
  memberAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.bytecode[100],
    alignItems: "center",
    justifyContent: "center",
  },
  memberAvatarText: {
    fontSize: 12,
    fontWeight: "800",
    color: colors.bytecode[700],
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

  addMemberPicker: { paddingBottom: 4 },
  addMemberItem: {
    paddingHorizontal: 16,
    paddingVertical: 11,
  },
  addMemberName: { fontSize: 14, color: colors.gray[800], fontWeight: "600" },
  addMemberCode: { fontSize: 11, color: colors.gray[400], marginTop: 1 },

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
