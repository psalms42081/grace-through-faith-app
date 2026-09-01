import React, { useCallback, useEffect, useRef, useState } from "react";
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
import { useVideoPlayer, VideoView } from "expo-video";
import { Ionicons } from "@expo/vector-icons";
import { HV2, F } from "@/components/home-v2/theme";
import { sabbathSchoolMediaUrl } from "@/lib/sabbath-school-media";
import { getApiUrl } from "@/lib/query-client";
import {
  canInlinePlaySabbathSchoolVideo,
  firstPlayableSabbathSchoolClip,
  type SabbathSchoolVideoClip,
} from "@/lib/sabbath-school-video-clips";

const SS2 = {
  card: "#FFFFFF",
  ink: "#1F1A12",
  inkMuted: HV2.inkMutedText,
  coral: "#E8604C",
  border: "rgba(31,26,18,0.08)",
};

function proxiedLessonMediaUrl(sourceUrl: string): string {
  return sabbathSchoolMediaUrl(sourceUrl, {
    platform: Platform.OS,
    baseUrl: getApiUrl(),
  });
}

function LessonVideoThumb({
  thumbnail,
  artist,
}: {
  thumbnail?: string;
  artist: string;
}) {
  const [failed, setFailed] = useState(false);
  const uri = thumbnail ? proxiedLessonMediaUrl(thumbnail) : "";
  useEffect(() => {
    setFailed(false);
  }, [uri]);
  const showPlaceholder = !uri || failed;

  if (showPlaceholder) {
    return (
      <View style={[s.videoThumb, s.videoThumbPlaceholder]}>
        <Text style={s.videoThumbArtist} numberOfLines={2}>
          {artist || "Lesson video"}
        </Text>
      </View>
    );
  }

  return (
    <Image
      source={{ uri }}
      style={s.videoThumb}
      resizeMode="cover"
      onError={() => setFailed(true)}
    />
  );
}

function SabbathSchoolInlineVideo({
  uri,
  style,
  onReady,
  onError,
}: {
  uri: string;
  style: object;
  onReady: () => void;
  onError: () => void;
}) {
  const player = useVideoPlayer(uri, (p) => {
    p.play();
  });
  const onReadyRef = React.useRef(onReady);
  const onErrorRef = React.useRef(onError);
  onReadyRef.current = onReady;
  onErrorRef.current = onError;

  useEffect(() => {
    const sub = player.addListener("statusChange", ({ status, error }) => {
      if (status === "readyToPlay") onReadyRef.current();
      if (status === "error" || error) onErrorRef.current();
    });
    return () => sub.remove();
  }, [player]);

  return (
    <VideoView
      player={player}
      style={style}
      contentFit="contain"
      nativeControls
    />
  );
}

