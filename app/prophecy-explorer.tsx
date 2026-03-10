import React, { useState, useCallback, useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Platform,
  LayoutAnimation,
  UIManager,
  Animated,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useTheme } from "@/hooks/useTheme";
import { track } from "@/lib/analytics";
import ScreenHeader from "@/components/ScreenHeader";

const PROPHECY_VIEWED_KEY = "prophecy_viewed";

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
  keyVerse?: string;
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
        keyVerse: "\"Thou art this head of gold.\" \u2014 Daniel 2:38",
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
        keyVerse: "\"After thee shall arise another kingdom inferior to thee.\" \u2014 Daniel 2:39",
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
        keyVerse: "\"A third kingdom of brass, which shall bear rule over all the earth.\" \u2014 Daniel 2:39",
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
        keyVerse: "\"The fourth kingdom shall be strong as iron: forasmuch as iron breaketh in pieces.\" \u2014 Daniel 2:40",
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
        keyVerse: "\"They shall not cleave one to another, even as iron is not mixed with clay.\" \u2014 Daniel 2:43",
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
        keyVerse: "\"The God of heaven shall set up a kingdom, which shall never be destroyed.\" \u2014 Daniel 2:44",
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
        keyVerse: "\"The first was like a lion, and had eagle's wings.\" \u2014 Daniel 7:4",
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
        keyVerse: "\"It raised up itself on one side, and it had three ribs in the mouth of it.\" \u2014 Daniel 7:5",
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
        keyVerse: "\"The beast had also four heads; and dominion was given to it.\" \u2014 Daniel 7:6",
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
        keyVerse: "\"Dreadful and terrible, and strong exceedingly; and it had great iron teeth.\" \u2014 Daniel 7:7",
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
        keyVerse: "\"He shall speak great words against the most High, and shall wear out the saints.\" \u2014 Daniel 7:25",
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
        keyVerse: "\"The judgment was set, and the books were opened.\" \u2014 Daniel 7:10",
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
        keyVerse: "\"One like the Son of man came with the clouds of heaven.\" \u2014 Daniel 7:13",
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
        keyVerse: "\"The ram which thou sawest having two horns are the kings of Media and Persia.\" \u2014 Daniel 8:20",
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
        keyVerse: "\"The rough goat is the king of Grecia: and the great horn is the first king.\" \u2014 Daniel 8:21",
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
        keyVerse: "\"Seventy weeks are determined upon thy people and upon thy holy city.\" \u2014 Daniel 9:24",
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
        keyVerse: "\"Unto two thousand and three hundred days; then shall the sanctuary be cleansed.\" \u2014 Daniel 8:14",
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
        keyVerse: "\"We have such an high priest, who is set on the right hand of the throne of the Majesty in the heavens.\" \u2014 Hebrews 8:1",
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
        keyVerse: "\"He that hath an ear, let him hear what the Spirit saith unto the churches.\" \u2014 Revelation 2:7",
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
        keyVerse: "\"How long, O Lord, holy and true, dost thou not judge and avenge our blood?\" \u2014 Revelation 6:10",
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
        keyVerse: "\"The seventh angel sounded; and there were great voices in heaven.\" \u2014 Revelation 11:15",
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
        keyVerse: "\"Fear God, and give glory to him; for the hour of his judgment is come.\" \u2014 Revelation 14:7",
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
        keyVerse: "\"The temple of God was opened in heaven, and there was seen the ark of his testament.\" \u2014 Revelation 11:19",
        interpretation: "The heavenly sanctuary is the center of God's government and the location of Christ's high-priestly ministry. The earthly sanctuary was a shadow of this heavenly reality, revealing the plan of salvation.",
        historicalFulfillment: "The sanctuary service illustrates salvation: the altar of sacrifice (the cross), the Holy Place (Christ's intercession since AD 31), and the Most Holy Place (the investigative judgment since 1844).",
        dateRange: "Eternal",
        icon: "home-outline",
        color: "#22C55E",
      },
      {
        id: "rev-littlehorn",
        title: "The Little Horn / Antichrist",
        bibleRef: "Revelation 13:1-10; Daniel 7:8, 25; 2 Thessalonians 2:3-4",
        keyVerse: "\"Who opposeth and exalteth himself above all that is called God.\" \u2014 2 Thessalonians 2:4",
        interpretation: "The sea beast of Revelation 13 parallels Daniel 7's Little Horn \u2014 a religio-political power that received authority from pagan Rome, ruled for 42 prophetic months (1,260 years), persecuted God's faithful, and demanded worship. Adventists identify this as the papal system, not individual Catholics.",
        historicalFulfillment: "The Papacy rose to political supremacy by AD 538 and exercised civil-religious authority until 1798, when Napoleon's general Berthier took Pope Pius VI captive \u2014 the 'deadly wound' of Revelation 13:3.",
        dateRange: "AD 538\u20131798",
        icon: "warning-outline",
        color: "#DC2626",
      },
      {
        id: "rev-mark",
        title: "The Mark of the Beast",
        bibleRef: "Revelation 13:16-17; 14:9-12",
        keyVerse: "\"Here is the patience of the saints: here are they that keep the commandments of God, and the faith of Jesus.\" \u2014 Revelation 14:12",
        interpretation: "The mark of the beast represents enforced false worship in opposition to God's commandments. Adventists understand the seal of God as Sabbath observance (Exodus 31:13, 17) and the mark as a future enforced counterfeit day of worship. This becomes a test of loyalty in the final crisis.",
        historicalFulfillment: "Not yet fully realized. Adventists see the groundwork being laid as religious liberty erodes globally. The mark will be enforced when civil-religious legislation compels worship contrary to God's law.",
        dateRange: "End Times",
        icon: "alert-circle-outline",
        color: "#F59E0B",
      },
      {
        id: "rev-secondcoming",
        title: "The Second Coming",
        bibleRef: "Revelation 19:11-16; 1 Thessalonians 4:16-17; Matthew 24:30-31",
        keyVerse: "\"Behold, he cometh with clouds; and every eye shall see him.\" \u2014 Revelation 1:7",
        interpretation: "The literal, visible, audible, glorious return of Jesus Christ. Not secret, not spiritual \u2014 every eye will see Him. The righteous dead are resurrected, the living righteous are translated, and together they meet the Lord in the air. This is the 'blessed hope' of the church.",
        historicalFulfillment: "Yet future. Adventists believe this event is imminent but reject date-setting. The signs of the times (Matthew 24, Revelation 6) confirm we are living in the last days.",
        dateRange: "Future",
        icon: "sunny-outline",
        color: "#22C55E",
      },
    ],
  },
];

