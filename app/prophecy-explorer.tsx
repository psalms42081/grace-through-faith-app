import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Platform,
  LayoutAnimation,
  UIManager,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/hooks/useTheme";

if (
  Platform.OS === "android" &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface ProphecySymbol {
  id: string;
  title: string;
  bibleRef: string;
  interpretation: string;
  historicalFulfillment: string;
  dateRange?: string;
  icon: string;
  color: string;
}

interface ProphecySection {
  id: string;
  title: string;
  subtitle: string;
  icon: string;
  color: string;
  symbols: ProphecySymbol[];
}

const PROPHECY_SECTIONS: ProphecySection[] = [
  {
    id: "daniel2",
    title: "Daniel 2 \u2014 The Great Image",
    subtitle: "Nebuchadnezzar's dream of world empires",
    icon: "layers-outline",
    color: "#D4A245",
    symbols: [
      {
        id: "d2-head",
        title: "Head of Gold",
        bibleRef: "Daniel 2:32, 37-38",
        interpretation: "Babylon \u2014 the first world empire in this prophetic sequence. God told Nebuchadnezzar directly, 'You are this head of gold.'",
        historicalFulfillment: "Neo-Babylonian Empire (605\u2013539 BC) under Nebuchadnezzar. The golden city of Babylon was renowned for its wealth and splendor.",
        dateRange: "605\u2013539 BC",
        icon: "trophy-outline",
        color: "#D4A245",
      },
      {
        id: "d2-chest",
        title: "Chest & Arms of Silver",
        bibleRef: "Daniel 2:32, 39",
        interpretation: "Medo-Persia \u2014 the dual arms represent the alliance of the Medes and Persians. Inferior to Babylon in glory but greater in extent.",
        historicalFulfillment: "The Medo-Persian Empire conquered Babylon in 539 BC under Cyrus the Great, fulfilling the prophecy of a succeeding kingdom.",
        dateRange: "539\u2013331 BC",
        icon: "shield-outline",
        color: "#A0A0B0",
      },
      {
        id: "d2-thighs",
        title: "Thighs of Bronze",
        bibleRef: "Daniel 2:32, 39",
        interpretation: "Greece \u2014 Alexander the Great's empire conquered the known world with remarkable speed. Bronze-clad Greek soldiers were legendary.",
        historicalFulfillment: "Alexander the Great defeated Persia at the Battle of Gaugamela (331 BC) and established Greek dominion from Egypt to India.",
        dateRange: "331\u2013168 BC",
        icon: "flash-outline",
        color: "#CD7F32",
      },
      {
        id: "d2-legs",
        title: "Legs of Iron",
        bibleRef: "Daniel 2:33, 40",
        interpretation: "Rome \u2014 the iron monarchy that crushed all before it. The two legs may represent the eventual East-West division of the empire.",
        historicalFulfillment: "The Roman Empire dominated the Mediterranean world from 168 BC. Rome's iron legions conquered Greece, Egypt, and vast territories.",
        dateRange: "168 BC\u2013AD 476",
        icon: "hammer-outline",
        color: "#6B6B6B",
      },
      {
        id: "d2-feet",
        title: "Feet of Iron & Clay",
        bibleRef: "Daniel 2:33, 41-43",
        interpretation: "Divided Europe \u2014 the nations of modern Europe, partly strong and partly fragile. 'They shall not cleave one to another' \u2014 no lasting reunification.",
        historicalFulfillment: "After Rome's fall in AD 476, Europe divided into the nations we know today. Every attempt at reunification (Charlemagne, Napoleon, Hitler) has failed.",
        dateRange: "AD 476\u2013Present",
        icon: "git-branch-outline",
        color: "#8B7355",
      },
      {
        id: "d2-stone",
        title: "The Stone",
        bibleRef: "Daniel 2:34-35, 44-45",
        interpretation: "God's Eternal Kingdom \u2014 the stone cut without hands represents Christ's coming kingdom that will destroy all earthly powers and fill the whole earth forever.",
        historicalFulfillment: "Yet future. Adventists understand this as the Second Coming of Christ, when God will establish His eternal kingdom that shall never be destroyed.",
        icon: "diamond-outline",
        color: "#22C55E",
      },
    ],
  },
  {
    id: "daniel7",
    title: "Daniel 7 \u2014 Four Beasts",
    subtitle: "Vision of kingdoms and the heavenly judgment",
    icon: "paw-outline",
    color: "#7C3AED",
    symbols: [
      {
        id: "d7-lion",
        title: "Lion with Eagle's Wings",
        bibleRef: "Daniel 7:4",
        interpretation: "Babylon \u2014 the lion is the king of beasts and the eagle the king of birds, representing Babylon's supreme position. Its wings were plucked, symbolizing Nebuchadnezzar's humbling.",
        historicalFulfillment: "Winged lions decorated Babylon's Ishtar Gate. Nebuchadnezzar's pride led to his temporary insanity (Daniel 4), after which he was restored.",
        dateRange: "605\u2013539 BC",
        icon: "paw-outline",
        color: "#D4A245",
      },
      {
        id: "d7-bear",
        title: "Bear Raised on One Side",
        bibleRef: "Daniel 7:5",
        interpretation: "Medo-Persia \u2014 raised on one side because Persia was dominant. The three ribs represent the three kingdoms conquered: Lydia, Babylon, and Egypt.",
        historicalFulfillment: "Persia dominated the alliance with Media. Cyrus conquered Lydia (547 BC), Babylon (539 BC), and Cambyses conquered Egypt (525 BC).",
        dateRange: "539\u2013331 BC",
        icon: "fitness-outline",
        color: "#A0A0B0",
      },
      {
        id: "d7-leopard",
        title: "Leopard with Four Wings",
        bibleRef: "Daniel 7:6",
        interpretation: "Greece \u2014 the leopard's speed, doubled by four wings, represents Alexander's lightning conquests. The four heads are the four kingdoms after Alexander's death.",
        historicalFulfillment: "Alexander conquered the Persian Empire in just 10 years. After his death in 323 BC, the empire divided among his four generals: Cassander, Lysimachus, Seleucus, and Ptolemy.",
        dateRange: "331\u2013168 BC",
        icon: "speedometer-outline",
        color: "#CD7F32",
      },
      {
        id: "d7-beast",
        title: "Dreadful Beast",
        bibleRef: "Daniel 7:7-8",
        interpretation: "Rome \u2014 'dreadful and terrible, and strong exceedingly.' The ten horns represent the ten divisions of Western Rome. No known animal could represent Rome's brutality.",
        historicalFulfillment: "Rome's power exceeded all previous empires. It eventually fragmented into the barbarian kingdoms of Europe (Visigoths, Vandals, Ostrogoths, etc.).",
        dateRange: "168 BC\u2013AD 476",
        icon: "skull-outline",
        color: "#DC2626",
      },
      {
        id: "d7-horn",
        title: "Little Horn",
        bibleRef: "Daniel 7:8, 24-25",
        interpretation: "Papal Rome \u2014 arose among the ten horns, uprooted three, spoke 'great words against the Most High,' persecuted saints, and attempted to change God's times and law. Ruled for 'a time, times, and half a time' (1,260 years).",
        historicalFulfillment: "Adventists identify this as the Papacy, which rose to political power after Rome's fall, persecuted dissenters during the medieval period, and exercised dominion from AD 538 to 1798.",
        dateRange: "AD 538\u20131798",
        icon: "megaphone-outline",
        color: "#9333EA",
      },
      {
        id: "d7-judgment",
        title: "Judgment Scene",
        bibleRef: "Daniel 7:9-10, 26-27",
        interpretation: "The Pre-Advent Investigative Judgment \u2014 the Ancient of Days takes His seat, the books are opened. This judgment precedes Christ's return and vindicates God's people.",
        historicalFulfillment: "Adventists believe this judgment began in 1844, corresponding to the cleansing of the sanctuary in Daniel 8:14, and continues until Christ's return.",
        dateRange: "1844\u2013Present",
        icon: "scale-outline",
        color: "#C9933A",
      },
      {
        id: "d7-son",
        title: "Son of Man",
        bibleRef: "Daniel 7:13-14",
        interpretation: "Jesus Christ \u2014 comes to the Ancient of Days and receives an everlasting dominion and kingdom. Christ used this title for Himself throughout His ministry.",
        historicalFulfillment: "Jesus identified Himself as the Son of Man over 80 times in the Gospels. He will receive the kingdom at the conclusion of the pre-advent judgment.",
        icon: "sunny-outline",
        color: "#22C55E",
      },
    ],
  },
  {
    id: "daniel89",
    title: "Daniel 8\u20139 \u2014 2300 Day Prophecy",
    subtitle: "The longest time prophecy in Scripture",
    icon: "time-outline",
    color: "#3B82F6",
    symbols: [
      {
        id: "d89-ram",
        title: "Ram with Two Horns",
        bibleRef: "Daniel 8:3-4, 20",
        interpretation: "Medo-Persia \u2014 the angel Gabriel explicitly identifies the ram as 'the kings of Media and Persia.' The higher horn rising last represents Persia's later dominance.",
        historicalFulfillment: "The Medo-Persian Empire pushed westward, northward, and southward exactly as described. No beast could stand before it until Greece arose.",
        dateRange: "539\u2013331 BC",
        icon: "cellular-outline",
        color: "#A0A0B0",
      },
      {
        id: "d89-goat",
        title: "Male Goat",
        bibleRef: "Daniel 8:5-8, 21-22",
        interpretation: "Greece \u2014 the 'notable horn' is Alexander the Great. The four horns that replace it are his four generals who divided the empire after his death.",
        historicalFulfillment: "Alexander crossed the Hellespont in 334 BC, defeated Persia, and died in 323 BC. His empire was divided among Cassander, Lysimachus, Seleucus, and Ptolemy.",
        dateRange: "331\u2013168 BC",
        icon: "trending-up-outline",
        color: "#CD7F32",
      },
      {
        id: "d89-70weeks",
        title: "70 Weeks Prophecy",
        bibleRef: "Daniel 9:24-27",
        interpretation: "490 years 'cut off' from the 2,300 days for the Jewish nation. Beginning from 457 BC (decree of Artaxerxes), it reaches to the Messiah's baptism (AD 27), crucifixion (AD 31), and the gospel going to the Gentiles (AD 34).",
        historicalFulfillment: "Jesus was baptized in AD 27 (the 69th week), crucified in AD 31 ('in the midst of the week'), and Stephen was stoned in AD 34, marking the gospel's expansion to the Gentiles.",
        dateRange: "457 BC\u2013AD 34",
        icon: "calendar-outline",
        color: "#3B82F6",
      },
      {
        id: "d89-2300",
        title: "2,300 Evening-Mornings",
        bibleRef: "Daniel 8:14",
        interpretation: "2,300 prophetic days (literal years) from 457 BC to 1844. 'Then shall the sanctuary be cleansed.' This marks the beginning of the pre-advent judgment in the heavenly sanctuary.",
        historicalFulfillment: "Using the year-day principle, 2,300 years from 457 BC reaches 1844. Adventists understand this as the beginning of Christ's final ministry in the Most Holy Place of the heavenly sanctuary.",
        dateRange: "457 BC\u2013AD 1844",
        icon: "hourglass-outline",
        color: "#C9933A",
      },
      {
        id: "d89-sanctuary",
        title: "Sanctuary Cleansing",
        bibleRef: "Daniel 8:14; Hebrews 8:1-2; 9:23",
        interpretation: "The cleansing of the heavenly sanctuary corresponds to the Day of Atonement (Leviticus 16). Christ, our High Priest, entered the Most Holy Place to conduct the investigative judgment.",
        historicalFulfillment: "Since 1844, Adventists believe Christ has been conducting the pre-advent judgment, reviewing the records of all who have professed faith, before His return.",
        dateRange: "1844\u2013Present",
        icon: "home-outline",
        color: "#7C3AED",
      },
    ],
  },
  {
    id: "revelation",
    title: "Revelation Timelines",
    subtitle: "The unfolding of history and the end times",
    icon: "telescope-outline",
    color: "#DC2626",
    symbols: [
      {
        id: "rev-churches",
        title: "Seven Churches",
        bibleRef: "Revelation 2\u20133",
        interpretation: "Seven periods of church history from the apostolic age to the end of time. Each church represents the spiritual condition of God's people in that era.",
        historicalFulfillment: "Ephesus (apostolic, AD 31\u2013100), Smyrna (persecution, 100\u2013313), Pergamum (compromise, 313\u2013538), Thyatira (papal dominance, 538\u20131517), Sardis (Reformation, 1517\u20131798), Philadelphia (awakening, 1798\u20131844), Laodicea (lukewarm, 1844\u2013present).",
        dateRange: "AD 31\u2013Present",
        icon: "business-outline",
        color: "#3B82F6",
      },
      {
        id: "rev-seals",
        title: "Seven Seals",
        bibleRef: "Revelation 6\u20138:1",
        interpretation: "Seven phases of the church's experience with persecution and deliverance. The seals reveal the cost of following Christ through the ages and God's ultimate vindication of His people.",
        historicalFulfillment: "White horse (apostolic purity), red horse (pagan persecution), black horse (corruption), pale horse (dark ages), martyrs' cry (Reformation era), cosmic signs (Lisbon earthquake 1755, dark day 1780), heavenly silence (Second Coming).",
        dateRange: "AD 31\u2013Second Coming",
        icon: "lock-closed-outline",
        color: "#9333EA",
      },
      {
        id: "rev-trumpets",
        title: "Seven Trumpets",
        bibleRef: "Revelation 8\u201311",
        interpretation: "God's judgments on those who have persecuted His people. Each trumpet announces divine retribution on the forces of opposition throughout history.",
        historicalFulfillment: "Trumpets 1\u20134: fall of Western Rome through barbarian invasions. Trumpet 5: rise of Islam. Trumpet 6: fall of Eastern Rome (Ottoman Empire). Trumpet 7: Christ's kingdom established.",
        dateRange: "AD 395\u2013Second Coming",
        icon: "megaphone-outline",
        color: "#DC2626",
      },
      {
        id: "rev-angels",
        title: "Three Angels' Messages",
        bibleRef: "Revelation 14:6-12",
        interpretation: "God's final message to the world before Christ's return. The first angel calls to worship the Creator. The second announces Babylon's fall. The third warns against receiving the mark of the beast. These messages define the Adventist mission.",
        historicalFulfillment: "Adventists believe these messages began going to the world in the 1840s and continue to the present, forming the core of Adventist identity and mission to prepare a people for Christ's return.",
        dateRange: "1844\u2013Second Coming",
        icon: "paper-plane-outline",
        color: "#C9933A",
      },
      {
        id: "rev-sanctuary",
        title: "The Sanctuary",
        bibleRef: "Revelation 11:19; Hebrews 8\u20139",
        interpretation: "The heavenly sanctuary is the center of God's government and the location of Christ's high-priestly ministry. The earthly sanctuary was a shadow of this heavenly reality, revealing the plan of salvation.",
        historicalFulfillment: "The sanctuary service illustrates salvation: the altar of sacrifice (the cross), the Holy Place (Christ's intercession since AD 31), and the Most Holy Place (the investigative judgment since 1844).",
        dateRange: "Eternal",
        icon: "home-outline",
        color: "#22C55E",
      },
    ],
  },
];

const TIMELINE_MARKERS = [
  { year: "605 BC", label: "Babylon", color: "#D4A245" },
  { year: "539 BC", label: "Medo-Persia", color: "#A0A0B0" },
  { year: "331 BC", label: "Greece", color: "#CD7F32" },
  { year: "168 BC", label: "Rome", color: "#6B6B6B" },
  { year: "AD 476", label: "Divided", color: "#8B7355" },
  { year: "AD 1798", label: "End of 1260", color: "#9333EA" },
  { year: "AD 1844", label: "Judgment", color: "#C9933A" },
  { year: "Future", label: "God's Kingdom", color: "#22C55E" },
];

function TimelineBar({ theme }: { theme: any }) {
  return (
    <View style={tbStyles.container}>
      <View style={[tbStyles.line, { backgroundColor: "rgba(201, 147, 58, 0.3)" }]} />
      <View style={tbStyles.markers}>
        {TIMELINE_MARKERS.map((marker) => (
          <View key={marker.year} style={tbStyles.markerWrap}>
            <View style={[tbStyles.dot, { backgroundColor: marker.color }]} />
            <Text style={[tbStyles.year, { color: marker.color }]}>{marker.year}</Text>
            <Text style={[tbStyles.label, { color: theme.textMuted }]}>{marker.label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const tbStyles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginBottom: 24,
    position: "relative" as const,
  },
  line: {
    position: "absolute" as const,
    top: 6,
    left: 0,
    right: 0,
    height: 2,
  },
  markers: {
    flexDirection: "row" as const,
    justifyContent: "space-between" as const,
  },
  markerWrap: {
    alignItems: "center" as const,
    width: 42,
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginBottom: 4,
  },
  year: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 8,
    letterSpacing: 0.3,
  },
  label: {
    fontFamily: "Inter_400Regular",
    fontSize: 7,
    marginTop: 1,
    textAlign: "center" as const,
  },
});

function SymbolCard({
  symbol,
  isExpanded,
  onToggle,
  theme,
}: {
  symbol: ProphecySymbol;
  isExpanded: boolean;
  onToggle: () => void;
  theme: any;
}) {
  return (
    <Pressable
      onPress={() => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        onToggle();
      }}
      style={({ pressed }) => [
        scStyles.card,
        {
          backgroundColor: isExpanded
            ? symbol.color + "12"
            : theme.backgroundCard,
          borderColor: isExpanded
            ? symbol.color + "40"
            : theme.border,
          opacity: pressed ? 0.85 : 1,
        },
      ]}
    >
      <View style={scStyles.header}>
        <View style={[scStyles.iconWrap, { backgroundColor: symbol.color + "1A" }]}>
          <Ionicons name={symbol.icon as any} size={16} color={symbol.color} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[scStyles.title, { color: theme.text }]}>{symbol.title}</Text>
          <Text style={[scStyles.ref, { color: symbol.color }]}>{symbol.bibleRef}</Text>
        </View>
        {symbol.dateRange && (
          <View style={[scStyles.dateBadge, { backgroundColor: symbol.color + "14" }]}>
            <Text style={[scStyles.dateText, { color: symbol.color }]}>{symbol.dateRange}</Text>
          </View>
        )}
        <Ionicons
          name={isExpanded ? "chevron-up" : "chevron-down"}
          size={16}
          color={theme.textMuted}
        />
      </View>

      {isExpanded && (
        <View style={scStyles.expanded}>
          <View style={scStyles.detailBlock}>
            <View style={scStyles.detailHeader}>
              <Ionicons name="book-outline" size={12} color={theme.accent} />
              <Text style={[scStyles.detailLabel, { color: theme.accent }]}>
                SDA Interpretation
              </Text>
            </View>
            <Text style={[scStyles.detailText, { color: theme.textSecondary }]}>
              {symbol.interpretation}
            </Text>
          </View>

          <View style={scStyles.detailBlock}>
            <View style={scStyles.detailHeader}>
              <Ionicons name="time-outline" size={12} color="#3B82F6" />
              <Text style={[scStyles.detailLabel, { color: "#3B82F6" }]}>
                Historical Fulfillment
              </Text>
            </View>
            <Text style={[scStyles.detailText, { color: theme.textSecondary }]}>
              {symbol.historicalFulfillment}
            </Text>
          </View>
        </View>
      )}
    </Pressable>
  );
}

const scStyles = StyleSheet.create({
  card: {
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    marginBottom: 8,
  },
  header: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 10,
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  title: {
    fontFamily: "Lora_600SemiBold",
    fontSize: 14,
    lineHeight: 20,
  },
  ref: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    marginTop: 1,
  },
  dateBadge: {
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
  },
  dateText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 9,
    letterSpacing: 0.3,
  },
  expanded: {
    marginTop: 12,
    gap: 12,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(201, 147, 58, 0.15)",
  },
  detailBlock: {
    gap: 4,
  },
  detailHeader: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 5,
  },
  detailLabel: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 11,
    letterSpacing: 0.3,
    textTransform: "uppercase" as const,
  },
  detailText: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    lineHeight: 20,
    marginTop: 2,
  },
});

