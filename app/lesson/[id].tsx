import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  ActivityIndicator,
  useColorScheme,
  Platform,
  Modal,
} from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest, getApiUrl } from "@/lib/query-client";
import { useAuth } from "@/contexts/AuthContext";
import Colors from "@/constants/colors";

function extractReferences(content: string): string[] {
  const refs: string[] = [];
  const boldPattern = /\*\*([^*]+)\*\*/g;
  let match;
  while ((match = boldPattern.exec(content)) !== null) {
    const text = match[1].trim();
    if (/^[1-3]?\s?[A-Z][a-z]+\s+\d/.test(text)) {
      refs.push(text);
    }
  }
  if (refs.length === 0) {
    const linePattern = /^\d+\.\s+\*\*([^*]+)\*\*/gm;
    while ((match = linePattern.exec(content)) !== null) {
      const text = match[1].trim();
      if (/^[1-3]?\s?[A-Z][a-z]+\s+\d/.test(text)) {
        refs.push(text);
      }
    }
  }
  if (refs.length === 0) {
    const loosePattern = /(?:^|[\n;,])\s*([1-3]?\s?[A-Z][a-z]+(?: [A-Z][a-z]+)?\s+\d+:\d+(?:[–-]\d+)?(?:,\d+)?)/g;
    while ((match = loosePattern.exec(content)) !== null) {
      refs.push(match[1].trim());
    }
  }
  return refs.slice(0, 8);
}

function ExplainPassage({ reference, lessonTitle, theme }: { reference: string; lessonTitle: string; theme: any }) {
  const [expanded, setExpanded] = useState(false);
  const [explanation, setExplanation] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  const handleExplain = async () => {
    if (explanation) {
      setExpanded(!expanded);
      return;
    }
    setExpanded(true);
    setLoading(true);
    setError(false);
    try {
      const res = await apiRequest("POST", "/api/verses/explain", {
        reference,
        lessonContext: lessonTitle,
      });
      const data = await res.json();
      setExplanation(data.explanation);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={evStyles.container}>
      <Pressable
        onPress={handleExplain}
        style={({ pressed }) => [
          evStyles.refBtn,
          {
            backgroundColor: expanded ? theme.accent + "15" : theme.accent + "08",
            borderColor: expanded ? theme.accent + "40" : theme.accent + "20",
            opacity: pressed ? 0.8 : 1,
          },
        ]}
      >
        <View style={evStyles.refRow}>
          <Ionicons name="book" size={14} color={theme.accent} />
          <Text style={[evStyles.refText, { color: theme.text, fontFamily: "Inter_500Medium" }]} numberOfLines={1}>
            {reference}
          </Text>
        </View>
        <View style={evStyles.explainTag}>
          <Ionicons name="search" size={12} color={theme.accent} />
          <Text style={[evStyles.explainLabel, { color: theme.accent, fontFamily: "Inter_500Medium" }]}>
            {expanded && explanation ? "Hide" : "Explain"}
          </Text>
        </View>
      </Pressable>

      {expanded && (
        <View style={[evStyles.explanationBox, { backgroundColor: theme.accent + "06", borderColor: theme.accent + "18" }]}>
          {loading && (
            <View style={evStyles.loadingRow}>
              <ActivityIndicator size="small" color={theme.accent} />
              <Text style={[evStyles.loadingText, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
                Generating explanation...
              </Text>
            </View>
          )}
          {error && (
            <Text style={[evStyles.errorText, { color: theme.error, fontFamily: "Inter_400Regular" }]}>
              Could not load explanation. Please try again.
            </Text>
          )}
          {explanation && !loading && (
            <Text style={[evStyles.explanationText, { color: theme.text, fontFamily: "Lora_400Regular" }]}>
              {explanation}
            </Text>
          )}
        </View>
      )}
    </View>
  );
}

const evStyles = StyleSheet.create({
  container: {
    marginBottom: 8,
  },
  refBtn: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  refRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 8,
    flex: 1,
    marginRight: 8,
  },
  refText: {
    fontSize: 13,
    flex: 1,
  },
  explainTag: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 4,
  },
  explainLabel: {
    fontSize: 12,
  },
  explanationBox: {
    marginTop: 6,
    padding: 16,
    borderRadius: 10,
    borderWidth: 1,
  },
  loadingRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 10,
  },
  loadingText: {
    fontSize: 13,
  },
  errorText: {
    fontSize: 13,
  },
  explanationText: {
    fontSize: 14,
    lineHeight: 22,
  },
  sectionWrapper: {
    marginTop: 16,
  },
  dividerRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 10,
    marginBottom: 12,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    fontSize: 11,
    textTransform: "uppercase" as const,
    letterSpacing: 1,
  },
});

