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
  Linking,
  Image,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useQuery } from "@tanstack/react-query";
import { useTheme } from "@/hooks/useTheme";
import { track } from "@/lib/analytics";
import ScreenHeader from "@/components/ScreenHeader";
import { PROPHECY_TEACHING_VIDEOS as PROPHECY_VIDEOS } from "@/data/curatedYoutubeVideos";

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
  observation?: {
    prompt: string;
    clues: string[];
  };
  interpretationClues?: {
    selfInterpreting?: string;
    crossRefs?: { ref: string; insight: string }[];
    reasoning: string;
  };
  adventistConclusion?: {
    summary: string;
    whyThisFits: string;
  };
  reflection?: string;
}

interface ProphecySection {
  id: string;
  title: string;
  subtitle: string;
  icon: string;
  color: string;
  symbols: ProphecySymbol[];
}

interface BibleBook {
  id: number | string;
  name: string;
  abbreviation?: string;
}

function normalizeBookName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9 ]/g, "").replace(/\s+/g, " ").trim();
}

function navigateToBibleRef(ref: string, books: BibleBook[]) {
  if (!ref || books.length === 0) return;

  const primaryRef = ref.split(";")[0]?.trim() || ref.trim();
  const match = primaryRef.match(/^((?:[1-3]\s*)?[A-Za-z]+(?:\s+[A-Za-z]+)*)\s+(\d+)/);
  if (!match) return;

  const bookName = normalizeBookName(match[1]);
  const chapter = Number.parseInt(match[2], 10);
  if (!Number.isFinite(chapter) || chapter < 1) return;

  const book = books.find((b) => {
    const byName = normalizeBookName(b.name) === bookName;
    const byAbbrev = b.abbreviation
      ? normalizeBookName(b.abbreviation) === bookName
      : false;
    return byName || byAbbrev;
  });
  if (!book) return;

  router.push(`/read/${book.id}/${chapter}` as any);
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
        observation: {
          prompt: "Read Daniel 2:32 and 37-38. What do you notice about the head of the statue?",
          clues: [
            "The head is made of gold \u2014 the most precious metal in the image",
            "It is the first part listed, starting from the top",
            "Daniel speaks directly to the king: 'Thou art this head of gold'",
            "Gold suggests supreme glory and wealth",
          ],
        },
        interpretationClues: {
          selfInterpreting: "This symbol is explicitly interpreted in the text itself. Daniel 2:38 says directly to Nebuchadnezzar: 'Thou art this head of gold.' No guesswork is needed \u2014 God told the king exactly what the head represents.",
          crossRefs: [
            { ref: "Daniel 2:37", insight: "God gave Nebuchadnezzar his 'kingdom, power, strength, and glory' \u2014 the gold represents God-given authority, not just wealth." },
            { ref: "Jeremiah 51:7", insight: "Babylon is called a 'golden cup in the Lord's hand' \u2014 other prophets also associate Babylon with gold." },
          ],
          reasoning: "This is one of the clearest examples of a self-interpreting prophecy. The Bible does not leave you guessing: it names the kingdom directly. The study method here is simple \u2014 let Scripture interpret Scripture. When the text itself gives the meaning, start there.",
        },
        adventistConclusion: {
          summary: "The head of gold represents the Babylonian Empire under Nebuchadnezzar (605\u2013539 BC).",
          whyThisFits: "Virtually all Bible scholars agree on this identification because the text states it explicitly. The gold matches Babylon's legendary wealth -- Herodotus described its golden temples and altars. Its position at the top matches Babylon as the first empire.",
        },
        reflection: "God revealed the identity of this symbol directly in the text. What does it tell you about God's approach to prophecy that He begins with something this clear and unmistakable?",
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
        observation: {
          prompt: "Read Daniel 2:32 and 39. What does the text tell you about this kingdom compared to the first?",
          clues: [
            "Silver is less valuable than gold \u2014 a step down in glory",
            "Two arms \u2014 the body part itself suggests a dual power",
            "The text says 'another kingdom inferior to thee' \u2014 it comes after Babylon",
            "The prophecy follows a downward sequence of metals",
          ],
        },
        interpretationClues: {
          selfInterpreting: "Daniel 2:39 says 'after thee shall arise another kingdom inferior to thee.' The text tells you three things: (1) it comes after Babylon, (2) it is a kingdom, (3) it is 'inferior' \u2014 matching the lesser metal.",
          crossRefs: [
            { ref: "Daniel 5:28, 31", insight: "Later in Daniel, we learn that Babylon fell to 'the Medes and Persians' \u2014 Daniel itself names the next empire." },
            { ref: "Daniel 8:20", insight: "In Daniel 8, the angel Gabriel explicitly says 'the ram which thou sawest having two horns are the kings of Media and Persia.'" },
          ],
          reasoning: "Daniel's own book names this empire later. The two arms match the dual alliance of Medes and Persians. Silver's lesser value matches the text: 'inferior to thee.' The study method: let later chapters clarify earlier symbols.",
        },
        adventistConclusion: {
          summary: "The chest and arms of silver represent the Medo-Persian Empire (539\u2013331 BC).",
          whyThisFits: "Daniel's own later chapters (5 and 8) name Medo-Persia explicitly. The two arms match the two-nation alliance. Silver's lesser value matches the text: 'inferior to thee.'",
        },
        reflection: "Notice how the Bible interprets itself \u2014 Daniel 8:20 names this empire by name. How does this 'Scripture interprets Scripture' principle change the way you approach other prophetic symbols?",
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
        observation: {
          prompt: "Read Daniel 2:32 and 39. What distinguishing detail does the text give about this third kingdom?",
          clues: [
            "Bronze (brass) \u2014 continues the pattern of descending metal value",
            "It 'shall bear rule over all the earth' \u2014 emphasizing global reach",
            "Third in the sequence \u2014 it follows the kingdom that followed Babylon",
            "The text gives fewer details than the first two, suggesting the focus is on the sequence pattern",
          ],
        },
        interpretationClues: {
          selfInterpreting: "The text identifies this as 'a third kingdom' that 'shall bear rule over all the earth.' It comes after Medo-Persia in the sequence and is distinguished by unprecedented geographic reach.",
          crossRefs: [
            { ref: "Daniel 8:21", insight: "The angel Gabriel says directly: 'the rough goat is the king of Grecia: and the great horn between his eyes is the first king.' Daniel names Greece explicitly." },
            { ref: "Daniel 11:2-3", insight: "'A mighty king shall stand up, that shall rule with great dominion' \u2014 widely understood as Alexander the Great." },
          ],
          reasoning: "Daniel interprets Daniel. Chapter 8 names Greece by name. The bronze matches Greek military culture -- bronze armor and weapons were distinctive of Greek warfare. 'Rule over all the earth' matches Alexander's conquest from Greece to India in just 10 years.",
        },
        adventistConclusion: {
          summary: "The belly and thighs of bronze represent the Greek Empire under Alexander the Great (331\u2013168 BC).",
          whyThisFits: "Daniel 8:21 names Greece by name. 'Bear rule over all the earth' matches Alexander's conquest of the known world by age 30. Greek soldiers were famously bronze-clad.",
        },
        reflection: "Three empires are now identified, and all three are named somewhere in Daniel itself. What does this pattern suggest about how to approach the fourth kingdom, which the text does not name?",
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
        observation: {
          prompt: "Read Daniel 2:33 and 40. What details does the text emphasize about this fourth kingdom?",
          clues: [
            "Iron \u2014 the strongest metal in the image, but least valuable",
            "'Strong as iron' \u2014 the text stresses crushing military power",
            "'Breaketh in pieces and subdueth all things' \u2014 total domination",
            "Two legs \u2014 the body part suggests an eventual division into two",
          ],
        },
        interpretationClues: {
          selfInterpreting: "Unlike the first three, the text does not name this kingdom elsewhere in Daniel. Instead, it gives detailed characteristics: iron strength, crushing power, and the ability to subdue 'all things.' You must now use the sequence and the description to identify it.",
          crossRefs: [
            { ref: "Daniel 7:7", insight: "The fourth beast is 'dreadful and terrible, and strong exceedingly; and it had great iron teeth: it devoured and brake in pieces.' Iron again \u2014 connecting the two visions." },
            { ref: "Luke 2:1", insight: "The New Testament confirms which empire ruled the world at Christ's birth: 'a decree from Caesar Augustus, that all the world should be taxed.' Rome." },
          ],
          reasoning: "The text does not name this kingdom, but gives you tools: (1) it must come after Greece, (2) it has iron strength and crushing power, (3) Daniel 7 repeats the iron imagery. Only one empire conquered Greece and matched this description: Rome.",
        },
        adventistConclusion: {
          summary: "The legs of iron represent the Roman Empire (168 BC\u2013AD 476).",
          whyThisFits: "Rome conquered Greece, was known for iron-like military power, and dominated the ancient world. It eventually split into Eastern and Western halves -- matching the two legs. The New Testament confirms Rome's rule at Christ's birth.",
        },
        reflection: "The first three kingdoms are named directly in Daniel. The fourth is identified by evidence and sequence. What does this teach you about studying prophecy when the text gives characteristics instead of names?",
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
        observation: {
          prompt: "Read Daniel 2:33 and 41-43. What is unusual about this part of the image compared to the rest?",
          clues: [
            "Mixed materials \u2014 iron and clay together, unlike the pure metals above",
            "'Partly strong, and partly broken' \u2014 no longer one unified power",
            "Toes (ten) \u2014 multiple divisions, not a single empire",
            "'They shall not cleave one to another' \u2014 a specific prediction about failed reunification",
            "The mixture gets weaker, not stronger \u2014 the downward pattern continues",
          ],
        },
        interpretationClues: {
          selfInterpreting: "The text interprets the mixture itself in verses 41-43: the kingdom 'shall be divided,' it will be 'partly strong, and partly broken,' and 'they shall not cleave one to another.' This is not a new empire \u2014 it is the fragmentation of the iron empire.",
          crossRefs: [
            { ref: "Daniel 7:24", insight: "'The ten horns out of this kingdom are ten kings that shall arise' \u2014 Daniel 7 confirms the fourth kingdom divides into multiple kingdoms, not one successor." },
          ],
          reasoning: "The prophecy makes a testable prediction: after Rome, there will be no fifth universal empire. 'They shall not cleave one to another.' For over 1,500 years, every attempt to reunify Europe has failed -- Charlemagne, Napoleon, Hitler. The prophecy's accuracy is in its negative prediction.",
        },
        adventistConclusion: {
          summary: "The feet of iron and clay represent the divided nations of Europe from AD 476 to the present day.",
          whyThisFits: "Europe never reunified into a single empire. The iron-clay mixture matches strong and weak nations coexisting. 'They shall not cleave one to another' has been confirmed for over 1,500 years.",
        },
        reflection: "This prophecy predicts what will NOT happen. After more than 1,500 years of failed reunification attempts, what does this tell you about the reliability of Bible prophecy? How does a testable, falsifiable prediction strengthen your confidence in Scripture?",
      },
      {
        id: "d2-stone",
        title: "The Stone",
        bibleRef: "Daniel 2:34-35, 44-45",
        keyVerse: "\"The God of heaven shall set up a kingdom, which shall never be destroyed.\" \u2014 Daniel 2:44",
        interpretation: "God's Eternal Kingdom \u2014 the stone cut without hands represents Christ's coming kingdom that will destroy all earthly powers and fill the whole earth forever.",
        historicalFulfillment: "Yet future. This points to the Second Coming of Christ, when God will establish His eternal kingdom that shall never be destroyed.",
        icon: "diamond-outline",
        color: "#22C55E",
        observation: {
          prompt: "Read Daniel 2:34-35 and 44-45. How is the stone different from every other part of the image?",
          clues: [
            "'Cut out without hands' \u2014 not human-made, unlike the metals which represent human empires",
            "It strikes the feet \u2014 it arrives during the time of the divided kingdoms, not before",
            "It destroys the entire image at once \u2014 all traces of human empire are removed",
            "It becomes a 'great mountain' that fills 'the whole earth' \u2014 total replacement, not partial reform",
            "The text says 'the God of heaven shall set up a kingdom' \u2014 divine origin",
          ],
        },
        interpretationClues: {
          selfInterpreting: "Daniel 2:44-45 interprets the stone directly: 'The God of heaven shall set up a kingdom, which shall never be destroyed.' The stone is God's kingdom. It is 'cut out without hands' \u2014 divine, not human in origin.",
          crossRefs: [
            { ref: "Revelation 11:15", insight: "'The kingdoms of this world are become the kingdoms of our Lord, and of his Christ; and he shall reign for ever and ever.' The same concept \u2014 God's kingdom replacing all earthly kingdoms." },
            { ref: "Matthew 21:44", insight: "Jesus references a stone that falls and grinds to powder \u2014 possibly alluding to Daniel 2." },
          ],
          reasoning: "Notice the timing: the stone strikes the feet, not the head or the legs. This means God's kingdom arrives during the time of the divided nations (the iron and clay period), not during Babylon or Rome. Since we are living in the period of the divided nations right now, this prophecy places God's kingdom as still future \u2014 the next event in the sequence.",
        },
        adventistConclusion: {
          summary: "The stone represents the kingdom of God, established at the Second Coming of Christ.",
          whyThisFits: "The stone strikes the feet (the divided-nations era), which means it has not yet come. It cannot refer to Christ's first coming during the Roman era. 'Without hands' means it is entirely God's doing.",
        },
        reflection: "The prophecy traces a sequence from Babylon to your own time period \u2014 the divided nations. The next event is the stone. If the prophecy has been accurate through five stages of history, what does that suggest about the sixth?",
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
        interpretation: "Papal Rome \u2014 arose among the ten horns, uprooted three, persecuted God's people, and attempted to change His times and law. Ruled for 1,260 years.",
        historicalFulfillment: "This power is identified as the Papacy, which rose to political power after Rome's fall, persecuted dissenters during the medieval period, and exercised dominion from AD 538 to 1798.",
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
        historicalFulfillment: "This judgment began in 1844, corresponding to the cleansing of the sanctuary in Daniel 8:14, and continues until Christ's return.",
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
        historicalFulfillment: "Using the year-day principle, 2,300 years from 457 BC reaches 1844. This marks the beginning of Christ's final ministry in the Most Holy Place of the heavenly sanctuary.",
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
        historicalFulfillment: "Since 1844, Christ has been conducting the pre-advent judgment, reviewing the records of all who have professed faith, before His return.",
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
        interpretation: "Seven phases of the church's experience with persecution and deliverance, revealing the cost of faithfulness and God's ultimate vindication.",
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
        interpretation: "God's final message to the world before Christ's return. First angel: worship the Creator. Second angel: Babylon has fallen. Third angel: warning against the mark of the beast.",
        historicalFulfillment: "These messages began going to the world in the 1840s and continue today, forming the heart of the remnant church's mission.",
        dateRange: "1844\u2013Second Coming",
        icon: "paper-plane-outline",
        color: "#C9933A",
      },
      {
        id: "rev-sanctuary",
        title: "The Sanctuary",
        bibleRef: "Revelation 11:19; Hebrews 8\u20139",
        keyVerse: "\"The temple of God was opened in heaven, and there was seen the ark of his testament.\" \u2014 Revelation 11:19",
        interpretation: "The heavenly sanctuary is the center of God's government and the location of Christ's high-priestly ministry. The earthly sanctuary was a shadow of this reality.",
        historicalFulfillment: "Altar of sacrifice (the cross), Holy Place (Christ's intercession since AD 31), Most Holy Place (the investigative judgment since 1844).",
        dateRange: "Eternal",
        icon: "home-outline",
        color: "#22C55E",
      },
      {
        id: "rev-littlehorn",
        title: "The Little Horn / Antichrist",
        bibleRef: "Revelation 13:1-10; Daniel 7:8, 25; 2 Thessalonians 2:3-4",
        keyVerse: "\"Who opposeth and exalteth himself above all that is called God.\" \u2014 2 Thessalonians 2:4",
        interpretation: "The sea beast of Revelation 13 parallels Daniel 7's Little Horn. It received authority from pagan Rome, ruled for 1,260 years, persecuted God's faithful, and demanded worship. This identifies a power structure, not individual Catholics.",
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
        interpretation: "The mark represents enforced false worship opposed to God's commandments. The seal of God is Sabbath observance (Exodus 31:13, 17). The mark is a future enforced counterfeit -- a test of loyalty in the final crisis.",
        historicalFulfillment: "Not yet fully realized. The groundwork is being laid as religious liberty erodes. The mark will be enforced when legislation compels worship contrary to God's law.",
        dateRange: "End Times",
        icon: "alert-circle-outline",
        color: "#F59E0B",
      },
      {
        id: "rev-secondcoming",
        title: "The Second Coming",
        bibleRef: "Revelation 19:11-16; 1 Thessalonians 4:16-17; Matthew 24:30-31",
        keyVerse: "\"Behold, he cometh with clouds; and every eye shall see him.\" \u2014 Revelation 1:7",
        interpretation: "The literal, visible, glorious return of Jesus Christ. Every eye will see Him. The righteous dead are raised, the living saints translated, and together they meet the Lord in the air.",
        historicalFulfillment: "Yet future. Scripture forbids date-setting, but the signs of the times (Matthew 24, Revelation 6) confirm we are living in the last days.",
        dateRange: "Future",
        icon: "sunny-outline",
        color: "#22C55E",
      },
    ],
  },
];

