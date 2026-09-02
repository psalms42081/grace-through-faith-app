import React, { useState } from "react";
import { View, Text, Pressable, StyleSheet, Share, ActivityIndicator, Platform } from "react-native";
import { Bookmark, Share2 } from "lucide-react-native";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import { apiRequest } from "@/lib/query-client";
import { confirmWebSafe } from "@/components/WebSafeConfirm";
import { HV2, F } from "./theme";
import {
  assertReflectionReadingAlignment,
  type HomeDaypart,
} from "./home-data";
import { buildHeroShareMessage, type HeroTab } from "./hero-share";

export type { HeroTab };

interface Props {
  activeTab: HeroTab;
  onTabChange: (t: HeroTab) => void;
  verse: { text: string; reference: string };
  bookId?: number;
  chapterNumber?: number;
  userId?: string;
  signpost?: { id: string; title: string; description: string } | null;
  reflection: { thought: string; reference: string };
  reflectionDaypart: HomeDaypart;
  reflectionReadingTarget: {
    reference: string;
    bookName: string;
    bookId?: number;
    chapterNumber: number;
  };
  translation?: string;
  verseLoading?: boolean;
  verseUnavailable?: boolean;
}

const TABS: { key: HeroTab; label: string }[] = [
  { key: "verse", label: "Verse" },
  { key: "signpost", label: "Signpost" },
  { key: "reflection", label: "Reflection" },
];

function showAuthGate() {
  void confirmWebSafe({
    title: "Sign In Required",
    message: "Create a free account to save verses and reflect on God’s Word.",
    confirmLabel: "Sign In",
    cancelLabel: "Not Now",
  }).then((ok) => {
    if (ok) router.push("/(auth)/login");
  });
}

