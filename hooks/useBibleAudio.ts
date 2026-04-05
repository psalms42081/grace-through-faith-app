import { useCallback, useEffect, useRef, useState } from "react";
import { Platform, ScrollView } from "react-native";
import { Audio, AVPlaybackStatus } from "expo-av";
import type { AVPlaybackStatusSuccess } from "expo-av";

import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Speech from "expo-speech";
import { getApiUrl, apiRequest } from "@/lib/query-client";
import { useAudioContext } from "@/contexts/AudioContext";

const VOICE_STORAGE_KEY = "@grace-through-faith/tts-voice";
const isMobile = Platform.OS === "ios" || Platform.OS === "android";

const AI_VOICE_OPTIONS = [
  { id: "ellen_white", label: "Ellen G. White", description: "Prophetic, gentle, Spirit-led", gender: "female" },
  { id: "james_white", label: "James White", description: "Commanding organizer, pastoral", gender: "male" },
  { id: "joseph_bates", label: "Joseph Bates", description: "Seasoned mariner, bold conviction", gender: "male" },
  { id: "uriah_smith", label: "Uriah Smith", description: "Scholarly, meticulous, prophetic", gender: "male" },
  { id: "jn_andrews", label: "J.N. Andrews", description: "Intellectual, missionary zeal", gender: "male" },
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
  fallbackReason: string | null;
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
  onUserScroll: () => void;
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
  const [selectedVoice, setSelectedVoice] = useState("ellen_white");
  const [selectedDeviceVoiceId, setSelectedDeviceVoiceId] = useState<string | null>(null);
  const [deviceVoices, setDeviceVoices] = useState<DeviceVoice[]>([]);
  const [isLoadingAudio, setIsLoadingAudio] = useState(false);
  const [usingFallback, setUsingFallback] = useState(false);
  const [fallbackReason, setFallbackReason] = useState<string | null>(null);

  const sessionRef = useRef(0);
  const currentIndexRef = useRef(-1);
  const versesRef = useRef<Verse[]>([]);
  const speechRateRef = useRef(1);
  const playerRef = useRef<Audio.Sound | null>(null);
  const selectedVoiceRef = useRef("ellen_white");
  const selectedDeviceVoiceIdRef = useRef<string | null>(null);
  const mountedRef = useRef(true);
  const playbackTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const batchInfoRef = useRef<{ startIndex: number; endIndex: number; charOffsets: number[] } | null>(null);
  const userScrolledRef = useRef(false);
  const userScrollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      sessionRef.current += 1;
      if (playbackTimeoutRef.current) {
        clearTimeout(playbackTimeoutRef.current);
        playbackTimeoutRef.current = null;
      }
      if (playerRef.current) {
        try { playerRef.current.stopAsync(); } catch {}
        try { playerRef.current.unloadAsync(); } catch {}
        playerRef.current = null;
      }
      Speech.stop();
    };
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
    Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      staysActiveInBackground: true,
      shouldDuckAndroid: true,
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

  const cleanupPlayer = useCallback(async () => {
    if (playbackTimeoutRef.current) {
      clearTimeout(playbackTimeoutRef.current);
      playbackTimeoutRef.current = null;
    }
    if (playerRef.current) {
      try {
        await playerRef.current.stopAsync();
      } catch {}
      try {
        await playerRef.current.unloadAsync();
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
    setFallbackReason(null);
    currentIndexRef.current = -1;
    audioCtxRef.current.clearSession();
  }, [cleanupPlayer]);

  useEffect(() => {
    resetPlayback();
  }, [bookId, chapter, translation, resetPlayback]);

  const onUserScroll = useCallback(() => {
    userScrolledRef.current = true;
    if (userScrollTimerRef.current) clearTimeout(userScrollTimerRef.current);
    userScrollTimerRef.current = setTimeout(() => {
      userScrolledRef.current = false;
    }, 3000);
  }, []);

  const scrollToVerseEstimate = useCallback((index: number) => {
    if (index < 0 || !scrollViewRef.current) return;
    if (userScrolledRef.current) return;
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
    if (speakingVerseIndex >= 0 && isSpeaking) {
      scrollToVerseEstimate(speakingVerseIndex);
    }
  }, [speakingVerseIndex, isSpeaking, scrollToVerseEstimate]);

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
          prepareRes = null;
          if (attempt < 2) await new Promise(r => setTimeout(r, 1000));
        } catch (fetchErr: any) {
          if (attempt < 2) await new Promise(r => setTimeout(r, 1000));
        }
      }

      if (!prepareRes || !prepareRes.ok) {
        const errBody = prepareRes ? await prepareRes.text().catch(() => "") : "no response";
        throw new Error(`TTS prepare failed: ${prepareRes?.status || "network"}`);
      }

      const { audioId } = await prepareRes.json();

      if (session !== sessionRef.current) {
        return;
      }

      await cleanupPlayer();

      const audioUri = new URL(`/api/tts/audio/${audioId}`, apiUrl).href;

      const { sound } = await Audio.Sound.createAsync(
        { uri: audioUri },
        { shouldPlay: false, rate: speechRateRef.current, shouldCorrectPitch: true, progressUpdateIntervalMillis: 150 },
      );

      playerRef.current = sound;
      batchInfoRef.current = { startIndex: index, endIndex: batchEnd, charOffsets };
      setIsLoadingAudio(false);

      const playFinished = await new Promise<boolean>((resolve) => {
        let resolved = false;

        sound.setOnPlaybackStatusUpdate((status: AVPlaybackStatus) => {
          if (resolved) return;
          if (session !== sessionRef.current) {
            resolved = true;
            resolve(false);
            return;
          }

          if (!status.isLoaded) return;
          const s = status as AVPlaybackStatusSuccess;

          if (s.isPlaying && s.positionMillis != null && s.durationMillis && s.durationMillis > 0) {
            const progress = s.positionMillis / s.durationMillis;
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

          if (s.didJustFinish) {
            resolved = true;
            resolve(true);
          }
        });

        const timeout = setTimeout(() => {
          if (!resolved) {
            resolved = true;
            resolve(false);
          }
        }, 60000);
        playbackTimeoutRef.current = timeout;

        sound.playAsync().then(() => {}).catch((e: any) => {
          if (!resolved) { resolved = true; resolve(false); }
        });
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
      const reason = err?.message || String(err);
      if (session !== sessionRef.current) return;
      setUsingFallback(true);
      setFallbackReason(reason);
      setIsLoadingAudio(false);
      speakVerseFallback(index, session);
    }
  }, [cleanupPlayer, speakVerseFallback]);

  const handlePlay = useCallback(() => {
    const vrs = versesRef.current;
    if (!vrs.length) {
      return;
    }

    audioCtxRef.current.registerSession({
      bookId,
      bookName: bookName || "",
      chapter,
      translation,
    });

    if (isPaused && currentIndexRef.current >= 0) {
      setIsPaused(false);
      setIsSpeaking(true);
      if (usingFallback) {
        speakVerseFallback(currentIndexRef.current, sessionRef.current);
      } else if (playerRef.current) {
        try {
          playerRef.current.playAsync();
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
    setIsSpeaking(true);
    setIsPaused(false);
    setUsingFallback(false);
    setFallbackReason(null);
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
          playerRef.current.pauseAsync();
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
    apiRequest("PUT", "/api/user/preferences", { preferredNarrator: voiceId }).catch(() => {});
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
    fallbackReason,
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
    onUserScroll,
  };
}
