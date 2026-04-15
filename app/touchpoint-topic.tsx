import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Platform,
  ActivityIndicator,
  Alert,
  Linking,
  Image,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTheme } from "@/hooks/useTheme";
import { safeGoBack } from "@/lib/safe-back";
import { apiRequest } from "@/lib/query-client";
import WebView from "react-native-webview";

const GOLD = "#C9933A";
const TEAL = "#2A8B8B";

interface Verse {
  ref: string;
  text: string;
}

interface TouchPointQuestion {
  id: string;
  question: string;
  verses: Verse[];
  commentary: string;
}

interface BibleProjectVideo {
  id: string;
  title: string;
  youtubeId: string;
  duration: string;
  durationMinutes?: number;
  allowEmbed?: boolean;
  description: string;
  series: string;
}

interface TouchPointTopic {
  id: string;
  title: string;
  category: string;
  overview: string;
  questions: TouchPointQuestion[];
  bibleProjectVideos?: BibleProjectVideo[];
}

function VideoCard({ video, isDark, theme }: { video: BibleProjectVideo; isDark: boolean; theme: any }) {
  const [playing, setPlaying] = useState(false);
  const cardBg = isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.03)";
  const borderColor = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)";

  const opensExternal = true;
  const youtubeUrl = `https://www.youtube.com/watch?v=${video.youtubeId}`;
  const embedUrl = `https://www.youtube.com/embed/${video.youtubeId}?rel=0&modestbranding=1&playsinline=1&enablejsapi=1&origin=https://gracethroughfaith.app`;

  const handlePress = () => {
    if (opensExternal) {
      Linking.openURL(youtubeUrl);
    } else {
      setPlaying(true);
    }
  };

  if (playing && !opensExternal) {
    return (
      <View style={[vStyles.card, { backgroundColor: cardBg, borderColor }]}>
        <View style={vStyles.playerWrap}>
          {Platform.OS === "web" ? (
            <iframe
              src={embedUrl}
              style={{ width: "100%", height: "100%", border: "none", borderRadius: 12 } as any}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          ) : (
            <WebView
              source={{ uri: embedUrl }}
              style={{ flex: 1, borderRadius: 12 }}
              allowsInlineMediaPlayback
              allowsFullscreenVideo
              mediaPlaybackRequiresUserAction={false}
              javaScriptEnabled
              domStorageEnabled
              startInLoadingState
            />
          )}
        </View>
        <Pressable onPress={() => setPlaying(false)} style={vStyles.closeRow}>
          <Ionicons name="close-circle" size={18} color={theme.textSecondary} />
          <Text style={[vStyles.closeText, { color: theme.textSecondary }]}>Close player</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <Pressable
      onPress={handlePress}
      style={({ pressed }) => [vStyles.card, { backgroundColor: cardBg, borderColor, opacity: pressed ? 0.85 : 1 }]}
    >
      <View style={vStyles.thumbnailWrap}>
        <Image
          source={{ uri: `https://i.ytimg.com/vi/${video.youtubeId}/hqdefault.jpg` }}
          style={vStyles.thumbnail}
          resizeMode="cover"
        />
        <View style={vStyles.playOverlay}>
          <View style={vStyles.playBtn}>
            <Ionicons name="play" size={24} color="#fff" />
          </View>
        </View>
        <View style={vStyles.durationBadge}>
          <Text style={vStyles.durationText}>{video.duration}</Text>
        </View>
        {opensExternal && (
          <View style={vStyles.externalBadge}>
            <Ionicons name="open-outline" size={11} color="#fff" />
            <Text style={vStyles.externalText}>Opens in YouTube</Text>
          </View>
        )}
      </View>
      <View style={vStyles.info}>
        <Text style={[vStyles.seriesBadge, { color: GOLD }]}>{video.series}</Text>
        <Text style={[vStyles.videoTitle, { color: theme.text }]} numberOfLines={2}>{video.title}</Text>
        <Text style={[vStyles.videoDesc, { color: theme.textSecondary }]} numberOfLines={2}>{video.description}</Text>
      </View>
    </Pressable>
  );
}

