import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  Modal,
  Platform,
  ActivityIndicator,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import Feather from "@expo/vector-icons/Feather";
import * as Location from "expo-location";
import {
  getWeeklyTimesheet,
  checkIn,
  checkOut,
} from "@/lib/api/attendance-employee.api";
import {
  adminGetWeeklyTimesheet,
  adminListAttendance,
} from "@/lib/api/attendance.api";
import { PageHeader } from "@/components/ui/PageHeader";
import { Spinner } from "@/components/ui/Spinner";
import { AlertUI } from "@/components/ui/Alert";
import { getApiErrorMessage } from "@/lib/api-error";
import { colors } from "@/components/ui/theme";
import type { WeeklyTimesheetDay } from "@/types/attendance";

// ─── helpers ────────────────────────────────────────────────────────────────

const STATUS_COLOR: Record<string, string> = {
  present: colors.bytecode[500],
  late: "#EAB308",
  absent: colors.red[500],
  on_leave: colors.gray[400],
  half_day: colors.bytecode[300],
  holiday: "#818CF8",
  weekend: colors.gray[300],
};

const STATUS_LABEL: Record<string, string> = {
  present: "Present",
  late: "Late",
  absent: "Absent",
  on_leave: "Leave",
  half_day: "Half",
  holiday: "Holiday",
  weekend: "Weekend",
};

