import React, { useState, useCallback, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Platform,
  Linking,
  Image,
  ActivityIndicator,
} from "react-native";
import { router, useLocalSearchParams, Stack } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/hooks/useTheme";
import { WebView } from "react-native-webview";
import { getApiUrl } from "@/lib/query-client";

export default function SermonPlayerScreen() {
  const { videoId, title, speaker } = useLocalSearchParams<{
    videoId: string;
    title?: string;
    speaker?: string;
  }>();
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;
  const [loading, setLoading] = useState(true);
  const [playerFailed, setPlayerFailed] = useState(false);
  const appOrigin = Platform.OS === "web" ? (typeof window !== "undefined" ? window.location.origin : "") : "";
  const originParam = appOrigin ? `&origin=${encodeURIComponent(appOrigin)}` : "";
  const embedUrl = `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0&modestbranding=1&playsinline=1${originParam}`;
  const validVideoId = typeof videoId === "string" && /^[A-Za-z0-9_-]{11}$/.test(videoId);

  useEffect(() => {
    setLoading(true);
    setPlayerFailed(!validVideoId);
    if (!validVideoId || !loading) return;
    const timer = setTimeout(() => {
      setLoading(false);
      setPlayerFailed(true);
    }, 12000);
    return () => clearTimeout(timer);
  }, [validVideoId, videoId, loading]);

  useEffect(() => {
    if (!validVideoId) return;
    let active = true;
    fetch(`${getApiUrl()}api/youtube/video-status?videoId=${encodeURIComponent(videoId)}`)
      .then(async (response) => {
        if (!response.ok) return null;
        return response.json() as Promise<{ available?: boolean }>;
      })
      .then((result) => {
        if (active && result?.available === false) {
          setLoading(false);
          setPlayerFailed(true);
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [validVideoId, videoId]);

  const handleOpenInYouTube = useCallback(() => {
    Linking.openURL(`https://www.youtube.com/watch?v=${videoId}`);
  }, [videoId]);

  if (!videoId || !validVideoId) {
    return (
      <View style={[st.container, { backgroundColor: theme.background }]}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={[st.header, { paddingTop: topPad + 12 }]}>
          <Pressable onPress={() => router.back()} hitSlop={12}>
            <Ionicons name="arrow-back" size={24} color={theme.text} />
          </Pressable>
        </View>
        <View style={st.emptyState}>
          <Text style={[st.emptyText, { color: theme.textSecondary, fontFamily: "Inter_500Medium" }]}>
            Video not found
          </Text>
        </View>
      </View>
    );
  }

  const thumbnailUrl = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;

  const renderPlayer = () => {
    if (playerFailed) {
      return (
        <View style={st.playerContainer}>
          <Image source={{ uri: thumbnailUrl }} style={st.thumbnail} resizeMode="cover" />
          <View style={st.failureOverlay}>
            <Ionicons name="videocam-off-outline" size={30} color="#FFFFFF" />
            <Text style={st.failureText}>This video could not be loaded here.</Text>
            <Pressable onPress={handleOpenInYouTube} style={st.failureButton}>
              <Ionicons name="logo-youtube" size={17} color="#FFFFFF" />
              <Text style={st.failureButtonText}>Open in YouTube</Text>
            </Pressable>
          </View>
        </View>
      );
    }
    if (Platform.OS === "web") {
      return (
        <View style={st.playerContainer}>
          <iframe
            src={embedUrl}
            style={{
              width: "100%",
              height: "100%",
              border: "none",
            } as any}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            referrerPolicy="origin"
            onLoad={() => setLoading(false)}
            onError={() => { setLoading(false); setPlayerFailed(true); }}
          />
        </View>
      );
    }

    return (
      <View style={st.playerContainer}>
        {loading && (
          <View style={st.loadingOverlay}>
            <ActivityIndicator size="large" color={theme.accent} />
          </View>
        )}
        <WebView
          source={{ uri: embedUrl }}
          style={st.webview}
          allowsFullscreenVideo
          allowsInlineMediaPlayback
          mediaPlaybackRequiresUserAction={false}
          javaScriptEnabled
          onLoadEnd={() => setLoading(false)}
          onError={() => { setLoading(false); setPlayerFailed(true); }}
          onHttpError={() => { setLoading(false); setPlayerFailed(true); }}
        />
      </View>
    );
  };

  return (
    <View style={[st.container, { backgroundColor: theme.background }]}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={[st.header, { paddingTop: topPad + 12 }]}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </Pressable>
        <View style={st.headerCenter}>
          <Text style={[st.headerTitle, { color: theme.text, fontFamily: "Lora_700Bold" }]} numberOfLines={1}>
            {title || "Sermon"}
          </Text>
        </View>
        <Pressable onPress={handleOpenInYouTube} hitSlop={12}>
          <Ionicons name="open-outline" size={22} color={theme.textMuted} />
        </Pressable>
      </View>

      {renderPlayer()}

      <View style={[st.details, { paddingBottom: bottomPad + 20 }]}>
        {title ? (
          <Text style={[st.sermonTitle, { color: theme.text, fontFamily: "Inter_600SemiBold" }]} numberOfLines={3}>
            {title}
          </Text>
        ) : null}

        {speaker ? (
          <Text style={[st.speakerName, { color: theme.textSecondary, fontFamily: "Inter_400Regular" }]}>
            {speaker}
          </Text>
        ) : null}

        {Platform.OS !== "android" ? (
          <Pressable
            onPress={handleOpenInYouTube}
            style={[st.youtubeBtn, { borderColor: theme.border }]}
          >
            <Ionicons name="logo-youtube" size={18} color="#FF0000" />
            <Text style={[st.youtubeBtnText, { color: theme.textSecondary, fontFamily: "Inter_500Medium" }]}>
              Open in YouTube
            </Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  container: { flex: 1 },
  header: {
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
    fontSize: 18,
  },
  playerContainer: {
    width: "100%",
    aspectRatio: 16 / 9,
    backgroundColor: "#000",
    position: "relative",
  },
  webview: {
    flex: 1,
    backgroundColor: "#000",
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#000",
    zIndex: 10,
  },
  failureOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingHorizontal: 24,
    backgroundColor: "rgba(0,0,0,0.68)",
  },
  failureText: {
    color: "#FFFFFF",
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
    fontFamily: "Inter_500Medium",
  },
  failureButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    borderRadius: 999,
    backgroundColor: "#D92D20",
    paddingHorizontal: 15,
    paddingVertical: 9,
  },
  failureButtonText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },
  thumbnail: {
    ...StyleSheet.absoluteFillObject,
    width: "100%",
    height: "100%",
  },
  playOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  playButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "rgba(255,0,0,0.9)",
    alignItems: "center",
    justifyContent: "center",
  },
  details: {
    paddingHorizontal: 20,
    paddingTop: 20,
    gap: 8,
  },
  sermonTitle: {
    fontSize: 18,
    lineHeight: 26,
  },
  speakerName: {
    fontSize: 14,
  },
  youtubeBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginTop: 12,
    alignSelf: "flex-start",
  },
  youtubeBtnText: {
    fontSize: 14,
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyText: {
    fontSize: 16,
  },
});