function SectionCard({
  section,
  expandedSymbolId,
  onToggleSymbol,
  isSectionExpanded,
  onToggleSection,
  theme,
}: {
  section: ProphecySection;
  expandedSymbolId: string | null;
  onToggleSymbol: (id: string) => void;
  isSectionExpanded: boolean;
  onToggleSection: () => void;
  theme: any;
}) {
  return (
    <View style={secStyles.container}>
      <Pressable
        onPress={() => {
          LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
          onToggleSection();
        }}
        style={({ pressed }) => [
          secStyles.header,
          {
            backgroundColor: isSectionExpanded
              ? section.color + "10"
              : theme.backgroundCard,
            borderColor: isSectionExpanded
              ? section.color + "35"
              : theme.border,
            opacity: pressed ? 0.85 : 1,
          },
        ]}
      >
        <View style={[secStyles.iconWrap, { backgroundColor: section.color + "1A" }]}>
          <Ionicons name={section.icon as any} size={20} color={section.color} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[secStyles.title, { color: theme.text }]}>{section.title}</Text>
          <Text style={[secStyles.subtitle, { color: theme.textMuted }]}>{section.subtitle}</Text>
        </View>
        <View style={secStyles.countBadge}>
          <Text style={[secStyles.countText, { color: section.color }]}>
            {section.symbols.length}
          </Text>
        </View>
        <Ionicons
          name={isSectionExpanded ? "chevron-up" : "chevron-down"}
          size={20}
          color={theme.textMuted}
        />
      </Pressable>

      {isSectionExpanded && (
        <View style={secStyles.symbolsList}>
          {section.symbols.map((symbol) => (
            <SymbolCard
              key={symbol.id}
              symbol={symbol}
              isExpanded={expandedSymbolId === symbol.id}
              onToggle={() => onToggleSymbol(symbol.id)}
              theme={theme}
            />
          ))}
        </View>
      )}
    </View>
  );
}

