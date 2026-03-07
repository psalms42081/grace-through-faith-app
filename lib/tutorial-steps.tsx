import React from "react";
import { View, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { TutorialStep } from "@/components/FeatureTutorial";

const GOLD = "#C9933A";
const PARCHMENT = "#F5EFE0";
const GOLD_DIM = "rgba(201, 147, 58, 0.15)";

function IconBadge({ name, size = 40, color = GOLD }: { name: any; size?: number; color?: string }) {
  return <Ionicons name={name} size={size} color={color} />;
}

function ComposedIcons({ icons }: { icons: Array<{ name: any; size?: number; color?: string; style?: any }> }) {
  return (
    <View style={composedStyles.wrap}>
      {icons.map((ic, i) => (
        <Ionicons
          key={i}
          name={ic.name}
          size={ic.size || 22}
          color={ic.color || GOLD}
          style={ic.style}
        />
      ))}
    </View>
  );
}

function LayerStack() {
  const layers = [
    { icon: "document-text" as const, label: "1" },
    { icon: "earth" as const, label: "2" },
    { icon: "people" as const, label: "3" },
    { icon: "heart" as const, label: "4" },
  ];
  return (
    <View style={composedStyles.layerStack}>
      {layers.map((l, i) => (
        <View
          key={i}
          style={[
            composedStyles.layerChip,
            {
              marginLeft: i * 4,
              opacity: 1 - i * 0.12,
              backgroundColor: GOLD_DIM,
            },
          ]}
        >
          <Ionicons name={l.icon} size={16} color={GOLD} />
        </View>
      ))}
    </View>
  );
}

const composedStyles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  layerStack: {
    alignItems: "center",
    gap: 4,
  },
  layerChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(201, 147, 58, 0.2)",
  },
});

export const HOME_TUTORIAL_STEPS: TutorialStep[] = [
  {
    illustration: <IconBadge name="home" size={46} />,
    label: "WELCOME HOME",
    title: "Your Spiritual\nDashboard",
    description:
      "Your daily home base. Find a fresh verse, track your streak, and access every tool — all in one place.",
  },
  {
    illustration: <IconBadge name="sunny" size={46} />,
    label: "DAILY INSPIRATION",
    title: "Verse of the Day",
    description:
      "Start each morning with a handpicked verse. Tap to open the full passage and begin a deeper study.",
  },
  {
    illustration: (
      <ComposedIcons
        icons={[
          { name: "layers", size: 34 },
          { name: "book", size: 26, style: { marginLeft: -4 } },
          { name: "journal", size: 26, style: { marginLeft: -4 } },
        ]}
      />
    ),
    label: "STUDY TOOLS",
    title: "Powerful Study\nTools",
    description:
      "Quick access to the 4-Layer Study, Prayer Journal, Devotionals, and more — right from your home screen.",
  },
  {
    illustration: <IconBadge name="flame" size={46} />,
    label: "DAILY HABIT",
    title: "Build a\nDaily Habit",
    description:
      "Every day in Scripture builds your streak. Stay consistent and watch your spiritual discipline grow.",
  },
];

export const FOUR_LAYER_STUDY_STEPS: TutorialStep[] = [
  {
    illustration: <LayerStack />,
    label: "SIGNATURE METHOD",
    title: "The 4-Layer\nStudy Model",
    description:
      "More than ordinary Bible reading. The 4-Layer Study guides you through a progressive, scholarly method — from the original text all the way to personal transformation.",
  },
  {
    illustration: <IconBadge name="document-text" size={46} />,
    label: "LAYER ONE",
    title: "Text",
    description:
      "Begin with the original Greek and Hebrew. Tap any word to see its Strong's number, transliteration, and full definition. Accuracy starts here.",
  },
  {
    illustration: <IconBadge name="earth" size={46} />,
    label: "LAYER TWO",
    title: "Context",
    description:
      "Explore the historical setting, cultural background, and authorial intent. AI-generated cards bring the ancient world to life around the passage.",
  },
  {
    illustration: <IconBadge name="people" size={46} />,
    label: "LAYER THREE",
    title: "Insight",
    description:
      "Hear from historic voices — Matthew Henry, Ellen G. White, and other theologians. Compare their perspectives and journal your own reflections.",
  },
  {
    illustration: <IconBadge name="heart" size={46} />,
    label: "LAYER FOUR",
    title: "Transform",
    description:
      "Bridge the ancient and the modern. Reflection prompts help you apply what you've learned to your daily life, ending with a personal prayer response.",
  },
  {
    illustration: <IconBadge name="timer" size={46} />,
    label: "GUIDED SESSIONS",
    title: "Deep Study\nMode",
    description:
      "Tap 'Begin Deep Study' for a guided, timed session through all four layers. Your progress is saved so you can pause and return anytime.",
  },
];

