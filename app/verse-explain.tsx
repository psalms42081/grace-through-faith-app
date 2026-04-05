import React, { useMemo, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Linking,
  Platform,
  Image,
} from "react-native";
import { router, useLocalSearchParams, Stack } from "expo-router";
import { safeGoBack } from "@/lib/safe-back";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/contexts/AuthContext";

const GOLD = "#C9933A";

const BP_YOUTUBE_IDS: Record<string, string> = {
  "genesis-1-11": "KOUV7YlzhZQ",
  "genesis-12-50": "F4isSyennFo",
  "exodus-1-18": "jH_aojNJM3E",
  "exodus-19-40": "oNpTha80yyE",
  "leviticus": "IJ-FekWUZzE",
  "numbers": "tp5MIrMZFqo",
  "deuteronomy": "q5QEH9bH8AU",
  "joshua": "JqOqJlFF_eU",
  "judges": "kOYy8iCfIJ4",
  "ruth": "0h1eoBeR4Jk",
  "1-samuel": "QJOju5Dw0V0",
  "2-samuel": "YvoWDXNDJgs",
  "1-kings": "bVFW3wbi9pk",
  "2-kings": "zez_T9EGe1Q",
  "chronicles": "HR7xaHv3Ias",
  "ezra-nehemiah": "MkETkRv9tG8",
  "esther": "JydNSlufRIs",
  "job": "GswSg2ohqmA",
  "psalms": "j9phNEaPrv8",
  "proverbs": "Gab04dPs_9A",
  "ecclesiastes": "lrsQ1tc-2wk",
  "song-of-songs": "4KC7xE4fgOw",
  "isaiah-1-39": "d0A6Uchb1F8",
  "isaiah-40-66": "ZIGnXAZiu7o",
  "jeremiah": "RSK36cHbrk0",
  "lamentations": "p8GDFPdaQZQ",
  "ezekiel-1-33": "R-CIPu1nko8",
  "ezekiel-34-48": "SDeCWW_Bnyw",
  "daniel": "9cSC9uobtPM",
  "hosea": "kE6SZ1ogOVU",
  "joel": "zQLazbgd30E",
  "amos": "mGgWaPGpGa4",
  "obadiah": "i4ogCrEoG5s",
  "jonah": "dLIabZc0O4c",
  "micah": "MFEUEcylwLc",
  "nahum": "Y30DanA5EhU",
  "habakkuk": "OPMaRqGJPUU",
  "zephaniah": "oFZknKPNvZk",
  "haggai": "juPvv_xcX-U",
  "zechariah": "_106IfO6Kc0",
  "malachi": "HPGShWZ4Jvk",
  "matthew-1-13": "3Dv4-n6OYGI",
  "matthew-14-28": "GGCF3OPWN14",
  "mark": "HGHqu9-DtXk",
  "luke-1-9": "XIb_dCIxzr0",
  "luke-10-24": "26z_KhwNdD8",
  "john-1-12": "G-2e9mMf7E8",
  "john-13-21": "RUfh_wOsauk",
  "acts-1-12": "CGbNw855ksw",
  "acts-13-28": "Z-17KxpjL0Q",
  "romans-1-4": "ej_6dVdJSIU",
  "romans-5-16": "0SVTl4Xa5fY",
  "1-corinthians": "yiHf8klCCc4",
  "2-corinthians": "3aeK-A90sNE",
  "galatians": "vmx4UjRFp0M",
  "ephesians": "Y71r-T98E2Q",
  "philippians": "oE9qqW1-BkU",
  "colossians": "pXTXlDxQRGI",
  "1-thessalonians": "No7Nq6IX23c",
  "2-thessalonians": "kbPBMT1cJIo",
  "1-timothy": "7RoqnGcEjcs",
  "2-timothy": "urlvnxCaL00",
  "titus": "PUEYCVXJM3k",
  "philemon": "aW9Q3Jt6Yvk",
  "hebrews": "1fNWTZZwgbs",
  "james": "qn-hLHWwRYY",
  "1-peter": "WhP7AZQlzCk",
  "2-peter": "wWLv_ITyKYc",
  "1-3-john": "l3QkE6nKylM",
  "jude": "6UoCmakZmys",
  "revelation-1-11": "5nvVVcYD-0w",
  "revelation-12-22": "QpnIrbq2bKo",
  "image-of-god": "YbipxLDtY8c",
  "the-law": "3BGO9Mmd7OE",
  "holiness": "l9vn413ReWE",
  "justice-of-god": "A14THPoc4-4",
  "messiah": "3dEh25pduQ8",
  "grace": "U-40sOun060",
  "the-temple": "wTnq6I3jUAc",
  "sabbath-full": "PFTLvkB3JLM",
  "covenants": "8ferLnxdGkQ",
  "holy-spirit": "oNNZO9i1Gjc",
  "sacrifice-and-atonement": "G_OlRWGLdnw",
  "faith": "7S8YCpJkpEU",
  "khesed-love": "daw1udYIz9E",
  "hope": "uuDk-DPnFGQ",
  "heaven-and-earth": "Zy2AQlK6C5k",
  "gospel-of-the-kingdom": "xmFPS0j-900",
  "the-gospel-of-the-kingdom": "xmFPS0j-900",
  "son-of-man": "z6cWEcqxhlI",
  "the-satan-and-demons": "CamYtVpoTNk",
  "angel": "1YMz2tdxo1I",
};

