import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Image,
} from "react-native";
import * as Device from "expo-device";
import { useRouter } from "expo-router";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as SecureStore from "expo-secure-store";
import { login } from "@/lib/auth";
import { getApiErrorMessage } from "@/lib/api-error";
import { useAuthStore } from "@/store/auth.store";
import { colors } from "@/components/ui/theme";
import Feather from "@expo/vector-icons/Feather";
import { AlertUI } from "@/components/ui/Alert";
import { EnterShape } from "@/components/ui/EnterShape";

const DEVICE_ID_KEY = "app_device_id";

function uuidv4() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
}

async function getOrCreateDeviceId(): Promise<string> {
  try {
    const stored = await SecureStore.getItemAsync(DEVICE_ID_KEY);
    if (stored) return stored;
    const id = uuidv4();
    await SecureStore.setItemAsync(DEVICE_ID_KEY, id);
    return id;
  } catch {
    return uuidv4();
  }
}

function getDeviceName(): string {
  return (
    Device.deviceName ??
    Device.modelName ??
    `${Platform.OS === "ios" ? "iOS" : "Android"} Device`
  );
}
const schema = z.object({
  email: z.string().email("Invalid email"),
  password: z.string().min(1, "Password is required"),
});
type FormData = z.infer<typeof schema>;

type Field = "email" | "password";

// idle input fill; no theme token sits this light
const FIELD_BG = "#F8FBFF";

