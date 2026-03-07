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
import { WebView } from "react-native-webview";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest, getApiUrl } from "@/lib/query-client";
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
  const { userId, user } = useAuth();
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

  const displayName = user?.displayName || session.hostDisplayName || "Guest";
  const configParts = [
    "config.prejoinConfig.enabled=false",
    "config.prejoinPageEnabled=false",
    "config.startWithAudioMuted=true",
    "config.disableDeepLinking=true",
    "config.deeplinking.disabled=true",
    "config.enableClosePage=false",
    "config.disableThirdPartyRequests=true",
    "config.enableInsecureRoomNameWarning=false",
    "config.hideConferenceSubject=true",
    "config.disableProfile=true",
    "config.enableLobbyChat=false",
    "config.requireDisplayName=false",
    `userInfo.displayName=${encodeURIComponent(displayName)}`,
    "interfaceConfig.SHOW_JITSI_WATERMARK=false",
    "interfaceConfig.SHOW_WATERMARK_FOR_GUESTS=false",
    "interfaceConfig.SHOW_BRAND_WATERMARK=false",
    "interfaceConfig.SHOW_POWERED_BY=false",
    "interfaceConfig.MOBILE_APP_PROMO=false",
    "interfaceConfig.DISABLE_JOIN_LEAVE_NOTIFICATIONS=true",
  ];
  const roomSlug = session.roomUrl.split("/").pop() || "";
  const jitsiUrl = `${session.roomUrl}#${configParts.join("&")}`;

  const preloadJS = `
    (function() {
      if (window._gtfPatched) return;
      window._gtfPatched = true;

      var origOpen = window.open;
      window.open = function(url) {
        if (!url) return origOpen ? origOpen.apply(this, arguments) : null;
        var s = String(url);
        if (s.indexOf('itms-apps:') > -1 || s.indexOf('market:') > -1 ||
            s.indexOf('play.google.com') > -1 || s.indexOf('apps.apple.com') > -1 ||
            s.indexOf('intent:') > -1 || s.indexOf('org.jitsi.meet:') > -1) {
          return null;
        }
        return origOpen ? origOpen.apply(this, arguments) : null;
      };

      if (typeof navigator !== 'undefined' && navigator.userAgent) {
        try {
          Object.defineProperty(navigator, 'userAgent', {
            get: function() {
              return 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
            },
            configurable: true
          });
        } catch(e) {}
      }
    })();
    true;
  `;

  const postLoadJS = `
    (function() {
      if (window._gtfPostSetup) return;
      window._gtfPostSetup = true;
      var roomSlug = '${roomSlug}';
      var ended = false;

      function notifyEnd() {
        if (ended) return;
        ended = true;
        if (window.ReactNativeWebView) {
          window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'call_ended' }));
        }
      }

      function clickJoinInBrowser() {
        var links = document.querySelectorAll('a, button, [role="button"]');
        for (var i = 0; i < links.length; i++) {
          var t = (links[i].textContent || '').trim().toLowerCase();
          if (t === 'join in browser' || t === 'launch in web' || t === 'join meeting') {
            links[i].click();
            return true;
          }
        }
        return false;
      }

      var deepCheckCount = 0;
      var deepCheckTimer = setInterval(function() {
        deepCheckCount++;
        var text = document.body ? (document.body.innerText || '') : '';
        if (text.indexOf('How do you want to join') > -1 ||
            text.indexOf('Download from App Store') > -1 ||
            text.indexOf('Download from Google Play') > -1) {
          if (clickJoinInBrowser()) clearInterval(deepCheckTimer);
        }
        if (deepCheckCount > 20) clearInterval(deepCheckTimer);
      }, 500);

      var origPush = history.pushState;
      var origReplace = history.replaceState;
      function checkLeft() {
        if (roomSlug && window.location.href.indexOf(roomSlug) === -1) notifyEnd();
      }
      history.pushState = function() { origPush.apply(this, arguments); setTimeout(checkLeft, 200); };
      history.replaceState = function() { origReplace.apply(this, arguments); setTimeout(checkLeft, 200); };
      window.addEventListener('popstate', checkLeft);

      setInterval(function() {
        if (roomSlug && window.location.href.indexOf(roomSlug) === -1) notifyEnd();
        var text = document.body ? (document.body.innerText || '') : '';
        if (text.indexOf('meeting has ended') > -1 ||
            text.indexOf('You left the meeting') > -1 ||
            text.indexOf('okie') > -1) notifyEnd();
      }, 2000);

      new MutationObserver(function() {
        var btns = document.querySelectorAll('[aria-label="Leave"],[aria-label="Hang up"]');
        btns.forEach(function(b) {
          if (!b._gtf) {
            b._gtf = true;
            b.addEventListener('click', function() { setTimeout(notifyEnd, 800); });
          }
        });
      }).observe(document.documentElement, { childList: true, subtree: true });
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
            source={{ uri: jitsiUrl }}
            style={{ flex: 1 }}
            javaScriptEnabled
            domStorageEnabled
            mediaPlaybackRequiresUserAction={false}
            allowsInlineMediaPlayback
            mediaCapturePermissionGrantType="grant"
            injectedJavaScriptBeforeContentLoaded={preloadJS}
            injectedJavaScript={postLoadJS}
            onLoadEnd={() => setWebViewLoading(false)}
            onMessage={handleWebViewMessage}
            onShouldStartLoadWithRequest={(request) => {
              const url = request.url || "";
              if (
                url.startsWith("intent://") ||
                url.startsWith("market://") ||
                url.startsWith("itms-apps://") ||
                url.startsWith("https://play.google.com") ||
                url.startsWith("https://apps.apple.com") ||
                url.startsWith("org.jitsi.meet://")
              ) {
                return false;
              }
              return true;
            }}
            originWhitelist={["https://*", "http://*"]}
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