const secStyles = StyleSheet.create({
  container: {
    marginBottom: 12,
  },
  header: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 12,
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  title: {
    fontFamily: "Lora_600SemiBold",
    fontSize: 16,
    lineHeight: 22,
  },
  subtitle: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    marginTop: 2,
  },
  countBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "rgba(201, 147, 58, 0.1)",
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  countText: {
    fontFamily: "Inter_700Bold",
    fontSize: 11,
  },
  symbolsList: {
    paddingHorizontal: 8,
    paddingTop: 10,
  },
});

export default function ProphecyExplorerScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const [expandedSymbol, setExpandedSymbol] = useState<string | null>(null);

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const toggleSection = useCallback((id: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const toggleSymbol = useCallback((id: string) => {
    setExpandedSymbol((prev) => (prev === id ? null : id));
  }, []);

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 12 }]}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={[styles.headerTitle, { color: theme.text }]}>
            Prophecy Explorer
          </Text>
          <Text style={[styles.headerSubtitle, { color: theme.textMuted }]}>
            Daniel & Revelation Timelines
          </Text>
        </View>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomPad + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.introBlock}>
          <Text style={[styles.introText, { color: theme.textSecondary }]}>
            Explore the great prophetic timelines of Daniel and Revelation. Each
            symbol is identified by Scripture, interpreted through Adventist
            theology, and connected to its historical fulfillment.
          </Text>
        </View>

        <TimelineBar theme={theme} />

        {PROPHECY_SECTIONS.map((section) => (
          <SectionCard
            key={section.id}
            section={section}
            expandedSymbolId={expandedSymbol}
            onToggleSymbol={toggleSymbol}
            isSectionExpanded={expandedSections.has(section.id)}
            onToggleSection={() => toggleSection(section.id)}
            theme={theme}
          />
        ))}

        <View style={[styles.closingCard, { backgroundColor: "rgba(201, 147, 58, 0.08)", borderColor: "rgba(201, 147, 58, 0.2)" }]}>
          <Ionicons name="compass-outline" size={24} color="#C9933A" />
          <Text style={[styles.closingTitle, { color: "#C9933A" }]}>
            "We have also a more sure word of prophecy"
          </Text>
          <Text style={[styles.closingText, { color: theme.textSecondary }]}>
            2 Peter 1:19
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  backBtn: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  headerCenter: {
    flex: 1,
    alignItems: "center",
  },
  headerTitle: {
    fontFamily: "Lora_700Bold",
    fontSize: 18,
  },
  headerSubtitle: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    marginTop: 2,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 12,
  },
  introBlock: {
    paddingHorizontal: 8,
    paddingVertical: 16,
  },
  introText: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    lineHeight: 22,
  },
  closingCard: {
    marginHorizontal: 4,
    marginTop: 16,
    borderRadius: 14,
    padding: 20,
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
  },
  closingTitle: {
    fontFamily: "Lora_600SemiBold",
    fontSize: 15,
    textAlign: "center",
    lineHeight: 22,
  },
  closingText: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    textAlign: "center",
  },
});
