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
} from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/query-client";
import { useAuth } from "@/contexts/AuthContext";
import Colors from "@/constants/colors";

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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tracks"] });
      queryClient.invalidateQueries({ queryKey: [`/api/lessons/${id}?userId=${userId}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/tracks/progress?userId=${userId}`] });
      router.back();
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
    </View>
  );
}

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
