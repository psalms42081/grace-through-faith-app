import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Linking,
  useColorScheme,
  Platform,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import Colors from "@/constants/colors";

type Tab = "word" | "context" | "voices" | "application";

const TABS: { id: Tab; label: string; icon: React.ComponentProps<typeof Ionicons>["name"] }[] = [
  { id: "word", label: "Word Study", icon: "language-outline" },
  { id: "context", label: "Context", icon: "time-outline" },
  { id: "voices", label: "Historic Voices", icon: "chatbubble-ellipses-outline" },
  { id: "application", label: "Application", icon: "heart-outline" },
];

interface Commentator {
  name: string;
  dates: string;
  tradition: string;
  isPublicDomain: boolean;
  externalUrl?: string;
}

const COMMENTATORS: Commentator[] = [
  { name: "Matthew Henry", dates: "1662\u20131714", tradition: "Reformed", isPublicDomain: true },
  { name: "Jamieson, Fausset & Brown", dates: "1871", tradition: "Presbyterian", isPublicDomain: true },
  { name: "Adam Clarke", dates: "1762\u20131832", tradition: "Wesleyan", isPublicDomain: true },
  { name: "John Gill", dates: "1697\u20131771", tradition: "Baptist", isPublicDomain: true },
  { name: "Ellen G. White", dates: "1827\u20131915", tradition: "Adventist", isPublicDomain: false, externalUrl: "https://egwwritings.org" },
];

interface StrongEntry {
  id: string;
  language: string;
  lemma: string;
  transliteration: string | null;
  pronunciation: string | null;
  definition: string;
  kjvUsage: string | null;
}

interface ContextCard {
  id: string;
  title: string;
  content: string;
  category: string;
  themes: string[] | null;
}

interface CommentaryResult {
  entry: {
    id: string;
    title: string | null;
    content: string;
    verseStart: number | null;
    verseEnd: number | null;
  };
  commentator: {
    id: string;
    name: string;
    tradition: string | null;
  };
}

const FEATURED_PASSAGES = [
  { label: "Genesis 1:1", bookId: 1, chapter: 1, verse: 1, bookName: "Genesis" },
  { label: "Psalm 23:1", bookId: 19, chapter: 23, verse: 1, bookName: "Psalms" },
  { label: "John 1:1", bookId: 43, chapter: 1, verse: 1, bookName: "John" },
  { label: "John 3:16", bookId: 43, chapter: 3, verse: 16, bookName: "John" },
];

export default function StudyScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const theme = isDark ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<Tab>("word");

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : 0;

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 16, backgroundColor: theme.background, borderBottomColor: theme.border }]}>
        <Text style={[styles.title, { color: theme.text, fontFamily: "Lora_700Bold" }]}>
          Study Tools
        </Text>
        <Text style={[styles.subtitle, { color: theme.textSecondary, fontFamily: "Inter_400Regular" }]}>
          Deep dive into Scripture
        </Text>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={[styles.tabScroll, { backgroundColor: theme.background }]}
        contentContainerStyle={styles.tabContainer}
      >
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <Pressable
              key={tab.id}
              onPress={() => setActiveTab(tab.id)}
              style={[
                styles.tabPill,
                {
                  backgroundColor: isActive ? theme.accent : theme.backgroundSecondary,
                  borderColor: isActive ? theme.accent : theme.border,
                },
              ]}
            >
              <Ionicons
                name={tab.icon}
                size={14}
                color={isActive ? "#fff" : theme.textSecondary}
              />
              <Text
                style={[
                  styles.tabLabel,
                  {
                    color: isActive ? "#fff" : theme.textSecondary,
                    fontFamily: isActive ? "Inter_600SemiBold" : "Inter_500Medium",
                  },
                ]}
              >
                {tab.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.content, { paddingBottom: bottomPad + 120 }]}
        showsVerticalScrollIndicator={false}
      >
        {activeTab === "word" && <WordStudyTab theme={theme} />}
        {activeTab === "context" && <ContextTab theme={theme} />}
        {activeTab === "voices" && <HistoricVoicesTab theme={theme} commentators={COMMENTATORS} />}
        {activeTab === "application" && <ApplicationTab theme={theme} />}
      </ScrollView>
    </View>
  );
}