const EXPLORER_TEACHER_VIDEOS = [
  ...PROPHECY_VIDEOS.daniel2,
  ...PROPHECY_VIDEOS.daniel7,
  ...PROPHECY_VIDEOS.daniel89,
  ...PROPHECY_VIDEOS.revelation,
];



function SymbolCard({
  symbol,
  isExpanded,
  onToggle,
  theme,
  isViewed,
  books,
}: {
  symbol: ProphecySymbol;
  isExpanded: boolean;
  onToggle: () => void;
  theme: any;
  isViewed?: boolean;
  books: BibleBook[];
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
          <Pressable
            onPress={(e) => {
              e.stopPropagation();
              navigateToBibleRef(symbol.bibleRef, books);
            }}
            hitSlop={6}
          >
            <Text style={[scStyles.ref, scStyles.interactiveRef]}>{symbol.bibleRef}</Text>
          </Pressable>
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

      {isExpanded && symbol.observation ? (
        <View style={scStyles.expanded}>
          <View style={scStyles.studyStep}>
            <View style={[scStyles.stepBullet, { backgroundColor: symbol.color + "25" }]}>
              <Text style={[scStyles.stepNum, { color: symbol.color }]}>1</Text>
            </View>
            <View style={{ flex: 1 }}>
              <View style={scStyles.detailHeader}>
                <Ionicons name="eye-outline" size={12} color={symbol.color} />
                <Text style={[scStyles.detailLabel, { color: symbol.color }]}>
                  Observation
                </Text>
              </View>
              <View style={[scStyles.refChip, { borderColor: symbol.color + "30", backgroundColor: symbol.color + "0A" }]}>
                <Ionicons name="document-text-outline" size={12} color="#C9933A" />
                <Pressable
                  onPress={(e) => {
                    e.stopPropagation();
                    navigateToBibleRef(symbol.bibleRef, books);
                  }}
                  hitSlop={6}
                >
                  <Text style={[scStyles.refChipText, scStyles.interactiveRefChip]}>{symbol.bibleRef}</Text>
                </Pressable>
              </View>
              <Text style={[scStyles.observationPrompt, { color: theme.text }]}>
                {symbol.observation.prompt}
              </Text>
              <View style={scStyles.cluesList}>
                {symbol.observation.clues.map((clue, i) => (
                  <View key={i} style={scStyles.clueRow}>
                    <View style={[scStyles.clueDot, { backgroundColor: symbol.color + "50" }]} />
                    <Text style={[scStyles.clueText, { color: theme.textSecondary }]}>{clue}</Text>
                  </View>
                ))}
              </View>
            </View>
          </View>

          {symbol.interpretationClues && (
            <View style={scStyles.studyStep}>
              <View style={[scStyles.stepBullet, { backgroundColor: "rgba(147, 51, 234, 0.15)" }]}>
                <Text style={[scStyles.stepNum, { color: "#9333EA" }]}>2</Text>
              </View>
              <View style={{ flex: 1 }}>
                <View style={scStyles.detailHeader}>
                  <Ionicons name="search-outline" size={12} color="#9333EA" />
                  <Text style={[scStyles.detailLabel, { color: "#9333EA" }]}>
                    Interpretation clues
                  </Text>
                </View>
                {symbol.interpretationClues.selfInterpreting && (
                  <View style={[scStyles.selfInterpBlock, { backgroundColor: "#9333EA" + "0A", borderColor: "#9333EA" + "20" }]}>
                    <View style={scStyles.detailHeader}>
                      <Ionicons name="key-outline" size={11} color="#9333EA" />
                      <Text style={[scStyles.subLabel, { color: "#9333EA" }]}>What the text itself says</Text>
                    </View>
                    <Text style={[scStyles.detailText, { color: theme.textSecondary }]}>
                      {symbol.interpretationClues.selfInterpreting}
                    </Text>
                  </View>
                )}
                {symbol.interpretationClues.crossRefs && symbol.interpretationClues.crossRefs.length > 0 && (
                  <View style={scStyles.crossRefsList}>
                    <View style={scStyles.detailHeader}>
                      <Ionicons name="link-outline" size={11} color="#9333EA" />
                      <Text style={[scStyles.subLabel, { color: "#9333EA" }]}>Scripture cross-references</Text>
                    </View>
                    {symbol.interpretationClues.crossRefs.map((cr, i) => (
                      <View key={i} style={[scStyles.crossRefItem, { borderColor: "#9333EA" + "15" }]}>
                        <Text style={[scStyles.crossRefRef, { color: "#9333EA" }]}>{cr.ref}</Text>
                        <Text style={[scStyles.crossRefInsight, { color: theme.textSecondary }]}>{cr.insight}</Text>
                      </View>
                    ))}
                  </View>
                )}
                <Text style={[scStyles.reasoningText, { color: theme.textSecondary }]}>
                  {symbol.interpretationClues.reasoning}
                </Text>
              </View>
            </View>
          )}

          <View style={scStyles.studyStep}>
            <View style={[scStyles.stepBullet, { backgroundColor: "rgba(59,130,246,0.15)" }]}>
              <Text style={[scStyles.stepNum, { color: "#3B82F6" }]}>3</Text>
            </View>
            <View style={{ flex: 1 }}>
              <View style={scStyles.detailHeader}>
                <Ionicons name="time-outline" size={12} color="#3B82F6" />
                <Text style={[scStyles.detailLabel, { color: "#3B82F6" }]}>
                  Historical fit
                </Text>
                {symbol.dateRange && (
                  <View style={[scStyles.fulfilledBadge, { backgroundColor: "#3B82F6" + "18" }]}>
                    <Text style={[scStyles.fulfilledDate, { color: "#3B82F6" }]}>{symbol.dateRange}</Text>
                  </View>
                )}
              </View>
              <Text style={[scStyles.detailText, { color: theme.textSecondary }]}>
                {symbol.historicalFulfillment}
              </Text>
            </View>
          </View>

          {symbol.adventistConclusion && (
            <View style={scStyles.studyStep}>
              <View style={[scStyles.stepBullet, { backgroundColor: "rgba(34,197,94,0.15)" }]}>
                <Text style={[scStyles.stepNum, { color: "#22C55E" }]}>4</Text>
              </View>
              <View style={{ flex: 1 }}>
                <View style={scStyles.detailHeader}>
                  <Ionicons name="checkmark-done-outline" size={12} color="#22C55E" />
                  <Text style={[scStyles.detailLabel, { color: "#22C55E" }]}>
                    Conclusion
                  </Text>
                </View>
                <View style={[scStyles.conclusionBlock, { backgroundColor: "#22C55E" + "0A", borderColor: "#22C55E" + "20" }]}>
                  <Text style={[scStyles.conclusionSummary, { color: theme.text }]}>
                    {symbol.adventistConclusion.summary}
                  </Text>
                </View>
                <View style={scStyles.detailHeader}>
                  <Ionicons name="help-circle-outline" size={11} color="#22C55E" />
                  <Text style={[scStyles.subLabel, { color: "#22C55E" }]}>Why this fits</Text>
                </View>
                <Text style={[scStyles.detailText, { color: theme.textSecondary }]}>
                  {symbol.adventistConclusion.whyThisFits}
                </Text>
              </View>
            </View>
          )}

          {symbol.reflection && (
            <View style={[scStyles.reflectionBlock, { backgroundColor: "rgba(201,147,58,0.06)", borderColor: "rgba(201,147,58,0.15)" }]}>
              <View style={scStyles.detailHeader}>
                <Ionicons name="heart-outline" size={12} color={theme.accent} />
                <Text style={[scStyles.detailLabel, { color: theme.accent }]}>
                  Reflect
                </Text>
              </View>
              <Text style={[scStyles.reflectionText, { color: theme.textSecondary }]}>
                {symbol.reflection}
              </Text>
            </View>
          )}

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
        </View>
      ) : isExpanded ? (
        <View style={scStyles.expanded}>
          <View style={scStyles.studyStep}>
            <View style={[scStyles.stepBullet, { backgroundColor: symbol.color + "25" }]}>
              <Text style={[scStyles.stepNum, { color: symbol.color }]}>1</Text>
            </View>
            <View style={{ flex: 1 }}>
              <View style={scStyles.detailHeader}>
                <Ionicons name="book-outline" size={12} color={symbol.color} />
                <Text style={[scStyles.detailLabel, { color: symbol.color }]}>
                  Read the passage
                </Text>
              </View>
              <View style={[scStyles.refChip, { borderColor: symbol.color + "30", backgroundColor: symbol.color + "0A" }]}>
                <Ionicons name="document-text-outline" size={12} color="#C9933A" />
                <Pressable
                  onPress={(e) => {
                    e.stopPropagation();
                    navigateToBibleRef(symbol.bibleRef, books);
                  }}
                  hitSlop={6}
                >
                  <Text style={[scStyles.refChipText, scStyles.interactiveRefChip]}>{symbol.bibleRef}</Text>
                </Pressable>
              </View>
            </View>
          </View>

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

          <View style={scStyles.studyStep}>
            <View style={[scStyles.stepBullet, { backgroundColor: "rgba(201,147,58,0.15)" }]}>
              <Text style={[scStyles.stepNum, { color: theme.accent }]}>2</Text>
            </View>
            <View style={{ flex: 1 }}>
              <View style={scStyles.detailHeader}>
                <Ionicons name="school-outline" size={12} color={theme.accent} />
                <Text style={[scStyles.detailLabel, { color: theme.accent }]}>
                  Understand the prophecy
                </Text>
              </View>
              <Text style={[scStyles.detailText, { color: theme.textSecondary }]}>
                {symbol.interpretation}
              </Text>
            </View>
          </View>

          <View style={scStyles.studyStep}>
            <View style={[scStyles.stepBullet, { backgroundColor: "rgba(59,130,246,0.15)" }]}>
              <Text style={[scStyles.stepNum, { color: "#3B82F6" }]}>3</Text>
            </View>
            <View style={{ flex: 1 }}>
              <View style={scStyles.detailHeader}>
                <Ionicons name="time-outline" size={12} color="#3B82F6" />
                <Text style={[scStyles.detailLabel, { color: "#3B82F6" }]}>
                  See the fulfillment in history
                </Text>
                {symbol.dateRange && (
                  <View style={[scStyles.fulfilledBadge, { backgroundColor: "#3B82F6" + "18" }]}>
                    <Text style={[scStyles.fulfilledDate, { color: "#3B82F6" }]}>{symbol.dateRange}</Text>
                  </View>
                )}
              </View>
              <Text style={[scStyles.detailText, { color: theme.textSecondary }]}>
                {symbol.historicalFulfillment}
              </Text>
            </View>
          </View>
        </View>
      ) : null}
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
  interactiveRef: {
    color: "#C9933A",
    textDecorationLine: "underline",
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
  studyStep: {
    flexDirection: "row" as const,
    alignItems: "flex-start" as const,
    gap: 10,
  },
  stepBullet: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    marginTop: 1,
  },
  stepNum: {
    fontFamily: "Inter_700Bold",
    fontSize: 11,
  },
  refChip: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 6,
    alignSelf: "flex-start" as const,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 7,
    borderWidth: 1,
    marginTop: 4,
  },
  fulfilledBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 5,
    marginLeft: "auto" as any,
  },
  fulfilledDate: {
    fontFamily: "Inter_700Bold",
    fontSize: 10,
    letterSpacing: 0.3,
  },
  refChipText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
  },
  interactiveRefChip: {
    color: "#C9933A",
    textDecorationLine: "underline",
  },
  observationPrompt: {
    fontFamily: "Lora_600SemiBold",
    fontSize: 13,
    lineHeight: 20,
    marginTop: 8,
    fontStyle: "italic" as const,
  },
  cluesList: {
    marginTop: 8,
    gap: 6,
  },
  clueRow: {
    flexDirection: "row" as const,
    alignItems: "flex-start" as const,
    gap: 8,
  },
  clueDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    marginTop: 7,
  },
  clueText: {
    flex: 1,
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    lineHeight: 19,
  },
  subLabel: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 11,
    letterSpacing: 0.2,
  },
  selfInterpBlock: {
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 6,
    gap: 6,
  },
  crossRefsList: {
    marginTop: 8,
    gap: 6,
  },
  crossRefItem: {
    paddingLeft: 10,
    borderLeftWidth: 2,
    marginTop: 4,
  },
  crossRefRef: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 11,
    letterSpacing: 0.2,
  },
  crossRefInsight: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    lineHeight: 18,
    marginTop: 2,
  },
  reasoningText: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    lineHeight: 20,
    marginTop: 8,
  },
  conclusionBlock: {
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 4,
    marginBottom: 8,
  },
  conclusionSummary: {
    fontFamily: "Lora_600SemiBold",
    fontSize: 13,
    lineHeight: 20,
  },
  reflectionBlock: {
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  reflectionText: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    lineHeight: 20,
    marginTop: 4,
    fontStyle: "italic" as const,
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
  books,
}: {
  section: ProphecySection;
  expandedSymbolId: string | null;
  onToggleSymbol: (id: string) => void;
  isSectionExpanded: boolean;
  onToggleSection: () => void;
  theme: any;
  viewedSymbols: Set<string>;
  books: BibleBook[];
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
          <View style={secStyles.studyGuide}>
            <Ionicons name="compass-outline" size={13} color={theme.accent} />
            <Text style={[secStyles.studyGuideText, { color: theme.textMuted }]}>
              {section.symbols.some((s) => s.observation)
                ? "Tap each symbol below. Each one walks you through: what the text says, why it points to this interpretation, how history confirms it, and what it means for you."
                : "Tap each symbol below. Read the passage, study the interpretation, then see how history confirmed the prophecy."}
            </Text>
          </View>

          {section.symbols.some((s) => s.dateRange) && (
            <View style={secStyles.timelineStrip}>
              <View style={secStyles.timelineHeader}>
                <Ionicons name="time-outline" size={12} color={theme.accent} />
                <Text style={[secStyles.timelineTitle, { color: theme.accent }]}>
                  Historical Timeline
                </Text>
              </View>
              <View style={secStyles.timelineFlow}>
                {section.symbols
                  .filter((s) => s.dateRange)
                  .map((symbol, idx, arr) => (
                    <View key={symbol.id} style={secStyles.timelineItem}>
                      <View style={secStyles.timelineRow}>
                        <View
                          style={[
                            secStyles.timelineDot,
                            {
                              backgroundColor: symbol.color,
                              borderColor: expandedSymbolId === symbol.id ? symbol.color + "60" : "transparent",
                              borderWidth: expandedSymbolId === symbol.id ? 2 : 0,
                            },
                          ]}
                        />
                        <View style={{ flex: 1 }}>
                          <Text
                            style={[
                              secStyles.timelineDate,
                              {
                                color: symbol.color,
                                fontFamily: expandedSymbolId === symbol.id ? "Inter_700Bold" : "Inter_600SemiBold",
                              },
                            ]}
                          >
                            {symbol.dateRange}
                          </Text>
                          <Text
                            style={[
                              secStyles.timelineLabel,
                              {
                                color: expandedSymbolId === symbol.id ? theme.text : theme.textMuted,
                                fontFamily: expandedSymbolId === symbol.id ? "Inter_600SemiBold" : "Inter_400Regular",
                              },
                            ]}
                          >
                            {symbol.title}
                          </Text>
                        </View>
                      </View>
                      {idx < arr.length - 1 && (
                        <View style={[secStyles.timelineConnector, { backgroundColor: theme.border }]} />
                      )}
                    </View>
                  ))}
              </View>
            </View>
          )}

          {section.symbols.map((symbol, idx) => (
            <SymbolCard
              key={symbol.id}
              symbol={symbol}
              isExpanded={expandedSymbolId === symbol.id}
              onToggle={() => onToggleSymbol(symbol.id)}
              theme={theme}
              isViewed={viewedSymbols.has(symbol.id)}
              books={books}
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
  studyGuide: {
    flexDirection: "row" as const,
    alignItems: "flex-start" as const,
    gap: 8,
    paddingHorizontal: 4,
    paddingBottom: 8,
    marginBottom: 4,
  },
  studyGuideText: {
    flex: 1,
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    lineHeight: 17,
  },
  timelineStrip: {
    marginBottom: 12,
    padding: 12,
    borderRadius: 10,
    backgroundColor: "rgba(201, 147, 58, 0.06)",
    borderWidth: 1,
    borderColor: "rgba(201, 147, 58, 0.12)",
  },
  timelineHeader: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 5,
    marginBottom: 10,
  },
  timelineTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 11,
    letterSpacing: 0.5,
    textTransform: "uppercase" as const,
  },
  timelineFlow: {
    paddingLeft: 4,
  },
  timelineItem: {},
  timelineRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 10,
  },
  timelineDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  timelineDate: {
    fontSize: 12,
    letterSpacing: 0.2,
  },
  timelineLabel: {
    fontSize: 11,
    marginTop: 1,
  },
  timelineConnector: {
    width: 1.5,
    height: 10,
    marginLeft: 4,
    marginVertical: 2,
    borderRadius: 1,
  },
});