function getBPThumbnail(url: string): string | null {
  const match = url.match(/\/video\/([^/]+)\/?$/);
  if (!match) return null;
  const slug = match[1];
  const ytId = BP_YOUTUBE_IDS[slug];
  if (ytId) return `https://img.youtube.com/vi/${ytId}/mqdefault.jpg`;
  return null;
}

const BIBLE_PROJECT_BOOK_VIDEOS: Record<string, { title: string; url: string; type: string }[]> = {
  Genesis: [
    { title: "Book of Genesis Overview (Part 1)", url: "https://bibleproject.com/explore/video/genesis-1-11/", type: "overview" },
    { title: "Book of Genesis Overview (Part 2)", url: "https://bibleproject.com/explore/video/genesis-12-50/", type: "overview" },
    { title: "Image of God", url: "https://bibleproject.com/explore/video/image-of-god/", type: "theme" },
  ],
  Exodus: [
    { title: "Book of Exodus Overview (Part 1)", url: "https://bibleproject.com/explore/video/exodus-1-18/", type: "overview" },
    { title: "Book of Exodus Overview (Part 2)", url: "https://bibleproject.com/explore/video/exodus-19-40/", type: "overview" },
    { title: "The Law", url: "https://bibleproject.com/explore/video/the-law/", type: "theme" },
  ],
  Leviticus: [
    { title: "Book of Leviticus", url: "https://bibleproject.com/explore/video/leviticus/", type: "overview" },
    { title: "Holiness", url: "https://bibleproject.com/explore/video/holiness/", type: "theme" },
  ],
  Numbers: [
    { title: "Book of Numbers", url: "https://bibleproject.com/explore/video/numbers/", type: "overview" },
  ],
  Deuteronomy: [
    { title: "Book of Deuteronomy", url: "https://bibleproject.com/explore/video/deuteronomy/", type: "overview" },
    { title: "The Shema", url: "https://bibleproject.com/explore/video/shema-listen/", type: "theme" },
  ],
  Joshua: [{ title: "Book of Joshua", url: "https://bibleproject.com/explore/video/joshua/", type: "overview" }],
  Judges: [{ title: "Book of Judges", url: "https://bibleproject.com/explore/video/judges/", type: "overview" }],
  Ruth: [{ title: "Book of Ruth", url: "https://bibleproject.com/explore/video/ruth/", type: "overview" }],
  "1 Samuel": [{ title: "1 Samuel", url: "https://bibleproject.com/explore/video/1-samuel/", type: "overview" }],
  "2 Samuel": [{ title: "2 Samuel", url: "https://bibleproject.com/explore/video/2-samuel/", type: "overview" }],
  "1 Kings": [{ title: "1 Kings", url: "https://bibleproject.com/explore/video/1-kings/", type: "overview" }],
  "2 Kings": [{ title: "2 Kings", url: "https://bibleproject.com/explore/video/2-kings/", type: "overview" }],
  "1 Chronicles": [{ title: "1-2 Chronicles", url: "https://bibleproject.com/explore/video/chronicles/", type: "overview" }],
  "2 Chronicles": [{ title: "1-2 Chronicles", url: "https://bibleproject.com/explore/video/chronicles/", type: "overview" }],
  Ezra: [{ title: "Ezra-Nehemiah", url: "https://bibleproject.com/explore/video/ezra-nehemiah/", type: "overview" }],
  Nehemiah: [{ title: "Ezra-Nehemiah", url: "https://bibleproject.com/explore/video/ezra-nehemiah/", type: "overview" }],
  Esther: [{ title: "Book of Esther", url: "https://bibleproject.com/explore/video/esther/", type: "overview" }],
  Job: [
    { title: "Book of Job", url: "https://bibleproject.com/explore/video/job/", type: "overview" },
    { title: "Justice of God", url: "https://bibleproject.com/explore/video/justice-of-god/", type: "theme" },
  ],
  Psalms: [
    { title: "Book of Psalms", url: "https://bibleproject.com/explore/video/psalms/", type: "overview" },
  ],
  Proverbs: [{ title: "Book of Proverbs", url: "https://bibleproject.com/explore/video/proverbs/", type: "overview" }],
  Ecclesiastes: [{ title: "Book of Ecclesiastes", url: "https://bibleproject.com/explore/video/ecclesiastes/", type: "overview" }],
  "Song of Solomon": [{ title: "Song of Songs", url: "https://bibleproject.com/explore/video/song-of-songs/", type: "overview" }],
  Isaiah: [
    { title: "Isaiah Overview (Part 1)", url: "https://bibleproject.com/explore/video/isaiah-1-39/", type: "overview" },
    { title: "Isaiah Overview (Part 2)", url: "https://bibleproject.com/explore/video/isaiah-40-66/", type: "overview" },
    { title: "Messiah", url: "https://bibleproject.com/explore/video/messiah/", type: "theme" },
  ],
  Jeremiah: [
    { title: "Book of Jeremiah", url: "https://bibleproject.com/explore/video/jeremiah/", type: "overview" },
  ],
  Lamentations: [{ title: "Book of Lamentations", url: "https://bibleproject.com/explore/video/lamentations/", type: "overview" }],
  Ezekiel: [
    { title: "Ezekiel Overview (Part 1)", url: "https://bibleproject.com/explore/video/ezekiel-1-33/", type: "overview" },
    { title: "Ezekiel Overview (Part 2)", url: "https://bibleproject.com/explore/video/ezekiel-34-48/", type: "overview" },
  ],
  Daniel: [{ title: "Book of Daniel", url: "https://bibleproject.com/explore/video/daniel/", type: "overview" }],
  Hosea: [{ title: "Book of Hosea", url: "https://bibleproject.com/explore/video/hosea/", type: "overview" }],
  Joel: [{ title: "Book of Joel", url: "https://bibleproject.com/explore/video/joel/", type: "overview" }],
  Amos: [{ title: "Book of Amos", url: "https://bibleproject.com/explore/video/amos/", type: "overview" }],
  Obadiah: [{ title: "Book of Obadiah", url: "https://bibleproject.com/explore/video/obadiah/", type: "overview" }],
  Jonah: [{ title: "Book of Jonah", url: "https://bibleproject.com/explore/video/jonah/", type: "overview" }],
  Micah: [{ title: "Book of Micah", url: "https://bibleproject.com/explore/video/micah/", type: "overview" }],
  Nahum: [{ title: "Book of Nahum", url: "https://bibleproject.com/explore/video/nahum/", type: "overview" }],
  Habakkuk: [{ title: "Book of Habakkuk", url: "https://bibleproject.com/explore/video/habakkuk/", type: "overview" }],
  Zephaniah: [{ title: "Book of Zephaniah", url: "https://bibleproject.com/explore/video/zephaniah/", type: "overview" }],
  Haggai: [{ title: "Book of Haggai", url: "https://bibleproject.com/explore/video/haggai/", type: "overview" }],
  Zechariah: [{ title: "Book of Zechariah", url: "https://bibleproject.com/explore/video/zechariah/", type: "overview" }],
  Malachi: [{ title: "Book of Malachi", url: "https://bibleproject.com/explore/video/malachi/", type: "overview" }],
  Matthew: [
    { title: "Matthew Overview (Part 1)", url: "https://bibleproject.com/explore/video/matthew-1-13/", type: "overview" },
    { title: "Matthew Overview (Part 2)", url: "https://bibleproject.com/explore/video/matthew-14-28/", type: "overview" },
    { title: "Son of Man", url: "https://bibleproject.com/explore/video/son-of-man/", type: "theme" },
  ],
  Mark: [{ title: "Book of Mark", url: "https://bibleproject.com/explore/video/mark/", type: "overview" }],
  Luke: [
    { title: "Luke Overview (Part 1)", url: "https://bibleproject.com/explore/video/luke-1-9/", type: "overview" },
    { title: "Luke Overview (Part 2)", url: "https://bibleproject.com/explore/video/luke-10-24/", type: "overview" },
    { title: "Gospel", url: "https://bibleproject.com/explore/video/the-gospel-of-the-kingdom/", type: "theme" },
  ],
  John: [
    { title: "John Overview (Part 1)", url: "https://bibleproject.com/explore/video/john-1-12/", type: "overview" },
    { title: "John Overview (Part 2)", url: "https://bibleproject.com/explore/video/john-13-21/", type: "overview" },
    { title: "The Covenants", url: "https://bibleproject.com/explore/video/covenants/", type: "theme" },
  ],
  Acts: [
    { title: "Acts Overview (Part 1)", url: "https://bibleproject.com/explore/video/acts-1-12/", type: "overview" },
    { title: "Acts Overview (Part 2)", url: "https://bibleproject.com/explore/video/acts-13-28/", type: "overview" },
    { title: "Holy Spirit", url: "https://bibleproject.com/explore/video/holy-spirit/", type: "theme" },
  ],
  Romans: [
    { title: "Romans Overview (Part 1)", url: "https://bibleproject.com/explore/video/romans-1-4/", type: "overview" },
    { title: "Romans Overview (Part 2)", url: "https://bibleproject.com/explore/video/romans-5-16/", type: "overview" },
    { title: "Grace", url: "https://bibleproject.com/explore/video/grace/", type: "theme" },
  ],
  "1 Corinthians": [{ title: "1 Corinthians", url: "https://bibleproject.com/explore/video/1-corinthians/", type: "overview" }],
  "2 Corinthians": [{ title: "2 Corinthians", url: "https://bibleproject.com/explore/video/2-corinthians/", type: "overview" }],
  Galatians: [{ title: "Book of Galatians", url: "https://bibleproject.com/explore/video/galatians/", type: "overview" }],
  Ephesians: [{ title: "Book of Ephesians", url: "https://bibleproject.com/explore/video/ephesians/", type: "overview" }],
  Philippians: [{ title: "Book of Philippians", url: "https://bibleproject.com/explore/video/philippians/", type: "overview" }],
  Colossians: [{ title: "Book of Colossians", url: "https://bibleproject.com/explore/video/colossians/", type: "overview" }],
  "1 Thessalonians": [{ title: "1 Thessalonians", url: "https://bibleproject.com/explore/video/1-thessalonians/", type: "overview" }],
  "2 Thessalonians": [{ title: "2 Thessalonians", url: "https://bibleproject.com/explore/video/2-thessalonians/", type: "overview" }],
  "1 Timothy": [{ title: "1 Timothy", url: "https://bibleproject.com/explore/video/1-timothy/", type: "overview" }],
  "2 Timothy": [{ title: "2 Timothy", url: "https://bibleproject.com/explore/video/2-timothy/", type: "overview" }],
  Titus: [{ title: "Book of Titus", url: "https://bibleproject.com/explore/video/titus/", type: "overview" }],
  Philemon: [{ title: "Book of Philemon", url: "https://bibleproject.com/explore/video/philemon/", type: "overview" }],
  Hebrews: [{ title: "Book of Hebrews", url: "https://bibleproject.com/explore/video/hebrews/", type: "overview" }],
  James: [{ title: "Book of James", url: "https://bibleproject.com/explore/video/james/", type: "overview" }],
  "1 Peter": [{ title: "1 Peter", url: "https://bibleproject.com/explore/video/1-peter/", type: "overview" }],
  "2 Peter": [{ title: "2 Peter", url: "https://bibleproject.com/explore/video/2-peter/", type: "overview" }],
  "1 John": [{ title: "1-3 John", url: "https://bibleproject.com/explore/video/1-3-john/", type: "overview" }],
  "2 John": [{ title: "1-3 John", url: "https://bibleproject.com/explore/video/1-3-john/", type: "overview" }],
  "3 John": [{ title: "1-3 John", url: "https://bibleproject.com/explore/video/1-3-john/", type: "overview" }],
  Jude: [{ title: "Book of Jude", url: "https://bibleproject.com/explore/video/jude/", type: "overview" }],
  Revelation: [
    { title: "Revelation Overview (Part 1)", url: "https://bibleproject.com/explore/video/revelation-1-11/", type: "overview" },
    { title: "Revelation Overview (Part 2)", url: "https://bibleproject.com/explore/video/revelation-12-22/", type: "overview" },
    { title: "Heaven & Earth", url: "https://bibleproject.com/explore/video/heaven-and-earth/", type: "theme" },
  ],
};

