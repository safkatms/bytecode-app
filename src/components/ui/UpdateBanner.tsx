import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Linking,
  Modal,
  ScrollView,
  Platform,
} from "react-native";
import { useQuery } from "@tanstack/react-query";
import Feather from "@expo/vector-icons/Feather";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { checkForUpdate } from "@/lib/api/update.api";
import { colors } from "@/components/ui/theme";

export function UpdateBanner() {
  const [detailsVisible, setDetailsVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const insets = useSafeAreaInsets();

  const { data } = useQuery({
    queryKey: ["app-update"],
    queryFn: checkForUpdate,
    staleTime: 1000 * 60 * 60,
    retry: false,
  });

  if (!data?.hasUpdate || dismissed) return null;

  return (
    <>
      <TouchableOpacity
        style={s.banner}
        onPress={() => setDetailsVisible(true)}
        activeOpacity={0.85}
      >
        <View style={s.bannerLeft}>
          <View style={s.iconWrap}>
            <Feather
              name="download-cloud"
              size={16}
              color={colors.bytecode[700]}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.bannerTitle}>Update available</Text>
            <Text style={s.bannerSub}>
              v{data.currentVersion} → v{data.latestVersion} · Tap to view
            </Text>
          </View>
        </View>
        <TouchableOpacity
          onPress={() => setDismissed(true)}
          hitSlop={8}
          style={s.dismissBtn}
        >
          <Feather name="x" size={14} color={colors.bytecode[600]} />
        </TouchableOpacity>
      </TouchableOpacity>

      <Modal
        visible={detailsVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setDetailsVisible(false)}
      >
        <TouchableOpacity
          style={s.overlay}
          activeOpacity={1}
          onPress={() => setDetailsVisible(false)}
        />
        <View style={[s.sheet, { paddingBottom: insets.bottom + 20 }]}>
          <View style={s.handle} />

          <View style={s.sheetHeader}>
            <View style={s.sheetIconWrap}>
              <Feather
                name="download-cloud"
                size={26}
                color={colors.bytecode[600]}
              />
            </View>
            <View style={s.sheetTitles}>
              <Text style={s.sheetTitle}>Update available</Text>
              <Text style={s.sheetSub}>
                v{data.currentVersion} → v{data.latestVersion}
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => setDetailsVisible(false)}
              hitSlop={8}
            >
              <View style={s.closeBtn}>
                <Feather name="x" size={15} color={colors.bytecode[700]} />
              </View>
            </TouchableOpacity>
          </View>

          {data.releaseNotes ? (
            <>
              <Text style={s.notesLabel}>WHAT'S NEW</Text>
              <ScrollView
                style={s.notesScroll}
                showsVerticalScrollIndicator={false}
              >
                <Text style={s.notesText}>{data.releaseNotes}</Text>
              </ScrollView>
            </>
          ) : null}

          {/* Primary — direct APK download (an APK can't be installed on iOS) */}
          {data.apkUrl && Platform.OS === "android" && (
            <TouchableOpacity
              style={s.updateBtn}
              onPress={() => Linking.openURL(data.apkUrl!)}
            >
              <Feather name="download" size={16} color="#fff" />
              <Text style={s.updateBtnText}>
                Download v{data.latestVersion}
              </Text>
            </TouchableOpacity>
          )}

          {/* App store page — primary on iOS, secondary on Android */}
          <TouchableOpacity
            style={
              Platform.OS === "android" && data.apkUrl ? s.storeBtn : s.updateBtn
            }
            onPress={() => Linking.openURL(data.releaseUrl)}
          >
            <Feather
              name="external-link"
              size={14}
              color={
                Platform.OS === "android" && data.apkUrl
                  ? colors.bytecode[700]
                  : "#fff"
              }
            />
            <Text
              style={
                Platform.OS === "android" && data.apkUrl
                  ? s.storeBtnText
                  : s.updateBtnText
              }
            >
              Open app store
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={s.laterBtn}
            onPress={() => {
              setDetailsVisible(false);
              setDismissed(true);
            }}
          >
            <Text style={s.laterBtnText}>Remind me later</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </>
  );
}

const s = StyleSheet.create({
  banner: {
    marginHorizontal: 16,
    marginTop: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    backgroundColor: colors.bytecode[50],
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: colors.bytecode[100],
    paddingHorizontal: 13,
    paddingVertical: 11,
  },
  bannerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: 11,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.bytecode[100],
  },
  bannerTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: colors.bytecode[800],
  },
  bannerSub: {
    fontSize: 11,
    color: colors.bytecode[600],
    marginTop: 1,
  },
  dismissBtn: {
    width: 28,
    height: 28,
    borderRadius: 9,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.bytecode[100],
  },

  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  sheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 20,
    maxHeight: "75%",
    gap: 10,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.gray[200],
    alignSelf: "center",
    marginBottom: 6,
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 6,
  },
  sheetIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 17,
    backgroundColor: colors.bytecode[50],
    borderWidth: 1.5,
    borderColor: colors.bytecode[100],
    alignItems: "center",
    justifyContent: "center",
  },
  sheetTitles: { flex: 1 },
  sheetTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: colors.gray[900],
  },
  sheetSub: {
    fontSize: 13,
    color: colors.gray[400],
    marginTop: 2,
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 11,
    backgroundColor: colors.bytecode[50],
    alignItems: "center",
    justifyContent: "center",
  },

  notesLabel: {
    fontSize: 10,
    fontWeight: "800",
    color: colors.gray[400],
    letterSpacing: 1.2,
  },
  notesScroll: {
    maxHeight: 180,
    backgroundColor: colors.gray[50],
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.gray[100],
    padding: 12,
  },
  notesText: {
    fontSize: 13,
    color: colors.gray[700],
    lineHeight: 20,
  },

  updateBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: colors.bytecode[600],
    borderRadius: 16,
    paddingVertical: 14,
  },
  updateBtnText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#fff",
  },
  storeBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: colors.bytecode[50],
    borderRadius: 16,
    paddingVertical: 13,
    borderWidth: 1.5,
    borderColor: colors.bytecode[100],
  },
  storeBtnText: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.bytecode[700],
  },
  laterBtn: {
    alignItems: "center",
    paddingVertical: 4,
  },
  laterBtnText: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.gray[400],
  },
});
