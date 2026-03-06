/**
 * HatmaaModal — Dialog showing seal hatmaa with embedded video player.
 *
 * Layout:
 *   Header: purposeSummary, sealTitle, keyConcepts (no seal image)
 *   Navigation: action links (הטמעה / הסבר / כל הקטע)
 *   Body: VideoPlayer + large seal image side by side (stacked on mobile)
 *   Footer: 4 tabs (תכונות / מהות / הפעלה / הטמעה), default to tab 4
 *
 * key={lectureBasename} on VideoPlayer ensures same-video seeks don't reload.
 */

import { useCallback, useRef, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Play, BookOpen, Sparkles } from 'lucide-react';
import VideoPlayer from '@/components/player/VideoPlayer';
import { toSeconds, getVideoUrl } from '@/components/player/utils';
import { splitDetailsMarkdown } from '@/hooks/useSealLectureData';
import ReactMarkdown from 'react-markdown';

/** Strip outer "שיעור N: " prefix from metadata lecture names. */
function formatLectureName(name) {
  if (!name) return null;
  const match = name.match(/^שיעור \d+:\s+(.+)$/);
  return match ? match[1] : name;
}

/** Build ReactMarkdown component overrides for modal display.
 *  onTimestamp(startTime, endTime) is called when a #t= link is clicked. */