function WordStudyTab({ theme }: { theme: typeof Colors.light }) {
  const [selectedPassage, setSelectedPassage] = useState<typeof FEATURED_PASSAGES[0] | null>(null);

  const verseQuery = useQuery<{ book: any; chapter: number; verses: { id: string; verse: number; text: string }[] }>({
    queryKey: [`/api/passage?book=${selectedPassage?.bookId}&chapter=${selectedPassage?.chapter}&translation=KJV`],
    enabled: !!selectedPassage,
  });

  const targetVerse = verseQuery.data?.verses?.find(v => v.verse === selectedPassage?.verse);

  const wordQuery = useQuery<{ map: any; entry: StrongEntry | null }[]>({
    queryKey: [`/api/strong/verse/${targetVerse?.id}`],
    enabled: !!targetVerse?.id,
  });

  const hasWords = wordQuery.data && wordQuery.data.length > 0;

  return (
    <View style={styles.tabContent}>
      <Text style={[styles.sectionLabel, { color: theme.textSecondary, fontFamily: "Inter_600SemiBold" }]}>
        Select a Passage
      </Text>
      <View style={styles.passagePills}>
        {FEATURED_PASSAGES.map((p) => {
          const isActive = selectedPassage?.label === p.label;
          return (
            <Pressable
              key={p.label}
              onPress={() => setSelectedPassage(p)}
              style={[
                styles.passagePill,
                {
                  backgroundColor: isActive ? theme.accent : theme.backgroundCard,
                  borderColor: isActive ? theme.accent : theme.border,
                },
              ]}
            >
              <Text style={[styles.passagePillText, { color: isActive ? "#fff" : theme.text, fontFamily: isActive ? "Inter_600SemiBold" : "Inter_500Medium" }]}>
                {p.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {!selectedPassage && (
        <View style={[styles.emptyBox, { backgroundColor: theme.backgroundCard, borderColor: theme.border }]}>
          <View style={[styles.emptyIcon, { backgroundColor: theme.accent + "18" }]}>
            <Ionicons name="language" size={28} color={theme.accent} />
          </View>
          <Text style={[styles.emptyTitle, { color: theme.text, fontFamily: "Lora_600SemiBold" }]}>
            Original Language Tools
          </Text>
          <Text style={[styles.emptyBody, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
            Select a passage above to see each word's original Hebrew or Greek meaning from Strong's Concordance.
          </Text>
        </View>
      )}

      {selectedPassage && verseQuery.isLoading && (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="small" color={theme.accent} />
        </View>
      )}

      {selectedPassage && targetVerse && (
        <View style={[styles.verseCard, { backgroundColor: theme.backgroundCard, borderColor: theme.border }]}>
          <View style={styles.verseRefRow}>
            <Ionicons name="book-outline" size={14} color={theme.accent} />
            <Text style={[styles.verseRef, { color: theme.accent, fontFamily: "Inter_600SemiBold" }]}>
              {selectedPassage.label}
            </Text>
          </View>
          <Text style={[styles.verseText, { color: theme.text, fontFamily: "Lora_400Regular" }]}>
            {targetVerse.text}
          </Text>
        </View>
      )}

      {wordQuery.isLoading && targetVerse && (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="small" color={theme.accent} />
          <Text style={[styles.loadingText, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
            Loading word analysis...
          </Text>
        </View>
      )}

      {hasWords && (
        <>
          <Text style={[styles.sectionLabel, { color: theme.textSecondary, fontFamily: "Inter_600SemiBold" }]}>
            Original Language Words
          </Text>
          {wordQuery.data!.map((wm, i) => {
            const entry = wm.entry;
            if (!entry) return null;
            const langColor = entry.language === "he" ? "#4A6741" : "#3B5998";
            return (
              <View
                key={wm.map.id || i}
                style={[styles.wordCard, { backgroundColor: theme.backgroundCard, borderColor: theme.border }]}
              >
                <View style={styles.wordHeader}>
                  <Text style={[styles.lemma, { color: theme.text, fontFamily: "Lora_700Bold" }]}>
                    {entry.lemma}
                  </Text>
                  <View style={[styles.langBadge, { backgroundColor: langColor + "22" }]}>
                    <Text style={[styles.langText, { color: langColor, fontFamily: "Inter_600SemiBold" }]}>
                      {entry.language === "he" ? "Hebrew" : "Greek"}
                    </Text>
                  </View>
                  <View style={[styles.strongBadge, { backgroundColor: theme.accent + "18" }]}>
                    <Text style={[styles.strongNum, { color: theme.accent, fontFamily: "Inter_600SemiBold" }]}>
                      {entry.id}
                    </Text>
                  </View>
                </View>
                {wm.map.translatedWord && (
                  <View style={styles.translationRow}>
                    <Ionicons name="arrow-forward" size={12} color={theme.textMuted} />
                    <Text style={[styles.translatedWord, { color: theme.textSecondary, fontFamily: "Inter_500Medium" }]}>
                      "{wm.map.translatedWord}"
                    </Text>
                  </View>
                )}
                {entry.transliteration && (
                  <Text style={[styles.transliteration, { color: theme.textSecondary, fontFamily: "Inter_400Regular" }]}>
                    {entry.transliteration}{entry.pronunciation ? ` (${entry.pronunciation})` : ""}
                  </Text>
                )}
                <Text style={[styles.definition, { color: theme.text, fontFamily: "Inter_400Regular" }]}>
                  {entry.definition}
                </Text>
                {entry.kjvUsage && (
                  <View style={styles.usagePills}>
                    {entry.kjvUsage.split(",").slice(0, 5).map((u, j) => (
                      <View key={j} style={[styles.usagePill, { backgroundColor: theme.accent + "12" }]}>
                        <Text style={[styles.usagePillText, { color: theme.accent, fontFamily: "Inter_500Medium" }]}>
                          {u.trim()}
                        </Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            );
          })}
        </>
      )}

      {selectedPassage && targetVerse && !wordQuery.isLoading && !hasWords && (
        <View style={[styles.emptyBox, { backgroundColor: theme.backgroundCard, borderColor: theme.border }]}>
          <Ionicons name="information-circle-outline" size={24} color={theme.textMuted} />
          <Text style={[styles.emptyBody, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
            Word data for this verse has not been mapped yet.
          </Text>
        </View>
      )}
    </View>
  );
}

function ContextTab({ theme }: { theme: typeof Colors.light }) {
  const [selectedBook, setSelectedBook] = useState<{ bookId: number; chapter: number; bookName: string } | null>(null);

  const FEATURED_CHAPTERS = [
    { label: "Genesis 1", bookId: 1, chapter: 1, bookName: "Genesis" },
    { label: "Psalm 23", bookId: 19, chapter: 23, bookName: "Psalms" },
    { label: "Isaiah 53", bookId: 23, chapter: 53, bookName: "Isaiah" },
    { label: "John 3", bookId: 43, chapter: 3, bookName: "John" },
    { label: "Romans 8", bookId: 45, chapter: 8, bookName: "Romans" },
  ];

  const { data: contextCards, isLoading } = useQuery<ContextCard[]>({
    queryKey: [`/api/context?book=${selectedBook?.bookId}&chapter=${selectedBook?.chapter}`],
    enabled: !!selectedBook,
  });

  const hasCards = contextCards && contextCards.length > 0;

  return (
    <View style={styles.tabContent}>
      <Text style={[styles.sectionLabel, { color: theme.textSecondary, fontFamily: "Inter_600SemiBold" }]}>
        Select a Chapter
      </Text>
      <View style={styles.passagePills}>
        {FEATURED_CHAPTERS.map((c) => {
          const isActive = selectedBook?.bookId === c.bookId && selectedBook?.chapter === c.chapter;
          return (
            <Pressable
              key={c.label}
              onPress={() => setSelectedBook(c)}
              style={[
                styles.passagePill,
                {
                  backgroundColor: isActive ? theme.accent : theme.backgroundCard,
                  borderColor: isActive ? theme.accent : theme.border,
                },
              ]}
            >
              <Text style={[styles.passagePillText, { color: isActive ? "#fff" : theme.text, fontFamily: isActive ? "Inter_600SemiBold" : "Inter_500Medium" }]}>
                {c.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {!selectedBook && (
        <View style={[styles.emptyBox, { backgroundColor: theme.backgroundCard, borderColor: theme.border }]}>
          <View style={[styles.emptyIcon, { backgroundColor: theme.accent + "18" }]}>
            <Ionicons name="time" size={28} color={theme.accent} />
          </View>
          <Text style={[styles.emptyTitle, { color: theme.text, fontFamily: "Lora_600SemiBold" }]}>
            Historical Context
          </Text>
          <Text style={[styles.emptyBody, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
            Select a chapter above to see its historical background, cultural notes, author information, and thematic overview.
          </Text>
        </View>
      )}

      {isLoading && (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="small" color={theme.accent} />
        </View>
      )}

      {hasCards && contextCards!.map((card) => (
        <View key={card.id} style={[styles.contextCard, { backgroundColor: theme.backgroundCard, borderColor: theme.border }]}>
          <View style={styles.contextCardHeader}>
            <View style={[styles.categoryBadge, { backgroundColor: theme.accent + "18" }]}>
              <Text style={[styles.categoryText, { color: theme.accent, fontFamily: "Inter_600SemiBold" }]}>
                {card.category.replace(/_/g, " ")}
              </Text>
            </View>
          </View>
          <Text style={[styles.contextTitle, { color: theme.text, fontFamily: "Lora_600SemiBold" }]}>
            {card.title}
          </Text>
          <Text style={[styles.contextContent, { color: theme.textSecondary, fontFamily: "Inter_400Regular" }]}>
            {card.content}
          </Text>
          {card.themes && card.themes.length > 0 && (
            <View style={styles.themePills}>
              {card.themes.map((t, i) => (
                <View key={i} style={[styles.themePill, { backgroundColor: theme.primary + "22" }]}>
                  <Text style={[styles.themePillText, { color: theme.primary, fontFamily: "Inter_500Medium" }]}>
                    {t}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>
      ))}

      {selectedBook && !isLoading && !hasCards && (
        <View style={[styles.emptyBox, { backgroundColor: theme.backgroundCard, borderColor: theme.border }]}>
          <Ionicons name="information-circle-outline" size={24} color={theme.textMuted} />
          <Text style={[styles.emptyBody, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
            No context data available for this chapter yet.
          </Text>
        </View>
      )}

      {selectedBook && hasCards && (
        <Pressable
          onPress={() => router.push(`/passage-context?bookId=${selectedBook.bookId}&chapter=${selectedBook.chapter}&bookName=${encodeURIComponent(selectedBook.bookName)}`)}
          style={[styles.viewFullBtn, { backgroundColor: theme.accent }]}
        >
          <Text style={[styles.viewFullText, { fontFamily: "Inter_600SemiBold" }]}>
            View Full Passage Study
          </Text>
          <Ionicons name="arrow-forward" size={16} color="#fff" />
        </Pressable>
      )}
    </View>
  );
}

function HistoricVoicesTab({ theme, commentators }: { theme: typeof Colors.light; commentators: Commentator[] }) {
  const [selectedChapter, setSelectedChapter] = useState<{ bookId: number; chapter: number; label: string } | null>(null);

  const CHAPTERS = [
    { label: "Genesis 1", bookId: 1, chapter: 1 },
    { label: "Psalm 23", bookId: 19, chapter: 23 },
    { label: "John 3", bookId: 43, chapter: 3 },
    { label: "Romans 8", bookId: 45, chapter: 8 },
  ];

  const { data: commentaryData, isLoading } = useQuery<CommentaryResult[]>({
    queryKey: [`/api/commentary?book=${selectedChapter?.bookId}&chapter=${selectedChapter?.chapter}`],
    enabled: !!selectedChapter,
  });

  const hasCommentary = commentaryData && commentaryData.length > 0;

  return (
    <View style={styles.tabContent}>
      <Text style={[styles.sectionLabel, { color: theme.textSecondary, fontFamily: "Inter_600SemiBold" }]}>
        Featured Commentators
      </Text>
      {commentators.map((c) => (
        <Pressable
          key={c.name}
          onPress={() => {
            if (c.externalUrl) {
              Linking.openURL(c.externalUrl);
            }
          }}
          style={({ pressed }) => [
            styles.commentatorCard,
            {
              backgroundColor: theme.backgroundCard,
              borderColor: theme.border,
              opacity: pressed && c.externalUrl ? 0.75 : 1,
            },
          ]}
        >
          <View style={[styles.avatarCircle, { backgroundColor: theme.primary }]}>
            <Ionicons name="person" size={20} color={Colors.light.accent} />
          </View>
          <View style={styles.commentatorInfo}>
            <Text style={[styles.commentatorName, { color: theme.text, fontFamily: "Lora_600SemiBold" }]}>
              {c.name}
            </Text>
            <Text style={[styles.commentatorMeta, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
              {c.dates} · {c.tradition}
            </Text>
          </View>
          {c.isPublicDomain ? (
            <View style={[styles.pdBadge, { backgroundColor: theme.success + "22" }]}>
              <Text style={[styles.pdText, { color: theme.success, fontFamily: "Inter_600SemiBold" }]}>
                Public Domain
              </Text>
            </View>
          ) : (
            <View style={styles.externalBadgeRow}>
              <View style={[styles.pdBadge, { backgroundColor: theme.bookmarkBlue + "22" }]}>
                <Text style={[styles.pdText, { color: theme.bookmarkBlue, fontFamily: "Inter_600SemiBold" }]}>
                  External
                </Text>
              </View>
              <Ionicons name="open-outline" size={14} color={theme.bookmarkBlue} />
            </View>
          )}
        </Pressable>
      ))}

      <Text style={[styles.sectionLabel, { color: theme.textSecondary, fontFamily: "Inter_600SemiBold", marginTop: 20 }]}>
        Browse Commentary
      </Text>
      <View style={styles.passagePills}>
        {CHAPTERS.map((c) => {
          const isActive = selectedChapter?.label === c.label;
          return (
            <Pressable
              key={c.label}
              onPress={() => setSelectedChapter(c)}
              style={[
                styles.passagePill,
                {
                  backgroundColor: isActive ? theme.accent : theme.backgroundCard,
                  borderColor: isActive ? theme.accent : theme.border,
                },
              ]}
            >
              <Text style={[styles.passagePillText, { color: isActive ? "#fff" : theme.text, fontFamily: isActive ? "Inter_600SemiBold" : "Inter_500Medium" }]}>
                {c.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {isLoading && (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="small" color={theme.accent} />
        </View>
      )}

      {hasCommentary && commentaryData!.map((cr) => (
        <View key={cr.entry.id} style={[styles.commentaryCard, { backgroundColor: theme.backgroundCard, borderColor: theme.border }]}>
          <View style={styles.commentaryHeader}>
            <View style={[styles.avatarSmall, { backgroundColor: theme.primary }]}>
              <Ionicons name="person" size={14} color={Colors.light.accent} />
            </View>
            <Text style={[styles.commentaryAuthor, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}>
              {cr.commentator.name}
            </Text>
            {cr.entry.verseStart && (
              <View style={[styles.verseBadge, { backgroundColor: theme.accent + "18" }]}>
                <Text style={[styles.verseRange, { color: theme.accent, fontFamily: "Inter_600SemiBold" }]}>
                  vv. {cr.entry.verseStart}{cr.entry.verseEnd && cr.entry.verseEnd !== cr.entry.verseStart ? `-${cr.entry.verseEnd}` : ""}
                </Text>
              </View>
            )}
          </View>
          {cr.entry.title && (
            <Text style={[styles.commentaryTitle, { color: theme.text, fontFamily: "Lora_600SemiBold" }]}>
              {cr.entry.title}
            </Text>
          )}
          <Text style={[styles.commentaryText, { color: theme.textSecondary, fontFamily: "Inter_400Regular" }]} numberOfLines={6}>
            {cr.entry.content}
          </Text>
        </View>
      ))}

      {selectedChapter && !isLoading && !hasCommentary && (
        <View style={[styles.emptyBox, { backgroundColor: theme.backgroundCard, borderColor: theme.border }]}>
          <Ionicons name="information-circle-outline" size={24} color={theme.textMuted} />
          <Text style={[styles.emptyBody, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
            No commentary available for this chapter yet.
          </Text>
        </View>
      )}
    </View>
  );
}

function ApplicationTab({ theme }: { theme: typeof Colors.light }) {
  return (
    <View style={styles.tabContent}>
      <View style={[styles.appLayer, { backgroundColor: theme.primary }]}>
        <Text style={[styles.appLayerTitle, { fontFamily: "Lora_600SemiBold" }]}>
          The 4-Layer Study Model
        </Text>
        <Text style={[styles.appLayerSub, { fontFamily: "Inter_400Regular" }]}>
          Every passage is presented with progressive depth -- from the raw text to your personal application.
        </Text>
      </View>
      {[
        { layer: "Layer 1", name: "Text", desc: "KJV scripture, cross references, word study", icon: "book" as const },
        { layer: "Layer 2", name: "Context", desc: "Historical notes, geography, timeline anchors", icon: "map" as const },
        { layer: "Layer 3", name: "Historic Voices", desc: "Classic commentary from the Church Fathers", icon: "chatbubble-ellipses" as const },
        { layer: "Layer 4", name: "Application", desc: "Then/Now, reflection, prayer, journaling", icon: "heart" as const },
      ].map((layer) => (
        <View key={layer.layer} style={[styles.layerRow, { borderColor: theme.border }]}>
          <View style={[styles.layerIcon, { backgroundColor: theme.accent + "18" }]}>
            <Ionicons name={layer.icon} size={18} color={theme.accent} />
          </View>
          <View style={styles.layerText}>
            <Text style={[styles.layerNum, { color: theme.textMuted, fontFamily: "Inter_500Medium" }]}>
              {layer.layer}
            </Text>
            <Text style={[styles.layerName, { color: theme.text, fontFamily: "Lora_600SemiBold" }]}>
              {layer.name}
            </Text>
            <Text style={[styles.layerDesc, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
              {layer.desc}
            </Text>
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  title: { fontSize: 24, marginBottom: 2 },
  subtitle: { fontSize: 14 },
  tabScroll: { flexGrow: 0 },
  tabContainer: { paddingHorizontal: 20, paddingVertical: 12, gap: 8 },
  tabPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  tabLabel: { fontSize: 13 },
  scrollView: { flex: 1 },
  content: { padding: 20 },
  tabContent: { gap: 12 },
  sectionLabel: {
    fontSize: 11,
    letterSpacing: 1.2,
    textTransform: "uppercase",
    marginTop: 8,
    marginBottom: 4,
  },
  passagePills: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 8 },
  passagePill: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  passagePillText: { fontSize: 13 },
  emptyBox: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 24,
    alignItems: "center",
    gap: 12,
  },
  emptyIcon: {
    width: 60,
    height: 60,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  emptyTitle: { fontSize: 17, textAlign: "center" },
  emptyBody: { fontSize: 14, textAlign: "center", lineHeight: 22 },
  loadingBox: { alignItems: "center", paddingVertical: 30, gap: 10 },
  loadingText: { fontSize: 13 },
  verseCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 18,
    gap: 10,
  },
  verseRefRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  verseRef: { fontSize: 13 },
  verseText: { fontSize: 16, lineHeight: 26 },
  wordCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    gap: 8,
  },
  wordHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flexWrap: "wrap",
  },
  lemma: { fontSize: 22 },
  langBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  langText: { fontSize: 10 },
  strongBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  strongNum: { fontSize: 10 },
  translationRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  translatedWord: { fontSize: 14, fontStyle: "italic" },
  transliteration: { fontSize: 13 },
  definition: { fontSize: 14, lineHeight: 22 },
  usagePills: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 4 },
  usagePill: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  usagePillText: { fontSize: 11 },
  contextCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    gap: 10,
  },
  contextCardHeader: { flexDirection: "row", alignItems: "center" },
  categoryBadge: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  categoryText: { fontSize: 10, textTransform: "uppercase", letterSpacing: 0.5 },
  contextTitle: { fontSize: 16 },
  contextContent: { fontSize: 14, lineHeight: 22 },
  themePills: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 4 },
  themePill: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  themePillText: { fontSize: 11 },
  viewFullBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 14,
    paddingVertical: 14,
    marginTop: 4,
  },
  viewFullText: { color: "#fff", fontSize: 14 },
  commentatorCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    gap: 12,
  },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  commentatorInfo: { flex: 1 },
  commentatorName: { fontSize: 15, marginBottom: 2 },
  commentatorMeta: { fontSize: 12 },
  pdBadge: {
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  pdText: { fontSize: 10 },
  externalBadgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  commentaryCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    gap: 8,
  },
  commentaryHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  avatarSmall: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  commentaryAuthor: { fontSize: 13, flex: 1 },
  verseBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  verseRange: { fontSize: 10 },
  commentaryTitle: { fontSize: 15 },
  commentaryText: { fontSize: 13, lineHeight: 21 },
  appLayer: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 4,
  },
  appLayerTitle: { color: "#EDE5D5", fontSize: 17, marginBottom: 8 },
  appLayerSub: { color: "rgba(237,229,213,0.7)", fontSize: 13, lineHeight: 20 },
  layerRow: {
    flexDirection: "row",
    gap: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingVertical: 16,
    alignItems: "flex-start",
  },
  layerIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  layerText: { flex: 1 },
  layerNum: { fontSize: 11, letterSpacing: 0.5, marginBottom: 2 },
  layerName: { fontSize: 16, marginBottom: 3 },
  layerDesc: { fontSize: 13, lineHeight: 19 },
});
