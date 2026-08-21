import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Platform,
  Linking,
  ActivityIndicator,
  Modal,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { WebView } from "react-native-webview";
import { useTranslation } from "react-i18next";
import { useTheme } from "@/hooks/useTheme";
import BroadcastCard, { broadcastSources, type BroadcastSource } from "@/components/BroadcastCard";

export default function BroadcastsScreen() {
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
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
  }, [activeSource, handleCloseWebView]);

  return (
    <View style={[st.container, { backgroundColor: theme.background }]}>
      <View style={[st.header, { paddingTop: topPad + 12, backgroundColor: theme.background }]}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </Pressable>
        <View style={st.headerCenter}>
          <Text style={[st.headerTitle, { color: theme.text, fontFamily: "Lora_700Bold" }]}>
            {t("broadcasts.title")}
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
            {t("broadcasts.disclaimer")}
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
                {t("broadcasts.unableToLoad")}
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
                  {t("broadcasts.openInBrowser")}
                </Text>
              </Pressable>
            </View>
          ) : (
            <>
              {webViewLoading && (
                <View style={st.loadingOverlay}>
                  <ActivityIndicator size="large" color={theme.accent} />
                  <Text style={[st.loadingText, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
                    {t("broadcasts.loadingStream")}
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