interface Section {
  id: string;
  sectionType: string;
  title: string;
  content: string;
  sortOrder: number;
}

interface AssessmentItem {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

interface Assessment {
  id: string;
  title: string;
  passingScore: number;
  items: AssessmentItem[];
}

interface LessonData {
  id: string;
  title: string;
  description: string;
  lessonOrder: number;
  anchorText: string;
  anchorBookId: number;
  anchorChapter: number;
  anchorVerseStart: number;
  anchorVerseEnd: number;
  estimatedMinutes: number;
  sections: Section[];
  assessment: Assessment | null;
}

const SECTION_ICONS: Record<string, { icon: string; color: string; label: string }> = {
  anchor: { icon: "book", color: "#C9933A", label: "Scripture" },
  explain: { icon: "bulb", color: "#5B86E5", label: "Explanation" },
  integrate: { icon: "git-merge", color: "#8B5CF6", label: "Integration" },
  practice: { icon: "fitness", color: "#2E7D32", label: "Practice" },
  reflection: { icon: "journal", color: "#E8456B", label: "Reflection" },
  assessment: { icon: "checkmark-circle", color: "#1565C0", label: "Assessment" },
};

function SectionHeader({ type, title, isCompleted }: { type: string; title: string; isCompleted: boolean }) {
  const config = SECTION_ICONS[type] || { icon: "document-text", color: "#888", label: type };
  return (
    <View style={sectionStyles.header}>
      <View style={[sectionStyles.iconCircle, { backgroundColor: config.color + "18" }]}>
        <Ionicons name={config.icon as any} size={20} color={config.color} />
      </View>
      <View style={sectionStyles.headerText}>
        <Text style={[sectionStyles.typeLabel, { color: config.color }]}>{config.label}</Text>
        <Text style={sectionStyles.sectionTitle}>{title}</Text>
      </View>
      {isCompleted && (
        <View style={sectionStyles.checkCircle}>
          <Ionicons name="checkmark" size={14} color="#fff" />
        </View>
      )}
    </View>
  );
}

export default function LessonScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const theme = isDark ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();
  const { userId } = useAuth();

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const [completedSections, setCompletedSections] = useState<string[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [reflectionText, setReflectionText] = useState("");
  const [assessmentAnswers, setAssessmentAnswers] = useState<Record<number, number>>({});
  const [assessmentResults, setAssessmentResults] = useState<{
    score: number;
    passed: boolean;
    total: number;
    results: { question: string; correct: boolean; userAnswer: number; correctAnswer: number; explanation: string }[];
  } | null>(null);
  const [assessmentSubmitted, setAssessmentSubmitted] = useState(false);
  const [moduleCompletionData, setModuleCompletionData] = useState<{
    moduleId: string;
    moduleTitle: string;
    learningObjective: string | null;
    avgAssessmentScore: number | null;
  } | null>(null);
  const [showModuleCompletion, setShowModuleCompletion] = useState(false);
  const [confidenceRating, setConfidenceRating] = useState(0);
  const [confidenceSaved, setConfidenceSaved] = useState(false);
  const [trackCompletionData, setTrackCompletionData] = useState<{
    trackId: string;
    trackTitle: string;
    totalModules: number;
    totalLessons: number;
  } | null>(null);
  const [showTrackCompletion, setShowTrackCompletion] = useState(false);

  const lessonQuery = useQuery<LessonData>({
    queryKey: [`/api/lessons/${id}?userId=${userId}`],
  });

  React.useEffect(() => {
    if (lessonQuery.data?.progress && !hydrated) {
      const serverSections = lessonQuery.data.progress.sectionsCompleted || [];
      if (serverSections.length > 0) {
        setCompletedSections(serverSections);
      }
      if (lessonQuery.data.progress.assessmentScore != null) {
        setAssessmentSubmitted(true);
      }
      setHydrated(true);
    }
  }, [lessonQuery.data?.progress, hydrated]);

  const completeMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/lessons/${id}/complete`, {
        userId,
        sectionsCompleted: completedSections,
      });
      return res.json();
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/tracks"] });
      queryClient.invalidateQueries({ queryKey: [`/api/lessons/${id}?userId=${userId}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/tracks/progress?userId=${userId}`] });
      if (data.trackCompleted) {
        setTrackCompletionData(data.trackCompleted);
      }
      if (data.moduleCompleted) {
        setModuleCompletionData(data.moduleCompleted);
        setConfidenceRating(0);
        setConfidenceSaved(false);
        setShowModuleCompletion(true);
      } else if (data.trackCompleted) {
        setShowTrackCompletion(true);
      } else {
        router.back();
      }
    },
  });

  const confidenceMutation = useMutation({
    mutationFn: async () => {
      if (!moduleCompletionData) return;
      const res = await apiRequest("POST", `/api/modules/${moduleCompletionData.moduleId}/confidence`, {
        userId,
        rating: confidenceRating,
      });
      return res.json();
    },
    onSuccess: () => {
      setConfidenceSaved(true);
    },
  });

  const assessmentMutation = useMutation({
    mutationFn: async (assessmentId: string) => {
      const answers = Object.keys(assessmentAnswers)
        .sort((a, b) => Number(a) - Number(b))
        .map((k) => assessmentAnswers[Number(k)]);
      const res = await apiRequest("POST", `/api/assessments/${assessmentId}/submit`, {
        userId,
        answers,
      });
      return res.json();
    },
    onSuccess: (data: any) => {
      setAssessmentResults(data);
      setAssessmentSubmitted(true);
      queryClient.invalidateQueries({ queryKey: ["/api/tracks"] });
      queryClient.invalidateQueries({ queryKey: [`/api/tracks/progress?userId=${userId}`] });
    },
  });

  const toggleSection = useCallback((sectionId: string) => {
    setCompletedSections((prev) =>
      prev.includes(sectionId) ? prev.filter((s) => s !== sectionId) : [...prev, sectionId]
    );
  }, []);

  const lesson = lessonQuery.data;
  const sections = lesson?.sections || [];
  const assessment = lesson?.assessment;
  const allSectionsCompleted = sections.length > 0 && sections.every((s) => completedSections.includes(s.id));

  if (lessonQuery.isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={[styles.loadingContainer, { paddingTop: topPad + 60 }]}>
          <ActivityIndicator size="large" color={theme.accent} />
          <Text style={[styles.loadingText, { color: theme.textMuted }]}>Loading lesson...</Text>
        </View>
      </View>
    );
  }

  if (lessonQuery.isError || !lesson) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={[styles.headerBar, { paddingTop: topPad + 12 }]}>
          <Pressable onPress={() => router.back()} hitSlop={12}>
            <Ionicons name="arrow-back" size={24} color={theme.text} />
          </Pressable>
        </View>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={48} color={theme.error} />
          <Text style={[styles.errorText, { color: theme.textSecondary }]}>
            Could not load this lesson. Please try again later.
          </Text>
          <Pressable onPress={() => router.back()} style={[styles.retryBtn, { backgroundColor: theme.accent }]}>
            <Text style={styles.retryBtnText}>Go Back</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.headerBar, { paddingTop: topPad + 12, backgroundColor: theme.background }]}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={[styles.headerTitle, { color: theme.text }]} numberOfLines={1}>
            {lesson.title}
          </Text>
          {lesson.estimatedMinutes > 0 && (
            <Text style={[styles.headerSub, { color: theme.textMuted }]}>
              {lesson.estimatedMinutes} min
            </Text>
          )}
        </View>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.progressDotsRow}>
        {sections.map((s) => (
          <View
            key={s.id}
            style={[
              styles.progressDot,
              completedSections.includes(s.id)
                ? { backgroundColor: theme.accent }
                : { backgroundColor: theme.border, borderWidth: 1, borderColor: theme.textMuted + "40" },
            ]}
          />
        ))}
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomPad + 120 }]}
        showsVerticalScrollIndicator={false}
      >
        {lesson.anchorText && (
          <View style={[styles.anchorBanner, { backgroundColor: theme.accent + "10", borderColor: theme.accent + "30" }]}>
            <Ionicons name="book-outline" size={18} color={theme.accent} />
            <Text style={[styles.anchorRef, { color: theme.accent }]}>{lesson.anchorText}</Text>
            {lesson.anchorBookId > 0 && (
              <Pressable
                onPress={() => router.push(`/read/${lesson.anchorBookId}/${lesson.anchorChapter}`)}
                hitSlop={8}
              >
                <Ionicons name="open-outline" size={16} color={theme.accent} />
              </Pressable>
            )}
          </View>
        )}

        {sections.map((section) => {
          const isCompleted = completedSections.includes(section.id);
          return (
            <View
              key={section.id}
              style={[
                styles.sectionCard,
                {
                  backgroundColor: theme.backgroundCard,
                  borderColor: isCompleted ? theme.accent + "40" : theme.border,
                },
              ]}
            >
              <SectionHeader type={section.sectionType} title={section.title} isCompleted={isCompleted} />

              <Text style={[styles.sectionContent, { color: theme.text }]}>{section.content}</Text>

              {section.sectionType === "anchor" && (() => {
                const refs = extractReferences(section.content);
                if (refs.length === 0 && lesson.anchorText) {
                  const fallbackRefs = lesson.anchorText.split(";").map((r: string) => r.trim()).filter(Boolean);
                  return fallbackRefs.length > 0 ? (
                    <View style={evStyles.sectionWrapper}>
                      <View style={evStyles.dividerRow}>
                        <View style={[evStyles.dividerLine, { backgroundColor: theme.accent + "25" }]} />
                        <Text style={[evStyles.dividerText, { color: theme.accent, fontFamily: "Inter_600SemiBold" }]}>
                          Explain a Passage
                        </Text>
                        <View style={[evStyles.dividerLine, { backgroundColor: theme.accent + "25" }]} />
                      </View>
                      {fallbackRefs.map((ref: string) => (
                        <ExplainPassage key={ref} reference={ref} lessonTitle={lesson.title} theme={theme} />
                      ))}
                    </View>
                  ) : null;
                }
                return refs.length > 0 ? (
                  <View style={evStyles.sectionWrapper}>
                    <View style={evStyles.dividerRow}>
                      <View style={[evStyles.dividerLine, { backgroundColor: theme.accent + "25" }]} />
                      <Text style={[evStyles.dividerText, { color: theme.accent, fontFamily: "Inter_600SemiBold" }]}>
                        Explain a Passage
                      </Text>
                      <View style={[evStyles.dividerLine, { backgroundColor: theme.accent + "25" }]} />
                    </View>
                    {refs.map((ref) => (
                      <ExplainPassage key={ref} reference={ref} lessonTitle={lesson.title} theme={theme} />
                    ))}
                  </View>
                ) : null;
              })()}

              {section.sectionType === "reflection" && (
                <TextInput
                  style={[
                    styles.reflectionInput,
                    {
                      color: theme.text,
                      backgroundColor: theme.backgroundElevated,
                      borderColor: theme.border,
                    },
                  ]}
                  placeholder="Write your reflection here..."
                  placeholderTextColor={theme.textMuted}
                  multiline
                  value={reflectionText}
                  onChangeText={setReflectionText}
                  textAlignVertical="top"
                />
              )}

              {!isCompleted && (
                <Pressable
                  onPress={() => toggleSection(section.id)}
                  style={({ pressed }) => [
                    styles.markCompleteBtn,
                    { backgroundColor: theme.accent + "12", opacity: pressed ? 0.7 : 1 },
                  ]}
                >
                  <Ionicons name="checkmark-circle-outline" size={18} color={theme.accent} />
                  <Text style={[styles.markCompleteText, { color: theme.accent }]}>Mark Complete</Text>
                </Pressable>
              )}
            </View>
          );
        })}

        {assessment && (
          <View style={[styles.sectionCard, { backgroundColor: theme.backgroundCard, borderColor: theme.border }]}>
            <SectionHeader
              type="assessment"
              title={assessment.title || "Knowledge Check"}
              isCompleted={assessmentSubmitted}
            />

            {assessment.items.map((item, qi) => (
              <View key={item.id} style={styles.questionBlock}>
                <Text style={[styles.questionText, { color: theme.text }]}>
                  {qi + 1}. {item.question}
                </Text>
                {item.options.map((opt, oi) => {
                  const isSelected = assessmentAnswers[qi] === oi;
                  const showResult = assessmentSubmitted && assessmentResults;
                  const isCorrect = showResult && oi === item.correctIndex;
                  const isWrong = showResult && isSelected && oi !== item.correctIndex;

                  return (
                    <Pressable
                      key={oi}
                      onPress={() => {
                        if (!assessmentSubmitted) {
                          setAssessmentAnswers((prev) => ({ ...prev, [qi]: oi }));
                        }
                      }}
                      style={[
                        styles.optionBtn,
                        {
                          backgroundColor: isSelected
                            ? isWrong
                              ? theme.error + "18"
                              : isCorrect
                                ? theme.success + "18"
                                : theme.accent + "15"
                            : theme.backgroundElevated,
                          borderColor: isSelected
                            ? isWrong
                              ? theme.error + "50"
                              : isCorrect
                                ? theme.success + "50"
                                : theme.accent + "40"
                            : theme.border,
                        },
                      ]}
                    >
                      <View
                        style={[
                          styles.optionRadio,
                          {
                            borderColor: isSelected ? theme.accent : theme.textMuted + "50",
                            backgroundColor: isSelected ? theme.accent : "transparent",
                          },
                        ]}
                      >
                        {isSelected && <View style={styles.optionRadioInner} />}
                      </View>
                      <Text style={[styles.optionText, { color: theme.text }]}>{opt}</Text>
                      {showResult && isCorrect && (
                        <Ionicons name="checkmark-circle" size={18} color={theme.success} style={{ marginLeft: "auto" as const }} />
                      )}
                      {isWrong && (
                        <Ionicons name="close-circle" size={18} color={theme.error} style={{ marginLeft: "auto" as const }} />
                      )}
                    </Pressable>
                  );
                })}
                {assessmentSubmitted && assessmentResults && assessmentResults.results[qi] && (
                  <Text style={[styles.explanationText, { color: theme.textSecondary }]}>
                    {assessmentResults.results[qi].explanation}
                  </Text>
                )}
              </View>
            ))}

            {!assessmentSubmitted && (
              <Pressable
                onPress={() => {
                  if (assessment.items.length > 0 && Object.keys(assessmentAnswers).length === assessment.items.length) {
                    assessmentMutation.mutate(assessment.id);
                  }
                }}
                disabled={Object.keys(assessmentAnswers).length !== assessment.items.length || assessmentMutation.isPending}
                style={({ pressed }) => [
                  styles.submitBtn,
                  {
                    backgroundColor:
                      Object.keys(assessmentAnswers).length === assessment.items.length
                        ? theme.accent
                        : theme.textMuted + "30",
                    opacity: pressed ? 0.8 : 1,
                  },
                ]}
              >
                {assessmentMutation.isPending ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.submitBtnText}>Submit Answers</Text>
                )}
              </Pressable>
            )}

            {assessmentSubmitted && assessmentResults && (
              <View
                style={[
                  styles.resultsBanner,
                  {
                    backgroundColor: assessmentResults.passed ? theme.success + "15" : theme.error + "15",
                    borderColor: assessmentResults.passed ? theme.success + "40" : theme.error + "40",
                  },
                ]}
              >
                <Ionicons
                  name={assessmentResults.passed ? "trophy" : "refresh"}
                  size={22}
                  color={assessmentResults.passed ? theme.success : theme.error}
                />
                <View style={{ flex: 1 }}>
                  <Text
                    style={[
                      styles.resultsTitle,
                      { color: assessmentResults.passed ? theme.success : theme.error },
                    ]}
                  >
                    {assessmentResults.passed ? "Passed!" : "Try Again"}
                  </Text>
                  <Text style={[styles.resultsScore, { color: theme.textSecondary }]}>
                    Score: {assessmentResults.score}% ({Math.round((assessmentResults.score / 100) * assessmentResults.total)}/{assessmentResults.total})
                  </Text>
                </View>
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {allSectionsCompleted && (
        <View
          style={[
            styles.bottomBar,
            {
              backgroundColor: theme.background,
              borderTopColor: theme.border,
              paddingBottom: bottomPad + 16,
            },
          ]}
        >
          <Pressable
            onPress={() => completeMutation.mutate()}
            disabled={completeMutation.isPending}
            style={({ pressed }) => [
              styles.completeBtn,
              { backgroundColor: theme.accent, opacity: pressed ? 0.85 : 1 },
            ]}
          >
            {completeMutation.isPending ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Ionicons name="checkmark-done" size={20} color="#fff" />
                <Text style={styles.completeBtnText}>Complete Lesson</Text>
              </>
            )}
          </Pressable>
        </View>
      )}

      <Modal
        visible={showModuleCompletion}
        transparent
        animationType="fade"
        onRequestClose={() => {}}
      >
        <View style={mcStyles.overlay}>
          <View style={[mcStyles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <View style={mcStyles.iconRow}>
              <View style={[mcStyles.iconCircle, { backgroundColor: theme.accent + "20" }]}>
                <Ionicons name="ribbon" size={32} color={theme.accent} />
              </View>
            </View>

            <Text style={[mcStyles.heading, { color: theme.accent, fontFamily: "Lora_700Bold" }]}>
              Module Completed
            </Text>

            {moduleCompletionData && (
              <>
                <Text style={[mcStyles.moduleTitle, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}>
                  {moduleCompletionData.moduleTitle}
                </Text>

                {moduleCompletionData.learningObjective ? (
                  <View style={[mcStyles.objectiveBox, { borderColor: theme.accent + "25", backgroundColor: theme.accent + "08" }]}>
                    <Text style={[mcStyles.objectiveLabel, { color: theme.accent, fontFamily: "Inter_600SemiBold" }]}>
                      LEARNING OBJECTIVE
                    </Text>
                    <Text style={[mcStyles.objectiveText, { color: theme.text, fontFamily: "Lora_400Regular_Italic" }]}>
                      {moduleCompletionData.learningObjective}
                    </Text>
                  </View>
                ) : null}

                {moduleCompletionData.avgAssessmentScore != null ? (
                  <View style={mcStyles.scoreRow}>
                    <Ionicons name="analytics" size={18} color={theme.textMuted} />
                    <Text style={[mcStyles.scoreText, { color: theme.text, fontFamily: "Inter_400Regular" }]}>
                      Average Assessment Score: {moduleCompletionData.avgAssessmentScore}%
                    </Text>
                  </View>
                ) : null}

                <View style={[mcStyles.divider, { backgroundColor: theme.border }]} />

                <Text style={[mcStyles.confidencePrompt, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}>
                  How confident do you feel explaining this topic?
                </Text>

                <View style={mcStyles.ratingRow}>
                  {[1, 2, 3, 4, 5].map((n) => (
                    <Pressable
                      key={n}
                      onPress={() => { if (!confidenceSaved) setConfidenceRating(n); }}
                      style={[
                        mcStyles.ratingBtn,
                        {
                          backgroundColor: confidenceRating >= n ? theme.accent : theme.accent + "12",
                          borderColor: confidenceRating >= n ? theme.accent : theme.border,
                        },
                      ]}
                    >
                      <Text style={[
                        mcStyles.ratingNum,
                        { color: confidenceRating >= n ? "#fff" : theme.textMuted, fontFamily: "Inter_600SemiBold" },
                      ]}>
                        {n}
                      </Text>
                    </Pressable>
                  ))}
                </View>

                <View style={mcStyles.ratingLabels}>
                  <Text style={[mcStyles.ratingLabel, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
                    Not confident
                  </Text>
                  <Text style={[mcStyles.ratingLabel, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
                    Very confident
                  </Text>
                </View>

                {confidenceSaved ? (
                  <View style={mcStyles.savedRow}>
                    <Ionicons name="checkmark-circle" size={16} color="#2E7D32" />
                    <Text style={[mcStyles.savedText, { color: "#2E7D32", fontFamily: "Inter_400Regular" }]}>
                      Confidence saved
                    </Text>
                  </View>
                ) : null}
              </>
            )}

            <Pressable
              onPress={async () => {
                if (confidenceRating > 0 && !confidenceSaved) {
                  try {
                    await confidenceMutation.mutateAsync();
                  } catch {}
                }
                setShowModuleCompletion(false);
                if (trackCompletionData) {
                  setShowTrackCompletion(true);
                } else {
                  router.back();
                }
              }}
              style={({ pressed }) => [
                mcStyles.doneBtn,
                { backgroundColor: theme.accent, opacity: pressed ? 0.85 : 1 },
              ]}
            >
              {confidenceMutation.isPending ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={[mcStyles.doneBtnText, { fontFamily: "Inter_600SemiBold" }]}>
                  {confidenceRating > 0 && !confidenceSaved ? "Save & Continue" : "Continue"}
                </Text>
              )}
            </Pressable>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showTrackCompletion}
        transparent
        animationType="fade"
        onRequestClose={() => {}}
      >
        <View style={mcStyles.overlay}>
          <View style={[tcStyles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <View style={tcStyles.accentLine} />

            <View style={tcStyles.iconRow}>
              <View style={[tcStyles.iconCircle, { backgroundColor: theme.accent + "15" }]}>
                <Ionicons name="sparkles" size={36} color={theme.accent} />
              </View>
            </View>

            <Text style={[tcStyles.heading, { color: theme.accent, fontFamily: "Lora_700Bold" }]}>
              Journey Complete
            </Text>

            {trackCompletionData && (
              <Text style={[tcStyles.trackTitle, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}>
                {trackCompletionData.trackTitle}
              </Text>
            )}

            <View style={[tcStyles.statsRow, { borderColor: theme.border }]}>
              <View style={tcStyles.stat}>
                <Text style={[tcStyles.statNum, { color: theme.accent, fontFamily: "Inter_700Bold" }]}>
                  {trackCompletionData?.totalModules || 0}
                </Text>
                <Text style={[tcStyles.statLabel, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
                  Modules
                </Text>
              </View>
              <View style={[tcStyles.statDivider, { backgroundColor: theme.border }]} />
              <View style={tcStyles.stat}>
                <Text style={[tcStyles.statNum, { color: theme.accent, fontFamily: "Inter_700Bold" }]}>
                  {trackCompletionData?.totalLessons || 0}
                </Text>
                <Text style={[tcStyles.statLabel, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
                  Lessons
                </Text>
              </View>
            </View>

            <View style={[tcStyles.quoteBox, { backgroundColor: theme.accent + "08", borderColor: theme.accent + "20" }]}>
              <Text style={[tcStyles.quoteText, { color: theme.text, fontFamily: "Lora_400Regular_Italic" }]}>
                The goal of doctrine is not merely understanding{"\u2014"}but transformation.
              </Text>
            </View>

            <Text style={[tcStyles.closing, { color: theme.textSecondary, fontFamily: "Inter_400Regular" }]}>
              Continue your journey through prayer, Scripture, and community.
            </Text>

            <Pressable
              onPress={() => {
                setShowTrackCompletion(false);
                router.back();
              }}
              style={({ pressed }) => [
                tcStyles.doneBtn,
                { backgroundColor: theme.accent, opacity: pressed ? 0.85 : 1 },
              ]}
            >
              <Text style={[tcStyles.doneBtnText, { fontFamily: "Inter_600SemiBold" }]}>
                Return to Study Paths
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const tcStyles = StyleSheet.create({
  card: {
    width: "100%",
    maxWidth: 400,
    borderRadius: 24,
    borderWidth: 1,
    padding: 32,
    overflow: "hidden" as const,
  },
  accentLine: {
    position: "absolute" as const,
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: "#C9933A",
  },
  iconRow: {
    alignItems: "center" as const,
    marginBottom: 20,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  heading: {
    fontSize: 24,
    textAlign: "center" as const,
    marginBottom: 6,
  },
  trackTitle: {
    fontSize: 14,
    textAlign: "center" as const,
    marginBottom: 20,
    textTransform: "uppercase" as const,
    letterSpacing: 1,
  },
  statsRow: {
    flexDirection: "row" as const,
    justifyContent: "center" as const,
    alignItems: "center" as const,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    paddingVertical: 16,
    marginBottom: 24,
  },
  stat: {
    alignItems: "center" as const,
    flex: 1,
  },
  statNum: {
    fontSize: 28,
  },
  statLabel: {
    fontSize: 12,
    marginTop: 2,
    textTransform: "uppercase" as const,
    letterSpacing: 0.5,
  },
  statDivider: {
    width: 1,
    height: 36,
  },
  quoteBox: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 20,
    marginBottom: 16,
  },
  quoteText: {
    fontSize: 16,
    lineHeight: 24,
    textAlign: "center" as const,
  },
  closing: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center" as const,
    marginBottom: 24,
  },
  doneBtn: {
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center" as const,
  },
  doneBtnText: {
    color: "#fff",
    fontSize: 15,
  },
});

const mcStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  card: {
    width: "100%",
    maxWidth: 400,
    borderRadius: 20,
    borderWidth: 1,
    padding: 28,
  },
  iconRow: {
    alignItems: "center",
    marginBottom: 16,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  heading: {
    fontSize: 22,
    textAlign: "center",
    marginBottom: 8,
  },
  moduleTitle: {
    fontSize: 16,
    textAlign: "center",
    marginBottom: 16,
  },
  objectiveBox: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    gap: 6,
    marginBottom: 16,
  },
  objectiveLabel: {
    fontSize: 10,
    letterSpacing: 0.5,
  },
  objectiveText: {
    fontSize: 13,
    lineHeight: 19,
  },
  scoreRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 16,
    justifyContent: "center",
  },
  scoreText: {
    fontSize: 14,
  },
  divider: {
    height: 1,
    marginBottom: 20,
  },
  confidencePrompt: {
    fontSize: 14,
    textAlign: "center",
    marginBottom: 16,
  },
  ratingRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 10,
    marginBottom: 6,
  },
  ratingBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  ratingNum: {
    fontSize: 16,
  },
  ratingLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 4,
    marginBottom: 16,
  },
  ratingLabel: {
    fontSize: 11,
  },
  savedRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginBottom: 8,
  },
  savedText: {
    fontSize: 13,
  },
  doneBtn: {
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  doneBtnText: {
    color: "#fff",
    fontSize: 16,
  },
});

const sectionStyles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 16,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  headerText: {
    flex: 1,
  },
  typeLabel: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    textTransform: "uppercase" as const,
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: "Lora_600SemiBold",
    color: "#F0EBE0",
  },
  checkCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#C9933A",
    alignItems: "center",
    justifyContent: "center",
  },
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
  },
  errorContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
    paddingHorizontal: 40,
  },
  errorText: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    textAlign: "center" as const,
    lineHeight: 22,
  },
  retryBtn: {
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 12,
    marginTop: 8,
  },
  retryBtnText: {
    color: "#fff",
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
  headerBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 12,
    gap: 12,
  },
  headerCenter: {
    flex: 1,
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 17,
    fontFamily: "Lora_600SemiBold",
  },
  headerSub: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    marginTop: 2,
  },
  progressDotsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  progressDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    gap: 16,
  },
  anchorBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
  },
  anchorRef: {
    flex: 1,
    fontSize: 15,
    fontFamily: "Lora_600SemiBold",
  },
  sectionCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
  },
  sectionContent: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    lineHeight: 24,
  },
  reflectionInput: {
    marginTop: 16,
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    minHeight: 100,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    lineHeight: 22,
  },
  markCompleteBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 16,
    borderRadius: 10,
    paddingVertical: 10,
  },
  markCompleteText: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
  questionBlock: {
    marginTop: 16,
    gap: 8,
  },
  questionText: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    lineHeight: 22,
    marginBottom: 4,
  },
  optionBtn: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 10,
    borderWidth: 1,
    padding: 12,
    gap: 10,
  },
  optionRadio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  optionRadioInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#fff",
  },
  optionText: {
    flex: 1,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    lineHeight: 20,
  },
  explanationText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    lineHeight: 19,
    fontStyle: "italic" as const,
    marginTop: 4,
    paddingLeft: 30,
  },
  submitBtn: {
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 20,
  },
  submitBtnText: {
    color: "#fff",
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
  },
  resultsBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    marginTop: 16,
  },
  resultsTitle: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
  },
  resultsScore: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    marginTop: 2,
  },
  bottomBar: {
    position: "absolute" as const,
    bottom: 0,
    left: 0,
    right: 0,
    borderTopWidth: 1,
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  completeBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    borderRadius: 14,
    paddingVertical: 16,
  },
  completeBtnText: {
    color: "#fff",
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
  },
});
