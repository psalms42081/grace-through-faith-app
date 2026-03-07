import { useCallback, useEffect, useRef, useState } from "react";
import { Platform, ScrollView } from "react-native";
import { createAudioPlayer, setAudioModeAsync } from "expo-audio";
import type { AudioPlayer } from "expo-audio";

import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Speech from "expo-speech";
import { getApiUrl } from "@/lib/query-client";
import { useAudioContext } from "@/contexts/AudioContext";

const VOICE_STORAGE_KEY = "@grace-through-faith/tts-voice";
const isMobile = Platform.OS === "ios" || Platform.OS === "android";

const AI_VOICE_OPTIONS = [
  { id: "george", label: "George", description: "Warm, captivating British storyteller", gender: "male" },
  { id: "daniel", label: "Daniel", description: "Steady, authoritative British broadcaster", gender: "male" },
  { id: "brian", label: "Brian", description: "Deep, resonant, comforting", gender: "male" },
  { id: "callum", label: "Callum", description: "Husky, American", gender: "male" },
  { id: "sarah", label: "Sarah", description: "Mature, reassuring, confident", gender: "female" },
  { id: "lily", label: "Lily", description: "Velvety, British actress", gender: "female" },
  { id: "alice", label: "Alice", description: "Clear, engaging British educator", gender: "female" },
] as const;

export type AIVoiceId = (typeof AI_VOICE_OPTIONS)[number]["id"];
export { AI_VOICE_OPTIONS };

export interface DeviceVoice {
  identifier: string;
  name: string;
  language: string;
  quality: string;
}

interface Verse {
  id: string;
  verse: number;
  text: string;
}

const SPEED_OPTIONS = [0.75, 1, 1.25, 1.5] as const;
export { SPEED_OPTIONS };

export interface UseBibleAudioReturn {
  isSpeaking: boolean;
  isPaused: boolean;
  speakingVerseIndex: number;
  speechRate: number;
  showSpeedPicker: boolean;
  showVoicePicker: boolean;
  selectedVoice: string;
  selectedDeviceVoiceId: string | null;
  deviceVoices: DeviceVoice[];
  isLoadingAudio: boolean;
  usingFallback: boolean;
  isActive: boolean;
  currentVoiceLabel: string;
  setShowSpeedPicker: (v: boolean) => void;
  setShowVoicePicker: (v: boolean) => void;
  handlePlay: () => void;
  handlePause: () => void;
  handleStop: () => void;
  handleSpeedChange: (rate: number) => void;
  handleVoiceChange: (voiceId: string, deviceVoiceIdentifier?: string) => void;
  resetPlayback: () => void;
}

