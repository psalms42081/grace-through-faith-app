import React, { useState, useCallback, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Platform,
  ActivityIndicator,
  Alert,
  Linking,
} from "react-native";
import { WebView } from "react-native-webview";
import { router, useLocalSearchParams } from "expo-router";
import { safeGoBack } from "@/lib/safe-back";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest, getApiUrl } from "@/lib/query-client";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/hooks/useTheme";
import { Camera } from "expo-camera";
import { Audio } from "expo-av";

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

interface ParticipantInfo {
  identity: string;
  name: string;
  isMuted: boolean;
  hasVideo: boolean;
}

function WebLiveKitRoom({ session, displayName, isHost }: { session: StreamSession; displayName: string; isHost: boolean }) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const roomRef = useRef<any>(null);
  const [status, setStatus] = useState("Connecting...");
  const [error, setError] = useState<string | null>(null);
  const [micEnabled, setMicEnabled] = useState(true);
  const [camEnabled, setCamEnabled] = useState(false);
  const [participants, setParticipants] = useState<ParticipantInfo[]>([]);

  useEffect(() => {
    let mounted = true;
    let currentRoom: any = null;

    async function start() {
      try {
        setStatus("Getting connection token...");
        const tokenUrl = new URL(`/api/streams/${session.id}/token?displayName=${encodeURIComponent(displayName)}`, getApiUrl());
        const tokenRes = await fetch(tokenUrl.toString());
        if (!tokenRes.ok) {
          throw new Error(`Token request failed: ${tokenRes.status}`);
        }
        const { token, wsUrl } = await tokenRes.json();
        if (!mounted) return;

        setStatus("Loading LiveKit...");
        const lk = await import("livekit-client");
        if (!mounted) return;

        setStatus("Connecting to room...");
        const room = new lk.Room({
          adaptiveStream: true,
          dynacast: true,
          videoCaptureDefaults: { resolution: lk.VideoPresets.h540.resolution },
          audioCaptureDefaults: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        });
        currentRoom = room;
        roomRef.current = room;

        function updateParticipants() {
          if (!mounted) return;
          const parts: ParticipantInfo[] = [];
          if (room.localParticipant) {
            parts.push({
              identity: room.localParticipant.identity,
              name: room.localParticipant.name || displayName,
              isMuted: !room.localParticipant.isMicrophoneEnabled,
              hasVideo: room.localParticipant.isCameraEnabled,
            });
          }
          room.remoteParticipants.forEach((p: any) => {
            parts.push({
              identity: p.identity,
              name: p.name || p.identity,
              isMuted: !p.isMicrophoneEnabled,
              hasVideo: p.isCameraEnabled,
            });
          });
          setParticipants([...parts]);
        }

        room.on(lk.RoomEvent.Connected, () => {
          if (!mounted) return;
          setStatus("connected");
          updateParticipants();
        });

        room.on(lk.RoomEvent.Disconnected, () => {
          if (!mounted) return;
          setStatus("Disconnected");
        });

        room.on(lk.RoomEvent.ParticipantConnected, () => updateParticipants());
        room.on(lk.RoomEvent.ParticipantDisconnected, () => updateParticipants());
        room.on(lk.RoomEvent.TrackMuted, () => updateParticipants());
        room.on(lk.RoomEvent.TrackUnmuted, () => updateParticipants());
        room.on(lk.RoomEvent.LocalTrackPublished, () => updateParticipants());
        room.on(lk.RoomEvent.LocalTrackUnpublished, () => updateParticipants());

        room.on(lk.RoomEvent.TrackSubscribed, (track: any, _pub: any, participant: any) => {
          if (!mounted || !containerRef.current) return;
          const el = track.attach();
          el.id = `track-${participant.identity}-${track.kind}`;
          el.style.width = "100%";
          el.style.height = "100%";
          el.style.objectFit = "cover";
          if (track.kind === "audio") {
            el.style.display = "none";
          }
          const tileId = `tile-${participant.identity}`;
          let tile = document.getElementById(tileId);
          if (!tile) {
            tile = document.createElement("div");
            tile.id = tileId;
            tile.style.cssText = "position:relative;background:#1a1a1f;border-radius:12px;overflow:hidden;display:flex;align-items:center;justify-content:center;min-height:200px;";
            containerRef.current?.appendChild(tile);
          }
          tile.appendChild(el);
        });

        room.on(lk.RoomEvent.TrackUnsubscribed, (track: any, _pub: any, participant: any) => {
          track.detach().forEach((el: HTMLElement) => el.remove());
        });

        await room.connect(wsUrl, token);
        if (!mounted) {
          room.disconnect();
          return;
        }

        try {
          await room.localParticipant.setMicrophoneEnabled(true);
          if (mounted) setMicEnabled(true);
        } catch {
          if (mounted) setMicEnabled(false);
        }

      } catch (err: any) {
        if (mounted) {
          setError(err.message || String(err));
          setStatus("Error");
        }
      }
    }

    start();

    return () => {
      mounted = false;
      if (currentRoom) {
        currentRoom.disconnect().catch(() => {});
      }
    };
  }, [session.id, displayName]);

  const toggleMic = useCallback(async () => {
    const room = roomRef.current;
    if (!room) return;
    try {
      const next = !micEnabled;
      await room.localParticipant.setMicrophoneEnabled(next);
      setMicEnabled(next);
    } catch {}
  }, [micEnabled]);

  const toggleCam = useCallback(async () => {
    const room = roomRef.current;
    if (!room) return;
    try {
      const next = !camEnabled;
      await room.localParticipant.setCameraEnabled(next);
      setCamEnabled(next);
    } catch {}
  }, [camEnabled]);

  const leaveRoom = useCallback(() => {
    const room = roomRef.current;
    if (room) {
      room.disconnect().catch(() => {});
    }
    safeGoBack(router);
  }, []);

  if (error) {
    return (
      <View style={{ flex: 1, backgroundColor: "#050507", alignItems: "center", justifyContent: "center", padding: 20 }}>
        <Ionicons name="warning-outline" size={48} color="#FF3B30" />
        <Text style={{ color: "#fff", fontSize: 16, marginTop: 12, textAlign: "center", fontFamily: "Inter_600SemiBold" }}>
          Connection Error
        </Text>
        <Text style={{ color: "#aaa", fontSize: 13, marginTop: 8, textAlign: "center", fontFamily: "Inter_400Regular" }}>
          {error}
        </Text>
        <Pressable onPress={() => router.back()} style={{ marginTop: 20, backgroundColor: "#C9933A", paddingHorizontal: 24, paddingVertical: 10, borderRadius: 20 }}>
          <Text style={{ color: "#fff", fontFamily: "Inter_600SemiBold" }}>Go Back</Text>
        </Pressable>
      </View>
    );
  }

  if (status !== "connected") {
    return (
      <View style={{ flex: 1, backgroundColor: "#050507", alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator size="large" color="#C9933A" />
        <Text style={{ color: "#aaa", fontSize: 14, marginTop: 16, fontFamily: "Inter_400Regular" }}>{status}</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#050507" }}>
      <div
        ref={containerRef}
        style={{
          flex: 1,
          display: "grid",
          gap: "4px",
          padding: "4px",
          gridTemplateColumns: participants.length > 2 ? "1fr 1fr" : "1fr",
          gridAutoRows: "1fr",
          overflow: "hidden",
          minHeight: 0,
        } as any}
      >
        {participants.map((p) => (
          <div
            key={p.identity}
            id={`tile-${p.identity}`}
            style={{
              position: "relative",
              background: "#1a1a1f",
              borderRadius: "12px",
              overflow: "hidden",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              minHeight: "200px",
            }}
          >
            {!p.hasVideo && (
              <div style={{
                width: "64px",
                height: "64px",
                borderRadius: "50%",
                background: "#C9933A",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "28px",
                fontWeight: "700" as const,
                color: "#fff",
              }}>
                {(p.name || "?")[0].toUpperCase()}
              </div>
            )}
            <div style={{
              position: "absolute",
              bottom: "8px",
              left: "8px",
              background: "rgba(0,0,0,0.6)",
              padding: "3px 10px",
              borderRadius: "6px",
              fontSize: "12px",
              color: "#fff",
            }}>
              {p.name}{p.isMuted ? " 🔇" : ""}
            </div>
          </div>
        ))}
      </div>

      <View style={{ flexDirection: "row", justifyContent: "center", gap: 16, padding: 12, backgroundColor: "#111114" }}>
        <Pressable
          onPress={toggleMic}
          style={{
            width: 48, height: 48, borderRadius: 24,
            backgroundColor: micEnabled ? "#C9933A" : "#555",
            alignItems: "center", justifyContent: "center",
          }}
        >
          <Ionicons name={micEnabled ? "mic" : "mic-off"} size={22} color="#fff" />
        </Pressable>
        <Pressable
          onPress={toggleCam}
          style={{
            width: 48, height: 48, borderRadius: 24,
            backgroundColor: camEnabled ? "#C9933A" : "#555",
            alignItems: "center", justifyContent: "center",
          }}
        >
          <Ionicons name={camEnabled ? "videocam" : "videocam-off"} size={22} color="#fff" />
        </Pressable>
        <Pressable
          onPress={leaveRoom}
          style={{
            width: 48, height: 48, borderRadius: 24,
            backgroundColor: "#e53935",
            alignItems: "center", justifyContent: "center",
          }}
        >
          <Ionicons name="call" size={22} color="#fff" style={{ transform: [{ rotate: "135deg" }] }} />
        </Pressable>
      </View>
    </View>
  );
}

export default function StreamScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const { userId, user } = useAuth();
  const queryClient = useQueryClient();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const [webViewLoading, setWebViewLoading] = useState(true);
  const [permissionsGranted, setPermissionsGranted] = useState(Platform.OS === "web");
  const [permissionsDenied, setPermissionsDenied] = useState(false);
  const [permissionsChecking, setPermissionsChecking] = useState(Platform.OS !== "web");

  useEffect(() => {
    if (Platform.OS === "web") return;

    async function requestPerms() {
      try {
        const [camResult, micResult] = await Promise.all([
          Camera.requestCameraPermissionsAsync(),
          Audio.requestPermissionsAsync(),
        ]);

        if (camResult.granted && micResult.granted) {
          setPermissionsGranted(true);
        } else {
          setPermissionsDenied(true);
        }
      } catch (err) {
        console.error("Permission request error:", err);
        setPermissionsGranted(true);
      } finally {
        setPermissionsChecking(false);
      }
    }

    requestPerms();
  }, []);

  const { data: session, isLoading } = useQuery<StreamSession>({
    queryKey: [`/api/streams/${id}`],
    enabled: !!id,
  });

  const displayName = user?.displayName || session?.hostDisplayName || "Guest";

  const endMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", `/api/streams/${id}/end`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/streams/active"] });
      queryClient.invalidateQueries({ queryKey: [`/api/streams/${id}`] });
      safeGoBack(router);
    },
    onError: () => {
      const msg = "Could not end the session. Please try again.";
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

  const handleWebViewMessage = useCallback((event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === "call_ended") {
        safeGoBack(router);
      }
    } catch {}
  }, []);

  if (isLoading || permissionsChecking) {
    return (
      <View style={[s.container, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.accent} style={{ marginTop: topPad + 100 }} />
      </View>
    );
  }

  if (permissionsDenied) {
    return (
      <View style={[s.container, { backgroundColor: theme.background }]}>
        <View style={[s.header, { paddingTop: topPad + 12 }]}>
          <Pressable onPress={() => router.back()} style={s.backBtn}>
            <Ionicons name="arrow-back" size={22} color={theme.text} />
          </Pressable>
        </View>
        <View style={s.centered}>
          <Ionicons name="mic-off-outline" size={48} color={theme.textMuted} />
          <Text style={[s.endedTitle, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}>
            Permissions Required
          </Text>
          <Text style={[s.emptyText, { color: theme.textSecondary, fontFamily: "Inter_400Regular" }]}>
            Camera and microphone access are needed to join live sessions. Please enable them in your device settings.
          </Text>
          <Pressable
            onPress={() => {
              try { Linking.openSettings(); } catch {}
            }}
            style={[s.returnBtn, { backgroundColor: theme.accent }]}
          >
            <Text style={[s.returnBtnText, { fontFamily: "Inter_600SemiBold" }]}>Open Settings</Text>
          </Pressable>
          <Pressable onPress={() => router.back()} style={{ marginTop: 12 }}>
            <Text style={[s.emptyText, { color: theme.accent, fontFamily: "Inter_500Medium" }]}>Go Back</Text>
          </Pressable>
        </View>
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
          <Text style={[s.endedTitle, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}>
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

  const roomPageUrl = `${getApiUrl()}/api/streams/${id}/room?displayName=${encodeURIComponent(displayName)}`;

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
        <WebLiveKitRoom session={session} displayName={displayName} isHost={isHost} />
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
            source={{ uri: roomPageUrl }}
            style={{ flex: 1 }}
            javaScriptEnabled
            domStorageEnabled
            mediaPlaybackRequiresUserAction={false}
            allowsInlineMediaPlayback
            mediaCapturePermissionGrantType="grant"
            androidLayerType="hardware"
            allowsProtectedMedia
            onLoadEnd={() => setWebViewLoading(false)}
            onMessage={handleWebViewMessage}
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