export default function LessonVideoPlayer({
  clips,
  autoPlayFirst = false,
  showChooser = true,
}: {
  clips: SabbathSchoolVideoClip[];
  autoPlayFirst?: boolean;
  showChooser?: boolean;
}) {
  const [activeVideo, setActiveVideo] = useState<{
    src: string;
    title: string;
    artist: string;
  } | null>(null);
  const [videoError, setVideoError] = useState(false);
  const [videoReady, setVideoReady] = useState(false);

  const closePlayer = useCallback(() => {
    setActiveVideo(null);
    setVideoError(false);
    setVideoReady(false);
  }, []);

  const startClip = useCallback((clip: SabbathSchoolVideoClip) => {
    if (!canInlinePlaySabbathSchoolVideo(clip.src)) {
      Linking.openURL(clip.src).catch(() => {});
      return;
    }
    setVideoError(false);
    setVideoReady(false);
    setActiveVideo({
      src: clip.src,
      title: clip.title || "Lesson Clip",
      artist: clip.artist,
    });
  }, []);

  const autoPlayedKey = useRef("");
  useEffect(() => {
    if (!autoPlayFirst || clips.length === 0) return;
    const key = clips.map((clip) => clip.src).join("|");
    if (autoPlayedKey.current === key) return;
    const first = firstPlayableSabbathSchoolClip(clips);
    if (!first) return;
    autoPlayedKey.current = key;
    startClip(first);
  }, [autoPlayFirst, clips, startClip]);

  useEffect(() => {
    if (!activeVideo || videoError || videoReady) return;
    const timer = setTimeout(() => setVideoError(true), 20000);
    return () => clearTimeout(timer);
  }, [activeVideo, videoError, videoReady]);

  const activePlaybackUrl = activeVideo
    ? proxiedLessonMediaUrl(activeVideo.src)
    : "";

  if (clips.length === 0) return null;

  const chooser = showChooser && clips.length > 0;

  return (
    <View style={s.videoLayerStack}>
      {chooser && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.videoRow}
        >
          {clips.map((clip, index) => {
            const isActive = activeVideo?.src === clip.src;
            return (
              <Pressable
                key={`${clip.src}-${index}`}
                onPress={() => {
                  if (isActive) {
                    closePlayer();
                    return;
                  }
                  startClip(clip);
                }}
                style={({ pressed }) => [s.videoCard, { opacity: pressed ? 0.85 : 1 }]}
              >
                <LessonVideoThumb thumbnail={clip.thumbnail} artist={clip.artist} />
                <View style={s.videoCardMeta}>
                  <Text style={s.videoTitle} numberOfLines={2}>
                    {clip.title || "Lesson Clip"}
                  </Text>
                  <Text style={s.videoArtist} numberOfLines={1}>
                    {clip.artist}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </ScrollView>
      )}
      {activeVideo && (
        <View style={s.inlinePlayerCard}>
          {videoError ? (
            <View style={s.inlineVideoError}>
              <Ionicons name="videocam-off-outline" size={28} color="#FFFFFF" />
              <Text style={s.inlineVideoErrorText}>
                This lesson video could not start in the app.
              </Text>
              <Pressable
                onPress={() => Linking.openURL(activePlaybackUrl).catch(() => {})}
                style={s.inlineVideoErrorButton}
              >
                <Text style={s.inlineVideoErrorButtonText}>Open in browser</Text>
              </Pressable>
            </View>
          ) : Platform.OS === "web" ? (
            React.createElement("video", {
              key: activeVideo.src,
              src: activePlaybackUrl,
              controls: true,
              autoPlay: true,
              playsInline: true,
              style: {
                width: "100%",
                aspectRatio: "16 / 9",
                backgroundColor: "#000000",
                display: "block",
              },
              onError: () => setVideoError(true),
              onLoadedMetadata: () => setVideoReady(true),
              onCanPlay: () => setVideoReady(true),
            })
          ) : (
            <SabbathSchoolInlineVideo
              key={activeVideo.src}
              uri={activePlaybackUrl}
              style={s.inlineVideo}
              onReady={() => setVideoReady(true)}
              onError={() => setVideoError(true)}
            />
          )}
          {!videoReady && !videoError && (
            <View pointerEvents="none" style={s.inlineVideoLoading}>
              <ActivityIndicator size="large" color="#FFFFFF" />
            </View>
          )}
          <View style={s.inlinePlayerMeta}>
            <View style={{ flex: 1 }}>
              <Text style={s.videoModalTitle} numberOfLines={2}>
                {activeVideo.title}
              </Text>
              <Text style={s.videoModalArtist} numberOfLines={1}>
                {activeVideo.artist}
              </Text>
            </View>
            <Pressable
              onPress={closePlayer}
              style={({ pressed }) => ({ padding: 2, opacity: pressed ? 0.7 : 1 })}
            >
              <Ionicons name="close-circle" size={24} color={SS2.inkMuted} />
            </Pressable>
          </View>
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  videoLayerStack: { position: "relative" },
  videoRow: { gap: 10, paddingRight: 8 },
  videoCard: {
    width: 200,
    backgroundColor: SS2.card,
    borderRadius: 12,
    overflow: "hidden",
    ...HV2.rowShadow,
  },
  videoThumb: { width: 200, aspectRatio: 16 / 9 },
  videoThumbPlaceholder: {
    backgroundColor: "#2F4A47",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
  },
  videoThumbArtist: {
    color: "rgba(255,255,255,0.92)",
    fontFamily: F.interSemi,
    fontSize: 13,
    textAlign: "center",
  },
  videoCardMeta: { paddingHorizontal: 10, paddingVertical: 8, gap: 2 },
  videoTitle: { fontFamily: F.interMed, fontSize: 12, color: SS2.ink, lineHeight: 17 },
  videoArtist: { fontFamily: F.inter, fontSize: 11, color: SS2.inkMuted },
  inlinePlayerCard: {
    marginTop: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: SS2.border,
    overflow: "hidden",
    backgroundColor: SS2.card,
  },
  inlineVideo: { width: "100%", aspectRatio: 16 / 9, backgroundColor: "#000" },
  inlineVideoError: {
    width: "100%",
    aspectRatio: 16 / 9,
    backgroundColor: "#171717",
    alignItems: "center",
    justifyContent: "center",
    gap: 9,
    paddingHorizontal: 24,
  },
  inlineVideoLoading: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.32)",
  },
  inlineVideoErrorText: {
    color: "#FFFFFF",
    fontFamily: F.interMed,
    fontSize: 13,
    lineHeight: 19,
    textAlign: "center",
  },
  inlineVideoErrorButton: {
    backgroundColor: SS2.coral,
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 9,
  },
  inlineVideoErrorButtonText: {
    color: "#FFFFFF",
    fontFamily: F.interSemi,
    fontSize: 13,
  },
  inlinePlayerMeta: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 10,
  },
  videoModalTitle: { fontFamily: F.loraSemi, fontSize: 15, color: SS2.ink, lineHeight: 21 },
  videoModalArtist: { fontFamily: F.interMed, fontSize: 12, color: SS2.inkMuted },
});
