/**
 * ClassLibrary — Browse course classes with expandable lecture rows and inline video player.
 *
 * Route: /ClassLibrary?tab={classKey}
 *
 * Transcribed class (hatmaot): expandable rows → VideoPanel with full 4-tab LectureDetail content.
 * Non-transcribed classes: expandable rows → "הפעל" opens Vimeo in new tab.
 */

import { useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import { useClasses, useLectures, useLectureMetadata } from '@/hooks/useData';
import { usePlayerLayout } from '@/hooks/usePlayerLayout';
import VideoPanel from '@/components/shared/VideoPanel';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Play, BookOpen, Quote, Star, ChevronDown, ExternalLink, Clock } from 'lucide-react';

// ─── Lecture panel below-video content ────────────────────────────────────────

function LecturePanelContent({ metadata, onSeek }) {
  const defaultTab = metadata?.summary?.he ? 'summary'
    : metadata?.hatmaot?.length ? 'hatmaot'
    : metadata?.seals?.length ? 'seals'
    : 'quotes';
  const [tab, setTab] = useState(defaultTab);

  const hasSummary = !!metadata?.summary?.he;
  const hasHatmaot = metadata?.hatmaot?.length > 0;
  const hasSeals   = metadata?.seals?.length > 0;
  const hasQuotes  = metadata?.quotes?.length > 0;

  const mdComponents = useMemo(() => ({
    a: ({ href, children }) => {
      const seekMatch = href?.match(/^#seek=([\w-]+)$/);
      if (seekMatch) {
        const pos =
          metadata?.positions?.find((p) => p.slug === seekMatch[1]) ||
          metadata?.hatmaot?.find((h) => h.slug === seekMatch[1]);
        if (pos) {
          return (
            <button onClick={() => onSeek(pos.startTime, pos)}
              className="text-purple-600 underline decoration-purple-300 hover:decoration-purple-600">
              {pos.startTime.slice(0, 5)} ▶
            </button>
          );
        }
      }
      const timeMatch = href?.match(/^#t=(\d+:\d+:\d+)/);
      if (timeMatch) {
        return (
          <button onClick={() => onSeek(timeMatch[1])}
            className="text-purple-600 underline decoration-purple-300 hover:decoration-purple-600">
            {children}
          </button>
        );
      }
      return <a href={href} className="text-primary underline">{children}</a>;
    },
  }), [metadata, onSeek]);

  if (!metadata) return null;

  return (
    <div className="border-t border-border/40 pt-3 max-h-[40vh] overflow-y-auto pb-4">
      <Tabs value={tab} onValueChange={setTab} dir="rtl">
        <TabsList className="h-7 w-full mb-2">
          {hasSummary && <TabsTrigger value="summary"  className="text-xs flex-1 h-6 gap-1"><BookOpen className="w-3 h-3" />תקציר</TabsTrigger>}
          {hasHatmaot && <TabsTrigger value="hatmaot"  className="text-xs flex-1 h-6 gap-1"><Play className="w-3 h-3" />הטמעות</TabsTrigger>}
          {hasSeals   && <TabsTrigger value="seals"    className="text-xs flex-1 h-6 gap-1"><Star className="w-3 h-3" />חותמות</TabsTrigger>}
          {hasQuotes  && <TabsTrigger value="quotes"   className="text-xs flex-1 h-6 gap-1"><Quote className="w-3 h-3" />ציטוטים</TabsTrigger>}
        </TabsList>

        {hasSummary && (
          <TabsContent value="summary" className="mt-0 px-2">
            <div className="prose prose-sm max-w-none dark:prose-invert text-right" dir="rtl">
              <ReactMarkdown components={mdComponents}>{metadata.summary.he}</ReactMarkdown>
            </div>
          </TabsContent>
        )}

        {hasHatmaot && (
          <TabsContent value="hatmaot" className="mt-0 px-2">
            <div className="space-y-2" dir="rtl">
              {metadata.hatmaot.map((h, i) => (
                <div key={i} className="border border-border rounded-lg p-3 space-y-1">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-[11px] font-semibold leading-snug flex-1">{h.name}</p>
                    {h.startTime && (
                      <button onClick={() => onSeek(h.startTime, { startTime: h.startTime, endTime: h.endTime })}
                        className="shrink-0 flex items-center gap-0.5 text-[10px] text-purple-600 hover:underline">
                        <Play className="w-2.5 h-2.5 fill-current" />
                        {h.startTime.slice(0, 5)}
                      </button>
                    )}
                  </div>
                  {h.goal && <p className="text-[10px] text-muted-foreground italic leading-relaxed">{h.goal}</p>}
                </div>
              ))}
            </div>
          </TabsContent>
        )}

        {hasSeals && (
          <TabsContent value="seals" className="mt-0 px-2">
            <div className="space-y-3" dir="rtl">
              {metadata.seals.map((seal, i) => (
                <div key={i} className="border border-border rounded-lg p-3 space-y-2">
                  <div className="flex items-center gap-2">
                    {seal.imageUrl && (
                      <img src={seal.imageUrl} alt={seal.name?.he}
                        className="w-10 h-10 object-contain rounded bg-muted p-0.5 shrink-0" />
                    )}
                    <div className="min-w-0">
                      <p className="text-[11px] font-medium">{seal.name?.he}</p>
                      {seal.description?.he && <p className="text-[10px] text-muted-foreground">{seal.description.he}</p>}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {seal.explanationTime && (
                      <button onClick={() => onSeek(seal.explanationTime.startTime, seal.explanationTime)}
                        className="flex items-center gap-1 px-2 py-1 rounded-full text-[10px] bg-blue-500/10 text-blue-600 hover:bg-blue-500/20 transition">
                        <BookOpen className="w-2.5 h-2.5" />הסבר — {seal.explanationTime.startTime.slice(0, 5)}
                      </button>
                    )}
                    {seal.hatmaaTime && (
                      <button onClick={() => onSeek(seal.hatmaaTime.startTime, seal.hatmaaTime)}
                        className="flex items-center gap-1 px-2 py-1 rounded-full text-[10px] bg-purple-500/10 text-purple-600 hover:bg-purple-500/20 transition">
                        <Play className="w-2.5 h-2.5 fill-current" />הטמעה — {seal.hatmaaTime.startTime.slice(0, 5)}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>
        )}

        {hasQuotes && (
          <TabsContent value="quotes" className="mt-0 px-2">
            <div dir="rtl">
              {metadata.quotes.map((q, i) => (
                <div key={i} className="border-b border-border/40 last:border-0 py-2.5 space-y-1">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-[10px] font-medium text-primary flex-1">{q.source}</p>
                    {q.timestamp && (
                      <button onClick={() => onSeek(q.timestamp)}
                        className="shrink-0 flex items-center gap-0.5 text-[10px] text-muted-foreground hover:text-primary">
                        <Clock className="w-2.5 h-2.5" />{q.timestamp.slice(0, 5)}
                      </button>
                    )}
                  </div>
                  <blockquote className="text-[10px] border-r-2 border-primary/30 pr-2 italic leading-relaxed">
                    {q.text}
                  </blockquote>
                  {q.context && <p className="text-[10px] text-muted-foreground">{q.context}</p>}
                </div>
              ))}
            </div>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}

// ─── Transcribed lecture row ───────────────────────────────────────────────────

function TranscribedLectureRow({ lecture, lectureIndex, isPlaying, onPlay }) {
  const [expanded, setExpanded] = useState(false);
  const titleShort = lecture.title.he.replace(/^שיעור \d+:\s+/, '');

  return (
    <div
      data-lecture={lecture.basename}
      className={`border-b border-border/60 last:border-0 transition ${isPlaying ? 'bg-primary/5 border-r-2 border-r-primary' : ''}`}
    >
      <div
        role="button"
        tabIndex={0}
        onClick={() => { if (!window.getSelection()?.toString()) setExpanded((e) => !e); }}
        onKeyDown={(e) => e.key === 'Enter' && setExpanded((v) => !v)}
        className="flex items-stretch gap-2 px-3 cursor-pointer hover:bg-accent/50 transition"
        dir="rtl"
      >
        {/* Number */}
        <span className="text-[10px] text-muted-foreground font-mono w-6 shrink-0 text-center self-center py-2.5">
          {lectureIndex + 1}
        </span>

        {/* Title + description + inline play */}
        <div className="flex-1 min-w-0 py-2.5">
          <div className="flex items-center gap-1.5">
            <p className="font-medium text-sm leading-tight">{titleShort}</p>
            <button
              onClick={(e) => { e.stopPropagation(); onPlay(lecture, '00:00:00'); }}
              className="flex items-center gap-1 text-[11px] font-medium text-purple-600 hover:text-purple-700 shrink-0 px-1.5 py-0.5 rounded hover:bg-purple-50 transition"
            >
              <Play className="w-3 h-3 fill-current" style={{ transform: 'scaleX(-1)' }} />
              <span className="hidden sm:inline">הפעל</span>
            </button>
          </div>
          {lecture.description?.he && (
            <p className="text-[11px] text-muted-foreground/70 mt-0.5 leading-relaxed truncate">
              {lecture.description.he}
            </p>
          )}
        </div>

        <ChevronDown className={`w-3.5 h-3.5 text-muted-foreground shrink-0 transition-transform duration-200 self-center ${expanded ? 'rotate-180' : ''}`} />
      </div>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18, ease: 'easeInOut' }}
            style={{ overflow: 'hidden' }}
          >
            <div className="px-4 pb-3 pt-1" dir="rtl">
              <div className="flex items-center gap-3 text-[10px] text-muted-foreground flex-wrap">
                {lecture.hatmaotCount > 0 && <span>{lecture.hatmaotCount} הטמעות</span>}
                {lecture.sealCount > 0    && <span>{lecture.sealCount} חותמות</span>}
                {lecture.quoteCount > 0   && <span>{lecture.quoteCount} ציטוטים</span>}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Simple (Vimeo) lecture row ────────────────────────────────────────────────

function SimpleLectureRow({ lecture }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="border-b border-border/60 last:border-0">
      <div
        role="button"
        tabIndex={0}
        onClick={() => { if (!window.getSelection()?.toString()) setExpanded((e) => !e); }}
        onKeyDown={(e) => e.key === 'Enter' && setExpanded((v) => !v)}
        className="flex items-center gap-2 px-3 py-2.5 cursor-pointer hover:bg-accent/30 transition"
      >
        <div className="flex-1 min-w-0 text-right" dir="rtl">
          <p className="text-sm font-medium leading-snug truncate">{lecture.title}</p>
          {lecture.description && (
            <p className="text-[11px] text-muted-foreground truncate">{lecture.description}</p>
          )}
        </div>
        <ChevronDown className={`w-3.5 h-3.5 text-muted-foreground shrink-0 transition-transform duration-200 ${expanded ? '' : '-rotate-90'}`} />
      </div>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18, ease: 'easeInOut' }}
            style={{ overflow: 'hidden' }}
          >
            <div className="px-3 pb-3" dir="rtl">
              <a
                href={lecture.videoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline"
              >
                <Play className="w-3 h-3 fill-current" />
                הפעל שיעור
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Simple class grouped by category ─────────────────────────────────────────

function SimpleClassLectures({ lectures }) {
  const groups = useMemo(() => {
    const map = new Map();
    lectures.forEach((l) => {
      const cat = l.category || '';
      if (!map.has(cat)) map.set(cat, []);
      map.get(cat).push(l);
    });
    return [...map.entries()];
  }, [lectures]);

  const hasCategories = groups.length > 1 || (groups.length === 1 && groups[0][0] !== '');

  return (
    <div className="space-y-4">
      {groups.map(([category, items]) => (
        <div key={category}>
          {hasCategories && category && (
            <h3 className="text-xs font-semibold text-muted-foreground mb-2 text-right" dir="rtl">
              {category.replace(/_/g, ' ')}
            </h3>
          )}
          <div className="border border-border rounded-lg overflow-hidden">
            {items.map((lecture, i) => (
              <SimpleLectureRow key={`${lecture.videoUrl}-${i}`} lecture={lecture} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function ClassLibrary() {
  const [searchParams, setSearchParams] = useSearchParams();
  const classes = useClasses();
  const lectures = useLectures();

  const activeTab = searchParams.get('tab') || classes[0]?.key || '';
  const activeClass = classes.find((c) => c.key === activeTab) ?? classes[0];

  const {
    selectedItem: selectedLecture,
    seekTime, seekRevision, autoPlay, selectedHighlight,
    handlePlay, handleSeek, handleClose,
    isDesktop, stickyTop, headerRef, playerRef,
  } = usePlayerLayout();

  const { data: lectureMetadata } = useLectureMetadata(selectedLecture?.basename ?? null);

  const showPanel = !!selectedLecture && !!activeClass?.isTranscribed;

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold mb-4 text-right" dir="rtl">ספריית שיעורים</h1>

      <Tabs value={activeTab} onValueChange={(v) => setSearchParams({ tab: v })} dir="rtl">
        <TabsList className="w-full mb-6">
          {classes.map((cls) => (
            <TabsTrigger key={cls.key} value={cls.key} className="flex-1 text-xs">
              {cls.name}
            </TabsTrigger>
          ))}
        </TabsList>

        {classes.map((cls) => (
          <TabsContent key={cls.key} value={cls.key} className="mt-0">
            <div className={showPanel && isDesktop ? 'flex gap-6 items-start' : ''}>
              {/* Lecture list */}
              <div className={showPanel && isDesktop ? 'flex-1 min-w-0 border-r border-border pr-6' : ''}>
                {cls.description && (
                  <p className="text-sm text-muted-foreground mb-4 text-right" dir="rtl">{cls.description}</p>
                )}
                {cls.isTranscribed ? (
                  <div className="border border-border rounded-lg overflow-hidden">
                    {lectures.map((lecture, i) => (
                      <TranscribedLectureRow
                        key={lecture.basename}
                        lecture={lecture}
                        lectureIndex={i}
                        isPlaying={selectedLecture?.basename === lecture.basename}
                        onPlay={handlePlay}
                      />
                    ))}
                  </div>
                ) : (
                  <SimpleClassLectures lectures={cls.lectures} />
                )}
              </div>

              {/* Video panel — transcribed classes only */}
              {showPanel && (
                <VideoPanel
                  isDesktop={isDesktop}
                  stickyTop={stickyTop}
                  headerRef={headerRef}
                  playerRef={playerRef}
                  onClose={handleClose}
                  onSeek={handleSeek}
                  parentTitle={cls.name}
                  itemTitle={selectedLecture.title?.he ?? selectedLecture.title}
                  lectureBasename={selectedLecture.basename}
                  seekTime={seekTime}
                  seekRevision={seekRevision}
                  autoPlay={autoPlay}
                  highlightRanges={selectedHighlight ? [selectedHighlight] : undefined}
                >
                  <LecturePanelContent metadata={lectureMetadata} onSeek={handleSeek} />
                </VideoPanel>
              )}
            </div>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
