import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { router } from "expo-router";
import Constants from "expo-constants";
import * as Device from "expo-device";
import * as SecureStore from "expo-secure-store";
import {
  registerPushToken,
  unregisterPushToken,
} from "@/lib/api/notification.api";
import { queryClient } from "@/lib/query-client";
import type { NotificationType } from "@/types/notification";

export const OFFICE_REMINDER_CHANNEL = "office-reminders";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function ensureNotificationPermissions() {
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync(OFFICE_REMINDER_CHANNEL, {
      name: "Office check-in reminders",
      importance: Notifications.AndroidImportance.HIGH,
    });
  }

  const { status } = await Notifications.getPermissionsAsync();
  if (status !== "granted") {
    await Notifications.requestPermissionsAsync();
  }
}

const PUSH_TOKEN_KEY = "expo_push_token";

/** Registers this device's Expo push token with the API. Safe to call repeatedly. */
export async function registerForPushNotifications() {
  // Push tokens only exist on physical devices
  if (!Device.isDevice) return;

  try {
    const { status } = await Notifications.getPermissionsAsync();
    if (status !== "granted") return;

    const projectId = Constants.expoConfig?.extra?.eas?.projectId as
      | string
      | undefined;
    const { data: token } = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined,
    );

    await registerPushToken({
      token,
      platform: Platform.OS,
      deviceId: Device.modelId ?? undefined,
    });
    await SecureStore.setItemAsync(PUSH_TOKEN_KEY, token);
  } catch (e) {
    // Never block the app on push setup (e.g. no network, Expo unreachable)
    console.warn("Push registration failed", e);
  }
}

/** Detaches this device from the signed-in user. Call before the auth token is cleared. */
export async function unregisterFromPushNotifications() {
  try {
    const token = await SecureStore.getItemAsync(PUSH_TOKEN_KEY);
    if (!token) return;
    await unregisterPushToken(token);
    await SecureStore.deleteItemAsync(PUSH_TOKEN_KEY);
  } catch {
    // best-effort: the API also drops tokens Expo reports as dead
  }
}

/** Where a notification should take the user, based on its type/payload. */
export function notificationRoute(
  type: NotificationType | undefined,
  data: Record<string, unknown> | null | undefined,
  isAdmin: boolean,
): string | null {
  if (typeof data?.screen === "string") return data.screen;

  switch (type) {
    case "leave_request_submitted":
    case "leave_request_cancelled":
      if (!isAdmin) return "/(app)/leave";
      return data?.kind === "sick"
        ? "/(app)/admin/sick-leave"
        : "/(app)/admin/casual-leave";
    case "leave_request_reviewed":
    case "leave_marked_by_admin":
      return "/(app)/leave";
    case "attendance_marked":
    case "attendance_updated":
    case "attendance_removed":
      return "/(app)/attendance";
    case "holiday_created":
    case "holiday_updated":
    case "holiday_removed":
      return isAdmin ? "/(app)/admin/holidays" : null;
    default:
      return null;
  }
}

/** Routes a tapped push notification to the relevant screen. */
export function attachNotificationResponseHandler(isAdmin: boolean) {
  return Notifications.addNotificationResponseReceivedListener((response) => {
    const data = response.notification.request.content.data as
      | (Record<string, unknown> & { type?: NotificationType })
      | undefined;
    const route =
      notificationRoute(data?.type, data, isAdmin) ?? "/(app)/notifications";
    router.push(route as Parameters<typeof router.push>[0]);
  });
}

/** Keeps the bell badge and inbox fresh when a push arrives while the app is open. */
export function attachNotificationReceivedHandler() {
  return Notifications.addNotificationReceivedListener(() => {
    queryClient.invalidateQueries({ queryKey: ["notifications"] });
    queryClient.invalidateQueries({ queryKey: ["notifications-unread"] });
  });
}
