import React from "react";
import { Image, Text, View } from "react-native";
import { colors } from "./theme";

export function Avatar({
  uri,
  firstName,
  lastName,
  size = 44,
}: {
  uri?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  size?: number;
}) {
  const box = { width: size, height: size, borderRadius: size / 2 };
  const initials =
    `${firstName?.[0] ?? ""}${lastName?.[0] ?? ""}`.toUpperCase() || "?";

  return (
    <View
      style={[
        box,
        {
          backgroundColor: colors.bytecode[100],
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
        },
      ]}
    >
      {uri ? (
        <Image source={{ uri }} style={box} />
      ) : (
        <Text
          style={{
            fontSize: Math.round(size * 0.34),
            fontWeight: "800",
            color: colors.bytecode[700],
          }}
        >
          {initials}
        </Text>
      )}
    </View>
  );
}
