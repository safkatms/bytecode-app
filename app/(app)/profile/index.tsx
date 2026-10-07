// app/(app)/profile/index.tsx

import React, { useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Feather from "@expo/vector-icons/Feather";
import { getMe, updateMe } from "@/lib/api/users.api";
import { useAuthStore } from "@/store/auth.store";
import { getApiErrorMessage } from "@/lib/api-error";
import { colors } from "@/components/ui/theme";
import { PageHeader } from "@/components/ui/PageHeader";
import { AlertUI } from "@/components/ui/Alert";
import { Spinner } from "@/components/ui/Spinner";

const schema = z.object({
  firstName: z.string().min(1, "Required").max(50),
  lastName: z.string().min(1, "Required").max(50),
  email: z.string().email("Invalid email"),
  phone: z.string().max(20).optional(),
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
  ...props
}: { icon: string } & React.ComponentProps<typeof TextInput>) {
  return (
    <View style={s.inputRow}>
      <View style={s.inputPrefix}>
        <Feather name={icon as any} size={14} color={colors.bytecode[500]} />
      </View>
      <TextInput
        style={s.textInput}
        placeholderTextColor={colors.gray[400]}
        {...props}
      />
    </View>
  );
}

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const { setUser } = useAuthStore();
  const [error, setError] = React.useState("");
  const [saved, setSaved] = React.useState(false);

  const { data: me, isLoading } = useQuery({
    queryKey: ["me"],
    queryFn: getMe,
  });

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
    },
  });

  useEffect(() => {
    if (me) {
      reset({
        firstName: me.firstName ?? "",
        lastName: me.lastName ?? "",
        email: me.email ?? "",
        phone: me.phone ?? "",
      });
    }
  }, [me]);

  const saveMut = useMutation({
    mutationFn: (data: FormData) =>
      updateMe({
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        phone: data.phone || undefined,
      }),
    onSuccess: (updated) => {
      setUser(updated as any);
      qc.invalidateQueries({ queryKey: ["me"] });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    },
    onError: (err) => setError(getApiErrorMessage(err)),
  });

  if (isLoading) {
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
        title="Edit Profile"
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
        {saved ? (
          <AlertUI message="Profile updated successfully" type="success" />
        ) : null}

        {/* Avatar block */}
        <View style={s.avatarBlock}>
          <View style={s.avatar}>
            <Text style={s.avatarText}>
              {me?.firstName?.[0] ?? ""}
              {me?.lastName?.[0] ?? ""}
            </Text>
          </View>
          <View>
            <Text style={s.avatarName}>
              {me?.firstName} {me?.lastName}
            </Text>
            <Text style={s.avatarEmail}>{me?.email}</Text>
          </View>
        </View>

        <Field label="FIRST NAME *" error={errors.firstName?.message}>
          <Controller
            control={control}
            name="firstName"
            render={({ field: { onChange, value, onBlur } }) => (
              <TextRow
                icon="user"
                placeholder="First name"
                onChangeText={onChange}
                value={value}
                onBlur={onBlur}
                autoCapitalize="words"
              />
            )}
          />
        </Field>

        <Field label="LAST NAME *" error={errors.lastName?.message}>
          <Controller
            control={control}
            name="lastName"
            render={({ field: { onChange, value, onBlur } }) => (
              <TextRow
                icon="user"
                placeholder="Last name"
                onChangeText={onChange}
                value={value}
                onBlur={onBlur}
                autoCapitalize="words"
              />
            )}
          />
        </Field>

        <Field label="EMAIL *" error={errors.email?.message}>
          <Controller
            control={control}
            name="email"
            render={({ field: { onChange, value, onBlur } }) => (
              <TextRow
                icon="mail"
                placeholder="you@example.com"
                onChangeText={onChange}
                value={value}
                onBlur={onBlur}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            )}
          />
        </Field>

        <Field label="PHONE" error={errors.phone?.message}>
          <Controller
            control={control}
            name="phone"
            render={({ field: { onChange, value, onBlur } }) => (
              <TextRow
                icon="phone"
                placeholder="+880 1700 000000"
                onChangeText={onChange}
                value={value}
                onBlur={onBlur}
                keyboardType="phone-pad"
              />
            )}
          />
        </Field>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.gray[50] },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  content: { padding: 16, gap: 14 },
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
  avatarBlock: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.gray[100],
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.bytecode[100],
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { fontSize: 20, fontWeight: "900", color: colors.bytecode[700] },
  avatarName: { fontSize: 16, fontWeight: "800", color: colors.gray[900] },
  avatarEmail: { fontSize: 12, color: colors.gray[400], marginTop: 2 },
});
