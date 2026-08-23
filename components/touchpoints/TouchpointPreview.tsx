import React, { useState } from "react";
import {
  ActivityIndicator,
  Image,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/query-client";
import { safeGoBack } from "@/lib/safe-back";
import { useTranslation } from "@/context/TranslationContext";
import { HV2, F } from "@/components/home-v2/theme";
import {
  TOUCHPOINT_STUDY_CLIENT_STALE_TIME_MS,
  type TouchpointGeneratedStudy,
} from "@shared/touchpoint-study";

interface Verse { ref: string; text: string; translation: string; source: string; resolved: true }
interface TouchPointQuestion { id: string; question: string; verses: Verse[]; commentary: string }
interface BibleProjectVideo { id: string; title: string; youtubeId: string; duration: string; description: string; series: string }
interface TouchPointTopic { id: string; title: string; category: string; overview: string; questions: TouchPointQuestion[]; bibleProjectVideos?: BibleProjectVideo[] }
const TINTS: Record<string, { wash: string; line: string; accent: string }> = {
  grief: { wash: "#EEF3F1", line: "#C9DDD7", accent: "#386F68" },
  anxiety: { wash: "#F3F0E7", line: "#DFD4B8", accent: "#7A6540" },
  addiction: { wash: "#F3ECE7", line: "#E3CCC0", accent: "#8A5848" },
};
const previewTint = (topicId?: string) => TINTS[String(topicId)] || { wash: "#EEF3F1", line: "#C9DDD7", accent: "#386F68" };

function PreviewPill() {
  return <View testID="touchpoint-preview-pill" accessibilityLabel="Preview" style={s.previewPill}><Text style={s.previewPillText}>PREVIEW</Text></View>;
}

function PreviewHeader({ title, onBack }: { title: string; onBack: () => void }) {
  return <View style={s.header}>
    <Pressable accessibilityRole="button" accessibilityLabel="Return to topics" onPress={onBack} hitSlop={12} style={s.back}>
      <Ionicons name="arrow-back" size={21} color={HV2.ink} />
    </Pressable>
    <Text numberOfLines={1} style={s.headerTitle}>{title}</Text>
    <PreviewPill />
  </View>;
}

export function TouchpointTopicPreview() {
  const { topicId } = useLocalSearchParams<{ topicId: string }>();
  const { translation } = useTranslation();
  const insets = useSafeAreaInsets();
  const [expanded, setExpanded] = useState<string | null>(null);
  const [showStudyPrompt, setShowStudyPrompt] = useState(false);
  const [videoOpenError, setVideoOpenError] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const tint = previewTint(topicId);
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;
  const { data: topic, isLoading, isFetching, error } = useQuery<TouchPointTopic>({
    queryKey: ["/api/touchpoints", topicId, { translation }],
    queryFn: async () => (await apiRequest("GET", `/api/touchpoints/${topicId}?translation=${encodeURIComponent(translation)}`)).json(),
    enabled: !!topicId,
  });
  const studyMutation = useMutation({
    mutationFn: async () => (await apiRequest("POST", `/api/touchpoints/${topicId}/bible-study`, { translation })).json(),
    onSuccess: (data) => queryClient.setQueryData(["/api/touchpoints", topicId, "bible-study", { translation }], data),
  });
  const prepareStudy = () => {
    setShowStudyPrompt(false);
    studyMutation.mutate(undefined, {
      onSuccess: (data) =>
        router.push(
          `/touchpoint-study-preview?topicId=${topicId}&title=${encodeURIComponent(data.title || topic?.title || "")}&translation=${encodeURIComponent(translation)}` as any
        ),
    });
  };
  const openVideo = async (video: BibleProjectVideo) => {
    setVideoOpenError(null);
    try {
      await Linking.openURL(`https://www.youtube.com/watch?v=${video.youtubeId}`);
    } catch {
      setVideoOpenError(video.id);
    }
  };
  const back = () => safeGoBack(router, "/touchpoints");

  if (isLoading || isFetching || !topicId) return <View style={s.page}><View style={{ paddingTop: topPad }}><PreviewHeader title="A moment in Scripture" onBack={back} /></View><View style={s.state}><ActivityIndicator color={HV2.catSabbath} /><Text style={s.stateText}>Opening this topic…</Text></View></View>;
  if (!topic) return <View style={s.page}><View style={{ paddingTop: topPad }}><PreviewHeader title="Topic" onBack={back} /></View><View style={s.state}><Ionicons name="book-outline" size={31} color={HV2.inkMutedText}/><Text style={s.stateTitle}>This topic is not available</Text><Text style={s.stateText}>{error ? "Please return to the topics and try opening it again." : "Return to the topics and choose another place to begin."}</Text><Pressable onPress={() => router.replace("/touchpoints")} style={s.quietButton}><Text style={s.quietButtonText}>Browse all topics</Text></Pressable></View></View>;

  return <View style={s.page}>
    <View style={{ paddingTop: topPad }}><PreviewHeader title={topic.title} onBack={back} /></View>
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: bottomPad + 44 }}>
      <View style={[s.hero, { backgroundColor: tint.wash, borderColor: tint.line }]}>
        <Text style={[s.eyebrow, { color: tint.accent }]}>{topic.category}</Text>
        <Text style={s.heroTitle}>{topic.title}</Text>
        <Text style={s.overview}>{topic.overview}</Text>
        <View style={[s.heroRule, { backgroundColor: tint.line }]} />
        <Text style={s.invitation}>There is no hurry here. Take the next question at your own pace.</Text>
      </View>
      <View style={s.content}>
        <View style={s.sectionHead}><Text style={s.sectionTitle}>Questions for this moment</Text><Text style={s.sectionSub}>Scripture and gentle reflection</Text></View>
        {topic.questions.map((question, index) => {
          const open = expanded === question.id;
          return <View key={question.id} style={[s.questionShell, open && { borderColor: tint.line }]}>
            <Pressable testID={`touchpoint-question-row-${question.id}`} accessibilityLabel={`Question ${index + 1}: ${question.question}`} accessibilityRole="button" accessibilityState={{ expanded: open }} onPress={() => setExpanded(open ? null : question.id)} style={({ pressed }) => [s.questionRow, pressed && { opacity: 0.72 }]}>
              <Text style={[s.questionNumber, { color: tint.accent }]}>{String(index + 1).padStart(2, "0")}</Text>
              <Text style={s.question}>{question.question}</Text>
              <Ionicons name={open ? "remove" : "add"} size={20} color={tint.accent} />
            </Pressable>
            {open && <View style={s.answer}>
              {question.verses.map((verse, verseIndex) => {
                const verseTranslation = verse.translation;
                const hasText = verse.resolved === true && typeof verse.text === "string" && verse.text.trim().length > 0;
                return <View key={`${verse.ref}-${verseIndex}`} style={[s.verse, { borderLeftColor: tint.line }]}>
                  <Text style={[s.reference, { color: tint.accent }]}>{verse.ref} <Text style={s.translation}>{verseTranslation}</Text></Text>
                  <Text style={[s.verseText, !hasText && s.unresolved]}>{hasText ? verse.text : `Scripture text for ${verse.ref} could not be resolved in ${verseTranslation}. Open your Bible to read it in your selected translation.`}</Text>
                </View>;
              })}
              <View style={[s.commentary, { borderTopColor: tint.line }]}><Text style={s.commentaryLabel}>Consider</Text><Text style={s.commentaryText}>{question.commentary}</Text></View>
            </View>}
          </View>;
        })}
        {topic.bibleProjectVideos?.length ? <View style={s.videoBlock}><Text style={s.sectionTitle}>A little more to watch</Text><Text style={s.sectionSub}>Selected teaching on this topic</Text>{topic.bibleProjectVideos.map(video => <Pressable key={video.id} accessibilityRole="link" accessibilityLabel={`Open ${video.title} in YouTube`} onPress={() => openVideo(video)} style={s.videoCard}><Image source={{ uri: `https://i.ytimg.com/vi/${video.youtubeId}/hqdefault.jpg` }} style={s.thumb}/><View style={s.videoCopy}><Text style={[s.videoSeries, { color: tint.accent }]}>{video.series}</Text><Text numberOfLines={2} style={s.videoTitle}>{video.title}</Text><Text style={s.videoMeta}>{video.duration} · Opens in YouTube</Text>{videoOpenError === video.id ? <Text accessibilityRole="alert" style={s.videoError}>This video could not be opened. Please try again later.</Text> : null}</View></Pressable>)}</View> : null}
        <View style={[s.studyCallout, { backgroundColor: tint.wash, borderColor: tint.line }]}>
          <Text style={s.studyTitle}>Stay with this in Scripture</Text>
          <Text style={s.studyBody}>A guided study gathers the passages and reflections into one unhurried place.</Text>
          {showStudyPrompt ? (
            <View style={s.studyPrompt}>
              <Text style={s.studyPromptQuestion}>
                Prepare a Scripture study for {topic.title}?
              </Text>
              <View style={s.studyPromptActions}>
                <Pressable
                  accessibilityLabel="Not now"
                  accessibilityRole="button"
                  onPress={() => setShowStudyPrompt(false)}
                  style={s.studyPromptSecondary}
                >
                  <Text style={s.studyPromptSecondaryText}>Not now</Text>
                </Pressable>
                <Pressable
                  testID="touchpoint-preview-study-confirm"
                  accessibilityLabel="Confirm preparation of guided Bible study"
                  accessibilityRole="button"
                  disabled={studyMutation.isPending}
                  onPress={prepareStudy}
                  style={({ pressed }) => [
                    s.studyPromptPrimary,
                    {
                      backgroundColor: tint.accent,
                      opacity: studyMutation.isPending || pressed ? 0.76 : 1,
                    },
                  ]}
                >
                  {studyMutation.isPending ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={s.studyButtonText}>Prepare study</Text>
                  )}
                </Pressable>
              </View>
            </View>
          ) : (
            <Pressable
              testID="touchpoint-preview-study-action"
              accessibilityLabel="Prepare a guided Bible study"
              accessibilityRole="button"
              disabled={studyMutation.isPending}
              onPress={() => setShowStudyPrompt(true)}
              style={({ pressed }) => [
                s.studyButton,
                {
                  backgroundColor: tint.accent,
                  opacity: studyMutation.isPending || pressed ? 0.76 : 1,
                },
              ]}
            >
              <Text style={s.studyButtonText}>Prepare a guided study</Text>
              <Ionicons name="arrow-forward" size={17} color="#FFFFFF" />
            </Pressable>
          )}
        </View>
      </View>
    </ScrollView>
  </View>;
}

