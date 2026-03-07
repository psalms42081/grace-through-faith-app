import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Platform,
  ActivityIndicator,
  Alert,
} from "react-native";
import { WebView, WebViewNavigation } from "react-native-webview";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/query-client";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/hooks/useTheme";

interface StreamSession {
  id: string;
  title: string;
  groupId: string | null;
  churchId: string | null;
  hostUserId: string;
  hostDisplayName: string | null;
  roomUrl: string;
  status: string;
  participantCount: number;
  startedAt: string;
  endedAt: string | null;
  groupName?: string | null;
}

export default function StreamScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const { userId } = useAuth();
  const queryClient = useQueryClient();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const [webViewLoading, setWebViewLoading] = useState(true);

  const { data: session, isLoading } = useQuery<StreamSession>({
    queryKey: [`/api/streams/${id}`],
    enabled: !!id,
  });

  const endMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", `/api/streams/${id}/end`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/streams/active"] });
      queryClient.invalidateQueries({ queryKey: [`/api/streams/${id}`] });
      router.back();
    },
    onError: (err: any) => {
      const msg = err?.message || "Failed to end session";
      if (Platform.OS === "web") {
        alert(msg);
      } else {
        Alert.alert("Error", msg);
      }
    },
  });

  const isHost = session?.hostUserId === userId;
  const isEnded = session?.status === "ended";

  const handleEnd = useCallback(() => {
    if (Platform.OS === "web") {
      if (confirm("End this live session for everyone?")) {
        endMutation.mutate();
      }
    } else {
      Alert.alert(
        "End Session",
        "End this live session for everyone?",
        [
          { text: "Cancel", style: "cancel" },
          { text: "End", style: "destructive", onPress: () => endMutation.mutate() },
        ]
      );
    }
  }, [endMutation]);

  if (isLoading) {
    return (
      <View style={[s.container, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.accent} style={{ marginTop: topPad + 100 }} />
      </View>
    );
  }

  if (!session) {
    return (
      <View style={[s.container, { backgroundColor: theme.background }]}>
        <View style={[s.header, { paddingTop: topPad + 12 }]}>
          <Pressable onPress={() => router.back()} style={s.backBtn}>
            <Ionicons name="arrow-back" size={22} color={theme.text} />
          </Pressable>
        </View>
        <View style={s.centered}>
          <Ionicons name="videocam-off-outline" size={48} color={theme.textMuted} />
          <Text style={[s.emptyText, { color: theme.textSecondary, fontFamily: "Inter_500Medium" }]}>
            Session not found
          </Text>
        </View>
      </View>
    );
  }

  if (isEnded) {
    return (
      <View style={[s.container, { backgroundColor: theme.background }]}>
        <View style={[s.header, { paddingTop: topPad + 12 }]}>
          <Pressable onPress={() => router.back()} style={s.backBtn}>
            <Ionicons name="arrow-back" size={22} color={theme.text} />
          </Pressable>
        </View>
        <View style={s.centered}>
          <Ionicons name="videocam-off-outline" size={48} color={theme.textMuted} />
          <Text style={[s.endedTitle, { color: theme.text, fontFamily: "Lora_600SemiBold" }]}>
            Session Ended
          </Text>
          <Text style={[s.emptyText, { color: theme.textSecondary, fontFamily: "Inter_400Regular" }]}>
            "{session.title}" has concluded
          </Text>
          <Pressable onPress={() => router.back()} style={[s.returnBtn, { backgroundColor: theme.accent }]}>
            <Text style={[s.returnBtnText, { fontFamily: "Inter_600SemiBold" }]}>Return</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  if (!session.roomUrl) {
    return (
      <View style={[s.container, { backgroundColor: theme.background }]}>
        <View style={[s.header, { paddingTop: topPad + 12 }]}>
          <Pressable onPress={() => router.back()} style={s.backBtn}>
            <Ionicons name="arrow-back" size={22} color={theme.text} />
          </Pressable>
        </View>
        <View style={s.centered}>
          <Ionicons name="alert-circle-outline" size={48} color={theme.textMuted} />
          <Text style={[s.emptyText, { color: theme.textSecondary, fontFamily: "Inter_500Medium" }]}>
            Invalid session URL
          </Text>
        </View>
      </View>
    );
  }

  const jitsiConfig = new URL(session.roomUrl);
  jitsiConfig.hash = "";
  jitsiConfig.searchParams.set("config.prejoinConfig.enabled", "false");
  jitsiConfig.searchParams.set("config.prejoinPageEnabled", "false");
  jitsiConfig.searchParams.set("config.startWithAudioMuted", "true");
  jitsiConfig.searchParams.set("config.disableDeepLinking", "true");
  jitsiConfig.searchParams.set("config.disableThirdPartyRequests", "true");
  jitsiConfig.searchParams.set("config.hideConferenceSubject", "false");
  jitsiConfig.searchParams.set("config.disableProfile", "true");
  jitsiConfig.searchParams.set("interfaceConfig.SHOW_JITSI_WATERMARK", "false");
  jitsiConfig.searchParams.set("interfaceConfig.SHOW_WATERMARK_FOR_GUESTS", "false");
  jitsiConfig.searchParams.set("interfaceConfig.SHOW_BRAND_WATERMARK", "false");
  jitsiConfig.searchParams.set("interfaceConfig.SHOW_POWERED_BY", "false");
  jitsiConfig.searchParams.set("interfaceConfig.DISABLE_JOIN_LEAVE_NOTIFICATIONS", "true");
  jitsiConfig.searchParams.set("interfaceConfig.MOBILE_APP_PROMO", "false");
  const jitsiUrl = jitsiConfig.toString();

  const roomSlug = session.roomUrl.split("/").pop() || "";

  const handleNavChange = useCallback((navState: WebViewNavigation) => {
    const url = navState.url || "";
    if (!url || url === "about:blank") return;
    const hasRoomSlug = roomSlug && url.includes(roomSlug);
    if (!hasRoomSlug && url.startsWith("https://")) {
      router.back();
    }
  }, [roomSlug]);

  const hangupDetectionJS = `
    (function() {
      if (window._gtfHangupSetup) return;
      window._gtfHangupSetup = true;
      var roomSlug = '${roomSlug}';
      var ended = false;

      function notifyEnd() {
        if (ended) return;
        ended = true;
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'call_ended' }));
      }

      var origPushState = history.pushState;
      var origReplaceState = history.replaceState;
      function checkNav() {
        var url = window.location.href;
        if (roomSlug && url.indexOf(roomSlug) === -1) {
          notifyEnd();
        }
      }
      history.pushState = function() {
        origPushState.apply(this, arguments);
        setTimeout(checkNav, 100);
      };
      history.replaceState = function() {
        origReplaceState.apply(this, arguments);
        setTimeout(checkNav, 100);
      };
      window.addEventListener('popstate', checkNav);
      window.addEventListener('hashchange', checkNav);

      var observer = new MutationObserver(function() {
        var hangupBtns = document.querySelectorAll('[aria-label="Leave"], [aria-label="Hang up"], [id="okie-hangup"]');
        hangupBtns.forEach(function(btn) {
          if (!btn._gtfPatched) {
            btn._gtfPatched = true;
            btn.addEventListener('click', function() {
              setTimeout(notifyEnd, 600);
            });
          }
        });
        var feedbackPage = document.querySelector('[class*="feedback"]') || document.querySelector('[class*="welcome"]');
        var adContent = document.querySelector('[class*="okie"]') || document.querySelector('a[href*="jaas.8x8"]');
        if (feedbackPage || adContent) {
          setTimeout(notifyEnd, 300);
        }
      });
      observer.observe(document.body || document.documentElement, { childList: true, subtree: true });

      if (typeof window.JitsiMeetExternalAPI !== 'undefined') {
        try {
          var api = window.JitsiMeetExternalAPI;
          if (api && api.addEventListener) {
            api.addEventListener('readyToClose', notifyEnd);
            api.addEventListener('videoConferenceLeft', notifyEnd);
          }
        } catch(e) {}
      }

      setInterval(function() {
        if (roomSlug && window.location.href.indexOf(roomSlug) === -1) {
          notifyEnd();
        }
      }, 2000);
    })();
    true;
  `;

  const handleWebViewMessage = useCallback((event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === "call_ended") {
        router.back();
      }
    } catch {}
  }, []);

  return (
    <View style={[s.container, { backgroundColor: "#000" }]}>
      <View style={[s.streamHeader, { paddingTop: topPad + 8, backgroundColor: "rgba(5,5,7,0.92)" }]}>
        <Pressable onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </Pressable>
        <View style={s.streamInfo}>
          <View style={s.liveRow}>
            <View style={s.liveDot} />
            <Text style={[s.liveLabel, { fontFamily: "Inter_700Bold" }]}>LIVE</Text>
          </View>
          <Text style={[s.streamTitle, { fontFamily: "Inter_600SemiBold" }]} numberOfLines={1}>
            {session.title}
          </Text>
          {session.groupName && (
            <Text style={[s.streamGroup, { fontFamily: "Inter_400Regular" }]}>
              {session.groupName}
            </Text>
          )}
        </View>
        {isHost && (
          <Pressable onPress={handleEnd} style={s.endBtn}>
            <Ionicons name="stop-circle" size={18} color="#fff" />
            <Text style={[s.endBtnText, { fontFamily: "Inter_600SemiBold" }]}>End</Text>
          </Pressable>
        )}
      </View>

      {Platform.OS === "web" ? (
        <iframe
          src={jitsiUrl}
          style={{
            flex: 1,
            width: "100%",
            height: "100%",
            border: "none",
          } as any}
          allow="camera; microphone; display-capture; fullscreen"
        />
      ) : (
        <>
          {webViewLoading && (
            <View style={s.webviewLoading}>
              <ActivityIndicator size="large" color={theme.accent} />
              <Text style={[s.loadingText, { fontFamily: "Inter_400Regular" }]}>
                Connecting to session...
              </Text>
            </View>
          )}
          <WebView
            ref={webViewRef}
            source={{ uri: jitsiUrl }}
            style={{ flex: 1 }}
            javaScriptEnabled
            domStorageEnabled
            mediaPlaybackRequiresUserAction={false}
            allowsInlineMediaPlayback
            onLoadEnd={() => setWebViewLoading(false)}
            onNavigationStateChange={handleNavChange}
            onMessage={handleWebViewMessage}
            injectedJavaScript={hangupDetectionJS}
            originWhitelist={["*"]}
            allowsBackForwardNavigationGestures={false}
          />
        </>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    gap: 12,
  },
  emptyText: { fontSize: 15, textAlign: "center" },
  endedTitle: { fontSize: 22, marginTop: 8 },
  returnBtn: {
    marginTop: 16,
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 12,
  },
  returnBtnText: { color: "#fff", fontSize: 15 },
  streamHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingBottom: 10,
    gap: 8,
  },
  streamInfo: { flex: 1, gap: 2 },
  liveRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#FF3B30",
  },
  liveLabel: { color: "#FF3B30", fontSize: 11, letterSpacing: 1 },
  streamTitle: { color: "#fff", fontSize: 15 },
  streamGroup: { color: "rgba(255,255,255,0.6)", fontSize: 12 },
  endBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#FF3B30",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  endBtnText: { color: "#fff", fontSize: 13 },
  webviewLoading: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#000",
    zIndex: 10,
    gap: 12,
  },
  loadingText: { color: "rgba(255,255,255,0.6)", fontSize: 14 },
});
