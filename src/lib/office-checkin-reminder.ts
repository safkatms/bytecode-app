import * as Location from "expo-location";
import * as TaskManager from "expo-task-manager";
import * as Notifications from "expo-notifications";
import * as SecureStore from "expo-secure-store";
import { getTodayStatus } from "@/lib/api/attendance-employee.api";
import { getOfficeLocation } from "@/lib/api/location.api";
import { OFFICE_REMINDER_CHANNEL } from "@/lib/notifications";

export const GEOFENCE_TASK = "office-arrival-geofence";

const NOTIFY_HOUR = 10;
const COOLDOWN_MS = 30 * 60 * 1000;

const LAST_NOTIFIED_KEY = "office_reminder_last_notified_at";
const PENDING_NOTIFICATION_KEY = "office_reminder_pending_id";

const SKIP_STATUSES = new Set([
  "weekend",
  "holiday",
  "sick_leave",
  "casual_leave",
]);

const CHECK_IN_CONTENT = {
  title: "You're at the office",
  body: "Tap to check in.",
  data: { screen: "/attendance/check-in" },
  channelId: OFFICE_REMINDER_CHANNEL,
};

function tenAmToday() {
  const d = new Date();
  d.setHours(NOTIFY_HOUR, 0, 0, 0);
  return d;
}

async function withinCooldown() {
  const raw = await SecureStore.getItemAsync(LAST_NOTIFIED_KEY);
  if (!raw) return false;
  return Date.now() - Number(raw) < COOLDOWN_MS;
}

async function fireArrivalNotification() {
  await SecureStore.setItemAsync(LAST_NOTIFIED_KEY, String(Date.now()));
  await Notifications.scheduleNotificationAsync({
    content: CHECK_IN_CONTENT,
    trigger: null,
  });
}

export async function cancelPendingArrivalNotification() {
  const id = await SecureStore.getItemAsync(PENDING_NOTIFICATION_KEY);
  if (id) {
    await Notifications.cancelScheduledNotificationAsync(id).catch(() => {});
    await SecureStore.deleteItemAsync(PENDING_NOTIFICATION_KEY);
  }
}

async function scheduleTenAmNotification() {
  await cancelPendingArrivalNotification();
  const id = await Notifications.scheduleNotificationAsync({
    content: CHECK_IN_CONTENT,
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: tenAmToday(),
    },
  });
  await SecureStore.setItemAsync(PENDING_NOTIFICATION_KEY, id);
}

/** Runs the same decision the ENTER handler does. Returns what happened, for diagnostics/testing. */
export async function handleArrivalReminder(): Promise<string> {
  const today = await getTodayStatus();
  if (today.checkedIn) return "Skipped: already checked in today.";
  if (today.status && SKIP_STATUSES.has(today.status)) {
    return `Skipped: today's status is "${today.status}".`;
  }
  if (await withinCooldown()) return "Skipped: within the 30-minute cooldown.";

  const nowHour = new Date().getHours();
  if (nowHour >= NOTIFY_HOUR) {
    await fireArrivalNotification();
    return "Fired notification immediately.";
  }
  await scheduleTenAmNotification();
  return `Scheduled for 10:00 (it is currently ${nowHour}:${String(new Date().getMinutes()).padStart(2, "0")}).`;
}

TaskManager.defineTask(GEOFENCE_TASK, async ({ data, error }) => {
  if (error) return;
  const { eventType } = data as { eventType: Location.GeofencingEventType };

  if (eventType === Location.GeofencingEventType.Exit) {
    await cancelPendingArrivalNotification();
    return;
  }

  if (eventType !== Location.GeofencingEventType.Enter) return;

  try {
    await handleArrivalReminder();
  } catch {
    // Background network/auth failure — the next ENTER event will retry.
  }
});

export async function registerOfficeGeofence() {
  const office = await getOfficeLocation();
  if (!office) return;

  const { status } = await Location.requestBackgroundPermissionsAsync();
  if (status !== "granted") return;

  await Location.startGeofencingAsync(GEOFENCE_TASK, [
    {
      identifier: "office",
      latitude: Number(office.latitude),
      longitude: Number(office.longitude),
      radius: office.radiusMeters,
      notifyOnEnter: true,
      notifyOnExit: true,
    },
  ]);
}

export async function unregisterOfficeGeofence() {
  const started = await Location.hasStartedGeofencingAsync(GEOFENCE_TASK);
  if (started) await Location.stopGeofencingAsync(GEOFENCE_TASK);
  await cancelPendingArrivalNotification();
}

export async function getReminderDiagnostics() {
  const office = await getOfficeLocation();
  const bgPermission = await Location.getBackgroundPermissionsAsync();
  const notifPermission = await Notifications.getPermissionsAsync();
  const geofenceStarted = await Location.hasStartedGeofencingAsync(GEOFENCE_TASK);
  const today = await getTodayStatus().catch(() => null);

  return {
    office: office ? `${office.name} (radius ${office.radiusMeters}m)` : "not configured",
    backgroundLocation: bgPermission.status,
    notifications: notifPermission.status,
    geofenceStarted,
    todayStatus: today ? `checkedIn=${today.checkedIn}, status=${today.status ?? "none"}` : "failed to fetch",
  };
}