export function TouchpointStudyPreview() {
  const { topicId, title, translation: translationParam } = useLocalSearchParams<{ topicId: string; title: string; translation?: string }>();
  const { translation: contextTranslation } = useTranslation();
  const translation = translationParam || contextTranslation;
  const insets = useSafeAreaInsets();
  const tint = previewTint(topicId);
  const { data: study, isLoading, isError } = useQuery<TouchpointGeneratedStudy>({
    queryKey: ["/api/touchpoints", topicId, "bible-study", { translation }],
    queryFn: async () => (await apiRequest("POST", `/api/touchpoints/${topicId}/bible-study`, { translation })).json(),
    staleTime: TOUCHPOINT_STUDY_CLIENT_STALE_TIME_MS,
  });
  const back = () => safeGoBack(router, `/touchpoint-topic-preview?topicId=${topicId}`);
  if (isLoading) return <View style={s.page}><View style={{ paddingTop: Platform.OS === "web" ? 67 : insets.top }}><PreviewHeader title={title || "Guided study"} onBack={back}/></View><View style={s.state}><ActivityIndicator color={tint.accent}/><Text style={s.stateText}>Preparing your study…</Text></View></View>;
  if (isError || !study) return <View style={s.page}><View style={{ paddingTop: Platform.OS === "web" ? 67 : insets.top }}><PreviewHeader title={title || "Guided study"} onBack={back}/></View><View style={s.state}><Text style={s.stateTitle}>The study could not be opened</Text><Text style={s.stateText}>Return to the topic when you are ready.</Text><Pressable onPress={back} style={s.quietButton}><Text style={s.quietButtonText}>Go back</Text></Pressable></View></View>;
  const studyTranslation = study.translation;
  return <View testID="touchpoint-generated-study-container" accessibilityLabel="Generated guided Bible study" style={s.page}>
    <View style={{ paddingTop: Platform.OS === "web" ? 67 : insets.top }}><PreviewHeader title={study.title || title || "Guided study"} onBack={back}/></View>
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: (Platform.OS === "web" ? 34 : insets.bottom) + 44 }}>
      <View style={[s.studyOpening, { backgroundColor: tint.wash, borderColor: tint.line }]}><Text style={[s.eyebrow, { color: tint.accent }]}>Guided study · {studyTranslation}</Text><Text style={s.introduction}>{study.introduction}</Text></View>
      {study.sections.map((section, index) => { const sectionTranslation = section.translation; const verified = section.resolved === true && typeof section.scriptureText === "string" && section.scriptureText.trim().length > 0; return <View key={`${section.heading}-${index}`} style={s.studySection}><Text style={s.sectionIndex}>{String(index + 1).padStart(2, "0")}</Text><Text style={s.studyHeading}>{section.heading}</Text><View style={[s.studyScripture, { borderLeftColor: tint.accent }]}><Text style={[s.reference, { color: tint.accent }]}>{section.scripture} <Text style={s.translation}>{sectionTranslation}</Text></Text><Text style={[s.verseText, !verified && s.unresolved]}>{verified ? section.scriptureText : `Scripture text for ${section.scripture} could not be verified in ${sectionTranslation}. Open your Bible to read it in your selected translation.`}</Text></View><Text style={s.teaching}>{section.teaching}</Text><View style={[s.reflection, { backgroundColor: tint.wash }]}><Text style={[s.reflectionLabel, { color: tint.accent }]}>For reflection</Text><Text style={s.reflectionText}>{section.reflection}</Text></View></View> })}
      <View style={[s.closing, { borderTopColor: tint.line }]}><Text style={[s.eyebrow, { color: tint.accent }]}>Closing thought</Text><Text style={s.conclusion}>{study.conclusion}</Text></View>
      {study.prayerPrompt ? <View style={[s.prayer, { backgroundColor: tint.wash, borderColor: tint.line }]}><Text style={[s.reflectionLabel, { color: tint.accent }]}>Prayer</Text><Text style={s.prayerText}>{study.prayerPrompt}</Text></View> : null}
      {study.groupDiscussion?.length ? <View style={s.discussion}><Text style={s.sectionTitle}>If you are with others</Text>{study.groupDiscussion.map((item, i) => <View key={`${item}-${i}`} style={s.discussionRow}><Text style={[s.questionNumber, { color: tint.accent }]}>{String(i + 1).padStart(2, "0")}</Text><Text style={s.discussionText}>{item}</Text></View>)}</View> : null}
    </ScrollView>
  </View>;
}

