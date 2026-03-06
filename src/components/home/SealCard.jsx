/**
 * SealCard — a single seal in the catalog grid.
 *
 * Collapsed: thumbnail image, title, subtitle (sealTitle), key concepts.
 * Hover → overlay grows smoothly from the card's actual size.
 * Click → navigate to SealDetail.
 *
 * Expanded overlay has 4 tabs:
 *   Tab 1 (תכונות): description, qualities, sideAttributes
 *   Tab 2 (מהות): essence markdown (מהות החותם + למה מתאים)
 *   Tab 3 (הפעלה): activation markdown (איך מפעילים + תהליך הצריבה)
 *   Tab 4 (הטמעה): hatmaa name/goal + transcription preview
 *
 * Video links (הטמעה / הסבר / כל הקטע) appear in the top section header.
 *
 * Direction logic (space-aware):
 *   RTL: overlay expands to the LEFT by default.
 *        Exception: leftmost cards expand to the RIGHT.
 *   LTR: overlay expands to the RIGHT by default.
 *        Exception: rightmost cards expand to the LEFT.
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useSealLectureData, sealHasLectureData } from '@/hooks/useSealLectureData';
import { toSeconds } from '@/components/player/utils';
import { Play, Loader2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

const MIN_EXPANDED_WIDTH = 340;
const MIN_EXPANDED_HEIGHT = 380; // overlay always renders at this height; clip-path reveals from card footprint
const EDGE_MARGIN = 8;

// Debug animation speeds: { duration, hoverDelay, label }
export const ANIM_SPEEDS = {
  fast:   { duration: 0.25, exit: 0.15, hoverDelay: 250, label: '100%' },
  medium: { duration: 1.0,  exit: 0.6,  hoverDelay: 400, label: '50%' },
  slow:   { duration: 2.0,  exit: 2.0,  hoverDelay: 500, label: '25%' },
};

/** Build ReactMarkdown component overrides for compact display.
 *  onTimestamp(startTime, endTime) is called when a #t= link is clicked. */