const TIMELINE_MARKERS = [
  {
    year: "605 BC", label: "Babylon", color: "#D4A245",
    sectionId: "daniel2", symbolId: "d2-head",
    tooltip: "The golden kingdom in Daniel 2 and the lion in Daniel 7 represent Nebuchadnezzar's Babylon.",
    scriptureRef: "Daniel 2:37-38",
  },
  {
    year: "539 BC", label: "Medo-Persia", color: "#A0A0B0",
    sectionId: "daniel2", symbolId: "d2-chest",
    tooltip: "The silver kingdom in Daniel 2 and the ram in Daniel 8 represent the Medo-Persian Empire.",
    scriptureRef: "Daniel 2:39, Daniel 8:20",
  },
  {
    year: "331 BC", label: "Greece", color: "#CD7F32",
    sectionId: "daniel2", symbolId: "d2-thighs",
    tooltip: "The bronze kingdom in Daniel 2 and the swift leopard in Daniel 7 represent Alexander's Greece.",
    scriptureRef: "Daniel 2:39, Daniel 8:21",
  },
  {
    year: "168 BC", label: "Rome", color: "#6B6B6B",
    sectionId: "daniel7", symbolId: "d7-beast",
    tooltip: "The iron legs in Daniel 2 and the dreadful beast in Daniel 7 represent the Roman Empire.",
    scriptureRef: "Daniel 2:40, Daniel 7:7",
  },
  {
    year: "AD 476", label: "Divided Rome", color: "#8B7355",
    sectionId: "daniel2", symbolId: "d2-feet",
    tooltip: "The iron-and-clay feet represent the divided nations of Europe after Rome's fall.",
    scriptureRef: "Daniel 2:41-43",
  },
  {
    year: "AD 1798", label: "1260 Years End", color: "#9333EA",
    sectionId: "revelation", symbolId: "rev-littlehorn",
    tooltip: "The end of the 1,260-year prophecy when papal political authority received its 'deadly wound.'",
    scriptureRef: "Daniel 7:25, Revelation 13:3",
  },
  {
    year: "AD 1844", label: "Judgment", color: "#C9933A",
    sectionId: "daniel89", symbolId: "d89-2300",
    tooltip: "The 2,300-day prophecy culminates in the cleansing of the heavenly sanctuary and the investigative judgment.",
    scriptureRef: "Daniel 8:14",
  },
  {
    year: "Future", label: "God's Kingdom", color: "#22C55E",
    sectionId: "revelation", symbolId: "rev-secondcoming",
    tooltip: "The stone cut without hands destroys all earthly kingdoms. Christ returns and establishes an eternal kingdom.",
    scriptureRef: "Daniel 2:44, Revelation 19:11-16",
  },
];

