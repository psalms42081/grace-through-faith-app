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
  HERO_ART_ASPECT,
  HERO_BODY_PAD_LEFT,
  HERO_TEXT_COL_RATIO,
  heroArtRatioForWidth,
  heroIllustrationForDay,
  type HeroVerseIllustrationId,
} from "@/lib/home-hero-illustration";

const HERO_ART: Record<HeroVerseIllustrationId, number> = {
  lamp: require("@/assets/illustrations/plan-prayer.png"),
  candle: require("@/assets/illustrations/rhythm-reflection.png"),
  sunburst: require("@/assets/illustrations/rhythm-morning.png"),
  olive: require("@/assets/illustrations/plan-health.png"),
  hearth: require("@/assets/illustrations/plan-family.png"),
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

function widthPercent(ratio: number): `${number}%` {
  return `${Math.round(ratio * 100)}%`;
}

/**
 * react-native-web ignores `aspectRatio` on `Image`, so a percentage width left
 * the intrinsic 1024px asset height in place and `contain` centred the art far
 * below the clipped column. Size the art in explicit pixels off the measured
 * column width and the asset ratio instead. `Image.resolveAssetSource` does not
 * exist on react-native-web, so the ratio is a constant that
 * tests/home-hero-coherence.test.ts pins against the real PNG headers.
 */
function artPixelHeight(width: number): number {
  return Math.round(width * HERO_ART_ASPECT);
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
  const artSource = HERO_ART[art.id];
  const artWidth = Math.round(measuredWidth * artRatio);
  const artHeight = artPixelHeight(artWidth);

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

  // HeadBlock lives in the art row. Body is a full-width sibling below the row.
  // Verse: eyebrow + quote + citation. Signpost: eyebrow + title. Reflection: eyebrow + thought.
  const head =
    activeTab === "verse" ? (
      <>
        <Text style={s.eyebrow}>VERSE OF THE DAY</Text>
        {verseLoading ? (
          <ActivityIndicator size="small" color={HV2.coral} style={{ marginTop: 16, marginBottom: 8 }} />
        ) : verseUnavailable ? (
          <Text style={[s.verseQuote, { fontStyle: "italic", opacity: 0.75 }]}>
            {translation
              ? `This verse is currently unavailable in ${translation}. Open your Bible to read it.`
              : "This verse is currently unavailable. Open your Bible to read it."}
          </Text>
        ) : verse.text ? (
          <Text style={s.verseQuote}>{`\u201C${verse.text}\u201D`}</Text>
        ) : null}
        <Text style={s.cite}>{verse.reference}{translation ? ` · ${translation}` : ""}</Text>
      </>
    ) : activeTab === "signpost" ? (
      <>
        <Text style={s.eyebrow}>{"TODAY\u2019S SIGNPOST"}</Text>
        <Text style={s.verse}>{signpost?.title ?? "A signpost for today"}</Text>
      </>
    ) : (
      <>
        <Text style={s.eyebrow}>{`${reflectionDaypart.toUpperCase()} REFLECTION`}</Text>
        <Text style={s.verseQuote}>{reflection.thought}</Text>
      </>
    );

  const body =
    activeTab === "signpost" && signpost?.description ? (
      <View style={s.body} testID="hero-body">
        <Text style={s.bodyText}>{signpost.description}</Text>
      </View>
    ) : activeTab === "reflection" ? (
      <View style={s.body} testID="hero-body">
        <Text style={s.bodyText}>Reflection on {reflection.reference}</Text>
      </View>
    ) : null;

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
        testID="hero-row"
        onLayout={(e) => {
          const next = Math.round(e.nativeEvent.layout.width);
          if (next > 0 && next !== rowWidth) setRowWidth(next);
        }}
      >
        <View
          style={[s.textCol, { width: widthPercent(HERO_TEXT_COL_RATIO) }]}
          testID="hero-head"
        >
          {head}
        </View>
        <View
          style={[s.art, { width: artWidth, height: artHeight }]}
          testID="hero-art"
          pointerEvents="none"
          accessible={false}
          importantForAccessibility="no"
        >
          <Image
            source={artSource}
            style={{ width: artWidth, height: artHeight }}
            resizeMode="contain"
          />
        </View>
      </View>

      {body}

      <View style={s.actions} testID="hero-actions">
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
    alignItems: "center",
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
    marginLeft: "auto",
    // Inset on the art, not the row: row padding would shrink the percentage
    // basis and drop the text column under HERO_TEXT_COL_RATIO.
    marginRight: 20,
    flexGrow: 0,
    flexShrink: 0,
    alignItems: "flex-end",
    justifyContent: "center",
  },
  eyebrow: { fontFamily: F.interBold, fontSize: 11.5, letterSpacing: 1.6, color: HV2.coralInk },
  verseQuote: { fontFamily: F.loraSemi, fontSize: 20, lineHeight: 28, color: HV2.ink, marginTop: 12 },
  verse: { fontFamily: F.loraSemi, fontSize: 22, lineHeight: 32, color: HV2.ink, marginTop: 12 },
  cite: { fontFamily: F.interSemi, fontSize: 13.5, color: HV2.inkMutedText, marginTop: 12 },
  body: {
    width: "100%",
    paddingHorizontal: HERO_BODY_PAD_LEFT,
    paddingTop: 12,
  },
  bodyText: { fontFamily: F.interSemi, fontSize: 13.5, color: HV2.inkMutedText },
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
