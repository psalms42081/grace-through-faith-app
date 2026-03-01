import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Linking,
  TextInput,
  useColorScheme,
  Platform,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams } from "expo-router";
import { apiRequest } from "@/lib/query-client";
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
  derivation: string | null;
  extendedDefinition: string | null;
}

interface ContextCard {
  id: string;
  title: string;
  content: string;
  category?: string;
  historicalBackground?: string | null;
  culturalNotes?: string | null;
  authorInfo?: string | null;
  dateWritten?: string | null;
  audience?: string | null;
  themes: string[] | null;
}

interface AppTemplate {
  id: string;
  bookId: number;
  chapter: number;
  thenContext: string;
  nowApplication: string;
  reflectionQuestions: string[];
  prayerPrompt: string | null;
  keyTheme: string | null;
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


export default function StudyScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const theme = isDark ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{
    tab?: string;
    bookId?: string;
    chapter?: string;
    verse?: string;
    verseId?: string;
    verseText?: string;
    bookName?: string;
  }>();
  const validTabs: Tab[] = ["word", "context", "voices", "application"];
  const [activeTab, setActiveTab] = useState<Tab>(
    params.tab && validTabs.includes(params.tab as Tab) ? (params.tab as Tab) : "word"
  );

  useEffect(() => {
    if (params.tab && ["word", "context", "voices", "application"].includes(params.tab)) {
      setActiveTab(params.tab as Tab);
    }
  }, [params.tab]);

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
        {activeTab === "word" && <WordStudyTab theme={theme} initialBookId={params.bookId} initialChapter={params.chapter} initialVerse={params.verse} initialVerseId={params.verseId} initialVerseText={params.verseText} initialBookName={params.bookName} />}
        {activeTab === "context" && <ContextTab theme={theme} initialBookId={params.bookId} initialChapter={params.chapter} initialBookName={params.bookName} />}
        {activeTab === "voices" && <HistoricVoicesTab theme={theme} commentators={COMMENTATORS} initialBookId={params.bookId} initialChapter={params.chapter} initialBookName={params.bookName} />}
        {activeTab === "application" && <ApplicationTab theme={theme} initialBookId={params.bookId} initialChapter={params.chapter} initialBookName={params.bookName} />}
      </ScrollView>
    </View>
  );
}

interface BibleBook {
  id: number;
  name: string;
  abbreviation: string;
  testament: string;
  chapterCount: number;
}

