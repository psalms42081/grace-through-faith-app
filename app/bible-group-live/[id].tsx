import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Platform,
  ActivityIndicator,
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
import { confirmWebSafe } from "@/components/WebSafeConfirm";
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

type TrackOwner = "preview" | "room";

type HeldLiveTracks = {
  groupId: string;
  tracks: any[];
  owner: TrackOwner;
  facingUser: boolean;
};

/**
 * Survives preview→room phase changes, React Strict Mode remounts, and
 * WebLiveRoom unmount while Join has already taken the tracks.
 * Preview unmount must not stop() tracks the room now owns.
 */
let heldLiveTracks: HeldLiveTracks | null = null;
let liveRoomMounts = 0;
/** In-flight createLocalTracks. Join must await this instead of starting a second getUserMedia. */
let acquirePromise: Promise<any[]> | null = null;

const TALL_TILE_MIN_PX = 240;
const STRIP_TILE_PX = 96;

function mediaReadyState(track: any): string {
  return track?.mediaStreamTrack?.readyState ?? "unknown";
}

function tracksInclude(held: any[] | undefined, tracks: any[]): boolean {
  if (!held?.length) return false;
  return tracks.some((t) => held.includes(t));
}

function stopLocalTracks(tracks: any[], reason: string) {
  if (!tracks.length) return;
  console.log("[bible-group-live] preview stream stopped", reason, tracks.map((t) => t.kind));
  tracks.forEach((t) => {
    try {
      t.stop();
    } catch {}
  });
}

function stopOrphanTracks(tracks: any[], reason: string) {
  if (!tracks.length) return;
  if (heldLiveTracks?.owner === "room" && tracksInclude(heldLiveTracks.tracks, tracks)) {
    console.log("[bible-group-live] skip stop, room owns tracks", reason);
    return;
  }
  stopLocalTracks(tracks, reason);
}

function adoptPreviewTracks(groupId: string, tracks: any[], facingUser: boolean) {
  if (heldLiveTracks?.owner === "room" && heldLiveTracks.groupId === groupId) {
    stopOrphanTracks(tracks, "room already owns camera");
    return;
  }
  if (heldLiveTracks?.owner === "preview" && !tracksInclude(heldLiveTracks.tracks, tracks)) {
    stopLocalTracks(heldLiveTracks.tracks, "replace preview tracks");
  }
  heldLiveTracks = { groupId, tracks, owner: "preview", facingUser };
}

function transferHeldToRoom(groupId: string): any[] {
  if (!heldLiveTracks || heldLiveTracks.groupId !== groupId) return [];
  heldLiveTracks.owner = "room";
  return heldLiveTracks.tracks.slice();
}

function currentTrackOwner(): TrackOwner | "none" {
  return heldLiveTracks?.owner ?? "none";
}

function heldVideoTrack(): any | undefined {
  return heldLiveTracks?.tracks.find((t) => t.kind === "video");
}

function heldAudioTrack(): any | undefined {
  return heldLiveTracks?.tracks.find((t) => t.kind === "audio");
}

function disableStopOnMute(tracks: any[]) {
  tracks.forEach((t) => {
    try {
      t.stopOnMute = false;
    } catch {}
  });
}

async function restartFacingOnHeld(facingUser: boolean) {
  const video = heldVideoTrack();
  if (!video?.restartTrack) return;
  await video.restartTrack({ facingMode: facingUser ? "user" : "environment" });
  if (heldLiveTracks) heldLiveTracks.facingUser = facingUser;
}

/**
 * Exactly one getUserMedia/createLocalTracks per session.
 * Reuses held tracks (including owner === "room") and coalesces concurrent callers.
 */
async function acquireOnce(lk: any, groupId: string, facingUser: boolean): Promise<any[]> {
  if (heldLiveTracks?.groupId === groupId && heldLiveTracks.tracks.length) {
    if (heldLiveTracks.owner !== "room" && heldLiveTracks.facingUser !== facingUser) {
      await restartFacingOnHeld(facingUser);
    }
    return heldLiveTracks.tracks;
  }
  if (acquirePromise) return acquirePromise;
  acquirePromise = (async () => {
    console.log("[bible-group-live] acquiring local tracks (once)");
    const tracks = await lk.createLocalTracks({
      audio: true,
      video: {
        facingMode: facingUser ? "user" : "environment",
        resolution: lk.VideoPresets.h360.resolution,
      },
    });
    disableStopOnMute(tracks);
    adoptPreviewTracks(groupId, tracks, facingUser);
    return tracks;
  })().finally(() => {
    acquirePromise = null;
  });
  return acquirePromise;
}

