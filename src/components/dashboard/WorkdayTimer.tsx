import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { colors } from "@/components/ui/theme";
import { parseWallClock } from "@/lib/date";

const WORKDAY_HOURS = 9;

function pad(n: number) {
  return String(n).padStart(2, "0");
}

export function WorkdayTimer({ checkInTime }: { checkInTime: string | Date }) {
  const [now, setNow] = React.useState(() => Date.now());
  React.useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const start = (
    typeof checkInTime === "string"
      ? parseWallClock(checkInTime)
      : new Date(checkInTime)
  ).getTime();
  const total = WORKDAY_HOURS * 3600;
  const elapsed = Math.max(0, Math.floor((now - start) / 1000));
  const remaining = Math.max(0, total - elapsed);
  const done = remaining === 0;
  const pct = Math.min(100, (elapsed / total) * 100);
  const h = Math.floor(remaining / 3600);
  const m = Math.floor((remaining % 3600) / 60);
  const s = remaining % 60;

  return (
    <View style={styles.card}>
      <Text style={styles.label}>
        {done ? "Workday complete" : "Time left today"}
      </Text>
      <Text style={styles.time}>
        {done ? "00:00:00" : `${pad(h)}:${pad(m)}:${pad(s)}`}
      </Text>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${pct}%` }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    marginTop: 12,
    padding: 16,
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
  },
  label: { fontSize: 12, fontWeight: "700", color: colors.gray[500] },
  time: {
    fontSize: 36,
    fontWeight: "800",
    color: colors.bytecode[600],
    marginVertical: 6,
    fontVariant: ["tabular-nums"],
  },
  track: {
    alignSelf: "stretch",
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.gray[100],
    overflow: "hidden",
  },
  fill: { height: 8, backgroundColor: colors.bytecode[600] },
});