function WordStudyTab({ theme, initialBookId, initialChapter, initialVerse, initialVerseId, initialVerseText, initialBookName }: { theme: typeof Colors.light; initialBookId?: string; initialChapter?: string; initialVerse?: string; initialVerseId?: string; initialVerseText?: string; initialBookName?: string }) {
  const [studyMode, setStudyMode] = useState<"verse" | "concordance">("verse");
  const [selectedBook, setSelectedBook] = useState<BibleBook | null>(null);
  const [selectedChapter, setSelectedChapter] = useState<number | null>(initialChapter ? parseInt(initialChapter) : null);
  const [selectedVerse, setSelectedVerse] = useState<number | null>(initialVerse ? parseInt(initialVerse) : null);
  const [didInit, setDidInit] = useState(false);
  const [concordanceSearch, setConcordanceSearch] = useState("");
  const [concordanceLang, setConcordanceLang] = useState<"all" | "he" | "gr">("all");
  const [expandedEntry, setExpandedEntry] = useState<string | null>(null);

  const { data: books } = useQuery<BibleBook[]>({
    queryKey: ["/api/books"],
  });

  useEffect(() => {
    if (books && initialBookId && !didInit) {
      const book = books.find(b => b.id === parseInt(initialBookId));
      if (book) {
        setSelectedBook(book);
        setDidInit(true);
      }
    }
  }, [books, initialBookId, didInit]);

  const passageQuery = useQuery<{ book: any; chapter: number; verses: { id: string; verse: number; text: string }[] }>({
    queryKey: [`/api/passage?book=${selectedBook?.id}&chapter=${selectedChapter}&translation=KJV`],
    enabled: !!selectedBook && !!selectedChapter,
  });

  const targetVerse = passageQuery.data?.verses?.find(v => v.verse === selectedVerse);

  const qc = useQueryClient();

  const wordQuery = useQuery<{ map: any; entry: StrongEntry | null }[]>({
    queryKey: [`/api/strong/verse/${targetVerse?.id}`],
    enabled: !!targetVerse?.id,
  });

  const generateWordsMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/strong/generate", {
        verseId: targetVerse!.id,
        bookName: selectedBook!.name,
        chapter: selectedChapter,
        verse: selectedVerse,
        verseText: targetVerse!.text,
      });
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: [`/api/strong/verse/${targetVerse?.id}`],
      });
    },
  });

  const hasWords = wordQuery.data && wordQuery.data.length > 0;
  const [wordGenAttempted, setWordGenAttempted] = useState<string | null>(null);

  useEffect(() => {
    if (targetVerse && !wordQuery.isLoading && !hasWords && !generateWordsMutation.isPending && wordGenAttempted !== targetVerse.id) {
      setWordGenAttempted(targetVerse.id);
      generateWordsMutation.mutate();
    }
  }, [targetVerse?.id, wordQuery.isLoading, hasWords]);

  const concordanceQuery = useQuery<StrongEntry[]>({
    queryKey: [`/api/strong/search?q=${encodeURIComponent(concordanceSearch)}${concordanceLang !== "all" ? `&language=${concordanceLang}` : ""}`],
    enabled: studyMode === "concordance" && concordanceSearch.trim().length >= 2,
  });

  const otBooks = books?.filter((b) => b.testament === "OT") ?? [];
  const ntBooks = books?.filter((b) => b.testament === "NT") ?? [];

  const chapters = selectedBook
    ? Array.from({ length: selectedBook.chapterCount }, (_, i) => i + 1)
    : [];

  const verses = passageQuery.data?.verses ?? [];

  return (
    <View style={styles.tabContent}>
      <View style={styles.studyModeToggle}>
        <Pressable
          onPress={() => setStudyMode("verse")}
          style={[styles.studyModeBtn, { backgroundColor: studyMode === "verse" ? theme.accent : theme.backgroundCard }]}
          testID="mode-verse-study"
        >
          <Ionicons name="book-outline" size={14} color={studyMode === "verse" ? "#fff" : theme.textSecondary} />
          <Text style={[styles.studyModeBtnText, { color: studyMode === "verse" ? "#fff" : theme.textSecondary, fontFamily: studyMode === "verse" ? "Inter_600SemiBold" : "Inter_500Medium" }]}>
            Verse Study
          </Text>
        </Pressable>
        <Pressable
          onPress={() => setStudyMode("concordance")}
          style={[styles.studyModeBtn, { backgroundColor: studyMode === "concordance" ? theme.accent : theme.backgroundCard }]}
          testID="mode-concordance"
        >
          <Ionicons name="search-outline" size={14} color={studyMode === "concordance" ? "#fff" : theme.textSecondary} />
          <Text style={[styles.studyModeBtnText, { color: studyMode === "concordance" ? "#fff" : theme.textSecondary, fontFamily: studyMode === "concordance" ? "Inter_600SemiBold" : "Inter_500Medium" }]}>
            Concordance
          </Text>
        </Pressable>
      </View>

      {studyMode === "concordance" && (
        <>
          <View style={[styles.concordanceSearchBox, { backgroundColor: theme.backgroundCard }]}>
            <Ionicons name="search" size={18} color={theme.textMuted} />
            <TextInput
              style={[styles.concordanceInput, { color: theme.text, fontFamily: "Inter_400Regular" }]}
              placeholder="Search Strong's (e.g. love, agape, H430)"
              placeholderTextColor={theme.textMuted}
              value={concordanceSearch}
              onChangeText={setConcordanceSearch}
              testID="concordance-search-input"
              autoCapitalize="none"
              autoCorrect={false}
            />
            {concordanceSearch.length > 0 && (
              <Pressable onPress={() => setConcordanceSearch("")}>
                <Ionicons name="close-circle" size={18} color={theme.textMuted} />
              </Pressable>
            )}
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.concordanceLangRow} contentContainerStyle={{ gap: 8 }}>
            {([["all", "All"], ["he", "Hebrew (OT)"], ["gr", "Greek (NT)"]] as const).map(([val, label]) => (
              <Pressable
                key={val}
                onPress={() => setConcordanceLang(val)}
                style={[styles.commentatorChip, { backgroundColor: concordanceLang === val ? theme.accent : theme.backgroundCard }]}
              >
                <Text style={[styles.commentatorChipText, { color: concordanceLang === val ? "#fff" : theme.textSecondary, fontFamily: concordanceLang === val ? "Inter_600SemiBold" : "Inter_500Medium" }]}>
                  {label}
                </Text>
              </Pressable>
            ))}
          </ScrollView>

          {concordanceQuery.isLoading && (
            <ActivityIndicator size="small" color={theme.accent} style={{ marginTop: 20 }} />
          )}

          {concordanceSearch.trim().length < 2 && (
            <View style={styles.concordanceEmpty}>
              <Ionicons name="library-outline" size={40} color={theme.textMuted} />
              <Text style={[styles.concordanceEmptyTitle, { color: theme.text, fontFamily: "Lora_600SemiBold" }]}>
                Strong's Concordance
              </Text>
              <Text style={[styles.concordanceEmptyText, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
                Search 14,000+ Hebrew and Greek word definitions from Strong's Exhaustive Concordance
              </Text>
            </View>
          )}

          {concordanceQuery.data && concordanceQuery.data.length === 0 && concordanceSearch.trim().length >= 2 && (
            <View style={styles.concordanceEmpty}>
              <Ionicons name="search-outline" size={32} color={theme.textMuted} />
              <Text style={[styles.concordanceEmptyText, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
                No entries found for "{concordanceSearch}"
              </Text>
            </View>
          )}

          {concordanceQuery.data?.map((entry) => {
            const isExpanded = expandedEntry === entry.id;
            const langColor = entry.language === "he" ? "#2E7D32" : "#1565C0";
            const langLabel = entry.language === "he" ? "Hebrew" : "Greek";
            return (
              <Pressable
                key={entry.id}
                onPress={() => setExpandedEntry(isExpanded ? null : entry.id)}
                style={[styles.concordanceCard, { backgroundColor: theme.backgroundCard }]}
                testID={`concordance-${entry.id}`}
              >
                <View style={styles.concordanceCardHeader}>
                  <Text style={[styles.concordanceLemma, { color: theme.text, fontFamily: "Lora_700Bold" }]}>
                    {entry.lemma}
                  </Text>
                  <View style={[styles.concordanceLangBadge, { backgroundColor: langColor + "18" }]}>
                    <Text style={[styles.concordanceLangText, { color: langColor, fontFamily: "Inter_600SemiBold" }]}>
                      {langLabel}
                    </Text>
                  </View>
                  <View style={[styles.concordanceIdBadge, { backgroundColor: theme.accent + "18" }]}>
                    <Text style={[styles.concordanceIdText, { color: theme.accent, fontFamily: "Inter_600SemiBold" }]}>
                      {entry.id}
                    </Text>
                  </View>
                </View>
                {entry.transliteration && (
                  <Text style={[styles.concordanceTranslit, { color: theme.textSecondary, fontFamily: "Inter_500Medium" }]}>
                    {entry.transliteration}{entry.pronunciation ? ` (${entry.pronunciation})` : ""}
                  </Text>
                )}
                <Text style={[styles.concordanceDef, { color: theme.text, fontFamily: "Inter_400Regular" }]} numberOfLines={isExpanded ? undefined : 2}>
                  {entry.definition}
                </Text>
                {isExpanded && (
                  <>
                    {entry.derivation && (
                      <View style={{ marginTop: 10 }}>
                        <Text style={[styles.concordanceSubLabel, { color: theme.accent, fontFamily: "Inter_600SemiBold" }]}>
                          Derivation
                        </Text>
                        <Text style={[styles.concordanceSubText, { color: theme.textSecondary, fontFamily: "Inter_400Regular" }]}>
                          {entry.derivation}
                        </Text>
                      </View>
                    )}
                    {entry.kjvUsage && (
                      <View style={{ marginTop: 10 }}>
                        <Text style={[styles.concordanceSubLabel, { color: theme.accent, fontFamily: "Inter_600SemiBold" }]}>
                          KJV Usage
                        </Text>
                        <View style={styles.kjvUsagePills}>
                          {entry.kjvUsage.split(",").map((u, i) => (
                            <View key={i} style={[styles.kjvUsagePill, { backgroundColor: theme.accent + "10" }]}>
                              <Text style={[styles.kjvUsagePillText, { color: theme.accent, fontFamily: "Inter_500Medium" }]}>
                                {u.trim()}
                              </Text>
                            </View>
                          ))}
                        </View>
                      </View>
                    )}
                  </>
                )}
                <Ionicons
                  name={isExpanded ? "chevron-up" : "chevron-down"}
                  size={14}
                  color={theme.textMuted}
                  style={{ alignSelf: "center", marginTop: 6 }}
                />
              </Pressable>
            );
          })}
        </>
      )}

      {studyMode === "verse" && !selectedBook && (
        <>
          <Text style={[styles.sectionLabel, { color: theme.textSecondary, fontFamily: "Inter_600SemiBold" }]}>
            Old Testament
          </Text>
          <View style={styles.passagePills}>
            {otBooks.map((b) => (
              <Pressable
                key={b.id}
                onPress={() => { setSelectedBook(b); setSelectedChapter(null); setSelectedVerse(null); }}
                style={[styles.bookPill, { backgroundColor: theme.backgroundCard, borderColor: theme.border }]}
              >
                <Text style={[styles.bookPillText, { color: theme.text, fontFamily: "Inter_500Medium" }]}>
                  {b.abbreviation}
                </Text>
              </Pressable>
            ))}
          </View>
          <Text style={[styles.sectionLabel, { color: theme.textSecondary, fontFamily: "Inter_600SemiBold", marginTop: 16 }]}>
            New Testament
          </Text>
          <View style={styles.passagePills}>
            {ntBooks.map((b) => (
              <Pressable
                key={b.id}
                onPress={() => { setSelectedBook(b); setSelectedChapter(null); setSelectedVerse(null); }}
                style={[styles.bookPill, { backgroundColor: theme.backgroundCard, borderColor: theme.border }]}
              >
                <Text style={[styles.bookPillText, { color: theme.text, fontFamily: "Inter_500Medium" }]}>
                  {b.abbreviation}
                </Text>
              </Pressable>
            ))}
          </View>
        </>
      )}

      {selectedBook && !selectedChapter && (
        <>
          <Pressable onPress={() => { setSelectedBook(null); setSelectedChapter(null); setSelectedVerse(null); }} style={styles.backRow}>
            <Ionicons name="chevron-back" size={16} color={theme.accent} />
            <Text style={[styles.backText, { color: theme.accent, fontFamily: "Inter_600SemiBold" }]}>
              All Books
            </Text>
          </Pressable>
          <Text style={[styles.pickerBookName, { color: theme.text, fontFamily: "Lora_700Bold" }]}>
            {selectedBook.name}
          </Text>
          <Text style={[styles.pickerMeta, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
            {selectedBook.chapterCount} chapters · {selectedBook.testament === "OT" ? "Old Testament" : "New Testament"}
          </Text>
          <View style={styles.chapterGrid}>
            {chapters.map((ch) => (
              <Pressable
                key={ch}
                onPress={() => { setSelectedChapter(ch); setSelectedVerse(null); }}
                style={[styles.chapterCell, { backgroundColor: theme.backgroundCard, borderColor: theme.border }]}
              >
                <Text style={[styles.chapterNum, { color: theme.text, fontFamily: "Inter_500Medium" }]}>
                  {ch}
                </Text>
              </Pressable>
            ))}
          </View>
        </>
      )}

      {selectedBook && selectedChapter && !selectedVerse && (
        <>
          <Pressable onPress={() => { setSelectedChapter(null); setSelectedVerse(null); }} style={styles.backRow}>
            <Ionicons name="chevron-back" size={16} color={theme.accent} />
            <Text style={[styles.backText, { color: theme.accent, fontFamily: "Inter_600SemiBold" }]}>
              {selectedBook.name}
            </Text>
          </Pressable>
          <Text style={[styles.pickerBookName, { color: theme.text, fontFamily: "Lora_700Bold" }]}>
            {selectedBook.name} {selectedChapter}
          </Text>
          <Text style={[styles.pickerMeta, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
            Select a verse for word study
          </Text>

          {passageQuery.isLoading && (
            <View style={styles.loadingBox}>
              <ActivityIndicator size="small" color={theme.accent} />
            </View>
          )}

          <View style={styles.chapterGrid}>
            {verses.map((v) => (
              <Pressable
                key={v.verse}
                onPress={() => setSelectedVerse(v.verse)}
                style={[styles.chapterCell, { backgroundColor: theme.backgroundCard, borderColor: theme.border }]}
              >
                <Text style={[styles.chapterNum, { color: theme.text, fontFamily: "Inter_500Medium" }]}>
                  {v.verse}
                </Text>
              </Pressable>
            ))}
          </View>
        </>
      )}

      {selectedBook && selectedChapter && selectedVerse && (
        <>
          <Pressable onPress={() => setSelectedVerse(null)} style={styles.backRow}>
            <Ionicons name="chevron-back" size={16} color={theme.accent} />
            <Text style={[styles.backText, { color: theme.accent, fontFamily: "Inter_600SemiBold" }]}>
              {selectedBook.name} {selectedChapter}
            </Text>
          </Pressable>

          {targetVerse && (
            <View style={[styles.verseCard, { backgroundColor: theme.backgroundCard, borderColor: theme.border }]}>
              <View style={styles.verseRefRow}>
                <Ionicons name="book-outline" size={14} color={theme.accent} />
                <Text style={[styles.verseRef, { color: theme.accent, fontFamily: "Inter_600SemiBold" }]}>
                  {selectedBook.name} {selectedChapter}:{selectedVerse}
                </Text>
              </View>
              <Text style={[styles.verseText, { color: theme.text, fontFamily: "Lora_400Regular" }]}>
                {targetVerse.text}
              </Text>
            </View>
          )}

          {(wordQuery.isLoading || generateWordsMutation.isPending) && targetVerse && (
            <View style={styles.loadingBox}>
              <ActivityIndicator size="small" color={theme.accent} />
              <Text style={[styles.loadingText, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
                {generateWordsMutation.isPending ? "Generating word analysis..." : "Loading word analysis..."}
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

          {targetVerse && !wordQuery.isLoading && !hasWords && !generateWordsMutation.isPending && generateWordsMutation.isError && (
            <View style={[styles.emptyBox, { backgroundColor: theme.backgroundCard, borderColor: theme.border }]}>
              <Ionicons name="reload-outline" size={24} color={theme.accent} />
              <Text style={[styles.emptyTitle, { color: theme.text, fontFamily: "Lora_600SemiBold" }]}>
                Generation Failed
              </Text>
              <Text style={[styles.emptyBody, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
                Could not generate word analysis for {selectedBook.name} {selectedChapter}:{selectedVerse}. Tap below to try again.
              </Text>
              <Pressable
                onPress={() => generateWordsMutation.mutate()}
                style={[styles.generateBtn, { backgroundColor: theme.accent }]}
              >
                <Text style={[styles.generateBtnText, { fontFamily: "Inter_600SemiBold" }]}>
                  Retry
                </Text>
              </Pressable>
            </View>
          )}
        </>
      )}
    </View>
  );
}

function ContextTab({ theme, initialBookId, initialChapter, initialBookName }: { theme: typeof Colors.light; initialBookId?: string; initialChapter?: string; initialBookName?: string }) {
  const [selectedBook, setSelectedBook] = useState<BibleBook | null>(null);
  const [selectedChapter, setSelectedChapter] = useState<number | null>(initialChapter ? parseInt(initialChapter) : null);
  const [didInit, setDidInit] = useState(false);

  const { data: books } = useQuery<BibleBook[]>({
    queryKey: ["/api/books"],
  });

  useEffect(() => {
    if (books && initialBookId && !didInit) {
      const book = books.find(b => b.id === parseInt(initialBookId));
      if (book) {
        setSelectedBook(book);
        setDidInit(true);
      }
    }
  }, [books, initialBookId, didInit]);

  const qc = useQueryClient();

  const { data: contextCards, isLoading } = useQuery<ContextCard[]>({
    queryKey: [`/api/context?book=${selectedBook?.id}&chapter=${selectedChapter}`],
    enabled: !!selectedBook && !!selectedChapter,
  });

  const generateMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/context/generate", {
        bookId: selectedBook!.id,
        chapter: selectedChapter,
      });
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: [`/api/context?book=${selectedBook?.id}&chapter=${selectedChapter}`],
      });
    },
  });

  const hasCards = contextCards && contextCards.length > 0;
  const [ctxGenAttempted, setCtxGenAttempted] = useState<string | null>(null);
  const ctxKey = selectedBook && selectedChapter ? `${selectedBook.id}_${selectedChapter}` : null;

  useEffect(() => {
    if (selectedBook && selectedChapter && !isLoading && !hasCards && !generateMutation.isPending && ctxGenAttempted !== ctxKey) {
      setCtxGenAttempted(ctxKey);
      generateMutation.mutate();
    }
  }, [selectedBook?.id, selectedChapter, isLoading, hasCards]);

  const otBooks = books?.filter((b) => b.testament === "OT") ?? [];
  const ntBooks = books?.filter((b) => b.testament === "NT") ?? [];

  const handleBookSelect = (book: BibleBook) => {
    if (selectedBook?.id === book.id) {
      setSelectedBook(null);
      setSelectedChapter(null);
    } else {
      setSelectedBook(book);
      setSelectedChapter(null);
    }
  };

  const handleChapterSelect = (ch: number) => {
    setSelectedChapter(ch);
  };

  const chapters = selectedBook
    ? Array.from({ length: selectedBook.chapterCount }, (_, i) => i + 1)
    : [];

  return (
    <View style={styles.tabContent}>
      {!selectedBook && (
        <>
          <Text style={[styles.sectionLabel, { color: theme.textSecondary, fontFamily: "Inter_600SemiBold" }]}>
            Old Testament
          </Text>
          <View style={styles.passagePills}>
            {otBooks.map((b) => (
              <Pressable
                key={b.id}
                onPress={() => handleBookSelect(b)}
                style={[styles.bookPill, { backgroundColor: theme.backgroundCard, borderColor: theme.border }]}
              >
                <Text style={[styles.bookPillText, { color: theme.text, fontFamily: "Inter_500Medium" }]}>
                  {b.abbreviation}
                </Text>
              </Pressable>
            ))}
          </View>
          <Text style={[styles.sectionLabel, { color: theme.textSecondary, fontFamily: "Inter_600SemiBold", marginTop: 16 }]}>
            New Testament
          </Text>
          <View style={styles.passagePills}>
            {ntBooks.map((b) => (
              <Pressable
                key={b.id}
                onPress={() => handleBookSelect(b)}
                style={[styles.bookPill, { backgroundColor: theme.backgroundCard, borderColor: theme.border }]}
              >
                <Text style={[styles.bookPillText, { color: theme.text, fontFamily: "Inter_500Medium" }]}>
                  {b.abbreviation}
                </Text>
              </Pressable>
            ))}
          </View>
        </>
      )}

      {selectedBook && !selectedChapter && (
        <>
          <Pressable onPress={() => { setSelectedBook(null); setSelectedChapter(null); }} style={styles.backRow}>
            <Ionicons name="chevron-back" size={16} color={theme.accent} />
            <Text style={[styles.backText, { color: theme.accent, fontFamily: "Inter_600SemiBold" }]}>
              All Books
            </Text>
          </Pressable>
          <Text style={[styles.pickerBookName, { color: theme.text, fontFamily: "Lora_700Bold" }]}>
            {selectedBook.name}
          </Text>
          <Text style={[styles.pickerMeta, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
            {selectedBook.chapterCount} chapters · {selectedBook.testament === "OT" ? "Old Testament" : "New Testament"}
          </Text>
          <View style={styles.chapterGrid}>
            {chapters.map((ch) => (
              <Pressable
                key={ch}
                onPress={() => handleChapterSelect(ch)}
                style={[styles.chapterCell, { backgroundColor: theme.backgroundCard, borderColor: theme.border }]}
              >
                <Text style={[styles.chapterNum, { color: theme.text, fontFamily: "Inter_500Medium" }]}>
                  {ch}
                </Text>
              </Pressable>
            ))}
          </View>
        </>
      )}

      {selectedBook && selectedChapter && (
        <>
          <Pressable onPress={() => setSelectedChapter(null)} style={styles.backRow}>
            <Ionicons name="chevron-back" size={16} color={theme.accent} />
            <Text style={[styles.backText, { color: theme.accent, fontFamily: "Inter_600SemiBold" }]}>
              {selectedBook.name}
            </Text>
          </Pressable>
          <Text style={[styles.pickerBookName, { color: theme.text, fontFamily: "Lora_700Bold" }]}>
            {selectedBook.name} {selectedChapter}
          </Text>

          {isLoading && (
            <View style={styles.loadingBox}>
              <ActivityIndicator size="small" color={theme.accent} />
            </View>
          )}

          {hasCards && contextCards!.map((card) => (
            <View key={card.id} style={[styles.contextCard, { backgroundColor: theme.backgroundCard, borderColor: theme.border }]}>
              <Text style={[styles.contextTitle, { color: theme.text, fontFamily: "Lora_600SemiBold" }]}>
                {card.title}
              </Text>
              <Text style={[styles.contextContent, { color: theme.textSecondary, fontFamily: "Inter_400Regular" }]}>
                {card.content}
              </Text>

              {card.historicalBackground && (
                <View style={{ marginTop: 16 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 6 }}>
                    <Ionicons name="time-outline" size={14} color={theme.accent} />
                    <Text style={{ color: theme.accent, fontSize: 11, letterSpacing: 1, textTransform: "uppercase", fontFamily: "Inter_600SemiBold" }}>
                      Historical Background
                    </Text>
                  </View>
                  <Text style={[styles.contextContent, { color: theme.textSecondary, fontFamily: "Inter_400Regular" }]}>
                    {card.historicalBackground}
                  </Text>
                </View>
              )}

              {card.culturalNotes && (
                <View style={{ marginTop: 16 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 6 }}>
                    <Ionicons name="globe-outline" size={14} color={theme.accent} />
                    <Text style={{ color: theme.accent, fontSize: 11, letterSpacing: 1, textTransform: "uppercase", fontFamily: "Inter_600SemiBold" }}>
                      Cultural Notes
                    </Text>
                  </View>
                  <Text style={[styles.contextContent, { color: theme.textSecondary, fontFamily: "Inter_400Regular" }]}>
                    {card.culturalNotes}
                  </Text>
                </View>
              )}

              {(card.authorInfo || card.dateWritten || card.audience) && (
                <View style={{ marginTop: 16, flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                  {card.authorInfo && (
                    <View style={{ backgroundColor: theme.accent + "12", borderRadius: 8, paddingVertical: 6, paddingHorizontal: 10 }}>
                      <Text style={{ color: theme.textMuted, fontSize: 10, fontFamily: "Inter_600SemiBold", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 2 }}>Author</Text>
                      <Text style={{ color: theme.textSecondary, fontSize: 12, fontFamily: "Inter_400Regular" }}>{card.authorInfo}</Text>
                    </View>
                  )}
                  {card.dateWritten && (
                    <View style={{ backgroundColor: theme.accent + "12", borderRadius: 8, paddingVertical: 6, paddingHorizontal: 10 }}>
                      <Text style={{ color: theme.textMuted, fontSize: 10, fontFamily: "Inter_600SemiBold", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 2 }}>Date</Text>
                      <Text style={{ color: theme.textSecondary, fontSize: 12, fontFamily: "Inter_400Regular" }}>{card.dateWritten}</Text>
                    </View>
                  )}
                  {card.audience && (
                    <View style={{ backgroundColor: theme.accent + "12", borderRadius: 8, paddingVertical: 6, paddingHorizontal: 10 }}>
                      <Text style={{ color: theme.textMuted, fontSize: 10, fontFamily: "Inter_600SemiBold", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 2 }}>Audience</Text>
                      <Text style={{ color: theme.textSecondary, fontSize: 12, fontFamily: "Inter_400Regular" }}>{card.audience}</Text>
                    </View>
                  )}
                </View>
              )}

              {card.themes && card.themes.length > 0 && (
                <View style={[styles.themePills, { marginTop: 16 }]}>
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

          {generateMutation.isPending && (
            <View style={[styles.emptyBox, { backgroundColor: theme.backgroundCard, borderColor: theme.border }]}>
              <ActivityIndicator size="small" color={theme.accent} />
              <Text style={[styles.emptyTitle, { color: theme.text, fontFamily: "Lora_600SemiBold" }]}>
                Generating Context
              </Text>
              <Text style={[styles.emptyBody, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
                Preparing historical and cultural context for {selectedBook.name} {selectedChapter}...
              </Text>
            </View>
          )}

          {!isLoading && !hasCards && !generateMutation.isPending && (
            <View style={[styles.emptyBox, { backgroundColor: theme.backgroundCard, borderColor: theme.border }]}>
              <Ionicons name="sparkles-outline" size={24} color={theme.accent} />
              <Text style={[styles.emptyTitle, { color: theme.text, fontFamily: "Lora_600SemiBold" }]}>
                Explore This Chapter
              </Text>
              <Text style={[styles.emptyBody, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
                Generate historical background, cultural notes, and key themes for {selectedBook.name} {selectedChapter}.
              </Text>
              <Pressable
                onPress={() => generateMutation.mutate()}
                style={({ pressed }) => [
                  {
                    marginTop: 14,
                    backgroundColor: theme.accent,
                    paddingVertical: 12,
                    paddingHorizontal: 24,
                    borderRadius: 12,
                    flexDirection: "row" as const,
                    alignItems: "center" as const,
                    gap: 8,
                    opacity: pressed ? 0.85 : 1,
                  },
                ]}
              >
                <Ionicons name="sparkles" size={16} color="#fff" />
                <Text style={{ color: "#fff", fontSize: 14, fontFamily: "Inter_600SemiBold" }}>
                  Generate Context
                </Text>
              </Pressable>
              {generateMutation.isError && (
                <Text style={[styles.emptyBody, { color: "#e74c3c", marginTop: 8, fontFamily: "Inter_400Regular" }]}>
                  Failed to generate. Please try again.
                </Text>
              )}
            </View>
          )}

        </>
      )}
    </View>
  );
}

function HistoricVoicesTab({ theme, commentators, initialBookId, initialChapter, initialBookName }: { theme: typeof Colors.light; commentators: Commentator[]; initialBookId?: string; initialChapter?: string; initialBookName?: string }) {
  const [selectedBook, setSelectedBook] = useState<BibleBook | null>(null);
  const [selectedChapter, setSelectedChapter] = useState<number | null>(initialChapter ? parseInt(initialChapter) : null);
  const [didInit, setDidInit] = useState(false);
  const [activeCommentator, setActiveCommentator] = useState<string | null>(null);

  const { data: books } = useQuery<BibleBook[]>({
    queryKey: ["/api/books"],
  });

  useEffect(() => {
    if (books && initialBookId && !didInit) {
      const book = books.find(b => b.id === parseInt(initialBookId));
      if (book) {
        setSelectedBook(book);
        setDidInit(true);
      }
    }
  }, [books, initialBookId, didInit]);

  const queryClient = useQueryClient();
  const commentaryQueryKey = `/api/commentary?book=${selectedBook?.id}&chapter=${selectedChapter}`;

  const { data: commentaryData, isLoading } = useQuery<CommentaryResult[]>({
    queryKey: [commentaryQueryKey],
    enabled: !!selectedBook && !!selectedChapter,
  });

  const generateCommentaryMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/commentary/generate", {
        bookId: selectedBook!.id,
        chapter: selectedChapter,
      });
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.setQueryData([commentaryQueryKey], data);
    },
  });

  const hasCommentary = commentaryData && commentaryData.length > 0;
  const [comGenAttempted, setComGenAttempted] = useState<string | null>(null);
  const comKey = selectedBook && selectedChapter ? `${selectedBook.id}_${selectedChapter}` : null;

  useEffect(() => {
    setActiveCommentator(null);
  }, [selectedBook?.id, selectedChapter]);

  useEffect(() => {
    if (selectedBook && selectedChapter && !isLoading && !hasCommentary && !generateCommentaryMutation.isPending && comGenAttempted !== comKey) {
      setComGenAttempted(comKey);
      generateCommentaryMutation.mutate();
    }
  }, [selectedBook?.id, selectedChapter, isLoading, hasCommentary]);

  const otBooks = books?.filter((b) => b.testament === "OT") ?? [];
  const ntBooks = books?.filter((b) => b.testament === "NT") ?? [];

  const chapters = selectedBook
    ? Array.from({ length: selectedBook.chapterCount }, (_, i) => i + 1)
    : [];

  return (
    <View style={styles.tabContent}>
      {!selectedBook && (
        <>
          <Text style={[styles.sectionLabel, { color: theme.textSecondary, fontFamily: "Inter_600SemiBold" }]}>
            Browse Commentary
          </Text>
          <View style={styles.passagePills}>
            {otBooks.map((b) => (
              <Pressable
                key={b.id}
                onPress={() => { setSelectedBook(b); setSelectedChapter(null); }}
                style={[styles.bookPill, { backgroundColor: theme.backgroundCard, borderColor: theme.border }]}
              >
                <Text style={[styles.bookPillText, { color: theme.text, fontFamily: "Inter_500Medium" }]}>
                  {b.abbreviation}
                </Text>
              </Pressable>
            ))}
            {ntBooks.map((b) => (
              <Pressable
                key={b.id}
                onPress={() => { setSelectedBook(b); setSelectedChapter(null); }}
                style={[styles.bookPill, { backgroundColor: theme.backgroundCard, borderColor: theme.border }]}
              >
                <Text style={[styles.bookPillText, { color: theme.text, fontFamily: "Inter_500Medium" }]}>
                  {b.abbreviation}
                </Text>
              </Pressable>
            ))}
          </View>

          <Text style={[styles.sectionLabel, { color: theme.textSecondary, fontFamily: "Inter_600SemiBold", marginTop: 20 }]}>
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
        </>
      )}

      {selectedBook && !selectedChapter && (
        <>
          <Pressable onPress={() => { setSelectedBook(null); setSelectedChapter(null); }} style={styles.backRow}>
            <Ionicons name="chevron-back" size={16} color={theme.accent} />
            <Text style={[styles.backText, { color: theme.accent, fontFamily: "Inter_600SemiBold" }]}>
              All Books
            </Text>
          </Pressable>
          <Text style={[styles.pickerBookName, { color: theme.text, fontFamily: "Lora_700Bold" }]}>
            {selectedBook.name}
          </Text>
          <View style={styles.chapterGrid}>
            {chapters.map((ch) => (
              <Pressable
                key={ch}
                onPress={() => setSelectedChapter(ch)}
                style={[styles.chapterCell, { backgroundColor: theme.backgroundCard, borderColor: theme.border }]}
              >
                <Text style={[styles.chapterNum, { color: theme.text, fontFamily: "Inter_500Medium" }]}>
                  {ch}
                </Text>
              </Pressable>
            ))}
          </View>
        </>
      )}

      {selectedBook && selectedChapter && (
        <>
          <Pressable onPress={() => setSelectedChapter(null)} style={styles.backRow}>
            <Ionicons name="chevron-back" size={16} color={theme.accent} />
            <Text style={[styles.backText, { color: theme.accent, fontFamily: "Inter_600SemiBold" }]}>
              {selectedBook.name}
            </Text>
          </Pressable>
          <Text style={[styles.pickerBookName, { color: theme.text, fontFamily: "Lora_700Bold" }]}>
            {selectedBook.name} {selectedChapter}
          </Text>

          {isLoading && (
            <View style={styles.loadingBox}>
              <ActivityIndicator size="small" color={theme.accent} />
            </View>
          )}

          {hasCommentary && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.commentatorFilterScroll} contentContainerStyle={styles.commentatorFilterRow}>
              <Pressable
                onPress={() => setActiveCommentator(null)}
                style={[
                  styles.commentatorChip,
                  { backgroundColor: !activeCommentator ? theme.accent : (theme.backgroundCard) },
                ]}
                testID="filter-all-commentators"
              >
                <Text style={[styles.commentatorChipText, { color: !activeCommentator ? "#fff" : theme.textSecondary, fontFamily: !activeCommentator ? "Inter_600SemiBold" : "Inter_500Medium" }]}>
                  All
                </Text>
              </Pressable>
              {Array.from(new Set(commentaryData!.map(cr => cr.commentator?.name))).filter(Boolean).map((name) => (
                <Pressable
                  key={name}
                  onPress={() => setActiveCommentator(activeCommentator === name ? null : name!)}
                  style={[
                    styles.commentatorChip,
                    { backgroundColor: activeCommentator === name ? theme.accent : (theme.backgroundCard) },
                  ]}
                  testID={`filter-commentator-${name}`}
                >
                  <Text style={[styles.commentatorChipText, { color: activeCommentator === name ? "#fff" : theme.textSecondary, fontFamily: activeCommentator === name ? "Inter_600SemiBold" : "Inter_500Medium" }]}>
                    {name}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          )}

          {hasCommentary && commentaryData!
            .filter((cr) => !activeCommentator || cr.commentator?.name === activeCommentator)
            .map((cr) => (
            <View key={cr.entry.id} style={[styles.commentaryCard, { backgroundColor: theme.backgroundCard, borderColor: theme.border }]}>
              <View style={styles.commentaryHeader}>
                <View style={[styles.avatarSmall, { backgroundColor: theme.primary }]}>
                  <Ionicons name="person" size={14} color={Colors.light.accent} />
                </View>
                <Text style={[styles.commentaryAuthor, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}>
                  {cr.commentator?.name ?? "Unknown"}
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
              <Text style={[styles.commentaryText, { color: theme.textSecondary, fontFamily: "Inter_400Regular" }]}>
                {cr.entry.content}
              </Text>
            </View>
          ))}

          {generateCommentaryMutation.isPending && (
            <View style={[styles.emptyBox, { backgroundColor: theme.backgroundCard, borderColor: theme.border }]}>
              <ActivityIndicator size="small" color={theme.accent} />
              <Text style={[styles.emptyTitle, { color: theme.text, fontFamily: "Lora_600SemiBold" }]}>
                Generating Commentary
              </Text>
              <Text style={[styles.emptyBody, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
                Creating scholarly commentary for {selectedBook.name} {selectedChapter}...
              </Text>
            </View>
          )}

          {!isLoading && !hasCommentary && !generateCommentaryMutation.isPending && (
            <View style={[styles.emptyBox, { backgroundColor: theme.backgroundCard, borderColor: theme.border }]}>
              <Ionicons name="sparkles-outline" size={24} color={theme.accent} />
              <Text style={[styles.emptyTitle, { color: theme.text, fontFamily: "Lora_600SemiBold" }]}>
                Explore Commentary
              </Text>
              <Text style={[styles.emptyBody, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
                Generate commentary from classic scholars for {selectedBook.name} {selectedChapter}.
              </Text>
              <Pressable
                onPress={() => generateCommentaryMutation.mutate()}
                style={({ pressed }) => [
                  {
                    marginTop: 14,
                    backgroundColor: theme.accent,
                    paddingVertical: 12,
                    paddingHorizontal: 24,
                    borderRadius: 12,
                    flexDirection: "row" as const,
                    alignItems: "center" as const,
                    gap: 8,
                    opacity: pressed ? 0.85 : 1,
                  },
                ]}
              >
                <Ionicons name="sparkles" size={16} color="#fff" />
                <Text style={{ color: "#fff", fontSize: 14, fontFamily: "Inter_600SemiBold" }}>
                  Generate Commentary
                </Text>
              </Pressable>
              {generateCommentaryMutation.isError && (
                <Text style={[styles.emptyBody, { color: "#e74c3c", marginTop: 8, fontFamily: "Inter_400Regular" }]}>
                  Failed to generate. Please try again.
                </Text>
              )}
            </View>
          )}
        </>
      )}
    </View>
  );
}

function ApplicationTab({ theme, initialBookId, initialChapter, initialBookName }: { theme: typeof Colors.light; initialBookId?: string; initialChapter?: string; initialBookName?: string }) {
  const [selectedBook, setSelectedBook] = useState<BibleBook | null>(null);
  const [selectedChapter, setSelectedChapter] = useState<number | null>(initialChapter ? parseInt(initialChapter) : null);
  const [didInit, setDidInit] = useState(false);

  const { data: books } = useQuery<BibleBook[]>({
    queryKey: ["/api/books"],
  });

  useEffect(() => {
    if (books && initialBookId && !didInit) {
      const book = books.find(b => b.id === parseInt(initialBookId));
      if (book) {
        setSelectedBook(book);
        setDidInit(true);
      }
    }
  }, [books, initialBookId, didInit]);

  const queryClient = useQueryClient();
  const appQueryKey = `/api/application?book=${selectedBook?.id}&chapter=${selectedChapter}`;

  const { data: templates, isLoading, isError } = useQuery<AppTemplate[]>({
    queryKey: [appQueryKey],
    enabled: !!selectedBook && !!selectedChapter,
  });

  const generateAppMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/application/generate", {
        bookId: selectedBook!.id,
        chapter: selectedChapter,
      });
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.setQueryData([appQueryKey], data);
    },
  });

  const hasData = templates && templates.length > 0;
  const template = hasData ? templates![0] : null;
  const [appGenAttempted, setAppGenAttempted] = useState<string | null>(null);
  const appKey = selectedBook && selectedChapter ? `${selectedBook.id}_${selectedChapter}` : null;

  useEffect(() => {
    if (selectedBook && selectedChapter && !isLoading && !hasData && !generateAppMutation.isPending && appGenAttempted !== appKey) {
      setAppGenAttempted(appKey);
      generateAppMutation.mutate();
    }
  }, [selectedBook?.id, selectedChapter, isLoading, hasData]);

  const otBooks = books?.filter((b) => b.testament === "OT") ?? [];
  const ntBooks = books?.filter((b) => b.testament === "NT") ?? [];

  const chapters = selectedBook
    ? Array.from({ length: selectedBook.chapterCount }, (_, i) => i + 1)
    : [];

  return (
    <View style={styles.tabContent}>
      <View style={[styles.appLayer, { backgroundColor: theme.primary }]}>
        <Text style={[styles.appLayerTitle, { fontFamily: "Lora_600SemiBold" }]}>
          Layer 4: Application
        </Text>
        <Text style={[styles.appLayerSub, { fontFamily: "Inter_400Regular" }]}>
          Bridge the ancient text to your life today -- Then vs. Now context, reflection questions, and prayer prompts.
        </Text>
      </View>

      {!selectedBook && (
        <>
          <Text style={[styles.sectionLabel, { color: theme.textSecondary, fontFamily: "Inter_600SemiBold" }]}>
            Old Testament
          </Text>
          <View style={styles.passagePills}>
            {otBooks.map((b) => (
              <Pressable
                key={b.id}
                onPress={() => { setSelectedBook(b); setSelectedChapter(null); }}
                style={[styles.bookPill, { backgroundColor: theme.backgroundCard, borderColor: theme.border }]}
              >
                <Text style={[styles.bookPillText, { color: theme.text, fontFamily: "Inter_500Medium" }]}>
                  {b.abbreviation}
                </Text>
              </Pressable>
            ))}
          </View>
          <Text style={[styles.sectionLabel, { color: theme.textSecondary, fontFamily: "Inter_600SemiBold", marginTop: 16 }]}>
            New Testament
          </Text>
          <View style={styles.passagePills}>
            {ntBooks.map((b) => (
              <Pressable
                key={b.id}
                onPress={() => { setSelectedBook(b); setSelectedChapter(null); }}
                style={[styles.bookPill, { backgroundColor: theme.backgroundCard, borderColor: theme.border }]}
              >
                <Text style={[styles.bookPillText, { color: theme.text, fontFamily: "Inter_500Medium" }]}>
                  {b.abbreviation}
                </Text>
              </Pressable>
            ))}
          </View>
        </>
      )}

      {selectedBook && !selectedChapter && (
        <>
          <Pressable onPress={() => { setSelectedBook(null); setSelectedChapter(null); }} style={styles.backRow}>
            <Ionicons name="chevron-back" size={16} color={theme.accent} />
            <Text style={[styles.backText, { color: theme.accent, fontFamily: "Inter_600SemiBold" }]}>
              All Books
            </Text>
          </Pressable>
          <Text style={[styles.pickerBookName, { color: theme.text, fontFamily: "Lora_700Bold" }]}>
            {selectedBook.name}
          </Text>
          <Text style={[styles.pickerMeta, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
            {selectedBook.chapterCount} chapters · {selectedBook.testament === "OT" ? "Old Testament" : "New Testament"}
          </Text>
          <View style={styles.chapterGrid}>
            {chapters.map((ch) => (
              <Pressable
                key={ch}
                onPress={() => setSelectedChapter(ch)}
                style={[styles.chapterCell, { backgroundColor: theme.backgroundCard, borderColor: theme.border }]}
              >
                <Text style={[styles.chapterNum, { color: theme.text, fontFamily: "Inter_500Medium" }]}>
                  {ch}
                </Text>
              </Pressable>
            ))}
          </View>
        </>
      )}

      {selectedBook && selectedChapter && (
        <>
          <Pressable onPress={() => setSelectedChapter(null)} style={styles.backRow}>
            <Ionicons name="chevron-back" size={16} color={theme.accent} />
            <Text style={[styles.backText, { color: theme.accent, fontFamily: "Inter_600SemiBold" }]}>
              {selectedBook.name}
            </Text>
          </Pressable>
          <Text style={[styles.pickerBookName, { color: theme.text, fontFamily: "Lora_700Bold" }]}>
            {selectedBook.name} {selectedChapter}
          </Text>

          {isLoading && (
            <View style={styles.loadingBox}>
              <ActivityIndicator size="small" color={theme.accent} />
            </View>
          )}

          {template && (
            <>
              {template.keyTheme && (
                <View style={[styles.categoryBadge, { backgroundColor: theme.accent + "18", alignSelf: "flex-start" }]}>
                  <Text style={[styles.categoryText, { color: theme.accent, fontFamily: "Inter_600SemiBold" }]}>
                    {template.keyTheme}
                  </Text>
                </View>
              )}

              <View style={[styles.appCard, { backgroundColor: theme.backgroundCard, borderColor: theme.border }]}>
                <View style={styles.appCardHeader}>
                  <Ionicons name="time-outline" size={16} color={theme.accent} />
                  <Text style={[styles.appCardLabel, { color: theme.accent, fontFamily: "Inter_600SemiBold" }]}>
                    Then (Historical Context)
                  </Text>
                </View>
                <Text style={[styles.appCardBody, { color: theme.textSecondary, fontFamily: "Inter_400Regular" }]}>
                  {template.thenContext}
                </Text>
              </View>

              <View style={[styles.appCard, { backgroundColor: theme.backgroundCard, borderColor: theme.border }]}>
                <View style={styles.appCardHeader}>
                  <Ionicons name="today-outline" size={16} color={theme.success} />
                  <Text style={[styles.appCardLabel, { color: theme.success, fontFamily: "Inter_600SemiBold" }]}>
                    Now (Modern Application)
                  </Text>
                </View>
                <Text style={[styles.appCardBody, { color: theme.textSecondary, fontFamily: "Inter_400Regular" }]}>
                  {template.nowApplication}
                </Text>
              </View>

              {template.reflectionQuestions && template.reflectionQuestions.length > 0 && (
                <View style={[styles.appCard, { backgroundColor: theme.backgroundCard, borderColor: theme.border }]}>
                  <View style={styles.appCardHeader}>
                    <Ionicons name="help-circle-outline" size={16} color={theme.bookmarkBlue} />
                    <Text style={[styles.appCardLabel, { color: theme.bookmarkBlue, fontFamily: "Inter_600SemiBold" }]}>
                      Reflection Questions
                    </Text>
                  </View>
                  {template.reflectionQuestions.map((q, i) => (
                    <View key={i} style={styles.questionRow}>
                      <Text style={[styles.questionNum, { color: theme.accent, fontFamily: "Inter_600SemiBold" }]}>
                        {i + 1}.
                      </Text>
                      <Text style={[styles.questionText, { color: theme.text, fontFamily: "Inter_400Regular" }]}>
                        {q}
                      </Text>
                    </View>
                  ))}
                </View>
              )}

              {template.prayerPrompt && (
                <View style={[styles.appCard, { backgroundColor: theme.primary + "12", borderColor: theme.primary + "30" }]}>
                  <View style={styles.appCardHeader}>
                    <Ionicons name="hand-left-outline" size={16} color={theme.primary} />
                    <Text style={[styles.appCardLabel, { color: theme.primary, fontFamily: "Inter_600SemiBold" }]}>
                      Prayer Prompt
                    </Text>
                  </View>
                  <Text style={[styles.appCardBody, { color: theme.text, fontFamily: "Lora_400Regular", fontStyle: "italic" as const }]}>
                    {template.prayerPrompt}
                  </Text>
                </View>
              )}
            </>
          )}

          {isError && (
            <View style={[styles.emptyBox, { backgroundColor: theme.backgroundCard, borderColor: theme.border }]}>
              <Ionicons name="warning-outline" size={24} color={theme.error} />
              <Text style={[styles.emptyTitle, { color: theme.text, fontFamily: "Lora_600SemiBold" }]}>
                Unable to Load
              </Text>
              <Text style={[styles.emptyBody, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
                Could not fetch application data for this chapter. Please check your connection and try again.
              </Text>
            </View>
          )}

          {generateAppMutation.isPending && (
            <View style={[styles.emptyBox, { backgroundColor: theme.backgroundCard, borderColor: theme.border }]}>
              <ActivityIndicator size="small" color={theme.accent} />
              <Text style={[styles.emptyTitle, { color: theme.text, fontFamily: "Lora_600SemiBold" }]}>
                Generating Application
              </Text>
              <Text style={[styles.emptyBody, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
                Creating Then & Now application study for {selectedBook.name} {selectedChapter}...
              </Text>
            </View>
          )}

          {!isLoading && !isError && !hasData && !generateAppMutation.isPending && (
            <View style={[styles.emptyBox, { backgroundColor: theme.backgroundCard, borderColor: theme.border }]}>
              <Ionicons name="sparkles-outline" size={24} color={theme.accent} />
              <Text style={[styles.emptyTitle, { color: theme.text, fontFamily: "Lora_600SemiBold" }]}>
                Apply This Chapter
              </Text>
              <Text style={[styles.emptyBody, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
                Generate a Then & Now study with reflection questions and prayer prompts for {selectedBook.name} {selectedChapter}.
              </Text>
              <Pressable
                onPress={() => generateAppMutation.mutate()}
                style={({ pressed }) => [
                  {
                    marginTop: 14,
                    backgroundColor: theme.accent,
                    paddingVertical: 12,
                    paddingHorizontal: 24,
                    borderRadius: 12,
                    flexDirection: "row" as const,
                    alignItems: "center" as const,
                    gap: 8,
                    opacity: pressed ? 0.85 : 1,
                  },
                ]}
              >
                <Ionicons name="sparkles" size={16} color="#fff" />
                <Text style={{ color: "#fff", fontSize: 14, fontFamily: "Inter_600SemiBold" }}>
                  Generate Application
                </Text>
              </Pressable>
              {generateAppMutation.isError && (
                <Text style={[styles.emptyBody, { color: "#e74c3c", marginTop: 8, fontFamily: "Inter_400Regular" }]}>
                  Failed to generate. Please try again.
                </Text>
              )}
            </View>
          )}
        </>
      )}
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
  generateBtn: {
    borderRadius: 10,
    paddingHorizontal: 20,
    paddingVertical: 10,
    marginTop: 4,
  },
  generateBtnText: { color: "#fff", fontSize: 14 },
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
  commentatorFilterScroll: { marginBottom: 14, maxHeight: 44 },
  commentatorFilterRow: { gap: 8, paddingVertical: 2 },
  commentatorChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20 },
  commentatorChipText: { fontSize: 12 },
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
  bookPill: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  bookPillText: { fontSize: 12 },
  backRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 4,
  },
  backText: { fontSize: 14 },
  pickerBookName: { fontSize: 22, marginBottom: 4 },
  pickerMeta: { fontSize: 13, marginBottom: 12 },
  chapterGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 8,
  },
  chapterCell: {
    width: 44,
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  chapterNum: { fontSize: 14 },
  appCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    gap: 10,
  },
  appCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 2,
  },
  appCardLabel: { fontSize: 12, letterSpacing: 0.3 },
  appCardBody: { fontSize: 14, lineHeight: 22 },
  questionRow: {
    flexDirection: "row",
    gap: 8,
    paddingVertical: 4,
  },
  questionNum: { fontSize: 14, width: 20, textAlign: "right" as const },
  questionText: { fontSize: 14, lineHeight: 22, flex: 1 },
  studyModeToggle: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 16,
  },
  studyModeBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  studyModeBtnText: {
    fontSize: 13,
  },
  concordanceSearchBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    marginBottom: 10,
  },
  concordanceInput: {
    flex: 1,
    fontSize: 15,
    paddingVertical: 2,
  },
  concordanceLangRow: {
    marginBottom: 12,
    flexGrow: 0,
  },
  concordanceEmpty: {
    alignItems: "center",
    paddingVertical: 40,
    gap: 10,
  },
  concordanceEmptyTitle: {
    fontSize: 20,
    marginTop: 4,
  },
  concordanceEmptyText: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
    paddingHorizontal: 20,
  },
  concordanceCard: {
    padding: 14,
    borderRadius: 12,
    marginBottom: 10,
  },
  concordanceCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  concordanceLemma: {
    fontSize: 20,
  },
  concordanceLangBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  concordanceLangText: {
    fontSize: 10,
    textTransform: "uppercase" as const,
    letterSpacing: 0.5,
  },
  concordanceIdBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  concordanceIdText: {
    fontSize: 10,
    letterSpacing: 0.3,
  },
  concordanceTranslit: {
    fontSize: 13,
    marginBottom: 6,
  },
  concordanceDef: {
    fontSize: 14,
    lineHeight: 20,
  },
  concordanceSubLabel: {
    fontSize: 11,
    textTransform: "uppercase" as const,
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  concordanceSubText: {
    fontSize: 13,
    lineHeight: 19,
  },
  kjvUsagePills: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 4,
  },
  kjvUsagePill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  kjvUsagePillText: {
    fontSize: 12,
  },
});