const THEME_VIDEOS = [
  { title: "The Messiah", url: "https://bibleproject.com/explore/video/messiah/", keywords: ["christ", "messiah", "anointed", "savior", "saviour", "lord", "jesus"] },
  { title: "Holiness", url: "https://bibleproject.com/explore/video/holiness/", keywords: ["holy", "holiness", "sanctif", "pure", "clean"] },
  { title: "Grace", url: "https://bibleproject.com/explore/video/grace/", keywords: ["grace", "mercy", "compassion", "forgive", "forgiven"] },
  { title: "Justice of God", url: "https://bibleproject.com/explore/video/justice-of-god/", keywords: ["justice", "righteous", "judge", "judgment"] },
  { title: "The Temple", url: "https://bibleproject.com/explore/video/the-temple/", keywords: ["temple", "tabernacle", "sanctuary", "altar"] },
  { title: "Sabbath", url: "https://bibleproject.com/explore/video/sabbath-full/", keywords: ["sabbath", "rest", "seventh day"] },
  { title: "Covenant", url: "https://bibleproject.com/explore/video/covenants/", keywords: ["covenant", "promise", "oath", "sworn"] },
  { title: "The Holy Spirit", url: "https://bibleproject.com/explore/video/holy-spirit/", keywords: ["spirit", "holy spirit", "comforter", "helper"] },
  { title: "Sacrifice & Atonement", url: "https://bibleproject.com/explore/video/sacrifice-and-atonement/", keywords: ["sacrifice", "atone", "blood", "lamb", "offering"] },
  { title: "Faith", url: "https://bibleproject.com/explore/video/faith/", keywords: ["faith", "believe", "trust"] },
  { title: "Love", url: "https://bibleproject.com/explore/video/khesed-love/", keywords: ["love", "lovingkindness", "steadfast love"] },
  { title: "Hope", url: "https://bibleproject.com/explore/video/hope/", keywords: ["hope", "wait", "endure"] },
  { title: "Gospel of the Kingdom", url: "https://bibleproject.com/explore/video/the-gospel-of-the-kingdom/", keywords: ["gospel", "kingdom", "king", "reign"] },
  { title: "Heaven & Earth", url: "https://bibleproject.com/explore/video/heaven-and-earth/", keywords: ["heaven", "earth", "creation", "new earth", "paradise"] },
];

