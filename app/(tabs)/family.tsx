import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  useColorScheme,
  Platform,
  TextInput,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/query-client";
import { useProStatus } from "@/contexts/ProContext";
import Colors from "@/constants/colors";
import FamilyHeatmap from "@/components/FamilyHeatmap";
import PrayerWall from "@/components/PrayerWall";

interface ChildStat {
  child: {
    id: string;
    name: string;
    avatarUrl: string | null;
    totalPoints: number;
    currentLevel: number;
  };
  storiesCompleted: number;
  storiesThisWeek: number;
  averageQuizScore: number;
  badgesEarned: number;
  recentBadges: { badgeId: string; name: string; icon: string; earnedAt: string }[];
  recentStories: { title: string; scriptureRef: string | null }[];
}

interface FamilyStats {
  children: ChildStat[];
  summary: {
    totalChildren: number;
    totalStoriesCompleted: number;
    totalBadgesEarned: number;
    totalWeeklyStories: number;
  };
}

interface ConversationData {
  childName: string;
  conversationStarter: string;
  discussion: string[];
}

interface DinnerTopic {
  id: string;
  childName: string;
  storyTitle: string;
  scriptureRef: string | null;
  quizScore: number | null;
  notificationText: string;
  dinnerQuestion: string;
  followUpQuestions: string[];
  discussed: boolean;
  discussedAt: string | null;
  bonusPointsAwarded: boolean;
  createdAt: string;
}

const CHILD_AVATARS = [
  { icon: "happy-outline" as const, color: "#4CAF50" },
  { icon: "heart-outline" as const, color: "#E91E63" },
  { icon: "star-outline" as const, color: "#FF9800" },
  { icon: "flower-outline" as const, color: "#9C27B0" },
  { icon: "sunny-outline" as const, color: "#FFC107" },
  { icon: "moon-outline" as const, color: "#3F51B5" },
];

