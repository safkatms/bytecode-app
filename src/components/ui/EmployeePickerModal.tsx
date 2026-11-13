import React, { useState } from "react";
import {
  View,
  Text,
  Modal,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Feather from "@expo/vector-icons/Feather";
import { colors } from "./theme";
import { Avatar } from "./Avatar";
import type { Employee } from "@/types/attendance";

export function EmployeePickerModal({
  visible,
  title = "Select Employee",
  employees,
  selectedId,
  onSelect,
  multiple = false,
  confirmLabel = (n) => `Add ${n} selected`,
  onConfirm,
  busy = false,
  onClose,
}: {
  visible: boolean;
  title?: string;
  employees: Employee[];
  selectedId?: number;
  /** single-select: called with the tapped employee */
  onSelect?: (employee: Employee) => void;
  /** multi-select: rows toggle, a footer button confirms the whole selection */
  multiple?: boolean;
  confirmLabel?: (count: number) => string;
  onConfirm?: (employees: Employee[]) => void;
  busy?: boolean;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  const [search, setSearch] = useState("");
  const [picked, setPicked] = useState<number[]>([]);

  const close = () => {
    setSearch("");
    setPicked([]);
    onClose();
  };

  const toggle = (id: number) =>
    setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));

  const confirm = () => {
    onConfirm?.(employees.filter((e) => picked.includes(e.id)));
    setSearch("");
    setPicked([]);
  };

  const q = search.trim().toLowerCase();
  const filtered = q
    ? employees.filter((e) => {
        const name =
          `${e.user.firstName ?? ""} ${e.user.lastName ?? ""}`.toLowerCase();
        return name.includes(q) || e.employeeCode.toLowerCase().includes(q);
      })
    : employees;

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={close}>
      <View style={[s.modal, { paddingTop: insets.top }]}>
        <View style={s.header}>
          <Text style={s.title}>{title}</Text>
          <TouchableOpacity onPress={close} hitSlop={8}>
            <Feather name="x" size={22} color={colors.gray[700]} />
          </TouchableOpacity>
        </View>
        <View style={s.searchBox}>
          <Feather name="search" size={16} color={colors.gray[400]} />
          <TextInput
            style={s.searchInput}
            placeholder="Search by name or code…"
            placeholderTextColor={colors.gray[400]}
            value={search}
            onChangeText={setSearch}
            autoFocus
          />
        </View>
        <FlatList
          data={filtered}
          keyExtractor={(e) => String(e.id)}
          contentContainerStyle={s.list}
          keyboardShouldPersistTaps="handled"
          ItemSeparatorComponent={() => (
            <View style={{ height: 1, backgroundColor: colors.gray[50] }} />
          )}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={s.item}
              onPress={() => {
                if (multiple) {
                  toggle(item.id);
                } else {
                  setSearch("");
                  onSelect?.(item);
                }
              }}
              activeOpacity={0.8}
            >
              <Avatar
                uri={item.user.avatarUrl}
                firstName={item.user.firstName}
                lastName={item.user.lastName}
                size={38}
              />
              <View style={{ flex: 1 }}>
                <Text style={s.itemName}>
                  {item.user.firstName} {item.user.lastName}
                </Text>
                <Text style={s.itemSub}>{item.employeeCode}</Text>
              </View>
              {multiple ? (
                <Feather
                  name={picked.includes(item.id) ? "check-square" : "square"}
                  size={20}
                  color={
                    picked.includes(item.id)
                      ? colors.bytecode[600]
                      : colors.gray[300]
                  }
                />
              ) : (
                selectedId === item.id && (
                  <Feather
                    name="check"
                    size={16}
                    color={colors.bytecode[600]}
                  />
                )
              )}
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <View style={s.empty}>
              <Text style={s.emptyText}>No employees found</Text>
            </View>
          }
        />
        {multiple && (
          <View style={[s.footer, { paddingBottom: insets.bottom + 10 }]}>
            <TouchableOpacity
              style={[
                s.confirmBtn,
                (picked.length === 0 || busy) && s.confirmOff,
              ]}
              onPress={confirm}
              disabled={picked.length === 0 || busy}
              activeOpacity={0.85}
            >
              <Text style={s.confirmText}>
                {busy
                  ? "Adding…"
                  : picked.length === 0
                    ? "Select employees"
                    : confirmLabel(picked.length)}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  modal: { flex: 1, backgroundColor: "#fff" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[100],
  },
  title: { fontSize: 18, fontWeight: "800", color: colors.gray[900] },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    margin: 16,
    backgroundColor: colors.gray[50],
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.gray[200],
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  searchInput: { flex: 1, fontSize: 14, color: colors.gray[900] },
  list: { paddingHorizontal: 16, paddingBottom: 10 },
  item: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 13,
  },
  itemName: { fontSize: 14, fontWeight: "700", color: colors.gray[900] },
  itemSub: { fontSize: 11, color: colors.gray[400], marginTop: 1 },
  footer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.gray[100],
    backgroundColor: "#fff",
  },
  confirmBtn: {
    height: 50,
    borderRadius: 14,
    backgroundColor: colors.bytecode[600],
    alignItems: "center",
    justifyContent: "center",
  },
  confirmOff: { opacity: 0.45 },
  confirmText: { fontSize: 15, fontWeight: "800", color: "#fff" },
  empty: { alignItems: "center", paddingTop: 48 },
  emptyText: { fontSize: 14, color: colors.gray[400] },
});
