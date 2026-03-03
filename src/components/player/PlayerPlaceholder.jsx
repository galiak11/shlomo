/**
 * PlayerPlaceholder — shown before first play.
 * Displays poster image (or dark bg) with centered play button.
 */

import { Play } from 'lucide-react';

export default function PlayerPlaceholder({ posterUrl, onPlay }) {
  return (
    <div
      className="absolute inset-0 flex items-center justify-center bg-black cursor-pointer z-10"
      onClick={onPlay}
    >
      {posterUrl && (
        <img
          src={posterUrl}
          alt=""
          className="absolute inset-0 w-full h-full object-contain opacity-60"
        />
      )}
      <button
        className="relative z-10 w-16 h-16 flex items-center justify-center rounded-full bg-white/90 text-black shadow-lg hover:scale-110 transition-transform"
        aria-label="Play"
      >
        <Play className="h-8 w-8 ms-1" fill="currentColor" />
      </button>
    </div>
  );
}
