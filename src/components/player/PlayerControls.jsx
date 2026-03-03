/**
 * PlayerControls — play/pause, progress, volume, speed, captions, fullscreen.
 *
 * Receives all state and actions from useVideoPlayer hook.
 */

import { useState, useRef, useEffect } from 'react';
import {
  Play, Pause, Volume2, VolumeX, Maximize, Minimize,
  Subtitles, ChevronRight, ChevronLeft,
} from 'lucide-react';
import ProgressBar from './ProgressBar';
import { formatTime, SPEED_OPTIONS } from './utils';

export default function PlayerControls({
  isPlaying,
  currentTime,
  duration,
  volume,
  isMuted,
  playbackRate,
  captionsEnabled,
  isLoading,
  highlightRanges,
  onTogglePlay,
  onSeek,
  onSeekRelative,
  onSetVolume,
  onToggleMute,
  onSetPlaybackRate,
  onToggleCaptions,
  onToggleFullscreen,
}) {
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const speedMenuRef = useRef(null);

  // Track fullscreen state
  useEffect(() => {
    const onChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  // Close speed menu on outside click
  useEffect(() => {
    if (!showSpeedMenu) return;
    const handleClick = (e) => {
      if (speedMenuRef.current && !speedMenuRef.current.contains(e.target)) {
        setShowSpeedMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showSpeedMenu]);

  return (
    <div className="player-controls flex flex-col gap-1 px-3 py-2 bg-black/80 backdrop-blur-sm text-white">
      {/* Progress bar */}
      <ProgressBar
        currentTime={currentTime}
        duration={duration}
        onSeek={onSeek}
        ranges={highlightRanges}
      />

      {/* Controls row */}
      <div className="flex items-center gap-1 text-sm">
        {/* Play/Pause */}
        <button
          onClick={onTogglePlay}
          className="p-1.5 hover:bg-white/10 rounded transition"
          aria-label={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
        </button>

        {/* Skip backward/forward */}
        <button
          onClick={() => onSeekRelative(-8)}
          className="p-1.5 hover:bg-white/10 rounded transition"
          aria-label="Skip back 8s"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <button
          onClick={() => onSeekRelative(8)}
          className="p-1.5 hover:bg-white/10 rounded transition"
          aria-label="Skip forward 8s"
        >
          <ChevronRight className="h-4 w-4" />
        </button>

        {/* Time display */}
        <span className="text-xs tabular-nums min-w-[4rem] text-center">
          {formatTime(currentTime)}
        </span>
        <span className="text-xs text-white/50">/</span>
        <span className="text-xs tabular-nums min-w-[4rem] text-center text-white/70">
          {formatTime(duration)}
        </span>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Volume */}
        <div className="hidden sm:flex items-center gap-1 group">
          <button
            onClick={onToggleMute}
            className="p-1.5 hover:bg-white/10 rounded transition"
            aria-label={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted || volume === 0 ? (
              <VolumeX className="h-4 w-4" />
            ) : (
              <Volume2 className="h-4 w-4" />
            )}
          </button>
          <input
            type="range"
            min="0"
            max="100"
            value={isMuted ? 0 : Math.round(volume * 100)}
            onChange={(e) => onSetVolume(parseInt(e.target.value) / 100)}
            className="w-16 h-1 accent-white opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
            aria-label="Volume"
          />
        </div>

        {/* Speed */}
        <div className="relative" ref={speedMenuRef}>
          <button
            onClick={() => setShowSpeedMenu((s) => !s)}
            className="px-2 py-1 text-xs hover:bg-white/10 rounded transition tabular-nums"
          >
            {playbackRate}×
          </button>
          {showSpeedMenu && (
            <div className="absolute bottom-full mb-1 end-0 bg-gray-900 rounded shadow-lg border border-white/10 py-1 z-50 min-w-[5rem]">
              {SPEED_OPTIONS.map((speed) => (
                <button
                  key={speed}
                  onClick={() => {
                    onSetPlaybackRate(speed);
                    setShowSpeedMenu(false);
                  }}
                  className={`block w-full text-start px-3 py-1 text-xs transition ${
                    playbackRate === speed
                      ? 'bg-white/20 text-white'
                      : 'text-white/70 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  {speed}×
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Captions toggle */}
        <button
          onClick={onToggleCaptions}
          className={`p-1.5 rounded transition ${
            captionsEnabled ? 'bg-white/20 text-white' : 'hover:bg-white/10 text-white/50'
          }`}
          aria-label="Toggle captions"
        >
          <Subtitles className="h-4 w-4" />
        </button>

        {/* Fullscreen */}
        <button
          onClick={onToggleFullscreen}
          className="p-1.5 hover:bg-white/10 rounded transition"
          aria-label="Toggle fullscreen"
        >
          {isFullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
}
