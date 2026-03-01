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
} from "react-native";
import { Stack, router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import Colors from "@/constants/colors";

interface Belief {
  number: number;
  title: string;
  summary: string;
  scriptures: { ref: string; bookId: number; chapter: number }[];
  egwLink: string;
  category: string;
}

const CATEGORIES = [
  { id: "all", label: "All" },
  { id: "god", label: "God" },
  { id: "humanity", label: "Humanity" },
  { id: "salvation", label: "Salvation" },
  { id: "church", label: "Church" },
  { id: "life", label: "Christian Life" },
  { id: "last", label: "Last Things" },
];

const BELIEFS: Belief[] = [
  {
    number: 1, title: "The Holy Scriptures", category: "god",
    summary: "The Holy Scriptures, Old and New Testaments, are the written Word of God, given by divine inspiration. The inspired authors spoke and wrote as they were moved by the Holy Spirit.",
    scriptures: [
      { ref: "2 Timothy 3:16-17", bookId: 55, chapter: 3 },
      { ref: "2 Peter 1:20-21", bookId: 61, chapter: 1 },
      { ref: "Psalm 119:105", bookId: 19, chapter: 119 },
    ],
    egwLink: "https://egwwritings.org/read?panels=p132.1",
  },
  {
    number: 2, title: "The Trinity", category: "god",
    summary: "There is one God: Father, Son, and Holy Spirit, a unity of three coeternal Persons. God is immortal, all-powerful, all-knowing, above all, and ever present.",
    scriptures: [
      { ref: "Deuteronomy 6:4", bookId: 5, chapter: 6 },
      { ref: "Matthew 28:19", bookId: 40, chapter: 28 },
      { ref: "2 Corinthians 13:14", bookId: 47, chapter: 13 },
    ],
    egwLink: "https://egwwritings.org/read?panels=p132.13",
  },
  {
    number: 3, title: "The Father", category: "god",
    summary: "God the eternal Father is the Creator, Source, Sustainer, and Sovereign of all creation. He is just and holy, merciful and gracious, slow to anger, abounding in steadfast love and faithfulness.",
    scriptures: [
      { ref: "Genesis 1:1", bookId: 1, chapter: 1 },
      { ref: "John 3:16", bookId: 43, chapter: 3 },
      { ref: "1 John 4:8", bookId: 62, chapter: 4 },
    ],
    egwLink: "https://egwwritings.org/read?panels=p132.24",
  },
  {
    number: 4, title: "The Son", category: "god",
    summary: "God the eternal Son became incarnate in Jesus Christ. Through Him all things were created, the character of God is revealed, the salvation of humanity is accomplished, and the world is judged.",
    scriptures: [
      { ref: "John 1:1-3,14", bookId: 43, chapter: 1 },
      { ref: "Colossians 1:15-19", bookId: 51, chapter: 1 },
      { ref: "Hebrews 1:1-3", bookId: 58, chapter: 1 },
    ],
    egwLink: "https://egwwritings.org/read?panels=p132.35",
  },
  {
    number: 5, title: "The Holy Spirit", category: "god",
    summary: "God the eternal Spirit was active with the Father and the Son in Creation, incarnation, and redemption. He draws and convicts human beings; and those who respond He renews and transforms.",
    scriptures: [
      { ref: "Genesis 1:1-2", bookId: 1, chapter: 1 },
      { ref: "John 14:16-18", bookId: 43, chapter: 14 },
      { ref: "Acts 1:8", bookId: 44, chapter: 1 },
    ],
    egwLink: "https://egwwritings.org/read?panels=p132.55",
  },
  {
    number: 6, title: "Creation", category: "humanity",
    summary: "God has revealed in Scripture the authentic and historical account of His creative activity. He created the universe, and in six days the Lord made the earth and all living things upon it, and rested on the seventh day.",
    scriptures: [
      { ref: "Genesis 1-2", bookId: 1, chapter: 1 },
      { ref: "Exodus 20:8-11", bookId: 2, chapter: 20 },
      { ref: "Psalm 33:6,9", bookId: 19, chapter: 33 },
    ],
    egwLink: "https://egwwritings.org/read?panels=p132.64",
  },
  {
    number: 7, title: "The Nature of Humanity", category: "humanity",
    summary: "Man and woman were made in the image of God with individuality, the power and freedom to think and to do. Though created free beings, each is an indivisible unity of body, mind, and spirit.",
    scriptures: [
      { ref: "Genesis 1:26-28", bookId: 1, chapter: 1 },
      { ref: "Psalm 8:4-8", bookId: 19, chapter: 8 },
      { ref: "Acts 17:24-28", bookId: 44, chapter: 17 },
    ],
    egwLink: "https://egwwritings.org/read?panels=p132.80",
  },
  {
    number: 8, title: "The Great Controversy", category: "salvation",
    summary: "All humanity is now involved in a great controversy between Christ and Satan regarding the character of God, His law, and His sovereignty over the universe.",
    scriptures: [
      { ref: "Revelation 12:7-9", bookId: 66, chapter: 12 },
      { ref: "Isaiah 14:12-14", bookId: 23, chapter: 14 },
      { ref: "Job 1:6-12", bookId: 18, chapter: 1 },
    ],
    egwLink: "https://egwwritings.org/read?panels=p132.91",
  },
  {
    number: 9, title: "The Life, Death, and Resurrection of Christ", category: "salvation",
    summary: "In Christ's life of perfect obedience to God's will, His suffering, death, and resurrection, God provided the only means of atonement for human sin.",
    scriptures: [
      { ref: "John 3:16", bookId: 43, chapter: 3 },
      { ref: "Romans 6:23", bookId: 45, chapter: 6 },
      { ref: "1 Corinthians 15:3-4", bookId: 46, chapter: 15 },
    ],
    egwLink: "https://egwwritings.org/read?panels=p132.103",
  },
  {
    number: 10, title: "The Experience of Salvation", category: "salvation",
    summary: "In infinite love and mercy God made Christ, who knew no sin, to be sin for us, so that in Him we might be made the righteousness of God.",
    scriptures: [
      { ref: "2 Corinthians 5:17-21", bookId: 47, chapter: 5 },
      { ref: "Ephesians 2:8-10", bookId: 49, chapter: 2 },
      { ref: "Romans 8:1-4", bookId: 45, chapter: 8 },
    ],
    egwLink: "https://egwwritings.org/read?panels=p132.119",
  },
  {
    number: 11, title: "Growing in Christ", category: "salvation",
    summary: "By His death on the cross Jesus triumphed over the forces of evil. Through the Holy Spirit we are given power to claim victory over sin in our daily lives.",
    scriptures: [
      { ref: "Colossians 1:13-14", bookId: 51, chapter: 1 },
      { ref: "Ephesians 6:10-18", bookId: 49, chapter: 6 },
      { ref: "1 John 4:4", bookId: 62, chapter: 4 },
    ],
    egwLink: "https://egwwritings.org/read?panels=p132.139",
  },
  {
    number: 12, title: "The Church", category: "church",
    summary: "The church is the community of believers who confess Jesus Christ as Lord and Saviour. Christ is the Head of the body of believers which is the church.",
    scriptures: [
      { ref: "Ephesians 1:22-23", bookId: 49, chapter: 1 },
      { ref: "Matthew 16:18", bookId: 40, chapter: 16 },
      { ref: "1 Corinthians 12:12-27", bookId: 46, chapter: 12 },
    ],
    egwLink: "https://egwwritings.org/read?panels=p132.149",
  },
  {
    number: 13, title: "The Remnant and Its Mission", category: "church",
    summary: "The universal church is composed of all who truly believe in Christ, but in the last days a remnant has been called out to keep the commandments of God and the faith of Jesus.",
    scriptures: [
      { ref: "Revelation 12:17", bookId: 66, chapter: 12 },
      { ref: "Revelation 14:6-12", bookId: 66, chapter: 14 },
      { ref: "2 Corinthians 5:10", bookId: 47, chapter: 5 },
    ],
    egwLink: "https://egwwritings.org/read?panels=p132.163",
  },
  {
    number: 14, title: "Unity in the Body of Christ", category: "church",
    summary: "The church is one body with many members, called from every nation, kindred, tongue, and people. In Christ we are a new creation.",
    scriptures: [
      { ref: "Ephesians 4:1-6", bookId: 49, chapter: 4 },
      { ref: "John 17:20-23", bookId: 43, chapter: 17 },
      { ref: "Galatians 3:27-29", bookId: 48, chapter: 3 },
    ],
    egwLink: "https://egwwritings.org/read?panels=p132.176",
  },
  {
    number: 15, title: "Baptism", category: "church",
    summary: "By baptism we confess our faith in the death and resurrection of Jesus Christ, and testify of our death to sin and of our purpose to walk in newness of life.",
    scriptures: [
      { ref: "Matthew 28:19-20", bookId: 40, chapter: 28 },
      { ref: "Romans 6:1-6", bookId: 45, chapter: 6 },
      { ref: "Acts 2:38", bookId: 44, chapter: 2 },
    ],
    egwLink: "https://egwwritings.org/read?panels=p132.187",
  },
  {
    number: 16, title: "The Lord's Supper", category: "church",
    summary: "The Lord's Supper is a participation in the emblems of the body and blood of Jesus as an expression of faith in Him, our Lord and Saviour.",
    scriptures: [
      { ref: "1 Corinthians 11:23-26", bookId: 46, chapter: 11 },
      { ref: "Matthew 26:17-30", bookId: 40, chapter: 26 },
      { ref: "John 6:48-63", bookId: 43, chapter: 6 },
    ],
    egwLink: "https://egwwritings.org/read?panels=p132.199",
  },
  {
    number: 17, title: "Spiritual Gifts and Ministries", category: "church",
    summary: "God bestows upon all members of His church in every age spiritual gifts which each member is to employ in loving ministry for the common good of the church and of humanity.",
    scriptures: [
      { ref: "1 Corinthians 12:4-11", bookId: 46, chapter: 12 },
      { ref: "Romans 12:4-8", bookId: 45, chapter: 12 },
      { ref: "Ephesians 4:11-13", bookId: 49, chapter: 4 },
    ],
    egwLink: "https://egwwritings.org/read?panels=p132.212",
  },
  {
    number: 18, title: "The Gift of Prophecy", category: "church",
    summary: "The Scriptures testify that one of the gifts of the Holy Spirit is prophecy. This gift is an identifying mark of the remnant church and was manifested in the ministry of Ellen G. White.",
    scriptures: [
      { ref: "Joel 2:28-29", bookId: 29, chapter: 2 },
      { ref: "Revelation 19:10", bookId: 66, chapter: 19 },
      { ref: "Amos 3:7", bookId: 30, chapter: 3 },
    ],
    egwLink: "https://egwwritings.org/read?panels=p132.225",
  },
  {
    number: 19, title: "The Law of God", category: "life",
    summary: "The great principles of God's law are embodied in the Ten Commandments and exemplified in the life of Christ. They express God's will and purposes concerning human conduct and relationships.",
    scriptures: [
      { ref: "Exodus 20:1-17", bookId: 2, chapter: 20 },
      { ref: "Matthew 22:36-40", bookId: 40, chapter: 22 },
      { ref: "Romans 13:8-10", bookId: 45, chapter: 13 },
    ],
    egwLink: "https://egwwritings.org/read?panels=p132.235",
  },
  {
    number: 20, title: "The Sabbath", category: "life",
    summary: "The gracious Creator, after the six days of Creation, rested on the seventh day and instituted the Sabbath for all people as a memorial of Creation. The fourth commandment requires the observance of this seventh-day Sabbath.",
    scriptures: [
      { ref: "Genesis 2:1-3", bookId: 1, chapter: 2 },
      { ref: "Exodus 20:8-11", bookId: 2, chapter: 20 },
      { ref: "Mark 2:27-28", bookId: 41, chapter: 2 },
      { ref: "Isaiah 58:13-14", bookId: 23, chapter: 58 },
    ],
    egwLink: "https://egwwritings.org/read?panels=p132.249",
  },
  {
    number: 21, title: "Stewardship", category: "life",
    summary: "We are God's stewards, entrusted by Him with time and opportunities, abilities and possessions, and the blessings of the earth and its resources.",
    scriptures: [
      { ref: "Genesis 1:26-28", bookId: 1, chapter: 1 },
      { ref: "Malachi 3:8-12", bookId: 39, chapter: 3 },
      { ref: "1 Corinthians 9:9-14", bookId: 46, chapter: 9 },
    ],
    egwLink: "https://egwwritings.org/read?panels=p132.266",
  },
  {
    number: 22, title: "Christian Behavior", category: "life",
    summary: "We are called to be a godly people who think, feel, and act in harmony with biblical principles in all aspects of personal and social life.",
    scriptures: [
      { ref: "Romans 12:1-2", bookId: 45, chapter: 12 },
      { ref: "1 John 2:6", bookId: 62, chapter: 2 },
      { ref: "1 Corinthians 6:19-20", bookId: 46, chapter: 6 },
    ],
    egwLink: "https://egwwritings.org/read?panels=p132.278",
  },
  {
    number: 23, title: "Marriage and the Family", category: "life",
    summary: "Marriage was divinely established in Eden and affirmed by Jesus to be a lifelong union between a man and a woman in loving companionship.",
    scriptures: [
      { ref: "Genesis 2:18-25", bookId: 1, chapter: 2 },
      { ref: "Matthew 19:3-9", bookId: 40, chapter: 19 },
      { ref: "Ephesians 5:21-33", bookId: 49, chapter: 5 },
    ],
    egwLink: "https://egwwritings.org/read?panels=p132.292",
  },
  {
    number: 24, title: "Christ's Ministry in the Heavenly Sanctuary", category: "last",
    summary: "There is a sanctuary in heaven, the true tabernacle which the Lord set up and not man. In it Christ ministers on our behalf, making available to believers the benefits of His atoning sacrifice.",
    scriptures: [
      { ref: "Hebrews 8:1-5", bookId: 58, chapter: 8 },
      { ref: "Hebrews 9:11-28", bookId: 58, chapter: 9 },
      { ref: "Daniel 8:14", bookId: 27, chapter: 8 },
    ],
    egwLink: "https://egwwritings.org/read?panels=p132.306",
  },
  {
    number: 25, title: "The Second Coming of Christ", category: "last",
    summary: "The second coming of Christ is the blessed hope of the church, the grand climax of the gospel. The Saviour's coming will be literal, personal, visible, and worldwide.",
    scriptures: [
      { ref: "John 14:1-3", bookId: 43, chapter: 14 },
      { ref: "Acts 1:9-11", bookId: 44, chapter: 1 },
      { ref: "1 Thessalonians 4:16-17", bookId: 52, chapter: 4 },
      { ref: "Revelation 1:7", bookId: 66, chapter: 1 },
    ],
    egwLink: "https://egwwritings.org/read?panels=p132.322",
  },
  {
    number: 26, title: "Death and Resurrection", category: "last",
    summary: "The wages of sin is death. But God, who alone is immortal, will grant eternal life to His redeemed. Until that day death is an unconscious state for all people.",
    scriptures: [
      { ref: "Romans 6:23", bookId: 45, chapter: 6 },
      { ref: "Ecclesiastes 9:5-6", bookId: 21, chapter: 9 },
      { ref: "1 Thessalonians 4:13-17", bookId: 52, chapter: 4 },
      { ref: "John 11:11-14", bookId: 43, chapter: 11 },
    ],
    egwLink: "https://egwwritings.org/read?panels=p132.337",
  },
  {
    number: 27, title: "The Millennium and the End of Sin", category: "last",
    summary: "The millennium is the thousand-year reign of Christ with His saints in heaven between the first and second resurrections. At its close the wicked dead are raised and sin is forever destroyed.",
    scriptures: [
      { ref: "Revelation 20:1-10", bookId: 66, chapter: 20 },
      { ref: "Revelation 21:1-5", bookId: 66, chapter: 21 },
      { ref: "Malachi 4:1", bookId: 39, chapter: 4 },
    ],
    egwLink: "https://egwwritings.org/read?panels=p132.351",
  },
  {
    number: 28, title: "The New Earth", category: "last",
    summary: "On the new earth, in which righteousness dwells, God will provide an eternal home for the redeemed and a perfect environment for everlasting life, love, joy, and learning in His presence.",
    scriptures: [
      { ref: "2 Peter 3:13", bookId: 61, chapter: 3 },
      { ref: "Revelation 21:1-7", bookId: 66, chapter: 21 },
      { ref: "Isaiah 65:17-25", bookId: 23, chapter: 65 },
    ],
    egwLink: "https://egwwritings.org/read?panels=p132.365",
  },
];

const CATEGORY_COLORS: Record<string, string> = {
  god: "#5B86E5",
  humanity: "#2E7D32",
  salvation: "#C9933A",
  church: "#8B5CF6",
  life: "#E8456B",
  last: "#1565C0",
};

export default function SDAStudiesScreen() {
  const colorScheme = useColorScheme();
  const theme = colorScheme === "dark" ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();
  const topPadding = Platform.OS === "web" ? 67 : insets.top;
  const bottomPadding = Platform.OS === "web" ? 34 : 0;

  const [activeCategory, setActiveCategory] = useState("all");
  const [expandedBelief, setExpandedBelief] = useState<number | null>(null);

  const filtered = activeCategory === "all"
    ? BELIEFS
    : BELIEFS.filter((b) => b.category === activeCategory);

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={[styles.header, { paddingTop: topPadding + 10 }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn} testID="sda-back">
          <Ionicons name="chevron-back" size={22} color={theme.text} />
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={[styles.headerTitle, { color: theme.text, fontFamily: "Lora_700Bold" }]}>
            Fundamental Beliefs
          </Text>
          <Text style={[styles.headerSubtitle, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
            28 Core Doctrines
          </Text>
        </View>
        <View style={{ width: 34 }} />
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.categoryRow}
        contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}
      >
        {CATEGORIES.map((cat) => (
          <Pressable
            key={cat.id}
            onPress={() => setActiveCategory(cat.id)}
            style={[
              styles.categoryChip,
              {
                backgroundColor: activeCategory === cat.id
                  ? theme.accent
                  : theme.backgroundCard,
              },
            ]}
          >
            <Text
              style={[
                styles.categoryChipText,
                {
                  color: activeCategory === cat.id ? "#fff" : theme.textSecondary,
                  fontFamily: activeCategory === cat.id ? "Inter_600SemiBold" : "Inter_500Medium",
                },
              ]}
            >
              {cat.label}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      <ScrollView
        style={styles.content}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: bottomPadding + 30 }}
        showsVerticalScrollIndicator={false}
      >
        {filtered.map((belief) => {
          const isExpanded = expandedBelief === belief.number;
          const catColor = CATEGORY_COLORS[belief.category] || theme.accent;
          return (
            <Pressable
              key={belief.number}
              onPress={() => setExpandedBelief(isExpanded ? null : belief.number)}
              style={[styles.beliefCard, { backgroundColor: theme.backgroundCard }]}
              testID={`belief-${belief.number}`}
            >
              <View style={styles.beliefHeader}>
                <View style={[styles.beliefNumber, { backgroundColor: catColor + "20" }]}>
                  <Text style={[styles.beliefNumberText, { color: catColor, fontFamily: "Inter_700Bold" }]}>
                    {belief.number}
                  </Text>
                </View>
                <View style={styles.beliefTitleArea}>
                  <Text style={[styles.beliefTitle, { color: theme.text, fontFamily: "Lora_600SemiBold" }]}>
                    {belief.title}
                  </Text>
                  <View style={[styles.beliefCatBadge, { backgroundColor: catColor + "15" }]}>
                    <Text style={[styles.beliefCatText, { color: catColor, fontFamily: "Inter_600SemiBold" }]}>
                      {CATEGORIES.find((c) => c.id === belief.category)?.label}
                    </Text>
                  </View>
                </View>
                <Ionicons
                  name={isExpanded ? "chevron-up" : "chevron-down"}
                  size={16}
                  color={theme.textMuted}
                />
              </View>

              <Text
                style={[styles.beliefSummary, { color: theme.textSecondary, fontFamily: "Inter_400Regular" }]}
                numberOfLines={isExpanded ? undefined : 2}
              >
                {belief.summary}
              </Text>

              {isExpanded && (
                <>
                  <View style={styles.scripturesSection}>
                    <Text style={[styles.sectionLabel, { color: theme.accent, fontFamily: "Inter_600SemiBold" }]}>
                      Key Scriptures
                    </Text>
                    {belief.scriptures.map((s, i) => (
                      <Pressable
                        key={i}
                        onPress={() => router.push(`/read/${s.bookId}/${s.chapter}` as any)}
                        style={styles.scriptureRow}
                      >
                        <Ionicons name="book-outline" size={14} color={theme.accent} />
                        <Text style={[styles.scriptureRef, { color: theme.text, fontFamily: "Inter_500Medium" }]}>
                          {s.ref}
                        </Text>
                        <Ionicons name="chevron-forward" size={12} color={theme.textMuted} />
                      </Pressable>
                    ))}
                  </View>

                  <Pressable
                    onPress={() => Linking.openURL(belief.egwLink)}
                    style={[styles.egwButton, { backgroundColor: theme.accent + "15" }]}
                    testID="egw-link"
                  >
                    <Ionicons name="library-outline" size={16} color={theme.accent} />
                    <Text style={[styles.egwButtonText, { color: theme.accent, fontFamily: "Inter_600SemiBold" }]}>
                      Read in Ellen G. White Writings
                    </Text>
                    <Ionicons name="open-outline" size={14} color={theme.accent} />
                  </Pressable>
                </>
              )}
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 10,
  },
  backBtn: { width: 34, height: 34, justifyContent: "center", alignItems: "center" },
  headerCenter: { flex: 1, alignItems: "center" },
  headerTitle: { fontSize: 20 },
  headerSubtitle: { fontSize: 12, marginTop: 2 },
  categoryRow: { flexGrow: 0, marginBottom: 12 },
  categoryChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 16,
  },
  categoryChipText: { fontSize: 13 },
  content: { flex: 1 },
  beliefCard: {
    padding: 16,
    borderRadius: 14,
    marginBottom: 10,
  },
  beliefHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 8,
  },
  beliefNumber: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  beliefNumberText: { fontSize: 14 },
  beliefTitleArea: { flex: 1, gap: 4 },
  beliefTitle: { fontSize: 16 },
  beliefCatBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  beliefCatText: { fontSize: 10, textTransform: "uppercase" as const, letterSpacing: 0.5 },
  beliefSummary: { fontSize: 14, lineHeight: 21 },
  scripturesSection: { marginTop: 14, gap: 6 },
  sectionLabel: { fontSize: 11, textTransform: "uppercase" as const, letterSpacing: 0.5, marginBottom: 4 },
  scriptureRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 6,
  },
  scriptureRef: { flex: 1, fontSize: 14 },
  egwButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    marginTop: 12,
  },
  egwButtonText: { flex: 1, fontSize: 13 },
});
