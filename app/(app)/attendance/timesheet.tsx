import React, { useState } from "react";
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
import {
  ATTENDANCE_STATUS_COLOR as STATUS_COLOR,
  ATTENDANCE_STATUS_LABEL as STATUS_LABEL,
} from "@/lib/attendance-status";
import { useOfficeGeofence } from "@/components/attendance/useOfficeGeofence";
import {
  TimePickerSheet,
  fmtTimeDisplay,
} from "@/components/attendance/TimePicker";

// ─── helpers ────────────────────────────────────────────────────────────────

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
  const label = day.status ? (STATUS_LABEL[day.status] ?? day.status) : "No record";
  const isLeave =
    day.status === "holiday" ||
    day.status === "sick_leave" ||
    day.status === "casual_leave";
  const isOff = day.isWeekend || isLeave;

  const d = new Date(day.date);
  const dayNum = d.getDate();
  const month = d.toLocaleDateString("en-US", { month: "short" });
  const weekday = day.day
    ? day.day.slice(0, 3)
    : d.toLocaleDateString("en-US", { weekday: "short" });

  const todayIso = new Date().toISOString().slice(0, 10);
  const isToday = day.date === todayIso;
  const isFuture = day.date > todayIso;
  const isPastWithCheckInOnly =
    day.date < todayIso && !!day.checkInTime && !day.checkOutTime;

  const canEdit =
    !isLeave && (adminView || isToday || isPastWithCheckInOnly) && !isFuture;

  return (
    <TouchableOpacity
      style={[s.dayRow, isToday && s.dayRowToday]}
      onPress={canEdit ? onPress : undefined}
      activeOpacity={canEdit ? 0.7 : 1}
    >
      <View
        style={[
          s.dateTile,
          { backgroundColor: isOff ? colors.gray[100] : `${color}18` },
        ]}
      >
        <Text
          style={[s.dateNum, { color: isOff ? colors.gray[400] : color }]}
        >
          {dayNum}
        </Text>
        <Text
          style={[s.dateMonth, { color: isOff ? colors.gray[400] : color }]}
        >
          {month}
        </Text>
      </View>

      <View style={s.dayBody}>
        <View style={s.dayTopRow}>
          <Text style={[s.weekday, isOff && s.weekdayOff]}>{weekday}</Text>
          {isToday && (
            <View style={s.todayTag}>
              <Text style={s.todayTagText}>Today</Text>
            </View>
          )}
          <View style={[s.statusPill, { backgroundColor: `${color}18` }]}>
            <Text style={[s.statusText, { color }]} numberOfLines={1}>
              {label}
            </Text>
          </View>
        </View>

        <View style={s.dayBottomRow}>
          <Feather
            name="log-in"
            size={11}
            color={day.checkInTime ? colors.green[500] : colors.gray[300]}
          />
          <Text style={[s.timeValue, !day.checkInTime && s.timeValueOff]}>
            {fmtTime(day.checkInTime)}
          </Text>
          <Feather
            name="log-out"
            size={11}
            color={day.checkOutTime ? colors.red[400] : colors.gray[300]}
            style={{ marginLeft: 6 }}
          />
          <Text style={[s.timeValue, !day.checkOutTime && s.timeValueOff]}>
            {fmtTime(day.checkOutTime)}
          </Text>
        </View>
      </View>

      <View style={s.dayRight}>
        <Text style={[s.hoursText, isOff && s.hoursTextOff]}>
          {day.workHours != null ? fmtHours(Number(day.workHours)) : "—"}
        </Text>
        <View style={s.dayRightMeta}>
          {day.isManual && (
            <View style={s.manualDot}>
              <Text style={s.manualDotText}>M</Text>
            </View>
          )}
          {canEdit && (
            <Feather name="edit-2" size={12} color={colors.bytecode[500]} />
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

// ─── Entry sheet ─────────────────────────────────────────────────────────────

type EntryMode = "checkIn" | "checkOut";
type PickerTarget = "in" | "out";

function EntrySheet({
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
  const isIn = mode === "checkIn";

  const [inTime, setInTime] = useState<Date>(defaultTime(day.checkInTime, 9));
  const [outTime, setOutTime] = useState<Date>(
    defaultTime(day.checkOutTime, 18),
  );
  const [activePicker, setActivePicker] = useState<PickerTarget | null>(null);
  const [submitError, setSubmitError] = useState("");

  const { locState, distance, isWithinRadius } = useOfficeGeofence();

  const mut = useMutation({
    mutationFn: async () => {
      if (locState.status !== "ready")
        throw new Error("Location not available");
      const { lat, lng } = locState;
      return isIn
        ? checkIn(lat, lng, buildIso(day.date, inTime))
        : checkOut(lat, lng, buildIso(day.date, outTime));
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
    activePicker === "in" ? inTime : activePicker === "out" ? outTime : new Date();

  const dateDisplay = new Date(day.date).toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
  });

  const locTone =
    locState.status === "denied"
      ? colors.red[500]
      : isWithinRadius === false
        ? colors.amber[600]
        : isWithinRadius === true
          ? colors.green[600]
          : colors.gray[400];

  return (
    <View style={s.sheet}>
      <View style={s.handle} />

      <View style={s.sheetHeader}>
        <View
          style={[
            s.sheetIcon,
            { backgroundColor: isIn ? colors.green[100] : colors.red[100] },
          ]}
        >
          <Feather
            name={isIn ? "log-in" : "log-out"}
            size={20}
            color={isIn ? colors.green[600] : colors.red[600]}
          />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.sheetTitle}>
            {isIn ? "Log check-in" : "Log check-out"}
          </Text>
          <Text style={s.sheetDate}>{dateDisplay}</Text>
        </View>
        <TouchableOpacity onPress={onClose} hitSlop={10} style={s.sheetClose}>
          <Feather name="x" size={20} color={colors.gray[500]} />
        </TouchableOpacity>
      </View>

      <View style={s.sheetBody}>
        {submitError ? (
          <AlertUI message={submitError} type="error" />
        ) : null}

        {/* Location */}
        <View style={s.locRow}>
          <Feather name="map-pin" size={15} color={locTone} />
          <Text style={s.locText} numberOfLines={1}>
            {locState.status === "loading"
              ? "Getting location…"
              : locState.status === "denied"
                ? "Location denied — required to submit"
                : isWithinRadius === true
                  ? "You are at the office"
                  : isWithinRadius === false
                    ? `${distance}m from office`
                    : `${locState.lat.toFixed(4)}, ${locState.lng.toFixed(4)}`}
          </Text>
          {locState.status === "loading" && (
            <ActivityIndicator size="small" color={colors.bytecode[500]} />
          )}
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
              <Text style={[s.officeTagText, { color: locTone }]}>
                {isWithinRadius ? "In office" : "Outside"}
              </Text>
            </View>
          )}
        </View>

        {/* Times */}
        <View style={s.timeCard}>
          <View style={[s.timeRow, !isIn && s.timeRowOff]}>
            <View
              style={[
                s.timeIcon,
                { backgroundColor: isIn ? colors.green[100] : colors.gray[100] },
              ]}
            >
              <Feather
                name="log-in"
                size={15}
                color={isIn ? colors.green[600] : colors.gray[400]}
              />
            </View>
            <Text style={s.timeLabel}>Check-in</Text>
            {isIn ? (
              <TouchableOpacity
                style={[s.timeBtn, { backgroundColor: colors.green[50] }]}
                onPress={() => setActivePicker("in")}
                activeOpacity={0.8}
              >
                <Text style={[s.timeBtnText, { color: colors.green[700] }]}>
                  {fmtTimeDisplay(inTime)}
                </Text>
                <Feather
                  name="chevron-down"
                  size={13}
                  color={colors.green[600]}
                />
              </TouchableOpacity>
            ) : (
              <Text style={s.timeExisting}>{fmtTime(day.checkInTime)}</Text>
            )}
          </View>

          <View style={s.timeDivider} />

          <View style={[s.timeRow, isIn && s.timeRowOff]}>
            <View
              style={[
                s.timeIcon,
                { backgroundColor: !isIn ? colors.red[100] : colors.gray[100] },
              ]}
            >
              <Feather
                name="log-out"
                size={15}
                color={!isIn ? colors.red[600] : colors.gray[400]}
              />
            </View>
            <Text style={s.timeLabel}>Check-out</Text>
            {!isIn ? (
              <TouchableOpacity
                style={[s.timeBtn, { backgroundColor: colors.red[50] }]}
                onPress={() => setActivePicker("out")}
                activeOpacity={0.8}
              >
                <Text style={[s.timeBtnText, { color: colors.red[700] }]}>
                  {fmtTimeDisplay(outTime)}
                </Text>
                <Feather name="chevron-down" size={13} color={colors.red[500]} />
              </TouchableOpacity>
            ) : (
              <Text style={s.timeExisting}>—</Text>
            )}
          </View>
        </View>

        {/* Submit */}
        <TouchableOpacity
          style={[
            s.submitBtn,
            (locState.status !== "ready" || mut.isPending) && s.submitBtnOff,
          ]}
          onPress={() => mut.mutate()}
          disabled={locState.status !== "ready" || mut.isPending}
          activeOpacity={0.9}
        >
          <View
            style={[
              s.submitBase,
              { backgroundColor: isIn ? colors.bytecode[600] : colors.red[600] },
            ]}
          />
          <View
            style={[
              s.submitAccent,
              { backgroundColor: isIn ? colors.bytecode[400] : colors.red[400] },
            ]}
          />
          {mut.isPending ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Feather
                name={isIn ? "log-in" : "log-out"}
                size={18}
                color="#fff"
              />
              <Text style={s.submitText}>
                {isIn ? "Submit check-in" : "Submit check-out"}
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Android dialog */}
      {activePicker !== null && Platform.OS === "android" && (
        <DateTimePicker
          value={pickerValue}
          mode="time"
          display="default"
          onChange={handleTimeChange}
        />
      )}

      {/* iOS inline spinner — a nested Modal inside this sheet misbehaves */}
      {activePicker !== null && Platform.OS === "ios" && (
        <View style={s.iosInline}>
          <View style={s.iosInlineHeader}>
            <Text style={s.iosInlineLabel}>
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
            themeVariant="light"
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
    setRefDate(addDays(data?.weekStart ?? today, -7));
  }

  function nextWeek() {
    if (isCurrentWeek) return;
    const next = addDays(data!.weekStart, 7);
    setRefDate(next > today ? undefined : next);
  }

  function handleWeekDatePicked(selected: Date) {
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
    <View style={s.root}>
      <PageHeader
        title={isAdminView ? "Timesheet" : "Weekly Timesheet"}
        subtitle={isAdminView ? params.employeeName : undefined}
        variant="bytecode"
        insetTop
      />

      <ScrollView
        contentContainerStyle={[s.content, { paddingBottom: insets.bottom + 32 }]}
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
          <TouchableOpacity
            onPress={prevWeek}
            style={s.navBtn}
            hitSlop={8}
            activeOpacity={0.7}
          >
            <Feather name="chevron-left" size={20} color={colors.bytecode[600]} />
          </TouchableOpacity>

          <View style={s.weekCenter}>
            <Text style={s.weekLabel}>{weekLabel}</Text>
            <TouchableOpacity
              style={s.calBtn}
              onPress={() => setShowWeekPicker(true)}
              hitSlop={8}
              activeOpacity={0.7}
            >
              <Feather name="calendar" size={12} color={colors.bytecode[600]} />
              <Text style={s.calBtnText}>
                {isCurrentWeek ? "This week" : "Jump to date"}
              </Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            onPress={nextWeek}
            style={[s.navBtn, isCurrentWeek && s.navBtnOff]}
            disabled={isCurrentWeek}
            hitSlop={8}
            activeOpacity={0.7}
          >
            <Feather
              name="chevron-right"
              size={20}
              color={isCurrentWeek ? colors.gray[300] : colors.bytecode[600]}
            />
          </TouchableOpacity>
        </View>

        {!isCurrentWeek && (
          <TouchableOpacity
            style={s.backToCurrent}
            onPress={() => setRefDate(undefined)}
            activeOpacity={0.7}
          >
            <Feather name="corner-up-left" size={13} color={colors.bytecode[600]} />
            <Text style={s.backToCurrentText}>Back to current week</Text>
          </TouchableOpacity>
        )}

        {isLoading ? (
          <View style={s.center}>
            <Spinner />
          </View>
        ) : isError ? (
          <AlertUI message={getApiErrorMessage(error)} type="error" />
        ) : data ? (
          <>
            {/* Summary */}
            <View style={s.summaryCard}>
              {[
                {
                  label: "Total hours",
                  value: fmtHours(Number(data.totalWorkHours ?? 0)),
                  icon: "clock" as const,
                  color: colors.bytecode[600],
                  bg: colors.bytecode[50],
                },
                {
                  label: "Present",
                  value: String(data.presentDays ?? 0),
                  icon: "check-circle" as const,
                  color: colors.green[600],
                  bg: colors.green[50],
                },
                {
                  label: "Late",
                  value: String(data.lateDays ?? 0),
                  icon: "alert-circle" as const,
                  color: colors.amber[600],
                  bg: colors.amber[50],
                },
              ].map((item, i, arr) => (
                <React.Fragment key={item.label}>
                  <View style={s.summaryItem}>
                    <View
                      style={[s.summaryIcon, { backgroundColor: item.bg }]}
                    >
                      <Feather name={item.icon} size={16} color={item.color} />
                    </View>
                    <Text style={s.summaryValue}>{item.value}</Text>
                    <Text style={s.summaryLabel}>{item.label}</Text>
                  </View>
                  {i < arr.length - 1 && <View style={s.summaryDivider} />}
                </React.Fragment>
              ))}
            </View>

            {/* Days */}
            <View style={s.dayList}>
              {data.days.map((day) => (
                <DayRow
                  key={day.date}
                  day={day}
                  adminView={isAdminView}
                  onPress={async () => {
                    if (!isAdminView) {
                      setSelectedDay(day);
                      return;
                    }
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
                  }}
                />
              ))}
            </View>

            {/* Footer meta */}
            <View style={s.footerMeta}>
              {data.weekendDays?.length > 0 && (
                <View style={s.weekendStrip}>
                  <Feather name="moon" size={12} color={colors.gray[400]} />
                  <Text style={s.weekendLabel}>Weekend</Text>
                  {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d, i) =>
                    data.weekendDays.includes(i) ? (
                      <View key={i} style={s.weekendPill}>
                        <Text style={s.weekendPillText}>{d}</Text>
                      </View>
                    ) : null,
                  )}
                </View>
              )}
              <Text style={s.legend}>
                <Text style={s.legendBadge}>M</Text> marked by admin ·{" "}
                tap a row with ✎ to log time
              </Text>
            </View>
          </>
        ) : null}
      </ScrollView>

      <TimePickerSheet
        visible={showWeekPicker}
        value={refDate ? new Date(refDate) : new Date()}
        title="Jump to week"
        mode="date"
        maximumDate={new Date()}
        onChange={handleWeekDatePicked}
        onClose={() => setShowWeekPicker(false)}
      />

      <Modal
        transparent
        animationType="slide"
        visible={selectedDay !== null}
        onRequestClose={() => setSelectedDay(null)}
      >
        <View style={s.overlay}>
          {selectedDay && (
            <EntrySheet
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
  center: { paddingTop: 48, alignItems: "center" },

  // week nav
  weekNav: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.gray[100],
    padding: 12,
  },
  navBtn: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: colors.bytecode[50],
    alignItems: "center",
    justifyContent: "center",
  },
  navBtnOff: { backgroundColor: colors.gray[50] },
  weekCenter: { flex: 1, alignItems: "center", gap: 6 },
  weekLabel: { fontSize: 16, fontWeight: "800", color: colors.gray[900] },
  calBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: colors.bytecode[50],
    borderRadius: 20,
    paddingHorizontal: 11,
    paddingVertical: 5,
  },
  calBtnText: { fontSize: 11, fontWeight: "700", color: colors.bytecode[700] },

  backToCurrent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 4,
  },
  backToCurrentText: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.bytecode[600],
  },

  // summary
  summaryCard: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.gray[100],
    paddingVertical: 16,
  },
  summaryItem: { flex: 1, alignItems: "center", gap: 5 },
  summaryIcon: {
    width: 38,
    height: 38,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 2,
  },
  summaryValue: { fontSize: 20, fontWeight: "900", color: colors.gray[900] },
  summaryLabel: { fontSize: 11, color: colors.gray[400], fontWeight: "600" },
  summaryDivider: {
    width: 1,
    alignSelf: "stretch",
    backgroundColor: colors.gray[100],
    marginVertical: 6,
  },

  // day rows
  dayList: { gap: 8 },
  dayRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#fff",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.gray[100],
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  dayRowToday: {
    borderColor: colors.bytecode[200],
    backgroundColor: colors.bytecode[50],
  },
  dateTile: {
    width: 46,
    height: 50,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  dateNum: { fontSize: 18, fontWeight: "900", lineHeight: 22 },
  dateMonth: { fontSize: 10, fontWeight: "700", textTransform: "uppercase" },

  dayBody: { flex: 1, gap: 6 },
  dayTopRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  weekday: { fontSize: 14, fontWeight: "800", color: colors.gray[900] },
  weekdayOff: { color: colors.gray[400] },
  todayTag: {
    backgroundColor: colors.bytecode[600],
    borderRadius: 20,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  todayTagText: { fontSize: 9, fontWeight: "800", color: "#fff" },
  statusPill: {
    borderRadius: 20,
    paddingHorizontal: 9,
    paddingVertical: 3,
  },
  statusText: { fontSize: 10, fontWeight: "700" },

  dayBottomRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  timeValue: { fontSize: 11, color: colors.gray[600], fontWeight: "600" },
  timeValueOff: { color: colors.gray[300] },

  dayRight: { alignItems: "flex-end", gap: 6 },
  hoursText: { fontSize: 13, fontWeight: "900", color: colors.gray[900] },
  hoursTextOff: { color: colors.gray[300] },
  dayRightMeta: { flexDirection: "row", alignItems: "center", gap: 6 },
  manualDot: {
    width: 17,
    height: 17,
    borderRadius: 6,
    backgroundColor: colors.bytecode[50],
    alignItems: "center",
    justifyContent: "center",
  },
  manualDotText: { fontSize: 9, fontWeight: "900", color: colors.bytecode[600] },

  // footer
  footerMeta: { gap: 10, marginTop: 4 },
  weekendStrip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    justifyContent: "center",
  },
  weekendLabel: { fontSize: 11, color: colors.gray[400], fontWeight: "600" },
  weekendPill: {
    backgroundColor: colors.gray[200],
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  weekendPillText: { fontSize: 10, fontWeight: "700", color: colors.gray[600] },
  legend: {
    fontSize: 11,
    color: colors.gray[400],
    textAlign: "center",
    lineHeight: 17,
  },
  legendBadge: { fontWeight: "900", color: colors.bytecode[600] },

  // entry sheet
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  sheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingBottom: 40,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.gray[200],
    alignSelf: "center",
    marginTop: 10,
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 16,
  },
  sheetIcon: {
    width: 44,
    height: 44,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  sheetTitle: { fontSize: 18, fontWeight: "800", color: colors.gray[900] },
  sheetDate: { fontSize: 12, color: colors.gray[400], marginTop: 2 },
  sheetClose: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: colors.gray[50],
    alignItems: "center",
    justifyContent: "center",
  },
  sheetBody: { paddingHorizontal: 20, gap: 12 },

  locRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    backgroundColor: colors.gray[50],
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  locText: { flex: 1, fontSize: 12.5, color: colors.gray[600], fontWeight: "500" },
  officeTag: { borderRadius: 20, paddingHorizontal: 9, paddingVertical: 4 },
  officeTagText: { fontSize: 11, fontWeight: "700" },

  timeCard: {
    backgroundColor: "#fff",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.gray[100],
    overflow: "hidden",
  },
  timeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  timeRowOff: { opacity: 0.45 },
  timeIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  timeLabel: {
    flex: 1,
    fontSize: 14,
    fontWeight: "700",
    color: colors.gray[800],
  },
  timeBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  timeBtnText: { fontSize: 14, fontWeight: "800" },
  timeExisting: { fontSize: 14, fontWeight: "700", color: colors.gray[500] },
  timeDivider: { height: 1, backgroundColor: colors.gray[100] },

  submitBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    borderRadius: 18,
    height: 56,
    marginTop: 4,
    overflow: "hidden",
    position: "relative",
  },
  submitBase: { ...StyleSheet.absoluteFillObject },
  submitAccent: {
    position: "absolute",
    width: 200,
    height: 200,
    borderRadius: 100,
    top: -100,
    left: -40,
    opacity: 0.3,
  },
  submitBtnOff: { opacity: 0.45 },
  submitText: { fontSize: 16, fontWeight: "800", color: "#fff" },

  iosInline: {
    borderTopWidth: 1,
    borderTopColor: colors.gray[100],
    marginTop: 12,
  },
  iosInlineHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  iosInlineLabel: { fontSize: 14, fontWeight: "700", color: colors.gray[700] },
  iosDone: { fontSize: 15, fontWeight: "700", color: colors.bytecode[600] },
});
