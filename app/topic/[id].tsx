import React, { useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  useColorScheme,
  Platform,
} from "react-native";
import { router, useLocalSearchParams, Stack } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import Colors from "@/constants/colors";

interface TopicVerse {
  reference: string;
  text: string;
  bookId: number;
  chapter: number;
}

interface TopicData {
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  gradient: [string, string];
  description: string;
  verses: TopicVerse[];
}

const TOPICS: Record<string, TopicData> = {
  love: {
    title: "Love",
    icon: "heart",
    gradient: ["#E8456B", "#C2185B"],
    description: "God's unfailing love for us and how we are called to love one another.",
    verses: [
      { reference: "John 3:16", text: "For God so loved the world, that he gave his only begotten Son, that whosoever believeth in him should not perish, but have everlasting life.", bookId: 43, chapter: 3 },
      { reference: "1 Corinthians 13:4-7", text: "Charity suffereth long, and is kind; charity envieth not; charity vaunteth not itself, is not puffed up, Doth not behave itself unseemly, seeketh not her own, is not easily provoked, thinketh no evil; Rejoiceth not in iniquity, but rejoiceth in the truth; Beareth all things, believeth all things, hopeth all things, endureth all things.", bookId: 46, chapter: 13 },
      { reference: "Romans 8:38-39", text: "For I am persuaded, that neither death, nor life, nor angels, nor principalities, nor powers, nor things present, nor things to come, Nor height, nor depth, nor any other creature, shall be able to separate us from the love of God, which is in Christ Jesus our Lord.", bookId: 45, chapter: 8 },
      { reference: "1 John 4:8", text: "He that loveth not knoweth not God; for God is love.", bookId: 62, chapter: 4 },
      { reference: "1 John 4:19", text: "We love him, because he first loved us.", bookId: 62, chapter: 4 },
      { reference: "Ephesians 3:17-19", text: "That Christ may dwell in your hearts by faith; that ye, being rooted and grounded in love, May be able to comprehend with all saints what is the breadth, and length, and depth, and height; And to know the love of Christ, which passeth knowledge, that ye might be filled with all the fulness of God.", bookId: 49, chapter: 3 },
      { reference: "John 15:13", text: "Greater love hath no man than this, that a man lay down his life for his friends.", bookId: 43, chapter: 15 },
      { reference: "Psalm 136:1", text: "O give thanks unto the Lord; for he is good: for his mercy endureth for ever.", bookId: 19, chapter: 136 },
    ],
  },
  faith: {
    title: "Faith",
    icon: "shield",
    gradient: ["#5B86E5", "#36D1DC"],
    description: "Walking by faith, not by sight. Trusting God in all circumstances.",
    verses: [
      { reference: "Hebrews 11:1", text: "Now faith is the substance of things hoped for, the evidence of things not seen.", bookId: 58, chapter: 11 },
      { reference: "Romans 10:17", text: "So then faith cometh by hearing, and hearing by the word of God.", bookId: 45, chapter: 10 },
      { reference: "Hebrews 11:6", text: "But without faith it is impossible to please him: for he that cometh to God must believe that he is, and that he is a rewarder of them that diligently seek him.", bookId: 58, chapter: 11 },
      { reference: "2 Corinthians 5:7", text: "For we walk by faith, not by sight.", bookId: 47, chapter: 5 },
      { reference: "Mark 11:24", text: "Therefore I say unto you, What things soever ye desire, when ye pray, believe that ye receive them, and ye shall have them.", bookId: 41, chapter: 11 },
      { reference: "James 1:6", text: "But let him ask in faith, nothing wavering. For he that wavereth is like a wave of the sea driven with the wind and tossed.", bookId: 59, chapter: 1 },
      { reference: "Matthew 17:20", text: "If ye have faith as a grain of mustard seed, ye shall say unto this mountain, Remove hence to yonder place; and it shall remove; and nothing shall be impossible unto you.", bookId: 40, chapter: 17 },
      { reference: "Galatians 2:20", text: "I am crucified with Christ: nevertheless I live; yet not I, but Christ liveth in me: and the life which I now live in the flesh I live by the faith of the Son of God, who loved me, and gave himself for me.", bookId: 48, chapter: 2 },
    ],
  },
  prayer: {
    title: "Prayer",
    icon: "hand-left",
    gradient: ["#8B5CF6", "#6D3BD4"],
    description: "The power and privilege of communicating with our Heavenly Father.",
    verses: [
      { reference: "Philippians 4:6-7", text: "Be careful for nothing; but in every thing by prayer and supplication with thanksgiving let your requests be made known unto God. And the peace of God, which passeth all understanding, shall keep your hearts and minds through Christ Jesus.", bookId: 50, chapter: 4 },
      { reference: "1 Thessalonians 5:17", text: "Pray without ceasing.", bookId: 52, chapter: 5 },
      { reference: "Matthew 6:6", text: "But thou, when thou prayest, enter into thy closet, and when thou hast shut thy door, pray to thy Father which is in secret; and thy Father which seeth in secret shall reward thee openly.", bookId: 40, chapter: 6 },
      { reference: "James 5:16", text: "The effectual fervent prayer of a righteous man availeth much.", bookId: 59, chapter: 5 },
      { reference: "Jeremiah 29:12", text: "Then shall ye call upon me, and ye shall go and pray unto me, and I will hearken unto you.", bookId: 24, chapter: 29 },
      { reference: "Psalm 145:18", text: "The Lord is nigh unto all them that call upon him, to all that call upon him in truth.", bookId: 19, chapter: 145 },
      { reference: "Matthew 7:7", text: "Ask, and it shall be given you; seek, and ye shall find; knock, and it shall be opened unto you.", bookId: 40, chapter: 7 },
      { reference: "Romans 8:26", text: "Likewise the Spirit also helpeth our infirmities: for we know not what we should pray for as we ought: but the Spirit itself maketh intercession for us with groanings which cannot be uttered.", bookId: 45, chapter: 8 },
    ],
  },
  forgiveness: {
    title: "Forgiveness",
    icon: "refresh",
    gradient: ["#2E7D32", "#66BB6A"],
    description: "God's boundless forgiveness and our call to forgive others.",
    verses: [
      { reference: "1 John 1:9", text: "If we confess our sins, he is faithful and just to forgive us our sins, and to cleanse us from all unrighteousness.", bookId: 62, chapter: 1 },
      { reference: "Ephesians 4:32", text: "And be ye kind one to another, tenderhearted, forgiving one another, even as God for Christ's sake hath forgiven you.", bookId: 49, chapter: 4 },
      { reference: "Colossians 3:13", text: "Forbearing one another, and forgiving one another, if any man have a quarrel against any: even as Christ forgave you, so also do ye.", bookId: 51, chapter: 3 },
      { reference: "Psalm 103:12", text: "As far as the east is from the west, so far hath he removed our transgressions from us.", bookId: 19, chapter: 103 },
      { reference: "Matthew 6:14-15", text: "For if ye forgive men their trespasses, your heavenly Father will also forgive you: But if ye forgive not men their trespasses, neither will your Father forgive your trespasses.", bookId: 40, chapter: 6 },
      { reference: "Isaiah 1:18", text: "Come now, and let us reason together, saith the Lord: though your sins be as scarlet, they shall be as white as snow; though they be red like crimson, they shall be as wool.", bookId: 23, chapter: 1 },
      { reference: "Acts 3:19", text: "Repent ye therefore, and be converted, that your sins may be blotted out.", bookId: 44, chapter: 3 },
      { reference: "Micah 7:18", text: "Who is a God like unto thee, that pardoneth iniquity, and passeth by the transgression of the remnant of his heritage? he retaineth not his anger for ever, because he delighteth in mercy.", bookId: 33, chapter: 7 },
    ],
  },
  comfort: {
    title: "Comfort",
    icon: "heart-half",
    gradient: ["#FF6B35", "#F5A623"],
    description: "Finding peace and comfort in God during difficult times.",
    verses: [
      { reference: "Psalm 23:4", text: "Yea, though I walk through the valley of the shadow of death, I will fear no evil: for thou art with me; thy rod and thy staff they comfort me.", bookId: 19, chapter: 23 },
      { reference: "Matthew 11:28", text: "Come unto me, all ye that labour and are heavy laden, and I will give you rest.", bookId: 40, chapter: 11 },
      { reference: "2 Corinthians 1:3-4", text: "Blessed be God, even the Father of our Lord Jesus Christ, the Father of mercies, and the God of all comfort; Who comforteth us in all our tribulation.", bookId: 47, chapter: 1 },
      { reference: "Isaiah 41:10", text: "Fear thou not; for I am with thee: be not dismayed; for I am thy God: I will strengthen thee; yea, I will help thee; yea, I will uphold thee with the right hand of my righteousness.", bookId: 23, chapter: 41 },
      { reference: "Psalm 34:18", text: "The Lord is nigh unto them that are of a broken heart; and saveth such as be of a contrite spirit.", bookId: 19, chapter: 34 },
      { reference: "Romans 8:28", text: "And we know that all things work together for good to them that love God, to them who are the called according to his purpose.", bookId: 45, chapter: 8 },
      { reference: "Psalm 46:1", text: "God is our refuge and strength, a very present help in trouble.", bookId: 19, chapter: 46 },
      { reference: "Revelation 21:4", text: "And God shall wipe away all tears from their eyes; and there shall be no more death, neither sorrow, nor crying, neither shall there be any more pain.", bookId: 66, chapter: 21 },
    ],
  },
  wisdom: {
    title: "Wisdom",
    icon: "bulb",
    gradient: ["#C9933A", "#A87828"],
    description: "Seeking God's wisdom for every decision and season of life.",
    verses: [
      { reference: "Proverbs 3:5-6", text: "Trust in the Lord with all thine heart; and lean not unto thine own understanding. In all thy ways acknowledge him, and he shall direct thy paths.", bookId: 20, chapter: 3 },
      { reference: "James 1:5", text: "If any of you lack wisdom, let him ask of God, that giveth to all men liberally, and upbraideth not; and it shall be given him.", bookId: 59, chapter: 1 },
      { reference: "Proverbs 9:10", text: "The fear of the Lord is the beginning of wisdom: and the knowledge of the holy is understanding.", bookId: 20, chapter: 9 },
      { reference: "Psalm 119:105", text: "Thy word is a lamp unto my feet, and a light unto my path.", bookId: 19, chapter: 119 },
      { reference: "Colossians 3:16", text: "Let the word of Christ dwell in you richly in all wisdom; teaching and admonishing one another in psalms and hymns and spiritual songs.", bookId: 51, chapter: 3 },
      { reference: "Proverbs 2:6", text: "For the Lord giveth wisdom: out of his mouth cometh knowledge and understanding.", bookId: 20, chapter: 2 },
      { reference: "Ecclesiastes 7:12", text: "For wisdom is a defence, and money is a defence: but the excellency of knowledge is, that wisdom giveth life to them that have it.", bookId: 21, chapter: 7 },
      { reference: "Proverbs 4:7", text: "Wisdom is the principal thing; therefore get wisdom: and with all thy getting get understanding.", bookId: 20, chapter: 4 },
    ],
  },
  strength: {
    title: "Strength",
    icon: "fitness",
    gradient: ["#E65100", "#FF8F00"],
    description: "God is our strength in weakness and our power in every trial.",
    verses: [
      { reference: "Philippians 4:13", text: "I can do all things through Christ which strengtheneth me.", bookId: 50, chapter: 4 },
      { reference: "Isaiah 40:31", text: "But they that wait upon the Lord shall renew their strength; they shall mount up with wings as eagles; they shall run, and not be weary; and they shall walk, and not faint.", bookId: 23, chapter: 40 },
      { reference: "Psalm 18:2", text: "The Lord is my rock, and my fortress, and my deliverer; my God, my strength, in whom I will trust.", bookId: 19, chapter: 18 },
      { reference: "Nehemiah 8:10", text: "The joy of the Lord is your strength.", bookId: 16, chapter: 8 },
      { reference: "2 Corinthians 12:9", text: "My grace is sufficient for thee: for my strength is made perfect in weakness.", bookId: 47, chapter: 12 },
      { reference: "Deuteronomy 31:6", text: "Be strong and of a good courage, fear not, nor be afraid of them: for the Lord thy God, he it is that doth go with thee; he will not fail thee, nor forsake thee.", bookId: 5, chapter: 31 },
      { reference: "Psalm 27:1", text: "The Lord is my light and my salvation; whom shall I fear? the Lord is the strength of my life; of whom shall I be afraid?", bookId: 19, chapter: 27 },
      { reference: "Ephesians 6:10", text: "Finally, my brethren, be strong in the Lord, and in the power of his might.", bookId: 49, chapter: 6 },
    ],
  },
  peace: {
    title: "Peace",
    icon: "leaf",
    gradient: ["#00796B", "#4DB6AC"],
    description: "The peace of God that passes all understanding.",
    verses: [
      { reference: "John 14:27", text: "Peace I leave with you, my peace I give unto you: not as the world giveth, give I unto you. Let not your heart be troubled, neither let it be afraid.", bookId: 43, chapter: 14 },
      { reference: "Philippians 4:7", text: "And the peace of God, which passeth all understanding, shall keep your hearts and minds through Christ Jesus.", bookId: 50, chapter: 4 },
      { reference: "Isaiah 26:3", text: "Thou wilt keep him in perfect peace, whose mind is stayed on thee: because he trusteth in thee.", bookId: 23, chapter: 26 },
      { reference: "Psalm 29:11", text: "The Lord will give strength unto his people; the Lord will bless his people with peace.", bookId: 19, chapter: 29 },
      { reference: "Romans 15:13", text: "Now the God of hope fill you with all joy and peace in believing, that ye may abound in hope, through the power of the Holy Ghost.", bookId: 45, chapter: 15 },
      { reference: "Colossians 3:15", text: "And let the peace of God rule in your hearts, to the which also ye are called in one body; and be ye thankful.", bookId: 51, chapter: 3 },
      { reference: "Psalm 4:8", text: "I will both lay me down in peace, and sleep: for thou, Lord, only makest me dwell in safety.", bookId: 19, chapter: 4 },
      { reference: "Matthew 5:9", text: "Blessed are the peacemakers: for they shall be called the children of God.", bookId: 40, chapter: 5 },
    ],
  },
  hope: {
    title: "Hope",
    icon: "sunny",
    gradient: ["#1565C0", "#42A5F5"],
    description: "A living hope through the resurrection of Jesus Christ.",
    verses: [
      { reference: "Romans 15:13", text: "Now the God of hope fill you with all joy and peace in believing, that ye may abound in hope, through the power of the Holy Ghost.", bookId: 45, chapter: 15 },
      { reference: "Jeremiah 29:11", text: "For I know the thoughts that I think toward you, saith the Lord, thoughts of peace, and not of evil, to give you an expected end.", bookId: 24, chapter: 29 },
      { reference: "Hebrews 6:19", text: "Which hope we have as an anchor of the soul, both sure and stedfast.", bookId: 58, chapter: 6 },
      { reference: "Romans 8:24-25", text: "For we are saved by hope: but hope that is seen is not hope: for what a man seeth, why doth he yet hope for? But if we hope for that we see not, then do we with patience wait for it.", bookId: 45, chapter: 8 },
      { reference: "Psalm 31:24", text: "Be of good courage, and he shall strengthen your heart, all ye that hope in the Lord.", bookId: 19, chapter: 31 },
      { reference: "Lamentations 3:22-23", text: "It is of the Lord's mercies that we are not consumed, because his compassions fail not. They are new every morning: great is thy faithfulness.", bookId: 25, chapter: 3 },
      { reference: "1 Peter 1:3", text: "Blessed be the God and Father of our Lord Jesus Christ, which according to his abundant mercy hath begotten us again unto a lively hope by the resurrection of Jesus Christ from the dead.", bookId: 60, chapter: 1 },
      { reference: "Psalm 42:11", text: "Why art thou cast down, O my soul? and why art thou disquieted within me? hope thou in God: for I shall yet praise him, who is the health of my countenance, and my God.", bookId: 19, chapter: 42 },
    ],
  },
  grace: {
    title: "Grace",
    icon: "gift",
    gradient: ["#AD1457", "#EC407A"],
    description: "God's unmerited favor poured out through Jesus Christ.",
    verses: [
      { reference: "Ephesians 2:8-9", text: "For by grace are ye saved through faith; and that not of yourselves: it is the gift of God: Not of works, lest any man should boast.", bookId: 49, chapter: 2 },
      { reference: "2 Corinthians 12:9", text: "My grace is sufficient for thee: for my strength is made perfect in weakness.", bookId: 47, chapter: 12 },
      { reference: "Romans 6:14", text: "For sin shall not have dominion over you: for ye are not under the law, but under grace.", bookId: 45, chapter: 6 },
      { reference: "Titus 2:11", text: "For the grace of God that bringeth salvation hath appeared to all men.", bookId: 56, chapter: 2 },
      { reference: "Romans 5:20", text: "But where sin abounded, grace did much more abound.", bookId: 45, chapter: 5 },
      { reference: "James 4:6", text: "But he giveth more grace. Wherefore he saith, God resisteth the proud, but giveth grace unto the humble.", bookId: 59, chapter: 4 },
      { reference: "John 1:16", text: "And of his fulness have all we received, and grace for grace.", bookId: 43, chapter: 1 },
      { reference: "Hebrews 4:16", text: "Let us therefore come boldly unto the throne of grace, that we may obtain mercy, and find grace to help in time of need.", bookId: 58, chapter: 4 },
    ],
  },
  courage: {
    title: "Courage",
    icon: "flag",
    gradient: ["#4527A0", "#7C4DFF"],
    description: "Be strong and courageous, for the Lord is with you.",
    verses: [
      { reference: "Joshua 1:9", text: "Have not I commanded thee? Be strong and of a good courage; be not afraid, neither be thou dismayed: for the Lord thy God is with thee whithersoever thou goest.", bookId: 6, chapter: 1 },
      { reference: "Deuteronomy 31:6", text: "Be strong and of a good courage, fear not, nor be afraid of them: for the Lord thy God, he it is that doth go with thee; he will not fail thee, nor forsake thee.", bookId: 5, chapter: 31 },
      { reference: "Isaiah 41:10", text: "Fear thou not; for I am with thee: be not dismayed; for I am thy God.", bookId: 23, chapter: 41 },
      { reference: "Psalm 27:14", text: "Wait on the Lord: be of good courage, and he shall strengthen thine heart: wait, I say, on the Lord.", bookId: 19, chapter: 27 },
      { reference: "Psalm 56:3", text: "What time I am afraid, I will trust in thee.", bookId: 19, chapter: 56 },
      { reference: "2 Timothy 1:7", text: "For God hath not given us the spirit of fear; but of power, and of love, and of a sound mind.", bookId: 55, chapter: 1 },
      { reference: "Psalm 31:24", text: "Be of good courage, and he shall strengthen your heart, all ye that hope in the Lord.", bookId: 19, chapter: 31 },
      { reference: "1 Chronicles 28:20", text: "Be strong and of good courage, and do it: fear not, nor be dismayed: for the Lord God, even my God, will be with thee.", bookId: 13, chapter: 28 },
    ],
  },
  joy: {
    title: "Joy",
    icon: "sparkles",
    gradient: ["#F9A825", "#FDD835"],
    description: "The joy of the Lord is our strength, found in every season.",
    verses: [
      { reference: "Nehemiah 8:10", text: "The joy of the Lord is your strength.", bookId: 16, chapter: 8 },
      { reference: "Psalm 16:11", text: "Thou wilt shew me the path of life: in thy presence is fulness of joy; at thy right hand there are pleasures for evermore.", bookId: 19, chapter: 16 },
      { reference: "Romans 15:13", text: "Now the God of hope fill you with all joy and peace in believing.", bookId: 45, chapter: 15 },
      { reference: "James 1:2-3", text: "My brethren, count it all joy when ye fall into divers temptations; Knowing this, that the trying of your faith worketh patience.", bookId: 59, chapter: 1 },
      { reference: "John 15:11", text: "These things have I spoken unto you, that my joy might remain in you, and that your joy might be full.", bookId: 43, chapter: 15 },
      { reference: "Psalm 30:5", text: "Weeping may endure for a night, but joy cometh in the morning.", bookId: 19, chapter: 30 },
      { reference: "Galatians 5:22", text: "But the fruit of the Spirit is love, joy, peace, longsuffering, gentleness, goodness, faith.", bookId: 48, chapter: 5 },
      { reference: "Philippians 4:4", text: "Rejoice in the Lord alway: and again I say, Rejoice.", bookId: 50, chapter: 4 },
    ],
  },
};

