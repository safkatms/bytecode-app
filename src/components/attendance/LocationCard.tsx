import React from "react";
import { View, Text, StyleSheet, ActivityIndicator } from "react-native";
import Feather from "@expo/vector-icons/Feather";
import { colors } from "@/components/ui/theme";
import type { LocationState } from "./useOfficeGeofence";
import type { OfficeLocation } from "@/types/attendance";

/**
 * Big status card: resolves permission/position state into one tinted panel.
 * `isWithinRadius` is null when the office radius isn't known — the card then
 * just confirms the position was captured.
 */
export function LocationCard({
  locState,
  office,
  distance,
  isWithinRadius,
  readyTitle,
  readyIcon = "map-pin",
  deniedHint,
}: {
  locState: LocationState;
  office?: OfficeLocation | null;
  distance: number | null;
  isWithinRadius: boolean | null;
  readyTitle?: string;
  readyIcon?: React.ComponentProps<typeof Feather>["name"];
  deniedHint: string;
}) {
  const tone =
    locState.status === "loading"
      ? {
          bg: colors.gray[50],
          wave: colors.gray[100],
          tile: colors.gray[100],
          icon: colors.gray[400],
        }
      : locState.status === "denied"
        ? {
            bg: colors.red[50],
            wave: colors.red[100],
            tile: colors.red[100],
            icon: colors.red[500],
          }
        : isWithinRadius === false
          ? {
              bg: colors.amber[50],
              wave: colors.amber[100],
              tile: colors.amber[100],
              icon: colors.amber[600],
            }
          : {
              bg: colors.bytecode[50],
              wave: colors.bytecode[100],
              tile: colors.bytecode[100],
              icon: colors.bytecode[600],
            };

  const title =
    locState.status === "loading"
      ? "Getting your location…"
      : locState.status === "denied"
        ? "Location permission denied"
        : isWithinRadius === true
          ? "You are at the office"
          : isWithinRadius === false
            ? "You are outside the office"
            : (readyTitle ?? "Location captured");

  return (
    <View style={[s.card, { backgroundColor: tone.bg }]}>
      <View style={[s.wave, { backgroundColor: tone.wave }]} />

      <View style={[s.tile, { backgroundColor: tone.tile }]}>
        {locState.status === "loading" ? (
          <ActivityIndicator color={tone.icon} />
        ) : (
          <Feather
            name={locState.status === "denied" ? "slash" : readyIcon}
            size={30}
            color={tone.icon}
          />
        )}
      </View>

      <Text style={s.title}>{title}</Text>

      {locState.status === "denied" && <Text style={s.sub}>{deniedHint}</Text>}

      {locState.status === "ready" && (
        <>
          <Text style={s.coords}>
            {locState.lat.toFixed(5)}, {locState.lng.toFixed(5)}
          </Text>
          {distance != null && office && (
            <View style={s.badge}>
              <Feather name="disc" size={12} color={tone.icon} />
              <Text style={[s.badgeText, { color: tone.icon }]}>
                {distance}m away · radius {office.radiusMeters}m
              </Text>
            </View>
          )}
        </>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  card: {
    borderRadius: 22,
    paddingVertical: 26,
    paddingHorizontal: 20,
    alignItems: "center",
    gap: 9,
    overflow: "hidden",
    position: "relative",
  },
  wave: {
    position: "absolute",
    width: 320,
    height: 320,
    borderRadius: 160,
    bottom: -258,
    left: -60,
    opacity: 0.7,
  },
  tile: {
    width: 72,
    height: 72,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  title: {
    fontSize: 18,
    fontWeight: "800",
    color: colors.gray[900],
    textAlign: "center",
  },
  sub: {
    fontSize: 13,
    color: colors.gray[500],
    textAlign: "center",
    lineHeight: 19,
  },
  coords: { fontSize: 12, color: colors.gray[500], fontFamily: "monospace" },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(255,255,255,0.75)",
    borderRadius: 20,
    paddingHorizontal: 13,
    paddingVertical: 7,
    marginTop: 2,
  },
  badgeText: { fontSize: 12, fontWeight: "700" },
});
