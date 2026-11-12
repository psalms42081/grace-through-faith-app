import React from "react";
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";
import { router } from "expo-router";
import { useTranslation } from "react-i18next";
import { D2, F } from "@/components/devotions-v2/tokens";
import { useScriptureForToday, type ScriptureTodayCard } from "@/hooks/useScriptureForToday";
import { navigateToScriptureByParts } from "@/lib/scripture-nav";
import { buildSabbathSchoolTabRoute } from "@/lib/sabbath-school-route-containment";

function openVerse(card: ScriptureTodayCard) {
  const verses = card.linkVerses;
  const contiguous = verses.every((verse, index) => index === 0 || verse === verses[index - 1] + 1);
  if (verses.length === 0) {
    navigateToScriptureByParts(card.bookId, card.chapter, undefined, card.shownTranslation);
    return;
  }
  navigateToScriptureByParts(
    card.bookId,
    card.chapter,
    verses[0],
    card.shownTranslation,
    verses.length > 1 ? verses[verses.length - 1] : undefined,
    contiguous ? undefined : verses,
  );
}

function openLesson(card: ScriptureTodayCard) {
  if (!card.fromLesson || card.lessonNumber == null || card.dayNumber == null) return;
  router.push(
    buildSabbathSchoolTabRoute("sabbath-school-day", {
      lessonNumber: card.lessonNumber,
      dayNumber: card.dayNumber,
      quarterCode: card.quarterCode,
    }) as any,
  );
}

export default function ScriptureForTodayCard({
  testID = "scripture-for-today-card",
  style,
}: {
  testID?: string;
  style?: StyleProp<ViewStyle>;
}) {
  const { t } = useTranslation();
  const { card, questionIndex } = useScriptureForToday();
  const questions = t("scriptureForToday.questions", { returnObjects: true }) as unknown;
  const question =
    Array.isArray(questions) && typeof questions[questionIndex] === "string"
      ? questions[questionIndex]
      : "";

  return (
    <View style={[styles.card, style]} testID={testID}>
      <Text style={styles.label}>{t("scriptureForToday.label")}</Text>
      {card ? (
        <Pressable
          onPress={() => openVerse(card)}
          accessibilityRole="button"
          accessibilityLabel={card.reference}
          testID="scripture-for-today-verse"
        >
          <Text style={styles.verse}>{card.text}</Text>
          <Text style={styles.reference}>{card.reference}</Text>
        </Pressable>
      ) : null}
      {card?.fromLesson ? (
        <Pressable
          onPress={() => openLesson(card)}
          accessibilityRole="button"
          testID="scripture-for-today-lesson"
        >
          <Text style={styles.lesson}>{t("scriptureForToday.fromLesson")}</Text>
        </Pressable>
      ) : null}
      {question ? (
        <Text style={styles.question} testID="scripture-for-today-question">
          {question}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    alignSelf: "stretch",
    backgroundColor: D2.sageSoft,
    borderRadius: 17,
    gap: 8,
  },
  label: {
    fontFamily: F.interBold,
    color: D2.sage,
    fontSize: 11,
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  verse: {
    fontFamily: F.loraSemi,
    color: D2.ink,
    fontSize: 18,
    lineHeight: 28,
  },
  reference: {
    fontFamily: F.interSemi,
    color: D2.ink,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 6,
  },
  lesson: {
    fontFamily: F.inter,
    color: D2.sage,
    fontSize: 13,
    lineHeight: 18,
    textDecorationLine: "underline",
  },
  question: {
    fontFamily: F.inter,
    color: D2.muted,
    fontSize: 15,
    lineHeight: 22,
  },
});