export default function HeroCard({
  activeTab, onTabChange, verse, bookId, chapterNumber, userId, signpost, reflection,
  reflectionDaypart, reflectionReadingTarget, translation, verseLoading, verseUnavailable,
}: Props) {
  const [saved, setSaved] = useState(false);

  const bookName = verse.reference.replace(/\s+\d+.*$/, "");
  assertReflectionReadingAlignment(
    reflection.reference,
    reflectionReadingTarget,
  );
  const readingTarget =
    activeTab === "reflection"
      ? reflectionReadingTarget
      : { bookId, chapterNumber, bookName };

  const handleBookmark = async () => {
    const isGuest = !userId || userId.startsWith("device-");
    if (isGuest) return showAuthGate();
    try {
      await apiRequest("POST", "/api/bookmarks", {
        verseId: verse.reference,
        label: "Verse of the Day",
      });
      setSaved((p) => !p);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      setSaved((p) => !p);
    }
  };

  const handleShare = async () => {
    const origin =
      Platform.OS === "web" && typeof window !== "undefined"
        ? window.location.origin
        : undefined;
    const msg = buildHeroShareMessage({
      tab: activeTab,
      verse,
      signpost,
      reflection,
      origin,
    });
    try {
      await Share.share({ message: msg });
    } catch {}
  };

  const handleRead = () => {
    if (readingTarget.bookId && readingTarget.chapterNumber) {
      const url = translation
        ? `/read/${readingTarget.bookId}/${readingTarget.chapterNumber}?translation=${encodeURIComponent(translation)}`
        : `/read/${readingTarget.bookId}/${readingTarget.chapterNumber}`;
      router.push(url as any);
    }
  };

  return (
    <View style={s.card}>
      <View style={s.tabs}>
        {TABS.map(({ key, label }) => {
          const active = key === activeTab;
          return (
            <Pressable
              key={key}
              onPress={() => onTabChange(key)}
              style={[s.tab, active && s.tabActive]}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
            >
              <Text style={[s.tabLabel, active && s.tabLabelActive]}>{label}</Text>
            </Pressable>
          );
        })}
      </View>

      {activeTab === "verse" && (
        <View style={s.body}>
          <Text style={s.eyebrow}>VERSE OF THE DAY</Text>
          {verseLoading ? (
            <ActivityIndicator size="small" color={HV2.coral} style={{ marginTop: 16, marginBottom: 8 }} />
          ) : verseUnavailable ? (
            <Text style={[s.verse, { fontStyle: "italic", opacity: 0.75 }]}>
              {translation
                ? `This verse is currently unavailable in ${translation}. Open your Bible to read it.`
                : "This verse is currently unavailable. Open your Bible to read it."}
            </Text>
          ) : verse.text ? (
            <Text style={s.verse}>{`\u201C${verse.text}\u201D`}</Text>
          ) : null}
          <Text style={s.cite}>{verse.reference}{translation ? ` · ${translation}` : ""}</Text>
        </View>
      )}
      {activeTab === "signpost" && (
        <View style={s.body}>
          <Text style={s.eyebrow}>{"TODAY\u2019S SIGNPOST"}</Text>
          <Text style={s.verse}>{signpost?.title ?? "A signpost for today"}</Text>
          {!!signpost?.description && <Text style={s.cite}>{signpost.description}</Text>}
        </View>
      )}
      {activeTab === "reflection" && (
        <View style={s.body}>
          <Text style={s.eyebrow}>{`${reflectionDaypart.toUpperCase()} REFLECTION`}</Text>
          <Text style={s.verse}>{reflection.thought}</Text>
          <Text style={s.cite}>Reflection on {reflection.reference}</Text>
        </View>
      )}

      <View style={s.actions}>
        {activeTab === "signpost" ? (
          <Pressable
            style={s.primary}
            onPress={() =>
              signpost?.id
                ? router.push({
                    pathname: "/touchpoint-topic",
                    params: { topicId: signpost.id },
                  } as any)
                : router.push("/discover-v2" as any)
            }
            accessibilityRole="button"
            accessibilityLabel="Explore this topic"
          >
            <Text style={s.primaryLabel}>Explore Topic</Text>
          </Pressable>
        ) : (
          <Pressable
            style={[s.primary, !readingTarget.bookId && s.primaryDisabled]}
            onPress={handleRead}
            disabled={!readingTarget.bookId}
            accessibilityRole="button"
            accessibilityLabel={`Read ${readingTarget.bookName} ${readingTarget.chapterNumber ?? ""}`}
          >
            <Text style={s.primaryLabel}>
              Read {readingTarget.bookName}{readingTarget.chapterNumber ? ` ${readingTarget.chapterNumber}` : ""}
            </Text>
          </Pressable>
        )}
        {activeTab === "verse" && (
          <Pressable style={s.iconBtn} onPress={handleBookmark} accessibilityLabel="Bookmark verse">
            <Bookmark size={19} color={saved ? HV2.coral : HV2.ink} fill={saved ? HV2.coral : "transparent"} />
          </Pressable>
        )}
        <Pressable style={s.iconBtn} onPress={handleShare} accessibilityLabel="Share">
          <Share2 size={19} color={HV2.ink} />
        </Pressable>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  card: {
    marginHorizontal: 20,
    backgroundColor: HV2.surfaceCard,
    borderRadius: 28,
    overflow: "hidden",
    ...HV2.cardShadow,
  },
  tabs: {
    flexDirection: "row",
    gap: 4,
    padding: 6,
    margin: 16,
    marginBottom: 0,
    borderRadius: 999,
    backgroundColor: "#F3F0EC",
  },
  tab: { flex: 1, paddingVertical: 8, borderRadius: 999, alignItems: "center" },
  tabActive: { backgroundColor: "#FFFFFF", ...HV2.rowShadow },
  tabLabel: { fontFamily: F.interSemi, fontSize: 13.5, color: HV2.inkMutedText },
  tabLabelActive: { color: HV2.ink },
  body: { paddingHorizontal: 24, paddingTop: 24, paddingBottom: 8 },
  eyebrow: { fontFamily: F.interBold, fontSize: 11.5, letterSpacing: 1.6, color: HV2.coralInk },
  verse: { fontFamily: F.loraSemi, fontSize: 22, lineHeight: 32, color: HV2.ink, marginTop: 12 },
  cite: { fontFamily: F.interSemi, fontSize: 13.5, color: HV2.inkMutedText, marginTop: 12 },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 24,
  },
  primary: {
    flex: 1,
    backgroundColor: HV2.coral,
    borderRadius: 999,
    paddingVertical: 12,
    alignItems: "center",
    shadowColor: HV2.coral,
    shadowOpacity: 0.35,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  primaryDisabled: { opacity: 0.5 },
  primaryLabel: { fontFamily: F.interSemi, fontSize: 14.5, color: "#FFFFFF" },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#EEEAE4",
    alignItems: "center",
    justifyContent: "center",
  },
});
