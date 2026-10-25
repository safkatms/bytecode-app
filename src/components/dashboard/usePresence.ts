import { useOfficeGeofence } from "@/components/attendance/useOfficeGeofence";

export type PresenceStatus = "at_office" | "away" | "no_location" | "checking";

/** Coarse "am I at the office right now" read, for dashboard badges. */
export function usePresence(): PresenceStatus {
  const { locState, office, isWithinRadius } = useOfficeGeofence();

  if (!office) return "no_location";
  if (locState.status === "loading") return "checking";
  if (locState.status === "denied") return "away";
  return isWithinRadius ? "at_office" : "away";
}