export default function TouchPointTopicScreen() {
  const { topicId } = useLocalSearchParams<{ topicId: string }>();
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const [expandedQuestion, setExpandedQuestion] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data: topic, isLoading } = useQuery<TouchPointTopic>({
    queryKey: [`/api/touchpoints/${topicId}`],
    enabled: !!topicId,
  });

  const studyMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/touchpoints/${topicId}/bible-study`);
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.setQueryData([`/api/touchpoints/${topicId}/bible-study`], data);
    },
  });

  const handleCreateStudy = useCallback(() => {
    Alert.alert(
      "Bible Study",
      `Create a Bible study on the topic of ${topic?.title}?`,
      [
        { text: "Not Now", style: "cancel" },
        {
          text: "OK",
          onPress: () => {
            studyMutation.mutate(undefined, {
              onSuccess: (data) => {
                router.push(
                  `/touchpoint-study?topicId=${topicId}&title=${encodeURIComponent(data.title || topic?.title || "")}` as any
                );
              },
            });
          },
        },
      ]
    );
  }, [topic, topicId, studyMutation]);

  const cardBg = isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.03)";
  const borderColor = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)";

  const videos = topic?.bibleProjectVideos || [];

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={[styles.header, { paddingTop: topPad + 12 }]}>
          <Pressable onPress={() => safeGoBack(router, "/touchpoints")} hitSlop={12}>
            <Ionicons name="chevron-back" size={24} color={theme.text} />
          </Pressable>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={GOLD} />
        </View>
      </View>
    );
  }

  if (!topic) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <Text style={{ color: theme.text, textAlign: "center", marginTop: 100 }}>Topic not found</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 12, backgroundColor: theme.background }]}>
        <Pressable onPress={() => safeGoBack(router, "/touchpoints")} hitSlop={12}>
          <Ionicons name="chevron-back" size={24} color={theme.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: theme.text, fontFamily: "Lora_700Bold" }]} numberOfLines={1}>
          {topic.title}
        </Text>
        <Pressable
          onPress={handleCreateStudy}
          hitSlop={8}
          disabled={studyMutation.isPending}
        >
          {studyMutation.isPending ? (
            <ActivityIndicator size="small" color={GOLD} />
          ) : (
            <Ionicons name="sparkles" size={22} color={GOLD} />
          )}
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: bottomPad + 40 }}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.overview, { color: theme.text, fontFamily: "Inter_400Regular" }]}>
          {topic.overview}
        </Text>

        {videos.length > 0 && (
          <View style={styles.videoSection}>
            <View style={styles.videoSectionHeader}>
              <Ionicons name="videocam" size={20} color={GOLD} />
              <Text style={[styles.videoSectionTitle, { color: theme.text }]}>
                Watch
              </Text>
            </View>
            <Text style={[styles.videoSectionSubtitle, { color: theme.textSecondary }]}>
              Selected teaching on this topic
            </Text>
            {videos.map((v) => (
              <VideoCard key={v.id} video={v} isDark={isDark} theme={theme} />
            ))}
          </View>
        )}

        <View style={styles.questionList}>
          <View style={styles.questionSectionHeader}>
            <Ionicons name="help-circle" size={20} color={TEAL} />
            <Text style={[styles.questionSectionTitle, { color: theme.text }]}>
              Questions & Scripture
            </Text>
          </View>
          {topic.questions.map((q) => {
            const isExpanded = expandedQuestion === q.id;
            return (
              <View key={q.id}>
                <Pressable
                  onPress={() => setExpandedQuestion(isExpanded ? null : q.id)}
                  style={({ pressed }) => [
                    styles.questionRow,
                    {
                      backgroundColor: cardBg,
                      borderColor,
                      opacity: pressed ? 0.8 : 1,
                    },
                  ]}
                >
                  <Ionicons
                    name="help-circle"
                    size={28}
                    color={TEAL}
                    style={{ marginTop: 2 }}
                  />
                  <Text
                    style={[
                      styles.questionText,
                      { color: theme.text, fontFamily: "Inter_500Medium" },
                    ]}
                  >
                    {q.question}
                  </Text>
                  <Ionicons
                    name={isExpanded ? "chevron-down" : "chevron-forward"}
                    size={20}
                    color={isDark ? "#555" : "#aaa"}
                  />
                </Pressable>

                {isExpanded && (
                  <View style={[styles.answerContainer, { borderColor }]}>
                    {q.verses.map((v, i) => (
                      <View key={i} style={styles.verseBlock}>
                        <Text style={[styles.verseRef, { color: TEAL, fontFamily: "Inter_600SemiBold" }]}>
                          {v.ref}
                        </Text>
                        <Text style={[styles.verseText, { color: theme.text, fontFamily: "Inter_400Regular" }]}>
                          {v.text}
                        </Text>
                      </View>
                    ))}
                    <View style={[styles.commentaryBlock, { borderLeftColor: GOLD + "60" }]}>
                      <Text style={[styles.commentaryText, { color: theme.textSecondary, fontFamily: "Inter_400Regular" }]}>
                        {q.commentary}
                      </Text>
                    </View>
                  </View>
                )}
              </View>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}

const vStyles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
    marginBottom: 12,
  },
  thumbnailWrap: {
    height: 100,
    backgroundColor: "rgba(0,0,0,0.3)",
    alignItems: "center",
    justifyContent: "center",
  },
  thumbnail: {
    alignItems: "center",
    justifyContent: "center",
  },
  playOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.25)",
  },
  playBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(201,147,58,0.9)",
    alignItems: "center",
    justifyContent: "center",
  },
  durationBadge: {
    position: "absolute",
    bottom: 8,
    right: 10,
    backgroundColor: "rgba(0,0,0,0.7)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  durationText: {
    fontFamily: "Inter_500Medium",
    fontSize: 11,
    color: "#fff",
  },
  info: {
    padding: 14,
    gap: 4,
  },
  seriesBadge: {
    fontFamily: "Inter_500Medium",
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  videoTitle: {
    fontFamily: "Lora_600SemiBold",
    fontSize: 16,
    lineHeight: 22,
  },
  videoDesc: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    lineHeight: 19,
    marginTop: 2,
  },
  playerWrap: {
    height: 210,
    backgroundColor: "#000",
  },
  closeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    padding: 10,
    justifyContent: "center",
  },
  closeText: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
  },
  externalBadge: {
    position: "absolute",
    bottom: 8,
    left: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(0,0,0,0.65)",
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  externalText: {
    color: "#fff",
    fontSize: 10,
    fontFamily: "Inter_500Medium",
  },
});

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 16,
    gap: 12,
  },
  headerTitle: { fontSize: 20, flex: 1, letterSpacing: -0.3 },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  overview: {
    fontSize: 16,
    lineHeight: 26,
    marginBottom: 28,
  },
  videoSection: {
    marginBottom: 28,
  },
  videoSectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  videoSectionTitle: {
    fontFamily: "Lora_700Bold",
    fontSize: 18,
    letterSpacing: -0.2,
  },
  videoSectionSubtitle: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    marginBottom: 14,
    marginLeft: 28,
  },
  questionList: {
    gap: 10,
  },
  questionSectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  questionSectionTitle: {
    fontFamily: "Lora_700Bold",
    fontSize: 18,
    letterSpacing: -0.2,
  },
  questionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
  },
  questionText: {
    flex: 1,
    fontSize: 15,
    lineHeight: 22,
  },
  answerContainer: {
    marginLeft: 20,
    marginRight: 4,
    marginBottom: 8,
    paddingLeft: 16,
    paddingTop: 12,
    borderLeftWidth: 2,
    gap: 16,
  },
  verseBlock: {
    gap: 4,
  },
  verseRef: {
    fontSize: 14,
    textDecorationLine: "underline",
  },
  verseText: {
    fontSize: 15,
    lineHeight: 24,
    fontStyle: "italic",
  },
  commentaryBlock: {
    borderLeftWidth: 3,
    paddingLeft: 14,
    paddingVertical: 4,
  },
  commentaryText: {
    fontSize: 15,
    lineHeight: 24,
  },
});