const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: HV2.surface },
  header: { minHeight: 63, flexDirection: "row", alignItems: "center", paddingHorizontal: 20, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "#E7E0D3", gap: 12 },
  back: { width: 33, height: 33, borderRadius: 17, justifyContent: "center", alignItems: "center", backgroundColor: "#F2EDE2" },
  headerTitle: { flex: 1, fontFamily: F.loraSemi, fontSize: 18, color: HV2.ink, letterSpacing: -0.25 },
  previewPill: { backgroundColor: "#147B7C", paddingHorizontal: 8, paddingVertical: 5, borderRadius: 7 },
  previewPillText: { color: "#FFFFFF", fontFamily: F.interBold, fontSize: 9, letterSpacing: 0.9 },
  hero: { margin: 20, marginTop: 26, padding: 25, borderRadius: 24, borderWidth: 1 },
  eyebrow: { fontFamily: F.interSemi, fontSize: 10, letterSpacing: 1.35, textTransform: "uppercase", marginBottom: 13 },
  heroTitle: { fontFamily: F.loraBold, fontSize: 31, lineHeight: 38, color: HV2.ink, letterSpacing: -0.7, marginBottom: 14 },
  overview: { fontFamily: F.inter, fontSize: 16, lineHeight: 26, color: HV2.ink },
  heroRule: { height: 1, marginVertical: 19 },
  invitation: { fontFamily: "Lora_400Regular_Italic", fontSize: 14, lineHeight: 22, color: HV2.inkMutedText },
  content: { paddingHorizontal: 20 },
  sectionHead: { marginBottom: 12, marginTop: 6 },
  sectionTitle: { fontFamily: F.loraSemi, fontSize: 21, color: HV2.ink, letterSpacing: -0.25 },
  sectionSub: { fontFamily: F.inter, fontSize: 12, color: HV2.inkMutedText, marginTop: 4 },
  questionShell: { backgroundColor: "#FEFCF7", borderRadius: 17, borderWidth: 1, borderColor: "#E9E2D6", marginBottom: 10, overflow: "hidden" },
  questionRow: { minHeight: 78, paddingHorizontal: 17, paddingVertical: 16, flexDirection: "row", alignItems: "center", gap: 12 },
  questionNumber: { fontFamily: F.interSemi, fontSize: 11, letterSpacing: 0.7 },
  question: { flex: 1, fontFamily: F.interMed, fontSize: 15, lineHeight: 22, color: HV2.ink },
  answer: { paddingHorizontal: 17, paddingBottom: 18, gap: 16 },
  verse: { paddingLeft: 14, borderLeftWidth: 2 },
  reference: { fontFamily: F.interSemi, fontSize: 13, marginBottom: 5 },
  translation: { fontFamily: F.inter, color: HV2.inkMutedText, fontSize: 11 },
  verseText: { fontFamily: "Lora_400Regular_Italic", color: HV2.ink, fontSize: 15, lineHeight: 24 },
  unresolved: { fontFamily: F.inter, color: HV2.inkMutedText, fontSize: 14 },
  commentary: { borderTopWidth: 1, paddingTop: 14 },
  commentaryLabel: { fontFamily: F.interSemi, fontSize: 10, letterSpacing: 1.1, textTransform: "uppercase", color: HV2.inkMutedText, marginBottom: 6 },
  commentaryText: { fontFamily: F.inter, color: HV2.inkMutedText, fontSize: 14, lineHeight: 22 },
  videoBlock: { marginTop: 29 },
  videoCard: { marginTop: 13, backgroundColor: "#FEFCF7", borderRadius: 16, borderWidth: 1, borderColor: "#E9E2D6", overflow: "hidden", flexDirection: "row" },
  thumb: { width: 115, height: 92, backgroundColor: "#DED8CD" },
  videoCopy: { flex: 1, padding: 12, justifyContent: "center" },
  videoSeries: { fontFamily: F.interSemi, fontSize: 9, letterSpacing: 0.65, textTransform: "uppercase", marginBottom: 5 },
  videoTitle: { fontFamily: F.loraSemi, fontSize: 14, color: HV2.ink, lineHeight: 19 },
  videoMeta: { fontFamily: F.inter, fontSize: 11, color: HV2.inkMutedText, marginTop: 6 },
  videoError: { fontFamily: F.interMed, fontSize: 11, lineHeight: 16, color: HV2.inkMutedText, marginTop: 7 },
  studyCallout: { marginTop: 29, padding: 22, borderRadius: 21, borderWidth: 1 },
  studyTitle: { fontFamily: F.loraSemi, color: HV2.ink, fontSize: 21, letterSpacing: -0.3 },
  studyBody: { fontFamily: F.inter, color: HV2.inkMutedText, fontSize: 14, lineHeight: 21, marginTop: 7, marginBottom: 17 },
  studyButton: { minHeight: 48, borderRadius: 13, paddingHorizontal: 17, flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 9 },
  studyButtonText: { fontFamily: F.interSemi, color: "#FFFFFF", fontSize: 14 },
  studyPrompt: { gap: 13 },
  studyPromptQuestion: { fontFamily: F.interMed, color: HV2.ink, fontSize: 14, lineHeight: 21 },
  studyPromptActions: { flexDirection: "row", gap: 10 },
  studyPromptSecondary: { minHeight: 46, flex: 1, borderRadius: 13, borderWidth: 1, borderColor: "#BDB5A8", alignItems: "center", justifyContent: "center", paddingHorizontal: 12 },
  studyPromptSecondaryText: { fontFamily: F.interSemi, color: HV2.inkMutedText, fontSize: 13 },
  studyPromptPrimary: { minHeight: 46, flex: 1.4, borderRadius: 13, alignItems: "center", justifyContent: "center", paddingHorizontal: 12 },
  state: { flex: 1, justifyContent: "center", alignItems: "center", paddingHorizontal: 38, gap: 11 },
  stateTitle: { fontFamily: F.loraSemi, color: HV2.ink, fontSize: 20, textAlign: "center" },
  stateText: { fontFamily: F.inter, color: HV2.inkMutedText, fontSize: 14, lineHeight: 21, textAlign: "center" },
  quietButton: { borderWidth: 1, borderColor: HV2.catSabbath, borderRadius: 11, paddingHorizontal: 17, paddingVertical: 10, marginTop: 8 },
  quietButtonText: { fontFamily: F.interSemi, color: HV2.catSabbath, fontSize: 13 },
  studyOpening: { marginTop: 24, padding: 23, borderWidth: 1, borderRadius: 21 },
  introduction: { fontFamily: "Lora_400Regular_Italic", color: HV2.ink, fontSize: 17, lineHeight: 28 },
  studySection: { paddingTop: 30, paddingBottom: 28, borderBottomWidth: 1, borderBottomColor: "#E7E0D3" },
  sectionIndex: { fontFamily: F.interSemi, color: HV2.inkMutedText, fontSize: 10, letterSpacing: 1.2, marginBottom: 8 },
  studyHeading: { fontFamily: F.loraBold, color: HV2.ink, fontSize: 23, lineHeight: 30, letterSpacing: -0.4, marginBottom: 16 },
  studyScripture: { borderLeftWidth: 3, paddingLeft: 14, marginBottom: 17 },
  teaching: { fontFamily: F.inter, color: HV2.ink, fontSize: 15, lineHeight: 25 },
  reflection: { marginTop: 18, padding: 16, borderRadius: 14 },
  reflectionLabel: { fontFamily: F.interSemi, fontSize: 10, letterSpacing: 1.1, textTransform: "uppercase", marginBottom: 7 },
  reflectionText: { fontFamily: "Lora_400Regular_Italic", color: HV2.inkMutedText, fontSize: 14, lineHeight: 22 },
  closing: { paddingTop: 30, paddingBottom: 24, borderTopWidth: 1, marginTop: 8 },
  conclusion: { fontFamily: "Lora_400Regular_Italic", color: HV2.ink, fontSize: 17, lineHeight: 28 },
  prayer: { padding: 20, borderRadius: 18, borderWidth: 1 },
  prayerText: { fontFamily: F.inter, color: HV2.ink, fontSize: 15, lineHeight: 24 },
  discussion: { marginTop: 30 },
  discussionRow: { flexDirection: "row", gap: 13, paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: "#E7E0D3" },
  discussionText: { flex: 1, fontFamily: F.inter, color: HV2.ink, fontSize: 15, lineHeight: 23 },
});
