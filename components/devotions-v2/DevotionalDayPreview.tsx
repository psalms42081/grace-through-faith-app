import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { apiRequest, queryClient } from "@/lib/query-client";
import { useAuth } from "@/contexts/AuthContext";
import { useStudyDepth } from "@/contexts/StudyDepthContext";
import SDAVerifiedBadge from "@/components/SDAVerifiedBadge";
import { useProStatus } from "@/contexts/ProContext";
import * as Haptics from "expo-haptics";
import LightDepthSelector from "./LightDepthSelector";
import { D2, F } from "./tokens";
import { EmptyState, ErrorState, Header, LoadingState, PrimaryButton } from "./PreviewPrimitives";

type Day = {
  id: string;
  dayNumber: number;
  title: string;
  bookId: number | null;
  chapter: number | null;
  verseStart: number | null;
  verseEnd: number | null;
  passageLabel: string | null;
  contextNote: string | null;
  reflectionQuestions: string[] | null;
  prayerPrompt: string | null;
  thenContext: string | null;
  nowApplication: string | null;
  historicVoiceExcerpt: string | null;
};
type Today = {
  today: Day | null;
  enrollment?: { id: string; planId: string };
  completedCount?: number;
  totalDays?: number;
  planComplete?: boolean;
};
type Passage = { verses: { id: string; verse: number; text: string }[] };