const TIMELINE_LEGEND = [
  { label: "Scripture", color: "#C9933A" },
  { label: "History", color: "#3B82F6" },
  { label: "Prophecy", color: "#7C3AED" },
  { label: "Belief", color: "#2E7D32" },
  { label: "Hope", color: "#22C55E" },
];

function TimelineTooltip({
  marker,
  visible,
  theme,
}: {
  marker: typeof TIMELINE_MARKERS[0] | null;
  visible: boolean;
  theme: any;
}) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(6)).current;
  const prevVisibleRef = useRef(false);

  useEffect(() => {
    if (visible && marker) {
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 180, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 0, duration: 180, useNativeDriver: true }),
      ]).start();
    } else if (prevVisibleRef.current) {
      Animated.timing(fadeAnim, { toValue: 0, duration: 120, useNativeDriver: true }).start();
      slideAnim.setValue(6);
    }
    prevVisibleRef.current = visible;
  }, [visible, marker, fadeAnim, slideAnim]);

  if (!marker) return null;

  return (
    <Animated.View
      pointerEvents={visible ? "auto" : "none"}
      style={[
        tooltipStyles.container,
        {
          backgroundColor: theme.backgroundCard,
          borderColor: marker.color + "40",
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      <View style={tooltipStyles.header}>
        <View style={[tooltipStyles.dot, { backgroundColor: marker.color }]} />
        <Text style={[tooltipStyles.title, { color: theme.text }]}>{marker.label}</Text>
        <Text style={[tooltipStyles.year, { color: marker.color }]}>{marker.year}</Text>
      </View>
      <Text style={[tooltipStyles.desc, { color: theme.textSecondary }]} numberOfLines={3}>
        {marker.tooltip}
      </Text>
      <Text style={[tooltipStyles.ref, { color: marker.color }]}>{marker.scriptureRef}</Text>
    </Animated.View>
  );
}

const tooltipStyles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginBottom: 8,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  header: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 6,
    marginBottom: 4,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  title: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
    flex: 1,
  },
  year: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 11,
  },
  desc: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 4,
  },
  ref: {
    fontFamily: "Inter_500Medium",
    fontSize: 11,
    letterSpacing: 0.2,
  },
});

