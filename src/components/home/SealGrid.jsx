/**
 * SealGrid — responsive grid of seal cards.
 *
 * Size level is controlled by parent (Home) and shared with FilterBar.
 */

import SealCard from './SealCard';

// Column counts per size level (index)
// 0 = largest cards (fewest per row), 4 = smallest (most per row)
export const GRID_CLASSES = [
  'grid-cols-1 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3',           // 0: extra large
  'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4',           // 1: large
  'grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5',           // 2
  'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6',           // 3: default
  'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-7',           // 4
  'grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-7 xl:grid-cols-8',           // 5: small
];

export const SIZE_KEY = 'shlomo_seal_grid_size';
export const DEFAULT_SIZE = 3;

export default function SealGrid({ seals, sizeLevel, onOpenHatmaa, animSpeed }) {
  if (seals.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p>לא נמצאו חותמות לסינון זה</p>
      </div>
    );
  }

  return (
    <div className={`grid gap-3 ${GRID_CLASSES[sizeLevel]}`}>
      {seals.map((seal) => (
        <SealCard key={seal.id} seal={seal} onOpenHatmaa={onOpenHatmaa} animSpeed={animSpeed} />
      ))}
    </div>
  );
}
