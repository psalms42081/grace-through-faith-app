import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Platform,
  ActivityIndicator,
  Alert,
  ScrollView,
} from "react-native";
import { WebView } from "react-native-webview";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { PathB } from "@/constants/colors";
import { HV2 } from "@/components/home-v2/theme";
import { useAuth } from "@/contexts/AuthContext";
import { useKidsMode } from "@/context/KidsModeContext";
import { apiRequest, getApiUrl } from "@/lib/query-client";
import { joinApiPath } from "@/lib/join-api-path";
import { withDeviceTimeZone } from "@/lib/device-time-zone";
import { displayInitials } from "@/lib/user-initials";
import type { SabbathSchoolWeekPointer } from "@/lib/bible-small-group";

const C = {
  surface: PathB.surface,
  card: PathB.surfaceCard,
  ink: PathB.ink,
  inkMuted: HV2.inkMutedText,
  coral: PathB.coral,
  coralInk: PathB.coralInk,
  tile: "#2A241C",
  stage: "#1F1A12",
};

type GroupDetail = {
  group: {
    id: string;
    name: string;
    role: string;
    currentWeek: SabbathSchoolWeekPointer | null;
  };
};

type LiveResponse = { session: { id: string; endedAt?: string | null } | null };

type TokenResponse = {
  token: string;
  wsUrl: string;
  roomName: string;
  displayName: string;
  isHost: boolean;
};

type TileInfo = {
  identity: string;
  name: string;
  isMuted: boolean;
  cameraOff: boolean;
  isLocal: boolean;
  speaking: boolean;
};

function goToGroup(id: string) {
  router.replace(`/bible-group/${id}` as any);
}

function goToProfile() {
  router.replace("/(tabs)/profile" as any);
}

function attachTrackToHost(track: any, hostId: string, isLocal: boolean, facingUser: boolean) {
  if (typeof document === "undefined") return;
  const host = document.getElementById(hostId);
  if (!host) return;
  const existing = host.querySelector(`[data-track-kind="${track.kind}"]`);
  if (existing) existing.remove();
  const el = track.attach();
  el.setAttribute("data-track-kind", track.kind);
  if (track.kind === "video") {
    el.style.width = "100%";
    el.style.height = "100%";
    el.style.objectFit = "cover";
    el.style.position = "absolute";
    el.style.inset = "0";
    if (isLocal && facingUser) el.style.transform = "scaleX(-1)";
  } else {
    el.style.display = "none";
  }
  host.appendChild(el);
}

