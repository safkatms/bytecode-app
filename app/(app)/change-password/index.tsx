import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import Feather from "@expo/vector-icons/Feather";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { changePassword } from "@/lib/api/auth.api";
import { colors } from "@/components/ui/theme";
import { getApiErrorMessage } from "@/lib/api-error";
import { AlertUI } from "@/components/ui/Alert";
import { PageHeader } from "@/components/ui/PageHeader";

const schema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: z
      .string()
      .min(8, "At least 8 characters")
      .regex(/[A-Z]/, "Must contain uppercase")
      .regex(/[a-z]/, "Must contain lowercase")
      .regex(/\d/, "Must contain a number")
      .regex(/[@$!%*?&^#]/, "Must contain a special character"),
    confirmPassword: z.string().min(1, "Please confirm your password"),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type FormData = z.infer<typeof schema>;

function PasswordField({
  label,
  icon,
  placeholder,
  show,
  onToggle,
  error,
  control,
  name,
}: {
  label: string;
  icon: string;
  placeholder: string;
  show: boolean;
  onToggle: () => void;
  error?: string;
  control: any;
  name: string;
}) {
  return (
    <View style={s.field}>
      <Text style={s.label}>{label}</Text>
      <Controller
        control={control}
        name={name}
        render={({ field: { onChange, value } }) => (
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
              value={value}
              onChangeText={onChange}
              placeholder={placeholder}
              placeholderTextColor={colors.gray[400]}
              secureTextEntry={!show}
              autoCapitalize="none"
            />
            <TouchableOpacity
              style={s.inputSuffix}
              onPress={onToggle}
              hitSlop={8}
            >
              <Feather
                name={show ? "eye-off" : "eye"}
                size={14}
                color={colors.gray[400]}
              />
            </TouchableOpacity>
          </View>
        )}
      />
      {error && <Text style={s.fieldError}>{error}</Text>}
    </View>
  );
}

export default function ChangePasswordScreen() {
  const insets = useSafeAreaInsets();
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: FormData) => {
    setApiError(null);
    try {
      await changePassword(data.currentPassword, data.newPassword);
      setSuccess(true);
      reset();
    } catch (err) {
      setApiError(getApiErrorMessage(err, "Failed to change password"));
    }
  };

  return (
    <KeyboardAvoidingView
      style={[s.root, { paddingTop: insets.top }]}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <PageHeader title="Change Password" variant="bytecode" />
      <ScrollView
        contentContainerStyle={[
          s.content,
          { paddingBottom: insets.bottom + 32 },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {success && (
          <AlertUI message="Password changed successfully" type="success" />
        )}
        {apiError && <AlertUI message={apiError} type="error" />}

        <View style={s.group}>
          <PasswordField
            label="CURRENT PASSWORD"
            icon="lock"
            placeholder="Enter current password"
            show={showCurrent}
            onToggle={() => setShowCurrent((p) => !p)}
            error={errors.currentPassword?.message}
            control={control}
            name="currentPassword"
          />
          <PasswordField
            label="NEW PASSWORD"
            icon="key"
            placeholder="Enter new password"
            show={showNew}
            onToggle={() => setShowNew((p) => !p)}
            error={errors.newPassword?.message}
            control={control}
            name="newPassword"
          />
          <PasswordField
            label="CONFIRM NEW PASSWORD"
            icon="check"
            placeholder="Repeat new password"
            show={showConfirm}
            onToggle={() => setShowConfirm((p) => !p)}
            error={errors.confirmPassword?.message}
            control={control}
            name="confirmPassword"
          />
        </View>

        <View style={s.hintCard}>
          <Text style={s.hintTitle}>Password requirements</Text>
          {[
            "At least 8 characters",
            "One uppercase letter",
            "One lowercase letter",
            "One number",
            "One special character (@$!%*?&^#)",
          ].map((hint) => (
            <View key={hint} style={s.hintRow}>
              <View style={s.hintDot} />
              <Text style={s.hintText}>{hint}</Text>
            </View>
          ))}
        </View>

        <TouchableOpacity
          style={[s.submitButton, isSubmitting && s.submitDisabled]}
          onPress={handleSubmit(onSubmit)}
          disabled={isSubmitting}
          activeOpacity={0.85}
        >
          {isSubmitting ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <>
              <Feather name="shield" size={16} color="#fff" />
              <Text style={s.submitLabel}>Update password</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.gray[50] },
  content: { padding: 16, gap: 20 },

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
  inputPrefix: {
    width: 44,
    height: 50,
    alignItems: "center",
    justifyContent: "center",
    borderRightWidth: 1,
    borderRightColor: colors.bytecode[50],
  },
  inputSuffix: {
    width: 44,
    height: 50,
    alignItems: "center",
    justifyContent: "center",
  },
  textInput: {
    flex: 1,
    height: 50,
    paddingHorizontal: 12,
    fontSize: 15,
    color: colors.gray[900],
  },
  fieldError: { fontSize: 12, color: colors.red[500] },

  hintCard: {
    backgroundColor: "#fff",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.gray[100],
    padding: 14,
    gap: 8,
  },
  hintTitle: { fontSize: 12, fontWeight: "800", color: colors.gray[700] },
  hintRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  hintDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.bytecode[400],
  },
  hintText: { fontSize: 12, color: colors.gray[500], fontWeight: "500" },

  submitButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: colors.bytecode[600],
    borderRadius: 14,
    paddingVertical: 15,
  },
  submitDisabled: { opacity: 0.6 },
  submitLabel: { fontSize: 15, fontWeight: "800", color: "#fff" },
});
