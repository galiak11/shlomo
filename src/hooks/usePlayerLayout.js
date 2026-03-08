/**
 * usePlayerLayout — shared state/logic for the sticky video panel.
 *
 * Used by LearningPath (selectedItem = session) and ClassLibrary (selectedItem = lecture).
 * Manages: selected item, seek/play state, isDesktop, scroll-linked sticky top.
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import { toSeconds } from '@/components/player/utils';

const NAV_HEIGHT = 64; // Fixed navbar h-16

export function usePlayerLayout() {
  const [selectedItem, setSelectedItem] = useState(null);
  const [seekTime, setSeekTime]         = useState(undefined);
  const [seekRevision, setSeekRevision] = useState(0);
  const [autoPlay, setAutoPlay]         = useState(false);
  const [selectedHighlight, setSelectedHighlight] = useState(null); // { startTime, endTime } seconds

  const playerRef = useRef(null);
  const headerRef = useRef(null);
  const scrollStateRef = useRef({ lastY: 0, topOffset: NAV_HEIGHT });
  const [stickyTop, setStickyTop] = useState(NAV_HEIGHT);
  const [isDesktop, setIsDesktop] = useState(() => window.innerWidth >= 768);

  // Track desktop vs mobile (md = 768px)
  useEffect(() => {
    const onResize = () => setIsDesktop(window.innerWidth >= 768);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // Stable primitive ID for the scroll effect dep — works for both sessions (number) and lectures (string)
  const itemId = selectedItem?.session ?? selectedItem?.basename ?? null;

  // Scroll-linked sticky top: video sits just below fixed navbar; header reveals on scroll up
  useEffect(() => {
    if (!selectedItem || !isDesktop) { setStickyTop(NAV_HEIGHT); return; }
    scrollStateRef.current = { lastY: window.scrollY, topOffset: NAV_HEIGHT };
    setStickyTop(NAV_HEIGHT);
    const onScroll = () => {
      if (!headerRef.current) return;
      const headerH = headerRef.current.offsetHeight + 12;
      const y = window.scrollY;
      const delta = y - scrollStateRef.current.lastY;
      let newTop = scrollStateRef.current.topOffset - delta;
      newTop = Math.max(NAV_HEIGHT - headerH, Math.min(NAV_HEIGHT, newTop));
      if (y <= 0) newTop = NAV_HEIGHT;
      scrollStateRef.current.topOffset = newTop;
      scrollStateRef.current.lastY = y;
      setStickyTop(newTop);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [itemId, isDesktop]); // eslint-disable-line react-hooks/exhaustive-deps

  const handlePlay = useCallback((item, seekTimeStr, highlightRange) => {
    setSelectedItem(item);
    setSelectedHighlight(highlightRange
      ? { startTime: toSeconds(highlightRange.startTime), endTime: toSeconds(highlightRange.endTime) }
      : null,
    );
    const effectiveTime = seekTimeStr ?? '00:00:00';
    setAutoPlay(true);
    setSeekTime(toSeconds(effectiveTime));
    setSeekRevision((r) => r + 1);
  }, []);

  const handleSeek = useCallback((timeStr, highlightRange) => {
    setAutoPlay(true);
    setSeekTime(toSeconds(timeStr));
    setSeekRevision((r) => r + 1);
    setSelectedHighlight(highlightRange
      ? { startTime: toSeconds(highlightRange.startTime), endTime: toSeconds(highlightRange.endTime) }
      : null,
    );
  }, []);

  const handleClose = useCallback(() => setSelectedItem(null), []);

  return {
    selectedItem,
    seekTime,
    seekRevision,
    autoPlay,
    selectedHighlight,
    handlePlay,
    handleSeek,
    handleClose,
    isDesktop,
    stickyTop,
    headerRef,
    playerRef,
  };
}