export default function LoginScreen() {
  const router = useRouter();
  const { setAuthenticated, setUser } = useAuthStore();
  const insets = useSafeAreaInsets();
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [focused, setFocused] = useState<Field | null>(null);

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: FormData) => {
    setError("");
    try {
      const [deviceId, deviceName] = await Promise.all([
        getOrCreateDeviceId(),
        Promise.resolve(getDeviceName()),
      ]);
      const user = await login(data.email, data.password, {
        deviceId,
        deviceName,
      });
      setUser(user);
      setAuthenticated(true);
      if (user.mustChangePassword) {
        router.replace("/(auth)/change-password");
      } else {
        router.replace("/(app)/dashboard");
      }
    } catch (err) {
      setError(getApiErrorMessage(err, "Login failed"));
    }
  };

  function rowStyle(field: Field) {
    return [
      styles.inputRow,
      focused === field && styles.inputRowFocused,
      errors[field] && styles.inputRowError,
    ];
  }

  function prefixStyle(field: Field) {
    return [styles.inputPrefix, errors[field] && styles.inputPrefixError];
  }

  function iconColor(field: Field) {
    return errors[field] ? colors.red[500] : colors.bytecode[600];
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      {/* Same gradient palette as the dashboard hero, pinned behind the content */}
      <View style={styles.decor} pointerEvents="none">
        <EnterShape style={styles.gradientMid} fromX={140} />
        <EnterShape
          style={styles.gradientBlobTop}
          delay={120}
          fromY={-90}
          fromScale={0.88}
        />
        <EnterShape
          style={styles.gradientBlobBottom}
          delay={240}
          fromX={-90}
          fromY={70}
          fromScale={0.88}
        />
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.container,
          { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Form card — brand and welcome live inside it */}
        <View style={styles.card}>
          <View style={styles.cardHead}>
            <Image
              source={require("../../../assets/BYTECODE-Logo.png")}
              style={styles.logo}
              resizeMode="cover"
            />
            <View style={styles.welcome}>
              <Text style={styles.title}>Welcome back</Text>
              <Text style={styles.subtitle}>Sign in to your account</Text>
            </View>
          </View>

          {error ? <AlertUI message={error} type="error" /> : null}

          <View style={styles.form}>
            {/* Email */}
            <View style={styles.field}>
              <Text style={styles.inputLabel}>Email</Text>
              <Controller
                control={control}
                name="email"
                render={({ field: { onChange, onBlur, value } }) => (
                  <View style={rowStyle("email")}>
                    <View style={prefixStyle("email")}>
                      <Feather
                        name="mail"
                        size={18}
                        color={iconColor("email")}
                      />
                    </View>
                    <TextInput
                      style={styles.textInput}
                      placeholder="admin@example.com"
                      placeholderTextColor={colors.gray[400]}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoComplete="email"
                      onFocus={() => setFocused("email")}
                      onBlur={() => {
                        setFocused(null);
                        onBlur();
                      }}
                      onChangeText={onChange}
                      value={value}
                    />
                  </View>
                )}
              />
              {errors.email && (
                <View style={styles.errorRow}>
                  <Feather
                    name="alert-circle"
                    size={12}
                    color={colors.red[500]}
                  />
                  <Text style={styles.fieldError}>{errors.email.message}</Text>
                </View>
              )}
            </View>

            {/* Password */}
            <View style={styles.field}>
              <Text style={styles.inputLabel}>Password</Text>
              <Controller
                control={control}
                name="password"
                render={({ field: { onChange, onBlur, value } }) => (
                  <View style={rowStyle("password")}>
                    <View style={prefixStyle("password")}>
                      <Feather
                        name="lock"
                        size={18}
                        color={iconColor("password")}
                      />
                    </View>
                    <TextInput
                      style={styles.textInput}
                      placeholder="••••••••"
                      placeholderTextColor={colors.gray[400]}
                      secureTextEntry={!showPassword}
                      autoComplete="current-password"
                      onFocus={() => setFocused("password")}
                      onBlur={() => {
                        setFocused(null);
                        onBlur();
                      }}
                      onChangeText={onChange}
                      value={value}
                    />
                    <TouchableOpacity
                      style={styles.inputSuffix}
                      onPress={() => setShowPassword((v) => !v)}
                      hitSlop={8}
                      activeOpacity={0.7}
                    >
                      <Feather
                        name={showPassword ? "eye-off" : "eye"}
                        size={18}
                        color={colors.gray[400]}
                      />
                    </TouchableOpacity>
                  </View>
                )}
              />
              {errors.password && (
                <View style={styles.errorRow}>
                  <Feather
                    name="alert-circle"
                    size={12}
                    color={colors.red[500]}
                  />
                  <Text style={styles.fieldError}>
                    {errors.password.message}
                  </Text>
                </View>
              )}
            </View>

            {/* Submit */}
            <TouchableOpacity
              style={[styles.submitBtn, isSubmitting && styles.submitBtnOff]}
              onPress={handleSubmit(onSubmit)}
              activeOpacity={0.88}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Text style={styles.submitBtnLabel}>Sign in</Text>
                  <Feather name="arrow-right" size={20} color="#fff" />
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  // base of the dashboard hero gradient
  flex: { flex: 1, backgroundColor: colors.bytecode[800] },
  container: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 20,
  },

  // Decorative background — same layers and colours as DashboardHero
  decor: { ...StyleSheet.absoluteFillObject, overflow: "hidden" },
  gradientMid: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: "25%",
    backgroundColor: colors.bytecode[600],
    opacity: 0.5,
    // larger than the hero's radii so a full-height screen gets a sweeping
    // curve instead of a hard vertical wall
    borderTopLeftRadius: 360,
    borderBottomLeftRadius: 300,
  },
  gradientBlobTop: {
    position: "absolute",
    width: 280,
    height: 280,
    borderRadius: 140,
    top: -120,
    right: -70,
    backgroundColor: colors.bytecode[500],
    opacity: 0.22,
  },
  gradientBlobBottom: {
    position: "absolute",
    width: 240,
    height: 240,
    borderRadius: 120,
    bottom: -110,
    left: -70,
    backgroundColor: colors.bytecode[500],
    opacity: 0.14,
  },

  // Card header: logo + welcome text
  cardHead: { alignItems: "center", gap: 14, paddingBottom: 4 },
  // The PNG is a 500x500 canvas with the wordmark in a thin middle band, so
  // `cover` crops the empty space and the width drives the wordmark size.
  logo: { width: "100%", maxWidth: 300, height: 60 },
  // stretch so the text gets the full row instead of a shrink-wrapped width
  welcome: { alignSelf: "stretch", alignItems: "center", gap: 6 },
  title: {
    alignSelf: "stretch",
    textAlign: "center",
    fontSize: 28,
    lineHeight: 35,
    fontWeight: "800",
    color: colors.bytecode[900],
  },
  subtitle: {
    alignSelf: "stretch",
    textAlign: "center",
    fontSize: 15,
    color: colors.gray[500],
    fontWeight: "500",
  },

  // Card
  card: {
    backgroundColor: "#fff",
    borderRadius: 28,
    padding: 22,
    gap: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.22,
    shadowRadius: 26,
    elevation: 10,
  },
  form: { gap: 20 },
  field: { gap: 9 },

  // Input
  inputLabel: { fontSize: 14, fontWeight: "800", color: colors.bytecode[900] },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: colors.bytecode[100],
    borderRadius: 16,
    backgroundColor: FIELD_BG,
    overflow: "hidden",
  },
  inputRowFocused: {
    borderColor: colors.bytecode[400],
    backgroundColor: "#fff",
  },
  inputRowError: {
    borderColor: colors.red[400],
    backgroundColor: colors.red[50],
  },
  inputPrefix: {
    width: 54,
    height: 54,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.bytecode[50],
    borderRightWidth: 1,
    borderRightColor: colors.bytecode[100],
  },
  inputPrefixError: {
    backgroundColor: colors.red[100],
    borderRightColor: colors.red[200],
  },
  inputSuffix: {
    width: 50,
    height: 54,
    alignItems: "center",
    justifyContent: "center",
  },
  textInput: {
    flex: 1,
    height: 54,
    paddingHorizontal: 14,
    fontSize: 15,
    color: colors.gray[900],
  },
  errorRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  fieldError: { fontSize: 12, color: colors.red[500], fontWeight: "600" },

  // Submit
  submitBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    borderRadius: 18,
    height: 58,
    backgroundColor: colors.bytecode[600],
    shadowColor: colors.bytecode[600],
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.28,
    shadowRadius: 14,
    elevation: 6,
  },
  submitBtnOff: { opacity: 0.7 },
  submitBtnLabel: {
    fontSize: 17,
    fontWeight: "800",
    color: "#fff",
    letterSpacing: 0.2,
  },
});
