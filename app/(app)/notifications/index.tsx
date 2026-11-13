// app/(app)/notifications/index.tsx

import React, { useState } from "react";
import {
  View,
  Text,
  SectionList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Feather from "@expo/vector-icons/Feather";
import {
  listNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  deleteNotification,
  clearAllNotifications,
} from "@/lib/api/notification.api";
import { notificationRoute } from "@/lib/notifications";
import { getApiErrorMessage } from "@/lib/api-error";
import { useAuthStore } from "@/store/auth.store";
import { colors } from "@/components/ui/theme";
import { PageHeader } from "@/components/ui/PageHeader";
import type { AppNotification, NotificationType } from "@/types/notification";

type IconName = React.ComponentProps<typeof Feather>["name"];

const FB_BLUE = "#1877F2";

const TYPE_STYLE: Record<NotificationType, { icon: IconName; color: string }> =
  {
    leave_request_submitted: { icon: "send", color: "#F59E0B" },
    leave_request_cancelled: { icon: "x", color: "#EF4444" },
    leave_request_reviewed: { icon: "check", color: "#22C55E" },
    leave_marked_by_admin: { icon: "sun", color: "#F97316" },
    holiday_created: { icon: "calendar", color: "#8B5CF6" },
    holiday_updated: { icon: "calendar", color: "#8B5CF6" },
    holiday_removed: { icon: "calendar", color: "#8B5CF6" },
    attendance_marked: { icon: "clock", color: "#0EA5E9" },
    attendance_updated: { icon: "clock", color: "#0EA5E9" },
    attendance_removed: { icon: "clock", color: "#0EA5E9" },
    announcement: { icon: "volume-2", color: FB_BLUE },
  };

function timeAgo(iso: string) {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d`;
  if (days < 30) return `${Math.floor(days / 7)}w`;
  return new Date(iso).toLocaleDateString("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function NotificationsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const qc = useQueryClient();
  const isAdmin = useAuthStore((st) => st.user?.role === "admin");
  const [unreadOnly, setUnreadOnly] = useState(false);

  const {
    data,
    isLoading,
    isRefetching,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ["notifications", unreadOnly],
    queryFn: ({ pageParam }) => listNotifications(pageParam, 10, unreadOnly),
    initialPageParam: 1,
    getNextPageParam: (last) =>
      last.meta.currentPage < last.meta.totalPages
        ? last.meta.currentPage + 1
        : undefined,
  });

  const items = data?.pages.flatMap((p) => p.data) ?? [];
  const hasUnread = items.some((n) => !n.readAt);

  const unreadItems = items.filter((n) => !n.readAt);
  const readItems = items.filter((n) => n.readAt);
  const sections = [
    ...(unreadItems.length ? [{ title: "New", data: unreadItems }] : []),
    ...(readItems.length ? [{ title: "Earlier", data: readItems }] : []),
  ];

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["notifications"] });
    qc.invalidateQueries({ queryKey: ["notifications-unread"] });
  };

  const readMut = useMutation({
    mutationFn: markNotificationRead,
    onSuccess: refresh,
  });
  const readAllMut = useMutation({
    mutationFn: markAllNotificationsRead,
    onSuccess: refresh,
    onError: (e) => Alert.alert("Error", getApiErrorMessage(e)),
  });
  const deleteMut = useMutation({
    mutationFn: deleteNotification,
    onSuccess: refresh,
    onError: (e) => Alert.alert("Error", getApiErrorMessage(e)),
  });
  const clearMut = useMutation({
    mutationFn: clearAllNotifications,
    onSuccess: refresh,
    onError: (e) => Alert.alert("Error", getApiErrorMessage(e)),
  });

  const confirmClear = () =>
    Alert.alert(
      "Clear all notifications",
      "This permanently deletes every notification.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear all",
          style: "destructive",
          onPress: () => clearMut.mutate(),
        },
      ],
    );

  const open = (n: AppNotification) => {
    if (!n.readAt) readMut.mutate(n.id);
    const route = notificationRoute(n.type, n.data, isAdmin);
    if (route) router.push(route as Parameters<typeof router.push>[0]);
  };

  const showActions = (n: AppNotification) =>
    Alert.alert(n.title, undefined, [
      ...(!n.readAt
        ? [{ text: "Mark as read", onPress: () => readMut.mutate(n.id) }]
        : []),
      {
        text: "Remove this notification",
        style: "destructive" as const,
        onPress: () => deleteMut.mutate(n.id),
      },
      { text: "Cancel", style: "cancel" as const },
    ]);

  return (
    <View style={s.root}>
      <PageHeader
        title="Notifications"
        variant="bytecode"
        insetTop
        rightActions={[
          ...(hasUnread
            ? [
                {
                  icon: "check-circle" as const,
                  onPress: () => readAllMut.mutate(),
                },
              ]
            : []),
          ...(items.length
            ? [{ icon: "trash-2" as const, onPress: confirmClear }]
            : []),
        ]}
      />

      <View style={s.pills}>
        {[
          { label: "All", value: false },
          { label: "Unread", value: true },
        ].map((p) => {
          const on = unreadOnly === p.value;
          return (
            <TouchableOpacity
              key={p.label}
              style={[s.pill, on && s.pillOn]}
              onPress={() => setUnreadOnly(p.value)}
              activeOpacity={0.8}
            >
              <Text style={[s.pillText, on && s.pillTextOn]}>{p.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {isLoading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={FB_BLUE} />
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(n) => String(n.id)}
          stickySectionHeadersEnabled={false}
          contentContainerStyle={{ paddingBottom: insets.bottom + 10 }}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={refetch} />
          }
          renderSectionHeader={({ section }) => (
            <Text style={s.sectionTitle}>{section.title}</Text>
          )}
          ListEmptyComponent={
            <View style={s.empty}>
              <Feather name="bell-off" size={40} color={colors.gray[300]} />
              <Text style={s.emptyTitle}>
                {unreadOnly ? "You're all caught up" : "No notifications yet"}
              </Text>
              <Text style={s.emptyText}>
                {unreadOnly
                  ? "No unread notifications."
                  : "Leave updates, holidays and announcements will show up here."}
              </Text>
            </View>
          }
          ListFooterComponent={
            hasNextPage ? (
              <TouchableOpacity
                style={s.seeMore}
                onPress={() => fetchNextPage()}
                disabled={isFetchingNextPage}
                activeOpacity={0.8}
              >
                {isFetchingNextPage ? (
                  <ActivityIndicator color={FB_BLUE} />
                ) : (
                  <Text style={s.seeMoreText}>See previous notifications</Text>
                )}
              </TouchableOpacity>
            ) : null
          }
          renderItem={({ item: n }) => {
            const unread = !n.readAt;
            const t = TYPE_STYLE[n.type] ?? { icon: "bell", color: FB_BLUE };
            return (
              <TouchableOpacity
                style={[s.row, unread && s.rowUnread]}
                activeOpacity={0.7}
                onPress={() => open(n)}
                onLongPress={() => showActions(n)}
              >
                <View>
                  <View style={[s.avatar, { backgroundColor: t.color }]}>
                    <Feather name={t.icon} size={26} color="#fff" />
                  </View>
                  <View style={[s.badge, { backgroundColor: t.color }]}>
                    <Feather name="bell" size={10} color="#fff" />
                  </View>
                </View>

                <View style={s.text}>
                  <Text style={s.body} numberOfLines={4}>
                    <Text style={s.bold}>{n.title}</Text>
                    {"  "}
                    {n.body}
                  </Text>
                  <Text style={[s.time, unread && s.timeUnread]}>
                    {timeAgo(n.createdAt)}
                  </Text>
                </View>

                {unread ? (
                  <View style={s.dot} />
                ) : (
                  <TouchableOpacity
                    hitSlop={10}
                    onPress={() => showActions(n)}
                    style={s.more}
                  >
                    <Feather
                      name="more-horizontal"
                      size={18}
                      color={colors.gray[400]}
                    />
                  </TouchableOpacity>
                )}
              </TouchableOpacity>
            );
          }}
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#fff" },
  pills: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  pill: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: "#E4E6EB",
  },
  pillOn: { backgroundColor: "#E7F3FF" },
  pillText: { fontSize: 14, fontWeight: "600", color: "#050505" },
  pillTextOn: { color: FB_BLUE },
  sectionTitle: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 4,
    fontSize: 17,
    fontWeight: "700",
    color: "#050505",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  rowUnread: { backgroundColor: "#EBF5FF" },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  badge: {
    position: "absolute",
    right: -2,
    bottom: -2,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#fff",
  },
  text: { flex: 1 },
  body: { fontSize: 15, lineHeight: 20, color: "#050505" },
  bold: { fontWeight: "700" },
  time: { marginTop: 2, fontSize: 13, color: "#65676B" },
  timeUnread: { color: FB_BLUE, fontWeight: "600" },
  dot: { width: 12, height: 12, borderRadius: 6, backgroundColor: FB_BLUE },
  more: { padding: 4 },
  seeMore: {
    margin: 16,
    height: 40,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#E4E6EB",
  },
  seeMoreText: { fontSize: 15, fontWeight: "600", color: "#050505" },
  empty: {
    alignItems: "center",
    paddingTop: 80,
    gap: 8,
    paddingHorizontal: 32,
  },
  emptyTitle: { fontSize: 17, fontWeight: "700", color: "#050505" },
  emptyText: { fontSize: 14, textAlign: "center", color: "#65676B" },
});