function fmtTime(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

function fmtHours(h: number) {
  const hrs = Math.floor(h);
  const mins = Math.round((h - hrs) * 60);
  if (hrs === 0) return `${mins}m`;
  if (mins === 0) return `${hrs}h`;
  return `${hrs}h ${mins}m`;
}

function fmtTimePicker(d: Date) {
  return d.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

function addDays(isoDate: string, days: number) {
  const d = new Date(isoDate);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Build ISO string: combine a YYYY-MM-DD date with a time from a Date object */
function buildIso(date: string, time: Date): string {
  const d = new Date(`${date}T00:00:00`);
  d.setHours(time.getHours(), time.getMinutes(), 0, 0);
  return d.toISOString();
}

function defaultTime(existingIso: string | null, fallbackHour: number): Date {
  if (existingIso) return new Date(existingIso);
  const d = new Date();
  d.setHours(fallbackHour, 0, 0, 0);
  return d;
}

// ─── DayRow ─────────────────────────────────────────────────────────────────

function DayRow({
  day,
  onPress,
  adminView = false,
}: {
  day: WeeklyTimesheetDay;
  onPress: () => void;
  adminView?: boolean;
}) {
  const color = day.status
    ? (STATUS_COLOR[day.status] ?? colors.gray[400])
    : colors.gray[300];
  const label = day.status ? (STATUS_LABEL[day.status] ?? day.status) : "—";
  const isOff = day.isWeekend || day.status === "holiday";

  const d = new Date(day.date);
  const dateLabel = d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
  const shortDay = day.dayName
    ? day.dayName.slice(0, 3)
    : d.toLocaleDateString("en-US", { weekday: "short" });

  const canEdit =
    !isOff && (adminView || !(day.checkInTime && day.checkOutTime));

  return (
    <TouchableOpacity
      style={[s.dayRow, isOff && s.dayRowOff]}
      onPress={canEdit ? onPress : undefined}
      activeOpacity={canEdit ? 0.7 : 1}
    >
      <View style={s.dayCol}>
        <Text style={[s.dayName, isOff && s.dayNameOff]}>{shortDay}</Text>
        <Text style={[s.dayDate, isOff && s.dayDateOff]}>{dateLabel}</Text>
      </View>

      <View style={[s.statusPill, { backgroundColor: `${color}18` }]}>
        <Text style={[s.statusText, { color }]}>{label}</Text>
      </View>

      <View style={s.timesCol}>
        <Text style={s.timeValue}>{fmtTime(day.checkInTime)}</Text>
        <Text style={s.timeSep}>→</Text>
        <Text style={s.timeValue}>{fmtTime(day.checkOutTime)}</Text>
      </View>

      <Text style={[s.hoursText, isOff && s.hoursTextOff]}>
        {day.workHours != null ? fmtHours(Number(day.workHours)) : "—"}
      </Text>

      {day.isManual ? (
        <View style={s.manualDot}>
          <Text style={s.manualDotText}>M</Text>
        </View>
      ) : canEdit ? (
        <Feather name="edit-2" size={12} color={colors.bytecode[400]} />
      ) : (
        <View style={{ width: 12 }} />
      )}
    </TouchableOpacity>
  );
}

// ─── Entry modal ─────────────────────────────────────────────────────────────

type EntryMode = "checkIn" | "checkOut";
type PickerTarget = "in" | "out";

function EntryModal({
  day,
  onClose,
  onSuccess,
}: {
  day: WeeklyTimesheetDay;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const qc = useQueryClient();

  const mode: EntryMode = day.checkInTime ? "checkOut" : "checkIn";

  const [inTime, setInTime] = useState<Date>(defaultTime(day.checkInTime, 9));
  const [outTime, setOutTime] = useState<Date>(
    defaultTime(day.checkOutTime, 18),
  );
  const [activePicker, setActivePicker] = useState<PickerTarget | null>(null);
  const [submitError, setSubmitError] = useState("");

  const [locState, setLocState] = useState<
    | { status: "loading" }
    | { status: "denied" }
    | { status: "ready"; lat: number; lng: number }
  >({ status: "loading" });

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setLocState({ status: "denied" });
        return;
      }
      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      setLocState({
        status: "ready",
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
      });
    })();
  }, []);

  const mut = useMutation({
    mutationFn: async () => {
      if (locState.status !== "ready")
        throw new Error("Location not available");
      const { lat, lng } = locState;
      if (mode === "checkIn") {
        return checkIn(lat, lng, buildIso(day.date, inTime));
      } else {
        return checkOut(lat, lng, buildIso(day.date, outTime));
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["weekly-timesheet"] });
      onSuccess();
    },
    onError: (err) =>
      setSubmitError(getApiErrorMessage(err, "Submission failed")),
  });

  function handleTimeChange(_: unknown, selected?: Date) {
    if (Platform.OS === "android") setActivePicker(null);
    if (!selected) return;
    if (activePicker === "in") setInTime(selected);
    else if (activePicker === "out") setOutTime(selected);
  }

  const pickerValue =
    activePicker === "in"
      ? inTime
      : activePicker === "out"
        ? outTime
        : new Date();

  const dateDisplay = new Date(day.date).toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
  });

  return (
    <View style={s.entrySheet}>
      {/* Handle bar */}
      <View style={s.handle} />

      {/* Header */}
      <View style={s.entryHeader}>
        <View>
          <Text style={s.entryTitle}>
            {mode === "checkIn" ? "Log Check-in" : "Log Check-out"}
          </Text>
          <Text style={s.entryDate}>{dateDisplay}</Text>
        </View>
        <TouchableOpacity onPress={onClose} hitSlop={10}>
          <Feather name="x" size={22} color={colors.gray[500]} />
        </TouchableOpacity>
      </View>

      {submitError ? (
        <View style={{ paddingHorizontal: 20, marginBottom: 4 }}>
          <AlertUI message={submitError} type="error" />
        </View>
      ) : null}

      {/* Location status */}
      <View style={s.locRow}>
        <Feather
          name="map-pin"
          size={14}
          color={
            locState.status === "loading"
              ? colors.gray[300]
              : locState.status === "denied"
                ? colors.red[400]
                : colors.bytecode[500]
          }
        />
        <Text style={s.locText}>
          {locState.status === "loading"
            ? "Getting location…"
            : locState.status === "denied"
              ? "Location denied — required for submission"
              : `${locState.lat.toFixed(4)}, ${locState.lng.toFixed(4)}`}
        </Text>
        {locState.status === "loading" && (
          <ActivityIndicator size="small" color={colors.bytecode[500]} />
        )}
      </View>

      {/* Time pickers */}
      <View style={s.timePickersWrap}>
        {/* Check-in row — editable only in checkIn mode */}
        <View
          style={[s.timePickRow, mode === "checkOut" && s.timePickRowDisabled]}
        >
          <Feather
            name="log-in"
            size={16}
            color={mode === "checkIn" ? colors.bytecode[600] : colors.gray[300]}
          />
          <Text
            style={[s.timePickLabel, mode === "checkOut" && s.timePickLabelOff]}
          >
            Check-in
          </Text>
          {mode === "checkIn" ? (
            <TouchableOpacity
              style={s.timePickBtn}
              onPress={() => setActivePicker("in")}
              activeOpacity={0.8}
            >
              <Text style={s.timePickBtnText}>{fmtTimePicker(inTime)}</Text>
              <Feather
                name="chevron-down"
                size={13}
                color={colors.bytecode[600]}
              />
            </TouchableOpacity>
          ) : (
            <Text style={s.timePickExisting}>{fmtTime(day.checkInTime)}</Text>
          )}
        </View>

        <View style={s.timePickDivider} />

        {/* Check-out row — editable only in checkOut mode */}
        <View
          style={[s.timePickRow, mode === "checkIn" && s.timePickRowDisabled]}
        >
          <Feather
            name="log-out"
            size={16}
            color={mode === "checkOut" ? colors.red[400] : colors.gray[300]}
          />
          <Text
            style={[s.timePickLabel, mode === "checkIn" && s.timePickLabelOff]}
          >
            Check-out
          </Text>
          {mode === "checkOut" ? (
            <TouchableOpacity
              style={[s.timePickBtn, s.timePickBtnRed]}
              onPress={() => setActivePicker("out")}
              activeOpacity={0.8}
            >
              <Text style={[s.timePickBtnText, { color: colors.red[700] }]}>
                {fmtTimePicker(outTime)}
              </Text>
              <Feather name="chevron-down" size={13} color={colors.red[500]} />
            </TouchableOpacity>
          ) : (
            <Text style={s.timePickExisting}>—</Text>
          )}
        </View>
      </View>

      {/* Submit */}
      <TouchableOpacity
        style={[
          s.entrySubmitBtn,
          mode === "checkOut" && s.entrySubmitBtnRed,
          (locState.status !== "ready" || mut.isPending) && s.entrySubmitBtnOff,
        ]}
        onPress={() => mut.mutate()}
        disabled={locState.status !== "ready" || mut.isPending}
        activeOpacity={0.85}
      >
        {mut.isPending ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <>
            <Feather
              name={mode === "checkIn" ? "log-in" : "log-out"}
              size={18}
              color="#fff"
            />
            <Text style={s.entrySubmitText}>
              {mode === "checkIn" ? "Submit Check-in" : "Submit Check-out"}
            </Text>
          </>
        )}
      </TouchableOpacity>

      {/* Android time picker */}
      {activePicker !== null && Platform.OS === "android" && (
        <DateTimePicker
          value={pickerValue}
          mode="time"
          display="default"
          onChange={handleTimeChange}
        />
      )}

      {/* iOS time picker inline in sheet */}
      {activePicker !== null && Platform.OS === "ios" && (
        <View style={s.iosInlinePicker}>
          <View style={s.iosInlinePickerHeader}>
            <Text style={s.iosInlinePickerLabel}>
              {activePicker === "in" ? "Check-in time" : "Check-out time"}
            </Text>
            <TouchableOpacity onPress={() => setActivePicker(null)} hitSlop={8}>
              <Text style={s.iosDone}>Done</Text>
            </TouchableOpacity>
          </View>
          <DateTimePicker
            value={pickerValue}
            mode="time"
            display="spinner"
            onChange={handleTimeChange}
            style={{ width: "100%" }}
          />
        </View>
      )}
    </View>
  );
}

