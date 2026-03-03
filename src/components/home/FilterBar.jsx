/**
 * FilterBar — category filter buttons for the seal catalog.
 *
 * Primary categories shown as regular buttons on the first line.
 * Secondary (less frequent) categories shown smaller on a second line,
 * with grid size +/- controls at the far end.
 */

import { FILTER_CATEGORIES } from '@/data/seal-filters';

const primary = FILTER_CATEGORIES.filter((c) => c.primary);
const secondary = FILTER_CATEGORIES.filter((c) => !c.primary);

export default function FilterBar({ activeFilter, onFilterChange }) {
  const btnBase = 'rounded-full border transition';

  return (
    <div className="space-y-2 mb-6">
      {/* Primary filters */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => onFilterChange(null)}
          className={`px-4 py-1.5 text-sm ${btnBase} ${
            activeFilter === null
              ? 'bg-primary text-primary-foreground border-primary'
              : 'border-border text-muted-foreground hover:bg-accent hover:text-accent-foreground'
          }`}
        >
          הכל
        </button>
        {primary.map((cat) => (
          <button
            key={cat.key}
            onClick={() => onFilterChange(cat.key)}
            className={`px-4 py-1.5 text-sm ${btnBase} ${
              activeFilter === cat.key
                ? 'bg-primary text-primary-foreground border-primary'
                : 'border-border text-muted-foreground hover:bg-accent hover:text-accent-foreground'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Secondary filters */}
      <div className="flex flex-wrap gap-1.5">
        {secondary.map((cat) => (
          <button
            key={cat.key}
            onClick={() => onFilterChange(cat.key)}
            className={`px-3 py-1 text-xs ${btnBase} ${
              activeFilter === cat.key
                ? 'bg-primary text-primary-foreground border-primary'
                : 'border-border text-muted-foreground hover:bg-accent hover:text-accent-foreground'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>
    </div>
  );
}
