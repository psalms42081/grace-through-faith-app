import React, { useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Platform,
  Image,
  Dimensions,
} from "react-native";
import { router, Stack } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/hooks/useTheme";
import { SDA_SPEAKERS, SERMON_TOPICS, getSpeakersByTopic, getSpeakerImage, type SDASpeaker, type SermonTopic } from "@/constants/sda-speakers";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const CARD_WIDTH = SCREEN_WIDTH * 0.42;
const CARD_HEIGHT = CARD_WIDTH * 1.2;

function SpeakerCard({ speaker, theme, onPress }: { speaker: SDASpeaker; theme: any; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        st.speakerCard,
        { backgroundColor: theme.backgroundCard, opacity: pressed ? 0.85 : 1 },
      ]}
    >
      {getSpeakerImage(speaker.id) ? (
        <Image
          source={getSpeakerImage(speaker.id)}
          style={[st.speakerAvatar, { backgroundColor: speaker.color + "20" }]}
        />
      ) : (
        <View style={[st.speakerAvatar, { backgroundColor: speaker.color + "20" }]}>
          <Text style={[st.speakerInitials, { color: speaker.color, fontFamily: "Inter_700Bold" }]}>
            {speaker.name.split(" ").map(w => w[0]).join("").slice(0, 2)}
          </Text>
        </View>
      )}
      <View style={st.speakerInfo}>
        <Text style={[st.speakerName, { color: theme.text, fontFamily: "Inter_600SemiBold" }]} numberOfLines={1}>
          {speaker.name}
        </Text>
        <Text style={[st.speakerMinistry, { color: theme.accent, fontFamily: "Inter_500Medium" }]} numberOfLines={1}>
          {speaker.ministry}
        </Text>
        <View style={st.topicRow}>
          {speaker.topics.slice(0, 2).map((topic) => (
            <View key={topic} style={[st.topicChip, { backgroundColor: speaker.color + "15" }]}>
              <Text style={[st.topicChipText, { color: speaker.color, fontFamily: "Inter_500Medium" }]}>
                {topic}
              </Text>
            </View>
          ))}
        </View>
      </View>
    </Pressable>
  );
}

export default function SpeakersScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const [selectedTopic, setSelectedTopic] = useState<SermonTopic>("All");

  const filteredSpeakers = useMemo(
    () => getSpeakersByTopic(selectedTopic),
    [selectedTopic]
  );

  const handleSpeakerPress = useCallback((speaker: SDASpeaker) => {
    router.push({
      pathname: "/speaker/[id]" as any,
      params: { id: speaker.id },
    });
  }, []);

  return (
    <View style={[st.container, { backgroundColor: theme.background }]}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={[st.header, { paddingTop: topPad + 12 }]}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={st.backBtn}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </Pressable>
        <View style={st.headerCenter}>
          <Text style={[st.headerTitle, { color: theme.text, fontFamily: "Lora_700Bold" }]}>
            Speakers
          </Text>
          <Text style={[st.headerSubtitle, { color: theme.textSecondary, fontFamily: "Inter_400Regular" }]}>
            SDA Bible teachers and evangelists
          </Text>
        </View>
        <View style={{ width: 24 }} />
      </View>

      <View style={st.filterContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={st.filterScroll}
        >
          {SERMON_TOPICS.map((topic) => {
            const active = selectedTopic === topic;
            return (
              <Pressable
                key={topic}
                onPress={() => setSelectedTopic(topic)}
                style={[
                  st.filterChip,
                  {
                    backgroundColor: active ? theme.accent : theme.backgroundCard,
                    borderColor: active ? theme.accent : theme.border,
                  },
                ]}
              >
                <Text
                  style={[
                    st.filterChipText,
                    {
                      color: active ? "#fff" : theme.textSecondary,
                      fontFamily: active ? "Inter_600SemiBold" : "Inter_500Medium",
                    },
                  ]}
                >
                  {topic}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      <ScrollView
        style={st.scrollView}
        contentContainerStyle={[st.content, { paddingBottom: bottomPad + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={st.speakerGrid}>
          {filteredSpeakers.map((speaker) => (
            <SpeakerCard
              key={speaker.id}
              speaker={speaker}
              theme={theme}
              onPress={() => handleSpeakerPress(speaker)}
            />
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const st = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    gap: 4,
    flexDirection: "row",
    alignItems: "flex-start",
  },
  backBtn: {
    marginTop: 4,
  },
  headerCenter: {
    flex: 1,
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 24,
  },
  headerSubtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  filterContainer: {
    paddingBottom: 12,
  },
  filterScroll: {
    paddingHorizontal: 20,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  filterChipText: {
    fontSize: 13,
  },
  scrollView: { flex: 1 },
  content: {
    paddingHorizontal: 20,
  },
  speakerGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 14,
  },
  speakerCard: {
    width: (SCREEN_WIDTH - 54) / 2,
    borderRadius: 16,
    padding: 16,
    gap: 12,
  },
  speakerAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  speakerInitials: {
    fontSize: 20,
  },
  speakerInfo: {
    gap: 3,
  },
  speakerName: {
    fontSize: 15,
  },
  speakerMinistry: {
    fontSize: 12,
  },
  topicRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 4,
    marginTop: 6,
  },
  topicChip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  topicChipText: {
    fontSize: 10,
  },
});
