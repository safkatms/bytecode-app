import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  Platform,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useRouter } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Feather from "@expo/vector-icons/Feather";
import * as Location from "expo-location";
import { checkIn } from "@/lib/api/attendance-employee.api";
import { getOfficeLocation } from "@/lib/api/location.api";
import { PageHeader } from "@/components/ui/PageHeader";
import { AlertUI } from "@/components/ui/Alert";
import { getApiErrorMessage } from "@/lib/api-error";
import { colors } from "@/components/ui/theme";

function haversineMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
) {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function fmtTimeDisplay(d: Date) {
  return d.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

export default function CheckInScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const [error, setError] = useState("");

  const [locState, setLocState] = useState<
    | { status: "loading" }
    | { status: "denied" }
    | { status: "ready"; lat: number; lng: number }
  >({ status: "loading" });

  const [checkInTime, setCheckInTime] = useState(new Date());
  const [showPicker, setShowPicker] = useState(false);

  const { data: office } = useQuery({
    queryKey: ["office-location"],
    queryFn: getOfficeLocation,
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setLocState({ status: "denied" });
        return;
      }
      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      setLocState({
        status: "ready",
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
      });
    })();
  }, []);

  const distance =
    locState.status === "ready" && office
      ? Math.round(
          haversineMeters(
            locState.lat,
            locState.lng,
            Number(office.latitude),
            Number(office.longitude),
          ),
        )
      : null;

  const isWithinRadius =
    distance != null && office ? distance <= office.radiusMeters : null;

  const mut = useMutation({
    mutationFn: () => {
      if (locState.status !== "ready")
        throw new Error("Location not available");
      return checkIn(locState.lat, locState.lng, checkInTime.toISOString());
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["employee-dashboard-overview"] });
      qc.invalidateQueries({ queryKey: ["weekly-timesheet"] });
      qc.invalidateQueries({ queryKey: ["employee-today-status"] });
      router.back();
    },
    onError: (err) => setError(getApiErrorMessage(err, "Check-in failed")),
  });

  function handleTimeChange(_: unknown, selected?: Date) {
    if (Platform.OS === "android") setShowPicker(false);
    if (selected) setCheckInTime(selected);
  }

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      <PageHeader title="Check In" variant="bytecode" />

      <View style={s.content}>
        {error ? <AlertUI message={error} type="error" /> : null}

        {/* Location card */}
        <View style={s.locationCard}>
          <View style={s.locationIconWrap}>
            <Feather
              name="map-pin"
              size={28}
              color={
                locState.status === "loading"
                  ? colors.gray[300]
                  : locState.status === "denied"
                    ? colors.red[400]
                    : isWithinRadius
                      ? colors.bytecode[500]
                      : "#EAB308"
              }
            />
          </View>

          {locState.status === "loading" && (
            <>
              <Text style={s.locTitle}>Getting your location…</Text>
              <ActivityIndicator
                color={colors.bytecode[500]}
                style={{ marginTop: 8 }}
              />
            </>
          )}
          {locState.status === "denied" && (
            <>
              <Text style={s.locTitle}>Location permission denied</Text>
              <Text style={s.locSub}>
                Enable location in app settings to check in.
              </Text>
            </>
          )}
          {locState.status === "ready" && (
            <>
              <Text style={s.locTitle}>
                {isWithinRadius
                  ? "You are at the office"
                  : "You are outside the office"}
              </Text>
              <Text style={s.locCoords}>
                {locState.lat.toFixed(5)}, {locState.lng.toFixed(5)}
              </Text>
              {distance != null && office && (
                <View
                  style={[
                    s.distBadge,
                    {
                      backgroundColor: isWithinRadius
                        ? colors.bytecode[50]
                        : "#FEF3C7",
                    },
                  ]}
                >
                  <Feather
                    name="disc"
                    size={12}
                    color={isWithinRadius ? colors.bytecode[600] : "#D97706"}
                  />
                  <Text
                    style={[
                      s.distText,
                      {
                        color: isWithinRadius
                          ? colors.bytecode[700]
                          : "#D97706",
                      },
                    ]}
                  >
                    {distance}m from office · radius {office.radiusMeters}m
                  </Text>
                </View>
              )}
            </>
          )}
        </View>

        {/* Office info */}
        {office && (
          <View style={s.officeCard}>
            <Feather name="home" size={14} color={colors.gray[400]} />
            <Text style={s.officeName}>{office.name}</Text>
          </View>
        )}

        {/* Time picker row */}
        <View style={s.timeCard}>
          <View style={s.timeCardLeft}>
            <Feather name="clock" size={14} color={colors.bytecode[600]} />
            <Text style={s.timeCardLabel}>Check-in time</Text>
          </View>
          <TouchableOpacity
            style={s.timeBtn}
            onPress={() => setShowPicker(true)}
            activeOpacity={0.8}
          >
            <Text style={s.timeBtnText}>{fmtTimeDisplay(checkInTime)}</Text>
            <Feather
              name="chevron-down"
              size={14}
              color={colors.bytecode[600]}
            />
          </TouchableOpacity>
        </View>

        {/* Check-in button */}
        <TouchableOpacity
          style={[
            s.checkBtn,
            (locState.status !== "ready" || mut.isPending) && s.checkBtnOff,
          ]}
          onPress={() => mut.mutate()}
          disabled={locState.status !== "ready" || mut.isPending}
          activeOpacity={0.85}
        >
          {mut.isPending ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Feather name="log-in" size={20} color="#fff" />
              <Text style={s.checkBtnLabel}>Check In Now</Text>
            </>
          )}
        </TouchableOpacity>

        {locState.status === "ready" && isWithinRadius === false && (
          <Text style={s.warningNote}>
            You're outside the office radius. The server will validate your
            location and may reject the check-in.
          </Text>
        )}
      </View>

      {/* Android: inline picker */}
      {showPicker && Platform.OS === "android" && (
        <DateTimePicker
          value={checkInTime}
          mode="time"
          display="default"
          onChange={handleTimeChange}
        />
      )}

      {/* iOS: bottom sheet modal */}
      {Platform.OS === "ios" && (
        <Modal
          transparent
          animationType="slide"
          visible={showPicker}
          onRequestClose={() => setShowPicker(false)}
        >
          <View style={s.iosOverlay}>
            <View style={s.iosSheet}>
              <View style={s.iosSheetHeader}>
                <Text style={s.iosSheetTitle}>Check-in Time</Text>
                <TouchableOpacity
                  onPress={() => setShowPicker(false)}
                  hitSlop={8}
                >
                  <Text style={s.iosDone}>Done</Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={checkInTime}
                mode="time"
                display="spinner"
                onChange={handleTimeChange}
                style={{ width: "100%" }}
              />
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.gray[50] },
  content: { flex: 1, padding: 16, gap: 14 },

  locationCard: {
    backgroundColor: "#fff",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.gray[100],
    padding: 24,
    alignItems: "center",
    gap: 10,
  },
  locationIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: colors.bytecode[50],
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  locTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: colors.gray[900],
    textAlign: "center",
  },
  locSub: { fontSize: 13, color: colors.gray[400], textAlign: "center" },
  locCoords: { fontSize: 12, color: colors.gray[400], fontFamily: "monospace" },
  distBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginTop: 2,
  },
  distText: { fontSize: 12, fontWeight: "700" },

  officeCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.gray[100],
    padding: 12,
  },
  officeName: { fontSize: 13, fontWeight: "700", color: colors.gray[700] },

  timeCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#fff",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.gray[100],
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  timeCardLeft: { flexDirection: "row", alignItems: "center", gap: 8 },
  timeCardLabel: { fontSize: 13, fontWeight: "600", color: colors.gray[700] },
  timeBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.bytecode[50],
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  timeBtnText: { fontSize: 14, fontWeight: "800", color: colors.bytecode[700] },

  checkBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: colors.bytecode[600],
    borderRadius: 18,
    height: 60,
    marginTop: 4,
  },
  checkBtnOff: { opacity: 0.5 },
  checkBtnLabel: { fontSize: 17, fontWeight: "800", color: "#fff" },

  warningNote: {
    fontSize: 12,
    color: "#D97706",
    textAlign: "center",
    lineHeight: 18,
    fontWeight: "500",
  },

  iosOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.3)",
  },
  iosSheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 32,
  },
  iosSheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 18,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[100],
  },
  iosSheetTitle: { fontSize: 16, fontWeight: "800", color: colors.gray[900] },
  iosDone: { fontSize: 15, fontWeight: "700", color: colors.bytecode[600] },
});
