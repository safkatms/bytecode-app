// app/(app)/admin/departments/form.tsx

import React, { useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Switch,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Feather from "@expo/vector-icons/Feather";
import {
  adminCreateDepartment,
  adminUpdateDepartment,
  adminGetDepartment,
} from "@/lib/api/department.api";
import { getApiErrorMessage } from "@/lib/api-error";
import { colors } from "@/components/ui/theme";
import { PageHeader } from "@/components/ui/PageHeader";
import { AlertUI } from "@/components/ui/Alert";
import { Spinner } from "@/components/ui/Spinner";

const schema = z.object({
  name: z.string().min(1, "Required").max(100, "Max 100 characters"),
  description: z.string().max(255, "Max 255 characters").optional(),
  isActive: z.boolean().optional(),
});
type FormData = z.infer<typeof schema>;

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <View style={s.field}>
      <Text style={s.label}>{label}</Text>
      {children}
      {error ? <Text style={s.fieldError}>{error}</Text> : null}
    </View>
  );
}

function TextRow({
  icon,
  multiline,
  ...props
}: { icon: string; multiline?: boolean } & React.ComponentProps<
  typeof TextInput
>) {
  return (
    <View style={[s.inputRow, multiline && s.inputRowMulti]}>
      <View style={[s.inputPrefix, multiline && s.inputPrefixTop]}>
        <Feather name={icon as any} size={14} color={colors.bytecode[500]} />
      </View>
      <TextInput
        style={[s.textInput, multiline && s.textInputMulti]}
        placeholderTextColor={colors.gray[400]}
        multiline={multiline}
        textAlignVertical={multiline ? "top" : "center"}
        {...props}
      />
    </View>
  );
}

export default function AdminDepartmentFormScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const isEdit = !!id;
  const [error, setError] = React.useState("");

  const { data: existing, isLoading: loadingExisting } = useQuery({
    queryKey: ["admin-department", id],
    queryFn: () => adminGetDepartment(Number(id)),
    enabled: isEdit,
  });

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", description: "", isActive: true },
  });

  useEffect(() => {
    if (existing) {
      reset({
        name: existing.name,
        description: existing.description ?? "",
        isActive: existing.isActive,
      });
    }
  }, [existing]);

  const saveMut = useMutation({
    mutationFn: (data: FormData) => {
      const payload = {
        name: data.name,
        description: data.description || undefined,
        ...(isEdit ? { isActive: data.isActive } : {}),
      };
      return isEdit
        ? adminUpdateDepartment(Number(id), payload)
        : adminCreateDepartment(payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-departments"] });
      if (isEdit) {
        qc.invalidateQueries({ queryKey: ["admin-department", id] });
      }
      router.back();
    },
    onError: (err) => setError(getApiErrorMessage(err)),
  });

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
        title={isEdit ? "Edit Department" : "New Department"}
        variant="bytecode"
        rightTextAction={{
          label: saveMut.isPending ? "Saving…" : "Save",
          onPress: handleSubmit((d) => saveMut.mutate(d)),
          disabled: saveMut.isPending,
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

        <Field label="DEPARTMENT NAME *" error={errors.name?.message}>
          <Controller
            control={control}
            name="name"
            render={({ field: { onChange, value, onBlur } }) => (
              <TextRow
                icon="briefcase"
                placeholder="e.g. Engineering"
                onChangeText={onChange}
                value={value}
                onBlur={onBlur}
              />
            )}
          />
        </Field>

        <Field label="DESCRIPTION" error={errors.description?.message}>
          <Controller
            control={control}
            name="description"
            render={({ field: { onChange, value, onBlur } }) => (
              <TextRow
                icon="align-left"
                placeholder="Short description (optional)"
                onChangeText={onChange}
                value={value}
                onBlur={onBlur}
                multiline
              />
            )}
          />
        </Field>

        {isEdit && (
          <Field label="STATUS">
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
                        ? "Department is visible and assignable"
                        : "Department is hidden from dropdowns"}
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
          </Field>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.gray[50] },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  content: { padding: 16, gap: 16 },
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
  inputRowMulti: { alignItems: "flex-start", minHeight: 100 },
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
    minHeight: 80,
    paddingTop: 14,
    paddingBottom: 14,
  },
  fieldError: { fontSize: 12, color: colors.red[500] },
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
});