function Reflection({
  question,
  passage,
  title,
}: {
  question: string;
  passage?: string | null;
  title: string;
}) {
  const [answer, setAnswer] = useState("");
  const [followUp, setFollowUp] = useState("");
  const [pending, setPending] = useState(false);
  const [exchanges, setExchanges] = useState<
    { question: string; answer: string; response: string; followUp: string | null }[]
  >([]);

  const submit = async (questionText: string, value: string) => {
    if (!value.trim()) return;
    setPending(true);
    try {
      const res = await apiRequest("POST", "/api/devotionals/reflect", {
        question: questionText,
        userAnswer: value.trim(),
        passageLabel: passage || undefined,
        dayTitle: title,
        previousExchanges: exchanges.map((item) => ({
          question: item.question,
          answer: item.answer,
          response: item.response,
        })),
      });
      const data = await res.json();
      setExchanges((current) => [
        ...current,
        {
          question: questionText,
          answer: value.trim(),
          response:
            data.response || "Keep returning to what God is showing you in His Word.",
          followUp: data.followUp || null,
        },
      ]);
      setAnswer("");
      setFollowUp("");
    } catch {
      setExchanges((current) => [
        ...current,
        {
          question: questionText,
          answer: value.trim(),
          response:
            "Thank you for sharing your reflection. Keep seeking God's truth in His Word.",
          followUp: null,
        },
      ]);
    } finally {
      setPending(false);
    }
  };

  const latest = exchanges[exchanges.length - 1];

  return (
    <View style={s.reflection}>
      <Text style={s.question}>{question}</Text>
      {exchanges.map((exchange, index) => (
        <View key={`${exchange.answer}-${index}`} style={s.exchange}>
          <Text style={s.responseLabel}>Your reflection</Text>
          <Text style={s.responseText}>{exchange.answer}</Text>
          <View style={s.response}>
            <Text style={s.responseLabel}>A reflection to carry</Text>
            <Text style={s.responseText}>{exchange.response}</Text>
          </View>
        </View>
      ))}
      {latest?.followUp ? (
        <>
          <Text style={s.followUp}>{latest.followUp}</Text>
          <View style={s.answerRow}>
            <TextInput
              value={followUp}
              onChangeText={setFollowUp}
              multiline
              placeholder="Continue the conversation…"
              placeholderTextColor={D2.muted}
              style={s.input}
            />
            <Pressable
              onPress={() => submit(latest.followUp!, followUp)}
              disabled={!followUp.trim() || pending}
              style={[s.send, { opacity: !followUp.trim() || pending ? 0.45 : 1 }]}
            >
              <Ionicons name="arrow-up" size={17} color="#fff" />
            </Pressable>
          </View>
        </>
      ) : !exchanges.length ? (
        <View style={s.answerRow}>
          <TextInput
            value={answer}
            onChangeText={setAnswer}
            multiline
            placeholder="Write a few thoughts…"
            placeholderTextColor={D2.muted}
            style={s.input}
          />
          <Pressable
            onPress={() => submit(question, answer)}
            disabled={!answer.trim() || pending}
            style={[s.send, { opacity: !answer.trim() || pending ? 0.45 : 1 }]}
          >
            <Ionicons name="arrow-up" size={17} color="#fff" />
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

export default function DevotionalDayPreview() {
  const insets = useSafeAreaInsets();
  const { userId } = useAuth();
  const {
    planId,
    groupId,
    depth: depthParam,
  } = useLocalSearchParams<{ planId?: string; groupId?: string; depth?: string }>();
  const { depth, setDepth } = useStudyDepth();
  const { triggerMissionInvite } = useProStatus();

  const [journal, setJournal] = useState("");
  const [share, setShare] = useState(false);
  const [shared, setShared] = useState(false);
  const [complete, setComplete] = useState(false);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (depthParam === "quick" || depthParam === "standard" || depthParam === "deep") {
      setDepth(depthParam);
    }
  }, [depthParam, setDepth]);

  const endpoint = planId
    ? `/api/devotionals/today?userId=${userId}&planId=${planId}`
    : `/api/devotionals/today?userId=${userId}`;

  const today = useQuery<Today>({ queryKey: [endpoint] });
  const day = today.data?.today;

  const passageQuery =
    day?.bookId && day.chapter
      ? `/api/passage?book=${day.bookId}&chapter=${day.chapter}&translation=KJV`
      : null;

  const passage = useQuery<Passage>({ queryKey: [passageQuery], enabled: !!passageQuery });

  const verses = useMemo(
    () =>
      (passage.data?.verses || []).filter(
        (v) =>
          !day?.verseStart ||
          (v.verse >= day.verseStart && (!day.verseEnd || v.verse <= day.verseEnd)),
      ),
    [passage.data?.verses, day?.verseStart, day?.verseEnd],
  );

  const finish = async () => {
    if (!today.data?.enrollment || !day) return;
    setPending(true);
    try {
      await apiRequest("POST", "/api/devotionals/complete", {
        enrollmentId: today.data.enrollment.id,
        dayId: day.id,
        journalEntry: journal.trim() || null,
      });
      if (share && groupId && journal.trim()) {
        await apiRequest("POST", `/api/groups/${groupId}/share-reflection`, {
          content: journal.trim(),
          dayTitle: day.title,
          passageLabel: day.passageLabel || null,
        });
        setShared(true);
      }
      setComplete(true);
      triggerMissionInvite();
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      queryClient.invalidateQueries({ queryKey: [endpoint] });
      queryClient.invalidateQueries({ queryKey: [`/api/devotionals/today?userId=${userId}`] });
    } catch {
      Alert.alert("Could not save", "Your reading is still here. Please try again.");
    } finally {
      setPending(false);
    }
  };

  if (today.isLoading) {
    return (
      <View style={s.root}>
        <Header title="Today's reading" topInset={insets.top} onBack={() => router.back()} />
        <LoadingState />
      </View>
    );
  }

  if (today.error) {
    return (
      <View style={s.root}>
        <Header title="Today's reading" topInset={insets.top} onBack={() => router.back()} />
        <ErrorState onRetry={() => today.refetch()} />
      </View>
    );
  }

  if (!day || today.data?.planComplete) {
    return (
      <View style={s.root}>
        <Header title="Devotional" topInset={insets.top} onBack={() => router.back()} />
        <EmptyState
          title={today.data?.planComplete ? "A completed journey" : "No active plan"}
          body={
            today.data?.planComplete
              ? "You have finished this devotional plan. Let its lessons keep unfolding."
              : "Choose a devotional series to begin a daily reading."
          }
          action="Return to devotions"
          onAction={() => router.replace("/devotions-preview" as any)}
        />
      </View>
    );
  }

  const total = today.data?.totalDays || 1;
  const count = today.data?.completedCount || 0;

  return (
    <View style={s.root}>
      <Header
        title={`Day ${day.dayNumber}`}
        eyebrow="Devotional series"
        topInset={insets.top}
        onBack={() => router.back()}
      />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 35 }}
      >
        <View style={s.progress}>
          <View
            style={[s.progressFill, { width: `${Math.min(100, (count / total) * 100)}%` }]}
          />
        </View>
        <Text style={s.progressLabel}>{count} of {total} readings complete</Text>
        <LightDepthSelector compact />

        <View style={s.titleBlock}>
          <Text style={s.kicker}>DAY {day.dayNumber}</Text>
          <Text style={s.title}>{day.title}</Text>
          {day.passageLabel ? <Text style={s.passage}>{day.passageLabel}</Text> : null}
        </View>
        <View style={{ paddingHorizontal: 20, marginTop: 12 }}>
          <SDAVerifiedBadge variant="compact" />
        </View>

        {verses.length ? (
          <View style={s.card}>
            <Text style={s.label}>SCRIPTURE READING</Text>
            {verses.map((v) => (
              <View style={s.verse} key={v.id}>
                <Text style={s.verseNum}>{v.verse}</Text>
                <Text style={s.verseText}>{v.text}</Text>
              </View>
            ))}
          </View>
        ) : null}

        {day.contextNote && (
          <View style={s.card}>
            <Text style={s.label}>
              {depth === "quick" ? "KEY INSIGHT" : "CONTEXT NOTE"}
            </Text>
            <Text style={s.body}>{day.contextNote}</Text>
            {depth === "quick" && day.nowApplication ? (
              <Text style={s.application}>{day.nowApplication}</Text>
            ) : null}
          </View>
        )}

        {depth !== "quick" && day.thenContext ? (
          <View style={s.card}>
            <Text style={s.label}>THEN · HISTORICAL CONTEXT</Text>
            <Text style={s.body}>{day.thenContext}</Text>
          </View>
        ) : null}

        {depth !== "quick" && day.nowApplication ? (
          <View style={s.card}>
            <Text style={s.label}>NOW · MODERN APPLICATION</Text>
            <Text style={s.body}>{day.nowApplication}</Text>
          </View>
        ) : null}

        {day.historicVoiceExcerpt && depth !== "quick" ? (
          <View style={s.card}>
            <Text style={s.label}>FURTHER READING</Text>
            <Text style={s.body}>
              {day.historicVoiceExcerpt
                .replace(/\(https:\/\/egwwritings\.org\S*/g, "")
                .replace(/\s+/g, " ")
                .trim()}
            </Text>
            {day.historicVoiceExcerpt.includes("egwwritings.org") ? (
              <Pressable
                onPress={() => {
                  const url = day
                    .historicVoiceExcerpt!.match(/https:\/\/egwwritings\.org\S*/)?.[0]
                    ?.replace(/[).]+$/, "");
                  if (url) Linking.openURL(url);
                }}
                style={s.link}
              >
                <Text style={s.linkText}>Read on Ellen G. White Writings</Text>
                <Ionicons name="open-outline" size={14} color={D2.amber} />
              </Pressable>
            ) : null}
          </View>
        ) : null}

        {depth === "deep" && day.passageLabel ? (
          <View style={s.card}>
            <Text style={s.label}>DEEP STUDY</Text>
            <Pressable
              style={s.link}
              onPress={() =>
                day.bookId &&
                day.chapter &&
                router.push(
                  `/word-study?book=${day.bookId}&chapter=${day.chapter}${
                    day.verseStart ? `&verse=${day.verseStart}` : ""
                  }` as any,
                )
              }
            >
              <Text style={s.linkText}>Explore Greek/Hebrew word studies</Text>
              <Ionicons name="search" size={14} color={D2.violet} />
            </Pressable>
            <Pressable
              style={s.link}
              onPress={() =>
                router.push(
                  `/passage-context?passage=${encodeURIComponent(day.passageLabel!)}` as any,
                )
              }
            >
              <Text style={s.linkText}>View cross-references and context</Text>
              <Ionicons name="git-network-outline" size={14} color={D2.violet} />
            </Pressable>
          </View>
        ) : null}

        {depth !== "quick" && day.reflectionQuestions?.length ? (
          <View style={s.card}>
            <Text style={s.label}>REFLECTION</Text>
            {day.reflectionQuestions.map((q, i) => (
              <Reflection key={i} question={q} passage={day.passageLabel} title={day.title} />
            ))}
          </View>
        ) : null}

        {depth !== "quick" && day.prayerPrompt ? (
          <View style={[s.card, s.prayer]}>
            <Text style={s.label}>PRAYER PROMPT</Text>
            <Text style={s.prayerText}>{day.prayerPrompt}</Text>
          </View>
        ) : null}

        {!complete ? (
          <View style={s.card}>
            <Text style={s.label}>JOURNAL · OPTIONAL</Text>
            {depth !== "quick" ? (
              <TextInput
                value={journal}
                onChangeText={setJournal}
                multiline
                placeholder="What are you taking with you today?"
                placeholderTextColor={D2.muted}
                style={s.journal}
              />
            ) : null}
            {groupId ? (
              <Pressable onPress={() => setShare(!share)} style={s.shareRow}>
                <Ionicons
                  name={share ? "checkbox" : "square-outline"}
                  size={20}
                  color={share ? D2.violet : D2.muted}
                />
                <Text style={s.shareText}>Share reflection with group</Text>
              </Pressable>
            ) : null}
            <PrimaryButton
              label={pending ? "Saving…" : "Mark day complete"}
              onPress={finish}
              disabled={pending}
              testID="devotional-day-preview-complete"
            />
          </View>
        ) : (
          <View style={s.completed}>
            <Ionicons name="checkmark-circle" size={28} color={D2.sage} />
            <Text style={s.completedTitle}>Day {day.dayNumber} complete</Text>
            <Text style={s.body}>
              {shared
                ? "Your reflection was shared with the group."
                : "Come back tomorrow for your next reading."}
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: D2.surface,
  },
  progress: {
    height: 5,
    backgroundColor: "#E8E1D7",
    marginHorizontal: 20,
    borderRadius: 5,
  },
  progressFill: {
    height: 5,
    borderRadius: 5,
    backgroundColor: D2.coral,
  },
  progressLabel: {
    fontFamily: F.interMed,
    color: D2.muted,
    fontSize: 11,
    marginHorizontal: 20,
    marginTop: 7,
  },
  titleBlock: {
    padding: 22,
    marginTop: 8,
    backgroundColor: "#F5EBDD",
  },
  kicker: {
    fontFamily: F.interBold,
    color: D2.amber,
    fontSize: 10,
    letterSpacing: 1.4,
  },
  title: {
    fontFamily: F.loraBold,
    color: D2.ink,
    fontSize: 29,
    lineHeight: 36,
    marginTop: 8,
  },
  passage: {
    fontFamily: F.interMed,
    color: D2.amber,
    fontSize: 13,
    marginTop: 9,
  },
  card: {
    backgroundColor: D2.card,
    borderWidth: 1,
    borderColor: D2.border,
    borderRadius: 17,
    marginHorizontal: 20,
    marginTop: 13,
    padding: 16,
    gap: 10,
  },
  label: {
    fontFamily: F.interBold,
    color: D2.violet,
    fontSize: 10,
    letterSpacing: 1.1,
  },
  verse: {
    flexDirection: "row",
    gap: 10,
  },
  verseNum: {
    fontFamily: F.interBold,
    color: D2.amber,
    fontSize: 12,
    width: 18,
  },
  verseText: {
    flex: 1,
    fontFamily: F.loraSemi,
    color: D2.ink,
    fontSize: 16,
    lineHeight: 25,
  },
  body: {
    fontFamily: F.inter,
    color: D2.ink,
    fontSize: 14,
    lineHeight: 22,
  },
  application: {
    backgroundColor: D2.sageSoft,
    borderRadius: 10,
    padding: 10,
    color: D2.ink,
    fontFamily: F.interMed,
    fontSize: 13,
    lineHeight: 19,
  },
  link: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    paddingVertical: 4,
  },
  linkText: {
    color: D2.amber,
    fontFamily: F.interSemi,
    fontSize: 12,
  },
  prayer: {
    backgroundColor: "#F3EAF2",
    borderColor: "#E4D2E2",
  },
  prayerText: {
    fontFamily: F.loraSemi,
    fontStyle: "italic",
    color: D2.ink,
    fontSize: 16,
    lineHeight: 25,
  },
  reflection: {
    gap: 9,
    borderTopWidth: 1,
    borderTopColor: D2.border,
    paddingTop: 12,
  },
  question: {
    fontFamily: F.interMed,
    color: D2.ink,
    fontSize: 14,
    lineHeight: 21,
  },
  exchange: {
    gap: 5,
    backgroundColor: "#FFF8ED",
    padding: 10,
    borderRadius: 11,
  },
  followUp: {
    fontFamily: F.interMed,
    color: D2.violet,
    fontSize: 13,
    lineHeight: 20,
  },
  answerRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
  },
  input: {
    flex: 1,
    minHeight: 45,
    maxHeight: 100,
    borderWidth: 1,
    borderColor: D2.border,
    borderRadius: 12,
    padding: 11,
    fontFamily: F.inter,
    color: D2.ink,
    fontSize: 13,
    textAlignVertical: "top",
  },
  send: {
    width: 39,
    height: 39,
    borderRadius: 20,
    backgroundColor: D2.violet,
    alignItems: "center",
    justifyContent: "center",
  },
  response: {
    backgroundColor: D2.violetFill,
    padding: 12,
    borderRadius: 12,
    gap: 5,
  },
  responseLabel: {
    fontFamily: F.interBold,
    color: D2.violet,
    fontSize: 10,
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  responseText: {
    fontFamily: F.loraSemi,
    color: D2.ink,
    fontSize: 14,
    lineHeight: 22,
  },
  journal: {
    minHeight: 84,
    borderWidth: 1,
    borderColor: D2.border,
    backgroundColor: D2.surface,
    borderRadius: 12,
    padding: 12,
    fontFamily: F.inter,
    color: D2.ink,
    textAlignVertical: "top",
    fontSize: 13,
  },
  shareRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    paddingVertical: 6,
  },
  shareText: {
    fontFamily: F.interMed,
    color: D2.ink,
    fontSize: 13,
  },
  completed: {
    margin: 20,
    padding: 22,
    borderRadius: 17,
    alignItems: "center",
    backgroundColor: D2.sageSoft,
    gap: 7,
  },
  completedTitle: {
    fontFamily: F.loraSemi,
    color: D2.sage,
    fontSize: 19,
  },
});