function TimelineBar({
  theme,
  activeMarkerId,
  onMarkerPress,
}: {
  theme: any;
  activeMarkerId: string | null;
  onMarkerPress: (marker: typeof TIMELINE_MARKERS[0]) => void;
}) {
  const timelineScrollRef = useRef<ScrollView>(null);
  const markerPositions = useRef<Record<string, number>>({});

  useEffect(() => {
    if (activeMarkerId && timelineScrollRef.current) {
      const x = markerPositions.current[activeMarkerId];
      if (x !== undefined) {
        timelineScrollRef.current.scrollTo({ x: Math.max(0, x - 120), animated: true });
      }
    }
  }, [activeMarkerId]);

  return (
    <View style={tbStyles.outerWrap}>
      <ScrollView
        ref={timelineScrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={tbStyles.scrollContent}
      >
        <View style={tbStyles.container}>
          <View style={[tbStyles.line, { backgroundColor: "rgba(201, 147, 58, 0.25)" }]} />
          <View style={tbStyles.markers}>
            {TIMELINE_MARKERS.map((marker) => {
              const isActive = activeMarkerId === marker.symbolId;
              return (
                <Pressable
                  key={marker.symbolId}
                  onLayout={(e) => {
                    markerPositions.current[marker.symbolId] = e.nativeEvent.layout.x;
                  }}
                  style={tbStyles.markerWrap}
                  onPress={() => onMarkerPress(marker)}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel={`${marker.year} — ${marker.label}. Tap to explore prophecy fulfillment.`}
                >
                  <View
                    style={[
                      tbStyles.dot,
                      {
                        backgroundColor: marker.color,
                        width: isActive ? 16 : 12,
                        height: isActive ? 16 : 12,
                        borderRadius: isActive ? 8 : 6,
                        borderWidth: isActive ? 2 : 0,
                        borderColor: isActive ? marker.color + "60" : "transparent",
                      },
                      isActive && {
                        shadowColor: marker.color,
                        shadowOpacity: 0.5,
                        shadowRadius: 6,
                        shadowOffset: { width: 0, height: 0 },
                        elevation: 4,
                      },
                    ]}
                  />
                  <Text
                    style={[
                      tbStyles.year,
                      {
                        color: marker.color,
                        fontFamily: isActive ? "Inter_700Bold" : "Inter_600SemiBold",
                        opacity: isActive ? 1 : 0.7,
                      },
                    ]}
                    numberOfLines={1}
                  >
                    {marker.year}
                  </Text>
                  <Text
                    style={[
                      tbStyles.label,
                      {
                        color: isActive ? marker.color : theme.textMuted,
                        fontFamily: isActive ? "Inter_600SemiBold" : "Inter_400Regular",
                        opacity: isActive ? 1 : 0.6,
                      },
                    ]}
                    numberOfLines={1}
                  >
                    {marker.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      </ScrollView>
      <View style={tbStyles.legendRow}>
        {TIMELINE_LEGEND.map((item) => (
          <View key={item.label} style={tbStyles.legendItem}>
            <View style={[tbStyles.legendDot, { backgroundColor: item.color }]} />
            <Text style={[tbStyles.legendLabel, { color: theme.textMuted }]}>{item.label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const tbStyles = StyleSheet.create({
  outerWrap: {
    marginBottom: 20,
  },
  scrollContent: {
    paddingHorizontal: 16,
  },
  container: {
    position: "relative" as const,
    minWidth: 520,
  },
  line: {
    position: "absolute" as const,
    top: 7,
    left: 20,
    right: 20,
    height: 2,
  },
  markers: {
    flexDirection: "row" as const,
    justifyContent: "space-between" as const,
  },
  markerWrap: {
    alignItems: "center" as const,
    width: 60,
    paddingTop: 0,
  },
  dot: {
    marginBottom: 5,
  },
  year: {
    fontSize: 9,
    letterSpacing: 0.3,
  },
  label: {
    fontSize: 9,
    marginTop: 1,
    textAlign: "center" as const,
  },
  legendRow: {
    flexDirection: "row" as const,
    justifyContent: "center" as const,
    gap: 12,
    marginTop: 10,
    paddingHorizontal: 16,
  },
  legendItem: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 4,
  },
  legendDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  legendLabel: {
    fontFamily: "Inter_400Regular",
    fontSize: 10,
  },
});

function SymbolCard({
  symbol,
  isExpanded,
  onToggle,
  theme,
  isViewed,
}: {
  symbol: ProphecySymbol;
  isExpanded: boolean;
  onToggle: () => void;
  theme: any;
  isViewed?: boolean;
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
        {isViewed && !isExpanded && (
          <Ionicons name="checkmark-circle" size={14} color="#2E7D32" />
        )}
        <Ionicons
          name={isExpanded ? "chevron-up" : "chevron-down"}
          size={16}
          color={theme.textMuted}
        />
      </View>

      {isExpanded && (
        <View style={scStyles.expanded}>
          {symbol.keyVerse && (
            <View style={[scStyles.detailBlock, scStyles.keyVerseBlock, { backgroundColor: symbol.color + "0A", borderColor: symbol.color + "20" }]}>
              <View style={scStyles.detailHeader}>
                <Ionicons name="bookmark-outline" size={12} color={symbol.color} />
                <Text style={[scStyles.detailLabel, { color: symbol.color }]}>
                  Key Verse
                </Text>
              </View>
              <Text style={[scStyles.keyVerseText, { color: theme.text }]}>
                {symbol.keyVerse}
              </Text>
            </View>
          )}

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
    fontSize: 12,
    letterSpacing: 0.3,
    textTransform: "uppercase" as const,
  },
  detailText: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    lineHeight: 20,
    marginTop: 2,
  },
  keyVerseBlock: {
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  keyVerseText: {
    fontFamily: "Lora_600SemiBold",
    fontSize: 13,
    lineHeight: 20,
    fontStyle: "italic" as const,
    marginTop: 4,
  },
});

function SectionCard({
  section,
  expandedSymbolId,
  onToggleSymbol,
  isSectionExpanded,
  onToggleSection,
  theme,
  viewedSymbols,
}: {
  section: ProphecySection;
  expandedSymbolId: string | null;
  onToggleSymbol: (id: string) => void;
  isSectionExpanded: boolean;
  onToggleSection: () => void;
  theme: any;
  viewedSymbols: Set<string>;
}) {
  const viewedCount = section.symbols.filter((s) => viewedSymbols.has(s.id)).length;
  const allViewed = viewedCount === section.symbols.length && viewedCount > 0;
  const someViewed = viewedCount > 0 && !allViewed;

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
          {allViewed ? (
            <View style={secStyles.progressIndicator}>
              <Ionicons name="checkmark-circle" size={13} color="#2E7D32" />
              <Text style={secStyles.completedLabel}>Explored</Text>
            </View>
          ) : someViewed ? (
            <View style={secStyles.progressIndicator}>
              <Text style={secStyles.inProgressLabel}>{viewedCount}/{section.symbols.length} viewed</Text>
            </View>
          ) : null}
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
              isViewed={viewedSymbols.has(symbol.id)}
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
    fontFamily: "Lora_700Bold",
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
  progressIndicator: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 4,
    marginTop: 4,
  },
  completedLabel: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 11,
    color: "#2E7D32",
  },
  inProgressLabel: {
    fontFamily: "Inter_500Medium",
    fontSize: 11,
    color: "#C9933A",
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
  const [viewedSymbols, setViewedSymbols] = useState<Set<string>>(new Set());
  const [activeMarkerId, setActiveMarkerId] = useState<string | null>(null);
  const [tooltipMarker, setTooltipMarker] = useState<typeof TIMELINE_MARKERS[0] | null>(null);
  const [tooltipVisible, setTooltipVisible] = useState(false);
  const scrollRef = useRef<ScrollView>(null);
  const sectionYPositions = useRef<Record<string, number>>({});
  const scrollDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isUserTapScroll = useRef(false);

  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  useEffect(() => {
    track("prophecy_explorer_opened");
    AsyncStorage.getItem(PROPHECY_VIEWED_KEY).then((val) => {
      if (val) {
        try {
          setViewedSymbols(new Set(JSON.parse(val) as string[]));
        } catch {}
      }
    });
  }, []);

  const markSymbolViewed = useCallback((symbolId: string) => {
    setViewedSymbols((prev) => {
      if (prev.has(symbolId)) return prev;
      const next = new Set(prev);
      next.add(symbolId);
      AsyncStorage.setItem(PROPHECY_VIEWED_KEY, JSON.stringify([...next])).catch(() => {});
      return next;
    });
  }, []);

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
    setExpandedSymbol((prev) => {
      if (prev === id) return null;
      markSymbolViewed(id);
      return id;
    });
  }, [markSymbolViewed]);

  const handleTimelineMarkerPress = useCallback((marker: typeof TIMELINE_MARKERS[0]) => {
    isUserTapScroll.current = true;
    setTooltipMarker(marker);
    setTooltipVisible(true);
    setActiveMarkerId(marker.symbolId);

    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedSections((prev) => {
      const next = new Set(prev);
      next.add(marker.sectionId);
      return next;
    });
    setExpandedSymbol(marker.symbolId);
    markSymbolViewed(marker.symbolId);

    setTimeout(() => {
      const y = sectionYPositions.current[marker.sectionId];
      if (y !== undefined && scrollRef.current) {
        scrollRef.current.scrollTo({ y: y - 10, animated: true });
      }
      setTimeout(() => {
        isUserTapScroll.current = false;
      }, 400);
    }, 150);
  }, [markSymbolViewed]);

  const handleScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (isUserTapScroll.current) return;

    const scrollY = event.nativeEvent.contentOffset.y + 150;

    if (tooltipVisible) {
      setTooltipVisible(false);
    }

    if (scrollDebounceRef.current) {
      clearTimeout(scrollDebounceRef.current);
    }
    scrollDebounceRef.current = setTimeout(() => {

      let bestSection: string | null = null;
      for (const section of PROPHECY_SECTIONS) {
        const sectionY = sectionYPositions.current[section.id];
        if (sectionY !== undefined && scrollY >= sectionY) {
          bestSection = section.id;
        }
      }

      if (bestSection) {
        const matchingMarker = TIMELINE_MARKERS.find((m) => m.sectionId === bestSection);
        if (matchingMarker) {
          setActiveMarkerId((prev) =>
            prev !== matchingMarker.symbolId ? matchingMarker.symbolId : prev
          );
        }
      } else {
        setActiveMarkerId(null);
      }
    }, 80);
  }, [tooltipVisible]);

  const handleSectionLayout = useCallback((sectionId: string, y: number) => {
    sectionYPositions.current[sectionId] = y;
  }, []);

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ScreenHeader
        title="Prophecy Explorer"
        subtitle="Daniel & Revelation Timelines"
      />

      <ScrollView
        ref={scrollRef}
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomPad + 40 }]}
        showsVerticalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={100}
      >
        <View style={styles.introBlock}>
          <Text style={[styles.introText, { color: theme.textSecondary }]}>
            Explore the great prophetic timelines of Daniel and Revelation. Each
            symbol is identified by Scripture, interpreted through Adventist
            theology, and connected to its historical fulfillment.
          </Text>
        </View>

        <View style={[styles.methodBadge, { backgroundColor: "rgba(201, 147, 58, 0.08)", borderColor: "rgba(201, 147, 58, 0.2)" }]}>
          <Ionicons name="school-outline" size={14} color="#C9933A" />
          <Text style={[styles.methodText, { color: "#C9933A" }]}>
            Historicist interpretation used by Seventh-day Adventists
          </Text>
        </View>

        <View style={styles.introCardsSection}>
          <Text style={[styles.introCardsHeading, { color: theme.text }]}>
            How to Understand Bible Prophecy
          </Text>

          <View style={[styles.introCard, { backgroundColor: theme.backgroundCard, borderColor: theme.border }]}>
            <View style={[styles.introCardIconWrap, { backgroundColor: "rgba(59, 130, 246, 0.12)" }]}>
              <Ionicons name="eye-outline" size={20} color="#3B82F6" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.introCardTitle, { color: theme.text }]}>Symbolic Language</Text>
              <Text style={[styles.introCardDesc, { color: theme.textSecondary }]}>
                Bible prophecy uses vivid imagery — beasts, horns, and other symbols — to represent kingdoms, powers, and movements across history. Understanding these symbols unlocks the prophetic narrative.
              </Text>
            </View>
          </View>

          <View style={[styles.introCard, { backgroundColor: theme.backgroundCard, borderColor: theme.border }]}>
            <View style={[styles.introCardIconWrap, { backgroundColor: "rgba(124, 58, 237, 0.12)" }]}>
              <Ionicons name="time-outline" size={20} color="#7C3AED" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.introCardTitle, { color: theme.text }]}>Historicist Method</Text>
              <Text style={[styles.introCardDesc, { color: theme.textSecondary }]}>
                Adventists interpret prophecy as a continuous unfolding through history, from ancient empires to the present day. This approach connects biblical visions to real, verifiable historical events.
              </Text>
            </View>
          </View>

          <View style={[styles.introCard, { backgroundColor: theme.backgroundCard, borderColor: theme.border }]}>
            <View style={[styles.introCardIconWrap, { backgroundColor: "rgba(201, 147, 58, 0.12)" }]}>
              <Ionicons name="library-outline" size={20} color="#C9933A" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.introCardTitle, { color: theme.text }]}>Daniel Before Revelation</Text>
              <Text style={[styles.introCardDesc, { color: theme.textSecondary }]}>
                The book of Daniel lays the foundation for understanding Revelation. The same kingdoms, timelines, and themes introduced in Daniel are expanded and completed in Revelation.
              </Text>
            </View>
          </View>

          <Pressable
            onPress={() => {
              const firstSectionY = sectionYPositions.current[PROPHECY_SECTIONS[0].id];
              if (firstSectionY !== undefined && scrollRef.current) {
                scrollRef.current.scrollTo({ y: firstSectionY - 20, animated: true });
              } else {
                setTimeout(() => {
                  const retryY = sectionYPositions.current[PROPHECY_SECTIONS[0].id];
                  if (retryY !== undefined && scrollRef.current) {
                    scrollRef.current.scrollTo({ y: retryY - 20, animated: true });
                  } else {
                    scrollRef.current?.scrollTo({ y: 800, animated: true });
                  }
                }, 300);
              }
            }}
            style={({ pressed }) => [
              styles.beginButton,
              { opacity: pressed ? 0.85 : 1 },
            ]}
          >
            <Ionicons name="compass-outline" size={18} color="#FFF" />
            <Text style={styles.beginButtonText}>Begin Prophecy Study</Text>
            <Ionicons name="arrow-down" size={16} color="#FFF" />
          </Pressable>
        </View>

        <TimelineTooltip marker={tooltipMarker} visible={tooltipVisible} theme={theme} />
        <TimelineBar theme={theme} activeMarkerId={activeMarkerId} onMarkerPress={handleTimelineMarkerPress} />

        {PROPHECY_SECTIONS.map((section) => (
          <View
            key={section.id}
            onLayout={(e) => handleSectionLayout(section.id, e.nativeEvent.layout.y)}
          >
            <SectionCard
              section={section}
              expandedSymbolId={expandedSymbol}
              onToggleSymbol={toggleSymbol}
              isSectionExpanded={expandedSections.has(section.id)}
              onToggleSection={() => toggleSection(section.id)}
              theme={theme}
              viewedSymbols={viewedSymbols}
            />
          </View>
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
  methodBadge: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 8,
    marginHorizontal: 4,
    marginBottom: 20,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
  },
  methodText: {
    fontFamily: "Inter_500Medium",
    fontSize: 12,
    letterSpacing: 0.2,
    flex: 1,
  },
  introCardsSection: {
    marginHorizontal: 4,
    marginBottom: 20,
    gap: 10,
  },
  introCardsHeading: {
    fontFamily: "Lora_700Bold",
    fontSize: 18,
    lineHeight: 24,
    marginBottom: 4,
    paddingHorizontal: 4,
  },
  introCard: {
    flexDirection: "row" as const,
    alignItems: "flex-start" as const,
    gap: 12,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  introCardIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    marginTop: 2,
  },
  introCardTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 4,
  },
  introCardDesc: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    lineHeight: 20,
  },
  beginButton: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    gap: 8,
    backgroundColor: "#C9933A",
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    marginTop: 4,
  },
  beginButtonText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
    color: "#FFF",
    letterSpacing: 0.3,
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
    fontFamily: "Lora_700Bold",
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
