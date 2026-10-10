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
import { useRouter } from "expo-router";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Feather from "@expo/vector-icons/Feather";
import {
  getOfficeLocation,
  adminSaveOfficeLocation,
} from "@/lib/api/location.api";
import { getApiErrorMessage } from "@/lib/api-error";
import { colors } from "@/components/ui/theme";
import { PageHeader } from "@/components/ui/PageHeader";
import { AlertUI } from "@/components/ui/Alert";
import { Spinner } from "@/components/ui/Spinner";

const schema = z.object({
  name: z.string().min(1, "Required"),
  latitude: z
    .string()
    .refine(
      (v) => !isNaN(Number(v)) && Number(v) >= -90 && Number(v) <= 90,
      "Valid latitude required",
    ),
  longitude: z
    .string()
    .refine(
      (v) => !isNaN(Number(v)) && Number(v) >= -180 && Number(v) <= 180,
      "Valid longitude required",
    ),
  radiusMeters: z
    .string()
    .refine(
      (v) => !isNaN(Number(v)) && Number(v) >= 10 && Number(v) <= 5000,
      "Must be 10–5000 meters",
    ),
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
      {error && <Text style={s.fieldError}>{error}</Text>}
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

export default function AdminLocationFormScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const [error, setError] = React.useState("");

  const { data: existing, isLoading } = useQuery({
    queryKey: ["office-location"],
    queryFn: getOfficeLocation,
  });

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { radiusMeters: "100" },
  });

  useEffect(() => {
    if (existing) {
      reset({
        name: existing.name,
        latitude: String(existing.latitude),
        longitude: String(existing.longitude),
        radiusMeters: String(existing.radiusMeters),
      });
    }
  }, [existing]);

  const saveMut = useMutation({
    mutationFn: (data: FormData) =>
      adminSaveOfficeLocation({
        name: data.name,
        latitude: Number(data.latitude),
        longitude: Number(data.longitude),
        radiusMeters: Number(data.radiusMeters),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["office-location"] });
      router.back();
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
        title="Office Location"
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

        <View style={s.hint}>
          <Feather name="info" size={13} color={colors.bytecode[600]} />
          <Text style={s.hintText}>
            Get coordinates from Google Maps: long press a location → copy the
            lat/lng shown at the bottom.
          </Text>
        </View>

        <Field label="LOCATION NAME *" error={errors.name?.message}>
          <Controller
            control={control}
            name="name"
            render={({ field: { onChange, value, onBlur } }) => (
              <TextRow
                icon="map-pin"
                placeholder="Head Office"
                onChangeText={onChange}
                value={value}
                onBlur={onBlur}
              />
            )}
          />
        </Field>
        <Field label="LATITUDE *" error={errors.latitude?.message}>
          <Controller
            control={control}
            name="latitude"
            render={({ field: { onChange, value, onBlur } }) => (
              <TextRow
                icon="navigation"
                placeholder="23.8103"
                onChangeText={onChange}
                value={value}
                onBlur={onBlur}
                keyboardType="numbers-and-punctuation"
              />
            )}
          />
        </Field>
        <Field label="LONGITUDE *" error={errors.longitude?.message}>
          <Controller
            control={control}
            name="longitude"
            render={({ field: { onChange, value, onBlur } }) => (
              <TextRow
                icon="navigation-2"
                placeholder="90.4125"
                onChangeText={onChange}
                value={value}
                onBlur={onBlur}
                keyboardType="numbers-and-punctuation"
              />
            )}
          />
        </Field>
        <Field label="RADIUS (METERS) *" error={errors.radiusMeters?.message}>
          <Controller
            control={control}
            name="radiusMeters"
            render={({ field: { onChange, value, onBlur } }) => (
              <TextRow
                icon="disc"
                placeholder="100"
                onChangeText={onChange}
                value={value}
                onBlur={onBlur}
                keyboardType="number-pad"
              />
            )}
          />
          <Text style={s.subHint}>
            Employees must be within this radius to check in. Recommended:
            50–200m.
          </Text>
        </Field>
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
  hint: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    backgroundColor: colors.bytecode[50],
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.bytecode[100],
  },
  hintText: {
    flex: 1,
    fontSize: 12,
    color: colors.bytecode[800],
    lineHeight: 18,
  },
  subHint: { fontSize: 11, color: colors.gray[400] },
});
