/**
 * Data hooks for shlomo-app.
 *
 * All data is static ES modules — no async fetching needed.
 * These hooks provide a consistent API and handle lazy loading
 * of per-lecture metadata JSON files.
 */

import { useState, useEffect, useMemo } from 'react';
import LECTURES from '@/data/lectures';
import SEALS from '@/data/seals';
import CLASSES from '@/data/classes';
import LEARNING_PATH from '@/data/learning-path';
import { SEAL_KEYWORDS, FILTER_CATEGORIES, findSealsByTopic } from '@/data/seal-filters';

// --- Lectures ---

export function useLectures() {
  return LECTURES;
}

/**
 * Lazy-load a single lecture's full metadata.
 * Returns { data, isLoading, error }.
 */
export function useLectureMetadata(basename) {
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(!!basename);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!basename) {
      setData(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    // Dynamic import of the JSON file
    import(`@/data/lecture-metadata/${basename}.json`)
      .then((module) => {
        setData(module.default || module);
        setIsLoading(false);
      })
      .catch((err) => {
        console.error(`Failed to load metadata for ${basename}:`, err);
        setError(err);
        setIsLoading(false);
      });
  }, [basename]);

  return { data, isLoading, error };
}

// --- Seals ---

export function useSeals() {
  return SEALS;
}

export function useSeal(sealId) {
  return useMemo(() => {
    return SEALS.find((s) => s.id === sealId) || null;
  }, [sealId]);
}

export function useSealByNumber(number) {
  return useMemo(() => {
    return SEALS.find((s) => s.number === number) || null;
  }, [number]);
}

// --- Seal Filters ---

export function useSealFilters() {
  return {
    keywords: SEAL_KEYWORDS,
    categories: FILTER_CATEGORIES,
    findByTopic: findSealsByTopic,
  };
}

// --- Classes ---

export function useClasses() {
  return CLASSES;
}

export function useClass(key) {
  return useMemo(() => {
    return CLASSES.find((c) => c.key === key) || null;
  }, [key]);
}

// --- Learning Path ---

export function useLearningPath() {
  return LEARNING_PATH;
}
