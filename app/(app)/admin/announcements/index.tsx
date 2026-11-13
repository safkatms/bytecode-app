// app/(app)/admin/announcements/index.tsx

import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Switch,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  broadcastAnnouncement,
  type BroadcastTarget,
} from "@/lib/api/notification.api";
import { adminListActiveDepartments } from "@/lib/api/department.api";
import { adminListActiveTeams } from "@/lib/api/teams.api";
import { adminListEmployees } from "@/lib/api/attendance.api";
import { getApiErrorMessage } from "@/lib/api-error";
import { colors } from "@/components/ui/theme";
import { PageHeader } from "@/components/ui/PageHeader";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { EmployeePickerModal } from "@/components/ui/EmployeePickerModal";

const TARGETS: { value: BroadcastTarget; label: string }[] = [
  { value: "all", label: "Everyone" },
  { value: "department", label: "Departments" },
  { value: "team", label: "Teams" },
  { value: "employees", label: "People" },
];

export default function AnnouncementsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [target, setTarget] = useState<BroadcastTarget>("all");
  const [ids, setIds] = useState<number[]>([]);
  const [sendEmail, setSendEmail] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);

  const deptQuery = useQuery({
    queryKey: ["departments-active"],
    queryFn: adminListActiveDepartments,
    enabled: target === "department",
  });
  const teamQuery = useQuery({
    queryKey: ["admin-teams-active"],
    queryFn: () => adminListActiveTeams(),
    enabled: target === "team",
  });
  const groupQuery = target === "department" ? deptQuery : teamQuery;
  const { data: empData } = useQuery({
    queryKey: ["admin-employees-pick"],
    queryFn: () => adminListEmployees({ limit: 200 }),
    enabled: target === "employees",
    staleTime: 2 * 60 * 1000,
  });

  const mut = useMutation({
    mutationFn: broadcastAnnouncement,
    onSuccess: ({ recipients }) => {
      Alert.alert(
        "Announcement sent",
        `Delivered to ${recipients} ${recipients === 1 ? "person" : "people"}.`,
        [{ text: "OK", onPress: () => router.back() }],
      );
    },
    onError: (e) => Alert.alert("Error", getApiErrorMessage(e)),
  });

  const changeTarget = (t: BroadcastTarget) => {
    setTarget(t);
    setIds([]);
  };
  const toggle = (id: number) =>
    setIds((cur) =>
      cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id],
    );

  const options =
    (target === "department" || target === "team"
      ? groupQuery.data
      : undefined) ?? [];
  const groupLabel = target === "department" ? "departments" : "teams";
  const needsIds = target !== "all";
  const canSend =
    !!title.trim() &&
    !!body.trim() &&
    (!needsIds || ids.length > 0) &&
    !mut.isPending;

  const send = () =>
    Alert.alert(
      "Send announcement",
      "This notifies the selected people right away.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Send",
          onPress: () =>
            mut.mutate({
              title: title.trim(),
              body: body.trim(),
              target,
              ids: needsIds ? ids : undefined,
              sendEmail,
            }),
        },
      ],
    );

  return (
    <KeyboardAvoidingView
      style={s.root}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <PageHeader title="Announcement" variant="bytecode" insetTop />
      <ScrollView
        contentContainerStyle={[
          s.content,
          { paddingBottom: insets.bottom + 10 },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <Input
          label="Title"
          value={title}
          onChangeText={setTitle}
          maxLength={200}
          placeholder="Office closed tomorrow"
        />
        <Input
          label="Message"
          value={body}
          onChangeText={setBody}
          maxLength={1000}
          multiline
          numberOfLines={5}
          textAlignVertical="top"
          style={{ minHeight: 110 }}
          placeholder="Write your announcement…"
        />

        <Text style={s.label}>Send to</Text>
        <View style={s.chips}>
          {TARGETS.map((t) => (
            <TouchableOpacity
              key={t.value}
              style={[s.chip, target === t.value && s.chipOn]}
              onPress={() => changeTarget(t.value)}
              activeOpacity={0.8}
            >
              <Text style={[s.chipText, target === t.value && s.chipTextOn]}>
                {t.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {(target === "department" || target === "team") && (
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
              <>
                <TouchableOpacity
                  onPress={() =>
                    setIds(
                      ids.length === options.length
                        ? []
                        : options.map((o) => o.id),
                    )
                  }
                >
                  <Text style={s.link}>
                    {ids.length === options.length
                      ? "Clear selection"
                      : `Select all ${groupLabel}`}
                  </Text>
                </TouchableOpacity>
                <View style={s.chips}>
                  {options.map((o) => (
                    <TouchableOpacity
                      key={o.id}
                      style={[s.chip, ids.includes(o.id) && s.chipOn]}
                      onPress={() => toggle(o.id)}
                      activeOpacity={0.8}
                    >
                      <Text
                        style={[s.chipText, ids.includes(o.id) && s.chipTextOn]}
                      >
                        {o.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            )}
          </View>
        )}

        {target === "employees" && (
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

        <View style={s.switchRow}>
          <View style={{ flex: 1 }}>
            <Text style={s.switchLabel}>Also send by email</Text>
            <Text style={s.switchSub}>
              Recipients get the message in their inbox too
            </Text>
          </View>
          <Switch
            value={sendEmail}
            onValueChange={setSendEmail}
            trackColor={{ true: colors.bytecode[600] }}
          />
        </View>

        <Button onPress={send} disabled={!canSend} loading={mut.isPending}>
          Send announcement
        </Button>
      </ScrollView>

      <EmployeePickerModal
        visible={pickerOpen}
        title="Select recipients"
        employees={empData?.data ?? []}
        multiple
        confirmLabel={(n) => `Select ${n}`}
        onConfirm={(emps) => {
          setIds(emps.map((e) => e.id));
          setPickerOpen(false);
        }}
        onClose={() => setPickerOpen(false)}
      />
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.gray[50] },
  content: { padding: 16, gap: 16 },
  label: { fontSize: 13, fontWeight: "600", color: colors.gray[700] },
  hint: { fontSize: 13, color: colors.gray[500] },
  link: { fontSize: 13, fontWeight: "600", color: colors.bytecode[600] },
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
  pickBtn: {
    padding: 14,
    borderRadius: 12,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: colors.gray[200],
  },
  pickText: { fontSize: 14, color: colors.gray[700] },
  switchRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  switchLabel: { fontSize: 14, fontWeight: "600", color: colors.gray[800] },
  switchSub: { fontSize: 12, color: colors.gray[400] },
});
