/**
 * ProgressBar — range input with time range highlighting overlay.
 *
 * Props:
 *   currentTime  — current playback position in seconds
 *   duration     — total duration in seconds
 *   onSeek       — (time: number) => void
 *   ranges       — optional: [{ startTime, endTime, color? }] for highlighting segments
 */

import { useRef, useCallback } from 'react';

export default function ProgressBar({ currentTime, duration, onSeek, ranges }) {
  const barRef = useRef(null);

  const percent = duration > 0 ? (currentTime / duration) * 100 : 0;

  const handleInput = useCallback(
    (e) => {
      const time = (parseFloat(e.target.value) / 100) * duration;
      onSeek(time);
    },
    [duration, onSeek]
  );

  // Click on the bar directly for precise seeking
  const handleBarClick = useCallback(
    (e) => {
      const bar = barRef.current;
      if (!bar || !duration) return;
      const rect = bar.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const ratio = Math.max(0, Math.min(1, x / rect.width));
      onSeek(ratio * duration);
    },
    [duration, onSeek]
  );

  return (
    <div className="progress-bar-container relative w-full h-6 flex items-center group cursor-pointer" ref={barRef}>
      {/* Track background */}
      <div
        className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-1 bg-gray-300 rounded-full group-hover:h-1.5 transition-all"
        onClick={handleBarClick}
      >
        {/* Filled portion */}
        <div
          className="h-full bg-gray-500 rounded-full"
          style={{ width: `${percent}%` }}
        />
      </div>

      {/* Range highlight overlays — rendered after track so they appear on top */}
      {ranges && ranges.length > 0 && duration > 0 && (
        <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-1.5 pointer-events-none">
          {ranges.map((range, i) => {
            const left = (range.startTime / duration) * 100;
            const width = ((range.endTime - range.startTime) / duration) * 100;
            return (
              <div
                key={i}
                className="absolute h-full rounded-full opacity-60"
                style={{
                  left: `${left}%`,
                  width: `${width}%`,
                  backgroundColor: range.color || 'hsl(var(--primary))',
                }}
              />
            );
          })}
        </div>
      )}

      {/* Range input (invisible, handles drag) */}
      <input
        type="range"
        min="0"
        max="100"
        step="0.01"
        value={percent}
        onInput={handleInput}
        className="absolute inset-0 w-full opacity-0 cursor-pointer"
        aria-label="Progress"
      />

      {/* Thumb indicator */}
      <div
        className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-primary rounded-full shadow opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
        style={{ left: `calc(${percent}% - 6px)` }}
      />
    </div>
  );
}
