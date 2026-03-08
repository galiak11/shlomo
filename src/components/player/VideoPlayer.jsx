/**
 * VideoPlayer — Main reusable video player component.
 *
 * Props:
 *   videoUrl          — Video source URL
 *   subtitleBasename  — Basename for VTT subtitle lookup (e.g. "shlomo_hatmaot--intro_protection")
 *   posterUrl         — Optional poster image
 *   startTime         — Optional initial seek position in seconds
 *   highlightRanges   — Optional [{startTime, endTime, color?}] for progress bar highlights
 *   className         — Optional additional CSS class
 */

import { useEffect, useCallback } from 'react';
import useVideoPlayer from './useVideoPlayer';
import PlayerControls from './PlayerControls';
import PlayerPlaceholder from './PlayerPlaceholder';

export default function VideoPlayer({
  videoUrl,
  subtitleBasename,
  posterUrl,
  startTime,
  autoPlay = false,
  highlightRanges,
  className = '',
}) {
  const player = useVideoPlayer({ videoUrl, subtitleBasename, startTime, autoPlay });

  // Keyboard shortcuts
  const handleKeyDown = useCallback(
    (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

      switch (e.key) {
        case ' ':
          e.preventDefault();
          player.togglePlay();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          player.seekRelative(-6);
          break;
        case 'ArrowRight':
          e.preventDefault();
          player.seekRelative(6);
          break;
        case 'f':
          e.preventDefault();
          player.toggleFullscreen();
          break;
        case 'm':
          e.preventDefault();
          player.toggleMute();
          break;
        case 'c':
          e.preventDefault();
          player.toggleCaptions();
          break;
      }
    },
    [player]
  );

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return (
    <div
      className={`player-container relative bg-black rounded-lg overflow-hidden ${className}`}
      dir="ltr"
    >
      {/* Video element */}
      <div className="relative aspect-video">
        <video
          ref={player.videoRef}
          className="w-full h-full object-contain"
          playsInline
          onClick={player.togglePlay}
          {...player.videoEventHandlers}
        >
          {/* Subtitle track */}
          {player.subtitleUrl && (
            <track
              kind="subtitles"
              label="עברית"
              srcLang="he"
              src={player.subtitleUrl}
              default
            />
          )}
        </video>

        {/* Placeholder before first play */}
        {!player.hasStarted && (
          <PlayerPlaceholder posterUrl={posterUrl} onPlay={player.play} />
        )}

        {/* Loading spinner */}
        {player.isLoading && player.hasStarted && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-8 h-8 border-4 border-white/30 border-t-white rounded-full animate-spin" />
          </div>
        )}
      </div>

      {/* Controls */}
      <PlayerControls
        isPlaying={player.isPlaying}
        currentTime={player.currentTime}
        duration={player.duration}
        volume={player.volume}
        isMuted={player.isMuted}
        playbackRate={player.playbackRate}
        captionsEnabled={player.captionsEnabled}
        isLoading={player.isLoading}
        highlightRanges={highlightRanges}
        onTogglePlay={player.togglePlay}
        onSeek={player.seek}
        onSeekRelative={player.seekRelative}
        onSetVolume={player.setVolume}
        onToggleMute={player.toggleMute}
        onSetPlaybackRate={player.setPlaybackRate}
        onToggleCaptions={player.toggleCaptions}
        onToggleFullscreen={player.toggleFullscreen}
      />
    </div>
  );
}
