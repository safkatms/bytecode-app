// app/(app)/admin/teams/index.tsx

import React, { useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  RefreshControl,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Feather from "@expo/vector-icons/Feather";
import {
  adminListTeams,
  adminDeleteTeam,
  adminUpdateTeam,
} from "@/lib/api/teams.api";
import { colors } from "@/components/ui/theme";
import { Spinner } from "@/components/ui/Spinner";
import { PageHeader } from "@/components/ui/PageHeader";
import type { Team } from "@/types/attendance";

function TeamRow({
  team,
  onEdit,
  onToggle,
  onDelete,
}: {
  team: Team;
  onEdit: () => void;
  onToggle: () => void;
  onDelete: () => void;
}) {
  const initials = team.name.slice(0, 2).toUpperCase();
  const leaderName =
    `${team.leader?.user?.firstName ?? ""} ${team.leader?.user?.lastName ?? ""}`.trim() ||
    "—";

  return (
    <View style={s.row}>
      <View
        style={[
          s.rowIcon,
          { backgroundColor: team.isActive ? colors.bytecode[50] : colors.gray[100] },
        ]}
      >
        <Text
          style={[
            s.rowInitials,
            { color: team.isActive ? colors.bytecode[700] : colors.gray[400] },
          ]}
        >
          {initials}
        </Text>
      </View>

      <View style={s.rowInfo}>
        <Text style={s.rowName} numberOfLines={1}>
          {team.name}
        </Text>
        <Text style={s.rowMeta} numberOfLines={1}>
          Leader: {leaderName} · {team.members?.length ?? 0} member
          {(team.members?.length ?? 0) !== 1 ? "s" : ""}
        </Text>
      </View>

      <View style={s.rowRight}>
        <TouchableOpacity
          onPress={onToggle}
          style={[
            s.activeBadge,
            { backgroundColor: team.isActive ? colors.green[50] : colors.red[50] },
          ]}
        >
          <View
            style={[
              s.activeDot,
              { backgroundColor: team.isActive ? colors.green[500] : colors.red[400] },
            ]}
          />
          <Text
            style={[
              s.activeText,
              { color: team.isActive ? colors.green[700] : colors.red[500] },
            ]}
          >
            {team.isActive ? "Active" : "Inactive"}
          </Text>
        </TouchableOpacity>
        <View style={s.rowActions}>
          <TouchableOpacity onPress={onEdit} hitSlop={8} style={s.actionBtn}>
            <Feather name="edit-2" size={14} color={colors.bytecode[600]} />
          </TouchableOpacity>
          <TouchableOpacity onPress={onDelete} hitSlop={8} style={s.actionBtn}>
            <Feather name="trash-2" size={14} color={colors.red[400]} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

export default function AdminTeamsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ["admin-teams", page, search],
    queryFn: () =>
      adminListTeams({ page, limit: 20, search: search || undefined }),
  });

  const toggleMut = useMutation({
    mutationFn: ({ id, isActive }: { id: number; isActive: boolean }) =>
      adminUpdateTeam(id, { isActive: !isActive }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-teams"] }),
    onError: () => Alert.alert("Error", "Failed to update team"),
  });

  const deleteMut = useMutation({
    mutationFn: adminDeleteTeam,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-teams"] }),
    onError: () => Alert.alert("Error", "Failed to delete team"),
  });

  function confirmDelete(team: Team) {
    Alert.alert(
      "Delete Team",
      `Remove "${team.name}"? This cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => deleteMut.mutate(team.id),
        },
      ],
    );
  }

  const teams = data?.data ?? [];
  const meta = data?.meta;

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      <PageHeader
        title="Teams"
        variant="bytecode"
        rightActions={[
          {
            icon: "plus",
            onPress: () => router.push("/(app)/admin/teams/form"),
          },
        ]}
      />

      <View style={s.searchRow}>
        <Feather name="search" size={14} color={colors.gray[400]} />
        <TextInput
          style={s.searchInput}
          placeholder="Search teams…"
          placeholderTextColor={colors.gray[300]}
          value={search}
          onChangeText={(v) => {
            setSearch(v);
            setPage(1);
          }}
        />
        {search ? (
          <TouchableOpacity onPress={() => setSearch("")} hitSlop={8}>
            <Feather name="x" size={14} color={colors.gray[400]} />
          </TouchableOpacity>
        ) : null}
      </View>

      {isLoading ? (
        <View style={s.center}>
          <Spinner />
        </View>
      ) : (
        <FlatList
          data={teams}
          keyExtractor={(i) => String(i.id)}
          contentContainerStyle={s.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              tintColor={colors.bytecode[600]}
            />
          }
          ListEmptyComponent={
            <View style={s.empty}>
              <Feather name="users" size={36} color={colors.gray[300]} />
              <Text style={s.emptyText}>No teams found</Text>
            </View>
          }
          ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
          renderItem={({ item }) => (
            <TeamRow
              team={item}
              onEdit={() =>
                router.push({
                  pathname: "/(app)/admin/teams/form",
                  params: { id: item.id },
                })
              }
              onToggle={() =>
                toggleMut.mutate({ id: item.id, isActive: item.isActive })
              }
              onDelete={() => confirmDelete(item)}
            />
          )}
          ListFooterComponent={
            meta && meta.totalPages > 1 ? (
              <View style={s.pagination}>
                <TouchableOpacity
                  style={[s.pageBtn, page === 1 && s.pageBtnOff]}
                  onPress={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  <Feather
                    name="chevron-left"
                    size={18}
                    color={page === 1 ? colors.gray[300] : colors.bytecode[600]}
                  />
                </TouchableOpacity>
                <Text style={s.pageLabel}>
                  {page} / {meta.totalPages}
                </Text>
                <TouchableOpacity
                  style={[s.pageBtn, page === meta.totalPages && s.pageBtnOff]}
                  onPress={() => setPage((p) => Math.min(meta.totalPages, p + 1))}
                  disabled={page === meta.totalPages}
                >
                  <Feather
                    name="chevron-right"
                    size={18}
                    color={
                      page === meta.totalPages
                        ? colors.gray[300]
                        : colors.bytecode[600]
                    }
                  />
                </TouchableOpacity>
              </View>
            ) : null
          }
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.gray[50] },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    margin: 16,
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.gray[200],
    paddingHorizontal: 12,
    height: 42,
  },
  searchInput: { flex: 1, fontSize: 14, color: colors.gray[900] },
  list: { paddingHorizontal: 16, paddingBottom: 40 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 14,
    gap: 12,
    borderWidth: 1,
    borderColor: colors.gray[100],
  },
  rowIcon: {
    width: 44,
    height: 44,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  rowInitials: { fontSize: 14, fontWeight: "800" },
  rowInfo: { flex: 1 },
  rowName: { fontSize: 14, fontWeight: "800", color: colors.gray[900] },
  rowMeta: { fontSize: 12, color: colors.gray[400], marginTop: 2 },
  rowRight: { alignItems: "flex-end", gap: 8 },
  activeBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
  },
  activeDot: { width: 6, height: 6, borderRadius: 3 },
  activeText: { fontSize: 11, fontWeight: "700" },
  rowActions: { flexDirection: "row", gap: 4 },
  actionBtn: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: colors.gray[50],
    alignItems: "center",
    justifyContent: "center",
  },
  empty: { alignItems: "center", paddingTop: 60, gap: 10 },
  emptyText: { fontSize: 14, color: colors.gray[400] },
  pagination: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
    paddingVertical: 12,
  },
  pageBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: colors.bytecode[100],
    alignItems: "center",
    justifyContent: "center",
  },
  pageBtnOff: { opacity: 0.4 },
  pageLabel: { fontSize: 13, fontWeight: "600", color: colors.gray[600] },
});