// ─── Screen ──────────────────────────────────────────────────────────────────

export default function TimesheetScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams<{
    employeeId?: string;
    employeeName?: string;
  }>();
  const adminEmpId = params.employeeId ? Number(params.employeeId) : null;
  const isAdminView = adminEmpId !== null;

  const [refDate, setRefDate] = useState<string | undefined>(undefined);
  const [selectedDay, setSelectedDay] = useState<WeeklyTimesheetDay | null>(
    null,
  );
  const [showWeekPicker, setShowWeekPicker] = useState(false);

  const { data, isLoading, isError, error, refetch, isRefetching } = useQuery({
    queryKey: isAdminView
      ? ["admin-employee-timesheet", adminEmpId, refDate]
      : ["weekly-timesheet", refDate],
    queryFn: () =>
      isAdminView
        ? adminGetWeeklyTimesheet(adminEmpId!, refDate)
        : getWeeklyTimesheet(refDate),
  });

  const today = new Date().toISOString().slice(0, 10);
  const isCurrentWeek = !data || data.weekEnd >= today;

  function prevWeek() {
    const base = data?.weekStart ?? today;
    setRefDate(addDays(base, -7));
  }

  function nextWeek() {
    if (isCurrentWeek) return;
    const next = addDays(data!.weekStart, 7);
    setRefDate(next > today ? undefined : next);
  }

  function thisWeek() {
    setRefDate(undefined);
  }

  function handleWeekDatePicked(_: unknown, selected?: Date) {
    if (Platform.OS === "android") setShowWeekPicker(false);
    if (!selected) return;
    const picked = selected.toISOString().slice(0, 10);
    setRefDate(picked >= today ? undefined : picked);
  }

  const weekLabel = data
    ? (() => {
        const ws = new Date(data.weekStart);
        const we = new Date(data.weekEnd);
        const same = ws.getMonth() === we.getMonth();
        return `${ws.toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${we.toLocaleDateString("en-US", { month: same ? undefined : "short", day: "numeric" })}`;
      })()
    : "Loading…";

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      <PageHeader
        title={
          isAdminView && params.employeeName
            ? `${params.employeeName} – Timesheet`
            : "Weekly Timesheet"
        }
        variant="bytecode"
      />

      <ScrollView
        contentContainerStyle={[
          s.content,
          { paddingBottom: insets.bottom + 32 },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor={colors.bytecode[600]}
          />
        }
      >
        {/* Week navigation */}
        <View style={s.weekNav}>
          <TouchableOpacity onPress={prevWeek} style={s.navBtn} hitSlop={8}>
            <Feather
              name="chevron-left"
              size={20}
              color={colors.bytecode[600]}
            />
          </TouchableOpacity>

          <View style={s.weekLabelWrap}>
            <TouchableOpacity
              onPress={thisWeek}
              disabled={isCurrentWeek}
              hitSlop={8}
            >
              <Text style={s.weekLabel}>{weekLabel}</Text>
              {!isCurrentWeek && (
                <Text style={s.todayLink}>Back to current</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={s.calBtn}
              onPress={() => setShowWeekPicker(true)}
              hitSlop={8}
            >
              <Feather name="calendar" size={14} color={colors.bytecode[600]} />
              <Text style={s.calBtnText}>Jump to date</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            onPress={nextWeek}
            style={[s.navBtn, isCurrentWeek && s.navBtnOff]}
            disabled={isCurrentWeek}
            hitSlop={8}
          >
            <Feather
              name="chevron-right"
              size={20}
              color={isCurrentWeek ? colors.gray[300] : colors.bytecode[600]}
            />
          </TouchableOpacity>
        </View>

        {isLoading ? (
          <View style={s.center}>
            <Spinner />
          </View>
        ) : isError ? (
          <AlertUI message={getApiErrorMessage(error)} type="error" />
        ) : data ? (
          <>
            <View style={s.colHeader}>
              <Text style={[s.colLabel, { width: 58 }]}>Day</Text>
              <Text style={[s.colLabel, { width: 64 }]}>Status</Text>
              <Text style={[s.colLabel, { flex: 1 }]}>In → Out</Text>
              <Text style={[s.colLabel, { width: 42, textAlign: "right" }]}>
                Hrs
              </Text>
            </View>

            <View style={s.card}>
              {data.days.map((day, i) => (
                <React.Fragment key={day.date}>
                  <DayRow
                    day={day}
                    onPress={async () => {
                      if (isAdminView) {
                        const hasRecord = !!(day.checkInTime || day.status);
                        if (hasRecord) {
                          const res = await adminListAttendance({
                            employeeId: adminEmpId!,
                            fromDate: day.date,
                            toDate: day.date,
                            limit: 1,
                          });
                          const rec = res.data?.[0];
                          if (rec?.id) {
                            router.push({
                              pathname: "/(app)/admin/attendance/[id]",
                              params: { id: rec.id, edit: "1" },
                            });
                            return;
                          }
                        }
                        router.push({
                          pathname: "/(app)/admin/attendance/mark",
                          params: {
                            employeeId: adminEmpId!,
                            employeeName: params.employeeName ?? "",
                            date: day.date,
                          },
                        });
                      } else {
                        setSelectedDay(day);
                      }
                    }}
                    adminView={isAdminView}
                  />
                  {i < data.days.length - 1 && <View style={s.divider} />}
                </React.Fragment>
              ))}
            </View>

            <View style={s.summaryCard}>
              {[
                {
                  label: "Total hours",
                  value: fmtHours(Number(data.totalWorkHours ?? 0)),
                  icon: "clock" as const,
                  color: colors.bytecode[500],
                },
                {
                  label: "Present",
                  value: String(data.presentDays ?? 0),
                  icon: "check-circle" as const,
                  color: colors.bytecode[500],
                },
                {
                  label: "Late",
                  value: String(data.lateDays ?? 0),
                  icon: "alert-circle" as const,
                  color: "#EAB308",
                },
              ].map(({ label, value, icon, color }) => (
                <View key={label} style={s.summaryItem}>
                  <View
                    style={[s.summaryIcon, { backgroundColor: `${color}18` }]}
                  >
                    <Feather name={icon} size={14} color={color} />
                  </View>
                  <Text style={s.summaryValue}>{value}</Text>
                  <Text style={s.summaryLabel}>{label}</Text>
                </View>
              ))}
            </View>

            <Text style={s.manualNote}>
              <Text style={s.manualBadge}>M</Text> = manually marked by admin ·{" "}
              <Text style={{ color: colors.bytecode[500] }}>✎</Text> = tap to
              log
            </Text>
          </>
        ) : null}
      </ScrollView>

      {/* ── Week-jump date picker ─────────────────────────────────────────── */}
      {showWeekPicker && Platform.OS === "android" && (
        <DateTimePicker
          value={refDate ? new Date(refDate) : new Date()}
          mode="date"
          display="default"
          maximumDate={new Date()}
          onChange={handleWeekDatePicked}
        />
      )}
      {Platform.OS === "ios" && (
        <Modal
          transparent
          animationType="slide"
          visible={showWeekPicker}
          onRequestClose={() => setShowWeekPicker(false)}
        >
          <View style={s.iosOverlay}>
            <View style={s.iosSheet}>
              <View style={s.iosSheetHeader}>
                <Text style={s.iosSheetTitle}>Jump to week</Text>
                <TouchableOpacity
                  onPress={() => setShowWeekPicker(false)}
                  hitSlop={8}
                >
                  <Text style={s.iosDone}>Done</Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={refDate ? new Date(refDate) : new Date()}
                mode="date"
                display="spinner"
                maximumDate={new Date()}
                onChange={handleWeekDatePicked}
                style={{ width: "100%" }}
              />
            </View>
          </View>
        </Modal>
      )}

      {/* ── Day entry bottom sheet ────────────────────────────────────────── */}
      <Modal
        transparent
        animationType="slide"
        visible={selectedDay !== null}
        onRequestClose={() => setSelectedDay(null)}
      >
        <View style={s.iosOverlay}>
          {selectedDay && (
            <EntryModal
              day={selectedDay}
              onClose={() => setSelectedDay(null)}
              onSuccess={() => setSelectedDay(null)}
            />
          )}
        </View>
      </Modal>
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.gray[50] },
  content: { padding: 16, gap: 12 },
  center: { paddingTop: 40, alignItems: "center" },

  // week nav
  weekNav: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#fff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.gray[100],
    padding: 12,
  },
  navBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.bytecode[50],
    alignItems: "center",
    justifyContent: "center",
  },
  navBtnOff: { backgroundColor: colors.gray[50] },
  weekLabelWrap: { flex: 1, alignItems: "center", gap: 6 },
  weekLabel: { fontSize: 15, fontWeight: "800", color: colors.gray[900] },
  todayLink: { fontSize: 11, color: colors.bytecode[500], fontWeight: "600" },
  calBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: colors.bytecode[50],
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  calBtnText: { fontSize: 11, fontWeight: "700", color: colors.bytecode[700] },

  // col header
  colHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    gap: 8,
  },
  colLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: colors.gray[400],
    letterSpacing: 0.5,
  },

  // day card
  card: {
    backgroundColor: "#fff",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.gray[100],
    overflow: "hidden",
  },
  divider: { height: 1, backgroundColor: colors.gray[50] },

  dayRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 13,
    gap: 8,
  },
  dayRowOff: { backgroundColor: colors.gray[50] },
  dayCol: { width: 50 },
  dayName: { fontSize: 12, fontWeight: "800", color: colors.gray[800] },
  dayDate: { fontSize: 10, color: colors.gray[400], marginTop: 1 },
  dayNameOff: { color: colors.gray[400] },
  dayDateOff: { color: colors.gray[300] },

  statusPill: {
    width: 56,
    borderRadius: 8,
    paddingVertical: 3,
    alignItems: "center",
  },
  statusText: { fontSize: 10, fontWeight: "700" },

  timesCol: { flex: 1, flexDirection: "row", alignItems: "center", gap: 4 },
  timeValue: { fontSize: 11, color: colors.gray[600], fontWeight: "600" },
  timeSep: { fontSize: 10, color: colors.gray[300] },

  hoursText: {
    width: 34,
    textAlign: "right",
    fontSize: 12,
    fontWeight: "800",
    color: colors.gray[800],
  },
  hoursTextOff: { color: colors.gray[300] },

  manualDot: {
    width: 16,
    height: 16,
    borderRadius: 4,
    backgroundColor: colors.bytecode[50],
    alignItems: "center",
    justifyContent: "center",
  },
  manualDotText: {
    fontSize: 8,
    fontWeight: "900",
    color: colors.bytecode[600],
  },

  // summary
  summaryCard: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.gray[100],
    padding: 16,
    gap: 8,
  },
  summaryItem: { flex: 1, alignItems: "center", gap: 5 },
  summaryIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  summaryValue: { fontSize: 20, fontWeight: "900", color: colors.gray[900] },
  summaryLabel: { fontSize: 10, color: colors.gray[400], fontWeight: "600" },

  manualNote: { fontSize: 11, color: colors.gray[400], textAlign: "center" },
  manualBadge: { fontWeight: "900", color: colors.bytecode[600] },

  // entry sheet
  entrySheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingBottom: 40,
    gap: 0,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.gray[200],
    alignSelf: "center",
    marginTop: 10,
    marginBottom: 6,
  },
  entryHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[100],
  },
  entryTitle: { fontSize: 17, fontWeight: "800", color: colors.gray[900] },
  entryDate: { fontSize: 12, color: colors.gray[400], marginTop: 2 },

  locRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: colors.gray[50],
    marginHorizontal: 20,
    marginTop: 14,
    borderRadius: 10,
  },
  locText: {
    flex: 1,
    fontSize: 12,
    color: colors.gray[500],
    fontFamily: "monospace",
  },

  timePickersWrap: {
    marginHorizontal: 20,
    marginTop: 14,
    backgroundColor: "#fff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.gray[100],
    overflow: "hidden",
  },
  timePickRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 16,
  },
  timePickRowDisabled: { opacity: 0.4 },
  timePickLabel: {
    flex: 1,
    fontSize: 14,
    fontWeight: "600",
    color: colors.gray[700],
  },
  timePickLabelOff: { color: colors.gray[400] },
  timePickBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.bytecode[50],
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  timePickBtnRed: { backgroundColor: colors.red[50] },
  timePickBtnText: {
    fontSize: 14,
    fontWeight: "800",
    color: colors.bytecode[700],
  },
  timePickExisting: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.gray[500],
  },
  timePickDivider: { height: 1, backgroundColor: colors.gray[50] },

  entrySubmitBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: colors.bytecode[600],
    borderRadius: 16,
    height: 54,
    marginHorizontal: 20,
    marginTop: 18,
  },
  entrySubmitBtnRed: { backgroundColor: colors.red[500] },
  entrySubmitBtnOff: { opacity: 0.5 },
  entrySubmitText: { fontSize: 16, fontWeight: "800", color: "#fff" },

  iosInlinePicker: {
    borderTopWidth: 1,
    borderTopColor: colors.gray[100],
    marginTop: 8,
  },
  iosInlinePickerHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  iosInlinePickerLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.gray[700],
  },
  iosDone: { fontSize: 15, fontWeight: "700", color: colors.bytecode[600] },

  // iOS week-jump modal
  iosOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.35)",
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
});
