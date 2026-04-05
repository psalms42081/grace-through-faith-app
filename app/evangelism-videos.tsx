import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  Platform,
  ActivityIndicator,
  Share,
  Dimensions,
  StatusBar,
  Modal,
  Image,
} from "react-native";
import { router, Stack } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { WebView } from "react-native-webview";

function sanitizeVideoUrl(url: string): string {
  const trimmed = url.trim();
  if (!/^https?:\/\//i.test(trimmed)) return "";
  return trimmed
    .replace(/[<>"'`]/g, "")
    .replace(/javascript:/gi, "")
    .replace(/<script/gi, "");
}
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "@/hooks/useTheme";
import { getApiUrl } from "@/lib/query-client";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

interface EvangelismVideo {
  id: string;
  title: string;
  description: string | null;
  scriptureAnchor: string | null;
  category: string | null;
  avatarVideoUrl: string | null;
  language: string | null;
  createdAt: string;
}

const CATEGORY_COLORS: Record<string, string> = {
  "mental health": "#5B8DEF",
  faith: "#C9933A",
  identity: "#9B59B6",
  relationships: "#E67E22",
  character: "#2ECC71",
  default: "#C9933A",
};

function getCloudinaryThumbnail(videoUrl: string | null): string | null {
  if (!videoUrl) return null;
  if (!videoUrl.includes("cloudinary.com")) return null;
  return videoUrl.replace(/\.(mp4|mov|webm|avi)$/i, ".jpg");
}

function resolveVideoUrl(url: string | null): string | null {
  if (!url) return null;
  if (url.startsWith("http")) return url;
  const base = getApiUrl();
  return `${base}${url}`;
}

function VideoCard({
  video,
  theme,
  isDark,
  onPress,
}: {
  video: EvangelismVideo;
  theme: any;
  isDark: boolean;
  onPress: () => void;
}) {
  const categoryColor =
    CATEGORY_COLORS[video.category?.toLowerCase() || ""] ||
    CATEGORY_COLORS.default;
  const thumbnailUrl = getCloudinaryThumbnail(video.avatarVideoUrl);

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        st.card,
        { backgroundColor: theme.backgroundCard, opacity: pressed ? 0.92 : 1 },
      ]}
      testID={`evangelism-video-${video.id}`}
    >
      <View style={st.cardThumbnailWrap}>
        {thumbnailUrl ? (
          <Image
            source={{ uri: thumbnailUrl }}
            style={st.cardThumbnailImage}
            resizeMode="cover"
          />
        ) : (
          <LinearGradient
            colors={["#1a1a2e", "#16213e", "#0f3460"]}
            style={st.cardThumbnailImage}
          />
        )}
        <LinearGradient
          colors={["transparent", "rgba(0,0,0,0.50)"]}
          style={st.cardThumbnailOverlay}
        >
          <View style={st.cardPlayBtn}>
            <Ionicons name="play" size={20} color="#fff" style={{ paddingLeft: 2 }} />
          </View>
        </LinearGradient>
      </View>
      <View style={st.cardBody}>
        <View style={st.cardBodyTop}>
          <Text
            style={[st.cardTitle, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}
            numberOfLines={2}
          >
            {video.title}
          </Text>
          {video.scriptureAnchor ? (
            <Text
              style={[st.cardScripture, { color: "#C9933A", fontFamily: "Inter_500Medium" }]}
              numberOfLines={1}
            >
              {video.scriptureAnchor}
            </Text>
          ) : null}
        </View>
        <View style={st.cardBodyBottom}>
          {video.category ? (
            <View style={[st.categoryBadge, { backgroundColor: categoryColor + "18" }]}>
              <Text style={[st.categoryText, { color: categoryColor, fontFamily: "Inter_500Medium" }]}>
                {video.category}
              </Text>
            </View>
          ) : null}
          <View style={{ flex: 1 }} />
          <Ionicons name="chevron-forward" size={16} color={theme.textMuted} />
        </View>
      </View>
    </Pressable>
  );
}

function FullscreenPlayer({
  video,
  onClose,
}: {
  video: EvangelismVideo;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;
  const videoUrl = resolveVideoUrl(video.avatarVideoUrl);

  const handleShare = useCallback(async () => {
    try {
      const message = `${video.title}${video.scriptureAnchor ? ` - ${video.scriptureAnchor}` : ""}\n\nWatch this short faith video on the Grace Through Faith app!`;
      await Share.share({ message, title: video.title });
    } catch (_e) {}
  }, [video]);

  const categoryColor =
    CATEGORY_COLORS[video.category?.toLowerCase() || ""] ||
    CATEGORY_COLORS.default;

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
              {video.title}
            </Text>
          </View>
          <Pressable onPress={handleShare} hitSlop={14} style={st.playerHeaderBtn}>
            <Ionicons name="share-outline" size={22} color="#fff" />
          </Pressable>
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
              <Text style={st.noVideoText}>Video unavailable</Text>
            </View>
          )}
        </View>

        <View style={[st.playerInfo, { paddingBottom: bottomPad + 20 }]}>
          <Text style={st.playerTitle}>{video.title}</Text>
          {video.scriptureAnchor ? (
            <Text style={st.playerScripture}>{video.scriptureAnchor}</Text>
          ) : null}
          {video.description ? (
            <Text style={st.playerDescription} numberOfLines={3}>
              {video.description}
            </Text>
          ) : null}
          {video.category ? (
            <View style={[st.categoryBadge, { backgroundColor: categoryColor + "18", marginTop: 8 }]}>
              <Text style={[st.categoryText, { color: categoryColor, fontFamily: "Inter_500Medium" }]}>
                {video.category}
              </Text>
            </View>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}

export default function EvangelismVideosScreen() {
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : 0;

  const [selectedVideo, setSelectedVideo] = useState<EvangelismVideo | null>(null);

  const { data: videos, isLoading } = useQuery<EvangelismVideo[]>({
    queryKey: ["/api/evangelism-videos"],
  });

  const renderItem = useCallback(
    ({ item }: { item: EvangelismVideo }) => (
      <VideoCard video={item} theme={theme} isDark={isDark} onPress={() => setSelectedVideo(item)} />
    ),
    [theme, isDark]
  );

  return (
    <View style={[st.container, { backgroundColor: theme.background }]}>
      <Stack.Screen options={{ headerShown: false }} />

      {selectedVideo && (
        <FullscreenPlayer video={selectedVideo} onClose={() => setSelectedVideo(null)} />
      )}

      <View style={[st.screenHeader, { paddingTop: topPad + 16 }]}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={st.backBtn}>
          <Ionicons name="arrow-back" size={22} color={theme.text} />
        </Pressable>
        <View style={{ flex: 1, marginLeft: 14 }}>
          <Text style={[st.screenTitle, { color: theme.text }]}>
            Faith Videos
          </Text>
          <Text style={[st.screenSubtitle, { color: theme.textSecondary }]}>
            Short videos on faith topics that matter to you
          </Text>
        </View>
      </View>

      {isLoading ? (
        <View style={st.centered}>
          <ActivityIndicator size="large" color="#C9933A" />
        </View>
      ) : !videos || videos.length === 0 ? (
        <View style={st.centered}>
          <Ionicons name="videocam-outline" size={48} color={theme.textMuted} />
          <Text style={[st.emptyText, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}>
            Videos are on the way
          </Text>
          <Text style={[st.emptySubText, { color: theme.textSecondary }]}>
            New faith videos will appear here as they are created. Check back soon.
          </Text>
          <Pressable
            onPress={() => router.back()}
            style={[st.backActionBtn, { backgroundColor: "#C9933A" + "18" }]}
          >
            <Ionicons name="arrow-back" size={16} color="#C9933A" />
            <Text style={[st.backActionText, { color: "#C9933A", fontFamily: "Inter_600SemiBold" }]}>
              Go Back
            </Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={videos}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[st.list, { paddingBottom: bottomPad + 100 }]}
          showsVerticalScrollIndicator={false}
          scrollEnabled={videos.length > 0}
        />
      )}
    </View>
  );
}

const st = StyleSheet.create({
  container: { flex: 1 },
  screenHeader: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    flexDirection: "row",
    alignItems: "center",
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  screenTitle: {
    fontSize: 26,
    letterSpacing: -0.3,
    fontFamily: "Lora_700Bold",
  },
  screenSubtitle: {
    fontSize: 13,
    marginTop: 2,
    opacity: 0.85,
    fontFamily: "Inter_400Regular",
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  emptyText: {
    fontSize: 17,
    fontFamily: "Inter_600SemiBold",
    marginTop: 4,
  },
  emptySubText: {
    fontSize: 14,
    textAlign: "center" as const,
    lineHeight: 20,
    maxWidth: 260,
    fontFamily: "Inter_400Regular",
  },
  backActionBtn: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 6,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginTop: 8,
  },
  backActionText: { fontSize: 14 },
  list: {
    paddingHorizontal: 20,
    gap: 14,
    paddingTop: 4,
  },
  card: {
    borderRadius: 16,
    overflow: "hidden",
  },
  cardThumbnailWrap: {
    width: "100%",
    height: 180,
    position: "relative",
  },
  cardThumbnailImage: {
    width: "100%",
    height: "100%",
  },
  cardThumbnailOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 80,
    alignItems: "center",
    justifyContent: "center",
  },
  cardPlayBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(201,147,58,0.9)",
    alignItems: "center",
    justifyContent: "center",
  },
  cardBody: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 8,
  },
  cardBodyTop: {
    gap: 3,
  },
  cardTitle: {
    fontSize: 16,
    lineHeight: 21,
  },
  cardScripture: {
    fontSize: 13,
  },
  cardBodyBottom: {
    flexDirection: "row",
    alignItems: "center",
  },
  categoryBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 8,
  },
  categoryText: {
    fontSize: 11,
    textTransform: "capitalize" as const,
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
});
