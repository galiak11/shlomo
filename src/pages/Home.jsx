import { useState, useMemo, useCallback, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useSeals } from '@/hooks/useData';
import { useSealLectureData, sealHasLectureData } from '@/hooks/useSealLectureData';
import FilterBar from '@/components/home/FilterBar';
import SealGrid, { GRID_CLASSES, SIZE_KEY, DEFAULT_SIZE } from '@/components/home/SealGrid';
import HatmaaModal from '@/components/home/HatmaaModal';
import { SEAL_KEYWORDS, FILTER_CATEGORIES } from '@/data/seal-filters';
import { toSeconds } from '@/components/player/utils';
import { useHomeControls } from '@/contexts/HomeControlsContext';

const STORAGE_KEY = 'shlomo_seal_filter';

export default function Home() {
  const seals = useSeals();
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeFilter, setActiveFilter] = useState(() => {
    return localStorage.getItem(STORAGE_KEY) || null;
  });
  const [hatmaaModal, setHatmaaModal] = useState(null);
  const [sizeLevel, setSizeLevel] = useState(() => {
    const stored = localStorage.getItem(SIZE_KEY);
    return stored !== null ? Number(stored) : DEFAULT_SIZE;
  });
  const [animSpeed, setAnimSpeed] = useState('fast');
  const { setControls } = useHomeControls();

  const handleSizeChange = useCallback((delta) => {
    setSizeLevel((prev) => {
      const next = Math.max(0, Math.min(GRID_CLASSES.length - 1, prev + delta));
      localStorage.setItem(SIZE_KEY, String(next));
      return next;
    });
  }, []);

  // Restore modal from URL params on mount
  const urlSeal = searchParams.get('seal');
  const urlView = searchParams.get('view');
  const urlLecture = searchParams.get('lecture');
  const urlTime = searchParams.get('t');
  const urlTab = searchParams.get('tab');

  // Load lecture data for URL-restored seal
  const urlSealObj = useMemo(
    () => (urlSeal ? seals.find((s) => s.number === urlSeal) : null),
    [seals, urlSeal],
  );
  const hasUrlLecture = urlSealObj ? sealHasLectureData(urlSealObj.number) : false;
  const urlLectureData = useSealLectureData(
    urlSealObj?.number,
    urlSealObj?.imageUrl,
    !!urlSealObj && hasUrlLecture && !hatmaaModal,
  );

  // Restore modal from URL on first load
  useEffect(() => {
    if (!urlSeal || !urlSealObj || hatmaaModal) return;
    if (!urlLectureData.hasData) return;

    const seekTime = urlTime ? Number(urlTime) : 0;
    const sealMeta = urlLectureData.sealMeta;
    const viewTimeMap = {
      hatmaa: sealMeta?.hatmaaTime,
      explanation: sealMeta?.explanationTime,
      full: sealMeta?.fullRange,
    };
    const timeRange = viewTimeMap[urlView] || sealMeta?.hatmaaTime;
    const highlightRange = timeRange
      ? { startTime: toSeconds(timeRange.startTime), endTime: toSeconds(timeRange.endTime) }
      : null;

    setHatmaaModal({
      seal: urlSealObj,
      sealMeta,
      hatmaa: urlLectureData.hatmaa,
      lectureBasename: urlLectureData.lectureBasename,
      seekTime,
      highlightRange,
      view: urlView || 'hatmaa',
    });
    if (urlTab) setModalTab(urlTab);
  }, [urlSealObj, urlLectureData.hasData]);

  const handleFilterChange = useCallback((filterKey) => {
    setActiveFilter(filterKey);
    if (filterKey) {
      localStorage.setItem(STORAGE_KEY, filterKey);
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  const [modalTab, setModalTab] = useState(() => searchParams.get('tab') || 'hatmaa');

  const updateModalUrl = useCallback(
    (sealNumber, lecture, view, time, tab) => {
      const params = new URLSearchParams(searchParams);
      params.set('seal', sealNumber);
      params.set('lecture', lecture);
      if (view) params.set('view', view);
      if (time != null) params.set('t', String(Math.floor(time)));
      if (tab) params.set('tab', tab);
      setSearchParams(params, { replace: true });
    },
    [searchParams, setSearchParams],
  );

  const clearModalUrl = useCallback(() => {
    const params = new URLSearchParams(searchParams);
    params.delete('seal');
    params.delete('lecture');
    params.delete('view');
    params.delete('t');
    params.delete('tab');
    setSearchParams(params, { replace: true });
  }, [searchParams, setSearchParams]);

  const handleOpenHatmaa = useCallback(
    (data) => {
      setHatmaaModal(data);
      setModalTab('hatmaa');
      updateModalUrl(
        data.seal.number,
        data.lectureBasename,
        data.view || 'hatmaa',
        data.seekTime,
        'hatmaa',
      );
    },
    [updateModalUrl],
  );

  const handleModalNavigate = useCallback(
    (view, time) => {
      if (!hatmaaModal) return;
      updateModalUrl(hatmaaModal.seal.number, hatmaaModal.lectureBasename, view, time, modalTab);
    },
    [hatmaaModal, updateModalUrl, modalTab],
  );

  const handleTabChange = useCallback(
    (tab) => {
      setModalTab(tab);
      if (!hatmaaModal) return;
      const params = new URLSearchParams(searchParams);
      params.set('tab', tab);
      setSearchParams(params, { replace: true });
    },
    [hatmaaModal, searchParams, setSearchParams],
  );

  const handleCloseModal = useCallback(() => {
    setHatmaaModal(null);
    setModalTab('hatmaa');
    clearModalUrl();
  }, [clearModalUrl]);

  // Register home controls in the navbar context
  useEffect(() => {
    setControls({
      sizeLevel,
      maxSize: GRID_CLASSES.length - 1,
      onSizeChange: handleSizeChange,
      animSpeed,
      setAnimSpeed,
    });
    return () => setControls(null);
  }, [sizeLevel, animSpeed, handleSizeChange, setControls]);

  // Compute which seal numbers pass the active filter
  const filteredSeals = useMemo(() => {
    if (!activeFilter) return seals;

    const category = FILTER_CATEGORIES.find((c) => c.key === activeFilter);
    if (!category) return seals;

    const matchingNumbers = new Set();
    category.keywords.forEach((keyword) => {
      const numbers = SEAL_KEYWORDS[keyword];
      if (numbers) numbers.forEach((n) => matchingNumbers.add(n));
    });

    return seals.filter((seal) => matchingNumbers.has(seal.number));
  }, [seals, activeFilter]);

  return (
    <div className="px-6 sm:px-10 lg:px-16 py-4 sm:py-6">
      <FilterBar
        activeFilter={activeFilter}
        onFilterChange={handleFilterChange}
        sizeLevel={sizeLevel}
        maxSize={GRID_CLASSES.length - 1}
        onSizeChange={handleSizeChange}
      />
      <SealGrid seals={filteredSeals} sizeLevel={sizeLevel} onOpenHatmaa={handleOpenHatmaa} animSpeed={animSpeed} />
      <HatmaaModal
        isOpen={!!hatmaaModal}
        onClose={handleCloseModal}
        onNavigate={handleModalNavigate}
        activeTab={modalTab}
        onTabChange={handleTabChange}
        {...hatmaaModal}
      />
    </div>
  );
}
