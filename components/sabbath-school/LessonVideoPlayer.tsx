import React, { useCallback, useEffect, useState } from "react";
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
import { useVideoSurfaceActive } from "@/lib/video-surface";
import { openYouTubeVideo } from "@/lib/open-youtube-video";
import {
  canInlinePlaySabbathSchoolVideo,
  showOtherTrackVideosLabel,
  youtubeIdFromUrl,
  type RelatedLessonVideoGroup,
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
  style,
}: {
  thumbnail?: string;
  artist: string;
  style?: object;
}) {
  const [failed, setFailed] = useState(false);
  const uri = thumbnail ? proxiedLessonMediaUrl(thumbnail) : "";
  useEffect(() => {
    setFailed(false);
  }, [uri]);
  const showPlaceholder = !uri || failed;

  if (showPlaceholder) {
    return (
      <View style={[s.videoThumb, s.videoThumbPlaceholder, style]}>
        <Text style={s.videoThumbArtist} numberOfLines={2}>
          {artist || "Lesson video"}
        </Text>
      </View>
    );
  }

  return (
    <Image
      source={{ uri }}
      style={[s.videoThumb, style]}
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
  playWhenReady = false,
  fullscreenLock,
}: {
  uri: string;
  style: object;
  onReady: () => void;
  onError: () => void;
  playWhenReady?: boolean;
  fullscreenLock?: React.RefObject<boolean | null>;
}) {
  // Paused until the user taps play. playWhenReady is set only from that tap.
  const player = useVideoPlayer(uri);
  const onReadyRef = React.useRef(onReady);
  const onErrorRef = React.useRef(onError);
  const playWhenReadyRef = React.useRef(playWhenReady);
  onReadyRef.current = onReady;
  onErrorRef.current = onError;
  playWhenReadyRef.current = playWhenReady;

  useEffect(() => {
    const sub = player.addListener("statusChange", ({ status, error }) => {
      if (status === "readyToPlay") {
        onReadyRef.current();
        if (playWhenReadyRef.current) player.play();
      }
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
      fullscreenOptions={{ enable: true, orientation: "landscape" }}
      onFullscreenEnter={() => {
        if (fullscreenLock) fullscreenLock.current = true;
      }}
      onFullscreenExit={() => {
        if (fullscreenLock) fullscreenLock.current = false;
      }}
    />
  );
}

export default function LessonVideoPlayer({
  clips,
  showChooser = true,
  layout = "row",
  more = [],
  earlier = { heading: "", clips: [] },
  revealKey = 0,
}: {
  clips: SabbathSchoolVideoClip[];
  showChooser?: boolean;
  layout?: "row" | "page";
  /** Other tracks' videos for the same lesson. Page layout only. */
  more?: readonly RelatedLessonVideoGroup[];
  /** This quarter's earlier lesson episodes. Page layout only. */
  earlier?: { heading: string; clips: readonly SabbathSchoolVideoClip[] };
  /** Changes when the watch screen opens again, which collapses the other track. */
  revealKey?: string | number;
}) {
  const [activeVideo, setActiveVideo] = useState<{
    src: string;
    title: string;
    artist: string;
  } | null>(null);
  const [videoError, setVideoError] = useState(false);
  const [videoReady, setVideoReady] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [playRequested, setPlayRequested] = useState(false);
  const [relatedPick, setRelatedPick] = useState<SabbathSchoolVideoClip | null>(null);
  const [otherTracksOpen, setOtherTracksOpen] = useState<ReadonlySet<string>>(new Set());
  const fullscreenLock = React.useRef(false);
  useEffect(() => {
    setOtherTracksOpen(new Set());
  }, [revealKey]);
  const primaryKey = clips.map((clip) => clip.src).join("\n");
  useEffect(() => {
    setRelatedPick(null);
  }, [primaryKey]);

  const closePlayer = useCallback(() => {
    setActiveVideo(null);
    setVideoError(false);
    setVideoReady(false);
  }, []);

  const startClip = useCallback((clip: SabbathSchoolVideoClip) => {
    const youtubeId = clip.youtubeId || youtubeIdFromUrl(clip.src);
    if (youtubeId) {
      void openYouTubeVideo(youtubeId, {
        title: clip.title,
        speaker: clip.artist,
      });
      return;
    }
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

  const surfaceActive = useVideoSurfaceActive(fullscreenLock);
  useEffect(() => {
    if (!surfaceActive) {
      setPlayRequested(false);
      closePlayer();
    }
  }, [surfaceActive, closePlayer]);

  useEffect(() => {
    if (!activeVideo || videoError || videoReady) return;
    const timer = setTimeout(() => setVideoError(true), 20000);
    return () => clearTimeout(timer);
  }, [activeVideo, videoError, videoReady]);

  const activePlaybackUrl = activeVideo
    ? proxiedLessonMediaUrl(activeVideo.src)
    : "";

  if (clips.length === 0 && more.length === 0 && earlier.clips.length === 0) return null;

  if (layout === "page") {
    const selectedAt = clips.length > 0 ? Math.min(selectedIndex, clips.length - 1) : 0;
    const selected = relatedPick ?? (clips.length > 0 ? clips[selectedAt] : null);
    const primaryRows = clips.filter((clip) => clip.src !== selected?.src);
    const moreRows = more
      .map((group) => ({
        label: group.label,
        clips: group.clips.filter((clip) => clip.src !== selected?.src),
      }))
      .filter((group) => group.clips.length > 0);
    const playingThis = !!selected && activeVideo?.src === selected.src;
    const earlierRows = earlier.heading
      ? earlier.clips.filter((clip) => clip.src !== selected?.src)
      : [];
    return (
      <View style={s.pageStack}>
        {selected ? (
        <View
          style={s.featureCard}
          accessibilityState={{ selected: true }}
          testID="lesson-video-feature"
        >
          {playingThis ? (
            <View style={s.featureMedia}>
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
                  key: selected.src,
                  src: activePlaybackUrl,
                  controls: true,
                  autoPlay: false,
                  playsInline: true,
                  style: {
                    width: "100%",
                    aspectRatio: "16 / 9",
                    backgroundColor: "#000000",
                    display: "block",
                  },
                  onError: () => setVideoError(true),
                  onLoadedMetadata: () => setVideoReady(true),
                  onCanPlay: (event: { currentTarget?: { play?: () => Promise<void> } }) => {
                    setVideoReady(true);
                    if (playRequested) void event.currentTarget?.play?.();
                  },
                })
              ) : (
                <SabbathSchoolInlineVideo
                  key={selected.src}
                  uri={activePlaybackUrl}
                  style={s.inlineVideo}
                  playWhenReady={playRequested}
                  fullscreenLock={fullscreenLock}
                  onReady={() => setVideoReady(true)}
                  onError={() => setVideoError(true)}
                />
              )}
              {!videoReady && !videoError && (
                <View pointerEvents="none" style={s.inlineVideoLoading}>
                  <ActivityIndicator size="large" color="#FFFFFF" />
                </View>
              )}
            </View>
          ) : (
            <Pressable
              onPress={() => {
                setPlayRequested(true);
                startClip(selected);
              }}
              style={s.featureMedia}
              accessibilityRole="button"
              accessibilityLabel={`Play ${selected.title || "video"}`}
              testID="lesson-video-play"
            >
              <LessonVideoThumb
                thumbnail={selected.thumbnail}
                artist={selected.artist}
                style={s.featureThumb}
              />
              <View pointerEvents="none" style={s.featurePlay}>
                <Ionicons name="play-circle" size={64} color="#FFFFFF" />
              </View>
            </Pressable>
          )}
          <View style={s.featureMeta}>
            <Text style={s.selectedMark}>Selected</Text>
            <Text style={s.featureTitle}>{selected.title || "Lesson Clip"}</Text>
            <Text style={s.featureSource}>{selected.artist}</Text>
          </View>
        </View>
        ) : null}
        {earlierRows.length > 0 ? (
          <View style={s.listBlock} testID="lesson-video-earlier">
            <Text style={s.listHeading}>{earlier.heading}</Text>
            {earlierRows.map((clip) => (
              <Pressable
                key={clip.src}
                onPress={() => {
                  setPlayRequested(false);
                  closePlayer();
                  setRelatedPick(clip);
                }}
                style={({ pressed }) => [s.listRow, { opacity: pressed ? 0.85 : 1 }]}
                accessibilityRole="button"
                accessibilityLabel={clip.title || "Lesson episode"}
                testID="lesson-video-earlier-row"
              >
                <LessonVideoThumb
                  thumbnail={clip.thumbnail}
                  artist={clip.artist}
                  style={s.listThumb}
                />
                <View style={s.listCopy}>
                  <Text style={s.listTitle}>{clip.title || "Lesson episode"}</Text>
                  <Text style={s.listSource}>{clip.artist}</Text>
                </View>
              </Pressable>
            ))}
          </View>
        ) : null}
        {primaryRows.length > 0 ? (
          <View style={s.listBlock}>
            <Text style={s.listHeading}>This week's videos</Text>
            {primaryRows.map((clip) => {
              const index = clips.findIndex((item) => item.src === clip.src);
              return (
                <Pressable
                  key={`${clip.src}-${index}`}
                  onPress={() => {
                    setPlayRequested(false);
                    closePlayer();
                    setRelatedPick(null);
                    if (index >= 0) setSelectedIndex(index);
                  }}
                  style={({ pressed }) => [s.listRow, { opacity: pressed ? 0.85 : 1 }]}
                  accessibilityRole="button"
                  accessibilityLabel={`${clip.title || "Lesson Clip"}, ${clip.artist}`}
                >
                  <LessonVideoThumb
                    thumbnail={clip.thumbnail}
                    artist={clip.artist}
                    style={s.listThumb}
                  />
                  <View style={s.listCopy}>
                    <Text style={s.listTitle}>{clip.title || "Lesson Clip"}</Text>
                    <Text style={s.listSource}>{clip.artist}</Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
        ) : null}
        {moreRows.map((group) => {
          const open = otherTracksOpen.has(group.label);
          const toggleLabel = showOtherTrackVideosLabel(group.label);
          return (
            <View key={group.label} style={s.listBlock} testID="lesson-video-more">
              <Pressable
                onPress={() => {
                  setOtherTracksOpen((current) => {
                    const next = new Set(current);
                    if (next.has(group.label)) next.delete(group.label);
                    else next.add(group.label);
                    return next;
                  });
                }}
                style={({ pressed }) => [s.otherToggle, { opacity: pressed ? 0.85 : 1 }]}
                accessibilityRole="button"
                accessibilityState={{ expanded: open }}
                accessibilityLabel={toggleLabel}
                testID="lesson-video-other-toggle"
              >
                <Text style={s.otherToggleLabel}>{toggleLabel}</Text>
                <Ionicons
                  name={open ? "chevron-up" : "chevron-down"}
                  size={18}
                  color={SS2.inkMuted}
                />
              </Pressable>
              {open
                ? group.clips.map((clip) => (
                    <Pressable
                      key={`${group.label}-${clip.src}`}
                      onPress={() => {
                        setPlayRequested(false);
                        closePlayer();
                        setRelatedPick(clip);
                      }}
                      style={({ pressed }) => [s.listRow, { opacity: pressed ? 0.85 : 1 }]}
                      accessibilityRole="button"
                      accessibilityLabel={`${clip.title || "Lesson Clip"}, ${clip.artist}, ${group.label}`}
                      testID="lesson-video-more-row"
                    >
                      <LessonVideoThumb
                        thumbnail={clip.thumbnail}
                        artist={clip.artist}
                        style={s.listThumb}
                      />
                      <View style={s.listCopy}>
                        <Text style={s.listTitle}>{clip.title || "Lesson Clip"}</Text>
                        <Text style={s.listSource}>{clip.artist}</Text>
                      </View>
                    </Pressable>
                  ))
                : null}
            </View>
          );
        })}
      </View>
    );
  }

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
              autoPlay: false,
              playsInline: true,
              style: {
                width: "100%",
                aspectRatio: "16 / 9",
                backgroundColor: "#000000",
                display: "block",
              },
              onError: () => setVideoError(true),
              onLoadedMetadata: () => setVideoReady(true),
              onCanPlay: (event: { currentTarget?: { play?: () => Promise<void> } }) => {
                setVideoReady(true);
                if (playRequested) void event.currentTarget?.play?.();
              },
            })
          ) : (
            <SabbathSchoolInlineVideo
              key={activeVideo.src}
              uri={activePlaybackUrl}
              style={s.inlineVideo}
              playWhenReady={playRequested}
              fullscreenLock={fullscreenLock}
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
  pageStack: { gap: 18 },
  featureCard: {
    backgroundColor: SS2.card,
    borderRadius: 16,
    overflow: "hidden",
    ...HV2.rowShadow,
  },
  featureMedia: { position: "relative", width: "100%" },
  featureThumb: { width: "100%", aspectRatio: 16 / 9 },
  featurePlay: {
    ...StyleSheet.absoluteFill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.28)",
  },
  featureMeta: { paddingHorizontal: 14, paddingVertical: 12, gap: 4 },
  selectedMark: {
    fontFamily: F.interSemi,
    fontSize: 12,
    color: SS2.coral,
  },
  featureTitle: {
    fontFamily: F.loraSemi,
    fontSize: 18,
    lineHeight: 24,
    color: SS2.ink,
  },
  featureSource: {
    fontFamily: F.inter,
    fontSize: 14,
    lineHeight: 20,
    color: SS2.inkMuted,
  },
  listBlock: { gap: 8 },
  listHeading: {
    fontFamily: F.interSemi,
    fontSize: 16,
    lineHeight: 22,
    color: SS2.ink,
  },
  otherToggle: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    backgroundColor: SS2.card,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    ...HV2.rowShadow,
  },
  otherToggleLabel: {
    flex: 1,
    fontFamily: F.interSemi,
    fontSize: 15,
    lineHeight: 21,
    color: SS2.ink,
  },
  listRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    backgroundColor: SS2.card,
    borderRadius: 12,
    padding: 10,
    ...HV2.rowShadow,
  },
  listThumb: { width: 120, aspectRatio: 16 / 9, borderRadius: 8 },
  listCopy: { flex: 1, minWidth: 0, gap: 4, paddingTop: 2 },
  listTitle: {
    fontFamily: F.interMed,
    fontSize: 15,
    lineHeight: 21,
    color: SS2.ink,
  },
  listSource: {
    fontFamily: F.inter,
    fontSize: 13,
    lineHeight: 18,
    color: SS2.inkMuted,
  },
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
    ...StyleSheet.absoluteFill,
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