function buildMdComponents(onTimestamp) {
  return {
    h3: ({ children }) => (
      <p className="text-[11px] font-semibold text-purple-700 mt-2 mb-1">{children}</p>
    ),
    p: ({ children }) => (
      <p className="text-xs leading-relaxed mb-1.5">{children}</p>
    ),
    ul: ({ children }) => (
      <ul className="text-xs space-y-0.5 mb-1.5 pr-3">{children}</ul>
    ),
    li: ({ children }) => (
      <li className="text-xs leading-relaxed list-disc">{children}</li>
    ),
    strong: ({ children }) => (
      <strong className="font-semibold text-foreground">{children}</strong>
    ),
    a: ({ href, children }) => {
      const match = href && href.match(/#t=([^&]+)(?:&end=(.+))?/);
      if (match && onTimestamp) {
        return (
          <button
            onClick={(e) => { e.stopPropagation(); onTimestamp(match[1], match[2]); }}
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

export default function SealCard({ seal, onOpenHatmaa, animSpeed = 'fast' }) {
  const speed = ANIM_SPEEDS[animSpeed] || ANIM_SPEEDS.fast;
  const [isExpanded, setIsExpanded] = useState(false);
  const [anchor, setAnchor] = useState({ x: 'left', y: 'top' });
  const [cardSize, setCardSize] = useState({ width: 0, height: 0 });
  const expandedSizeRef = useRef({ width: MIN_EXPANDED_WIDTH, height: 0 });
  const cardRef = useRef(null);
  const hoverTimeoutRef = useRef(null);

  // Only load lecture data when card is expanded and seal has lecture data
  const hasLecture = sealHasLectureData(seal.number);
  const {
    sealMeta, hatmaa, lectureName, lectureBasename,
    isLoading: lectureLoading, hasData,
    essenceMarkdown, activationMarkdown,
  } = useSealLectureData(seal.number, seal.imageUrl, isExpanded && hasLecture);

  const calculateAnchor = useCallback((expandedW) => {
    if (!cardRef.current) return { x: 'right', y: 'top' };
    const rect = cardRef.current.getBoundingClientRect();
    const viewW = window.innerWidth;
    const isRTL = getComputedStyle(document.documentElement).direction === 'rtl';

    // x: RTL default = 'right' (expands leftward). Switch to 'left' for leftmost column
    // (when overlay would overflow the left viewport edge).
    let x;
    if (isRTL) {
      x = rect.right - expandedW < EDGE_MARGIN ? 'left' : 'right';
    } else {
      x = rect.left + expandedW > viewW - EDGE_MARGIN ? 'right' : 'left';
    }

    // y: default 'top'. Switch to 'bottom' only for cards in the last row of the grid.
    // Compare card bottom to parent (grid) bottom — scroll-position independent.
    let y = 'top';
    const gridEl = cardRef.current.parentElement;
    if (gridEl) {
      const gridBottom = gridEl.getBoundingClientRect().bottom;
      if (rect.bottom >= gridBottom - rect.height * 0.5) y = 'bottom';
    }

    return { x, y };
  }, []);

  const handleMouseEnter = useCallback(() => {
    hoverTimeoutRef.current = setTimeout(() => {
      if (cardRef.current) {
        const rect = cardRef.current.getBoundingClientRect();
        const viewH = window.innerHeight;
        // Visible portion of card (for clip-path start size)
        const visibleW = Math.min(rect.right, window.innerWidth) - Math.max(rect.left, 0);
        const visibleH = Math.min(rect.bottom, viewH) - Math.max(rect.top, 0);
        setCardSize({
          width: Math.max(visibleW, 0),
          height: Math.max(visibleH, 0),
        });
        // Full card dimensions (for overlay size)
        expandedSizeRef.current = {
          width: Math.max(Math.ceil(rect.width), MIN_EXPANDED_WIDTH),
          height: Math.ceil(rect.height),
        };
        setAnchor(calculateAnchor(expandedSizeRef.current.width));
      } else {
        setAnchor(calculateAnchor(MIN_EXPANDED_WIDTH));
      }
      setIsExpanded(true);
    }, speed.hoverDelay);
  }, [calculateAnchor, speed.hoverDelay]);

  const handleMouseLeave = useCallback(() => {
    clearTimeout(hoverTimeoutRef.current);
    setIsExpanded(false);
  }, []);

  useEffect(() => {
    return () => clearTimeout(hoverTimeoutRef.current);
  }, []);

  const content = seal.content;

  // 2D clip-path reveal: overlay at full size, clip starts at ~20% of card from anchor corner.
  // overlayH uses full card height (not just visible) so dialog covers the entire card.
  const overlayW = expandedSizeRef.current.width;
  const overlayH = Math.min(
    Math.max(MIN_EXPANDED_HEIGHT, expandedSizeRef.current.height),
    Math.floor(window.innerHeight * 0.8),
  );
  const startW = Math.max(cardSize.width * 0.2, 8);
  const startH = Math.max(cardSize.height * 0.2, 8);
  const dW = overlayW - startW;
  const dH = overlayH - startH;
  const clipTop    = anchor.y === 'bottom' ? dH : 0;
  const clipRight  = anchor.x === 'left'   ? dW : 0;
  const clipBottom = anchor.y === 'top'    ? dH : 0;
  const clipLeft   = anchor.x === 'right'  ? dW : 0;
  const initialClip = `inset(${clipTop}px ${clipRight}px ${clipBottom}px ${clipLeft}px round var(--radius))`;
  const finalClip   = 'inset(0px 0px 0px 0px round 0.75rem)';

  const posStyle = {
    [anchor.y === 'top' ? 'top' : 'bottom']: 0,
    [anchor.x]: 0,
  };

  const handleHatmaaLink = useCallback(
    (timeRange, view) => {
      if (!sealMeta || !lectureBasename || !onOpenHatmaa) return;
      onOpenHatmaa({
        seal,
        sealMeta,
        hatmaa,
        lectureName,
        lectureBasename,
        seekTime: toSeconds(timeRange.startTime),
        highlightRange: {
          startTime: toSeconds(timeRange.startTime),
          endTime: toSeconds(timeRange.endTime),
        },
        view,
      });
    },
    [seal, sealMeta, hatmaa, lectureName, lectureBasename, onOpenHatmaa],
  );

  // Handle #t= timestamp links from markdown — open modal at that time
  const handleTimestamp = useCallback(
    (startTime, endTime) => {
      if (!sealMeta || !lectureBasename || !onOpenHatmaa) return;
      onOpenHatmaa({
        seal,
        sealMeta,
        hatmaa,
        lectureName,
        lectureBasename,
        seekTime: toSeconds(startTime),
        highlightRange: endTime
          ? { startTime: toSeconds(startTime), endTime: toSeconds(endTime) }
          : null,
        view: 'full',
      });
    },
    [seal, sealMeta, hatmaa, lectureName, lectureBasename, onOpenHatmaa],
  );

  return (
    <div
      ref={cardRef}
      className="relative h-full"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Collapsed card */}
      <Link
        to={createPageUrl('SealDetail') + `?id=${seal.id}`}
        className="flex flex-col h-full w-full text-start border border-border rounded-lg overflow-hidden hover:shadow-md transition group bg-card"
      >
        <div className="aspect-square bg-muted flex items-center justify-center overflow-hidden shrink-0">
          {seal.imageUrl ? (
            <img
              src={seal.imageUrl}
              alt={seal.name}
              className="w-full h-full object-contain p-2"
              loading="lazy"
            />
          ) : (
            <span className="text-3xl text-muted-foreground">{seal.number}</span>
          )}
        </div>
        <div className="p-3 flex-1">
          <p className="text-sm font-semibold truncate">{seal.purposeSummary}</p>
          {content?.sealTitle && (
            <p className="text-xs font-medium text-primary/80 mt-0.5 truncate">
              {content.sealTitle}
            </p>
          )}
          {seal.keyConcepts && seal.keyConcepts.length > 0 && (
            <p className="text-xs text-muted-foreground/70 mt-1 line-clamp-3">
              {seal.keyConcepts.join(' · ')}
            </p>
          )}
        </div>
      </Link>

      {/* Expanded overlay — morphs from card footprint into full overlay */}
      <AnimatePresence>
        {isExpanded && content && (
          <motion.div
            className="absolute z-30 bg-card border border-border shadow-2xl rounded-xl overflow-y-auto"
            style={{
              ...posStyle,
              width: expandedSizeRef.current.width,
              minHeight: overlayH,
              maxHeight: '80vh',
            }}
            initial={{ clipPath: initialClip }}
            animate={{ clipPath: finalClip }}
            exit={{
              clipPath: initialClip,
              transition: { duration: speed.exit, ease: [0.4, 0, 1, 1] },
            }}
            transition={{
              clipPath: { duration: speed.duration, ease: [0, 0, 0.2, 1] },
            }}
          >
              {/* Top section — image on right (RTL), text beside it, links top-left */}
              <div className="p-3 border-b border-border">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-[10px] text-muted-foreground">{content.mainTitle}</p>
                  {/* Video quick-links (top-left in RTL) */}
                  {hasLecture && hasData && sealMeta && (
                    <div className="flex gap-2 text-[10px]">
                      {sealMeta.hatmaaTime && (
                        <button
                          onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleHatmaaLink(sealMeta.hatmaaTime, 'hatmaa'); }}
                          className="text-purple-600 underline decoration-purple-300 hover:decoration-purple-600"
                        >
                          הטמעה
                        </button>
                      )}
                      {sealMeta.explanationTime && (
                        <button
                          onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleHatmaaLink(sealMeta.explanationTime, 'explanation'); }}
                          className="text-purple-600 underline decoration-purple-300 hover:decoration-purple-600"
                        >
                          הסבר
                        </button>
                      )}
                      {sealMeta.fullRange && (
                        <button
                          onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleHatmaaLink(sealMeta.fullRange, 'full'); }}
                          className="text-purple-600 underline decoration-purple-300 hover:decoration-purple-600"
                        >
                          כל הקטע
                        </button>
                      )}
                    </div>
                  )}
                </div>
                <div className="flex items-start gap-2">
                  {seal.imageUrl && (
                    <img
                      src={seal.imageUrl}
                      alt={seal.name}
                      className="w-20 h-20 object-contain shrink-0"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm">{seal.purposeSummary}</p>
                    <p className="text-xs font-medium text-primary mt-0.5">{content.sealTitle}</p>
                    {seal.keyConcepts && seal.keyConcepts.length > 0 && (
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                        {seal.keyConcepts.join(' · ')}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Bottom section — 4 tabs or plain properties */}
              {hasLecture ? (
                <Tabs defaultValue="properties" dir="rtl">
                  <TabsList className="w-full flex rounded-none border-b border-border bg-transparent h-auto p-0">
                    <TabsTrigger
                      value="properties"
                      className="flex-1 text-[11px] py-1.5 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent"
                    >
                      תכונות
                    </TabsTrigger>
                    <TabsTrigger
                      value="essence"
                      className="flex-1 text-[11px] py-1.5 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent"
                    >
                      מהות
                    </TabsTrigger>
                    <TabsTrigger
                      value="activation"
                      className="flex-1 text-[11px] py-1.5 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent"
                    >
                      הפעלה
                    </TabsTrigger>
                    <TabsTrigger
                      value="hatmaa"
                      className="flex-1 text-[11px] py-1.5 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent"
                    >
                      הטמעה
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="properties" className="mt-0">
                    <PropertiesTab content={content} />
                  </TabsContent>

                  <TabsContent value="essence" className="mt-0">
                    <MarkdownTab markdown={essenceMarkdown} isLoading={lectureLoading} onTimestamp={handleTimestamp} />
                  </TabsContent>

                  <TabsContent value="activation" className="mt-0">
                    <MarkdownTab markdown={activationMarkdown} isLoading={lectureLoading} onTimestamp={handleTimestamp} />
                  </TabsContent>

                  <TabsContent value="hatmaa" className="mt-0">
                    {lectureLoading ? (
                      <div className="flex justify-center py-6">
                        <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                      </div>
                    ) : hasData && sealMeta ? (
                      <HatmaaTab hatmaa={hatmaa} onOpenVideo={() => {
                        if (sealMeta.hatmaaTime) handleHatmaaLink(sealMeta.hatmaaTime, 'hatmaa');
                      }} />
                    ) : (
                      <p className="p-3 text-xs text-muted-foreground text-center">
                        אין הטמעה זמינה
                      </p>
                    )}
                  </TabsContent>
                </Tabs>
              ) : (
                <PropertiesTab content={content} />
              )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/** Tab 1 — description, qualities, sideAttributes */
function PropertiesTab({ content }) {
  return (
    <div className="p-3 space-y-2">
      <p className="text-xs leading-relaxed">{content.description}</p>

      {content.qualities && content.qualities.length > 0 && (
        <div>
          <p className="text-[10px] font-semibold text-purple-700 mb-1">תכונות</p>
          <div className="space-y-0.5">
            {content.qualities.map((q, i) => (
              <div key={i} className="flex gap-1 text-xs">
                <span className="font-medium text-primary shrink-0">{q.name}</span>
                <span className="text-muted-foreground">— {q.explanation}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {content.sideAttributes && content.sideAttributes.length > 0 && (
        <div>
          <p className="text-[10px] font-semibold text-purple-700 mb-1">שמות</p>
          <div className="space-y-0.5">
            {content.sideAttributes.map((a, i) => (
              <div key={i} className="flex gap-1 text-xs">
                <span className="font-medium text-primary shrink-0">{a.name}</span>
                <span className="text-muted-foreground">— {a.explanation}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/** Tabs 2 & 3 — renders markdown content with loading/empty states */
function MarkdownTab({ markdown, isLoading, onTimestamp }) {
  if (isLoading) {
    return (
      <div className="flex justify-center py-6">
        <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (!markdown) {
    return (
      <p className="p-3 text-xs text-muted-foreground text-center">אין מידע נוסף</p>
    );
  }
  const components = buildMdComponents(onTimestamp);
  return (
    <div className="p-3 prose-sm">
      <ReactMarkdown components={components}>{markdown}</ReactMarkdown>
    </div>
  );
}

/** Tab 4 — hatmaa name/goal + transcription (video links moved to top section) */
function HatmaaTab({ hatmaa, onOpenVideo }) {
  return (
    <div className="p-3 space-y-2">
      {hatmaa ? (
        <>
          <p className="text-xs font-semibold">{hatmaa.name}</p>
          {hatmaa.goal && (
            <p className="text-xs text-muted-foreground leading-relaxed">{hatmaa.goal}</p>
          )}
          {hatmaa.transcription && (
            <div className="pt-1">
              <p className="text-[10px] font-semibold text-purple-700 mb-0.5">תמלול</p>
              <p className="text-xs text-muted-foreground leading-relaxed line-clamp-4">
                {hatmaa.transcription}
              </p>
            </div>
          )}
          <button
            onClick={(e) => { e.stopPropagation(); onOpenVideo(); }}
            className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium bg-primary/10 text-primary rounded-full hover:bg-primary/20 transition mt-1"
          >
            <Play className="w-3 h-3" />
            פתח וידאו
          </button>
        </>
      ) : (
        <p className="text-xs text-muted-foreground text-center">אין הטמעה זמינה</p>
      )}
    </div>
  );
}
