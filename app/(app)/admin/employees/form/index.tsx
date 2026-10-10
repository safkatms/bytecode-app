// app/(app)/admin/employees/form.tsx

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
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Feather from "@expo/vector-icons/Feather";
import DateTimePicker from "@react-native-community/datetimepicker";
import * as Contacts from "expo-contacts";

import { PageHeader } from "@/components/ui/PageHeader";
import { Spinner } from "@/components/ui/Spinner";
import { AlertUI } from "@/components/ui/Alert";
import { OtpRevealModal } from "@/components/ui/OtpRevealModal";
import { colors } from "@/components/ui/theme";
import { getApiErrorMessage } from "@/lib/api-error";
import {
  adminCreateEmployee,
  adminUpdateEmployee,
  adminGetEmployee,
} from "@/lib/api/attendance.api";
import { adminListActiveDepartments } from "@/lib/api/department.api";
import type { Department } from "@/types/attendance";

// ─── Helpers ──────────────────────────────────────────────────

function pad(n: number) {
  return String(n).padStart(2, "0");
}
function fmt(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
function displayFmt(iso: string) {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

// ─── Schema ───────────────────────────────────────────────────

const schema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Enter a valid email"),
  phone: z.string().optional(),
  employeeCode: z.string().min(1, "Employee code is required"),
  departmentId: z.number().optional(),
  designation: z.string().optional(),
  joiningDate: z.string().min(1, "Joining date is required"),
  weekendDays: z.array(z.number()).optional(),
});

type FormData = z.infer<typeof schema>;

// ─── Joining date field ───────────────────────────────────────

function JoiningDateField({
  control,
  error,
}: {
  control: any;
  error?: string;
}) {
  const [active, setActive] = useState(false);
  return (
    <View style={s.field}>
      <Text style={s.label}>JOINING DATE</Text>
      <Controller
        control={control}
        name="joiningDate"
        render={({ field: { onChange, value } }) => (
          <>
            <TouchableOpacity
              style={[s.inputRow, !!error && s.inputRowError]}
              onPress={() => setActive(true)}
              activeOpacity={0.7}
            >
              <View style={s.inputPrefix}>
                <Feather
                  name="calendar"
                  size={14}
                  color={colors.bytecode[500]}
                />
              </View>
              <Text
                style={[
                  s.textInput,
                  {
                    lineHeight: 50,
                    color: value ? colors.gray[900] : colors.gray[400],
                  },
                ]}
              >
                {value ? displayFmt(value) : "Select date"}
              </Text>
            </TouchableOpacity>

            {active && Platform.OS === "android" && (
              <DateTimePicker
                mode="date"
                display="default"
                value={value ? new Date(value) : new Date()}
                onChange={(_, date) => {
                  setActive(false);
                  if (date) onChange(fmt(date));
                }}
              />
            )}
            {active && Platform.OS === "ios" && (
              <View style={s.iosPickerWrap}>
                <View style={s.iosPickerHeader}>
                  <Text style={s.iosPickerTitle}>Joining date</Text>
                  <TouchableOpacity onPress={() => setActive(false)}>
                    <Text style={s.iosPickerDone}>Done</Text>
                  </TouchableOpacity>
                </View>
                <DateTimePicker
                  mode="date"
                  display="spinner"
                  value={value ? new Date(value) : new Date()}
                  onChange={(_, date) => {
                    if (date) onChange(fmt(date));
                  }}
                  themeVariant="light"
                />
              </View>
            )}
          </>
        )}
      />
      {error && <Text style={s.fieldError}>{error}</Text>}
    </View>
  );
}

// ─── Input field ──────────────────────────────────────────────

function InputField({
  label,
  icon,
  error,
  control,
  name,
  ...inputProps
}: {
  label: string;
  icon: string;
  error?: string;
  control: any;
  name: string;
} & Omit<React.ComponentProps<typeof TextInput>, "style">) {
  return (
    <View style={s.field}>
      <Text style={s.label}>{label}</Text>
      <Controller
        control={control}
        name={name}
        render={({ field: { onChange, onBlur, value } }) => (
          <View style={[s.inputRow, !!error && s.inputRowError]}>
            <View style={s.inputPrefix}>
              <Feather
                name={icon as any}
                size={14}
                color={colors.bytecode[500]}
              />
            </View>
            <TextInput
              style={s.textInput}
              placeholderTextColor={colors.gray[400]}
              onBlur={onBlur}
              onChangeText={onChange}
              value={value}
              {...inputProps}
            />
          </View>
        )}
      />
      {error && <Text style={s.fieldError}>{error}</Text>}
    </View>
  );
}

