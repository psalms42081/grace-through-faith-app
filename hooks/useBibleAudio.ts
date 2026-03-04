import { useCallback, useEffect, useRef, useState } from "react";
import { Platform, ScrollView } from "react-native";
import { createAudioPlayer, setAudioModeAsync } from "expo-audio";
import type { AudioPlayer } from "expo-audio";
import * as FileSystem from "expo-file-system";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Speech from "expo-speech";
import { getApiUrl } from "@/lib/query-client";

const VOICE_STORAGE_KEY = "@grace-through-faith/tts-voice";
const VOICE_ID_STORAGE_KEY = "@grace-through-faith/tts-voice-id";

const isMobile = Platform.OS === "ios" || Platform.OS === "android";

const AI_VOICE_OPTIONS = [
  { id: "nova", label: "Nova", description: "Warm, expressive", gender: "female" },
  { id: "shimmer", label: "Shimmer", description: "Gentle, clear", gender: "female" },
  { id: "alloy", label: "Alloy", description: "Balanced, neutral", gender: "neutral" },
  { id: "echo", label: "Echo", description: "Smooth, measured", gender: "male" },
  { id: "fable", label: "Fable", description: "Rich, storytelling", gender: "male" },
  { id: "onyx", label: "Onyx", description: "Deep, authoritative", gender: "male" },
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
): UseBibleAudioReturn {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [speakingVerseIndex, setSpeakingVerseIndex] = useState(-1);
  const [speechRate, setSpeechRate] = useState(1);
  const [showSpeedPicker, setShowSpeedPicker] = useState(false);
  const [showVoicePicker, setShowVoicePicker] = useState(false);
  const [selectedVoice, setSelectedVoice] = useState("nova");
  const [selectedDeviceVoiceId, setSelectedDeviceVoiceId] = useState<string | null>(null);
  const [deviceVoices, setDeviceVoices] = useState<DeviceVoice[]>([]);
  const [isLoadingAudio, setIsLoadingAudio] = useState(false);
  const [usingFallback, setUsingFallback] = useState(false);

  const sessionRef = useRef(0);
  const currentIndexRef = useRef(-1);
  const versesRef = useRef<Verse[]>([]);
  const speechRateRef = useRef(1);
  const playerRef = useRef<AudioPlayer | null>(null);
  const selectedVoiceRef = useRef("nova");
  const selectedDeviceVoiceIdRef = useRef<string | null>(null);

  useEffect(() => {
    versesRef.current = verses;
  }, [verses]);

  useEffect(() => {
    if (isMobile) {
      Speech.getAvailableVoicesAsync().then((voices) => {
        const englishVoices = voices
          .filter((v) => v.language.startsWith("en"))
          .map((v) => ({
            identifier: v.identifier,
            name: v.name,
            language: v.language,
            quality: (v as any).quality || "Default",
          }));
        setDeviceVoices(englishVoices);
      }).catch(() => {});

      AsyncStorage.getItem(VOICE_ID_STORAGE_KEY).then((saved) => {
        if (saved) {
          setSelectedDeviceVoiceId(saved);
          selectedDeviceVoiceIdRef.current = saved;
          const shortName = saved.split(".").pop()?.split("-")[0] || saved;
          setSelectedVoice(shortName);
          selectedVoiceRef.current = shortName;
        }
      }).catch(() => {});
    } else {
      AsyncStorage.getItem(VOICE_STORAGE_KEY).then((saved) => {
        if (saved && AI_VOICE_OPTIONS.some((v) => v.id === saved)) {
          setSelectedVoice(saved);
          selectedVoiceRef.current = saved;
        }
      }).catch(() => {});
    }
  }, []);

  useEffect(() => {
    setAudioModeAsync({
      playsInSilentMode: true,
    }).catch(() => {});
  }, []);

  const cleanupPlayer = useCallback(() => {
    if (playerRef.current) {
      try {
        playerRef.current.remove();
      } catch {}
      playerRef.current = null;
    }
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
  }, [cleanupPlayer]);

  useEffect(() => {
    resetPlayback();
  }, [bookId, chapter, translation, resetPlayback]);

  useEffect(() => {
    return () => {
      sessionRef.current += 1;
      cleanupPlayer();
      Speech.stop();
    };
  }, [cleanupPlayer]);

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

    try {
      const apiUrl = getApiUrl();
      const url = new URL("/api/tts", apiUrl);

      const response = await fetch(url.href, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: textToSpeak, voice: selectedVoiceRef.current }),
      });

      if (!response.ok) {
        throw new Error("TTS API failed");
      }

      if (session !== sessionRef.current) return;

      cleanupPlayer();

      let audioUri: string;

      if (Platform.OS === "web") {
        const blob = await response.blob();
        audioUri = URL.createObjectURL(blob);
      } else {
        const fileUri = `${FileSystem.cacheDirectory}tts_batch_${index}_${Date.now()}.mp3`;
        const arrayBuffer = await response.arrayBuffer();
        const bytes = new Uint8Array(arrayBuffer);
        const binChunks: string[] = [];
        for (let i = 0; i < bytes.length; i += 4096) {
          binChunks.push(String.fromCharCode(...bytes.subarray(i, Math.min(i + 4096, bytes.length))));
        }
        const base64Data = btoa(binChunks.join(""));
        await FileSystem.writeAsStringAsync(fileUri, base64Data, {
          encoding: FileSystem.EncodingType.Base64,
        });
        audioUri = fileUri;
      }

      if (session !== sessionRef.current) return;

      const player = createAudioPlayer({ uri: audioUri });
      player.playbackRate = speechRateRef.current;
      playerRef.current = player;

      setIsLoadingAudio(false);
      setSpeakingVerseIndex(batchEnd - 1);

      await new Promise<void>((resolve) => {
        const subscription = player.addListener("playbackStatusUpdate", (status: any) => {
          if (status.didJustFinish) {
            subscription.remove();
            resolve();
          }
        });
        player.play();
      });

      if (session === sessionRef.current) {
        cleanupPlayer();
        speakVerseAI(batchEnd, session);
      }
    } catch {
      if (session !== sessionRef.current) return;
      setUsingFallback(true);
      setIsLoadingAudio(false);
      speakVerseFallback(index, session);
    }
  }, [cleanupPlayer, speakVerseFallback]);

  const handlePlay = useCallback(() => {
    const vrs = versesRef.current;
    if (!vrs.length) return;

    if (isPaused && currentIndexRef.current >= 0) {
      setIsPaused(false);
      setIsSpeaking(true);
      if (isMobile || usingFallback) {
        speakVerseFallback(currentIndexRef.current, sessionRef.current);
      } else {
        speakVerseAI(currentIndexRef.current, sessionRef.current);
      }
      return;
    }

    const session = ++sessionRef.current;
    setIsSpeaking(true);
    setIsPaused(false);
    if (isMobile) {
      setUsingFallback(true);
      speakVerseFallback(0, session);
    } else {
      setUsingFallback(false);
      speakVerseAI(0, session);
    }
  }, [isPaused, usingFallback, speakVerseAI, speakVerseFallback]);

  const handlePause = useCallback(() => {
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

  const handleSpeedChange = useCallback((rate: number) => {
    speechRateRef.current = rate;
    setSpeechRate(rate);
    setShowSpeedPicker(false);
    if (isSpeaking && currentIndexRef.current >= 0) {
      Speech.stop();
      cleanupPlayer();
      if (isMobile || usingFallback) {
        speakVerseFallback(currentIndexRef.current, sessionRef.current);
      } else {
        speakVerseAI(currentIndexRef.current, sessionRef.current);
      }
    }
  }, [isSpeaking, usingFallback, speakVerseFallback, speakVerseAI, cleanupPlayer]);

  const handleVoiceChange = useCallback((voiceId: string, deviceVoiceIdentifier?: string) => {
    setShowVoicePicker(false);
    if (isMobile && deviceVoiceIdentifier) {
      selectedDeviceVoiceIdRef.current = deviceVoiceIdentifier;
      setSelectedDeviceVoiceId(deviceVoiceIdentifier);
      setSelectedVoice(voiceId);
      selectedVoiceRef.current = voiceId;
      AsyncStorage.setItem(VOICE_ID_STORAGE_KEY, deviceVoiceIdentifier).catch(() => {});
      AsyncStorage.setItem(VOICE_STORAGE_KEY, voiceId).catch(() => {});
    } else {
      selectedVoiceRef.current = voiceId;
      setSelectedVoice(voiceId);
      AsyncStorage.setItem(VOICE_STORAGE_KEY, voiceId).catch(() => {});
    }
    if (isSpeaking && currentIndexRef.current >= 0) {
      Speech.stop();
      cleanupPlayer();
      if (isMobile) {
        speakVerseFallback(currentIndexRef.current, sessionRef.current);
      } else {
        speakVerseAI(currentIndexRef.current, sessionRef.current);
      }
    }
  }, [isSpeaking, speakVerseAI, speakVerseFallback, cleanupPlayer]);

  const isActive = isSpeaking || isPaused;

  const currentVoiceLabel = isMobile
    ? (selectedVoice || "Default")
    : (AI_VOICE_OPTIONS.find((v) => v.id === selectedVoice)?.label ?? "Nova");

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