function releasePreviewOnIdleUnmount() {
  if (liveRoomMounts > 0) return;
  if (heldLiveTracks?.owner === "preview") {
    stopLocalTracks(heldLiveTracks.tracks, "unmount preview");
    heldLiveTracks = null;
  }
}

function detachLocalTracks(tracks: any[]) {
  tracks.forEach((t) => {
    try {
      t.detach().forEach((el: HTMLElement) => el.remove());
    } catch {}
  });
}

function ensureHostHasSize(host: HTMLElement, minHeight: number) {
  host.style.position = "absolute";
  host.style.top = "0";
  host.style.left = "0";
  host.style.right = "0";
  host.style.bottom = "0";
  host.style.width = "100%";
  host.style.height = "100%";
  host.style.minHeight = `${minHeight}px`;
  host.style.minWidth = "120px";
  const rect = host.getBoundingClientRect();
  if (rect.width < 2 || rect.height < 2) {
    host.style.height = `${minHeight}px`;
  }
}

/** Mobile Chrome will not paint local video unless autoplay + playsinline + muted are all set. */
function prepareAttachedVideo(el: HTMLVideoElement, isLocal: boolean, facingUser: boolean) {
  el.autoplay = true;
  el.muted = true;
  el.playsInline = true;
  el.setAttribute("autoplay", "");
  el.setAttribute("muted", "");
  el.setAttribute("playsinline", "");
  el.setAttribute("webkit-playsinline", "");
  el.style.width = "100%";
  el.style.height = "100%";
  el.style.minHeight = "100%";
  el.style.objectFit = "cover";
  el.style.position = "absolute";
  el.style.top = "0";
  el.style.left = "0";
  el.style.right = "0";
  el.style.bottom = "0";
  if (isLocal && facingUser) el.style.transform = "scaleX(-1)";
  else el.style.transform = "";
  void el.play().catch(() => {});
}

function attachTrackToHost(
  track: any,
  hostId: string,
  isLocal: boolean,
  facingUser: boolean,
  onLocalVideo?: (el: HTMLVideoElement) => void,
  attempt = 0,
) {
  if (typeof document === "undefined") return;
  if (isLocal && track.kind === "audio") return;
  const host = document.getElementById(hostId);
  if (!host) {
    if (attempt < 40) {
      requestAnimationFrame(() =>
        attachTrackToHost(track, hostId, isLocal, facingUser, onLocalVideo, attempt + 1),
      );
    } else {
      console.log("[bible-group-live] track attach skipped, host missing", hostId, track.kind);
    }
    return;
  }
  const minHeight = host.getAttribute("data-tall") === "1" ? TALL_TILE_MIN_PX : STRIP_TILE_PX;
  ensureHostHasSize(host, minHeight);
  const existing = host.querySelector(`[data-track-kind="${track.kind}"]`);
  if (existing) existing.remove();
  let el: HTMLMediaElement;
  if (track.kind === "video") {
    const video = document.createElement("video");
    video.autoplay = true;
    video.muted = true;
    video.playsInline = true;
    video.setAttribute("autoplay", "");
    video.setAttribute("muted", "");
    video.setAttribute("playsinline", "");
    video.setAttribute("webkit-playsinline", "");
    el = track.attach(video);
    prepareAttachedVideo(el as HTMLVideoElement, isLocal, facingUser);
    if (isLocal) onLocalVideo?.(el as HTMLVideoElement);
  } else {
    el = track.attach();
    el.style.display = "none";
  }
  el.setAttribute("data-track-kind", track.kind);
  host.appendChild(el);
  console.log("[bible-group-live] track attached", {
    kind: track.kind,
    sid: track.sid,
    isLocal,
    hostId,
    hostSize: `${host.clientWidth}x${host.clientHeight}`,
    readyState: mediaReadyState(track),
  });
}

function readDebugFlag(param: unknown): boolean {
  const raw = Array.isArray(param) ? param[0] : param;
  if (raw === "1" || raw === "true") return true;
  if (typeof window === "undefined") return false;
  try {
    const q = new URLSearchParams(window.location.search).get("debug");
    return q === "1" || q === "true";
  } catch {
    return false;
  }
}

