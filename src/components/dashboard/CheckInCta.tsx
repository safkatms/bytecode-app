import React from "react";
import { GradientCta } from "./GradientCta";

export function CheckInCta({
  variant,
  onPress,
}: {
  variant: "in" | "out";
  onPress: () => void;
}) {
  const isIn = variant === "in";
  return (
    <GradientCta
      icon={isIn ? "map-pin" : "log-out"}
      title={isIn ? "Check in now" : "Check out"}
      subtitle={
        isIn
          ? "Verify your location and start your workday"
          : "End your workday and log your hours"
      }
      tone={isIn ? "blue" : "red"}
      onPress={onPress}
    />
  );
}