function buildModalMdComponents(onTimestamp) {
  return {
    h3: ({ children }) => (
      <p className="text-sm font-semibold text-purple-700 mt-3 mb-1">{children}</p>
    ),
    p: ({ children }) => (
      <p className="text-sm leading-relaxed mb-2">{children}</p>
    ),
    ul: ({ children }) => (
      <ul className="text-sm space-y-1 mb-2 pr-4">{children}</ul>
    ),
    li: ({ children }) => (
      <li className="text-sm leading-relaxed list-disc">{children}</li>
    ),
    strong: ({ children }) => (
      <strong className="font-semibold text-foreground">{children}</strong>
    ),
    a: ({ href, children }) => {
      const match = href && href.match(/#t=([^&]+)(?:&end=(.+))?/);
      if (match && onTimestamp) {
        return (
          <button
            onClick={() => onTimestamp(match[1], match[2])}
            className="text-purple-600 underline decoration-purple-300 hover:decoration-purple-600"
          >
            {children}
          </button>
        );
      }
      return <span className="text-purple-600 underline decoration-purple-300">{children}</span>;
    },
  };
}

export default function HatmaaModal({
  isOpen,
  onClose,
  seal,
  sealMeta,
  hatmaa,
  lectureName,
  lectureBasename,
  seekTime,
  highlightRange,
  view: initialView,
  onNavigate,
  activeTab,
  onTabChange,
}) {
  const [currentSeek, setCurrentSeek] = useState(seekTime);
  const [activeView, setActiveView] = useState(initialView || 'hatmaa');
  const [currentHighlight, setCurrentHighlight] = useState(highlightRange);
  const playerKeyRef = useRef(0);
  const prevBasenameRef = useRef(lectureBasename);
  const videoContainerRef = useRef(null);
  const [videoHeight, setVideoHeight] = useState(null);

  // Sync highlight from parent when modal opens with new data
  useEffect(() => {
    setCurrentHighlight(highlightRange);
    setActiveView(initialView || 'hatmaa');
  }, [highlightRange, initialView]);

  // Measure video container height and apply to image container
  useEffect(() => {
    const el = videoContainerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      setVideoHeight(entry.contentRect.height);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // When seekTime changes from parent, update
  useEffect(() => {
    if (seekTime == null) return;
    if (lectureBasename !== prevBasenameRef.current) {
      prevBasenameRef.current = lectureBasename;
      setCurrentSeek(seekTime);
    } else {
      setCurrentSeek(seekTime);
      playerKeyRef.current += 1;
    }
  }, [seekTime, lectureBasename]);

  const handleNavigate = useCallback((timeRange, view) => {
    const seconds = toSeconds(timeRange.startTime);
    setCurrentSeek(seconds);
    setActiveView(view);
    setCurrentHighlight({
      startTime: toSeconds(timeRange.startTime),
      endTime: toSeconds(timeRange.endTime),
    });
    playerKeyRef.current += 1;
    if (onNavigate) onNavigate(view, seconds);
  }, [onNavigate]);

  // Handle #t= timestamp links from markdown — seek video
  const handleTimestamp = useCallback((startTime, endTime) => {
    const seconds = toSeconds(startTime);
    setCurrentSeek(seconds);
    playerKeyRef.current += 1;
    if (onNavigate) onNavigate('full', seconds);
  }, [onNavigate]);

  const mdComponents = buildModalMdComponents(handleTimestamp);

  const content = seal?.content;
  const highlights = currentHighlight
    ? [{ startTime: currentHighlight.startTime, endTime: currentHighlight.endTime, color: 'rgb(168,85,247)' }]
    : [];

  const videoUrl = getVideoUrl(lectureBasename);

  // Split markdown for tabs 2 & 3
  const { essence, activation } = sealMeta?.details?.he
    ? splitDetailsMarkdown(sealMeta.details.he)
    : { essence: '', activation: '' };

  const tabValue = activeTab || 'hatmaa';

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-[95vw] max-h-[90vh] overflow-y-auto p-0" dir="rtl" closeLabel={seal?.name}>
        {seal ? (
          <>
            {/* Header — title, subtitle, then keyConcepts+buttons flush to bottom */}
            <div className="pl-4 pr-10 pt-9 pb-3 border-b border-border flex flex-col gap-0.5">
              {/* Title — right-aligned, indented from X to align with "חותם" label */}
              <DialogTitle className="font-bold text-lg text-right">
                {seal.purposeSummary}
              </DialogTitle>

              {/* Subtitle immediately below title */}
              {content?.sealTitle && (
                <p className="text-sm font-medium text-primary text-right">
                  {content.sealTitle}
                </p>
              )}

              {/* Bottom row: keyConcepts RIGHT (first in RTL), nav buttons LEFT (last) — flush to separator */}
              {(seal.keyConcepts?.length > 0 || sealMeta) && (
                <div className="flex items-center justify-between gap-4">
                  {seal.keyConcepts && seal.keyConcepts.length > 0 && (
                    <p className="text-xs text-muted-foreground min-w-0">
                      {seal.keyConcepts.join(' · ')}
                    </p>
                  )}
                  {sealMeta && (
                    <div className="flex flex-wrap gap-1.5 shrink-0">
                      {sealMeta.hatmaaTime && (
                        <button
                          onClick={() => handleNavigate(sealMeta.hatmaaTime, 'hatmaa')}
                          className={`flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-full transition ${
                            activeView === 'hatmaa'
                              ? 'bg-primary/10 text-primary'
                              : 'bg-accent text-accent-foreground hover:bg-accent/80'
                          }`}
                        >
                          <Play className="w-3 h-3" />
                          הטמעה
                        </button>
                      )}
                      {sealMeta.explanationTime && (
                        <button
                          onClick={() => handleNavigate(sealMeta.explanationTime, 'explanation')}
                          className={`flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-full transition ${
                            activeView === 'explanation'
                              ? 'bg-primary/10 text-primary'
                              : 'bg-accent text-accent-foreground hover:bg-accent/80'
                          }`}
                        >
                          <BookOpen className="w-3 h-3" />
                          הסבר
                        </button>
                      )}
                      {sealMeta.fullRange && (
                        <button
                          onClick={() => handleNavigate(sealMeta.fullRange, 'full')}
                          className={`flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-full transition ${
                            activeView === 'full'
                              ? 'bg-primary/10 text-primary'
                              : 'bg-accent text-accent-foreground hover:bg-accent/80'
                          }`}
                        >
                          <Sparkles className="w-3 h-3" />
                          כל הקטע
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Seal image + Player — seal on right (RTL start), video on left */}
            <div className="relative flex items-stretch gap-4 px-4 pb-4 pt-7">
              {seal.imageUrl && (
                <div className="hidden sm:block w-1/3 shrink-0 relative">
                  {/* "אהיה יהוה אדני" centered above this column using the top margin space */}
                  <p className="absolute -top-5 left-0 right-0 text-center text-xs font-medium text-muted-foreground tracking-wide pointer-events-none">
                    אהיה יהוה אדני
                  </p>
                  <div className="w-full h-full overflow-hidden rounded-lg">
                    <motion.img
                      key={seal.imageUrl}
                      src={seal.imageUrl}
                      alt={seal.name}
                      className="w-full h-full object-cover"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.2 }}
                    />
                  </div>
                </div>
              )}

              <div
                ref={videoContainerRef}
                className={seal.imageUrl ? 'w-2/3' : 'w-full'}
              >
                {lectureName && (
                  <p className="text-xs text-center text-muted-foreground mb-1.5 truncate">
                    {formatLectureName(lectureName)}
                  </p>
                )}
                {lectureBasename && (
                  <VideoPlayer
                    key={`${lectureBasename}-${playerKeyRef.current}`}
                    videoUrl={videoUrl}
                    subtitleBasename={lectureBasename}
                    startTime={currentSeek}
                    highlightRanges={highlights}
                  />
                )}
              </div>
            </div>

            {/* 4-tab content area below player */}
            <Tabs value={tabValue} onValueChange={onTabChange} dir="rtl">
              <TabsList className="w-full flex justify-start rounded-none border-b border-border bg-transparent h-auto p-0 gap-1">
                <TabsTrigger
                  value="properties"
                  className="px-4 text-xs py-2 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent"
                >
                  תכונות
                </TabsTrigger>
                <TabsTrigger
                  value="essence"
                  className="px-4 text-xs py-2 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent"
                >
                  מהות
                </TabsTrigger>
                <TabsTrigger
                  value="activation"
                  className="px-4 text-xs py-2 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent"
                >
                  הפעלה
                </TabsTrigger>
                <TabsTrigger
                  value="hatmaa"
                  className="px-4 text-xs py-2 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent"
                >
                  הטמעה
                </TabsTrigger>
              </TabsList>

              {/* Tab 1: Properties */}
              <TabsContent value="properties" className="mt-0">
                <div className="p-4 space-y-3 max-h-80 overflow-y-auto">
                  {content && (
                    <>
                      <p className="text-sm leading-relaxed">{content.description}</p>
                      {content.qualities && content.qualities.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold text-purple-700 mb-1">תכונות</p>
                          <div className="space-y-0.5">
                            {content.qualities.map((q, i) => (
                              <div key={i} className="flex gap-1 text-sm">
                                <span className="font-medium text-primary shrink-0">{q.name}</span>
                                <span className="text-muted-foreground">— {q.explanation}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      {content.sideAttributes && content.sideAttributes.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold text-purple-700 mb-1">שמות</p>
                          <div className="space-y-0.5">
                            {content.sideAttributes.map((a, i) => (
                              <div key={i} className="flex gap-1 text-sm">
                                <span className="font-medium text-primary shrink-0">{a.name}</span>
                                <span className="text-muted-foreground">— {a.explanation}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </TabsContent>

              {/* Tab 2: Essence (מהות) */}
              <TabsContent value="essence" className="mt-0">
                <div className="p-4 max-h-80 overflow-y-auto">
                  {essence ? (
                    <ReactMarkdown components={mdComponents}>{essence}</ReactMarkdown>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center">אין מידע נוסף</p>
                  )}
                </div>
              </TabsContent>

              {/* Tab 3: Activation (הפעלה) */}
              <TabsContent value="activation" className="mt-0">
                <div className="p-4 max-h-80 overflow-y-auto">
                  {activation ? (
                    <ReactMarkdown components={mdComponents}>{activation}</ReactMarkdown>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center">אין מידע נוסף</p>
                  )}
                </div>
              </TabsContent>

              {/* Tab 4: Hatmaa (הטמעה) */}
              <TabsContent value="hatmaa" className="mt-0">
                <div className="p-4 space-y-3 max-h-80 overflow-y-auto">
                  {hatmaa ? (
                    <>
                      <p className="text-sm font-semibold">{hatmaa.name}</p>
                      {hatmaa.goal && (
                        <p className="text-sm text-muted-foreground">{hatmaa.goal}</p>
                      )}
                      {hatmaa.transcription && (
                        <div className="mt-2">
                          <p className="text-xs font-semibold text-purple-700 mb-1">תמלול</p>
                          <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
                            {hatmaa.transcription}
                          </p>
                        </div>
                      )}
                    </>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center">אין הטמעה זמינה</p>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </>
        ) : (
          <VisuallyHidden>
            <DialogTitle>חותם</DialogTitle>
          </VisuallyHidden>
        )}
      </DialogContent>
    </Dialog>
  );
}
