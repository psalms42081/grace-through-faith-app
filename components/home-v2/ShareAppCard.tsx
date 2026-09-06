import React from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Image,
  Platform,
  Share,
} from "react-native";
import { HV2, F } from "./theme";
import { HOME_SHARE_MESSAGE } from "@/lib/home-share-app";
import { useToast } from "@/contexts/ToastContext";

interface Props {
  onDismiss: () => void;
}

export default function ShareAppCard({ onDismiss }: Props) {
  const { showToast } = useToast();

  const shareNow = async () => {
    const message = HOME_SHARE_MESSAGE;
    try {
      if (Platform.OS === "web") {
        if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
          await navigator.share({ text: message });
          return;
        }
        if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
          await navigator.clipboard.writeText(message);
          showToast("Link copied", "success");
          return;
        }
      }
      await Share.share({ message });
    } catch {
      // User cancelled the sheet — do not toast.
    }
  };

  return (
    <View style={s.section} testID="home-share-app-card">
      <View style={s.card}>
        <View style={s.top}>
          <View style={s.disc}>
            <Image
              source={require("@/assets/illustrations/plan-family.png")}
              style={s.discImg}
              resizeMode="contain"
              accessible={false}
            />
          </View>
          <View style={s.copy}>
            <Text style={s.title}>Share Informed Ministries</Text>
            <Text style={s.body}>
              Know someone who'd value a quiet daily time with Scripture? Send them the app.
            </Text>
          </View>
        </View>
        <View style={s.actions}>
          <Pressable
            onPress={shareNow}
            accessibilityRole="button"
            accessibilityLabel="Share now"
            testID="home-share-now"
          >
            <Text style={s.share}>Share now</Text>
          </Pressable>
          <Pressable
            onPress={onDismiss}
            accessibilityRole="button"
            accessibilityLabel="Dismiss"
            testID="home-share-dismiss"
          >
            <Text style={s.dismiss}>Dismiss</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  section: { paddingHorizontal: 20, marginTop: 28 },
  card: {
    backgroundColor: HV2.surfaceCard,
    borderRadius: 16,
    padding: 16,
    ...HV2.rowShadow,
  },
  top: { flexDirection: "row", alignItems: "flex-start", gap: 14 },
  disc: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#FFF0D9",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  discImg: { width: 28, height: 28 },
  copy: { flex: 1 },
  title: { fontFamily: F.interSemi, fontSize: 15, color: HV2.ink },
  body: {
    fontFamily: F.inter,
    fontSize: 13,
    lineHeight: 19,
    color: HV2.inkMutedText,
    marginTop: 4,
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 14,
  },
  share: { fontFamily: F.interSemi, fontSize: 14, color: HV2.coralInk },
  dismiss: { fontFamily: F.interMed, fontSize: 14, color: HV2.inkMutedText },
});