export default function TopicScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const theme = isDark ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const topic = TOPICS[id ?? ""] ?? TOPICS.love;

  return (
    <>
      <Stack.Screen options={{ title: "", headerStyle: { backgroundColor: theme.background }, headerShadowVisible: false, headerTintColor: theme.text }} />
      <ScrollView
        style={[styles.container, { backgroundColor: theme.background }]}
        contentContainerStyle={{ paddingBottom: bottomPad + 40 }}
        showsVerticalScrollIndicator={false}
      >
        <LinearGradient
          colors={topic.gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroCard}
        >
          <Ionicons name={topic.icon} size={40} color="rgba(255,255,255,0.9)" />
          <Text style={[styles.heroTitle, { fontFamily: "Lora_700Bold" }]}>{topic.title}</Text>
          <Text style={[styles.heroDesc, { fontFamily: "Inter_400Regular" }]}>{topic.description}</Text>
          <View style={styles.heroBadge}>
            <Text style={[styles.heroBadgeText, { fontFamily: "Inter_600SemiBold" }]}>{topic.verses.length} Verses</Text>
          </View>
        </LinearGradient>

        <View style={styles.versesSection}>
          {topic.verses.map((v, i) => (
            <Pressable
              key={i}
              onPress={() => router.push(`/read/${v.bookId}/${v.chapter}`)}
              style={({ pressed }) => [
                styles.verseCard,
                { backgroundColor: isDark ? theme.backgroundCard : "#FFFDF6", opacity: pressed ? 0.8 : 1 },
              ]}
            >
              <View style={styles.verseCardHeader}>
                <View style={[styles.verseRefBadge, { backgroundColor: topic.gradient[0] + "18" }]}>
                  <Text style={[styles.verseRef, { color: topic.gradient[0], fontFamily: "Inter_700Bold" }]}>{v.reference}</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={theme.textMuted} />
              </View>
              <Text style={[styles.verseText, { color: theme.text, fontFamily: "Lora_400Regular" }]} numberOfLines={4}>
                {v.text}
              </Text>
            </Pressable>
          ))}
        </View>
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
  heroTitle: { color: "#fff", fontSize: 32 },
  heroDesc: { color: "rgba(255,255,255,0.85)", fontSize: 15, lineHeight: 22, textAlign: "center" },
  heroBadge: {
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
    marginTop: 4,
  },
  heroBadgeText: { color: "#fff", fontSize: 12 },
  versesSection: {
    paddingHorizontal: 22,
    paddingTop: 24,
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
});