export default function VerseExplainScreen() {
  const { bookId, chapter, verse, text, bookName, verseId, translation } =
    useLocalSearchParams<{
      bookId: string;
      chapter: string;
      verse: string;
      text: string;
      bookName: string;
      verseId: string;
      translation: string;
    }>();

  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const { userId } = useAuth();

  const reference = bookName && chapter && verse
    ? `${bookName} ${chapter}:${verse}`
    : "Selected Verse";
  const txLabel = translation || "KJV";

  // AI explanations disabled — BibleProject videos are the primary resource
  const aiExplanation = null;
  const isExplaining = false;
  const explainError = false;

  const bookVideos = useMemo(() => {
    if (!bookName) return [];
    return BIBLE_PROJECT_BOOK_VIDEOS[bookName] || [];
  }, [bookName]);

  const themeVideos = useMemo(() => {
    if (!text) return [];
    const lower = text.toLowerCase();
    return THEME_VIDEOS.filter(tv =>
      tv.keywords.some(kw => lower.includes(kw))
    ).slice(0, 3);
  }, [text]);

  const allVideos = useMemo(() => {
    const seen = new Set<string>();
    const combined: { title: string; url: string; type: string }[] = [];
    [...bookVideos, ...themeVideos.map(tv => ({ ...tv, type: "theme" }))].forEach(v => {
      if (!seen.has(v.url)) {
        seen.add(v.url);
        combined.push(v);
      }
    });
    return combined;
  }, [bookVideos, themeVideos]);

  const openVideo = useCallback((url: string) => {
    Linking.openURL(url).catch(() => {});
  }, []);

  const textColor = isDark ? "#F5F0E8" : "#1A1A1A";
  const cardBg = isDark ? "#141416" : "#FAFAF8";
  const borderColor = isDark ? "#222" : "#EEE";
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  return (
    <>
      <Stack.Screen
        options={{
          title: `Explain: ${reference}`,
          headerShown: false,
        }}
      />
      <View style={[styles.container, { backgroundColor: isDark ? "#0A0A0A" : "#FFFFFF" }]}>
        <View style={[styles.header, { paddingTop: insets.top + (Platform.OS === "web" ? 67 : 8) }]}>
          <Pressable
            onPress={() => safeGoBack(router)}
            hitSlop={12}
            style={styles.backBtn}
          >
            <Ionicons name="arrow-back" size={22} color={textColor} />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={[styles.headerTitle, { color: textColor }]} numberOfLines={1}>
              {reference}
            </Text>
          </View>
          <Pressable
            onPress={() => {
              router.push({ pathname: "/verse-actions" as any, params: { bookId, bookName, chapter, verse, verseId, text, translation } });
            }}
            hitSlop={12}
            style={styles.actionsBtn}
          >
            <Ionicons name="ellipsis-horizontal" size={20} color={isDark ? "#888" : "#666"} />
          </Pressable>
        </View>

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={[styles.content, { paddingBottom: bottomPad + 20 }]}
          showsVerticalScrollIndicator={false}
        >
          <View style={[styles.verseCard, { backgroundColor: cardBg, borderColor }]}>
            <Text style={[styles.verseRef, { color: GOLD }]}>{reference}</Text>
            <Text style={[styles.verseText, { color: textColor }]}>{text}</Text>
            <View style={[styles.translationTag, { backgroundColor: GOLD + "12" }]}>
              <Text style={[styles.translationText, { color: GOLD }]}>{txLabel}</Text>
            </View>
          </View>

          <View style={[styles.explanationCard, { backgroundColor: cardBg, borderColor }]}>
            <View style={styles.explanationHeader}>
              <Ionicons name="bulb" size={16} color={GOLD} />
              <Text style={[styles.sectionTitle, { color: GOLD }]}>About This Passage</Text>
            </View>
            <Text style={[styles.explanationText, { color: isDark ? "#AAA" : "#666" }]}>
              Explore the videos below to understand the context and meaning of {bookName}. BibleProject creates short animated videos walking through every book of the Bible and its key themes.
            </Text>
          </View>

          {allVideos.length > 0 && (
            <>
              <Text style={[styles.sectionLabel, { color: isDark ? "#888" : "#999" }]}>
                BIBLEPROJECT VIDEOS
              </Text>
              {allVideos.map((video, i) => (
                <Pressable
                  key={video.url + i}
                  onPress={() => openVideo(video.url)}
                  style={({ pressed }) => [
                    styles.videoCard,
                    { backgroundColor: cardBg, borderColor, opacity: pressed ? 0.8 : 1 },
                  ]}
                >
                  {(() => {
                    const thumb = getBPThumbnail(video.url);
                    return thumb ? (
                      <View style={styles.videoThumbWrap}>
                        <Image source={{ uri: thumb }} style={styles.videoThumb} resizeMode="cover" />
                        <View style={styles.videoPlayOverlay}>
                          <Ionicons name="play" size={16} color="#FFF" />
                        </View>
                      </View>
                    ) : (
                      <View style={[styles.videoIconBg, { backgroundColor: GOLD + "18" }]}>
                        <Ionicons name="play-circle" size={28} color={GOLD} />
                      </View>
                    );
                  })()}
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.videoTitle, { color: textColor }]} numberOfLines={2}>
                      {video.title}
                    </Text>
                    <Text style={[styles.videoMeta, { color: isDark ? "#666" : "#999" }]}>
                      {video.type === "overview" ? "Book Overview" : "Theme Video"} · BibleProject
                    </Text>
                  </View>
                  <Ionicons name="open-outline" size={16} color={isDark ? "#555" : "#BBB"} />
                </Pressable>
              ))}
            </>
          )}

          <Pressable
            onPress={() => openVideo(`https://bibleproject.com/explore/${(bookName || "genesis").toLowerCase().replace(/\s+/g, "-")}/`)}
            style={({ pressed }) => [
              styles.moreBtn,
              { borderColor: GOLD + "40", opacity: pressed ? 0.7 : 1 },
            ]}
          >
            <Ionicons name="globe-outline" size={16} color={GOLD} />
            <Text style={[styles.moreBtnText, { color: GOLD }]}>
              Explore more on BibleProject.com
            </Text>
          </Pressable>

        </ScrollView>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 12,
  },
  backBtn: { padding: 4 },
  actionsBtn: { padding: 6 },
  headerTitle: {
    fontSize: 16,
    fontFamily: "Lora_600SemiBold",
  },
  content: { padding: 20 },
  verseCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
  },
  verseRef: { fontSize: 12, marginBottom: 12, letterSpacing: 0.3, fontFamily: "Inter_500Medium" },
  verseText: { fontSize: 17, lineHeight: 30.6, fontFamily: "Lora_400Regular" },
  translationTag: {
    alignSelf: "flex-start",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginTop: 14,
  },
  translationText: { fontSize: 10, letterSpacing: 0.5, fontFamily: "Inter_600SemiBold" },
  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  loadingText: { fontSize: 13, fontFamily: "Inter_400Regular" },
  explanationCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 18,
    marginBottom: 24,
  },
  explanationHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  sectionTitle: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  explanationText: {
    fontSize: 15,
    lineHeight: 24,
    fontFamily: "Inter_400Regular",
  },
  sectionLabel: {
    fontSize: 11,
    letterSpacing: 1,
    marginBottom: 12,
    fontFamily: "Inter_600SemiBold",
  },
  videoCard: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    gap: 14,
  },
  videoThumbWrap: {
    width: 80,
    height: 48,
    borderRadius: 8,
    overflow: "hidden" as const,
    position: "relative" as const,
  },
  videoThumb: {
    width: 80,
    height: 48,
    borderRadius: 8,
  },
  videoPlayOverlay: {
    position: "absolute" as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    backgroundColor: "rgba(0,0,0,0.35)",
    borderRadius: 8,
  },
  videoIconBg: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  videoTitle: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    marginBottom: 3,
  },
  videoMeta: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
  },
  moreBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 14,
    marginTop: 8,
    marginBottom: 28,
  },
  moreBtnText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  retryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginTop: 12,
    alignSelf: "flex-start",
  },
  retryText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
});
