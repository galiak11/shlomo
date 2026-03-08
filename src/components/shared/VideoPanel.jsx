/**
 * VideoPanel — shared sticky sidebar / mobile bottom overlay player panel.
 *
 * Used by LearningPath (session-specific below-video content) and
 * ClassLibrary (full lecture content). Below-video content is passed as children.
 *
 * Props:
 *   isDesktop       — boolean, controls sidebar vs bottom overlay
 *   stickyTop       — px value for sticky top position (desktop only)
 *   headerRef       — ref for the header div (scroll-linked sticky)
 *   playerRef       — ref for the outer panel div
 *   onClose         — close handler
 *   onSeek          — seek handler: (timeStr, highlightRange?) => void
 *   parentTitle     — small muted line (e.g. lecture name or class name)
 *   itemTitle       — main title (session title or lecture title)
 *   itemTopic       — optional colored subtitle (topic or description)
 *   headerPlayTime  — optional "HH:MM:SS" for the header inline play button
 *   headerPlayRange — optional { startTime, endTime } strings for header play button highlight
 *   lectureBasename — basename for VideoPlayer (video + subtitles)
 *   seekTime        — seek target in seconds
 *   seekRevision    — integer key bump to trigger seek
 *   autoPlay        — boolean
 *   highlightRanges — [{startTime, endTime, color?}] seconds
 *   videoUrl        — direct video/Vimeo URL (if provided, overrides lectureBasename player)
 *   sealImageUrl    — optional full-width image shown below video
 *   sealImageAlt    — alt text for seal image
 *   children        — below-video scrollable content
 */

import VideoPlayer from '@/components/player/VideoPlayer';
import { getVideoUrl } from '@/components/player/utils';
import { Play, X } from 'lucide-react';

export default function VideoPanel({
  isDesktop,
  stickyTop,
  headerRef,
  playerRef,
  onClose,
  onSeek,
  parentTitle,
  itemTitle,
  itemTopic,
  headerPlayTime,
  headerPlayRange,
  videoUrl,
  lectureBasename,
  seekTime,
  seekRevision,
  autoPlay,
  highlightRanges,
  sealImageUrl,
  sealImageAlt,
  children,
}) {
  return (
    <>
      {/* Mobile backdrop — tap to close */}
      {!isDesktop && (
        <div className="fixed inset-0 z-40" onClick={onClose} aria-hidden="true" />
      )}

      <div
        ref={playerRef}
        className={isDesktop
          ? 'w-[280px] lg:w-[380px] xl:w-[420px] shrink-0 sticky self-start space-y-3 pl-6'
          : 'fixed bottom-0 inset-x-0 z-50 bg-background border-t border-border shadow-2xl max-h-[55vh] overflow-y-auto p-4 space-y-3'}
        style={isDesktop ? { top: `${stickyTop}px` } : undefined}
        dir="rtl"
      >
        {/* Header */}
        <div ref={headerRef} className="space-y-0.5 text-right">
          {/* Row 1: parent title + X close */}
          <div className="flex items-center gap-2">
            <p className="text-xs text-muted-foreground truncate flex-1">{parentTitle}</p>
            <button
              onClick={onClose}
              className="shrink-0 p-1 rounded text-muted-foreground hover:text-foreground hover:bg-accent transition"
              aria-label="סגור נגן"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Row 2: item title + optional inline play button */}
          <div className="flex items-center gap-1">
            <p className="font-semibold text-sm leading-snug flex-1">{itemTitle}</p>
            {headerPlayTime && (
              <button
                onClick={() => onSeek(headerPlayTime, headerPlayRange ?? null)}
                className="flex items-center gap-1 text-[11px] font-medium text-purple-600 hover:text-purple-700 shrink-0 px-1.5 py-0.5 rounded hover:bg-purple-50 transition"
              >
                <Play className="w-3 h-3 fill-current" style={{ transform: 'scaleX(-1)' }} />
                {headerPlayTime.slice(0, 5)}
              </button>
            )}
          </div>

          {/* Row 3: topic / description */}
          {itemTopic && (
            <p className="text-xs text-primary">{itemTopic}</p>
          )}
        </div>

        {/* Video player — Vimeo iframe or local VideoPlayer */}
        {videoUrl?.match(/vimeo\.com\/(\d+)/) ? (
          <div className="aspect-video w-full rounded overflow-hidden bg-black">
            <iframe
              src={`https://player.vimeo.com/video/${videoUrl.match(/vimeo\.com\/(\d+)/)[1]}${autoPlay ? '?autoplay=1' : ''}`}
              className="w-full h-full"
              frameBorder="0"
              allow="autoplay; fullscreen; picture-in-picture"
              allowFullScreen
              title={itemTitle}
            />
          </div>
        ) : lectureBasename ? (
          <VideoPlayer
            key={`${lectureBasename}-${seekRevision}`}
            videoUrl={getVideoUrl(lectureBasename)}
            subtitleBasename={lectureBasename}
            startTime={seekTime}
            autoPlay={autoPlay}
            highlightRanges={highlightRanges}
          />
        ) : null}

        {/* Optional full-width seal image */}
        {sealImageUrl && (
          <img
            src={sealImageUrl}
            alt={sealImageAlt}
            className="w-full object-contain rounded bg-muted p-1"
          />
        )}

        {/* Below-video scrollable content — provided by parent */}
        {children}
      </div>
    </>
  );
}
