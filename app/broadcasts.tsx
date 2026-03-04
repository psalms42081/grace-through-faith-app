import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  useColorScheme,
  Platform,
  Linking,
  ActivityIndicator,
  Modal,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { WebView } from "react-native-webview";
import Colors from "@/constants/colors";

interface BroadcastSource {
  id: string;
  name: string;
  description: string;
  watchUrl: string;
  websiteUrl: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
}

const broadcastSources: BroadcastSource[] = [
  {
    id: "3abn",
    name: "3ABN (Live)",
    description:
      "Three Angels Broadcasting Network delivers 24/7 Adventist programming including worship, health, Bible study, and family content.",
    watchUrl: "https://3abn.org/3abn-tv-live.html",
    websiteUrl: "https://3abn.org",
    icon: "tv",
    color: "#5B86E5",
  },
  {
    id: "amazing-facts",
    name: "Amazing Facts TV (Live)",
    description:
      "Watch Amazing Facts live programming featuring Bible prophecy seminars, evangelistic series, and faith-building content.",
    watchUrl: "https://www.amazingfacts.org/media-library/watch/aftv",
    websiteUrl: "https://www.amazingfacts.org",
    icon: "play-circle",
    color: "#C9933A",
  },
];

function BroadcastCard({
  source,
  theme,
  onWatch,
}: {
  source: BroadcastSource;
  theme: typeof Colors.dark;
  onWatch: (source: BroadcastSource) => void;
}) {
  return (
    <View style={[st.card, { backgroundColor: theme.backgroundCard, borderColor: theme.border }]}>
      <View style={st.cardHeader}>
        <View style={[st.cardIcon, { backgroundColor: source.color + "15" }]}>
          <Ionicons name={source.icon} size={28} color={source.color} />
        </View>
        <Text style={[st.cardName, { color: theme.text, fontFamily: "Lora_700Bold" }]}>
          {source.name}
        </Text>
      </View>

      <Text style={[st.cardDesc, { color: theme.textSecondary, fontFamily: "Inter_400Regular" }]}>
        {source.description}
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
          <Text style={[st.watchBtnText, { fontFamily: "Inter_600SemiBold" }]}>Watch Live</Text>
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
            Open Website
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

export default function BroadcastsScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const theme = isDark ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const [activeSource, setActiveSource] = useState<BroadcastSource | null>(null);
  const [webViewError, setWebViewError] = useState(false);
  const [webViewLoading, setWebViewLoading] = useState(true);

  const handleWatch = useCallback((source: BroadcastSource) => {
    if (Platform.OS === "web") {
      Linking.openURL(source.watchUrl);
      return;
    }
    setWebViewError(false);
    setWebViewLoading(true);
    setActiveSource(source);
  }, []);

  const handleCloseWebView = useCallback(() => {
    setActiveSource(null);
    setWebViewError(false);
    setWebViewLoading(true);
  }, []);

  const handleWebViewError = useCallback(() => {
    setWebViewError(true);
    setWebViewLoading(false);
  }, []);

  const handleOpenInBrowser = useCallback(() => {
    if (activeSource) {
      Linking.openURL(activeSource.watchUrl);
    }
    handleCloseWebView();
  }, [activeSource]);

  return (
    <View style={[st.container, { backgroundColor: theme.background }]}>
      <View style={[st.header, { paddingTop: topPad + 12, backgroundColor: theme.background }]}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </Pressable>
        <View style={st.headerCenter}>
          <Text style={[st.headerTitle, { color: theme.text, fontFamily: "Lora_700Bold" }]}>
            Broadcasts
          </Text>
        </View>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        style={st.scrollView}
        contentContainerStyle={[st.content, { paddingBottom: bottomPad + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={[st.infoBanner, { backgroundColor: theme.accent + "08", borderColor: theme.accent + "20" }]}>
          <Ionicons name="information-circle-outline" size={18} color={theme.accent} />
          <Text style={[st.infoText, { color: theme.textSecondary, fontFamily: "Inter_400Regular" }]}>
            Streams are provided by their respective ministries. Grace through Faith does not host or control any broadcast content.
          </Text>
        </View>

        {broadcastSources.map((source) => (
          <BroadcastCard key={source.id} source={source} theme={theme} onWatch={handleWatch} />
        ))}
      </ScrollView>

      <Modal
        visible={activeSource !== null}
        animationType="slide"
        onRequestClose={handleCloseWebView}
        presentationStyle="fullScreen"
      >
        <View style={[st.webViewContainer, { backgroundColor: theme.background }]}>
          <View style={[st.webViewHeader, { paddingTop: topPad + 8, backgroundColor: theme.backgroundCard, borderBottomColor: theme.border }]}>
            <Pressable onPress={handleCloseWebView} hitSlop={12}>
              <Ionicons name="close" size={24} color={theme.text} />
            </Pressable>
            <Text
              style={[st.webViewTitle, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}
              numberOfLines={1}
            >
              {activeSource?.name || ""}
            </Text>
            <Pressable onPress={handleOpenInBrowser} hitSlop={12}>
              <Ionicons name="open-outline" size={20} color={theme.accent} />
            </Pressable>
          </View>

          {webViewError ? (
            <View style={st.errorContainer}>
              <Ionicons name="cloud-offline-outline" size={48} color={theme.textMuted} />
              <Text style={[st.errorText, { color: theme.textSecondary, fontFamily: "Inter_500Medium" }]}>
                Unable to load stream
              </Text>
              <Pressable
                onPress={handleOpenInBrowser}
                style={({ pressed }) => [
                  st.openBrowserBtn,
                  { backgroundColor: theme.accent, opacity: pressed ? 0.85 : 1 },
                ]}
              >
                <Ionicons name="open-outline" size={18} color="#fff" />
                <Text style={[st.openBrowserBtnText, { fontFamily: "Inter_600SemiBold" }]}>
                  Open in Browser
                </Text>
              </Pressable>
            </View>
          ) : (
            <>
              {webViewLoading && (
                <View style={st.loadingOverlay}>
                  <ActivityIndicator size="large" color={theme.accent} />
                  <Text style={[st.loadingText, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
                    Loading stream...
                  </Text>
                </View>
              )}
              {activeSource && (
                <WebView
                  source={{ uri: activeSource.watchUrl }}
                  style={st.webView}
                  onLoadEnd={() => setWebViewLoading(false)}
                  onError={handleWebViewError}
                  onHttpError={handleWebViewError}
                  allowsInlineMediaPlayback
                  mediaPlaybackRequiresUserAction={false}
                  javaScriptEnabled
                  domStorageEnabled
                  startInLoadingState={false}
                />
              )}
            </>
          )}
        </View>
      </Modal>
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
    gap: 16,
  },
  infoBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 19,
  },
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
  webViewContainer: { flex: 1 },
  webViewHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 10,
    gap: 14,
    borderBottomWidth: 1,
  },
  webViewTitle: {
    flex: 1,
    fontSize: 16,
    textAlign: "center",
  },
  webView: { flex: 1 },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    zIndex: 10,
  },
  loadingText: {
    fontSize: 14,
  },
  errorContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
    paddingHorizontal: 40,
  },
  errorText: {
    fontSize: 16,
    textAlign: "center",
  },
  openBrowserBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 14,
    marginTop: 8,
  },
  openBrowserBtnText: {
    color: "#fff",
    fontSize: 15,
  },
});
