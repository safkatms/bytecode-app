// app/(app)/settings/about.tsx

import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  Linking,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Feather from "@expo/vector-icons/Feather";
import Constants from "expo-constants";
import * as Application from "expo-application";

import { PageHeader } from "@/components/ui/PageHeader";
import { colors } from "@/components/ui/theme";

const appVersion = Constants.expoConfig?.version ?? "—";
const buildNumber = Application.nativeBuildVersion;

type LinkItem = {
  icon: React.ComponentProps<typeof Feather>["name"];
  label: string;
  value?: string;
  onPress?: () => void;
};

function InfoRow({ item }: { item: LinkItem }) {
  const Wrapper = item.onPress ? TouchableOpacity : View;
  return (
    <Wrapper style={s.row} onPress={item.onPress} activeOpacity={0.7}>
      <View style={s.rowIcon}>
        <Feather name={item.icon} size={16} color={colors.bytecode[600]} />
      </View>
      <Text style={s.rowLabel}>{item.label}</Text>
      {item.value && <Text style={s.rowValue}>{item.value}</Text>}
      {item.onPress && (
        <Feather name="chevron-right" size={16} color={colors.gray[300]} />
      )}
    </Wrapper>
  );
}

export default function AboutScreen() {
  const insets = useSafeAreaInsets();

  const infoItems: LinkItem[] = [
    { icon: "tag", label: "Version", value: appVersion },
    { icon: "hash", label: "Build", value: String(buildNumber ?? "—") },
  ];

  const linkItems: LinkItem[] = [
    {
      icon: "mail",
      label: "Contact support",
      onPress: () => Linking.openURL("mailto:safkatmahmudsakib@gmail.com"),
    },
  ];

  return (
    <View style={s.root}>
      <PageHeader title="About" variant="bytecode" insetTop />

      <ScrollView
        contentContainerStyle={[
          s.content,
          { paddingBottom: insets.bottom + 32 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={s.hero}>
          <Image
            source={require("../../../assets/bytecode.png")}
            style={s.heroIcon}
            resizeMode="contain"
          />
          <Text style={s.heroName}>ByteCode App</Text>
          <Text style={s.heroTagline}>Attendance & leave management</Text>
        </View>

        <View style={s.card}>
          {infoItems.map((item, index) => (
            <React.Fragment key={item.label}>
              <InfoRow item={item} />
              {index < infoItems.length - 1 && <View style={s.separator} />}
            </React.Fragment>
          ))}
        </View>

        <View style={s.card}>
          {linkItems.map((item, index) => (
            <React.Fragment key={item.label}>
              <InfoRow item={item} />
              {index < linkItems.length - 1 && <View style={s.separator} />}
            </React.Fragment>
          ))}
        </View>

        <Text style={s.footer}>
          © {new Date().getFullYear()} ByteCode. All rights reserved.
        </Text>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.gray[50] },
  content: { padding: 16, gap: 14 },

  hero: { alignItems: "center", paddingVertical: 20, gap: 6 },
  heroIcon: { width: 72, height: 72, borderRadius: 18 },
  heroName: {
    fontSize: 18,
    fontWeight: "800",
    color: colors.gray[900],
    marginTop: 6,
  },
  heroTagline: { fontSize: 13, color: colors.gray[400] },

  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.gray[100],
    overflow: "hidden",
  },
  separator: {
    height: 1,
    backgroundColor: colors.gray[100],
    marginHorizontal: 14,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 13,
    gap: 12,
  },
  rowIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: colors.bytecode[50],
    alignItems: "center",
    justifyContent: "center",
  },
  rowLabel: {
    flex: 1,
    fontSize: 14,
    fontWeight: "700",
    color: colors.gray[900],
  },
  rowValue: { fontSize: 13, color: colors.gray[400] },

  footer: {
    textAlign: "center",
    fontSize: 11,
    color: colors.gray[300],
    marginTop: 8,
  },
});
