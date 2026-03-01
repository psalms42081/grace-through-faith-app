import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  useColorScheme,
  Platform,
  Linking,
} from "react-native";
import { router, Stack } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import Colors from "@/constants/colors";

interface ContentItem {
  title: string;
  source: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  url: string;
}

interface FamilySection {
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  gradient: [string, string];
  description: string;
  items: ContentItem[];
}

interface FamilyVerse {
  reference: string;
  text: string;
  bookId: number;
  chapter: number;
}

const FAMILY_VERSES: FamilyVerse[] = [
  { reference: "Proverbs 22:6", text: "Train up a child in the way he should go: and when he is old, he will not depart from it.", bookId: 20, chapter: 22 },
  { reference: "Deuteronomy 6:6-7", text: "And these words, which I command thee this day, shall be in thine heart: And thou shalt teach them diligently unto thy children.", bookId: 5, chapter: 6 },
  { reference: "Ephesians 5:25", text: "Husbands, love your wives, even as Christ also loved the church, and gave himself for it.", bookId: 49, chapter: 5 },
  { reference: "Psalm 127:3", text: "Lo, children are an heritage of the Lord: and the fruit of the womb is his reward.", bookId: 19, chapter: 127 },
  { reference: "Colossians 3:18-21", text: "Wives, submit yourselves unto your own husbands, as it is fit in the Lord. Husbands, love your wives, and be not bitter against them. Children, obey your parents in all things: for this is well pleasing unto the Lord. Fathers, provoke not your children to anger, lest they be discouraged.", bookId: 51, chapter: 3 },
  { reference: "Joshua 24:15", text: "But as for me and my house, we will serve the Lord.", bookId: 6, chapter: 24 },
  { reference: "Proverbs 31:28-29", text: "Her children arise up, and call her blessed; her husband also, and he praiseth her. Many daughters have done virtuously, but thou excellest them all.", bookId: 20, chapter: 31 },
  { reference: "1 Timothy 5:8", text: "But if any provide not for his own, and specially for those of his own house, he hath denied the faith, and is worse than an infidel.", bookId: 54, chapter: 5 },
];

