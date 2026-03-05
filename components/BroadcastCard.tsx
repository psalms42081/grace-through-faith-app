import React from "react";
import { View, Text, StyleSheet, Pressable, Linking } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";

export interface BroadcastSource {
  id: string;
  name: string;
  nameKey: string;
  descKey: string;
  watchUrl: string;
  websiteUrl: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
}

export const broadcastSources: BroadcastSource[] = [
  {
    id: "3abn",
    name: "3ABN",
    nameKey: "broadcasts.3abnName",
    descKey: "broadcasts.3abnDesc",
    watchUrl: "https://3abnplus.tv/categories/category-8xMkCnggSZc",
    websiteUrl: "https://3abnplus.tv",
    icon: "tv",
    color: "#5B86E5",
  },
  {
    id: "amazing-facts",
    name: "Amazing Facts",
    nameKey: "broadcasts.amazingFactsName",
    descKey: "broadcasts.amazingFactsDesc",
    watchUrl: "https://www.amazingfacts.org/watch/aftv/",
    websiteUrl: "https://www.amazingfacts.org",
    icon: "play-circle",
    color: "#C9933A",
  },
  {
    id: "it-is-written",
    name: "It Is Written",
    nameKey: "broadcasts.itIsWrittenName",
    descKey: "broadcasts.itIsWrittenDesc",
    watchUrl: "https://www.itiswritten.com/tv",
    websiteUrl: "https://www.itiswritten.com",
    icon: "book",
    color: "#2E7D32",
  },
  {
    id: "hope-channel",
    name: "Hope Channel",
    nameKey: "broadcasts.hopeChannelName",
    descKey: "broadcasts.hopeChannelDesc",
    watchUrl: "https://www.hopetv.org/watch/",
    websiteUrl: "https://www.hopetv.org",
    icon: "globe",
    color: "#0077C2",
  },
  {
    id: "breath-of-life",
    name: "Breath of Life",
    nameKey: "broadcasts.breathOfLifeName",
    descKey: "broadcasts.breathOfLifeDesc",
    watchUrl: "https://www.breathoflife.tv/watch",
    websiteUrl: "https://www.breathoflife.tv",
    icon: "mic",
    color: "#8B5CF6",
  },
  {
    id: "secrets-unsealed",
    name: "Secrets Unsealed",
    nameKey: "broadcasts.secretsUnsealedName",
    descKey: "broadcasts.secretsUnsealedDesc",
    watchUrl: "https://www.secretsunsealed.org/media/",
    websiteUrl: "https://www.secretsunsealed.org",
    icon: "key",
    color: "#D32F2F",
  },
  {
    id: "audioverse",
    name: "AudioVerse",
    nameKey: "broadcasts.audioVerseName",
    descKey: "broadcasts.audioVerseDesc",
    watchUrl: "https://www.audioverse.org/english/sermons/recordings.html",
    websiteUrl: "https://www.audioverse.org",
    icon: "headset",
    color: "#E65100",
  },
  {
    id: "amazing-discoveries",
    name: "Amazing Discoveries",
    nameKey: "broadcasts.amazingDiscoveriesName",
    descKey: "broadcasts.amazingDiscoveriesDesc",
    watchUrl: "https://amazingdiscoveries.tv/",
    websiteUrl: "https://amazingdiscoveries.org",
    icon: "search",
    color: "#00796B",
  },
];

interface Props {
  source: BroadcastSource;
  theme: any;
  onWatch: (source: BroadcastSource) => void;
}

export default function BroadcastCard({ source, theme, onWatch }: Props) {
  const { t } = useTranslation();

  return (
    <View style={[st.card, { backgroundColor: theme.backgroundCard, borderColor: theme.border }]}>
      <View style={st.cardHeader}>
        <View style={[st.cardIcon, { backgroundColor: source.color + "15" }]}>
          <Ionicons name={source.icon} size={28} color={source.color} />
        </View>
        <Text style={[st.cardName, { color: theme.text, fontFamily: "Lora_700Bold" }]}>
          {t(source.nameKey)}
        </Text>
      </View>

      <Text style={[st.cardDesc, { color: theme.textSecondary, fontFamily: "Inter_400Regular" }]}>
        {t(source.descKey)}
      </Text>

      <View style={st.cardActions}>
        <Pressable
          onPress={() => onWatch(source)}
          style={({ pressed }) => [
            st.watchBtn,
            { backgroundColor: theme.accent, opacity: pressed ? 0.85 : 1 },
          ]}
        >
          <Ionicons name="play" size={18} color="#fff" />
          <Text style={[st.watchBtnText, { fontFamily: "Inter_600SemiBold" }]}>
            {t("broadcasts.watchLive")}
          </Text>
        </Pressable>

        <Pressable
          onPress={() => Linking.openURL(source.websiteUrl)}
          style={({ pressed }) => [
            st.websiteBtn,
            { backgroundColor: theme.accent + "12", opacity: pressed ? 0.7 : 1 },
          ]}
        >
          <Ionicons name="open-outline" size={16} color={theme.accent} />
          <Text style={[st.websiteBtnText, { color: theme.accent, fontFamily: "Inter_500Medium" }]}>
            {t("broadcasts.openWebsite")}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  card: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 22,
    gap: 14,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  cardIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  cardName: {
    fontSize: 19,
    flex: 1,
  },
  cardDesc: {
    fontSize: 14,
    lineHeight: 21,
  },
  cardActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 2,
  },
  watchBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 12,
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  watchBtnText: {
    color: "#fff",
    fontSize: 15,
  },
  websiteBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  websiteBtnText: {
    fontSize: 14,
  },
});
