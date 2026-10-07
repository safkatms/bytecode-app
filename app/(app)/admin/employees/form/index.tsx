// app/(app)/admin/employees/form.tsx

import React, { useEffect } from "react";
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
import { Alert as RNAlert } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Feather from "@expo/vector-icons/Feather";

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

// ─── Schemas ──────────────────────────────────────────────────

const createSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Enter a valid email"),
  phone: z.string().optional(),
  employeeCode: z.string().min(1, "Employee code is required"),
  department: z.string().optional(),
  designation: z.string().optional(),
  joiningDate: z.string().min(1, "Joining date is required"),
});

const updateSchema = z.object({
  employeeCode: z.string().min(1, "Employee code is required"),
  department: z.string().optional(),
  designation: z.string().optional(),
  joiningDate: z.string().min(1, "Joining date is required"),
});

type CreateForm = z.infer<typeof createSchema>;
type UpdateForm = z.infer<typeof updateSchema>;

// ─── Screen ───────────────────────────────────────────────────

export default function AdminEmployeeFormScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const qc = useQueryClient();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const isEdit = !!id;

  const [otpModal, setOtpModal] = React.useState<{
    visible: boolean;
    password: string;
    name: string;
  }>({ visible: false, password: "", name: "" });

  const { data: existing, isLoading: loadingExisting } = useQuery({
    queryKey: ["admin-employee", id],
    queryFn: () => adminGetEmployee(Number(id)),
    enabled: isEdit,
  });

  // ── Create form ──────────────────────────────────────────────
  const {
    control: cc,
    handleSubmit: cSubmit,
    setError: cSetError,
    formState: { errors: ce },
  } = useForm<CreateForm>({
    resolver: zodResolver(createSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      employeeCode: "",
      department: "",
      designation: "",
      joiningDate: new Date().toISOString().split("T")[0],
    },
  });

  // ── Update form ──────────────────────────────────────────────
  const {
    control: uc,
    handleSubmit: uSubmit,
    reset: uReset,
    setError: uSetError,
    formState: { errors: ue },
  } = useForm<UpdateForm>({
    resolver: zodResolver(updateSchema),
    defaultValues: {
      employeeCode: "",
      department: "",
      designation: "",
      joiningDate: new Date().toISOString().split("T")[0],
    },
  });

  useEffect(() => {
    if (existing && isEdit) {
      uReset({
        employeeCode: existing.employeeCode,
        department: existing.department ?? "",
        designation: existing.designation ?? "",
        joiningDate: existing.joiningDate.split("T")[0],
      });
    }
  }, [existing, isEdit, uReset]);

  // ── Mutations ────────────────────────────────────────────────
  const createMut = useMutation({
    mutationFn: (data: CreateForm) => adminCreateEmployee(data),
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: ["admin-employees"] });
      setOtpModal({
        visible: true,
        password: result.temporaryPassword,
        name: `${result.employee.user?.firstName ?? ""} ${result.employee.user?.lastName ?? ""}`.trim(),
      });
    },
    onError: (err) =>
      cSetError("root", {
        message: getApiErrorMessage(err, "Failed to create employee"),
      }),
  });

  const updateMut = useMutation({
    mutationFn: (data: UpdateForm) => adminUpdateEmployee(Number(id), data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-employees"] });
      qc.invalidateQueries({ queryKey: ["admin-employee", id] });
      router.back();
    },
    onError: (err) =>
      uSetError("root", {
        message: getApiErrorMessage(err, "Failed to update employee"),
      }),
  });

  // ── Loading state ────────────────────────────────────────────
  if (isEdit && loadingExisting) {
    return (
      <View style={s.center}>
        <Spinner />
      </View>
    );
  }

  // ── Edit ─────────────────────────────────────────────────────
  if (isEdit) {
    return (
      <KeyboardAvoidingView
        style={[s.root, { paddingTop: insets.top }]}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <PageHeader
          title="Edit Employee"
          variant="teal"
          rightTextAction={{
            label: updateMut.isPending ? "Saving…" : "Save",
            onPress: uSubmit((d) => updateMut.mutate(d)),
            disabled: updateMut.isPending,
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
          {ue.root?.message && (
            <AlertUI message={ue.root.message} type="error" />
          )}

          <View style={s.card}>
            <InputField
              label="Employee Code"
              icon="hash"
              placeholder="EMP-001"
              control={uc}
              name="employeeCode"
              error={ue.employeeCode?.message}
              autoCapitalize="characters"
            />
            <Divider />
            <InputField
              label="Department"
              icon="briefcase"
              placeholder="Engineering"
              control={uc}
              name="department"
              error={ue.department?.message}
            />
            <Divider />
            <InputField
              label="Designation"
              icon="award"
              placeholder="Software Engineer"
              control={uc}
              name="designation"
              error={ue.designation?.message}
            />
            <Divider />
            <InputField
              label="Joining Date"
              icon="calendar"
              placeholder="YYYY-MM-DD"
              control={uc}
              name="joiningDate"
              error={ue.joiningDate?.message}
              keyboardType="numbers-and-punctuation"
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  // ── Create ───────────────────────────────────────────────────
  return (
    <KeyboardAvoidingView
      style={[s.root, { paddingTop: insets.top }]}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <PageHeader
        title="New Employee"
        variant="teal"
        rightTextAction={{
          label: createMut.isPending ? "Saving…" : "Save",
          onPress: cSubmit((d) => createMut.mutate(d)),
          disabled: createMut.isPending,
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
        {ce.root?.message && <AlertUI message={ce.root.message} type="error" />}

        {/* Account details */}
        <View style={s.sectionLabel}>
          <Feather name="user" size={13} color={colors.teal[600]} />
          <Text style={s.sectionLabelText}>Account details</Text>
        </View>
        <View style={s.card}>
          <InputField
            label="First name"
            icon="user"
            placeholder="John"
            control={cc}
            name="firstName"
            error={ce.firstName?.message}
          />
          <Divider />
          <InputField
            label="Last name"
            icon="user"
            placeholder="Doe"
            control={cc}
            name="lastName"
            error={ce.lastName?.message}
          />
          <Divider />
          <InputField
            label="Email"
            icon="mail"
            placeholder="john@company.com"
            control={cc}
            name="email"
            error={ce.email?.message}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <Divider />
          <InputField
            label="Phone"
            icon="phone"
            placeholder="+8801700000000"
            control={cc}
            name="phone"
            error={ce.phone?.message}
            keyboardType="phone-pad"
          />
        </View>

        {/* Employee details */}
        <View style={s.sectionLabel}>
          <Feather name="briefcase" size={13} color={colors.teal[600]} />
          <Text style={s.sectionLabelText}>Employee details</Text>
        </View>
        <View style={s.card}>
          <InputField
            label="Employee code"
            icon="hash"
            placeholder="EMP-001"
            control={cc}
            name="employeeCode"
            error={ce.employeeCode?.message}
            autoCapitalize="characters"
          />
          <Divider />
          <InputField
            label="Department"
            icon="briefcase"
            placeholder="Engineering"
            control={cc}
            name="department"
            error={ce.department?.message}
          />
          <Divider />
          <InputField
            label="Designation"
            icon="award"
            placeholder="Software Engineer"
            control={cc}
            name="designation"
            error={ce.designation?.message}
          />
          <Divider />
          <InputField
            label="Joining date"
            icon="calendar"
            placeholder="YYYY-MM-DD"
            control={cc}
            name="joiningDate"
            error={ce.joiningDate?.message}
            keyboardType="numbers-and-punctuation"
          />
        </View>

        <View style={s.infoBox}>
          <Feather name="info" size={14} color={colors.teal[600]} />
          <Text style={s.infoText}>
            A secure one-time password will be generated and shown after saving.
            Share it with the employee securely.
          </Text>
        </View>
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

// ─── Shared field component ───────────────────────────────────

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
              <Feather name={icon as any} size={15} color={colors.teal[500]} />
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

function Divider() {
  return <View style={s.divider} />;
}

// ─── Styles ───────────────────────────────────────────────────

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.gray[50] },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  content: { padding: 16, gap: 16 },

  sectionLabel: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: -4,
    paddingLeft: 4,
  },
  sectionLabelText: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.teal[700],
  },

  card: {
    backgroundColor: "#fff",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.gray[100],
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  divider: {
    height: 1,
    backgroundColor: colors.gray[100],
    marginLeft: 56,
  },

  field: { paddingHorizontal: 4, paddingVertical: 2 },
  label: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.gray[500],
    marginLeft: 56,
    marginTop: 12,
    marginBottom: 2,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 4,
    marginBottom: 4,
    borderWidth: 0,
  },
  inputRowError: {},
  inputPrefix: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  textInput: {
    flex: 1,
    height: 44,
    paddingHorizontal: 4,
    fontSize: 15,
    color: colors.gray[900],
  },
  fieldError: {
    fontSize: 12,
    color: colors.red[500],
    marginLeft: 56,
    marginBottom: 8,
  },

  infoBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    backgroundColor: colors.teal[50],
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.teal[100],
    padding: 14,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: colors.teal[700],
    lineHeight: 19,
  },
});