const FAMILY_SECTIONS: FamilySection[] = [
  {
    title: "Marriage & Relationships",
    icon: "heart",
    gradient: ["#E8456B", "#C2185B"],
    description: "Building strong, Christ-centered marriages",
    items: [
      { title: "The Secret to a Great Marriage", source: "Joel Osteen", icon: "play-circle", description: "Keys to keeping your marriage strong and thriving", url: "https://www.youtube.com/results?search_query=Joel+Osteen+secret+great+marriage+sermon" },
      { title: "Love and Respect", source: "Joyce Meyer", icon: "play-circle", description: "Building mutual love and respect in your relationship", url: "https://www.youtube.com/results?search_query=Joyce+Meyer+love+respect+marriage" },
      { title: "Marriage God's Way", source: "Tony Evans", icon: "play-circle", description: "God's blueprint for a covenant marriage", url: "https://www.youtube.com/results?search_query=Tony+Evans+marriage+Gods+way" },
      { title: "Communication in Marriage", source: "Charles Stanley", icon: "play-circle", description: "How to truly listen and connect with your spouse", url: "https://www.youtube.com/results?search_query=Charles+Stanley+communication+marriage" },
      { title: "Keys to a Happy Marriage", source: "3ABN Today", icon: "tv", description: "Biblical principles for a lasting marriage", url: "https://www.youtube.com/results?search_query=3ABN+Today+marriage+keys+happy" },
      { title: "Forgiveness in Relationships", source: "Lysa TerKeurst", icon: "play-circle", description: "Healing broken trust and restoring love", url: "https://www.youtube.com/results?search_query=Lysa+TerKeurst+forgiveness+relationships+marriage" },
    ],
  },
  {
    title: "Parenting with Purpose",
    icon: "people",
    gradient: ["#5B86E5", "#36D1DC"],
    description: "Raising children in faith and wisdom",
    items: [
      { title: "Raising Confident Kids", source: "Joel Osteen", icon: "play-circle", description: "Helping your children believe in who God made them to be", url: "https://www.youtube.com/results?search_query=Joel+Osteen+raising+confident+kids" },
      { title: "Parenting Without Regrets", source: "Joyce Meyer", icon: "play-circle", description: "Being the parent God called you to be", url: "https://www.youtube.com/results?search_query=Joyce+Meyer+parenting+without+regrets" },
      { title: "Raising Kingdom Kids", source: "Tony Evans", icon: "play-circle", description: "Raising children with a kingdom mindset", url: "https://www.youtube.com/results?search_query=Tony+Evans+raising+kingdom+kids" },
      { title: "Teaching Kids to Pray", source: "Priscilla Shirer", icon: "play-circle", description: "Helping children develop a vibrant prayer life", url: "https://www.youtube.com/results?search_query=Priscilla+Shirer+teaching+kids+pray" },
      { title: "Raising Godly Children", source: "Charles Stanley", icon: "play-circle", description: "Practical wisdom for Christian parents", url: "https://www.youtube.com/results?search_query=Charles+Stanley+raising+godly+children" },
      { title: "Teen Faith & Identity", source: "3ABN Today Family", icon: "tv", description: "Guiding teens through questions of faith", url: "https://www.youtube.com/results?search_query=3ABN+Today+Family+teen+faith+identity" },
    ],
  },
  {
    title: "Family Devotionals",
    icon: "book",
    gradient: ["#C9933A", "#A87828"],
    description: "Growing together in God's Word as a family",
    items: [
      { title: "Family Bible Time", source: "Rick Warren", icon: "play-circle", description: "Making Bible study a family habit", url: "https://www.youtube.com/results?search_query=Rick+Warren+family+Bible+study+time" },
      { title: "Bible Stories for Kids", source: "Saddleback Kids", icon: "play-circle", description: "Engaging animated Bible stories for children", url: "https://www.youtube.com/results?search_query=Saddleback+Kids+Bible+stories" },
      { title: "The Bible Project", source: "The Bible Project", icon: "play-circle", description: "Beautiful visual overviews of every book of the Bible", url: "https://www.youtube.com/results?search_query=The+Bible+Project+overview" },
      { title: "Family Worship Ideas", source: "Doug Batchelor - Amazing Facts", icon: "play-circle", description: "Creative ways to make family worship engaging", url: "https://www.youtube.com/results?search_query=Doug+Batchelor+family+worship+ideas" },
      { title: "Veggie Tales Bible Stories", source: "VeggieTales", icon: "play-circle", description: "Fun faith-based animation for young children", url: "https://www.youtube.com/results?search_query=VeggieTales+Bible+stories+kids" },
      { title: "Family Bible Study Hour", source: "3ABN", icon: "tv", description: "Weekly Bible study for the whole family", url: "https://www.youtube.com/results?search_query=3ABN+family+Bible+study+hour" },
    ],
  },
  {
    title: "Health & Wellness",
    icon: "fitness",
    gradient: ["#2E7D32", "#66BB6A"],
    description: "Caring for your family's physical and spiritual health",
    items: [
      { title: "The Daniel Plan", source: "Rick Warren", icon: "play-circle", description: "God's prescription for your health — body, mind, and spirit", url: "https://www.youtube.com/results?search_query=Rick+Warren+Daniel+Plan+health" },
      { title: "Taking Care of Your Temple", source: "Joyce Meyer", icon: "play-circle", description: "Honoring God with your body and health", url: "https://www.youtube.com/results?search_query=Joyce+Meyer+taking+care+your+temple+body" },
      { title: "Mental Health & Faith", source: "T.D. Jakes", icon: "play-circle", description: "Faith-based approaches to mental wellness", url: "https://www.youtube.com/results?search_query=TD+Jakes+mental+health+faith+sermon" },
      { title: "God's Plan for Health", source: "3ABN", icon: "tv", description: "Biblical principles for healthy living", url: "https://www.youtube.com/results?search_query=3ABN+Gods+plan+health+living" },
      { title: "Stress and the Believer", source: "Charles Stanley", icon: "play-circle", description: "Managing stress through faith and Scripture", url: "https://www.youtube.com/results?search_query=Charles+Stanley+stress+believer+sermon" },
    ],
  },
  {
    title: "Faith TV & Sermons",
    icon: "tv",
    gradient: ["#1A1F3C", "#0D1025"],
    description: "Christian programming for the whole family",
    items: [
      { title: "Joel Osteen Ministries", source: "Joel Osteen", icon: "tv", description: "Uplifting messages from Lakewood Church", url: "https://www.youtube.com/results?search_query=Joel+Osteen+latest+sermon" },
      { title: "Joyce Meyer Ministries", source: "Joyce Meyer", icon: "tv", description: "Practical teaching for everyday Christian living", url: "https://www.youtube.com/results?search_query=Joyce+Meyer+latest+teaching" },
      { title: "The Potter's House", source: "T.D. Jakes", icon: "tv", description: "Powerful sermons from Bishop T.D. Jakes", url: "https://www.youtube.com/results?search_query=TD+Jakes+Potters+House+sermon" },
      { title: "In Touch Ministries", source: "Charles Stanley", icon: "tv", description: "Bible teaching from Dr. Charles Stanley", url: "https://www.youtube.com/results?search_query=Charles+Stanley+In+Touch+sermon" },
      { title: "The Alternative", source: "Tony Evans", icon: "tv", description: "Urban-focused Bible teaching ministry", url: "https://www.youtube.com/results?search_query=Tony+Evans+The+Alternative+sermon" },
      { title: "3ABN Live", source: "3ABN", icon: "tv", description: "Three Angels Broadcasting Network programming", url: "https://3abn.org/watch" },
      { title: "Amazing Facts TV", source: "Amazing Facts", icon: "tv", description: "Bible prophecy and evangelistic content", url: "https://www.amazingfacts.org/media-library" },
      { title: "It Is Written", source: "It Is Written", icon: "tv", description: "Classic Bible-based television ministry", url: "https://www.youtube.com/results?search_query=It+Is+Written+ministry+sermon" },
    ],
  },
];

