import React, { useState } from "react";
import { View, Text, Pressable, StyleSheet, Share, ActivityIndicator, Platform, Image, useWindowDimensions } from "react-native";
import { Bookmark, Share2 } from "lucide-react-native";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import { apiRequest } from "@/lib/query-client";
import { confirmWebSafe } from "@/components/WebSafeConfirm";
import { HV2, F } from "./theme";
import {
  assertReflectionReadingAlignment,
  dayOfYear,
  type HomeDaypart,
} from "./home-data";
import { buildHeroShareMessage, type HeroTab } from "./hero-share";
import {
  HERO_TEXT_COL_RATIO,
  heroArtRatioForWidth,
  heroIllustrationForDay,
  type HeroVerseIllustrationId,
} from "@/lib/home-hero-illustration";

const HERO_ART: Record<HeroVerseIllustrationId, number> = {
  lamp: require("@/assets/illustrations/plan-prayer.png"),
  candle: require("@/assets/illustrations/rhythm-reflection.png"),
  sunburst: require("@/assets/illustrations/rhythm-morning.png"),
  "open-book": require("@/assets/illustrations/rhythm-plan.png"),
  olive: require("@/assets/illustrations/plan-health.png"),
  path: require("@/assets/illustrations/plan-youth.png"),
};

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
  dayIndex?: number;
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

function artWidthPercent(ratio: number): `${number}%` {
  return `${Math.round(ratio * 100)}%`;
}

export default function HeroCard({
  activeTab, onTabChange, verse, bookId, chapterNumber, userId, signpost, reflection,
  reflectionDaypart, reflectionReadingTarget, translation, verseLoading, verseUnavailable,
  dayIndex = dayOfYear(),
}: Props) {
  const [saved, setSaved] = useState(false);
  const { width: windowWidth } = useWindowDimensions();
  const [rowWidth, setRowWidth] = useState(0);
  const measuredWidth = rowWidth > 0 ? rowWidth : Math.max(windowWidth - 40, 320);
  const art = heroIllustrationForDay(dayIndex, activeTab);
  const artRatio = heroArtRatioForWidth(measuredWidth);
  const artWidth = artWidthPercent(artRatio);

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

  const copy =
    activeTab === "verse" ? (
      <>
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
      </>
    ) : activeTab === "signpost" ? (
      <>
        <Text style={s.eyebrow}>{"TODAY\u2019S SIGNPOST"}</Text>
        <Text style={s.verse}>{signpost?.title ?? "A signpost for today"}</Text>
        {!!signpost?.description && <Text style={s.cite}>{signpost.description}</Text>}
      </>
    ) : (
      <>
        <Text style={s.eyebrow}>{`${reflectionDaypart.toUpperCase()} REFLECTION`}</Text>
        <Text style={s.verse}>{reflection.thought}</Text>
        <Text style={s.cite}>Reflection on {reflection.reference}</Text>
      </>
    );

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

      <View
        style={s.contentRow}
        onLayout={(e) => {
          const next = Math.round(e.nativeEvent.layout.width);
          if (next > 0 && next !== rowWidth) setRowWidth(next);
        }}
      >
        <View style={[s.textCol, { width: artWidthPercent(HERO_TEXT_COL_RATIO) }]}>{copy}</View>
        <View
          style={[s.art, { width: artWidth }]}
          pointerEvents="none"
          accessible={false}
          importantForAccessibility="no"
        >
          <Image
            source={HERO_ART[art.id]}
            style={s.artImage}
            resizeMode="contain"
          />
        </View>
      </View>

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
  contentRow: {
    width: "100%",
    flexDirection: "row",
    alignItems: "flex-start",
    paddingTop: 24,
    paddingBottom: 8,
  },
  textCol: {
    paddingLeft: 24,
    paddingRight: 8,
    flexGrow: 0,
    flexShrink: 0,
  },
  art: {
    aspectRatio: 1,
    marginLeft: "auto",
    flexGrow: 0,
    flexShrink: 0,
    overflow: "hidden",
    alignItems: "flex-end",
    justifyContent: "flex-start",
  },
  artImage: {
    width: "100%",
    aspectRatio: 1,
  },
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
