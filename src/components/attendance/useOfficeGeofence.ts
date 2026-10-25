import { useEffect, useState } from "react";
import * as Location from "expo-location";
import { useQuery } from "@tanstack/react-query";
import { getOfficeLocation } from "@/lib/api/location.api";

export type LocationState =
  | { status: "loading" }
  | { status: "denied" }
  | { status: "ready"; lat: number; lng: number };

function haversineMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
) {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Resolves the device position against the configured office location.
 * `distance` / `isWithinRadius` stay null until both the position and the
 * office record are available.
 */
export function useOfficeGeofence(
  accuracy: Location.Accuracy = Location.Accuracy.Balanced,
) {
  const [locState, setLocState] = useState<LocationState>({
    status: "loading",
  });

  const { data: office } = useQuery({
    queryKey: ["office-location"],
    queryFn: getOfficeLocation,
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        if (!cancelled) setLocState({ status: "denied" });
        return;
      }
      const pos = await Location.getCurrentPositionAsync({ accuracy });
      if (cancelled) return;
      setLocState({
        status: "ready",
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [accuracy]);

  const distance =
    locState.status === "ready" && office
      ? Math.round(
          haversineMeters(
            locState.lat,
            locState.lng,
            Number(office.latitude),
            Number(office.longitude),
          ),
        )
      : null;

  const isWithinRadius =
    distance != null && office ? distance <= office.radiusMeters : null;

  return { locState, office, distance, isWithinRadius };
}
