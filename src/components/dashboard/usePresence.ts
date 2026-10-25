import { useEffect, useState } from "react";
import * as Location from "expo-location";
import { useQuery } from "@tanstack/react-query";
import { getOfficeLocation } from "@/lib/api/location.api";

export type PresenceStatus = "at_office" | "away" | "no_location" | "checking";

function haversineMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function usePresence(): PresenceStatus {
  const { data: office } = useQuery({
    queryKey: ["office-location"],
    queryFn: getOfficeLocation,
    staleTime: 5 * 60 * 1000,
  });

  const [presence, setPresence] = useState<PresenceStatus>("checking");

  useEffect(() => {
    if (!office) {
      setPresence("no_location");
      return;
    }
    let cancelled = false;
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        if (!cancelled) setPresence("away");
        return;
      }
      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      if (cancelled) return;
      const dist = haversineMeters(
        pos.coords.latitude,
        pos.coords.longitude,
        Number(office.latitude),
        Number(office.longitude),
      );
      setPresence(dist <= office.radiusMeters ? "at_office" : "away");
    })();
    return () => {
      cancelled = true;
    };
  }, [office]);

  return presence;
}