export default function FamilyScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const theme = isDark ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const openLink = (url: string) => {
    Linking.openURL(url);
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: "",
          headerStyle: { backgroundColor: theme.background },
          headerShadowVisible: false,
          headerTintColor: theme.text,
        }}
      />
      <ScrollView
        style={[styles.container, { backgroundColor: theme.background }]}
        contentContainerStyle={{ paddingBottom: bottomPad + 40 }}
        showsVerticalScrollIndicator={false}
      >
        <LinearGradient
          colors={["#5B86E5", "#1A3A6B"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroCard}
        >
          <Ionicons name="people" size={44} color="rgba(255,255,255,0.9)" />
          <Text style={[styles.heroTitle, { fontFamily: "Lora_700Bold" }]}>Family & Faith</Text>
          <Text style={[styles.heroDesc, { fontFamily: "Inter_400Regular" }]}>
            Christian content for marriage, parenting, and growing together in Christ
          </Text>
          <View style={styles.heroBadgeRow}>
            <View style={styles.heroBadge}>
              <Text style={[styles.heroBadgeText, { fontFamily: "Inter_600SemiBold" }]}>Sermons</Text>
            </View>
            <View style={styles.heroBadge}>
              <Text style={[styles.heroBadgeText, { fontFamily: "Inter_600SemiBold" }]}>Teaching</Text>
            </View>
            <View style={styles.heroBadge}>
              <Text style={[styles.heroBadgeText, { fontFamily: "Inter_600SemiBold" }]}>Faith TV</Text>
            </View>
          </View>
        </LinearGradient>

        <View style={styles.versesSection}>
          <Text style={[styles.sectionTitle, { color: theme.text, fontFamily: "Lora_700Bold" }]}>
            Scripture for Families
          </Text>
          {FAMILY_VERSES.map((v, i) => (
            <Pressable
              key={i}
              onPress={() => router.push(`/read/${v.bookId}/${v.chapter}`)}
              style={({ pressed }) => [
                styles.verseCard,
                { backgroundColor: isDark ? theme.backgroundCard : "#FFFDF6", opacity: pressed ? 0.8 : 1 },
              ]}
            >
              <View style={styles.verseCardHeader}>
                <View style={[styles.verseRefBadge, { backgroundColor: "#5B86E518" }]}>
                  <Text style={[styles.verseRef, { color: "#5B86E5", fontFamily: "Inter_700Bold" }]}>{v.reference}</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={theme.textMuted} />
              </View>
              <Text style={[styles.verseText, { color: theme.text, fontFamily: "Lora_400Regular" }]} numberOfLines={3}>
                {v.text}
              </Text>
            </Pressable>
          ))}
        </View>

        {FAMILY_SECTIONS.map((section, secIdx) => (
          <View key={secIdx} style={styles.contentSection}>
            <View style={styles.sectionHeader}>
              <LinearGradient
                colors={section.gradient}
                style={styles.sectionIconWrap}
              >
                <Ionicons name={section.icon} size={18} color="#fff" />
              </LinearGradient>
              <View style={styles.sectionInfo}>
                <Text style={[styles.sectionTitle, { color: theme.text, fontFamily: "Lora_700Bold" }]}>
                  {section.title}
                </Text>
                <Text style={[styles.sectionDesc, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
                  {section.description}
                </Text>
              </View>
            </View>

            {section.items.map((item, idx) => (
              <Pressable
                key={idx}
                onPress={() => openLink(item.url)}
                style={({ pressed }) => [
                  styles.contentItem,
                  { backgroundColor: isDark ? theme.backgroundCard : "#FFFDF6", opacity: pressed ? 0.8 : 1 },
                ]}
              >
                <LinearGradient
                  colors={section.gradient}
                  style={styles.contentItemIcon}
                >
                  <Ionicons name={item.icon} size={14} color="#fff" />
                </LinearGradient>
                <View style={styles.contentItemInfo}>
                  <Text style={[styles.contentItemTitle, { color: theme.text, fontFamily: "Inter_600SemiBold" }]} numberOfLines={1}>
                    {item.title}
                  </Text>
                  <Text style={[styles.contentItemSource, { color: theme.accent, fontFamily: "Inter_400Regular" }]} numberOfLines={1}>
                    {item.source}
                  </Text>
                  <Text style={[styles.contentItemDesc, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]} numberOfLines={1}>
                    {item.description}
                  </Text>
                </View>
                <Ionicons name="open-outline" size={16} color={theme.textMuted} />
              </Pressable>
            ))}
          </View>
        ))}
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  heroCard: {
    marginHorizontal: 22,
    marginTop: 8,
    borderRadius: 24,
    padding: 32,
    alignItems: "center",
    gap: 12,
  },
  heroTitle: { color: "#fff", fontSize: 28 },
  heroDesc: { color: "rgba(255,255,255,0.85)", fontSize: 15, lineHeight: 22, textAlign: "center" },
  heroBadgeRow: { flexDirection: "row", gap: 8, marginTop: 4 },
  heroBadge: {
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  heroBadgeText: { color: "#fff", fontSize: 12 },
  versesSection: {
    paddingHorizontal: 22,
    paddingTop: 28,
    gap: 12,
  },
  verseCard: {
    borderRadius: 18,
    padding: 18,
  },
  verseCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  verseRefBadge: {
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  verseRef: { fontSize: 13 },
  verseText: { fontSize: 16, lineHeight: 26 },
  contentSection: {
    paddingHorizontal: 22,
    marginTop: 28,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginBottom: 16,
  },
  sectionIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  sectionInfo: { flex: 1 },
  sectionTitle: { fontSize: 20, marginBottom: 2 },
  sectionDesc: { fontSize: 12 },
  contentItem: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    padding: 14,
    gap: 12,
    marginBottom: 8,
  },
  contentItemIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  contentItemInfo: { flex: 1 },
  contentItemTitle: { fontSize: 15, marginBottom: 1 },
  contentItemSource: { fontSize: 12, marginBottom: 2 },
  contentItemDesc: { fontSize: 11 },
});