export default function ProphecyExplorerScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const [expandedSymbol, setExpandedSymbol] = useState<string | null>(null);
  const [viewedSymbols, setViewedSymbols] = useState<Set<string>>(new Set());
  const scrollRef = useRef<ScrollView>(null);
  const sectionYPositions = useRef<Record<string, number>>({});
  const { data: books = [] } = useQuery<BibleBook[]>({
    queryKey: ["/api/books"],
  });

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
      >
        <View style={styles.introBlock}>
          <Text style={[styles.introText, { color: theme.textSecondary }]}>
            Explore the great prophetic timelines of Daniel and Revelation. Each
            symbol is identified by Scripture, interpreted through the
            historicist method, and connected to its historical fulfillment.
          </Text>
        </View>

        <View style={[styles.methodBadge, { backgroundColor: "rgba(201, 147, 58, 0.08)", borderColor: "rgba(201, 147, 58, 0.2)" }]}>
          <Ionicons name="school-outline" size={14} color="#C9933A" />
          <Text style={[styles.methodText, { color: "#C9933A" }]}>
            Historicist interpretation of Bible prophecy
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
                Beasts, horns, and other symbols represent kingdoms, powers, and movements across history. Understanding these symbols unlocks the prophetic narrative.
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
                Prophecy unfolds continuously through history, from ancient empires to the present day. This approach connects biblical visions to real, verifiable historical events.
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
              LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
              const firstSection = PROPHECY_SECTIONS[0];
              setExpandedSections((prev) => {
                const next = new Set(prev);
                next.add(firstSection.id);
                return next;
              });
              const firstSymbol = firstSection.symbols[0];
              setExpandedSymbol(firstSymbol.id);
              markSymbolViewed(firstSymbol.id);
              setTimeout(() => {
                const y = sectionYPositions.current[firstSection.id];
                if (y !== undefined && scrollRef.current) {
                  scrollRef.current.scrollTo({ y: y - 20, animated: true });
                }
              }, 200);
            }}
            style={({ pressed }) => [
              styles.beginButton,
              { opacity: pressed ? 0.85 : 1 },
            ]}
          >
            <Ionicons name="compass-outline" size={18} color="#FFF" />
            <Text style={styles.beginButtonText}>Begin with Daniel 2</Text>
            <Ionicons name="chevron-forward" size={16} color="#FFF" />
          </Pressable>
        </View>

        <View style={styles.teacherVideosSection}>
          <Text style={styles.teacherVideosHeading}>From SDA Teachers</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.teacherVideosRow}
          >
            {EXPLORER_TEACHER_VIDEOS.map((video) => (
              <Pressable
                key={video.id}
                onPress={() => Linking.openURL(`https://www.youtube.com/watch?v=${video.id}`)}
                style={styles.teacherVideoCard}
              >
                <View style={styles.teacherThumbWrap}>
                  <Image
                    source={{ uri: `https://img.youtube.com/vi/${video.id}/mqdefault.jpg` }}
                    style={styles.teacherThumb}
                  />
                  <View style={styles.teacherPlayOverlay}>
                    <View style={styles.teacherPlayCircle}>
                      <Ionicons name="play" size={20} color="#FFFFFF" />
                    </View>
                  </View>
                  <View style={styles.teacherDurationBadge}>
                    <Text style={styles.teacherDurationText}>{video.duration}</Text>
                  </View>
                </View>
                <Text style={[styles.teacherVideoTitle, { color: theme.text }]} numberOfLines={2}>
                  {video.title}
                </Text>
                <Text style={[styles.teacherVideoTeacher, { color: theme.textMuted }]} numberOfLines={1}>
                  {video.teacher}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>

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
              books={books}
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
    paddingHorizontal: 14,
  },
  introBlock: {
    paddingHorizontal: 8,
    paddingVertical: 18,
  },
  introText: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    lineHeight: 23,
    opacity: 0.9,
  },
  methodBadge: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 10,
    marginHorizontal: 4,
    marginBottom: 22,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  methodText: {
    fontFamily: "Inter_500Medium",
    fontSize: 12,
    letterSpacing: 0.3,
    flex: 1,
  },
  introCardsSection: {
    marginHorizontal: 4,
    marginBottom: 24,
    gap: 12,
  },
  introCardsHeading: {
    fontFamily: "Lora_700Bold",
    fontSize: 18,
    lineHeight: 24,
    marginBottom: 6,
    paddingHorizontal: 4,
    letterSpacing: 0.1,
  },
  introCard: {
    flexDirection: "row" as const,
    alignItems: "flex-start" as const,
    gap: 14,
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
  },
  introCardIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 13,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    marginTop: 2,
  },
  introCardTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 5,
    letterSpacing: 0.1,
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
    gap: 10,
    backgroundColor: "#C9933A",
    paddingVertical: 15,
    paddingHorizontal: 26,
    borderRadius: 14,
    marginTop: 6,
  },
  beginButtonText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
    color: "#FFF",
    letterSpacing: 0.4,
  },
  teacherVideosSection: {
    marginHorizontal: 4,
    marginBottom: 20,
    gap: 10,
  },
  teacherVideosHeading: {
    fontFamily: "Lora_700Bold",
    fontSize: 16,
    lineHeight: 22,
    color: "#C9933A",
    marginLeft: 16,
    marginBottom: 12,
    letterSpacing: 0.1,
  },
  teacherVideosRow: {
    paddingLeft: 16,
    paddingRight: 8,
    gap: 12,
  },
  teacherVideoCard: {
    width: 220,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    padding: 8,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  teacherThumbWrap: {
    position: "relative",
    borderRadius: 14,
    overflow: "hidden",
    marginBottom: 8,
  },
  teacherThumb: {
    width: "100%",
    height: 124,
    backgroundColor: "#1F2937",
  },
  teacherPlayOverlay: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  teacherPlayCircle: {
    backgroundColor: "rgba(0,0,0,0.45)",
    borderRadius: 20,
    padding: 8,
  },
  teacherDurationBadge: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: "#C9933A",
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  teacherDurationText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 11,
    color: "#FFFFFF",
  },
  teacherVideoTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
    lineHeight: 19,
  },
  teacherVideoTeacher: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    marginTop: 4,
  },
  closingCard: {
    marginHorizontal: 4,
    marginTop: 20,
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
  },
  closingTitle: {
    fontFamily: "Lora_700Bold",
    fontSize: 16,
    textAlign: "center",
    lineHeight: 23,
  },
  closingText: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    textAlign: "center",
    lineHeight: 20,
  },
});
