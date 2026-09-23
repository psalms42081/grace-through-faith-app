import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Platform,
  Linking,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import { PathB } from "@/constants/colors";
import { HV2 } from "@/components/home-v2/theme";
import { useKidsMode } from "@/context/KidsModeContext";
import { givingBankRows, givingOnlineUrl, type GivingBankRow } from "@/lib/giving";

const C = {
  surface: PathB.surface,
  card: PathB.surfaceCard,
  ink: PathB.ink,
  muted: HV2.inkMutedText,
  coral: PathB.coral,
  border: "#E8DCC8",
};

function openSystemBrowser(url: string) {
  if (Platform.OS === "web" && typeof window !== "undefined") {
    window.open(url, "_blank", "noopener,noreferrer");
    return;
  }
  Linking.openURL(url).catch(() => {});
}

export default function GivingScreen() {
  const insets = useSafeAreaInsets();
  const { isKidsMode } = useKidsMode();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;
  const [copiedId, setCopiedId] = useState<GivingBankRow["id"] | null>(null);
  const onlineUrl = givingOnlineUrl();
  const bankRows = givingBankRows();

  useEffect(() => {
    if (isKidsMode) router.replace("/(tabs)/profile" as never);
  }, [isKidsMode]);

  if (isKidsMode) return null;

  const copyRow = async (row: GivingBankRow) => {
    await Clipboard.setStringAsync(row.value);
    setCopiedId(row.id);
  };

  return (
    <View style={[s.page, { backgroundColor: C.surface }]}>
      <ScrollView
        contentContainerStyle={{
          paddingTop: topPad + 8,
          paddingBottom: bottomPad + 32,
          paddingHorizontal: 20,
        }}
        showsVerticalScrollIndicator={false}
      >
        <Pressable
          onPress={() => router.back()}
          hitSlop={12}
          style={s.back}
          accessibilityLabel="Back"
          testID="giving-back"
        >
          <Ionicons name="arrow-back" size={22} color={C.ink} />
        </Pressable>
        <Text style={s.heading} testID="giving-heading">
          Support Informed Ministries
        </Text>
        <Text style={s.body}>
          Informed Ministries is independent and free to use. Gifts cover the app's hosting and content and help keep it that way.
        </Text>
        <Text style={s.muted}>Gifts are not tax-deductible.</Text>

        {onlineUrl ? (
          <View style={s.card} testID="giving-online-card">
            <Text style={s.cardTitle}>Give online</Text>
            <Pressable
              onPress={() => openSystemBrowser(onlineUrl)}
              style={s.giveBtn}
              testID="giving-online-button"
              accessibilityRole="button"
              accessibilityLabel="Give"
            >
              <Text style={s.giveBtnText}>Give</Text>
            </Pressable>
            <Text style={s.muted}>
              Payments are handled by Stripe on Informed Ministries' behalf.
            </Text>
          </View>
        ) : null}

        {bankRows.length > 0 ? (
          <View style={s.card} testID="giving-bank-card">
            <Text style={s.cardTitle}>Bank transfer</Text>
            {bankRows.map((row) => (
              <View key={row.id} style={s.row}>
                <View style={s.rowText}>
                  <Text style={s.rowLabel}>{row.label}</Text>
                  <Text style={s.rowValue} testID={`giving-value-${row.id}`}>
                    {row.value}
                  </Text>
                </View>
                <Pressable
                  onPress={() => void copyRow(row)}
                  hitSlop={8}
                  accessibilityLabel={`Copy ${row.label}`}
                  testID={`giving-copy-${row.id}`}
                  style={s.copyBtn}
                >
                  {copiedId === row.id ? (
                    <Text style={s.copied}>Copied</Text>
                  ) : (
                    <Ionicons name="copy-outline" size={18} color={C.ink} />
                  )}
                </Pressable>
              </View>
            ))}
            <Text style={[s.muted, s.reference]}>
              Please use 'App gift' as the reference.
            </Text>
          </View>
        ) : null}

        {!onlineUrl && bankRows.length === 0 ? (
          <View style={s.emptyCard} testID="giving-empty">
            <Text style={s.body}>Giving isn't set up yet.</Text>
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  page: { flex: 1 },
  back: { alignSelf: "flex-start", marginBottom: 12 },
  heading: {
    color: C.ink,
    fontFamily: "Lora_700Bold",
    fontSize: 28,
    lineHeight: 34,
    marginBottom: 12,
  },
  body: {
    color: C.ink,
    fontFamily: "Inter_400Regular",
    fontSize: 16,
    lineHeight: 24,
  },
  muted: {
    color: C.muted,
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    lineHeight: 18,
    marginTop: 10,
  },
  card: {
    backgroundColor: C.card,
    borderRadius: 16,
    padding: 16,
    marginTop: 16,
    borderWidth: 1,
    borderColor: C.border,
  },
  cardTitle: {
    color: C.ink,
    fontFamily: "Inter_600SemiBold",
    fontSize: 17,
    marginBottom: 12,
  },
  giveBtn: {
    backgroundColor: C.coral,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  giveBtnText: {
    color: "#fff",
    fontFamily: "Inter_600SemiBold",
    fontSize: 16,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: C.border,
    gap: 12,
  },
  rowText: { flex: 1 },
  rowLabel: {
    color: C.muted,
    fontFamily: "Inter_400Regular",
    fontSize: 12,
  },
  rowValue: {
    color: C.ink,
    fontFamily: "Inter_500Medium",
    fontSize: 16,
    marginTop: 2,
  },
  copyBtn: {
    minWidth: 36,
    alignItems: "flex-end",
    justifyContent: "center",
  },
  copied: {
    color: C.coral,
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
  },
  reference: { marginTop: 12 },
  emptyCard: {
    backgroundColor: C.surface,
    borderRadius: 16,
    padding: 16,
    marginTop: 20,
    borderWidth: 1,
    borderColor: C.border,
  },
});
