// app/(app)/admin/attendance/reports.tsx

import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Feather from "@expo/vector-icons/Feather";
import DateTimePicker from "@react-native-community/datetimepicker";
import {
  emailAttendanceReport,
  type ReportRange,
  type ReportScope,
} from "@/lib/api/report.api";
import { getUsers } from "@/lib/api/users.api";
import { adminListActiveDepartments } from "@/lib/api/department.api";
import { adminListActiveTeams } from "@/lib/api/teams.api";
import { adminListEmployees } from "@/lib/api/attendance.api";
import { getApiErrorMessage } from "@/lib/api-error";
import { colors } from "@/components/ui/theme";
import { PageHeader } from "@/components/ui/PageHeader";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { EmployeePickerModal } from "@/components/ui/EmployeePickerModal";

const RANGES: { value: ReportRange; label: string }[] = [
  { value: "last_week", label: "Last week" },
  { value: "this_month", label: "This month" },
  { value: "custom", label: "Custom" },
];

const SCOPES: { value: ReportScope; label: string }[] = [
  { value: "all", label: "Everyone" },
  { value: "department", label: "Departments" },
  { value: "team", label: "Teams" },
  { value: "employees", label: "People" },
];

const pad = (n: number) => String(n).padStart(2, "0");
const ymd = (d: Date) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const fmt = (d: Date) =>
  d.toLocaleDateString("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

type Recipient = { id: number; name: string; email: string };

export default function ReportsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [range, setRange] = useState<ReportRange>("last_week");
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date());
  const [datePicking, setDatePicking] = useState<"start" | "end" | null>(null);

  const [scope, setScope] = useState<ReportScope>("all");
  const [ids, setIds] = useState<number[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);

  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [search, setSearch] = useState("");

  const deptQuery = useQuery({
    queryKey: ["departments-active"],
    queryFn: adminListActiveDepartments,
    enabled: scope === "department",
  });
  const teamQuery = useQuery({
    queryKey: ["admin-teams-active"],
    queryFn: () => adminListActiveTeams(),
    enabled: scope === "team",
  });
  const groupQuery = scope === "department" ? deptQuery : teamQuery;
  const groupLabel = scope === "department" ? "departments" : "teams";
  const options =
    (scope === "department" || scope === "team"
      ? groupQuery.data
      : undefined) ?? [];

  const { data: empData } = useQuery({
    queryKey: ["admin-employees-pick"],
    queryFn: () => adminListEmployees({ limit: 200 }),
    enabled: scope === "employees",
    staleTime: 2 * 60 * 1000,
  });

  const term = search.trim();
  const { data: userResults, isFetching: searching } = useQuery({
    queryKey: ["report-recipients", term],
    queryFn: () => getUsers({ search: term, limit: 8 }),
    enabled: term.length >= 2,
  });
  const matches = (userResults?.data ?? []).filter(
    (u) => u.isActive && !recipients.some((r) => r.id === u.id),
  );

  const mut = useMutation({
    mutationFn: emailAttendanceReport,
    onSuccess: (r) => {
      const failedNote = r.failed > 0 ? `\n${r.failed} failed to send.` : "";
      Alert.alert(
        "Report sent",
        `${r.range.startDate} → ${r.range.endDate}\n` +
          `${r.employees} employees, ${r.weeks} weeks.\n` +
          `Emailed to ${r.sent} ${r.sent === 1 ? "recipient" : "recipients"}.` +
          failedNote,
        [{ text: "OK", onPress: () => router.back() }],
      );
    },
    onError: (e) => Alert.alert("Error", getApiErrorMessage(e)),
  });

  const changeScope = (s: ReportScope) => {
    setScope(s);
    setIds([]);
  };
  const toggle = (id: number) =>
    setIds((cur) =>
      cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id],
    );

  const needsIds = scope !== "all";
  const rangeValid = range !== "custom" || startDate <= endDate;
  const canSend =
    rangeValid &&
    (!needsIds || ids.length > 0) &&
    recipients.length > 0 &&
    !mut.isPending;

  const send = () =>
    Alert.alert(
      "Email report",
      `Send the Excel report to ${recipients.length} ${
        recipients.length === 1 ? "person" : "people"
      }? Large reports can take a minute.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Send",
          onPress: () =>
            mut.mutate({
              range,
              ...(range === "custom" && {
                startDate: ymd(startDate),
                endDate: ymd(endDate),
              }),
              scope,
              ids: needsIds ? ids : undefined,
              recipientUserIds: recipients.map((r) => r.id),
            }),
        },
      ],
    );

  return (
    <View style={s.root}>
      <PageHeader title="Attendance Report" variant="bytecode" insetTop />
      <ScrollView
        contentContainerStyle={[
          s.content,
          { paddingBottom: insets.bottom + 32 },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={s.note}>
          An Excel file with a summary and one tab per week (Saturday to
          Friday) is emailed to the people you choose.
        </Text>

        <Text style={s.label}>Period</Text>
        <View style={s.chips}>
          {RANGES.map((r) => (
            <Chip
              key={r.value}
              label={r.label}
              on={range === r.value}
              onPress={() => setRange(r.value)}
            />
          ))}
        </View>

        {range === "custom" && (
          <View style={{ gap: 8 }}>
            <View style={s.dateRow}>
              <DateButton
                label="From"
                value={fmt(startDate)}
                onPress={() => setDatePicking("start")}
              />
              <DateButton
                label="To"
                value={fmt(endDate)}
                onPress={() => setDatePicking("end")}
              />
            </View>
            {!rangeValid && (
              <Text style={s.error}>Start date must be before end date.</Text>
            )}
            <Text style={s.hint}>Custom ranges can span up to 366 days.</Text>
          </View>
        )}
        {datePicking && (
          <DateTimePicker
            value={datePicking === "start" ? startDate : endDate}
            mode="date"
            onChange={(_, d) => {
              const which = datePicking;
              if (Platform.OS === "android") setDatePicking(null);
              if (!d) return;
              if (which === "start") setStartDate(d);
              else setEndDate(d);
            }}
          />
        )}

        <Text style={s.label}>Employees</Text>
        <View style={s.chips}>
          {SCOPES.map((o) => (
            <Chip
              key={o.value}
              label={o.label}
              on={scope === o.value}
              onPress={() => changeScope(o.value)}
            />
          ))}
        </View>

        {(scope === "department" || scope === "team") && (
          <View style={{ gap: 10 }}>
            {groupQuery.isLoading ? (
              <ActivityIndicator color={colors.bytecode[600]} />
            ) : groupQuery.isError ? (
              <TouchableOpacity onPress={() => groupQuery.refetch()}>
                <Text style={s.hint}>
                  Couldn't load {groupLabel}. Tap to retry.
                </Text>
              </TouchableOpacity>
            ) : options.length === 0 ? (
              <Text style={s.hint}>No active {groupLabel} found.</Text>
            ) : (
              <View style={s.chips}>
                {options.map((o) => (
                  <Chip
                    key={o.id}
                    label={o.name}
                    on={ids.includes(o.id)}
                    onPress={() => toggle(o.id)}
                  />
                ))}
              </View>
            )}
          </View>
        )}

        {scope === "employees" && (
          <TouchableOpacity
            style={s.pickBtn}
            onPress={() => setPickerOpen(true)}
            activeOpacity={0.8}
          >
            <Text style={s.pickText}>
              {ids.length ? `${ids.length} selected` : "Choose people"}
            </Text>
          </TouchableOpacity>
        )}

        <Text style={s.label}>Email to</Text>
        {recipients.length > 0 && (
          <View style={s.chips}>
            {recipients.map((r) => (
              <TouchableOpacity
                key={r.id}
                style={[s.chip, s.chipOn, s.recipient]}
                onPress={() =>
                  setRecipients((cur) => cur.filter((x) => x.id !== r.id))
                }
                activeOpacity={0.8}
              >
                <Text style={[s.chipText, s.chipTextOn]}>{r.name}</Text>
                <Feather name="x" size={13} color="#fff" />
              </TouchableOpacity>
            ))}
          </View>
        )}
        <Input
          value={search}
          onChangeText={setSearch}
          placeholder="Search users by name or email"
          autoCapitalize="none"
        />
        {term.length >= 2 && (
          <View style={s.results}>
            {searching ? (
              <ActivityIndicator
                color={colors.bytecode[600]}
                style={{ padding: 12 }}
              />
            ) : matches.length === 0 ? (
              <Text style={[s.hint, { padding: 12 }]}>No users found.</Text>
            ) : (
              matches.map((u, i) => (
                <TouchableOpacity
                  key={u.id}
                  style={[s.resultRow, i > 0 && s.resultDivider]}
                  onPress={() => {
                    setRecipients((cur) => [
                      ...cur,
                      {
                        id: u.id,
                        name: `${u.firstName} ${u.lastName}`.trim(),
                        email: u.email,
                      },
                    ]);
                    setSearch("");
                  }}
                >
                  <Text style={s.resultName}>
                    {u.firstName} {u.lastName}
                  </Text>
                  <Text style={s.resultEmail}>{u.email}</Text>
                </TouchableOpacity>
              ))
            )}
          </View>
        )}

        <Button onPress={send} disabled={!canSend} loading={mut.isPending}>
          Email report
        </Button>
      </ScrollView>

      <EmployeePickerModal
        visible={pickerOpen}
        title="Select employees"
        employees={empData?.data ?? []}
        multiple
        confirmLabel={(n) => `Select ${n}`}
        onConfirm={(emps) => {
          setIds(emps.map((e) => e.id));
          setPickerOpen(false);
        }}
        onClose={() => setPickerOpen(false)}
      />
    </View>
  );
}

function Chip({
  label,
  on,
  onPress,
}: {
  label: string;
  on: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[s.chip, on && s.chipOn]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <Text style={[s.chipText, on && s.chipTextOn]}>{label}</Text>
    </TouchableOpacity>
  );
}

function DateButton({
  label,
  value,
  onPress,
}: {
  label: string;
  value: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity style={s.dateBtn} onPress={onPress} activeOpacity={0.8}>
      <Text style={s.dateLabel}>{label}</Text>
      <Text style={s.dateValue}>{value}</Text>
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.gray[50] },
  content: { padding: 16, gap: 16 },
  note: { fontSize: 13, lineHeight: 19, color: colors.gray[500] },
  label: { fontSize: 13, fontWeight: "600", color: colors.gray[700] },
  hint: { fontSize: 12, color: colors.gray[500] },
  error: { fontSize: 12, color: colors.red[600] },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: colors.gray[200],
  },
  chipOn: {
    backgroundColor: colors.bytecode[600],
    borderColor: colors.bytecode[600],
  },
  chipText: { fontSize: 13, fontWeight: "600", color: colors.gray[600] },
  chipTextOn: { color: "#fff" },
  recipient: { flexDirection: "row", alignItems: "center", gap: 6 },
  dateRow: { flexDirection: "row", gap: 10 },
  dateBtn: {
    flex: 1,
    padding: 12,
    borderRadius: 12,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: colors.gray[200],
  },
  dateLabel: { fontSize: 11, color: colors.gray[400] },
  dateValue: { marginTop: 2, fontSize: 14, fontWeight: "600", color: colors.gray[800] },
  pickBtn: {
    padding: 14,
    borderRadius: 12,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: colors.gray[200],
  },
  pickText: { fontSize: 14, color: colors.gray[700] },
  results: {
    borderRadius: 12,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: colors.gray[200],
    overflow: "hidden",
  },
  resultRow: { paddingHorizontal: 14, paddingVertical: 10 },
  resultDivider: { borderTopWidth: 1, borderTopColor: colors.gray[100] },
  resultName: { fontSize: 14, fontWeight: "600", color: colors.gray[800] },
  resultEmail: { fontSize: 12, color: colors.gray[400] },
});
