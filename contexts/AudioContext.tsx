import React, { createContext, useContext, useState, useRef, useMemo, useCallback, ReactNode } from "react";

interface AudioSessionInfo {
  bookId: string;
  bookName: string;
  chapter: string;
  translation: string;
}

interface PlaybackState {
  isSpeaking: boolean;
  isPaused: boolean;
  speakingVerseIndex: number;
  isLoadingAudio: boolean;
}

interface AudioControls {
  play: () => void;
  pause: () => void;
  stop: () => void;
}

interface AudioContextValue {
  isActive: boolean;
  isSpeaking: boolean;
  isPaused: boolean;
  isLoadingAudio: boolean;
  speakingVerseIndex: number;
  sessionInfo: AudioSessionInfo | null;
  registerSession: (info: AudioSessionInfo) => void;
  updatePlaybackState: (state: PlaybackState) => void;
  clearSession: () => void;
  setControls: (controls: AudioControls) => void;
  play: () => void;
  pause: () => void;
  stop: () => void;
}

const AudioContext = createContext<AudioContextValue>({
  isActive: false,
  isSpeaking: false,
  isPaused: false,
  isLoadingAudio: false,
  speakingVerseIndex: -1,
  sessionInfo: null,
  registerSession: () => {},
  updatePlaybackState: () => {},
  clearSession: () => {},
  setControls: () => {},
  play: () => {},
  pause: () => {},
  stop: () => {},
});

export function useAudioContext() {
  return useContext(AudioContext);
}

export function AudioProvider({ children }: { children: ReactNode }) {
  const [sessionInfo, setSessionInfo] = useState<AudioSessionInfo | null>(null);
  const [playbackState, setPlaybackState] = useState<PlaybackState>({
    isSpeaking: false,
    isPaused: false,
    speakingVerseIndex: -1,
    isLoadingAudio: false,
  });

  const controlsRef = useRef<AudioControls>({
    play: () => {},
    pause: () => {},
    stop: () => {},
  });

  const registerSession = useCallback((info: AudioSessionInfo) => {
    setSessionInfo(info);
  }, []);

  const updatePlaybackState = useCallback((state: PlaybackState) => {
    setPlaybackState(state);
  }, []);

  const clearSession = useCallback(() => {
    setSessionInfo(null);
    setPlaybackState({
      isSpeaking: false,
      isPaused: false,
      speakingVerseIndex: -1,
      isLoadingAudio: false,
    });
  }, []);

  const setControls = useCallback((controls: AudioControls) => {
    controlsRef.current = controls;
  }, []);

  const play = useCallback(() => {
    controlsRef.current.play();
  }, []);

  const pause = useCallback(() => {
    controlsRef.current.pause();
  }, []);

  const stop = useCallback(() => {
    controlsRef.current.stop();
    clearSession();
  }, [clearSession]);

  const isActive = playbackState.isSpeaking || playbackState.isPaused;

  const value = useMemo(() => ({
    isActive,
    isSpeaking: playbackState.isSpeaking,
    isPaused: playbackState.isPaused,
    isLoadingAudio: playbackState.isLoadingAudio,
    speakingVerseIndex: playbackState.speakingVerseIndex,
    sessionInfo,
    registerSession,
    updatePlaybackState,
    clearSession,
    setControls,
    play,
    pause,
    stop,
  }), [isActive, playbackState, sessionInfo, registerSession, updatePlaybackState, clearSession, setControls, play, pause, stop]);

  return (
    <AudioContext.Provider value={value}>
      {children}
    </AudioContext.Provider>
  );
}
