import React from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";
import { D2 } from "@/components/devotions-v2/tokens";
import { PathB } from "@/constants/colors";
import { useTranslation } from "@/context/TranslationContext";
import {
  parseLessonDay,
  type LessonBlock,
  type LessonInline,
} from "@/lib/sabbath-lesson-structure";
import { readingSpace, readingType } from "@/lib/reading-font-scale";
import { useReadingFontScale, useSystemFontScale } from "@/lib/use-reading-font-scale";
import { navigateToScriptureByParts } from "@/lib/scripture-nav";

function ScriptureInline({
  inline,
  style,
}: {
  inline: Extract<LessonInline, { kind: "scripture" }>;
  style?: object;
}) {
  const { translation } = useTranslation();
  return (
    <Text
      allowFontScaling={false}
      accessibilityRole="link"
      accessibilityLabel={inline.text}
      onPress={() =>
        navigateToScriptureByParts(
          inline.bookId,
          inline.chapter,
          inline.verseStart ?? undefined,
          translation,
          inline.verses ? undefined : inline.verseStart != null ? (inline.verseEnd ?? inline.verseStart) : undefined,
          inline.verses ?? undefined,
        )
      }
      style={[style, styles.link]}
    >
      {inline.text}
    </Text>
  );
}

function InlineRun({ inlines, style }: { inlines: LessonInline[]; style?: object }) {
  return (
    <Text allowFontScaling={false} style={style}>
      {inlines.map((inline, index) =>
        inline.kind === "text" ? (
          <Text key={index}>{inline.text}</Text>
        ) : (
          <ScriptureInline key={index} inline={inline} style={style} />
        ),
      )}
    </Text>
  );
}

function QuestionBlock({
  block,
  answer,
  onAnswer,
  questionStyle,
  answerStyle,
  fieldStyle,
}: {
  block: Extract<LessonBlock, { kind: "question" }>;
  answer: string;
  onAnswer: (key: string, value: string) => void;
  questionStyle: object;
  answerStyle: object;
  fieldStyle: object;
}) {
  return (
    <View style={styles.question} testID="ss-lesson-question">
      <InlineRun inlines={block.inlines} style={[styles.questionText, questionStyle]} />
      {answer.trim().length > 0 ? (
        <Text allowFontScaling={false} style={[styles.printedAnswer, answerStyle]} testID="ss-lesson-answer-print">
          {answer}
        </Text>
      ) : null}
      <TextInput
        testID="ss-lesson-answer"
        accessibilityLabel="Your answer"
        allowFontScaling={false}
        value={answer}
        onChangeText={(value) => onAnswer(block.key, value)}
        placeholder="Your answer"
        placeholderTextColor={D2.muted}
        multiline
        textAlignVertical="top"
        style={[styles.answer, fieldStyle]}
      />
    </View>
  );
}

export function LessonDayBody({
  content,
  answers,
  onAnswer,
}: {
  content: string;
  answers: Record<string, string>;
  onAnswer: (key: string, value: string) => void;
}) {
  const blocks = React.useMemo(() => parseLessonDay(content), [content]);
  const scale = useReadingFontScale() * useSystemFontScale();
  const reading = readingType(17, 28, scale);
  const instruction = readingType(16, 24, scale);
  const question = readingType(17, 26, scale);
  const answer = readingType(16, 24, scale);
  const field = readingType(15, 22, scale);
  return (
    <View style={[styles.wrap, { gap: readingSpace(14, scale) }]}>
      {blocks.map((block, index) => {
        if (block.kind === "instruction") {
          return (
            <View key={index} style={styles.instruction} testID="ss-lesson-instruction">
              <InlineRun inlines={block.inlines} style={[styles.instructionText, instruction]} />
            </View>
          );
        }
        if (block.kind === "question") {
          return (
            <QuestionBlock
              key={block.key}
              block={block}
              answer={answers[block.key] ?? ""}
              onAnswer={onAnswer}
              questionStyle={question}
              answerStyle={answer}
              fieldStyle={field}
            />
          );
        }
        return (
          <View key={index} testID="ss-lesson-reading">
            <InlineRun inlines={block.inlines} style={[styles.reading, reading]} />
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 14 },
  reading: {
    fontFamily: "Lora_400Regular",
    fontSize: 17,
    lineHeight: 28,
    color: D2.ink,
  },
  instruction: {
    backgroundColor: D2.card,
    borderLeftWidth: 3,
    borderLeftColor: PathB.catSabbath,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  instructionText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 16,
    lineHeight: 24,
    color: D2.ink,
  },
  question: {
    backgroundColor: D2.card,
    borderWidth: 1,
    borderColor: D2.border,
    borderLeftWidth: 3,
    borderLeftColor: D2.coral,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    gap: 10,
  },
  questionText: {
    fontFamily: "Lora_500Medium",
    fontSize: 17,
    lineHeight: 26,
    color: D2.ink,
  },
  printedAnswer: {
    fontFamily: "Lora_400Regular",
    fontSize: 16,
    lineHeight: 24,
    color: D2.ink,
  },
  answer: {
    minHeight: 72,
    borderWidth: 1,
    borderColor: D2.border,
    borderRadius: 10,
    backgroundColor: D2.surface,
    color: D2.ink,
    fontFamily: "Inter_400Regular",
    fontSize: 15,
    lineHeight: 22,
    padding: 12,
  },
  link: {
    textDecorationLine: "underline",
    color: D2.coral,
  },
});