// ─── Department picker ────────────────────────────────────────

function DepartmentPicker({
  departments,
  value,
  onChange,
  error,
}: {
  departments: Department[];
  value?: number;
  onChange: (id: number | undefined) => void;
  error?: string;
}) {
  const [open, setOpen] = useState(false);
  const selected = departments.find((d) => d.id === value);

  return (
    <View style={s.field}>
      <Text style={s.label}>DEPARTMENT</Text>
      <TouchableOpacity
        style={[s.inputRow, open && s.inputRowOpen]}
        onPress={() => setOpen((p) => !p)}
        activeOpacity={0.75}
      >
        <View style={s.inputPrefix}>
          <Feather name="briefcase" size={14} color={colors.bytecode[500]} />
        </View>
        <Text
          style={[
            s.textInput,
            { lineHeight: 50 },
            !selected && { color: colors.gray[400] },
          ]}
          numberOfLines={1}
        >
          {selected ? selected.name : "Select department…"}
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
          <TouchableOpacity
            style={[s.dropdownItem, !value && s.dropdownItemActive]}
            onPress={() => {
              onChange(undefined);
              setOpen(false);
            }}
          >
            <Text
              style={[s.dropdownItemText, !value && s.dropdownItemTextActive]}
            >
              None
            </Text>
          </TouchableOpacity>
          {departments.map((dept) => (
            <TouchableOpacity
              key={dept.id}
              style={[
                s.dropdownItem,
                dept.id === value && s.dropdownItemActive,
              ]}
              onPress={() => {
                onChange(dept.id);
                setOpen(false);
              }}
            >
              <Text
                style={[
                  s.dropdownItemText,
                  dept.id === value && s.dropdownItemTextActive,
                ]}
              >
                {dept.name}
              </Text>
              {dept.id === value && (
                <Feather name="check" size={14} color={colors.bytecode[600]} />
              )}
            </TouchableOpacity>
          ))}
        </View>
      )}
      {error && <Text style={s.fieldError}>{error}</Text>}
    </View>
  );
}