function WebLiveRoom({
  groupId,
  groupName,
  lessonTitle,
  isHost,
  debugEnabled,
  onLeave,
  onEndRoom,
}: {
  groupId: string;
  groupName: string;
  lessonTitle: string;
  isHost: boolean;
  debugEnabled: boolean;
  onLeave: () => void;
  onEndRoom: () => void;
}) {
  const roomRef = useRef<any>(null);
  const lkRef = useRef<any>(null);
  const previewTracksRef = useRef<any[]>([]);
  const joiningRef = useRef(false);
  const attachedRef = useRef<Map<string, { track: any; isLocal: boolean }[]>>(new Map());
  const previewVideoRef = useRef<any>(null);
  const localVideoElRef = useRef<HTMLVideoElement | null>(null);
  const lastErrorRef = useRef<string>("");
  const [phase, setPhase] = useState<"preview" | "connecting" | "in-room">("preview");
  const [notice, setNotice] = useState<string | null>(null);
  const [micEnabled, setMicEnabled] = useState(true);
  const [camEnabled, setCamEnabled] = useState(true);
  const [facingUser, setFacingUser] = useState(true);
  const [tiles, setTiles] = useState<TileInfo[]>([]);
  const [debugLines, setDebugLines] = useState<string[]>([]);
  const [showFlip] = useState(() => {
    if (Platform.OS !== "web") return true;
    if (typeof window === "undefined") return false;
    return window.matchMedia?.("(pointer: coarse)").matches ?? false;
  });

  const setLastError = useCallback((msg: string) => {
    lastErrorRef.current = msg;
    setNotice(msg);
  }, []);

  const onLocalVideo = useCallback((el: HTMLVideoElement) => {
    localVideoElRef.current = el;
  }, []);

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
    liveRoomMounts += 1;
    return () => {
      liveRoomMounts -= 1;
      const room = roomRef.current;
      roomRef.current = null;
      previewTracksRef.current = [];
      queueMicrotask(() => {
        if (liveRoomMounts > 0) return;
        if (room) room.disconnect().catch(() => {});
        releasePreviewOnIdleUnmount();
      });
    };
  }, []);

  useEffect(() => {
    if (phase !== "in-room") return;
    tiles.forEach((tile) => {
      const rows = attachedRef.current.get(tile.identity) ?? [];
      rows.forEach(({ track, isLocal }) => {
        attachTrackToHost(track, `media-${tile.identity}`, isLocal, facingUser, onLocalVideo);
      });
    });
  }, [tiles, facingUser, phase, onLocalVideo]);

  useEffect(() => {
    if (!debugEnabled) return;
    const tick = () => {
      const room = roomRef.current;
      const identity = room?.localParticipant?.identity;
      const rows = identity ? attachedRef.current.get(identity) ?? [] : [];
      const videoTrack =
        rows.find((r) => r.track?.kind === "video")?.track ||
        previewTracksRef.current.find((t) => t.kind === "video") ||
        heldLiveTracks?.tracks.find((t) => t.kind === "video");
      const pub = room?.localParticipant?.getTrackPublication?.(lkRef.current?.Track?.Source?.Camera);
      const el = localVideoElRef.current;
      const pubState = pub
        ? `${pub.muted ? "muted" : "unmuted"}/${pub.trackSid ? "published" : "no-sid"}`
        : phase === "in-room"
          ? "no-publication"
          : "preview";
      setDebugLines([
        `readyState ${mediaReadyState(videoTrack)}`,
        `track.muted ${videoTrack?.isMuted ?? videoTrack?.muted ?? "n/a"}`,
        `publication ${pubState}`,
        `video ${el ? `${el.videoWidth}×${el.videoHeight}` : "no-el"}`,
        `paused ${el ? String(el.paused) : "n/a"}`,
        `host ${el?.parentElement ? `${el.parentElement.clientWidth}×${el.parentElement.clientHeight}` : "n/a"}`,
        `error ${lastErrorRef.current || "none"}`,
        `owner ${heldLiveTracks?.owner ?? "none"} phase ${phase}`,
      ]);
    };
    tick();
    const id = setInterval(tick, 500);
    return () => clearInterval(id);
  }, [debugEnabled, phase, tiles, camEnabled]);

  useEffect(() => {
    let cancelled = false;
    function attachPreview(tracks: any[]) {
      previewTracksRef.current = tracks;
      const video = tracks.find((t: any) => t.kind === "video");
      if (video && previewVideoRef.current) {
        const el = video.attach() as HTMLVideoElement;
        prepareAttachedVideo(el, true, facingUser);
        el.style.position = "relative";
        el.style.inset = "";
        el.style.minHeight = "240px";
        previewVideoRef.current.innerHTML = "";
        previewVideoRef.current.appendChild(el);
        localVideoElRef.current = el;
      }
    }
    async function startPreview() {
      if (currentTrackOwner() === "room") return;
      try {
        const lk = await import("livekit-client");
        if (cancelled || currentTrackOwner() === "room") return;
        lkRef.current = lk;
        const tracks = await acquireOnce(lk, groupId, facingUser);
        if (currentTrackOwner() === "room") return;
        if (cancelled && joiningRef.current) return;
        attachPreview(tracks);
        console.log(
          "[bible-group-live] preview stream ready",
          tracks.map((t: any) => ({ kind: t.kind, sid: t.sid, readyState: mediaReadyState(t) })),
        );
      } catch (err: any) {
        lastErrorRef.current = err?.message || "Could not start camera";
        if (heldLiveTracks?.tracks.length || currentTrackOwner() === "room") return;
        try {
          const lk = lkRef.current || (await import("livekit-client"));
          if (heldLiveTracks?.tracks.length || acquirePromise) return;
          const audioOnly = await lk.createLocalTracks({ audio: true, video: false });
          if (currentTrackOwner() === "room" || joiningRef.current) {
            stopOrphanTracks(audioOnly, "join already started");
            return;
          }
          disableStopOnMute(audioOnly);
          adoptPreviewTracks(groupId, audioOnly, facingUser);
          attachPreview(audioOnly);
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
      // Do not stop() here. Phase change to connecting, Strict Mode remount,
      // and Join handoff all unmount this effect while the room still needs the tracks.
    };
    // Recreate preview only when returning to preview for this group — never on facingUser
    // (flip uses restartTrack on the existing capture).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, groupId]);

  const joinRoom = useCallback(async () => {
    joiningRef.current = true;
    setPhase("connecting");
    try {
      const lk = lkRef.current || (await import("livekit-client"));
      lkRef.current = lk;
      if (acquirePromise) {
        try {
          await acquirePromise;
        } catch {}
      }
      if (!heldLiveTracks?.tracks.length) {
        await acquireOnce(lk, groupId, facingUser);
      }
      const tracksToPublish = transferHeldToRoom(groupId);
      detachLocalTracks(tracksToPublish);
      previewTracksRef.current = [];

      if (!tracksToPublish.length) {
        joiningRef.current = false;
        lastErrorRef.current = "No camera/mic tracks to publish";
        setNotice("Camera is not ready. Wait a moment and try Join again.");
        setPhase("preview");
        return;
      }

      const tokenRes = await apiRequest("POST", `/api/bible-groups/${groupId}/live/token`);
      const body: TokenResponse = await tokenRes.json();
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
        const track = pub.track;
        console.log("[bible-group-live] local track published", {
          kind: track?.kind ?? pub.kind,
          sid: track?.sid ?? pub.trackSid,
          readyState: mediaReadyState(track),
        });
        if (track) {
          rememberTrack(room.localParticipant.identity, track, true);
          attachTrackToHost(track, `media-${room.localParticipant.identity}`, true, facingUser, onLocalVideo);
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
        if (heldLiveTracks?.owner === "room") heldLiveTracks = null;
        onLeave();
      });

      await room.connect(body.wsUrl, body.token);
      console.log("[bible-group-live] room connected", {
        roomName: body.roomName,
        identity: room.localParticipant?.identity,
        localSid: room.localParticipant?.sid,
      });

      for (const track of tracksToPublish) {
        const publishVideo = track.kind === "video" && camEnabled;
        const publishAudio = track.kind === "audio" && micEnabled;
        if (publishVideo || publishAudio) {
          await room.localParticipant.publishTrack(track);
        } else if (track.kind === "video") {
          try {
            await track.mute();
          } catch {}
        } else if (track.kind === "audio") {
          try {
            await track.mute();
          } catch {}
        }
      }

      refresh();
      setPhase("in-room");
    } catch (err: any) {
      joiningRef.current = false;
      try {
        await roomRef.current?.disconnect();
      } catch {}
      roomRef.current = null;
      if (heldLiveTracks?.owner === "room") {
        heldLiveTracks.owner = "preview";
      }
      lastErrorRef.current = err?.message || "Could not join the room.";
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
    onLocalVideo,
    rememberTrack,
  ]);

  const toggleMic = useCallback(async () => {
    const next = !micEnabled;
    setMicEnabled(next);
    const room = roomRef.current;
    const audio = heldAudioTrack();
    if (phase === "preview" || !room) {
      previewTracksRef.current.forEach((t) => {
        if (t.kind === "audio") {
          if (next) t.unmute();
          else t.mute();
        }
      });
      return;
    }
    try {
      if (audio) {
        if (next) await audio.unmute();
        else await audio.mute();
      } else {
        const pub = room.localParticipant.getTrackPublication(lkRef.current?.Track?.Source?.Microphone);
        if (next) await pub?.unmute();
        else await pub?.mute();
      }
    } catch {
      setMicEnabled(!next);
      setNotice("Microphone could not be changed.");
    }
  }, [micEnabled, phase]);

  const toggleCam = useCallback(async () => {
    const next = !camEnabled;
    setCamEnabled(next);
    const room = roomRef.current;
    const video = heldVideoTrack();
    if (phase === "preview" || !room) {
      previewTracksRef.current.forEach((t) => {
        if (t.kind === "video") {
          if (next) t.unmute();
          else t.mute();
        }
      });
      return;
    }
    try {
      if (video) {
        if (next) await video.unmute();
        else await video.mute();
      } else {
        const pub = room.localParticipant.getTrackPublication(lkRef.current?.Track?.Source?.Camera);
        if (!pub?.track) throw new Error("no camera track");
        if (next) await pub.unmute();
        else await pub.mute();
      }
    } catch (err: any) {
      setCamEnabled(!next);
      lastErrorRef.current = err?.message || "Camera could not be changed.";
      setLastError("Camera could not be changed.");
    }
  }, [camEnabled, phase, setLastError]);

  const flipCamera = useCallback(async () => {
    const nextFacing = !facingUser;
    try {
      await restartFacingOnHeld(nextFacing);
      setFacingUser(nextFacing);
      const video = heldVideoTrack();
      const el = localVideoElRef.current;
      if (el && video) {
        el.style.transform = nextFacing ? "scaleX(-1)" : "";
      }
    } catch (err: any) {
      lastErrorRef.current = err?.message || "Could not flip the camera.";
      setLastError("Could not flip the camera.");
    }
  }, [facingUser, setLastError]);

  const leave = useCallback(() => {
    const room = roomRef.current;
    if (heldLiveTracks?.owner === "room") heldLiveTracks = null;
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
        minHeight: tall ? TALL_TILE_MIN_PX : STRIP_TILE_PX,
        flex: tall ? 1 : undefined,
        width: tall ? "100%" : STRIP_TILE_PX,
        height: tall ? "100%" : STRIP_TILE_PX,
        border: tile.speaking ? `2px solid ${C.coral}` : "2px solid transparent",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        id={`media-${tile.identity}`}
        data-tall={tall ? "1" : "0"}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          minHeight: tall ? TALL_TILE_MIN_PX : STRIP_TILE_PX,
          minWidth: 1,
        }}
      />
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
      {debugEnabled ? (
        <View style={s.debugStrip} testID="bible-group-live-debug">
          {debugLines.map((line, i) => (
            <Text key={i} style={s.debugText}>
              {line}
            </Text>
          ))}
        </View>
      ) : null}

      {phase !== "in-room" ? (
        <View style={s.previewWrap}>
          <div
            ref={previewVideoRef}
            style={{
              width: "100%",
              height: "100%",
              minHeight: 320,
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
        <View style={{ flex: 1, height: "100%", minHeight: TALL_TILE_MIN_PX, backgroundColor: C.stage }}>
          {useSpotlight ? (
            <>
              <View style={{ flex: 1, height: "100%", minHeight: TALL_TILE_MIN_PX, padding: 4 }}>
                {spotlightTile ? renderTile(spotlightTile, true) : null}
              </View>
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
                width: "100%",
                height: "100%",
                minHeight: TALL_TILE_MIN_PX,
                gridTemplateColumns: tiles.length > 1 ? "1fr 1fr" : "1fr",
                gridAutoRows: "minmax(240px, 1fr)",
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
  const { id, debug } = useLocalSearchParams<{ id: string; debug?: string | string[] }>();
  const debugEnabled = readDebugFlag(debug);
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
  if (debugEnabled) roomUrl.searchParams.set("debug", "1");

  return (
    <View style={[s.page, { paddingTop: topPad }]}>
      {Platform.OS === "web" ? (
        <WebLiveRoom
          groupId={id!}
          groupName={data.group.name}
          lessonTitle={lessonTitle}
          isHost={!!isHost}
          debugEnabled={debugEnabled}
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
                void confirmWebSafe({
                  title: "End room",
                  message: "End this room for everyone?",
                  confirmLabel: "End room",
                  destructive: true,
                }).then((ok) => {
                  if (ok) endMutation.mutate();
                });
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
  debugStrip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "#16150F",
  },
  debugText: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: "#E7E0D2",
    lineHeight: 16,
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
