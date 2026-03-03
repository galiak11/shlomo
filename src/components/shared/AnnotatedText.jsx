/**
 * AnnotatedText — renders text with inline tooltips for known terminology.
 *
 * Terms are sourced from the TerminologyDialog CATEGORIES. When a term appears
 * in the text, it gets a subtle dotted underline; hovering shows a tooltip with
 * the short definition.
 *
 * Usage:  <AnnotatedText text="גלי אלפא ותת-הכרה" />
 * Markdown helpers: annotateChildren(children) wraps string nodes.
 *
 * Requires <TooltipProvider> somewhere in the component tree (added in App.jsx).
 */

import { useMemo } from 'react';
import { CATEGORIES } from './TerminologyDialog';
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from '@/components/ui/tooltip';

// ─── Term list ────────────────────────────────────────────────────────────────

// Build flat list from all categories, expand slash-separated and parenthetical
// variants so "שם הוויה (י-ה-ו-ה)" also matches "שם הוויה" in plain text.
const TERM_LIST = (() => {
  const raw = [];
  for (const cat of CATEGORIES) {
    const items = cat.terms || cat.sources || [];
    for (const item of items) {
      const term = item.term || item.name;
      const def  = item.def  || item.desc || '';
      if (term) raw.push({ term, def, catLabel: cat.label });
    }
  }

  const expanded = [...raw];
  for (const entry of raw) {
    // "A / B" → also add "A" and "B" as separate matches
    if (entry.term.includes(' / ')) {
      for (const part of entry.term.split(' / ')) {
        const p = part.trim();
        if (p && !expanded.some((e) => e.term === p)) {
          expanded.push({ term: p, def: entry.def, catLabel: entry.catLabel });
        }
      }
    }
    // "A (B)" → also add "A" without the parenthetical
    const parenMatch = entry.term.match(/^(.+?)\s*\(/);
    if (parenMatch) {
      const p = parenMatch[1].trim();
      if (p && !expanded.some((e) => e.term === p)) {
        expanded.push({ term: p, def: entry.def, catLabel: entry.catLabel });
      }
    }
  }

  // Longest first — prevents "חסד" matching inside "אורות חסדים"
  return expanded.sort((a, b) => b.term.length - a.term.length);
})();

// ─── Matching ─────────────────────────────────────────────────────────────────

const HEB_LETTER = /[\u05D0-\u05EA\uFB1D-\uFB4F]/;

/** Returns true only if position is not bordered by a Hebrew letter on either side. */
function wordBoundary(text, start, len) {
  const before = start > 0 ? text[start - 1] : '';
  const after  = start + len < text.length ? text[start + len] : '';
  return !HEB_LETTER.test(before) && !HEB_LETTER.test(after);
}

/** Split `text` into plain/annotated segments. Segments with `def` get a tooltip. */
function buildSegments(text) {
  if (!text) return [];
  const segments = [];
  let remaining  = text;

  while (remaining.length > 0) {
    let best = null; // { idx, term, def, catLabel }

    for (const entry of TERM_LIST) {
      let from = 0;
      while (true) {
        const idx = remaining.indexOf(entry.term, from);
        if (idx === -1) break;
        if (wordBoundary(remaining, idx, entry.term.length)) {
          if (best === null || idx < best.idx) {
            best = { idx, ...entry };
          }
          break;
        }
        from = idx + 1;
      }
    }

    if (best === null) {
      segments.push({ text: remaining });
      break;
    }
    if (best.idx > 0) {
      segments.push({ text: remaining.slice(0, best.idx) });
    }
    segments.push({ text: best.term, def: best.def, catLabel: best.catLabel });
    remaining = remaining.slice(best.idx + best.term.length);
  }

  return segments;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function AnnotatedText({ text, className }) {
  const segments = useMemo(() => buildSegments(text), [text]);
  if (!text) return null;

  return (
    <span className={className}>
      {segments.map((seg, i) =>
        seg.def ? (
          <Tooltip key={i} delayDuration={200}>
            <TooltipTrigger asChild>
              <span className="underline decoration-dotted decoration-foreground/35 underline-offset-2 cursor-help">
                {seg.text}
              </span>
            </TooltipTrigger>
            <TooltipContent
              side="top"
              className="max-w-[260px] bg-background border border-border text-foreground shadow-md p-2.5"
              dir="rtl"
            >
              <p className="font-semibold text-xs leading-snug mb-0.5">{seg.text}</p>
              <p className="text-[11px] text-muted-foreground leading-relaxed">{seg.def}</p>
            </TooltipContent>
          </Tooltip>
        ) : (
          <span key={i}>{seg.text}</span>
        )
      )}
    </span>
  );
}

// ─── Helper for ReactMarkdown children ───────────────────────────────────────

/**
 * Wraps string nodes in ReactMarkdown children with <AnnotatedText>.
 * Usage inside a custom renderer:
 *   p: ({ children }) => <p>{annotateChildren(children)}</p>
 */
export function annotateChildren(children) {
  if (!children) return children;
  if (typeof children === 'string') return <AnnotatedText text={children} />;
  if (Array.isArray(children)) {
    return children.map((child, i) =>
      typeof child === 'string' ? <AnnotatedText key={i} text={child} /> : child
    );
  }
  return children;
}
