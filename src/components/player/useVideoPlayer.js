/**
 * useVideoPlayer — Core hook managing video element state.
 *
 * Handles: play/pause, progress, seeking, volume, speed, duration,
 * subtitle track loading, and singleton integration.
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import { usePlayerSingleton } from './PlayerSingletonContext';
import { getSubtitleUrl } from './utils';

export default function useVideoPlayer({ videoUrl, subtitleBasename, startTime, autoPlay = false }) {
  const videoRef = useRef(null);
  const singleton = usePlayerSingleton();

  // Playback state
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);

  // Controls state
  const [volume, setVolumeState] = useState(() => {
    const saved = localStorage.getItem('shlomo_player_volume');
    return saved ? parseFloat(saved) : 0.7;
  });
  const [isMuted, setIsMuted] = useState(false);
  const [playbackRate, setPlaybackRateState] = useState(1);
  const [captionsEnabled, setCaptionsEnabled] = useState(true);

  // Subtitle URL
  const subtitleUrl = subtitleBasename ? getSubtitleUrl(subtitleBasename) : null;

  // --- Singleton registration ---
  useEffect(() => {
    if (!singleton) return;
    const pauseFn = () => {
      const video = videoRef.current;
      if (video && !video.paused) {
        video.pause();
      }
    };
    return singleton.register(pauseFn);
  }, [singleton]);

  // --- Video event handlers ---
  const onLoadedMetadata = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    setDuration(video.duration);
    setIsLoading(false);

    if (startTime && startTime > 0) {
      video.currentTime = startTime;
      if (autoPlay) {
        if (singleton) singleton.notifyPlay(() => video.pause());
        video.play().catch(() => {});
        setHasStarted(true);
      }
    }
  }, [startTime, autoPlay, singleton]);

  const onTimeUpdate = useCallback(() => {
    const video = videoRef.current;
    if (video) setCurrentTime(video.currentTime);
  }, []);

  const onPlay = useCallback(() => setIsPlaying(true), []);
  const onPause = useCallback(() => setIsPlaying(false), []);
  const onWaiting = useCallback(() => setIsLoading(true), []);
  const onCanPlay = useCallback(() => setIsLoading(false), []);

  // --- Video source changes ---
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !videoUrl) return;

    video.src = videoUrl;
    video.load();
    setIsLoading(true);
    setCurrentTime(0);
    setDuration(0);
  }, [videoUrl]);

  // --- Volume sync ---
  useEffect(() => {
    const video = videoRef.current;
    if (video) {
      video.volume = isMuted ? 0 : volume;
    }
  }, [volume, isMuted]);

  // --- Playback rate sync ---
  useEffect(() => {
    const video = videoRef.current;
    if (video) video.playbackRate = playbackRate;
  }, [playbackRate]);

  // --- Captions toggle ---
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    for (let i = 0; i < video.textTracks.length; i++) {
      video.textTracks[i].mode = captionsEnabled ? 'showing' : 'hidden';
    }
  }, [captionsEnabled]);

  // --- Actions ---
  const play = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    if (singleton) singleton.notifyPlay(() => video.pause());
    video.play().catch(() => {});
    setHasStarted(true);
  }, [singleton]);

  const pause = useCallback(() => {
    const video = videoRef.current;
    if (video) video.pause();
  }, []);

  const togglePlay = useCallback(() => {
    if (isPlaying) pause();
    else play();
  }, [isPlaying, play, pause]);

  const seek = useCallback((time) => {
    const video = videoRef.current;
    if (video) {
      video.currentTime = Math.max(0, Math.min(time, video.duration || 0));
    }
  }, []);

  const seekRelative = useCallback((delta) => {
    const video = videoRef.current;
    if (video) {
      video.currentTime = Math.max(0, Math.min(video.currentTime + delta, video.duration || 0));
    }
  }, []);

  const setVolume = useCallback((v) => {
    const clamped = Math.max(0, Math.min(1, v));
    setVolumeState(clamped);
    setIsMuted(false);
    localStorage.setItem('shlomo_player_volume', String(clamped));
  }, []);

  const toggleMute = useCallback(() => {
    setIsMuted((m) => !m);
  }, []);

  const setPlaybackRate = useCallback((rate) => {
    setPlaybackRateState(rate);
  }, []);

  const toggleCaptions = useCallback(() => {
    setCaptionsEnabled((c) => !c);
  }, []);

  const toggleFullscreen = useCallback(() => {
    const container = videoRef.current?.closest('.player-container');
    if (!container) return;
    if (!document.fullscreenElement) {
      container.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  }, []);

  return {
    videoRef,
    subtitleUrl,

    // State
    isPlaying,
    currentTime,
    duration,
    isLoading,
    hasStarted,
    volume,
    isMuted,
    playbackRate,
    captionsEnabled,

    // Actions
    play,
    pause,
    togglePlay,
    seek,
    seekRelative,
    setVolume,
    toggleMute,
    setPlaybackRate,
    toggleCaptions,
    toggleFullscreen,

    // Event handlers (bind to <video>)
    videoEventHandlers: {
      onLoadedMetadata,
      onTimeUpdate,
      onPlay,
      onPause,
      onWaiting,
      onCanPlay,
    },
  };
}
