import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Platform,
  ActivityIndicator,
  Modal,
  StatusBar,
} from "react-native";
import { router, Stack } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { LinearGradient } from "expo-linear-gradient";
import { WebView } from "react-native-webview";
import { useTheme } from "@/hooks/useTheme";
import { getApiUrl } from "@/lib/query-client";

interface Episode {
  id: string;
  seriesId: string;
  title: string;
  description: string | null;
  scriptureAnchor: string | null;
  videoUrl: string | null;
  duration: number | null;
  orderIndex: number;
  status: string;
}

interface Series {
  id: string;
  title: string;
  subtitle: string | null;
  description: string | null;
  tag: string | null;
  speaker: string | null;
  gradientColors: string[] | null;
  episodeCount: number;
  status: string;
  isFeatured: boolean;
  episodes: Episode[];
}

function sanitizeVideoUrl(url: string): string {
  const trimmed = url.trim();
  if (!/^https?:\/\//i.test(trimmed)) return "";
  return trimmed
    .replace(/[<>"'`]/g, "")
    .replace(/javascript:/gi, "")
    .replace(/<script/gi, "");
}

function resolveVideoUrl(url: string | null): string | null {
  if (!url || url.trim() === "") return null;
  if (url.startsWith("http")) return url;
  const base = getApiUrl();
  return `${base}${url}`;
}

function isYouTubeUrl(url: string): boolean {
  return url.includes("youtube.com") || url.includes("youtu.be");
}

function getYouTubeId(url: string): string | null {
  const match = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  return match ? match[1] : null;
}

function EpisodePlayer({
  episode,
  onClose,
}: {
  episode: Episode;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;
  const videoUrl = resolveVideoUrl(episode.videoUrl);

  return (
    <Modal visible animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <View style={st.playerRoot}>
        <StatusBar barStyle="light-content" />
        <View style={[st.playerHeader, { paddingTop: topPad + 8 }]}>
          <Pressable onPress={onClose} hitSlop={14} style={st.playerHeaderBtn}>
            <Ionicons name="close" size={26} color="#fff" />
          </Pressable>
          <View style={st.playerHeaderCenter}>
            <Text style={st.playerHeaderTitle} numberOfLines={1}>
              {episode.title}
            </Text>
          </View>
          <View style={st.playerHeaderBtn} />
        </View>

        <View style={st.playerVideoArea}>
          {videoUrl ? (
            Platform.OS === "web" ? (
              <div
                style={{
                  width: "100%",
                  height: "100%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: "#000",
                }}
                dangerouslySetInnerHTML={{
                  __html: `<video src="${sanitizeVideoUrl(videoUrl)}" controls autoplay playsinline style="width:100%;height:100%;object-fit:contain;background:#000;" />`,
                }}
              />
            ) : (
              <WebView
                source={{
                  html: `<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1"><style>*{margin:0;padding:0;box-sizing:border-box}body{background:#000;display:flex;align-items:center;justify-content:center;height:100vh;width:100vw}video{width:100%;height:100%;object-fit:contain;background:#000}</style></head><body><video src="${sanitizeVideoUrl(videoUrl)}" controls autoplay playsinline></video></body></html>`,
                }}
                style={st.playerVideo}
                allowsInlineMediaPlayback
                mediaPlaybackRequiresUserAction={false}
                javaScriptEnabled
                scrollEnabled={false}
              />
            )
          ) : (
            <View style={st.noVideoWrap}>
              <Ionicons name="videocam-off-outline" size={40} color="rgba(255,255,255,0.3)" />
              <Text style={st.noVideoText}>Video coming soon</Text>
            </View>
          )}
        </View>

        <View style={[st.playerInfo, { paddingBottom: bottomPad + 20 }]}>
          <Text style={st.playerTitle}>{episode.title}</Text>
          {episode.scriptureAnchor ? (
            <Text style={st.playerScripture}>{episode.scriptureAnchor}</Text>
          ) : null}
          {episode.description ? (
            <Text style={st.playerDescription} numberOfLines={3}>
              {episode.description}
            </Text>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}

function FeaturedSeriesCard({
  series,
  onEpisodePress,
  onStartWatching,
}: {
  series: Series;
  onEpisodePress: (ep: Episode) => void;
  onStartWatching: () => void;
}) {
  const gradient = series.gradientColors || ["#1a0a2e", "#2d1b69", "#4c1d95"];

  return (
    <View style={st.featuredCard}>
      <LinearGradient
        colors={gradient as [string, string, ...string[]]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      <View style={st.featuredContent}>
        <View style={st.featuredHeader}>
          {series.tag ? (
            <View style={st.tagBadge}>
              <Text style={st.tagText}>✦ {series.tag}</Text>
            </View>
          ) : null}
          <Text style={st.featuredTitle}>{series.title}</Text>
          {series.subtitle ? (
            <Text style={st.featuredSubtitle}>{series.subtitle}</Text>
          ) : null}
        </View>

        <View style={st.metaRow}>
          <View style={st.metaItem}>
            <Ionicons name="film-outline" size={14} color="rgba(255,255,255,0.5)" />
            <Text style={st.metaText}>{series.episodeCount} Episodes</Text>
          </View>
          <Text style={st.metaDot}>•</Text>
          <View style={st.metaItem}>
            <Ionicons name="person-outline" size={14} color="rgba(255,255,255,0.5)" />
            <Text style={st.metaText}>{series.speaker || "Speaker"}</Text>
          </View>
        </View>

        {series.episodes.some(ep => ep.videoUrl) && (
          <Pressable
            onPress={onStartWatching}
            style={({ pressed }) => [st.startBtn, pressed && { opacity: 0.8 }]}
            testID="start-watching-btn"
          >
            <Ionicons name="play" size={16} color="#C9933A" />
            <Text style={st.startBtnText}>Start Watching</Text>
          </Pressable>
        )}
      </View>

      <View style={st.episodeList}>
        {series.episodes.map((ep, i) => (
          <Pressable
            key={ep.id}
            onPress={() => ep.videoUrl ? onEpisodePress(ep) : undefined}
            disabled={!ep.videoUrl}
            style={({ pressed }) => [
              st.episodeRow,
              i > 0 && st.episodeRowBorder,
              pressed && ep.videoUrl ? { opacity: 0.7 } : undefined,
              !ep.videoUrl && { opacity: 0.5 },
            ]}
            testID={`episode-${ep.orderIndex}`}
          >
            <View
              style={[
                st.episodeNum,
                i === 0 && ep.videoUrl && st.episodeNumActive,
              ]}
            >
              <Text
                style={[
                  st.episodeNumText,
                  i === 0 && ep.videoUrl && st.episodeNumTextActive,
                ]}
              >
                {ep.orderIndex}
              </Text>
            </View>
            <View style={st.episodeInfo}>
              <Text
                style={[
                  st.episodeTitle,
                  i === 0 && ep.videoUrl && st.episodeTitleActive,
                ]}
                numberOfLines={1}
              >
                {ep.title}
              </Text>
              {ep.scriptureAnchor ? (
                <Text style={st.episodeScripture}>{ep.scriptureAnchor}</Text>
              ) : null}
            </View>
            {ep.videoUrl ? (
              <Ionicons name="play" size={14} color="rgba(255,255,255,0.3)" />
            ) : (
              <View style={st.unavailableBadge}>
                <Text style={st.unavailableBadgeText}>Soon</Text>
              </View>
            )}
          </Pressable>
        ))}
      </View>
    </View>
  );
}

function MoreSeriesRow({
  series,
  onPress,
}: {
  series: Series;
  onPress: () => void;
}) {
  const gradient = series.gradientColors || ["#1a1a2e", "#2d2d4e"];

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [st.moreRow, pressed && { opacity: 0.8 }]}
    >
      <LinearGradient
        colors={gradient as [string, string, ...string[]]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <View style={st.moreRowIcon}>
        <Ionicons name="film-outline" size={20} color="rgba(255,255,255,0.4)" />
      </View>
      <View style={st.moreRowInfo}>
        <Text style={st.moreRowTitle}>{series.title}</Text>
        <Text style={st.moreRowEpisodes}>{series.episodeCount} Episodes</Text>
      </View>
      {series.tag ? (
        <View style={st.moreRowTag}>
          <Text style={st.moreRowTagText}>{series.tag}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

export default function SeriesScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : 0;

  const [selectedEpisode, setSelectedEpisode] = useState<Episode | null>(null);

  const { data: allSeries, isLoading } = useQuery<Series[]>({
    queryKey: ["/api/series"],
  });

  const featured = allSeries?.find((s) => s.isFeatured);
  const moreSeries = allSeries?.filter((s) => !s.isFeatured) || [];

  const handleEpisodePress = useCallback((ep: Episode) => {
    const url = resolveVideoUrl(ep.videoUrl);
    if (url && isYouTubeUrl(url)) {
      const ytId = getYouTubeId(url);
      if (ytId) {
        router.push({
          pathname: "/sermon-player" as any,
          params: { videoId: ytId, title: ep.title, speaker: "" },
        });
        return;
      }
    }
    setSelectedEpisode(ep);
  }, []);

  const handleStartWatching = useCallback(() => {
    if (featured?.episodes?.length) {
      const playable = featured.episodes.find(ep => ep.videoUrl);
      if (playable) handleEpisodePress(playable);
    }
  }, [featured, handleEpisodePress]);

  return (
    <View style={st.container}>
      <Stack.Screen options={{ headerShown: false }} />

      {selectedEpisode && (
        <EpisodePlayer
          episode={selectedEpisode}
          onClose={() => setSelectedEpisode(null)}
        />
      )}

      <View style={[st.headerBar, { paddingTop: topPad + 8 }]}>
        <Pressable onPress={() => router.back()} style={st.backBtn} hitSlop={12}>
          <Ionicons name="chevron-back" size={24} color="#F0EBE0" />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={st.headerTitle}>Series</Text>
          <Text style={st.headerSub}>Biblical video stories</Text>
        </View>
      </View>

      {isLoading ? (
        <View style={st.centered}>
          <ActivityIndicator size="large" color="#C9933A" />
        </View>
      ) : !allSeries || allSeries.length === 0 ? (
        <View style={st.centered}>
          <Ionicons name="film-outline" size={48} color="rgba(240,235,224,0.3)" />
          <Text style={st.emptyText}>No series available yet</Text>
        </View>
      ) : (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingBottom: bottomPad + 100 }}
          showsVerticalScrollIndicator={false}
        >
          {featured && (
            <View style={st.featuredSection}>
              <FeaturedSeriesCard
                series={featured}
                onEpisodePress={handleEpisodePress}
                onStartWatching={handleStartWatching}
              />
            </View>
          )}

          {moreSeries.length > 0 && (
            <View style={st.moreSection}>
              <Text style={st.moreSectionTitle}>More Series</Text>
              <View style={st.moreList}>
                {moreSeries.map((s) => (
                  <MoreSeriesRow
                    key={s.id}
                    series={s}
                    onPress={() => {
                      if (s.episodes?.length) {
                        setSelectedEpisode(s.episodes[0]);
                      }
                    }}
                  />
                ))}
              </View>
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
}

const st = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0C0C14",
  },
  headerBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 8,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    color: "#F0EBE0",
    fontSize: 22,
    letterSpacing: -0.3,
    fontFamily: "Lora_700Bold",
  },
  headerSub: {
    color: "rgba(240,235,224,0.6)",
    fontSize: 13,
    marginTop: 2,
    fontFamily: "Inter_400Regular",
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  emptyText: {
    color: "rgba(240,235,224,0.5)",
    fontSize: 15,
    fontFamily: "Inter_500Medium",
  },

  featuredSection: {
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 24,
  },
  featuredCard: {
    borderRadius: 20,
    overflow: "hidden",
  },
  featuredContent: {
    padding: 20,
    paddingBottom: 16,
  },
  featuredHeader: {
    marginBottom: 12,
  },
  tagBadge: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(201,147,58,0.9)",
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 6,
    marginBottom: 10,
  },
  tagText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.8,
    textTransform: "uppercase",
    fontFamily: "Inter_700Bold",
  },
  featuredTitle: {
    color: "#fff",
    fontSize: 22,
    fontFamily: "Lora_700Bold",
    marginBottom: 4,
  },
  featuredSubtitle: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 13,
    fontFamily: "Inter_400Regular",
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 16,
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  metaText: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 11,
    fontFamily: "Inter_400Regular",
  },
  metaDot: {
    color: "rgba(255,255,255,0.2)",
    fontSize: 12,
  },
  startBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "rgba(201,147,58,0.15)",
    borderWidth: 1,
    borderColor: "rgba(201,147,58,0.3)",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 12,
  },
  startBtnText: {
    color: "#C9933A",
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },

  episodeList: {
    backgroundColor: "rgba(0,0,0,0.25)",
    paddingVertical: 4,
  },
  episodeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  episodeRowBorder: {
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.04)",
  },
  episodeNum: {
    width: 24,
    height: 24,
    borderRadius: 6,
    backgroundColor: "rgba(255,255,255,0.06)",
    alignItems: "center",
    justifyContent: "center",
  },
  episodeNumActive: {
    backgroundColor: "rgba(201,147,58,0.2)",
  },
  episodeNumText: {
    fontSize: 11,
    fontWeight: "700",
    color: "rgba(255,255,255,0.4)",
  },
  episodeNumTextActive: {
    color: "#C9933A",
  },
  episodeInfo: {
    flex: 1,
  },
  episodeTitle: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 13,
    fontFamily: "Inter_400Regular",
  },
  episodeTitleActive: {
    color: "#fff",
    fontFamily: "Inter_600SemiBold",
  },
  episodeScripture: {
    color: "#C9933A",
    fontSize: 10,
    marginTop: 1,
    opacity: 0.7,
    fontFamily: "Inter_400Regular",
  },

  moreSection: {
    paddingHorizontal: 20,
  },
  moreSectionTitle: {
    color: "rgba(240,235,224,0.6)",
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    marginBottom: 12,
  },
  moreList: {
    gap: 10,
  },
  moreRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
    borderRadius: 14,
    overflow: "hidden",
  },
  moreRowIcon: {
    width: 48,
    height: 48,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.06)",
    alignItems: "center",
    justifyContent: "center",
  },
  moreRowInfo: {
    flex: 1,
  },
  moreRowTitle: {
    color: "#fff",
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
  moreRowEpisodes: {
    color: "rgba(255,255,255,0.4)",
    fontSize: 11,
    marginTop: 2,
    fontFamily: "Inter_400Regular",
  },
  moreRowTag: {
    backgroundColor: "rgba(255,255,255,0.1)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  moreRowTagText: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 10,
    fontWeight: "500",
  },

  playerRoot: {
    flex: 1,
    backgroundColor: "#000",
  },
  playerHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 8,
    gap: 10,
  },
  playerHeaderBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  playerHeaderCenter: {
    flex: 1,
    alignItems: "center",
  },
  playerHeaderTitle: {
    color: "#fff",
    fontSize: 17,
    fontFamily: "Lora_700Bold",
  },
  playerVideoArea: {
    flex: 1,
    backgroundColor: "#000",
  },
  playerVideo: {
    width: "100%",
    height: "100%",
  },
  noVideoWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  noVideoText: {
    color: "rgba(255,255,255,0.4)",
    fontSize: 15,
    fontFamily: "Inter_500Medium",
  },
  playerInfo: {
    paddingHorizontal: 20,
    paddingTop: 16,
    gap: 4,
  },
  playerTitle: {
    color: "#F0EBE0",
    fontSize: 18,
    lineHeight: 24,
    fontFamily: "Inter_600SemiBold",
  },
  playerScripture: {
    color: "#C9933A",
    fontSize: 14,
    fontFamily: "Inter_500Medium",
  },
  playerDescription: {
    color: "rgba(240,235,224,0.7)",
    fontSize: 13,
    lineHeight: 19,
    marginTop: 4,
    fontFamily: "Inter_400Regular",
  },
  unavailableBadge: {
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  unavailableBadgeText: {
    color: "rgba(255,255,255,0.35)",
    fontSize: 10,
    fontFamily: "Inter_500Medium",
    letterSpacing: 0.3,
  },
});