// ─── Weekend days picker ──────────────────────────────────────

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function WeekendDaysPicker({
  value = [5, 6],
  onChange,
}: {
  value?: number[];
  onChange: (days: number[]) => void;
}) {
  function toggle(i: number) {
    if (value.includes(i)) {
      onChange(value.filter((d) => d !== i));
    } else {
      onChange([...value, i].sort((a, b) => a - b));
    }
  }

  return (
    <View style={s.field}>
      <Text style={s.label}>WEEKEND DAYS</Text>
      <View style={s.weekendRow}>
        {DAY_LABELS.map((day, i) => {
          const on = value.includes(i);
          return (
            <TouchableOpacity
              key={i}
              style={[s.weekendDay, on && s.weekendDayOn]}
              onPress={() => toggle(i)}
              activeOpacity={0.7}
            >
              <Text style={[s.weekendDayText, on && s.weekendDayTextOn]}>
                {day}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────

export default function AdminEmployeeFormScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const qc = useQueryClient();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const isEdit = !!id;

  const [otpModal, setOtpModal] = useState<{
    visible: boolean;
    password: string;
    name: string;
  }>({ visible: false, password: "", name: "" });

  const { data: existing, isLoading: loadingExisting } = useQuery({
    queryKey: ["admin-employee", id],
    queryFn: () => adminGetEmployee(Number(id)),
    enabled: isEdit,
  });

  const { data: departments = [] } = useQuery({
    queryKey: ["departments-active"],
    queryFn: adminListActiveDepartments,
  });

  const {
    control,
    handleSubmit,
    reset,
    setValue,
    setError,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      employeeCode: "",
      departmentId: undefined,
      designation: "",
      joiningDate: fmt(new Date()),
      weekendDays: [5, 6],
    },
  });

  useEffect(() => {
    if (existing && isEdit) {
      reset({
        firstName: existing.user?.firstName ?? "",
        lastName: existing.user?.lastName ?? "",
        email: existing.user?.email ?? "",
        phone: existing.user?.phone ?? "",
        employeeCode: existing.employeeCode,
        departmentId: existing.departmentId ?? undefined,
        designation: existing.designation ?? "",
        joiningDate: existing.joiningDate.split("T")[0],
        weekendDays: existing.weekendDays ?? [5, 6],
      });
    }
  }, [existing, isEdit, reset]);

  const pickContact = async () => {
    try {
      const { status } = await Contacts.requestPermissionsAsync();
      if (status !== "granted") return;
      const contact = await Contacts.presentContactPickerAsync();
      if (!contact) return;
      const parts = (contact.name ?? "").split(" ");
      setValue("firstName", parts[0] ?? "", { shouldValidate: true });
      setValue("lastName", parts.slice(1).join(" ") ?? "", {
        shouldValidate: true,
      });
      setValue("phone", contact.phoneNumbers?.[0]?.number ?? "", {
        shouldValidate: true,
      });
    } catch (e) {
      console.error(e);
    }
  };

  const createMut = useMutation({
    mutationFn: (data: FormData) => adminCreateEmployee(data),
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: ["admin-employees"] });
      setOtpModal({
        visible: true,
        password: result.temporaryPassword,
        name: `${result.employee.user?.firstName ?? ""} ${result.employee.user?.lastName ?? ""}`.trim(),
      });
    },
    onError: (err) =>
      setError("root", {
        message: getApiErrorMessage(err, "Failed to create employee"),
      }),
  });

  const updateMut = useMutation({
    mutationFn: (data: FormData) => adminUpdateEmployee(Number(id), data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-employees"] });
      qc.invalidateQueries({ queryKey: ["admin-employee", id] });
      router.back();
    },
    onError: (err) =>
      setError("root", {
        message: getApiErrorMessage(err, "Failed to update employee"),
      }),
  });

  const isPending = createMut.isPending || updateMut.isPending;
  const onSubmit = (data: FormData) => {
    if (isEdit) updateMut.mutate(data);
    else createMut.mutate(data);
  };

  if (isEdit && loadingExisting) {
    return (
      <View style={s.center}>
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
        title={isEdit ? "Edit Employee" : "New Employee"}
        variant="bytecode"
        rightTextAction={{
          label: isPending ? "Saving…" : "Save",
          onPress: handleSubmit(onSubmit),
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
        {errors.root?.message && (
          <AlertUI message={errors.root.message} type="error" />
        )}

        {/* Account details */}
        <View style={s.sectionLabel}>
          <Feather name="user" size={13} color={colors.bytecode[600]} />
          <Text style={s.sectionLabelText}>Account details</Text>
        </View>
        <View style={s.group}>
          {/* First name + contacts */}
          <View style={s.field}>
            <Text style={s.label}>FIRST NAME</Text>
            <Controller
              control={control}
              name="firstName"
              render={({ field: { onChange, onBlur, value } }) => (
                <View
                  style={[s.inputRow, !!errors.firstName && s.inputRowError]}
                >
                  <View style={s.inputPrefix}>
                    <Feather
                      name="user"
                      size={14}
                      color={colors.bytecode[500]}
                    />
                  </View>
                  <TextInput
                    style={s.textInput}
                    placeholder="John"
                    placeholderTextColor={colors.gray[400]}
                    onBlur={onBlur}
                    onChangeText={onChange}
                    value={value}
                  />
                  <TouchableOpacity
                    style={s.contactButton}
                    onPress={pickContact}
                    activeOpacity={0.7}
                  >
                    <Feather
                      name="book"
                      size={14}
                      color={colors.bytecode[600]}
                    />
                    <Text style={s.contactButtonText}>Contacts</Text>
                  </TouchableOpacity>
                </View>
              )}
            />
            {errors.firstName && (
              <Text style={s.fieldError}>{errors.firstName.message}</Text>
            )}
          </View>

          <InputField
            label="LAST NAME"
            icon="user"
            placeholder="Doe"
            control={control}
            name="lastName"
            error={errors.lastName?.message}
          />
          <InputField
            label="EMAIL"
            icon="mail"
            placeholder="john@company.com"
            control={control}
            name="email"
            error={errors.email?.message}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <InputField
            label="PHONE"
            icon="phone"
            placeholder="+8801700000000"
            control={control}
            name="phone"
            error={errors.phone?.message}
            keyboardType="phone-pad"
          />
        </View>

        {/* Employee details */}
        <View style={s.sectionLabel}>
          <Feather name="briefcase" size={13} color={colors.bytecode[600]} />
          <Text style={s.sectionLabelText}>Employee details</Text>
        </View>
        <View style={s.group}>
          <InputField
            label="EMPLOYEE CODE"
            icon="hash"
            placeholder="EMP-001"
            control={control}
            name="employeeCode"
            error={errors.employeeCode?.message}
            autoCapitalize="characters"
          />
          <Controller
            control={control}
            name="departmentId"
            render={({ field: { onChange, value } }) => (
              <DepartmentPicker
                departments={departments}
                value={value}
                onChange={onChange}
                error={errors.departmentId?.message}
              />
            )}
          />
          <InputField
            label="DESIGNATION"
            icon="award"
            placeholder="Software Engineer"
            control={control}
            name="designation"
            error={errors.designation?.message}
          />
          <JoiningDateField
            control={control}
            error={errors.joiningDate?.message}
          />
          <Controller
            control={control}
            name="weekendDays"
            render={({ field: { onChange, value } }) => (
              <WeekendDaysPicker value={value} onChange={onChange} />
            )}
          />
        </View>

        {!isEdit && (
          <View style={s.infoBox}>
            <Feather name="info" size={14} color={colors.bytecode[600]} />
            <Text style={s.infoText}>
              A secure one-time password will be generated and shown after
              saving. Share it with the employee securely.
            </Text>
          </View>
        )}
      </ScrollView>

      <OtpRevealModal
        visible={otpModal.visible}
        password={otpModal.password}
        userName={otpModal.name}
        onClose={() => {
          setOtpModal((prev) => ({ ...prev, visible: false }));
          router.back();
        }}
      />
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
  inputRowError: { borderColor: colors.red[400] },
  inputRowOpen: { borderBottomLeftRadius: 0, borderBottomRightRadius: 0 },
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
    paddingVertical: 13,
    borderTopWidth: 1,
    borderTopColor: colors.gray[100],
  },
  dropdownItemActive: { backgroundColor: colors.bytecode[50] },
  dropdownItemText: { fontSize: 14, color: colors.gray[700] },
  dropdownItemTextActive: { fontWeight: "700", color: colors.bytecode[700] },

  infoBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    backgroundColor: colors.bytecode[50],
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.bytecode[100],
    padding: 14,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: colors.bytecode[700],
    lineHeight: 19,
  },

  iosPickerWrap: {
    backgroundColor: "#fff",
    borderRadius: 14,
    borderWidth: 1.5,
    borderTopWidth: 0,
    borderColor: colors.bytecode[100],
    overflow: "hidden",
  },
  iosPickerHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[100],
  },
  iosPickerTitle: { fontSize: 14, fontWeight: "600", color: colors.gray[700] },
  iosPickerDone: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.bytecode[600],
  },

  contactButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: colors.bytecode[50],
    marginRight: 8,
  },
  contactButtonText: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.bytecode[600],
  },

  weekendRow: { flexDirection: "row", gap: 6 },
  weekendDay: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    borderRadius: 10,
    backgroundColor: "#fff",
    borderWidth: 1.5,
    borderColor: colors.bytecode[100],
  },
  weekendDayOn: {
    backgroundColor: colors.bytecode[600],
    borderColor: colors.bytecode[600],
  },
  weekendDayText: { fontSize: 11, fontWeight: "700", color: colors.gray[400] },
  weekendDayTextOn: { color: "#fff" },
});