function WebLiveRoom({
  groupId,
  groupName,
  lessonTitle,
  isHost,
  onLeave,
  onEndRoom,
}: {
  groupId: string;
  groupName: string;
  lessonTitle: string;
  isHost: boolean;
  onLeave: () => void;
  onEndRoom: () => void;
}) {
  const roomRef = useRef<any>(null);
  const lkRef = useRef<any>(null);
  const previewTracksRef = useRef<any[]>([]);
  const attachedRef = useRef<Map<string, { track: any; isLocal: boolean }[]>>(new Map());
  const previewVideoRef = useRef<any>(null);
  const [phase, setPhase] = useState<"preview" | "connecting" | "in-room">("preview");
  const [notice, setNotice] = useState<string | null>(null);
  const [micEnabled, setMicEnabled] = useState(true);
  const [camEnabled, setCamEnabled] = useState(true);
  const [facingUser, setFacingUser] = useState(true);
  const [tiles, setTiles] = useState<TileInfo[]>([]);
  const [showFlip] = useState(() => {
    if (Platform.OS !== "web") return true;
    if (typeof window === "undefined") return false;
    return window.matchMedia?.("(pointer: coarse)").matches ?? false;
  });

  const rememberTrack = useCallback((identity: string, track: any, isLocal: boolean) => {
    const list = attachedRef.current.get(identity) ?? [];
    const next = list.filter((row) => row.track !== track);
    next.push({ track, isLocal });
    attachedRef.current.set(identity, next);
  }, []);

  const forgetTrack = useCallback((track: any) => {
    attachedRef.current.forEach((list, identity) => {
      attachedRef.current.set(
        identity,
        list.filter((row) => row.track !== track),
      );
    });
    try {
      track.detach().forEach((el: HTMLElement) => el.remove());
    } catch {}
  }, []);

  const collectTiles = useCallback(
    (room: any, speakingIds: Set<string>) => {
      const next: TileInfo[] = [];
      if (room.localParticipant) {
        next.push({
          identity: room.localParticipant.identity,
          name: room.localParticipant.name || "You",
          isMuted: !room.localParticipant.isMicrophoneEnabled,
          cameraOff: !room.localParticipant.isCameraEnabled,
          isLocal: true,
          speaking: speakingIds.has(room.localParticipant.identity),
        });
      }
      room.remoteParticipants.forEach((p: any) => {
        next.push({
          identity: p.identity,
          name: p.name || p.identity,
          isMuted: !p.isMicrophoneEnabled,
          cameraOff: !p.isCameraEnabled,
          isLocal: false,
          speaking: speakingIds.has(p.identity),
        });
      });
      setTiles(next.slice(0, 12));
    },
    [],
  );

  useEffect(() => {
    return () => {
      const room = roomRef.current;
      if (room) room.disconnect().catch(() => {});
      previewTracksRef.current.forEach((t) => {
        try {
          t.stop();
        } catch {}
      });
    };
  }, []);

  useEffect(() => {
    tiles.forEach((tile) => {
      const rows = attachedRef.current.get(tile.identity) ?? [];
      rows.forEach(({ track, isLocal }) => {
        attachTrackToHost(track, `media-${tile.identity}`, isLocal, facingUser);
      });
    });
  }, [tiles, facingUser]);

  useEffect(() => {
    let cancelled = false;
    async function startPreview() {
      try {
        const lk = await import("livekit-client");
        if (cancelled) return;
        lkRef.current = lk;
        const tracks = await lk.createLocalTracks({
          audio: true,
          video: {
            facingMode: facingUser ? "user" : "environment",
            resolution: lk.VideoPresets.h360.resolution,
          },
        });
        if (cancelled) {
          tracks.forEach((t: any) => t.stop());
          return;
        }
        previewTracksRef.current = tracks;
        const video = tracks.find((t: any) => t.kind === "video");
        if (video && previewVideoRef.current) {
          const el = video.attach();
          el.muted = true;
          (el as HTMLVideoElement).playsInline = true;
          el.style.width = "100%";
          el.style.height = "100%";
          el.style.objectFit = "cover";
          el.style.transform = facingUser ? "scaleX(-1)" : "";
          previewVideoRef.current.innerHTML = "";
          previewVideoRef.current.appendChild(el);
        }
      } catch {
        try {
          const lk = lkRef.current || (await import("livekit-client"));
          const audioOnly = await lk.createLocalTracks({ audio: true, video: false });
          if (cancelled) {
            audioOnly.forEach((t: any) => t.stop());
            return;
          }
          previewTracksRef.current = audioOnly;
          setCamEnabled(false);
          setNotice("Camera is off. You can still join.");
        } catch {
          previewTracksRef.current = [];
          setMicEnabled(false);
          setCamEnabled(false);
          setNotice("Camera and microphone are off. You can still join to listen.");
        }
      }
    }
    if (phase === "preview") startPreview();
    return () => {
      cancelled = true;
      if (phase === "preview") {
        previewTracksRef.current.forEach((t) => {
          try {
            t.stop();
          } catch {}
        });
        previewTracksRef.current = [];
      }
    };
    // Recreate preview when flipping before join.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, facingUser]);

  const joinRoom = useCallback(async () => {
    setPhase("connecting");
    previewTracksRef.current.forEach((t) => {
      try {
        t.stop();
      } catch {}
    });
    previewTracksRef.current = [];

    try {
      const tokenRes = await apiRequest("POST", `/api/bible-groups/${groupId}/live/token`);
      const body: TokenResponse = await tokenRes.json();
      const lk = lkRef.current || (await import("livekit-client"));
      lkRef.current = lk;
      const speakingIds = new Set<string>();
      const room = new lk.Room({
        adaptiveStream: true,
        dynacast: true,
        videoCaptureDefaults: { resolution: lk.VideoPresets.h360.resolution },
      });
      roomRef.current = room;

      const refresh = () => collectTiles(room, speakingIds);

      room.on(lk.RoomEvent.TrackSubscribed, (track: any, _pub: any, participant: any) => {
        rememberTrack(participant.identity, track, false);
        attachTrackToHost(track, `media-${participant.identity}`, false, facingUser);
        refresh();
      });
      room.on(lk.RoomEvent.TrackUnsubscribed, (track: any) => {
        forgetTrack(track);
        refresh();
      });
      room.on(lk.RoomEvent.LocalTrackPublished, (pub: any) => {
        if (pub.track) {
          rememberTrack(room.localParticipant.identity, pub.track, true);
          attachTrackToHost(pub.track, `media-${room.localParticipant.identity}`, true, facingUser);
        }
        refresh();
      });
      room.on(lk.RoomEvent.LocalTrackUnpublished, (pub: any) => {
        if (pub.track) forgetTrack(pub.track);
        refresh();
      });
      room.on(lk.RoomEvent.ParticipantConnected, refresh);
      room.on(lk.RoomEvent.ParticipantDisconnected, (p: any) => {
        attachedRef.current.delete(p.identity);
        refresh();
      });
      room.on(lk.RoomEvent.TrackMuted, refresh);
      room.on(lk.RoomEvent.TrackUnmuted, refresh);
      room.on(lk.RoomEvent.ActiveSpeakersChanged, (speakers: any[]) => {
        speakingIds.clear();
        speakers.forEach((s) => speakingIds.add(s.identity));
        refresh();
      });
      room.on(lk.RoomEvent.Disconnected, () => {
        onLeave();
      });

      await room.connect(body.wsUrl, body.token);

      try {
        await room.localParticipant.setMicrophoneEnabled(micEnabled);
      } catch {
        setMicEnabled(false);
        setNotice("Microphone is off. You can still stay in the room.");
      }
      try {
        await room.localParticipant.setCameraEnabled(camEnabled, {
          facingMode: facingUser ? "user" : "environment",
        });
      } catch {
        setCamEnabled(false);
        setNotice((prev) => prev || "Camera is off. You can still stay in the room.");
      }

      refresh();
      setPhase("in-room");
    } catch (err: any) {
      setNotice(err?.message || "Could not join the room.");
      setPhase("preview");
    }
  }, [
    camEnabled,
    collectTiles,
    facingUser,
    forgetTrack,
    groupId,
    micEnabled,
    onLeave,
    rememberTrack,
  ]);

  const toggleMic = useCallback(async () => {
    const next = !micEnabled;
    setMicEnabled(next);
    const room = roomRef.current;
    if (phase === "preview") {
      previewTracksRef.current.forEach((t) => {
        if (t.kind === "audio") {
          if (next) t.unmute();
          else t.mute();
        }
      });
      return;
    }
    if (!room) return;
    try {
      await room.localParticipant.setMicrophoneEnabled(next);
    } catch {
      setMicEnabled(!next);
      setNotice("Microphone could not be changed.");
    }
  }, [micEnabled, phase]);

  const toggleCam = useCallback(async () => {
    const next = !camEnabled;
    setCamEnabled(next);
    const room = roomRef.current;
    if (phase === "preview") {
      previewTracksRef.current.forEach((t) => {
        if (t.kind === "video") {
          if (next) t.unmute();
          else t.mute();
        }
      });
      return;
    }
    if (!room) return;
    try {
      await room.localParticipant.setCameraEnabled(next, {
        facingMode: facingUser ? "user" : "environment",
      });
    } catch {
      setCamEnabled(!next);
      setNotice("Camera could not be changed.");
    }
  }, [camEnabled, facingUser, phase]);

  const flipCamera = useCallback(async () => {
    const nextFacing = !facingUser;
    setFacingUser(nextFacing);
    const room = roomRef.current;
    if (phase !== "in-room" || !room) return;
    try {
      const pub = room.localParticipant.getTrackPublication(
        lkRef.current?.Track.Source.Camera,
      );
      if (pub?.track?.restartTrack) {
        await pub.track.restartTrack({ facingMode: nextFacing ? "user" : "environment" });
      } else {
        await room.localParticipant.setCameraEnabled(false);
        await room.localParticipant.setCameraEnabled(true, {
          facingMode: nextFacing ? "user" : "environment",
        });
      }
    } catch {
      setNotice("Could not flip the camera.");
    }
  }, [facingUser, phase]);

  const leave = useCallback(() => {
    const room = roomRef.current;
    if (room) room.disconnect().catch(() => {});
    onLeave();
  }, [onLeave]);

  const spotlightId = useMemo(() => {
    const speaker = tiles.find((t) => t.speaking);
    return speaker?.identity ?? tiles[0]?.identity;
  }, [tiles]);
  const useSpotlight = tiles.length > 4;
  const spotlightTile = tiles.find((t) => t.identity === spotlightId) ?? tiles[0];
  const stripTiles = useSpotlight ? tiles.filter((t) => t.identity !== spotlightTile?.identity) : [];
  const gridTiles = useSpotlight ? [] : tiles;

  const renderTile = (tile: TileInfo, tall?: boolean) => (
    <div
      key={tile.identity}
      style={{
        position: "relative",
        background: C.tile,
        borderRadius: 12,
        overflow: "hidden",
        minHeight: tall ? 220 : 120,
        flex: tall ? 1 : undefined,
        width: tall ? "100%" : 96,
        height: tall ? undefined : 96,
        border: tile.speaking ? `2px solid ${C.coral}` : "2px solid transparent",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div id={`media-${tile.identity}`} style={{ position: "absolute", inset: 0 }} />
      {tile.cameraOff && (
        <div
          style={{
            width: tall ? 64 : 36,
            height: tall ? 64 : 36,
            borderRadius: 999,
            background: C.coralInk,
            color: "#fff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontWeight: 700,
            fontSize: tall ? 22 : 14,
            zIndex: 1,
          }}
        >
          {displayInitials(tile.name)}
        </div>
      )}
      <div
        style={{
          position: "absolute",
          left: 8,
          bottom: 8,
          background: "rgba(31,26,18,0.7)",
          color: C.surface,
          padding: "3px 8px",
          borderRadius: 6,
          fontSize: 12,
          zIndex: 2,
        }}
      >
        {tile.name}
      </div>
      <div
        style={{
          position: "absolute",
          top: 8,
          right: 8,
          display: "flex",
          gap: 4,
          zIndex: 2,
        }}
      >
        {tile.isMuted ? (
          <span style={{ background: "rgba(31,26,18,0.7)", color: C.surface, fontSize: 10, padding: "2px 6px", borderRadius: 8 }}>
            Mic off
          </span>
        ) : null}
        {tile.cameraOff ? (
          <span style={{ background: "rgba(31,26,18,0.7)", color: C.surface, fontSize: 10, padding: "2px 6px", borderRadius: 8 }}>
            Cam off
          </span>
        ) : null}
      </div>
    </div>
  );

  return (
    <View style={{ flex: 1, backgroundColor: C.surface }}>
      <View style={s.top}>
        <Text style={s.groupName} numberOfLines={1}>
          {groupName}
        </Text>
        <Text style={s.lesson} numberOfLines={1}>
          {lessonTitle}
        </Text>
      </View>
      {notice ? <Text style={s.notice}>{notice}</Text> : null}

      {phase !== "in-room" ? (
        <View style={s.previewWrap}>
          <div
            ref={previewVideoRef}
            style={{
              width: "100%",
              maxWidth: 420,
              aspectRatio: "3 / 4",
              background: C.stage,
              borderRadius: 16,
              overflow: "hidden",
              position: "relative",
            }}
          />
          {!camEnabled && (
            <Text style={[s.muted, { marginTop: 12 }]}>Camera is off for now.</Text>
          )}
          {phase === "connecting" ? (
            <ActivityIndicator color={C.coral} style={{ marginTop: 16 }} />
          ) : (
            <>
              <View style={s.previewActions}>
                <Pressable onPress={toggleMic} style={[s.pill, micEnabled && s.pillOn]}>
                  <Text style={[s.pillText, micEnabled && s.pillOnText]}>{micEnabled ? "Mic on" : "Mic off"}</Text>
                </Pressable>
                <Pressable onPress={toggleCam} style={[s.pill, camEnabled && s.pillOn]}>
                  <Text style={[s.pillText, camEnabled && s.pillOnText]}>
                    {camEnabled ? "Camera on" : "Camera off"}
                  </Text>
                </Pressable>
                {showFlip && (
                  <Pressable onPress={flipCamera} style={s.pill}>
                    <Text style={s.pillText}>Flip</Text>
                  </Pressable>
                )}
              </View>
              <Pressable onPress={joinRoom} style={s.joinBtn} testID="bible-group-live-join">
                <Text style={s.joinText}>Join</Text>
              </Pressable>
            </>
          )}
        </View>
      ) : (
        <View style={{ flex: 1, backgroundColor: C.stage }}>
          {useSpotlight ? (
            <>
              <View style={{ flex: 1, padding: 4 }}>{spotlightTile ? renderTile(spotlightTile, true) : null}</View>
              <ScrollView horizontal style={{ maxHeight: 112 }} contentContainerStyle={{ gap: 6, padding: 6 }}>
                {stripTiles.map((tile) => renderTile(tile, false))}
              </ScrollView>
            </>
          ) : (
            <div
              style={{
                flex: 1,
                display: "grid",
                gap: 4,
                padding: 4,
                gridTemplateColumns: tiles.length > 1 ? "1fr 1fr" : "1fr",
                gridAutoRows: "1fr",
                minHeight: 0,
              }}
            >
              {gridTiles.map((tile) => renderTile(tile, true))}
            </div>
          )}
        </View>
      )}

      {phase === "in-room" && (
        <View style={s.controls}>
          <Pressable onPress={toggleMic} style={[s.ctrl, micEnabled && s.ctrlOn]}>
            <Ionicons name={micEnabled ? "mic" : "mic-off"} size={20} color={micEnabled ? C.coralInk : C.ink} />
          </Pressable>
          <Pressable onPress={toggleCam} style={[s.ctrl, camEnabled && s.ctrlOn]}>
            <Ionicons name={camEnabled ? "videocam" : "videocam-off"} size={20} color={camEnabled ? C.coralInk : C.ink} />
          </Pressable>
          {showFlip && (
            <Pressable onPress={flipCamera} style={s.ctrl}>
              <Ionicons name="camera-reverse-outline" size={20} color={C.ink} />
            </Pressable>
          )}
          <Pressable onPress={leave} style={s.leaveBtn} testID="bible-group-live-leave">
            <Text style={s.leaveText}>Leave</Text>
          </Pressable>
          {isHost && (
            <Pressable
              onPress={() => {
                if (confirm("End this room for everyone?")) onEndRoom();
              }}
              style={s.endBtn}
              testID="bible-group-live-end"
            >
              <Text style={s.endText}>End room</Text>
            </Pressable>
          )}
        </View>
      )}
    </View>
  );
}

export default function BibleGroupLiveScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const { isAuthenticated, token, user } = useAuth();
  const { isKidsMode } = useKidsMode();
  const qc = useQueryClient();
  const [webViewLoading, setWebViewLoading] = useState(true);

  const { data, isLoading } = useQuery<GroupDetail>({
    queryKey: ["/api/bible-groups", id],
    queryFn: async () => {
      const res = await apiRequest("GET", withDeviceTimeZone(`/api/bible-groups/${id}`));
      return res.json();
    },
    enabled: isAuthenticated && !!id && !isKidsMode,
  });

  const { data: liveData, isLoading: liveLoading, refetch: refetchLive } = useQuery<LiveResponse>({
    queryKey: ["/api/bible-groups", id, "live"],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/bible-groups/${id}/live`);
      return res.json();
    },
    enabled: isAuthenticated && !!id && !isKidsMode,
    staleTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
    refetchInterval: 15_000,
  });

  const isHost = data?.group.role === "host";
  const liveSession =
    liveData?.session && liveData.session.endedAt == null ? liveData.session : null;

  useFocusEffect(
    useCallback(() => {
      if (!isAuthenticated || !id || isKidsMode) return;
      void refetchLive();
    }, [isAuthenticated, id, isKidsMode, refetchLive]),
  );

  useEffect(() => {
    if (isKidsMode) goToProfile();
  }, [isKidsMode]);

  useEffect(() => {
    if (!isHost || !liveSession || !id) return;
    const ping = () => {
      apiRequest("POST", `/api/bible-groups/${id}/live/heartbeat`).catch(() => {});
    };
    ping();
    const timer = setInterval(ping, 60_000);
    return () => clearInterval(timer);
  }, [isHost, liveSession?.id, id]);

  const endMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", `/api/bible-groups/${id}/live/end`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/bible-groups", id, "live"] });
      if (id) goToGroup(id);
    },
  });

  const leaveToGroup = useCallback(() => {
    if (id) goToGroup(id);
  }, [id]);

  const handleWebViewMessage = useCallback(
    (event: any) => {
      try {
        const payload = JSON.parse(event.nativeEvent.data);
        if (payload.type === "end_room") {
          endMutation.mutate();
        } else if (payload.type === "call_ended") {
          leaveToGroup();
        }
      } catch {}
    },
    [endMutation, leaveToGroup],
  );

  if (isKidsMode) {
    return <View style={{ flex: 1, backgroundColor: C.surface }} />;
  }

  if (!isAuthenticated) {
    return (
      <View style={[s.page, { paddingTop: topPad + 8 }]}>
        <Pressable onPress={goToProfile} style={s.backBtn} testID="bible-group-live-back">
          <Ionicons name="arrow-back" size={22} color={C.ink} />
        </Pressable>
        <View style={s.center}>
          <Text style={s.muted}>Sign in to join this room.</Text>
          <Pressable style={s.joinBtn} onPress={() => router.push("/(auth)/login" as any)}>
            <Text style={s.joinText}>Sign in</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  if (isLoading || liveLoading || !data) {
    return (
      <View style={[s.page, { paddingTop: topPad + 8 }]}>
        <ActivityIndicator color={C.coral} style={{ marginTop: 48 }} />
      </View>
    );
  }

  const week = data.group.currentWeek;
  const lessonTitle = week
    ? `Lesson ${week.lessonNumber} · ${week.lessonTitle}`
    : "This week's lesson";

  if (!liveSession) {
    return (
      <View style={[s.page, { paddingTop: topPad + 8 }]}>
        <Pressable onPress={leaveToGroup} style={s.backBtn}>
          <Ionicons name="arrow-back" size={22} color={C.ink} />
        </Pressable>
        <View style={s.center}>
          <Text style={s.muted}>This room has ended.</Text>
          <Pressable style={s.joinBtn} onPress={leaveToGroup}>
            <Text style={s.joinText}>Back to group</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  const roomUrl = new URL(joinApiPath(getApiUrl(), `/api/bible-groups/${id}/room`));
  if (token) roomUrl.searchParams.set("accessToken", token);
  roomUrl.searchParams.set("displayName", user?.displayName || "Member");

  return (
    <View style={[s.page, { paddingTop: topPad }]}>
      {Platform.OS === "web" ? (
        <WebLiveRoom
          groupId={id!}
          groupName={data.group.name}
          lessonTitle={lessonTitle}
          isHost={!!isHost}
          onLeave={leaveToGroup}
          onEndRoom={() => endMutation.mutate()}
        />
      ) : (
        <>
          <View style={s.top}>
            <Text style={s.groupName} numberOfLines={1}>
              {data.group.name}
            </Text>
            <Text style={s.lesson} numberOfLines={1}>
              {lessonTitle}
            </Text>
          </View>
          {webViewLoading && (
            <View style={s.webviewLoading}>
              <ActivityIndicator color={C.coral} />
            </View>
          )}
          <WebView
            source={{
              uri: roomUrl.toString(),
              headers: token ? { Authorization: `Bearer ${token}` } : {},
            }}
            style={{ flex: 1 }}
            javaScriptEnabled
            domStorageEnabled
            mediaPlaybackRequiresUserAction={false}
            allowsInlineMediaPlayback
            mediaCapturePermissionGrantType="grant"
            androidLayerType="hardware"
            onLoadEnd={() => setWebViewLoading(false)}
            onMessage={handleWebViewMessage}
            originWhitelist={["https://*", "http://*"]}
            onAndroidPermissionRequest={(resources: string[], grant: (r: string[]) => void) => {
              grant(resources);
            }}
          />
          {isHost && (
            <Pressable
              onPress={() => {
                Alert.alert("End room", "End this room for everyone?", [
                  { text: "Cancel", style: "cancel" },
                  { text: "End room", style: "destructive", onPress: () => endMutation.mutate() },
                ]);
              }}
              style={s.nativeEnd}
            >
              <Text style={s.endText}>End room</Text>
            </Pressable>
          )}
        </>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: C.surface },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: C.card,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 20,
    marginBottom: 12,
  },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 16, padding: 24 },
  top: {
    paddingHorizontal: 20,
    paddingBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#E7E0D2",
    backgroundColor: C.surface,
  },
  groupName: { fontSize: 16, fontFamily: "Lora_700Bold", color: C.ink },
  lesson: { fontSize: 13, fontFamily: "Inter_400Regular", color: C.inkMuted, marginTop: 2 },
  notice: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: C.inkMuted,
  },
  muted: { fontSize: 15, fontFamily: "Inter_400Regular", color: C.inkMuted, textAlign: "center" },
  previewWrap: { flex: 1, alignItems: "center", justifyContent: "center", padding: 20, gap: 16 },
  previewActions: { flexDirection: "row", gap: 10, flexWrap: "wrap", justifyContent: "center" },
  pill: {
    borderWidth: 1.5,
    borderColor: "#E7E0D2",
    borderRadius: 24,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: C.card,
  },
  pillOn: { borderColor: C.coral },
  pillText: { fontFamily: "Inter_600SemiBold", fontSize: 13, color: C.ink },
  pillOnText: { color: C.coralInk },
  joinBtn: {
    backgroundColor: C.coral,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 28,
    alignItems: "center",
  },
  joinText: { color: "#fff", fontFamily: "Inter_600SemiBold", fontSize: 15 },
  controls: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 10,
    flexWrap: "wrap",
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: C.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#E7E0D2",
  },
  ctrl: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: "#E7E0D2",
    backgroundColor: C.card,
    alignItems: "center",
    justifyContent: "center",
  },
  ctrlOn: { borderColor: C.coral },
  leaveBtn: {
    height: 48,
    paddingHorizontal: 16,
    borderRadius: 24,
    backgroundColor: C.ink,
    alignItems: "center",
    justifyContent: "center",
  },
  leaveText: { color: C.surface, fontFamily: "Inter_600SemiBold", fontSize: 14 },
  endBtn: {
    height: 48,
    paddingHorizontal: 16,
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: C.coral,
    backgroundColor: C.card,
    alignItems: "center",
    justifyContent: "center",
  },
  endText: { color: C.coralInk, fontFamily: "Inter_600SemiBold", fontSize: 14 },
  nativeEnd: {
    alignItems: "center",
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#E7E0D2",
  },
  webviewLoading: {
    ...StyleSheet.absoluteFill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: C.surface,
    zIndex: 10,
  },
});