export const BIBLE_READER_STEPS: TutorialStep[] = [
  {
    illustration: <IconBadge name="book" size={46} />,
    label: "YOUR BIBLE",
    title: "The Bible\nReader",
    description:
      "Access every book of the Bible with support for KJV, ASV, and WEB translations. Switch between them anytime with the translation picker at the top.",
  },
  {
    illustration: <IconBadge name="hand-left" size={46} />,
    label: "INTERACT",
    title: "Study Any Verse",
    description:
      "Tap a verse to highlight, bookmark, copy, or share it. Jump straight into a 4-Layer Study from any verse.",
  },
  {
    illustration: (
      <ComposedIcons
        icons={[
          { name: "language", size: 30 },
          { name: "search", size: 28, style: { marginLeft: -2 } },
        ]}
      />
    ),
    label: "WORD STUDY",
    title: "Strong's\nConcordance",
    description:
      "Discover the original Greek or Hebrew behind every word. Strong's numbers link to definitions, usage notes, and cross-references across Scripture.",
  },
  {
    illustration: <IconBadge name="headset" size={46} />,
    label: "LISTEN",
    title: "Audio Bible",
    description:
      "Listen to any chapter read aloud with lifelike AI voices. Perfect for your commute, quiet time, or when you want to absorb Scripture by ear.",
  },
];

export const CONNECT_TUTORIAL_STEPS: TutorialStep[] = [
  {
    illustration: <IconBadge name="people" size={46} />,
    label: "COMMUNITY",
    title: "Connect with\nBelievers",
    description:
      "Faith grows in community. The Connect tab helps you find your local church, join small groups, and stay connected with fellow believers.",
  },
  {
    illustration: <IconBadge name="location" size={46} />,
    label: "FIND A CHURCH",
    title: "Church\nConnect",
    description:
      "Search for Adventist churches near you. Browse service times, locations, and connect with congregations around the world.",
  },
  {
    illustration: (
      <ComposedIcons
        icons={[
          { name: "chatbubbles", size: 32 },
          { name: "bookmarks", size: 26, style: { marginLeft: -2 } },
        ]}
      />
    ),
    label: "GROW TOGETHER",
    title: "Small Groups",
    description:
      "Join or create a small group for shared Bible study. Discuss passages, share reflections, and grow together in faith.",
  },
];

export const EXPLORE_TUTORIAL_STEPS: TutorialStep[] = [
  {
    illustration: <IconBadge name="library" size={46} />,
    label: "YOUR LIBRARY",
    title: "Your Study\nLibrary",
    description:
      "Your hub for deeper learning. Browse Adventist resources, study paths, and guided growth tracks.",
  },
  {
    illustration: <IconBadge name="map" size={46} />,
    label: "GUIDED PATHS",
    title: "Guided Study\nPaths",
    description:
      "Follow structured study paths designed for spiritual growth. Each path builds progressively on the one before.",
  },
  {
    illustration: <IconBadge name="sparkles" size={46} />,
    label: "GO DEEPER",
    title: "Spiritual Themes\n& Inspirations",
    description:
      "Explore topics like the Armor of God, the Beatitudes, and more. Each study opens with the relevant passage ready for your 4-Layer analysis.",
  },
];

export const PROFILE_TUTORIAL_STEPS: TutorialStep[] = [
  {
    illustration: <IconBadge name="person" size={46} />,
    label: "YOUR JOURNEY",
    title: "Your Spiritual\nProfile",
    description:
      "Track your growth over time. Your profile shows reading streaks, study minutes, badges earned, and a complete picture of your Bible journey.",
  },
  {
    illustration: <IconBadge name="grid" size={46} />,
    label: "KNOWLEDGE MAP",
    title: "Bible\nHeatmap",
    description:
      "The Bible Knowledge Map shows every book you've explored. The deeper the color, the more you've studied. Aim to paint the entire map gold.",
  },
  {
    illustration: <IconBadge name="trophy" size={46} />,
    label: "ACHIEVEMENTS",
    title: "Badges &\nMilestones",
    description:
      "Earn badges for consistent reading, completing study paths, and deepening your knowledge. Each badge marks a real milestone in your spiritual growth.",
  },
];

