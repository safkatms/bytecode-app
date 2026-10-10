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
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Feather from "@expo/vector-icons/Feather";
import * as Location from "expo-location";
import { checkOut } from "@/lib/api/attendance-employee.api";
import { PageHeader } from "@/components/ui/PageHeader";
import { AlertUI } from "@/components/ui/Alert";
import { getApiErrorMessage } from "@/lib/api-error";
import { colors } from "@/components/ui/theme";

function fmtTimeDisplay(d: Date) {
  return d.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

export default function CheckOutScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const [error, setError] = useState("");

  const [locState, setLocState] = useState<
    | { status: "loading" }
    | { status: "denied" }
    | { status: "ready"; lat: number; lng: number }
  >({ status: "loading" });

  const [checkOutTime, setCheckOutTime] = useState(new Date());
  const [showPicker, setShowPicker] = useState(false);

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

  const mut = useMutation({
    mutationFn: () => {
      if (locState.status !== "ready")
        throw new Error("Location not available");
      return checkOut(locState.lat, locState.lng, checkOutTime.toISOString());
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["employee-dashboard-overview"] });
      qc.invalidateQueries({ queryKey: ["weekly-timesheet"] });
      qc.invalidateQueries({ queryKey: ["employee-today-status"] });
      router.back();
    },
    onError: (err) => setError(getApiErrorMessage(err, "Check-out failed")),
  });

  function handleTimeChange(_: unknown, selected?: Date) {
    if (Platform.OS === "android") setShowPicker(false);
    if (selected) setCheckOutTime(selected);
  }

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      <PageHeader title="Check Out" variant="bytecode" />

      <View style={s.content}>
        {error ? <AlertUI message={error} type="error" /> : null}

        <View style={s.locationCard}>
          <View style={s.locationIconWrap}>
            <Feather
              name="log-out"
              size={28}
              color={
                locState.status === "ready" ? colors.red[400] : colors.gray[300]
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
                Enable location in app settings to check out.
              </Text>
            </>
          )}
          {locState.status === "ready" && (
            <>
              <Text style={s.locTitle}>Ready to check out</Text>
              <Text style={s.locCoords}>
                {locState.lat.toFixed(5)}, {locState.lng.toFixed(5)}
              </Text>
            </>
          )}
        </View>

        {/* Time picker row */}
        <View style={s.timeCard}>
          <View style={s.timeCardLeft}>
            <Feather name="clock" size={14} color={colors.red[400]} />
            <Text style={s.timeCardLabel}>Check-out time</Text>
          </View>
          <TouchableOpacity
            style={s.timeBtn}
            onPress={() => setShowPicker(true)}
            activeOpacity={0.8}
          >
            <Text style={s.timeBtnText}>{fmtTimeDisplay(checkOutTime)}</Text>
            <Feather name="chevron-down" size={14} color={colors.red[500]} />
          </TouchableOpacity>
        </View>

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
              <Feather name="log-out" size={20} color="#fff" />
              <Text style={s.checkBtnLabel}>Check Out Now</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Android: inline picker */}
      {showPicker && Platform.OS === "android" && (
        <DateTimePicker
          value={checkOutTime}
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
                <Text style={s.iosSheetTitle}>Check-out Time</Text>
                <TouchableOpacity
                  onPress={() => setShowPicker(false)}
                  hitSlop={8}
                >
                  <Text style={s.iosDone}>Done</Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={checkOutTime}
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
    backgroundColor: colors.red[50],
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
    backgroundColor: colors.red[50],
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  timeBtnText: { fontSize: 14, fontWeight: "800", color: colors.red[600] },

  checkBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: colors.red[500],
    borderRadius: 18,
    height: 60,
    marginTop: 8,
  },
  checkBtnOff: { opacity: 0.5 },
  checkBtnLabel: { fontSize: 17, fontWeight: "800", color: "#fff" },

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
