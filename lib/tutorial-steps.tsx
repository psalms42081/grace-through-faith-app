import React from "react";
import { View, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { TutorialStep } from "@/components/FeatureTutorial";

const GOLD = "#C9933A";

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

const composedStyles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
});

export const HOME_TUTORIAL_STEPS: TutorialStep[] = [
  {
    illustration: <IconBadge name="home" size={46} />,
    label: "WELCOME",
    title: "Your Spiritual\nDashboard",
    description:
      "Your daily home base. Find today's verse, track your streak, jump into study tools, and explore every feature from here.",
  },
];

export const BIBLE_READER_STEPS: TutorialStep[] = [
  {
    illustration: <IconBadge name="book" size={46} />,
    label: "YOUR BIBLE",
    title: "Read, Study,\nListen",
    description:
      "Tap any verse to highlight, bookmark, or start a deep study. Switch translations at the top, or listen to the chapter read aloud.",
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
      "Three daily rings — Study, Prayer, and Engagement. Read chapters, add prayers, and journal reflections to close them each day.",
  },
];

export const PRAYER_JOURNAL_STEPS: TutorialStep[] = [
  {
    illustration: <IconBadge name="journal" size={46} />,
    label: "PRAYER LIFE",
    title: "Your Prayer\nJournal",
    description:
      "Record your prayers, organize by category, and mark them answered over time. A sacred space to see God's faithfulness.",
  },
];
