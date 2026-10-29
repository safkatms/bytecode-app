import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { useRouter } from "expo-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Feather from "@expo/vector-icons/Feather";
import * as Location from "expo-location";
import { PageHeader } from "@/components/ui/PageHeader";
import { AlertUI } from "@/components/ui/Alert";
import { getApiErrorMessage } from "@/lib/api-error";
import { colors } from "@/components/ui/theme";
import { useOfficeGeofence } from "./useOfficeGeofence";
import { LocationCard } from "./LocationCard";
import { TimeField, TimePickerSheet } from "./TimePicker";
import { cancelPendingArrivalNotification } from "@/lib/office-checkin-reminder";

type Variant = "in" | "out";

const COPY = {
  in: {
    title: "Check In",
    cta: "Check In Now",
    timeLabel: "Check-in time",
    pickerTitle: "Check-in time",
    icon: "log-in" as const,
    deniedHint: "Enable location in app settings to check in.",
    errorFallback: "Check-in failed",
    tint: colors.bytecode[600],
    tintBg: colors.bytecode[50],
    btnBase: colors.bytecode[600],
    btnAccent: colors.bytecode[400],
  },
  out: {
    title: "Check Out",
    cta: "Check Out Now",
    timeLabel: "Check-out time",
    pickerTitle: "Check-out time",
    icon: "log-out" as const,
    deniedHint: "Enable location in app settings to check out.",
    errorFallback: "Check-out failed",
    tint: colors.red[600],
    tintBg: colors.red[50],
    btnBase: colors.red[600],
    btnAccent: colors.red[400],
  },
};

export function CheckScreen({
  variant,
  submit,
}: {
  variant: Variant;
  submit: (lat: number, lng: number, isoTime: string) => Promise<unknown>;
}) {
  const router = useRouter();
  const qc = useQueryClient();
  const insets = useSafeAreaInsets();
  const copy = COPY[variant];

  const { locState, office, distance, isWithinRadius } = useOfficeGeofence(
    Location.Accuracy.High,
  );

  const [time, setTime] = useState(new Date());
  const [showPicker, setShowPicker] = useState(false);
  const [error, setError] = useState("");

  const mut = useMutation({
    mutationFn: () => {
      if (locState.status !== "ready")
        throw new Error("Location not available");
      return submit(locState.lat, locState.lng, time.toISOString());
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["employee-dashboard-overview"] });
      qc.invalidateQueries({ queryKey: ["weekly-timesheet"] });
      qc.invalidateQueries({ queryKey: ["employee-today-status"] });
      if (variant === "in") cancelPendingArrivalNotification();
      router.back();
    },
    onError: (err) => setError(getApiErrorMessage(err, copy.errorFallback)),
  });

  const blocked = locState.status !== "ready" || mut.isPending;

  return (
    <View style={s.root}>
      <PageHeader title={copy.title} variant="bytecode" insetTop />

      <ScrollView
        contentContainerStyle={[s.content, { paddingBottom: insets.bottom + 28 }]}
        showsVerticalScrollIndicator={false}
      >
        {error ? <AlertUI message={error} type="error" /> : null}

        <LocationCard
          locState={locState}
          office={office}
          distance={distance}
          isWithinRadius={isWithinRadius}
          readyIcon={variant === "in" ? "map-pin" : "log-out"}
          readyTitle={variant === "in" ? undefined : "Ready to check out"}
          deniedHint={copy.deniedHint}
        />

        {office && (
          <View style={s.officeRow}>
            <View style={s.officeIcon}>
              <Feather name="home" size={16} color={colors.gray[500]} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.officeLabel}>Office</Text>
              <Text style={s.officeName}>{office.name}</Text>
            </View>
            {isWithinRadius !== null && (
              <View
                style={[
                  s.officeTag,
                  {
                    backgroundColor: isWithinRadius
                      ? colors.green[50]
                      : colors.amber[50],
                  },
                ]}
              >
                <View
                  style={[
                    s.officeTagDot,
                    {
                      backgroundColor: isWithinRadius
                        ? colors.green[500]
                        : colors.amber[500],
                    },
                  ]}
                />
                <Text
                  style={[
                    s.officeTagText,
                    {
                      color: isWithinRadius
                        ? colors.green[700]
                        : colors.amber[700],
                    },
                  ]}
                >
                  {isWithinRadius ? "In range" : "Out of range"}
                </Text>
              </View>
            )}
          </View>
        )}

        <TimeField
          label={copy.timeLabel}
          value={time}
          tint={copy.tint}
          tintBg={copy.tintBg}
          onPress={() => setShowPicker(true)}
        />

        <TouchableOpacity
          style={[s.cta, blocked && s.ctaOff]}
          onPress={() => mut.mutate()}
          disabled={blocked}
          activeOpacity={0.9}
        >
          <View style={[s.ctaBase, { backgroundColor: copy.btnBase }]} />
          <View style={[s.ctaAccent, { backgroundColor: copy.btnAccent }]} />
          {mut.isPending ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Feather name={copy.icon} size={20} color="#fff" />
              <Text style={s.ctaText}>{copy.cta}</Text>
            </>
          )}
        </TouchableOpacity>

        {locState.status === "ready" && isWithinRadius === false && (
          <View style={s.warning}>
            <Feather name="alert-triangle" size={14} color={colors.amber[600]} />
            <Text style={s.warningText}>
              You&apos;re outside the office radius. The server will validate
              your location and may reject this.
            </Text>
          </View>
        )}
      </ScrollView>

      <TimePickerSheet
        visible={showPicker}
        value={time}
        title={copy.pickerTitle}
        onChange={setTime}
        onClose={() => setShowPicker(false)}
      />
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.gray[50] },
  content: { padding: 16, gap: 12 },

  officeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#fff",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.gray[100],
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  officeIcon: {
    width: 38,
    height: 38,
    borderRadius: 13,
    backgroundColor: colors.gray[50],
    alignItems: "center",
    justifyContent: "center",
  },
  officeLabel: { fontSize: 11, color: colors.gray[400], fontWeight: "600" },
  officeName: {
    fontSize: 14,
    fontWeight: "800",
    color: colors.gray[900],
    marginTop: 1,
  },
  officeTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  officeTagDot: { width: 6, height: 6, borderRadius: 3 },
  officeTagText: { fontSize: 11, fontWeight: "700" },

  cta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    borderRadius: 20,
    height: 62,
    marginTop: 4,
    overflow: "hidden",
    position: "relative",
  },
  ctaBase: { ...StyleSheet.absoluteFillObject },
  ctaAccent: {
    position: "absolute",
    width: 220,
    height: 220,
    borderRadius: 110,
    top: -110,
    left: -40,
    opacity: 0.3,
  },
  ctaOff: { opacity: 0.45 },
  ctaText: { fontSize: 17, fontWeight: "800", color: "#fff" },

  warning: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    backgroundColor: colors.amber[50],
    borderRadius: 14,
    padding: 13,
  },
  warningText: {
    flex: 1,
    fontSize: 12,
    color: colors.amber[700],
    lineHeight: 18,
    fontWeight: "500",
  },
});
