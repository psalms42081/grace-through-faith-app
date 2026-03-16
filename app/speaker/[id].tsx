import React, { useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Platform,
  Linking,
  Image,
} from "react-native";
import { router, useLocalSearchParams, Stack } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/hooks/useTheme";
import { getSpeakerById, getSpeakerImage, type SDASpeaker } from "@/constants/sda-speakers";

function VideoCard({ videoId, title, theme, onPress }: { videoId: string; title: string; theme: any; onPress: () => void }) {
  const thumbnailUrl = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [st.videoCard, { backgroundColor: theme.backgroundCard, opacity: pressed ? 0.85 : 1 }]}
    >
      <View style={st.videoThumbWrap}>
        <Image source={{ uri: thumbnailUrl }} style={st.videoThumb} resizeMode="cover" />
        <View style={st.playOverlay}>
          <Ionicons name="play-circle" size={52} color="rgba(255,255,255,0.95)" />
        </View>
      </View>
      <Text style={[st.videoTitle, { color: theme.text, fontFamily: "Inter_500Medium" }]} numberOfLines={2}>
        {title}
      </Text>
    </Pressable>
  );
}

export default function SpeakerDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const speaker = getSpeakerById(id || "");

  const handleWatchChannel = useCallback(() => {
    if (!speaker) return;
    const query = encodeURIComponent(`${speaker.name} ${speaker.ministry} sermon`);
    Linking.openURL(`https://www.youtube.com/results?search_query=${query}`);
  }, [speaker]);

  const handleWatchVideo = useCallback((videoId: string, videoTitle?: string) => {
    router.push({
      pathname: "/sermon-player",
      params: {
        videoId,
        title: videoTitle || "",
        speaker: speaker?.name || "",
      },
    });
  }, [speaker]);


  if (!speaker) {
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
            Speaker not found
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[st.container, { backgroundColor: theme.background }]}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={[st.header, { paddingTop: topPad + 12 }]}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </Pressable>
        <View style={st.headerCenter}>
          <Text style={[st.headerTitle, { color: theme.text, fontFamily: "Lora_700Bold" }]} numberOfLines={1}>
            {speaker.name}
          </Text>
        </View>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        style={st.scrollView}
        contentContainerStyle={[st.content, { paddingBottom: bottomPad + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={[st.profileSection, { backgroundColor: theme.backgroundCard }]}>
          {getSpeakerImage(speaker.id) ? (
            <Image
              source={getSpeakerImage(speaker.id)}
              style={[st.avatar, { backgroundColor: speaker.color + "20" }]}
            />
          ) : (
            <View style={[st.avatar, { backgroundColor: speaker.color + "20" }]}>
              <Text style={[st.avatarInitials, { color: speaker.color, fontFamily: "Inter_700Bold" }]}>
                {speaker.name.split(" ").map(w => w[0]).join("").slice(0, 2)}
              </Text>
            </View>
          )}
          <Text style={[st.speakerName, { color: theme.text, fontFamily: "Lora_700Bold" }]}>
            {speaker.name}
          </Text>
          <Text style={[st.ministryLabel, { color: theme.accent, fontFamily: "Inter_600SemiBold" }]}>
            {speaker.ministry}
          </Text>
          <Text style={[st.bio, { color: theme.textSecondary, fontFamily: "Inter_400Regular" }]}>
            {speaker.bio}
          </Text>
          <View style={st.topicRow}>
            {speaker.topics.map((topic) => (
              <View key={topic} style={[st.topicChip, { backgroundColor: speaker.color + "15" }]}>
                <Text style={[st.topicChipText, { color: speaker.color, fontFamily: "Inter_500Medium" }]}>
                  {topic}
                </Text>
              </View>
            ))}
          </View>
        </View>

        <Pressable
          onPress={handleWatchChannel}
          style={({ pressed }) => [
            st.watchChannelBtn,
            { backgroundColor: theme.accent, opacity: pressed ? 0.85 : 1 },
          ]}
        >
          <Ionicons name="play-circle" size={22} color="#fff" />
          <Text style={[st.watchChannelText, { fontFamily: "Inter_600SemiBold" }]}>
            Browse Sermons
          </Text>
        </Pressable>

        {speaker.featuredVideos.length > 0 && (
          <View style={st.section}>
            <Text style={[st.sectionTitle, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}>
              Featured Sermons
            </Text>
            {speaker.featuredVideos.map((video) => (
              <VideoCard
                key={video.id}
                videoId={video.id}
                title={video.title}
                theme={theme}
                onPress={() => handleWatchVideo(video.id, video.title)}
              />
            ))}
          </View>
        )}

        <View style={st.section}>
          <Text style={[st.sectionTitle, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}>
            About {speaker.ministry}
          </Text>
          <Text style={[st.aboutText, { color: theme.textSecondary, fontFamily: "Inter_400Regular" }]}>
            Watch sermons, Bible studies, and teaching content from {speaker.name} through {speaker.ministry}. Tap any video to open it in YouTube.
          </Text>
        </View>
      </ScrollView>

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
    fontSize: 20,
  },
  scrollView: { flex: 1 },
  content: {
    paddingHorizontal: 20,
    gap: 20,
  },
  profileSection: {
    borderRadius: 20,
    padding: 24,
    alignItems: "center",
    gap: 10,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInitials: {
    fontSize: 28,
  },
  speakerName: {
    fontSize: 24,
    textAlign: "center",
  },
  ministryLabel: {
    fontSize: 14,
  },
  bio: {
    fontSize: 14,
    lineHeight: 22,
    textAlign: "center",
    marginTop: 4,
  },
  topicRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 8,
    justifyContent: "center",
  },
  topicChip: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 12,
  },
  topicChipText: {
    fontSize: 12,
  },
  watchChannelBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    borderRadius: 14,
    paddingVertical: 16,
  },
  watchChannelText: {
    color: "#fff",
    fontSize: 16,
  },
  section: {
    gap: 12,
  },
  sectionTitle: {
    fontSize: 18,
  },
  aboutText: {
    fontSize: 14,
    lineHeight: 22,
  },
  videoCard: {
    borderRadius: 14,
    overflow: "hidden",
  },
  videoThumbWrap: {
    position: "relative" as const,
  },
  videoThumb: {
    height: 200,
    width: "100%" as any,
    backgroundColor: "#1a1a1a",
  },
  playOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    backgroundColor: "rgba(0,0,0,0.25)",
  },
  videoTitle: {
    fontSize: 14,
    padding: 14,
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
