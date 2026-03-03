/**
 * Player utility functions.
 */

/**
 * Format seconds to HH:MM:SS or MM:SS display string.
 */
export function formatTime(seconds) {
  if (!seconds || isNaN(seconds)) return '0:00';
  const s = Math.floor(seconds);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const pad = (n) => String(n).padStart(2, '0');
  return h > 0 ? `${h}:${pad(m)}:${pad(sec)}` : `${m}:${pad(sec)}`;
}

/**
 * Parse HH:MM:SS or HH:MM:SS.mmm or HH:MM:SS,mmm to seconds.
 */
export function toSeconds(timestamp) {
  if (!timestamp) return 0;
  // Handle both comma and dot separators
  const cleaned = timestamp.replace(',', '.');
  const parts = cleaned.match(/(\d+):(\d+):(\d+)(?:\.(\d+))?/);
  if (!parts) return 0;
  const [, h, m, s, ms] = parts;
  return parseInt(h) * 3600 + parseInt(m) * 60 + parseInt(s) + (ms ? parseInt(ms) / 1000 : 0);
}

/**
 * Load all VTT subtitle files via Vite glob.
 * Returns a map: basename → URL string.
 */
const vttModules = import.meta.glob('/src/data/subtitles/*.he.vtt', { query: '?url', import: 'default', eager: true });

export function getSubtitleUrl(basename) {
  const key = `/src/data/subtitles/${basename}.he.vtt`;
  return vttModules[key] || null;
}

/**
 * Get video URL for a lecture basename.
 * In dev, served by the serveVideos Vite plugin from /videos/.
 */
export function getVideoUrl(basename) {
  if (!basename) return null;
  return `/videos/${basename}.mp4`;
}

/**
 * Speed options for playback rate control.
 */
export const SPEED_OPTIONS = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2, 2.5];
