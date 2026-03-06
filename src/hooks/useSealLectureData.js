/**
 * useSealLectureData — connects a seal to its lecture metadata.
 *
 * Given a seal number and imageUrl, finds the lecture that teaches this seal,
 * loads its metadata, and extracts the seal entry + matching hatmaa.
 *
 * Also splits details.he markdown into two groups:
 *   essenceMarkdown   — מהות החותם + למה מתאים
 *   activationMarkdown — איך מפעילים + תהליך הצריבה
 *
 * Only loads when enabled=true (to avoid fetching on every card mount).
 */

import { useMemo } from 'react';
import { useLectureMetadata } from '@/hooks/useData';
import LEARNING_PATH from '@/data/learning-path';
import { toSeconds } from '@/components/player/utils';

// Pre-compute seal number → lecture basename mapping
const SEAL_LECTURE_MAP = {};
LEARNING_PATH.forEach((session) => {
  if (session.type === 'seal' && session.sealNumber) {
    if (!SEAL_LECTURE_MAP[session.sealNumber]) {
      SEAL_LECTURE_MAP[session.sealNumber] = session.lectureBasename;
    }
  }
});

/**
 * Split details.he markdown into essence (מהות) and activation (הפעלה) groups.
 * Splits on ### headers; groups by keyword matching.
 */
function splitDetailsMarkdown(markdown) {
  if (!markdown) return { essence: '', activation: '' };

  // Remove "הסבר קצר · כל ההסברים" navigation lines (already handled by nav buttons)
  markdown = markdown.replace(/^.*הסבר קצר.*כל ההסברים.*$/gm, '').trim();

  // Split into sections by ### headers
  const parts = markdown.split(/(?=^### )/m);
  const essenceParts = [];
  const activationParts = [];

  for (const part of parts) {
    const trimmed = part.trim();
    if (!trimmed) continue;

    // Check header for activation keywords
    const headerMatch = trimmed.match(/^### (.+)/);
    if (headerMatch) {
      const header = headerMatch[1];
      if (/מפעילים|צריבה/.test(header)) {
        activationParts.push(trimmed);
        continue;
      }
    }
    // Everything else goes to essence (מהות, למה מתאים, עיקרון, etc.)
    essenceParts.push(trimmed);
  }

  return {
    essence: essenceParts.join('\n\n'),
    activation: activationParts.join('\n\n'),
  };
}

export function useSealLectureData(sealNumber, imageUrl, enabled) {
  const lectureBasename = enabled ? SEAL_LECTURE_MAP[sealNumber] || null : null;
  const { data: metadata, isLoading } = useLectureMetadata(lectureBasename);

  const result = useMemo(() => {
    if (!metadata || !metadata.seals) {
      return {
        sealMeta: null, hatmaa: null, lectureName: null, lectureBasename, isLoading,
        hasData: false, essenceMarkdown: '', activationMarkdown: '',
      };
    }

    // Find matching seal entry by imageUrl (unique per seal)
    const sealMeta = metadata.seals.find((s) => s.imageUrl === imageUrl) || null;

    // Find matching hatmaa by time range overlap with seal's hatmaaTime
    let hatmaa = null;
    if (sealMeta?.hatmaaTime && metadata.hatmaot) {
      const sealStart = toSeconds(sealMeta.hatmaaTime.startTime);
      const sealEnd = toSeconds(sealMeta.hatmaaTime.endTime);
      hatmaa = metadata.hatmaot.find((h) => {
        const hStart = toSeconds(h.startTime);
        const hEnd = toSeconds(h.endTime);
        return hStart < sealEnd && hEnd > sealStart;
      }) || null;
    }

    // Split markdown into essence and activation groups
    const { essence, activation } = splitDetailsMarkdown(sealMeta?.details?.he);

    return {
      sealMeta,
      hatmaa,
      lectureName: metadata?.lecture?.name?.he || null,
      lectureBasename,
      isLoading: false,
      hasData: !!sealMeta,
      essenceMarkdown: essence,
      activationMarkdown: activation,
    };
  }, [metadata, imageUrl, lectureBasename]);

  if (!enabled) {
    return {
      sealMeta: null, hatmaa: null, lectureName: null, lectureBasename: null,
      isLoading: false, hasData: false, essenceMarkdown: '', activationMarkdown: '',
    };
  }

  if (isLoading) {
    return {
      sealMeta: null, hatmaa: null, lectureName: null, lectureBasename,
      isLoading: true, hasData: false, essenceMarkdown: '', activationMarkdown: '',
    };
  }

  return result;
}

// Export the map for quick "has lecture data?" checks without loading metadata
export function sealHasLectureData(sealNumber) {
  return !!SEAL_LECTURE_MAP[sealNumber];
}

// Export the splitter for use in HatmaaModal
export { splitDetailsMarkdown };