export default function useBibleAudio(
  verses: Verse[],
  bookId: string,
  chapter: string,
  translation: string,
  scrollViewRef: React.RefObject<ScrollView | null>,
  bookName?: string,
): UseBibleAudioReturn {
  const audioCtx = useAudioContext();
  const audioCtxRef = useRef(audioCtx);
  useEffect(() => { audioCtxRef.current = audioCtx; }, [audioCtx]);

  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [speakingVerseIndex, setSpeakingVerseIndex] = useState(-1);
  const [speechRate, setSpeechRate] = useState(1);
  const [showSpeedPicker, setShowSpeedPicker] = useState(false);
  const [showVoicePicker, setShowVoicePicker] = useState(false);
  const [selectedVoice, setSelectedVoice] = useState("george");
  const [selectedDeviceVoiceId, setSelectedDeviceVoiceId] = useState<string | null>(null);
  const [deviceVoices, setDeviceVoices] = useState<DeviceVoice[]>([]);
  const [isLoadingAudio, setIsLoadingAudio] = useState(false);
  const [usingFallback, setUsingFallback] = useState(false);

  const sessionRef = useRef(0);
  const currentIndexRef = useRef(-1);
  const versesRef = useRef<Verse[]>([]);
  const speechRateRef = useRef(1);
  const playerRef = useRef<AudioPlayer | null>(null);
  const selectedVoiceRef = useRef("george");
  const selectedDeviceVoiceIdRef = useRef<string | null>(null);
  const mountedRef = useRef(true);
  const playbackTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const batchInfoRef = useRef<{ startIndex: number; endIndex: number; charOffsets: number[] } | null>(null);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  useEffect(() => {
    versesRef.current = verses;
  }, [verses]);

  useEffect(() => {
    AsyncStorage.getItem(VOICE_STORAGE_KEY).then((saved) => {
      if (saved && AI_VOICE_OPTIONS.some((v) => v.id === saved)) {
        setSelectedVoice(saved);
        selectedVoiceRef.current = saved;
      }
    }).catch(() => {});
  }, []);

  useEffect(() => {
    setAudioModeAsync({
      playsInSilentMode: true,
      shouldPlayInBackground: true,
    }).catch(() => {});
  }, []);

  useEffect(() => {
    audioCtx.updatePlaybackState({
      isSpeaking,
      isPaused,
      speakingVerseIndex,
      isLoadingAudio,
    });
  }, [isSpeaking, isPaused, speakingVerseIndex, isLoadingAudio]);

  useEffect(() => {
    audioCtx.setControls({
      play: () => handlePlayRef.current(),
      pause: () => handlePauseRef.current(),
      stop: () => handleStopRef.current(),
    });
  }, []);

  const handlePlayRef = useRef(() => {});
  const handlePauseRef = useRef(() => {});
  const handleStopRef = useRef(() => {});

  const cleanupPlayer = useCallback(() => {
    if (playbackTimeoutRef.current) {
      clearTimeout(playbackTimeoutRef.current);
      playbackTimeoutRef.current = null;
    }
    if (playerRef.current) {
      try {
        playerRef.current.pause();
      } catch {}
      try {
        playerRef.current.remove();
      } catch {}
      playerRef.current = null;
    }
    batchInfoRef.current = null;
  }, []);

  const resetPlayback = useCallback(() => {
    sessionRef.current += 1;
    cleanupPlayer();
    Speech.stop();
    setIsSpeaking(false);
    setIsPaused(false);
    setSpeakingVerseIndex(-1);
    setIsLoadingAudio(false);
    setUsingFallback(false);
    currentIndexRef.current = -1;
    audioCtxRef.current.clearSession();
  }, [cleanupPlayer]);

  useEffect(() => {
    resetPlayback();
  }, [bookId, chapter, translation, resetPlayback]);

  const scrollToVerseEstimate = useCallback((index: number) => {
    if (index < 0 || !scrollViewRef.current) return;
    const vrs = versesRef.current;
    if (!vrs.length) return;
    const headerHeight = 120;
    const avgCharsPerLine = 35;
    const lineHeight = 34;
    let yOffset = headerHeight;
    for (let i = 0; i < index; i++) {
      const charCount = vrs[i].text.length + 4;
      const lines = Math.ceil(charCount / avgCharsPerLine);
      yOffset += lines * lineHeight;
    }
    const targetY = Math.max(0, yOffset - 120);
    scrollViewRef.current.scrollTo({ y: targetY, animated: true });
  }, [scrollViewRef]);

  useEffect(() => {
    if (speakingVerseIndex >= 0 && (isSpeaking || isPaused)) {
      scrollToVerseEstimate(speakingVerseIndex);
    }
  }, [speakingVerseIndex, isSpeaking, isPaused, scrollToVerseEstimate]);

  const speakVerseFallback = useCallback((index: number, session: number) => {
    if (session !== sessionRef.current) return;

    const vrs = versesRef.current;
    if (index < 0 || index >= vrs.length) {
      setIsSpeaking(false);
      setIsPaused(false);
      setSpeakingVerseIndex(-1);
      currentIndexRef.current = -1;
      audioCtxRef.current.clearSession();
      return;
    }

    currentIndexRef.current = index;
    setSpeakingVerseIndex(index);

    const verse = vrs[index];
    const textToSpeak = verse.text;

    const speechOptions: any = {
      rate: speechRateRef.current,
      voice: selectedDeviceVoiceIdRef.current || undefined,
      onDone: () => {
        if (session === sessionRef.current) {
          speakVerseFallback(index + 1, session);
        }
      },
      onStopped: () => {},
      onError: () => {
        if (session === sessionRef.current) {
          setIsSpeaking(false);
          setIsPaused(false);
          setSpeakingVerseIndex(-1);
          audioCtxRef.current.clearSession();
        }
      },
    };

    try {
      Speech.speak(textToSpeak, speechOptions);
    } catch {
      setIsSpeaking(false);
      setIsPaused(false);
      setSpeakingVerseIndex(-1);
      currentIndexRef.current = -1;
      audioCtxRef.current.clearSession();
    }
  }, []);

  const BATCH_SIZE = 3;

  const speakVerseAI = useCallback(async (index: number, session: number) => {
    if (session !== sessionRef.current) return;

    const vrs = versesRef.current;
    if (index < 0 || index >= vrs.length) {
      setIsSpeaking(false);
      setIsPaused(false);
      setSpeakingVerseIndex(-1);
      setIsLoadingAudio(false);
      currentIndexRef.current = -1;
      audioCtxRef.current.clearSession();
      return;
    }

    currentIndexRef.current = index;
    setSpeakingVerseIndex(index);
    setIsLoadingAudio(true);

    const batchEnd = Math.min(index + BATCH_SIZE, vrs.length);
    const batchVerses = vrs.slice(index, batchEnd);
    const textToSpeak = batchVerses
      .map((v) => v.text)
      .join(" ");

    const charOffsets: number[] = [];
    let cumulative = 0;
    for (let i = 0; i < batchVerses.length; i++) {
      charOffsets.push(cumulative);
      cumulative += batchVerses[i].text.length + 1;
    }
    const totalChars = cumulative;

    try {
      const apiUrl = getApiUrl();
      const prepareUrl = new URL("/api/tts/prepare", apiUrl);

      console.log("[TTS speakVerseAI] Calling prepare:", prepareUrl.href, "voice:", selectedVoiceRef.current, "text length:", textToSpeak.length);

      let prepareRes: Response | null = null;
      for (let attempt = 0; attempt < 3; attempt++) {
        if (session !== sessionRef.current) return;
        try {
          prepareRes = await fetch(prepareUrl.href, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text: textToSpeak, voice: selectedVoiceRef.current }),
          });
          if (prepareRes.ok) break;
          console.log(`[TTS speakVerseAI] Prepare attempt ${attempt + 1} failed: ${prepareRes.status}`);
          prepareRes = null;
          if (attempt < 2) await new Promise(r => setTimeout(r, 1000));
        } catch (fetchErr: any) {
          console.log(`[TTS speakVerseAI] Prepare attempt ${attempt + 1} error:`, fetchErr.message);
          if (attempt < 2) await new Promise(r => setTimeout(r, 1000));
        }
      }

      if (!prepareRes || !prepareRes.ok) {
        const errBody = prepareRes ? await prepareRes.text().catch(() => "") : "no response";
        console.log("[TTS speakVerseAI] Prepare failed after retries:", prepareRes?.status, errBody);
        throw new Error(`TTS prepare failed: ${prepareRes?.status || "network"}`);
      }

      const { audioId } = await prepareRes.json();
      console.log("[TTS speakVerseAI] Prepare succeeded, audioId:", audioId);

      if (session !== sessionRef.current) {
        console.log("[TTS speakVerseAI] Session invalidated after prepare, aborting. session:", session, "current:", sessionRef.current);
        return;
      }

      cleanupPlayer();

      const audioUri = new URL(`/api/tts/audio/${audioId}`, apiUrl).href;
      console.log("[TTS speakVerseAI] Creating player with URI:", audioUri);

      const player = createAudioPlayer(audioUri);
      console.log("[TTS speakVerseAI] Player created");
      try {
        player.setPlaybackRate(speechRateRef.current);
        console.log("[TTS speakVerseAI] Playback rate set to:", speechRateRef.current);
      } catch {
        console.log("[TTS speakVerseAI] Could not set playback rate, using default");
      }
      playerRef.current = player;

      batchInfoRef.current = { startIndex: index, endIndex: batchEnd, charOffsets };

      setIsLoadingAudio(false);

      const playFinished = await new Promise<boolean>((resolve) => {
        let resolved = false;
        let loggedPlaying = false;
        const subscription = player.addListener("playbackStatusUpdate", (status: any) => {
          if (resolved) return;
          if (session !== sessionRef.current) {
            resolved = true;
            subscription.remove();
            resolve(false);
            return;
          }
          if (!loggedPlaying && status.playing) {
            loggedPlaying = true;
            console.log("[TTS speakVerseAI] Audio is playing");
          }

          if (status.playing && status.currentTime != null && status.duration && status.duration > 0) {
            const progress = status.currentTime / status.duration;
            const charPosition = progress * totalChars;
            const batch = batchInfoRef.current;
            if (batch) {
              let verseIdx = batch.startIndex;
              for (let i = batch.charOffsets.length - 1; i >= 0; i--) {
                if (charPosition >= batch.charOffsets[i]) {
                  verseIdx = batch.startIndex + i;
                  break;
                }
              }
              if (verseIdx !== currentIndexRef.current) {
                currentIndexRef.current = verseIdx;
                setSpeakingVerseIndex(verseIdx);
              }
            }
          }

          if (status.didJustFinish) {
            resolved = true;
            subscription.remove();
            resolve(true);
          }
        });

        const timeout = setTimeout(() => {
          if (!resolved) {
            console.log("[TTS speakVerseAI] Audio playback timed out after 60s, falling back");
            resolved = true;
            subscription.remove();
            resolve(false);
          }
        }, 60000);
        playbackTimeoutRef.current = timeout;

        player.play();
        console.log("[TTS speakVerseAI] player.play() called");
      });

      playbackTimeoutRef.current = null;

      if (!playFinished) {
        throw new Error("Audio playback timed out");
      }

      if (session === sessionRef.current) {
        currentIndexRef.current = batchEnd > 0 ? batchEnd - 1 : index;
        cleanupPlayer();
        speakVerseAI(batchEnd, session);
      }
    } catch (err: any) {
      console.log("[TTS speakVerseAI] Error, falling back:", err?.message || err);
      if (session !== sessionRef.current) return;
      setUsingFallback(true);
      setIsLoadingAudio(false);
      speakVerseFallback(index, session);
    }
  }, [cleanupPlayer, speakVerseFallback]);

  const handlePlay = useCallback(() => {
    const vrs = versesRef.current;
    console.log("[TTS handlePlay] verses count:", vrs.length, "isPaused:", isPaused, "currentIndex:", currentIndexRef.current);
    if (!vrs.length) {
      console.log("[TTS handlePlay] No verses, returning early");
      return;
    }

    audioCtxRef.current.registerSession({
      bookId,
      bookName: bookName || "",
      chapter,
      translation,
    });

    if (isPaused && currentIndexRef.current >= 0) {
      console.log("[TTS handlePlay] Resuming from pause at index:", currentIndexRef.current);
      setIsPaused(false);
      setIsSpeaking(true);
      if (usingFallback) {
        speakVerseFallback(currentIndexRef.current, sessionRef.current);
      } else if (playerRef.current) {
        try {
          playerRef.current.play();
          console.log("[TTS handlePlay] Resumed existing player");
        } catch {
          speakVerseAI(currentIndexRef.current, sessionRef.current);
        }
      } else {
        speakVerseAI(currentIndexRef.current, sessionRef.current);
      }
      return;
    }

    Speech.stop();
    cleanupPlayer();
    const session = ++sessionRef.current;
    console.log("[TTS handlePlay] Starting new session:", session);
    setIsSpeaking(true);
    setIsPaused(false);
    setUsingFallback(false);
    speakVerseAI(0, session);
  }, [isPaused, usingFallback, speakVerseAI, speakVerseFallback, bookId, bookName, chapter, translation]);

  const handlePause = useCallback(() => {
    if (playbackTimeoutRef.current) {
      clearTimeout(playbackTimeoutRef.current);
      playbackTimeoutRef.current = null;
    }
    if (usingFallback) {
      Speech.stop();
    } else {
      try {
        if (playerRef.current) {
          playerRef.current.pause();
        }
      } catch {}
    }
    setIsPaused(true);
    setIsSpeaking(false);
  }, [usingFallback]);

  const handleStop = useCallback(() => {
    resetPlayback();
  }, [resetPlayback]);

  useEffect(() => {
    handlePlayRef.current = handlePlay;
    handlePauseRef.current = handlePause;
    handleStopRef.current = handleStop;
  }, [handlePlay, handlePause, handleStop]);

  const handleSpeedChange = useCallback((rate: number) => {
    speechRateRef.current = rate;
    setSpeechRate(rate);
    setShowSpeedPicker(false);
    if (isSpeaking && currentIndexRef.current >= 0) {
      Speech.stop();
      cleanupPlayer();
      const session = ++sessionRef.current;
      if (usingFallback) {
        speakVerseFallback(currentIndexRef.current, session);
      } else {
        speakVerseAI(currentIndexRef.current, session);
      }
    }
  }, [isSpeaking, usingFallback, speakVerseFallback, speakVerseAI, cleanupPlayer]);

  const handleVoiceChange = useCallback((voiceId: string, deviceVoiceIdentifier?: string) => {
    setShowVoicePicker(false);
    selectedVoiceRef.current = voiceId;
    setSelectedVoice(voiceId);
    AsyncStorage.setItem(VOICE_STORAGE_KEY, voiceId).catch(() => {});
    if (isSpeaking && currentIndexRef.current >= 0) {
      Speech.stop();
      cleanupPlayer();
      const session = ++sessionRef.current;
      if (usingFallback) {
        speakVerseFallback(currentIndexRef.current, session);
      } else {
        speakVerseAI(currentIndexRef.current, session);
      }
    }
  }, [isSpeaking, usingFallback, speakVerseAI, speakVerseFallback, cleanupPlayer]);

  const isActive = isSpeaking || isPaused;

  const currentVoiceLabel = AI_VOICE_OPTIONS.find((v) => v.id === selectedVoice)?.label ?? "George";

  return {
    isSpeaking,
    isPaused,
    speakingVerseIndex,
    speechRate,
    showSpeedPicker,
    showVoicePicker,
    selectedVoice,
    selectedDeviceVoiceId,
    deviceVoices,
    isLoadingAudio,
    usingFallback,
    isActive,
    currentVoiceLabel,
    setShowSpeedPicker,
    setShowVoicePicker,
    handlePlay,
    handlePause,
    handleStop,
    handleSpeedChange,
    handleVoiceChange,
    resetPlayback,
  };
}
