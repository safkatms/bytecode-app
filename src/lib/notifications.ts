import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { router } from "expo-router";

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

/** Routes a tapped notification to the screen named in its `data.screen` payload. */
export function attachNotificationResponseHandler() {
  return Notifications.addNotificationResponseReceivedListener((response) => {
    const screen = response.notification.request.content.data?.screen as
      | string
      | undefined;
    if (screen) router.push(screen as Parameters<typeof router.push>[0]);
  });
}