export const SPIRITUAL_RINGS_TUTORIAL_STEPS: TutorialStep[] = [
  {
    illustration: (
      <ComposedIcons
        icons={[
          { name: "ellipse-outline", size: 40, color: "#5B8DEF" },
          { name: "ellipse-outline", size: 30, color: "#4ECCA3", style: { marginLeft: -35 } },
          { name: "ellipse-outline", size: 20, color: "#E8A838", style: { marginLeft: -27 } },
        ]}
      />
    ),
    label: "DAILY FORMATION",
    title: "Your Spiritual\nRings",
    description:
      "Build daily spiritual habits with three rings — Study, Prayer, and Engagement. Close all three every day to grow in faith.",
  },
  {
    illustration: <IconBadge name="book" size={46} color="#5B8DEF" />,
    label: "STUDY",
    title: "Close the\nStudy Ring",
    description:
      "The blue ring tracks chapters you read each day. Read 3 chapters to close it. Open any book in the Bible reader and your ring fills automatically.",
  },
  {
    illustration: <IconBadge name="hand-left" size={46} color="#4ECCA3" />,
    label: "PRAYER",
    title: "Close the\nPrayer Ring",
    description:
      "The green ring tracks your prayer life. Add 2 prayers to your Prayer Journal each day to close this ring. Pour out your heart and watch it fill.",
  },
  {
    illustration: <IconBadge name="sparkles" size={46} color="#E8A838" />,
    label: "ENGAGE",
    title: "Close the\nEngage Ring",
    description:
      "The gold ring tracks deeper engagement — study journal entries, AI study guide sessions, and reflections. Complete 2 engagements daily to close it.",
  },
];

export const FAMILY_TUTORIAL_STEPS: TutorialStep[] = [
  {
    illustration: <IconBadge name="people" size={46} />,
    label: "FAMILY",
    title: "Your Family's\nFaith Journey",
    description:
      "The Family Dashboard brings your household together in faith. Create or join a family group, track your children's spiritual progress, and grow as a family.",
  },
  {
    illustration: (
      <ComposedIcons
        icons={[
          { name: "happy", size: 32 },
          { name: "star", size: 26, style: { marginLeft: -2 } },
        ]}
      />
    ),
    label: "KIDS PROGRESS",
    title: "Track Your\nChildren",
    description:
      "Add your children's profiles and monitor their Bible story progress, quiz scores, and badges earned. See what they've been learning each week.",
  },
  {
    illustration: <IconBadge name="chatbubbles" size={46} />,
    label: "DINNER TABLE",
    title: "Conversation\nStarters",
    description:
      "Get AI-powered discussion questions based on what your kids have been studying. Turn Bible stories into meaningful dinner table conversations.",
  },
  {
    illustration: (
      <ComposedIcons
        icons={[
          { name: "heart", size: 28 },
          { name: "flame", size: 26, style: { marginLeft: -2 } },
        ]}
      />
    ),
    label: "PRAYER WALL",
    title: "Family\nPrayer Wall",
    description:
      "Share prayer requests within your family. See what each member is praying about and lift each other up together.",
  },
];

export const PRAYER_JOURNAL_STEPS: TutorialStep[] = [
  {
    illustration: <IconBadge name="journal" size={46} />,
    label: "PRAYER LIFE",
    title: "Your Prayer\nJournal",
    description:
      "A sacred space to record your prayers. Organize them by category — Personal, Family, Health, World, and Praise — and remember God's faithfulness over time.",
  },
  {
    illustration: <IconBadge name="add-circle" size={46} />,
    label: "RECORD",
    title: "Add Prayer\nRequests",
    description:
      "Tap the add button to create a new prayer request. Give it a title, choose a category, and write your heart's desire. Every prayer is saved securely.",
  },
  {
    illustration: <IconBadge name="checkmark-done-circle" size={46} />,
    label: "ANSWERED",
    title: "Mark Prayers\nAnswered",
    description:
      "When God answers, mark the prayer as answered. Build a record of God's faithfulness that you can look back on during difficult seasons.",
  },
];
