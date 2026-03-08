/**
 * LearningPath — curriculum page with expandable session rows and sticky player.
 *
 * Session row: click to expand/collapse  |  play button → opens video player.
 * Expanded (seal):   seal image + description + key concepts + time links.
 * Expanded (other):  topic text + "הפעל מפגש" button.
 * Player sidebar:    seal info + time links  OR  session title + subtitle + summary.
 */

import { useState, useMemo, useCallback, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import { useLearningPath, useLectures, useSeals, useLectureMetadata } from '@/hooks/useData';
import { useSealLectureData } from '@/hooks/useSealLectureData';
import { usePlayerLayout } from '@/hooks/usePlayerLayout';
import { createPageUrl } from '@/utils';
import VideoPanel from '@/components/shared/VideoPanel';
import { toSeconds } from '@/components/player/utils';
import { Play, BookOpen, Zap, Star, Sparkles, ExternalLink, ChevronDown, Loader2, Flame } from 'lucide-react';
import { TerminologyDialog } from '@/components/shared/TerminologyDialog';
import { AnnotatedText, annotateChildren } from '@/components/shared/AnnotatedText';
import { THEORY_KNOWLEDGE } from '@/data/theory-knowledge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

// ─── Summary filtering utilities ─────────────────────────────────────────────

function timeToSec(t) {
  if (!t) return null;
  const p = t.split(':').map(Number);
  if (p.length === 3) return p[0] * 3600 + p[1] * 60 + p[2];
  if (p.length === 2) return p[0] * 60 + p[1];
  return null;
}

/** Resolve a block's anchor to seconds: handles both #t=HH:MM:SS and #seek=SLUG. */
function blockAnchorTime(block, lectureData) {
  const tMatch = block.match(/#t=(\d{1,2}:\d{2}:\d{2})/);
  if (tMatch) return timeToSec(tMatch[1]);
  const slugMatch = block.match(/#seek=([\w-]+)/);
  if (slugMatch && lectureData) {
    const slug = slugMatch[1];
    const pos =
      lectureData.positions?.find(p => p.slug === slug) ||
      lectureData.hatmaot?.find(h => h.slug === slug);
    if (pos?.startTime) return timeToSec(pos.startTime);
  }
  return null;
}

/** Filter timestamp-based summary (paragraphs with [HH:MM - HH:MM](#t=HH:MM:SS) or [▶](#seek=SLUG) anchors). */
function filterByTimestamp(summaryMd, session, sessionGroup, lectureData) {
  const myTime = timeToSec(session.sectionTime);

  // Collect sorted unique sectionTimes across the group
  const allTimes = [...new Set(
    sessionGroup.filter(s => s.sectionTime).map(s => timeToSec(s.sectionTime))
  )].sort((a, b) => a - b);

  // Split into paragraph blocks
  const blocks = summaryMd.split(/\n{2,}/);

  // Assign each block to a session time; orphans inherit the last known session time
  let currentTime = allTimes[0];
  const tagged = blocks.map(block => {
    const t = blockAnchorTime(block, lectureData);
    if (t !== null) {
      let assigned = allTimes[0];
      for (const st of allTimes) { if (st <= t) assigned = st; }
      currentTime = assigned;
      return { block, time: assigned, isOrphan: false };
    }
    return { block, time: currentTime, isOrphan: true };
  });

  const mine = tagged.filter(b => b.time === myTime);
  if (mine.length === 0) return null;

  // Render: matched blocks in order, insert '---' before orphan blocks that follow matched ones
  const parts = [];
  let lastWasMatched = false;
  for (const { block, isOrphan } of mine) {
    if (isOrphan && lastWasMatched) parts.push('---');
    parts.push(block);
    if (!isOrphan) lastWasMatched = true;
  }
  return parts.join('\n\n');
}

/** Filter heading-based summary (sections starting with ## Heading). */
function filterByHeadings(summaryMd, session, sessionGroup) {
  const myHeadings = new Set(session.summarySections || []);
  if (myHeadings.size === 0) return null;

  // Map heading → owning session.session across the group
  const headingOwner = new Map();
  for (const s of sessionGroup) {
    for (const h of (s.summarySections || [])) headingOwner.set(h, s.session);
  }

  // Split on ## boundaries; keep the ## delimiter with the section
  const rawSections = summaryMd.split(/(?=^## )/m).filter(s => s.trim());

  // Walk sections in document order, orphans inherit last matched session
  let currentOwner = sessionGroup[0].session;
  const tagged = rawSections.map(sec => {
    const hMatch = sec.match(/^## (.+?)(?:\n|$)/m);
    const heading = hMatch ? hMatch[1].trim() : null;
    if (heading && headingOwner.has(heading)) {
      currentOwner = headingOwner.get(heading);
      return { sec, owner: currentOwner, isOrphan: false };
    }
    return { sec, owner: currentOwner, isOrphan: true };
  });

  const mine = tagged.filter(t => t.owner === session.session);
  if (mine.length === 0) return null;

  const parts = [];
  let lastWasMatched = false;
  for (const { sec, isOrphan } of mine) {
    if (isOrphan && lastWasMatched) parts.push('---');
    parts.push(sec);
    if (!isOrphan) lastWasMatched = true;
  }
  return parts.join('\n\n');
}

/** Return filtered summary markdown for a single session, or null to show nothing, or the full text if no filter is set. */
function filterSummaryForSession(summaryMd, session, sessionGroup, lectureData) {
  if (!summaryMd) return null;
  if (session.sectionTime !== undefined) return filterByTimestamp(summaryMd, session, sessionGroup, lectureData);
  if (session.summarySections !== undefined) return filterByHeadings(summaryMd, session, sessionGroup);
  return summaryMd;
}

/** Inject ## topic headings before standalone [▶](#seek=SLUG) lines, using positions[].label / hatmaot[].name from metadata. */
function addTopicHeadings(md, lectureData) {
  if (!md || !lectureData) return md;
  return md.replace(/^\[▶\]\(#seek=([\w-]+)\)$/gm, (match, slug) => {
    const pos =
      lectureData.positions?.find(p => p.slug === slug) ||
      lectureData.hatmaot?.find(h => h.slug === slug);
    const heading = pos?.label || pos?.name;
    if (heading) return `## ${heading}\n\n${match}`;
    return match;
  });
}

// ─────────────────────────────────────────────────────────────────────────────

const MARKDOWN_COMPONENTS = {
  h2: ({ children }) => (
    <h2 className="text-sm font-bold text-foreground mt-5 mb-1.5 first:mt-0">{annotateChildren(children)}</h2>
  ),
  h3: ({ children }) => (
    <p className="text-xs font-semibold text-purple-700 mt-2.5 mb-1">{annotateChildren(children)}</p>
  ),
  hr: () => <hr className="border-border/30 my-3" />,
  p: ({ children }) => (
    <p className="text-xs leading-relaxed mb-1.5 text-muted-foreground">{annotateChildren(children)}</p>
  ),
  ul: ({ children }) => (
    <ul className="text-xs space-y-0.5 mb-1.5 pr-3">{children}</ul>
  ),
  li: ({ children }) => (
    <li className="text-xs leading-relaxed list-disc text-muted-foreground">{annotateChildren(children)}</li>
  ),
  strong: ({ children }) => (
    <strong className="font-semibold text-foreground">{annotateChildren(children)}</strong>
  ),
};

const TYPE_CONFIG = {
  theory:     { icon: BookOpen, label: 'תיאוריה', color: 'bg-blue-500/10 text-blue-700 border-blue-500/20',   activeColor: 'bg-blue-600 text-white border-blue-600' },
  practice:   { icon: Play,     label: 'תרגול',   color: 'bg-green-500/10 text-green-700 border-green-500/20', activeColor: 'bg-green-600 text-white border-green-600' },
  initiation: { icon: Zap,      label: 'חניכה',   color: 'bg-amber-500/10 text-amber-700 border-amber-500/20', activeColor: 'bg-amber-500 text-white border-amber-500' },
  seal:       { icon: Star,     label: 'חותם',    color: 'bg-purple-500/10 text-purple-700 border-purple-500/20', activeColor: 'bg-purple-600 text-white border-purple-600' },
};

function parseTitleForDisplay(titleHe) {
  const inner = titleHe.match(/^שיעור (\d+):\s+שיעור (\d+)\s*[-—]\s*(.+)$/);
  // Use outer (sequence) number as primary to avoid collisions; show inner course number in parens
  if (inner) return { num: inner[1], desc: inner[3], origLabel: `שיעור ${inner[2]}` };
  const outer = titleHe.match(/^שיעור (\d+):\s*(.+)$/);
  if (outer) return { num: outer[1], desc: outer[2], origLabel: null };
  return { num: null, desc: titleHe, origLabel: null };
}

function shortDesc(text) {
  if (!text) return '';
  const s = text.match(/^.{20,150}[.。,]/)?.[0];
  return s || (text.length > 150 ? text.slice(0, 150) + '…' : text);
}

// ─── KnowledgeSection ────────────────────────────────────────────────────────

function KnowledgeSection() {
  const [expanded, setExpanded] = useState(false);

  return (
    <section>
      {/* Header */}
      <div
        role="button"
        tabIndex={0}
        onClick={() => setExpanded((e) => !e)}
        onKeyDown={(e) => e.key === 'Enter' && setExpanded((v) => !v)}
        className="mb-2 pb-2 border-b border-border cursor-pointer hover:bg-accent/30 transition select-none -mx-1 px-1 rounded"
      >
        <div className="flex items-center gap-2">
          <div className="flex-1 min-w-0">
            <h2 className="text-sm font-semibold leading-snug">
              <span className="text-blue-600 font-bold text-base">ידע תיאורטי</span>
              <span className="text-foreground">: סיכום הקורס</span>
            </h2>
            <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
              ספירות, שמות קדושים, מנגנון החותמות ועקרונות הקבלה המעשית
            </p>
          </div>
          <ChevronDown
            className={`w-3.5 h-3.5 text-muted-foreground shrink-0 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}
          />
        </div>
      </div>

      {/* Expandable content */}
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            key="knowledge-content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            style={{ overflow: 'hidden' }}
          >
            <div className="border border-blue-500/20 rounded-lg bg-blue-500/5 px-5 py-4" dir="rtl">
              <ReactMarkdown components={MARKDOWN_COMPONENTS}>
                {THEORY_KNOWLEDGE}
              </ReactMarkdown>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}

// ─── SessionRow ──────────────────────────────────────────────────────────────

function SessionRow({ session, sessionLabel, seals, isPlaying, onPlay, sessionGroup, defaultExpanded, onToggleExpand }) {
  const [expanded, setExpanded] = useState(defaultExpanded ?? false);

  const toggleExpanded = useCallback(() => {
    setExpanded((e) => {
      const next = !e;
      onToggleExpand?.(session.session, next);
      return next;
    });
  }, [onToggleExpand, session.session]);

  const seal = session.sealNumber
    ? (seals.find((s) => s.number === session.sealNumber) || null)
    : null;

  // Seal metadata — loaded whenever the session is a seal (needed for play button startTime)
  const {
    sealMeta,
    essenceMarkdown,
    activationMarkdown,
    isLoading: sealMetaLoading,
  } = useSealLectureData(
    session.sealNumber || null,
    seal?.imageUrl || null,
    !!seal,
  );

  // Lecture metadata — always loaded for practice/initiation (הפעל needs it even when collapsed)
  const shouldLoadMeta = !seal && (
    expanded || session.type === 'practice' || session.type === 'initiation'
  );
  const { data: lectureData } = useLectureMetadata(
    shouldLoadMeta ? session.lectureBasename : null,
  );

  const config = TYPE_CONFIG[session.type] || TYPE_CONFIG.theory;
  const Icon   = config.icon;

  // Markdown components with time-link interception (for summary timestamps)
  const markdownComponents = useMemo(() => ({
    ...MARKDOWN_COMPONENTS,
    a: ({ href, children }) => {
      // Primary: #seek=SLUG — looks up positions[] or hatmaot[].slug in lectureData (SOT)
      const seekMatch = href?.match(/^#seek=([\w-]+)$/);
      if (seekMatch) {
        const slug = seekMatch[1];
        const position =
          lectureData?.positions?.find(p => p.slug === slug) ||
          lectureData?.hatmaot?.find(h => h.slug === slug);
        if (position) {
          const displayStart = position.startTime.slice(0, 5);
          const displayEnd = position.endTime ? ` - ${position.endTime.slice(0, 5)}` : '';
          const highlightRange = position.endTime
            ? { startTime: position.startTime, endTime: position.endTime }
            : null;
          return (
            <button
              onClick={() => onPlay(session, position.startTime, highlightRange)}
              className="text-purple-600 underline decoration-purple-300 hover:decoration-purple-600"
            >
              {displayStart}{displayEnd} ▶
            </button>
          );
        }
      }
      // Legacy: #t= links — kept for backward compatibility with older summaries
      const timeMatch = href?.match(/^#t=(\d+:\d+:\d+)(?:&end=(\d+:\d+:\d+))?$/);
      if (timeMatch) {
        const startTimeStr = timeMatch[1];
        let endTimeStr = timeMatch[2];
        if (!endTimeStr) {
          const childText = Array.isArray(children)
            ? children.map(c => (typeof c === 'string' ? c : '')).join('')
            : String(children || '');
          const rangeMatch = childText.match(/(\d{1,2}:\d{2})\s*[-–—]\s*(\d{1,2}:\d{2})/);
          if (rangeMatch) endTimeStr = rangeMatch[2] + ':00';
        }
        const highlightRange = endTimeStr ? { startTime: startTimeStr, endTime: endTimeStr } : null;
        return (
          <button
            onClick={() => onPlay(session, startTimeStr, highlightRange)}
            className="text-purple-600 underline decoration-purple-300 hover:decoration-purple-600"
          >
            {children}
          </button>
        );
      }
      return <a href={href} className="text-primary underline">{children}</a>;
    },
  }), [onPlay, session, lectureData]);

  return (
    <div data-session={session.session} className={isPlaying ? 'bg-primary/5 border-r-2 border-r-primary' : ''}>

      {/* ── Collapsed row ── */}
      <div
        role="button"
        tabIndex={0}
        onClick={() => { if (!window.getSelection()?.toString()) toggleExpanded(); }}
        onKeyDown={(e) => e.key === 'Enter' && toggleExpanded()}
        className={`flex items-stretch gap-2 px-3 cursor-pointer hover:bg-accent/50 transition${seal ? ' my-px' : ''}`}
        dir="rtl"
      >
        {/* Session label */}
        <span className="text-[10px] text-muted-foreground font-mono w-6 shrink-0 text-center self-center py-2.5">
          {sessionLabel}
        </span>

        {/* Seal thumbnail — fills full row height */}
        {seal?.imageUrl && (
          <div className="w-12 shrink-0 self-stretch overflow-hidden rounded bg-muted">
            <img
              src={seal.imageUrl}
              alt={seal.name}
              className="w-full h-full object-cover scale-[1.6] translate-y-[10%]"
            />
          </div>
        )}

        {/* Title + topic — sets row height via its own padding */}
        <div className="flex-1 min-w-0 py-2.5">
          <div className="flex items-center gap-1.5">
            <p className="font-medium text-sm leading-tight">
              <AnnotatedText text={session.title} />
            </p>
            <button
              onClick={(e) => {
                e.stopPropagation();
                const startTime = seal
                  ? (sealMeta?.hatmaaTime?.startTime ?? undefined)
                  : (session.hatmaotNames?.[0]
                    ? lectureData?.hatmaot?.find(h => h.name === session.hatmaotNames[0])?.startTime
                    : undefined) ?? session.sectionTime ?? undefined;
                onPlay(session, startTime);
              }}
              className="flex items-center gap-1 text-[11px] font-medium text-purple-600 hover:text-purple-700 shrink-0 px-1.5 py-0.5 rounded hover:bg-purple-50 transition"
              title="הפעל מפגש"
            >
              <Play className="w-3 h-3 fill-current" style={{ transform: 'scaleX(-1)' }} />
              <span className="hidden sm:inline">הפעל</span>
            </button>
          </div>
          <p className="text-[11px] text-muted-foreground/70 mt-0.5 leading-relaxed">
            <AnnotatedText text={session.topic} />
          </p>
        </div>

        {/* Type badge — per-type color */}
        <span className={`flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full border shrink-0 self-center ${config.color}`}>
          <Icon className="w-3 h-3" />
          <span className="hidden sm:inline">{config.label}</span>
        </span>

        {/* Expand chevron */}
        <ChevronDown
          className={`w-3.5 h-3.5 text-muted-foreground shrink-0 transition-transform duration-200 self-center ${expanded ? 'rotate-180' : ''}`}
        />
      </div>

      {/* ── Expanded content — seamless continuation, slides down ── */}
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            key="expanded"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            style={{ overflow: 'hidden' }}
          >
            <div className="px-4 pb-4 pt-1" dir="rtl">
              {seal ? (

                /* ── Seal session: full seal data + markdown content ── */
                <div className="space-y-3">

                  {/* mainTitle — shown here when expanded so image doesn't shrink */}
                  {seal.content?.mainTitle && (
                    <p className="text-[6px] text-muted-foreground whitespace-nowrap leading-none">
                      {seal.content.mainTitle}
                    </p>
                  )}

                  {/* Seal header: title inline with description */}
                  <p className="text-xs leading-relaxed">
                    <span className="font-bold text-sm leading-tight"><AnnotatedText text={seal.purposeSummary} /></span>
                    {seal.content?.description && (
                      <span className="text-muted-foreground"> — <AnnotatedText text={seal.content.description} /></span>
                    )}
                  </p>
                  {seal.content?.sealTitle && (
                    <p className="text-xs text-primary">{seal.content.sealTitle}</p>
                  )}

                  {/* Qualities (סגולות) */}
                  {seal.content?.qualities?.length > 0 && (
                    <div className="space-y-0.5">
                      {seal.content.qualities.map((q) => (
                        <p key={q.name} className="text-xs">
                          <span className="font-semibold"><AnnotatedText text={q.name} /></span>
                          {q.explanation && (
                            <span className="text-muted-foreground"> — <AnnotatedText text={q.explanation} /></span>
                          )}
                        </p>
                      ))}
                    </div>
                  )}

                  {/* Side attributes (שמות) */}
                  {seal.content?.sideAttributes?.length > 0 && (
                    <div className="space-y-0.5">
                      {seal.content.sideAttributes.map((a) => (
                        <p key={a.name} className="text-xs">
                          <span className="font-semibold"><AnnotatedText text={a.name} /></span>
                          {a.explanation && (
                            <span className="text-muted-foreground"> — <AnnotatedText text={a.explanation} /></span>
                          )}
                        </p>
                      ))}
                    </div>
                  )}

                  {/* Key concepts tags */}
                  {seal.keyConcepts?.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {seal.keyConcepts.map((k) => (
                        <span key={k} className="text-[10px] bg-muted px-1.5 py-0.5 rounded text-muted-foreground">
                          {k}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Lecture content from metadata */}
                  {sealMetaLoading ? (
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground pt-1">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      <span>טוען תוכן...</span>
                    </div>
                  ) : (
                    <>
                      {essenceMarkdown && (
                        <div className="border-t border-border/40 pt-2">
                          <ReactMarkdown components={MARKDOWN_COMPONENTS}>
                            {essenceMarkdown}
                          </ReactMarkdown>
                        </div>
                      )}
                      {activationMarkdown && (
                        <div className="border-t border-border/40 pt-2">
                          <ReactMarkdown components={MARKDOWN_COMPONENTS}>
                            {activationMarkdown}
                          </ReactMarkdown>
                        </div>
                      )}

                      {/* Video time links */}
                      {sealMeta && (
                        <div className="flex flex-wrap gap-3 text-xs pt-1">
                          {sealMeta.hatmaaTime && (
                            <button
                              onClick={() => onPlay(session, sealMeta.hatmaaTime.startTime, sealMeta.hatmaaTime)}
                              className="flex items-center gap-1 text-purple-600 underline decoration-purple-300 hover:decoration-purple-600"
                            >
                              <Play className="w-2.5 h-2.5 fill-current" /> הטמעה
                            </button>
                          )}
                          {sealMeta.explanationTime && (
                            <button
                              onClick={() => onPlay(session, sealMeta.explanationTime.startTime, sealMeta.explanationTime)}
                              className="flex items-center gap-1 text-purple-600 underline decoration-purple-300 hover:decoration-purple-600"
                            >
                              <Play className="w-2.5 h-2.5 fill-current" /> הסבר
                            </button>
                          )}
                          {sealMeta.fullRange && (
                            <button
                              onClick={() => onPlay(session, sealMeta.fullRange.startTime, sealMeta.fullRange)}
                              className="flex items-center gap-1 text-purple-600 underline decoration-purple-300 hover:decoration-purple-600"
                            >
                              <Play className="w-2.5 h-2.5 fill-current" /> כל הקטע
                            </button>
                          )}
                        </div>
                      )}
                    </>
                  )}
                </div>

              ) : (

                /* ── Theory / practice / initiation: filtered lecture summary ── */
                (() => {
                  const filteredSummary = lectureData?.summary?.he
                    ? filterSummaryForSession(lectureData.summary.he, session, sessionGroup || [session], lectureData)
                    : null;
                  const summaryWithHeadings = filteredSummary ? addTopicHeadings(filteredSummary, lectureData) : null;
                  return (
                    <div className="text-right">
                      {summaryWithHeadings ? (
                        <ReactMarkdown components={markdownComponents}>
                          {summaryWithHeadings}
                        </ReactMarkdown>
                      ) : lectureData?.lecture?.description?.he ? (
                        <p className="text-xs leading-relaxed text-muted-foreground">
                          {lectureData.lecture.description.he}
                        </p>
                      ) : lectureData ? null : (
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground pt-1">
                          <Loader2 className="w-3 h-3 animate-spin" />
                          <span>טוען תוכן...</span>
                        </div>
                      )}
                    </div>
                  );
                })()
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── LearningPath (main) ─────────────────────────────────────────────────────

export default function LearningPath() {
  const sessions = useLearningPath();
  const lectures = useLectures();
  const seals    = useSeals();

  const [searchParams, setSearchParams] = useSearchParams();

  const [activeFilter, setActiveFilter]   = useState(() => searchParams.get('tab') || null);
  const [sideTab, setSideTab]             = useState('summary'); // 'summary' | 'transcription'
  // Map<basename, boolean> — explicit user overrides for collapsed state.
  const [groupOverrides, setGroupOverrides] = useState(new Map());

  const {
    selectedItem: selectedSession,
    seekTime, seekRevision, autoPlay, selectedHighlight,
    handlePlay, handleSeek, handleClose,
    isDesktop, stickyTop, headerRef, playerRef,
  } = usePlayerLayout();

  // URL session param — used to defaultExpand and scroll to a session on load
  const urlSession    = searchParams.get('session');
  const urlSessionNum = urlSession ? parseFloat(urlSession) : null;

  // Change filter + update URL (clears session param)
  const handleFilterChange = useCallback((newFilter) => {
    setActiveFilter(newFilter);
    setGroupOverrides(new Map());
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (newFilter) next.set('tab', newFilter); else next.delete('tab');
      next.delete('session');
      return next;
    }, { replace: true });
  }, [setSearchParams]);

  // Called by SessionRow when expanded/collapsed — updates URL session param
  const handleSessionToggle = useCallback((sessionNum, isExpanded) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (isExpanded) next.set('session', String(sessionNum));
      else next.delete('session');
      return next;
    }, { replace: true });
  }, [setSearchParams]);

  // On mount: expand the lecture group containing the URL session
  useEffect(() => {
    if (!urlSessionNum || !sessions.length) return;
    const target = sessions.find((s) => s.session === urlSessionNum);
    if (!target) return;
    setGroupOverrides((prev) => {
      if (prev.has(target.lectureBasename)) return prev;
      const next = new Map(prev);
      next.set(target.lectureBasename, false); // false = not collapsed
      return next;
    });
  }, [sessions]); // eslint-disable-line react-hooks/exhaustive-deps

  // On mount: scroll to the URL session after render
  useEffect(() => {
    if (!urlSession) return;
    const timer = setTimeout(() => {
      document.querySelector(`[data-session="${urlSession}"]`)
        ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 400);
    return () => clearTimeout(timer);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const toggleGroup = useCallback((basename, groupIdx) => {
    setGroupOverrides((prev) => {
      const currentlyCollapsed = prev.has(basename)
        ? prev.get(basename)
        : (activeFilter ? false : groupIdx > 0);
      const next = new Map(prev);
      next.set(basename, !currentlyCollapsed);
      return next;
    });
  }, [activeFilter]);

  const groups = useMemo(() => {
    const map = new Map();
    sessions.forEach((s) => {
      if (!map.has(s.lectureBasename)) map.set(s.lectureBasename, []);
      map.get(s.lectureBasename).push(s);
    });
    return [...map.entries()].map(([basename, groupSessions]) => ({ basename, sessions: groupSessions }));
  }, [sessions]);

  const filteredGroups = useMemo(() => {
    if (!activeFilter) return groups;
    return groups
      .map(({ basename, sessions: gs }) => ({
        basename,
        sessions: gs.filter((s) =>
          activeFilter === 'hakhana'
            ? s.type === 'practice' || s.type === 'initiation'
            : s.type === activeFilter
        ),
      }))
      .filter(({ sessions: gs }) => gs.length > 0);
  }, [groups, activeFilter]);

  const filteredCount = useMemo(
    () => filteredGroups.reduce((acc, g) => acc + g.sessions.length, 0),
    [filteredGroups],
  );

  // Seal data for the currently playing session (video panel sidebar)
  const selectedSeal = useMemo(
    () => (selectedSession?.sealNumber
      ? seals.find((s) => s.number === selectedSession.sealNumber) || null
      : null),
    [selectedSession, seals],
  );

  const { sealMeta: selectedSealMeta } = useSealLectureData(
    selectedSession?.sealNumber || null,
    selectedSeal?.imageUrl || null,
    !!selectedSeal,
  );

  const highlightRanges = useMemo(() => {
    const range = selectedHighlight ?? (selectedSealMeta?.fullRange
      ? { startTime: toSeconds(selectedSealMeta.fullRange.startTime), endTime: toSeconds(selectedSealMeta.fullRange.endTime) }
      : null);
    if (!range) return [];
    return [{ startTime: range.startTime, endTime: range.endTime, color: 'rgba(168,85,247,0.35)' }];
  }, [selectedHighlight, selectedSealMeta]);

  const selectedLecture = useMemo(
    () => lectures.find((l) => l.basename === selectedSession?.lectureBasename) || null,
    [lectures, selectedSession],
  );

  // Lecture metadata for the selected non-seal session (for transcription tab)
  const { data: selectedSessionLectureData } = useLectureMetadata(
    selectedSession && !selectedSeal ? selectedSession.lectureBasename : null,
  );

  // Matched hatmaot entries from the lecture metadata
  const selectedHatmaot = useMemo(() => {
    if (!selectedSession?.hatmaotNames?.length || !selectedSessionLectureData?.hatmaot) return [];
    return selectedSessionLectureData.hatmaot.filter((h) =>
      selectedSession.hatmaotNames.includes(h.name),
    );
  }, [selectedSession, selectedSessionLectureData]);

  return (
    <div className={`mx-auto px-4 sm:px-6 py-4 sm:py-6 ${selectedSession ? 'max-w-6xl' : 'max-w-4xl'}`}>

      {/* Header — always full width */}
      <header className="space-y-2 text-center mb-6">
        <Sparkles className="w-8 h-8 text-primary mx-auto" />
        <h1 className="text-2xl sm:text-3xl font-bold">מסלול לימוד</h1>
        <p className="text-muted-foreground text-sm">
          {activeFilter ? `${filteredGroups.length} מתוך ${groups.length} שיעורים` : `${groups.length} שיעורים`}
          {' '}— מתיאוריה בסיסית ועד צריבת חותמות מתקדמת
        </p>

        {/* Filter pills + terminology */}
        <div className="flex items-center justify-center gap-1.5 flex-wrap pt-1">
          {/* הכל pill */}
          <button
            onClick={() => handleFilterChange(null)}
            className={`text-xs px-2.5 py-1 rounded-full border transition ${
              activeFilter === null
                ? 'bg-foreground text-background border-foreground'
                : 'border-border text-muted-foreground hover:border-foreground/30 hover:text-foreground'
            }`}
          >
            הכל
          </button>

          {/* תיאוריה pill */}
          {(() => {
            const config = TYPE_CONFIG.theory;
            const isActive = activeFilter === 'theory';
            return (
              <button
                onClick={() => handleFilterChange(isActive ? null : 'theory')}
                className={`flex items-center gap-1 text-xs px-2.5 py-1 rounded-full border transition font-medium ${isActive ? config.activeColor : config.color}`}
              >
                <config.icon className="w-3 h-3" />
                {config.label}
              </button>
            );
          })()}

          {/* הכנה — replaces תרגול + חניכה */}
          <button
            onClick={() => handleFilterChange(activeFilter === 'hakhana' ? null : 'hakhana')}
            className={`flex items-center gap-1 text-xs px-2.5 py-1 rounded-full border transition font-medium ${
              activeFilter === 'hakhana'
                ? 'bg-amber-500 text-white border-amber-500'
                : 'bg-amber-500/10 text-amber-700 border-amber-500/20 hover:border-amber-500/50'
            }`}
          >
            <Flame className="w-3 h-3" />
            הכנה
          </button>

          {/* חותם pill */}
          {(() => {
            const config = TYPE_CONFIG.seal;
            const isActive = activeFilter === 'seal';
            return (
              <button
                onClick={() => handleFilterChange(isActive ? null : 'seal')}
                className={`flex items-center gap-1 text-xs px-2.5 py-1 rounded-full border transition font-medium ${isActive ? config.activeColor : config.color}`}
              >
                <config.icon className="w-3 h-3" />
                {config.label}
              </button>
            );
          })()}

          {/* Divider */}
          <div className="w-px h-4 bg-border mx-0.5" />

          {/* Terminology dialog */}
          <TerminologyDialog
            trigger={
              <button className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground px-3 py-1 rounded-full border border-border hover:border-primary/40 hover:bg-accent transition">
                <BookOpen className="w-3.5 h-3.5" />
                מילון מונחים
              </button>
            }
          />
        </div>
      </header>

      {/* Two-column content area */}
      <div className={selectedSession && isDesktop ? 'flex gap-0 items-start' : ''}>
      <div className={selectedSession && isDesktop ? 'flex-1 min-w-0 border-r border-border pr-6' : 'w-full'}>

      {/* Session groups */}
      <div className="space-y-8" dir="rtl">

        {/* Theory knowledge section */}
        <KnowledgeSection />

        {filteredGroups.map(({ basename, sessions: groupSessions }, groupIdx) => {
          const lecture = lectures.find((l) => l.basename === basename);
          if (!lecture) return null;
          const { num, desc, origLabel } = parseTitleForDisplay(lecture.title.he);
          // Always use the full (unfiltered) group for stable labels and correct summary filtering
          const fullGroupSessions = groups.find(g => g.basename === basename)?.sessions ?? groupSessions;
          const isCollapsed = groupOverrides.has(basename)
            ? groupOverrides.get(basename)
            : (activeFilter ? false : groupIdx > 0);

          return (
            <section key={basename}>
              {/* Lecture header — clickable to collapse/expand */}
              <div
                role="button"
                tabIndex={0}
                onClick={() => { if (!window.getSelection()?.toString()) toggleGroup(basename, groupIdx); }}
                onKeyDown={(e) => e.key === 'Enter' && toggleGroup(basename, groupIdx)}
                className="mb-2 pb-2 border-b border-border cursor-pointer hover:bg-accent/30 transition -mx-1 px-1 rounded"
              >
                <div className="flex items-center gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2 flex-wrap">
                      <h2 className="text-sm font-semibold leading-snug">
                        <span className="text-primary font-bold text-base">שיעור {num}</span>
                        {desc && <>: <span>{desc}</span></>}
                      </h2>
                      {origLabel && (
                        <span className="text-[11px] text-muted-foreground">({origLabel})</span>
                      )}
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
                      {shortDesc(lecture.description?.he)}
                    </p>
                  </div>
                  <ChevronDown
                    className={`w-3.5 h-3.5 text-muted-foreground shrink-0 transition-transform duration-200 ${isCollapsed ? '-rotate-90' : ''}`}
                  />
                </div>
              </div>

              {/* Session rows with collapse animation */}
              <AnimatePresence initial={false}>
                {!isCollapsed && (
                  <motion.div
                    key="sessions"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2, ease: 'easeInOut' }}
                    style={{ overflow: 'hidden' }}
                  >
                    <div className="border border-border rounded-lg overflow-hidden divide-y divide-border/60">
                      {groupSessions.map((session) => {
                        const origIdx = fullGroupSessions.findIndex(s => s.session === session.session);
                        return (
                          <SessionRow
                            key={session.session}
                            session={session}
                            sessionLabel={`${num}.${origIdx + 1}`}
                            seals={seals}
                            isPlaying={selectedSession?.session === session.session}
                            onPlay={handlePlay}
                            sessionGroup={fullGroupSessions}
                            defaultExpanded={urlSessionNum === session.session}
                            onToggleExpand={handleSessionToggle}
                          />
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </section>
          );
        })}
      </div>

      </div>{/* close left column */}

      {/* ── Video panel ── */}
      {selectedSession && (() => {
        const headerPlayTime = selectedSeal
          ? (selectedSealMeta?.hatmaaTime?.startTime ?? selectedSession.sectionTime)
          : (selectedHatmaot[0]?.startTime ?? selectedSession.sectionTime);
        const headerPlayRange = selectedSeal
          ? (selectedSealMeta?.hatmaaTime ?? null)
          : (selectedHatmaot[0]
            ? { startTime: selectedHatmaot[0].startTime, endTime: selectedHatmaot[0].endTime }
            : null);
        return (
          <VideoPanel
            isDesktop={isDesktop}
            stickyTop={stickyTop}
            headerRef={headerRef}
            playerRef={playerRef}
            onClose={handleClose}
            onSeek={handleSeek}
            parentTitle={selectedLecture?.title?.he?.replace(/^שיעור \d+:\s+/, '') ?? ''}
            itemTitle={selectedSession.title}
            itemTopic={selectedSession.topic}
            headerPlayTime={headerPlayTime || null}
            headerPlayRange={headerPlayRange}
            lectureBasename={selectedSession.lectureBasename}
            seekTime={seekTime}
            seekRevision={seekRevision}
            autoPlay={autoPlay}
            highlightRanges={highlightRanges}
            sealImageUrl={selectedSeal?.imageUrl}
            sealImageAlt={selectedSeal?.name}
          >
            {/* BELOW VIDEO */}
            <div className="border-t border-border/40 pt-3 max-h-[40vh] overflow-y-auto pb-4">
              {selectedSeal ? (
                /* Seal session */
                <div className="space-y-2 text-right">
                  <div className="min-w-0">
                    <p className="font-bold text-sm leading-tight">{selectedSeal.purposeSummary}</p>
                    <p className="text-xs text-primary mt-0.5">{selectedSeal.content?.sealTitle}</p>
                  </div>
                  {selectedSeal.keyConcepts?.length > 0 && (
                    <p className="text-[11px] text-muted-foreground line-clamp-2">
                      {selectedSeal.keyConcepts.join(' · ')}
                    </p>
                  )}
                  {selectedSealMeta && (
                    <div className="flex gap-3 text-xs flex-wrap">
                      {selectedSealMeta.hatmaaTime && (
                        <button
                          onClick={() => handleSeek(selectedSealMeta.hatmaaTime.startTime, selectedSealMeta.hatmaaTime)}
                          className="text-purple-600 underline decoration-purple-300 hover:decoration-purple-600"
                        >
                          הטמעה
                        </button>
                      )}
                      {selectedSealMeta.explanationTime && (
                        <button
                          onClick={() => handleSeek(selectedSealMeta.explanationTime.startTime, selectedSealMeta.explanationTime)}
                          className="text-purple-600 underline decoration-purple-300 hover:decoration-purple-600"
                        >
                          הסבר
                        </button>
                      )}
                      {selectedSealMeta.fullRange && (
                        <button
                          onClick={() => handleSeek(selectedSealMeta.fullRange.startTime, selectedSealMeta.fullRange)}
                          className="text-purple-600 underline decoration-purple-300 hover:decoration-purple-600"
                        >
                          כל הקטע
                        </button>
                      )}
                    </div>
                  )}
                  <Link
                    to={createPageUrl('SealDetail') + `?id=${selectedSeal.id}`}
                    className="text-xs text-primary hover:underline flex items-center gap-1"
                  >
                    <ExternalLink className="w-3 h-3" />
                    פרטי החותם
                  </Link>
                </div>
              ) : (
                /* Non-seal session — tabbed: סיכום | תמלול */
                <Tabs value={sideTab} onValueChange={setSideTab} className="flex flex-col gap-2">
                  <TabsList className="h-7 w-full">
                    <TabsTrigger value="transcription" className="text-xs flex-1 h-6">תמלול</TabsTrigger>
                    <TabsTrigger value="summary" className="text-xs flex-1 h-6">סיכום</TabsTrigger>
                  </TabsList>

                  <TabsContent value="summary" className="mt-0 space-y-1.5 px-2" dir="rtl">
                    {selectedLecture && (
                      <p className="text-[11px] text-muted-foreground leading-relaxed line-clamp-4">
                        {shortDesc(selectedLecture.description?.he)}
                      </p>
                    )}
                    <Link
                      to={createPageUrl('LectureDetail') + `?lecture=${selectedSession.lectureBasename}`}
                      className="text-xs text-primary hover:underline flex items-center gap-1"
                    >
                      <ExternalLink className="w-3 h-3" />
                      פתח שיעור מלא
                    </Link>
                  </TabsContent>

                  <TabsContent value="transcription" className="mt-0 px-2" dir="rtl">
                    {selectedHatmaot.length === 0 ? (
                      <p className="text-xs text-muted-foreground">אין תמלול זמין למפגש זה</p>
                    ) : (
                      <div className="space-y-3 max-h-48 overflow-y-auto">
                        {selectedHatmaot.map((h) => (
                          <div key={h.name} className="space-y-1">
                            <div className="flex items-center justify-between gap-2">
                              <p className="text-[11px] font-semibold text-foreground leading-snug">{h.name}</p>
                              {h.startTime && (
                                <button
                                  onClick={() => handleSeek(h.startTime, { startTime: h.startTime, endTime: h.endTime })}
                                  className="shrink-0 text-[10px] text-purple-600 hover:underline flex items-center gap-0.5"
                                >
                                  <Play className="w-2.5 h-2.5 fill-current" />
                                  {h.startTime.slice(0, 5)}
                                </button>
                              )}
                            </div>
                            {h.goal && (
                              <p className="text-[10px] text-muted-foreground italic leading-relaxed">{h.goal}</p>
                            )}
                            {h.transcription && (
                              <p className="text-[10px] leading-relaxed text-foreground/80 whitespace-pre-line">
                                {h.transcription}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
              )}
            </div>
          </VideoPanel>
        );
      })()}
      </div>{/* close flex wrapper */}
    </div>
  );
}