export default function FamilyDashboard() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const theme = isDark ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();
  const { isPro, showProGate } = useProStatus();
  const qc = useQueryClient();

  const [showAddChild, setShowAddChild] = useState(false);
  const [newChildName, setNewChildName] = useState("");
  const [selectedAvatar, setSelectedAvatar] = useState(0);
  const [activeConversation, setActiveConversation] = useState<string | null>(null);
  const [conversationData, setConversationData] = useState<ConversationData | null>(null);
  const [loadingConversation, setLoadingConversation] = useState(false);
  const [expandedTopic, setExpandedTopic] = useState<string | null>(null);

  const { data: stats, isLoading } = useQuery<FamilyStats>({
    queryKey: ["/api/family/stats?userId=guest&parentId=guest"],
    enabled: isPro,
  });

  const { data: dinnerTopics } = useQuery<DinnerTopic[]>({
    queryKey: ["/api/family/dinner-topics?userId=guest"],
    enabled: isPro,
  });

  const markDiscussedMutation = useMutation({
    mutationFn: async (topicId: string) => {
      const res = await apiRequest("POST", `/api/family/dinner-topics/${topicId}/discussed`, {
        userId: "guest",
      });
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/family/dinner-topics?userId=guest"] });
      qc.invalidateQueries({ queryKey: ["/api/family/stats?userId=guest&parentId=guest"] });
    },
  });

  const addChildMutation = useMutation({
    mutationFn: async (data: { name: string; avatarUrl: string }) => {
      const res = await apiRequest("POST", "/api/family/children", {
        parentId: "guest",
        userId: "guest",
        ...data,
      });
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/family/stats?userId=guest&parentId=guest"] });
      setShowAddChild(false);
      setNewChildName("");
      setSelectedAvatar(0);
    },
  });

  const deleteChildMutation = useMutation({
    mutationFn: async (childId: string) => {
      await apiRequest("DELETE", `/api/family/children/${childId}?userId=guest`, undefined);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/family/stats?userId=guest&parentId=guest"] });
    },
  });

  const handleAddChild = useCallback(() => {
    if (!newChildName.trim()) return;
    addChildMutation.mutate({
      name: newChildName.trim(),
      avatarUrl: `avatar:${selectedAvatar}`,
    });
  }, [newChildName, selectedAvatar]);

  const handleDeleteChild = useCallback((childId: string, childName: string) => {
    Alert.alert(
      "Remove Profile",
      `Remove ${childName}'s profile? Their progress data will remain.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: () => deleteChildMutation.mutate(childId),
        },
      ]
    );
  }, []);

  const handleConversationStarter = useCallback(async (childId: string) => {
    if (activeConversation === childId && conversationData) {
      setActiveConversation(null);
      setConversationData(null);
      return;
    }
    setActiveConversation(childId);
    setLoadingConversation(true);
    try {
      const res = await apiRequest("GET", `/api/family/conversation-starter/${childId}?userId=guest`);
      const data = await res.json();
      setConversationData(data);
    } catch {
      setConversationData({
        childName: "",
        conversationStarter: "Ask your child what Bible story they've been enjoying lately.",
        discussion: [
          "What was your favorite part of the story?",
          "What did you learn about God from that story?",
          "How can we live out what we learned today?",
        ],
      });
    } finally {
      setLoadingConversation(false);
    }
  }, [activeConversation, conversationData]);

  const getAvatarForChild = (avatarUrl: string | null) => {
    if (avatarUrl?.startsWith("avatar:")) {
      const idx = parseInt(avatarUrl.split(":")[1]) || 0;
      return CHILD_AVATARS[idx % CHILD_AVATARS.length];
    }
    return CHILD_AVATARS[0];
  };

  if (!isPro) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <View
          style={[
            styles.proGateContainer,
            {
              paddingTop: Platform.OS === "web" ? 67 + insets.top : insets.top + 40,
            },
          ]}
        >
          <Ionicons name="people" size={64} color={theme.accent} />
          <Text style={[styles.proGateTitle, { color: theme.text }]}>Family Dashboard</Text>
          <Text style={[styles.proGateSubtitle, { color: theme.textSecondary }]}>
            Track your children's faith journey, see their progress, and get AI-powered conversation starters.
          </Text>
          <Pressable
            style={[styles.proGateButton, { backgroundColor: theme.accent }]}
            onPress={showProGate}
            testID="family-upgrade-btn"
          >
            <Ionicons name="diamond" size={18} color="#FFFFFF" />
            <Text style={styles.proGateButtonText}>Unlock with Pro</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={{
          paddingTop: Platform.OS === "web" ? 67 + insets.top : insets.top + 16,
          paddingBottom: Platform.OS === "web" ? 34 + 80 : 100,
        }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Family</Text>
          <Text style={[styles.headerSubtitle, { color: theme.textSecondary }]}>
            Your children's faith journey
          </Text>
        </View>

        {stats && stats.summary.totalChildren > 0 && (
          <View style={[styles.summaryRow, { borderBottomColor: theme.border }]}>
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryValue, { color: theme.accent }]}>
                {stats.summary.totalWeeklyStories}
              </Text>
              <Text style={[styles.summaryLabel, { color: theme.textSecondary }]}>
                This Week
              </Text>
            </View>
            <View style={[styles.summaryDivider, { backgroundColor: theme.border }]} />
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryValue, { color: theme.accent }]}>
                {stats.summary.totalStoriesCompleted}
              </Text>
              <Text style={[styles.summaryLabel, { color: theme.textSecondary }]}>
                Stories Done
              </Text>
            </View>
            <View style={[styles.summaryDivider, { backgroundColor: theme.border }]} />
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryValue, { color: theme.accent }]}>
                {stats.summary.totalBadgesEarned}
              </Text>
              <Text style={[styles.summaryLabel, { color: theme.textSecondary }]}>
                Badges
              </Text>
            </View>
          </View>
        )}

        <FamilyHeatmap />

        <PrayerWall />

        {dinnerTopics && dinnerTopics.length > 0 && (
          <View style={styles.dinnerSection}>
            <View style={styles.dinnerHeader}>
              <Ionicons name="restaurant-outline" size={18} color={theme.accent} />
              <Text style={[styles.dinnerTitle, { color: theme.text }]}>
                Dinner Table Topics
              </Text>
            </View>
            <Text style={[styles.dinnerSubtitle, { color: theme.textSecondary }]}>
              Discuss these with your family to earn bonus points
            </Text>
            {dinnerTopics.filter((t) => !t.discussed).map((topic) => {
              const isExpanded = expandedTopic === topic.id;
              return (
                <View
                  key={topic.id}
                  style={[
                    styles.topicCard,
                    {
                      backgroundColor: theme.backgroundCard,
                      borderColor: theme.accent + "40",
                    },
                  ]}
                >
                  <Pressable
                    onPress={() => setExpandedTopic(isExpanded ? null : topic.id)}
                    style={styles.topicCardHeader}
                  >
                    <View style={[styles.topicBadge, { backgroundColor: theme.accent + "15" }]}>
                      <Ionicons name="chatbubble-ellipses" size={16} color={theme.accent} />
                    </View>
                    <View style={styles.topicCardInfo}>
                      <Text style={[styles.topicChildName, { color: theme.accent }]}>
                        {topic.childName}
                      </Text>
                      <Text style={[styles.topicStoryTitle, { color: theme.text }]} numberOfLines={1}>
                        {topic.storyTitle}
                        {topic.scriptureRef ? ` (${topic.scriptureRef})` : ""}
                      </Text>
                      {topic.quizScore !== null && (
                        <Text style={[styles.topicScore, { color: theme.textMuted }]}>
                          Quiz score: {topic.quizScore}%
                        </Text>
                      )}
                    </View>
                    <Ionicons
                      name={isExpanded ? "chevron-up" : "chevron-down"}
                      size={18}
                      color={theme.textMuted}
                    />
                  </Pressable>

                  {isExpanded && (
                    <View style={styles.topicExpanded}>
                      <View style={[styles.topicQuestionBox, { backgroundColor: theme.background }]}>
                        <Ionicons name="help-circle" size={18} color={theme.accent} />
                        <Text style={[styles.topicQuestion, { color: theme.text }]}>
                          {topic.dinnerQuestion}
                        </Text>
                      </View>

                      {topic.followUpQuestions.length > 0 && (
                        <View style={styles.topicFollowUps}>
                          <Text style={[styles.topicFollowUpLabel, { color: theme.textSecondary }]}>
                            Follow-up Questions
                          </Text>
                          {topic.followUpQuestions.map((q, i) => (
                            <View key={i} style={styles.topicFollowUpRow}>
                              <Text style={[styles.topicFollowUpNum, { color: theme.accent }]}>
                                {i + 1}
                              </Text>
                              <Text style={[styles.topicFollowUpText, { color: theme.text }]}>
                                {q}
                              </Text>
                            </View>
                          ))}
                        </View>
                      )}

                      <Pressable
                        style={[styles.discussedButton, { backgroundColor: theme.accent }]}
                        onPress={() => markDiscussedMutation.mutate(topic.id)}
                        disabled={markDiscussedMutation.isPending}
                        testID={`mark-discussed-${topic.id}`}
                      >
                        {markDiscussedMutation.isPending ? (
                          <ActivityIndicator size="small" color="#FFFFFF" />
                        ) : (
                          <>
                            <Ionicons name="checkmark-circle" size={18} color="#FFFFFF" />
                            <Text style={styles.discussedButtonText}>
                              Mark as Discussed (+25 pts)
                            </Text>
                          </>
                        )}
                      </Pressable>
                    </View>
                  )}
                </View>
              );
            })}

            {dinnerTopics.filter((t) => t.discussed).length > 0 && (
              <View style={styles.discussedSection}>
                <Text style={[styles.discussedLabel, { color: theme.textMuted }]}>
                  Previously Discussed
                </Text>
                {dinnerTopics.filter((t) => t.discussed).slice(0, 3).map((topic) => (
                  <View
                    key={topic.id}
                    style={[
                      styles.discussedCard,
                      { backgroundColor: theme.background, borderColor: theme.border },
                    ]}
                  >
                    <Ionicons name="checkmark-circle" size={16} color="#4CAF50" />
                    <View style={styles.discussedCardInfo}>
                      <Text style={[styles.discussedCardName, { color: theme.textMuted }]}>
                        {topic.childName} - {topic.storyTitle}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.accent} />
          </View>
        ) : stats?.children.length === 0 || !stats ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="people-outline" size={48} color={theme.textMuted} />
            <Text style={[styles.emptyTitle, { color: theme.text }]}>No child profiles yet</Text>
            <Text style={[styles.emptySubtitle, { color: theme.textSecondary }]}>
              Add your children to track their Bible story progress and get personalized conversation starters.
            </Text>
          </View>
        ) : (
          stats.children.map((childStat) => {
            const avatar = getAvatarForChild(childStat.child.avatarUrl);
            const isConversationOpen = activeConversation === childStat.child.id;

            return (
              <View
                key={childStat.child.id}
                style={[styles.childCard, { backgroundColor: theme.backgroundCard, borderColor: theme.border }]}
              >
                <View style={styles.childHeader}>
                  <View style={styles.childInfo}>
                    <View style={[styles.avatarCircle, { backgroundColor: avatar.color + "20" }]}>
                      <Ionicons name={avatar.icon} size={24} color={avatar.color} />
                    </View>
                    <View>
                      <Text style={[styles.childName, { color: theme.text }]}>
                        {childStat.child.name}
                      </Text>
                      <Text style={[styles.childLevel, { color: theme.textSecondary }]}>
                        Level {childStat.child.currentLevel}  ·  {childStat.child.totalPoints} pts
                      </Text>
                    </View>
                  </View>
                  <Pressable
                    onPress={() => handleDeleteChild(childStat.child.id, childStat.child.name)}
                    hitSlop={8}
                  >
                    <Ionicons name="ellipsis-horizontal" size={20} color={theme.textMuted} />
                  </Pressable>
                </View>

                <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>
                  Weekly Faith Summary
                </Text>

                <View style={styles.statsGrid}>
                  <View style={[styles.statBox, { backgroundColor: theme.background }]}>
                    <Ionicons name="book-outline" size={18} color={theme.accent} />
                    <Text style={[styles.statValue, { color: theme.text }]}>
                      {childStat.storiesThisWeek}
                    </Text>
                    <Text style={[styles.statLabel, { color: theme.textMuted }]}>
                      Stories This Week
                    </Text>
                  </View>
                  <View style={[styles.statBox, { backgroundColor: theme.background }]}>
                    <Ionicons name="checkmark-circle-outline" size={18} color="#4CAF50" />
                    <Text style={[styles.statValue, { color: theme.text }]}>
                      {childStat.storiesCompleted}
                    </Text>
                    <Text style={[styles.statLabel, { color: theme.textMuted }]}>
                      Total Completed
                    </Text>
                  </View>
                  <View style={[styles.statBox, { backgroundColor: theme.background }]}>
                    <Ionicons name="school-outline" size={18} color="#2196F3" />
                    <Text style={[styles.statValue, { color: theme.text }]}>
                      {childStat.averageQuizScore}%
                    </Text>
                    <Text style={[styles.statLabel, { color: theme.textMuted }]}>
                      Quiz Average
                    </Text>
                  </View>
                  <View style={[styles.statBox, { backgroundColor: theme.background }]}>
                    <Ionicons name="ribbon-outline" size={18} color="#FF9800" />
                    <Text style={[styles.statValue, { color: theme.text }]}>
                      {childStat.badgesEarned}
                    </Text>
                    <Text style={[styles.statLabel, { color: theme.textMuted }]}>
                      Badges Earned
                    </Text>
                  </View>
                </View>

                {childStat.recentStories.length > 0 && (
                  <View style={styles.recentSection}>
                    <Text style={[styles.recentLabel, { color: theme.textSecondary }]}>
                      Recent Stories
                    </Text>
                    {childStat.recentStories.map((story, i) => (
                      <View key={i} style={styles.storyRow}>
                        <Ionicons name="bookmark" size={14} color={theme.accent} />
                        <Text style={[styles.storyTitle, { color: theme.text }]} numberOfLines={1}>
                          {story.title}
                        </Text>
                        {story.scriptureRef && (
                          <Text style={[styles.storyRef, { color: theme.textMuted }]}>
                            {story.scriptureRef}
                          </Text>
                        )}
                      </View>
                    ))}
                  </View>
                )}

                <Pressable
                  style={[
                    styles.conversationButton,
                    {
                      backgroundColor: isConversationOpen ? theme.accent + "15" : theme.background,
                      borderColor: isConversationOpen ? theme.accent : theme.border,
                    },
                  ]}
                  onPress={() => handleConversationStarter(childStat.child.id)}
                  testID={`conversation-btn-${childStat.child.id}`}
                >
                  <Ionicons
                    name="chatbubbles-outline"
                    size={18}
                    color={isConversationOpen ? theme.accent : theme.textSecondary}
                  />
                  <Text
                    style={[
                      styles.conversationButtonText,
                      { color: isConversationOpen ? theme.accent : theme.textSecondary },
                    ]}
                  >
                    Conversation Starter
                  </Text>
                  <Ionicons
                    name={isConversationOpen ? "chevron-up" : "chevron-down"}
                    size={16}
                    color={isConversationOpen ? theme.accent : theme.textMuted}
                  />
                </Pressable>

                {isConversationOpen && (
                  <View style={[styles.conversationPanel, { backgroundColor: theme.background, borderColor: theme.border }]}>
                    {loadingConversation ? (
                      <View style={styles.conversationLoading}>
                        <ActivityIndicator size="small" color={theme.accent} />
                        <Text style={[styles.conversationLoadingText, { color: theme.textSecondary }]}>
                          Generating conversation ideas...
                        </Text>
                      </View>
                    ) : conversationData ? (
                      <>
                        <View style={styles.starterRow}>
                          <Ionicons name="chatbubble" size={16} color={theme.accent} />
                          <Text style={[styles.starterText, { color: theme.text }]}>
                            {conversationData.conversationStarter}
                          </Text>
                        </View>
                        <Text style={[styles.discussionLabel, { color: theme.textSecondary }]}>
                          Follow-up Questions
                        </Text>
                        {conversationData.discussion.map((q, i) => (
                          <View key={i} style={styles.discussionRow}>
                            <Text style={[styles.discussionNumber, { color: theme.accent }]}>
                              {i + 1}
                            </Text>
                            <Text style={[styles.discussionText, { color: theme.text }]}>
                              {q}
                            </Text>
                          </View>
                        ))}
                      </>
                    ) : null}
                  </View>
                )}
              </View>
            );
          })
        )}

        {showAddChild ? (
          <View style={[styles.addChildForm, { backgroundColor: theme.backgroundCard, borderColor: theme.border }]}>
            <Text style={[styles.addChildTitle, { color: theme.text }]}>Add Child Profile</Text>
            <TextInput
              style={[
                styles.nameInput,
                {
                  color: theme.text,
                  backgroundColor: theme.background,
                  borderColor: theme.border,
                },
              ]}
              placeholder="Child's name"
              placeholderTextColor={theme.textMuted}
              value={newChildName}
              onChangeText={setNewChildName}
              autoFocus
              testID="child-name-input"
            />
            <Text style={[styles.avatarPickerLabel, { color: theme.textSecondary }]}>
              Choose an avatar
            </Text>
            <View style={styles.avatarPicker}>
              {CHILD_AVATARS.map((av, i) => (
                <Pressable
                  key={i}
                  style={[
                    styles.avatarOption,
                    {
                      backgroundColor: selectedAvatar === i ? av.color + "20" : theme.background,
                      borderColor: selectedAvatar === i ? av.color : theme.border,
                    },
                  ]}
                  onPress={() => setSelectedAvatar(i)}
                >
                  <Ionicons name={av.icon} size={24} color={av.color} />
                </Pressable>
              ))}
            </View>
            <View style={styles.addChildActions}>
              <Pressable
                style={[styles.cancelButton, { borderColor: theme.border }]}
                onPress={() => {
                  setShowAddChild(false);
                  setNewChildName("");
                }}
              >
                <Text style={[styles.cancelButtonText, { color: theme.textSecondary }]}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[
                  styles.saveButton,
                  {
                    backgroundColor: newChildName.trim() ? theme.accent : theme.border,
                  },
                ]}
                onPress={handleAddChild}
                disabled={!newChildName.trim() || addChildMutation.isPending}
                testID="save-child-btn"
              >
                {addChildMutation.isPending ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.saveButtonText}>Add Child</Text>
                )}
              </Pressable>
            </View>
          </View>
        ) : (
          <Pressable
            style={[styles.addChildButton, { borderColor: theme.border }]}
            onPress={() => setShowAddChild(true)}
            testID="add-child-btn"
          >
            <Ionicons name="add-circle-outline" size={22} color={theme.accent} />
            <Text style={[styles.addChildButtonText, { color: theme.accent }]}>
              Add Child Profile
            </Text>
          </Pressable>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 28,
    fontFamily: "Inter_700Bold",
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    marginTop: 4,
  },
  summaryRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    paddingVertical: 16,
    marginHorizontal: 20,
    marginBottom: 20,
    borderBottomWidth: 1,
  },
  summaryItem: {
    alignItems: "center",
    flex: 1,
  },
  summaryValue: {
    fontSize: 24,
    fontFamily: "Inter_700Bold",
  },
  summaryLabel: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    marginTop: 2,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  summaryDivider: {
    width: 1,
    height: 32,
  },
  loadingContainer: {
    paddingVertical: 60,
    alignItems: "center",
  },
  emptyContainer: {
    alignItems: "center",
    paddingHorizontal: 40,
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontFamily: "Inter_600SemiBold",
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    marginTop: 8,
    lineHeight: 20,
  },
  childCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
  },
  childHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  childInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  childName: {
    fontSize: 17,
    fontFamily: "Inter_600SemiBold",
  },
  childLevel: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    marginTop: 2,
  },
  sectionLabel: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 14,
  },
  statBox: {
    flex: 1,
    minWidth: "45%" as any,
    borderRadius: 10,
    padding: 12,
    alignItems: "center",
    gap: 4,
  },
  statValue: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
  },
  statLabel: {
    fontSize: 10,
    fontFamily: "Inter_500Medium",
    textTransform: "uppercase",
    letterSpacing: 0.3,
    textAlign: "center",
  },
  recentSection: {
    marginBottom: 14,
  },
  recentLabel: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  storyRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 4,
  },
  storyTitle: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    flex: 1,
  },
  storyRef: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  conversationButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  conversationButtonText: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
  conversationPanel: {
    marginTop: 12,
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
  },
  conversationLoading: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 16,
  },
  conversationLoadingText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
  },
  starterRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 16,
  },
  starterText: {
    fontSize: 15,
    fontFamily: "Inter_500Medium",
    lineHeight: 22,
    flex: 1,
  },
  discussionLabel: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  discussionRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 10,
  },
  discussionNumber: {
    fontSize: 14,
    fontFamily: "Inter_700Bold",
    width: 18,
  },
  discussionText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    lineHeight: 20,
    flex: 1,
  },
  addChildButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginHorizontal: 16,
    marginTop: 4,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: "dashed",
  },
  addChildButtonText: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
  addChildForm: {
    marginHorizontal: 16,
    marginTop: 4,
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
  },
  addChildTitle: {
    fontSize: 17,
    fontFamily: "Inter_600SemiBold",
    marginBottom: 14,
  },
  nameInput: {
    fontSize: 16,
    fontFamily: "Inter_400Regular",
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 14,
  },
  avatarPickerLabel: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  avatarPicker: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 16,
  },
  avatarOption: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
  },
  addChildActions: {
    flexDirection: "row",
    gap: 10,
  },
  cancelButton: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  cancelButtonText: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
  saveButton: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 12,
    borderRadius: 10,
  },
  saveButtonText: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: "#FFFFFF",
  },
  proGateContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 40,
  },
  proGateTitle: {
    fontSize: 24,
    fontFamily: "Inter_700Bold",
    marginTop: 16,
  },
  proGateSubtitle: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    marginTop: 8,
    lineHeight: 22,
  },
  proGateButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 24,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
  },
  proGateButtonText: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    color: "#FFFFFF",
  },
  dinnerSection: {
    marginHorizontal: 16,
    marginBottom: 20,
  },
  dinnerHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  dinnerTitle: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
  },
  dinnerSubtitle: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    marginBottom: 12,
  },
  topicCard: {
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 10,
    overflow: "hidden",
  },
  topicCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    gap: 12,
  },
  topicBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  topicCardInfo: {
    flex: 1,
    gap: 2,
  },
  topicChildName: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  topicStoryTitle: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
  topicScore: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  topicExpanded: {
    paddingHorizontal: 14,
    paddingBottom: 14,
    gap: 12,
  },
  topicQuestionBox: {
    flexDirection: "row",
    gap: 10,
    padding: 12,
    borderRadius: 10,
    alignItems: "flex-start",
  },
  topicQuestion: {
    fontSize: 15,
    fontFamily: "Lora_500Medium",
    lineHeight: 22,
    flex: 1,
  },
  topicFollowUps: {
    gap: 8,
  },
  topicFollowUpLabel: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  topicFollowUpRow: {
    flexDirection: "row",
    gap: 8,
    alignItems: "flex-start",
  },
  topicFollowUpNum: {
    fontSize: 13,
    fontFamily: "Inter_700Bold",
    width: 16,
  },
  topicFollowUpText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    lineHeight: 20,
    flex: 1,
  },
  discussedButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    borderRadius: 10,
  },
  discussedButtonText: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: "#FFFFFF",
  },
  discussedSection: {
    marginTop: 4,
    gap: 6,
  },
  discussedLabel: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  discussedCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  discussedCardInfo: {
    flex: 1,
  },
  discussedCardName: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
  },
});
