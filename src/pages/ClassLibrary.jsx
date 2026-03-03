/**
 * ClassLibrary — Browse 5 course classes with lecture lists.
 *
 * Route: /ClassLibrary?tab={classKey}
 *
 * Transcribed class (hatmaot): Links to LectureDetail pages.
 * Non-transcribed classes: Simple lecture list with Vimeo links.
 */

import { useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useClasses, useLectures } from '@/hooks/useData';
import { createPageUrl } from '@/utils';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Play, ExternalLink, BookOpen, FileText } from 'lucide-react';

export default function ClassLibrary() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = searchParams.get('tab') || 'hatmaot';
  const classes = useClasses();
  const lectures = useLectures();

  const handleTabChange = (value) => {
    setSearchParams({ tab: value });
  };

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl sm:text-3xl font-bold">ספריית קורסים</h1>
        <p className="text-muted-foreground text-sm">
          כל הקורסים והשיעורים במקום אחד
        </p>
      </header>

      <Tabs value={tab} onValueChange={handleTabChange} dir="rtl">
        <TabsList className="w-full flex overflow-x-auto">
          {classes.map((cls) => (
            <TabsTrigger key={cls.key} value={cls.key} className="flex-1 text-xs sm:text-sm">
              {cls.name}
            </TabsTrigger>
          ))}
        </TabsList>

        {classes.map((cls) => (
          <TabsContent key={cls.key} value={cls.key}>
            <div className="space-y-4">
              {/* Class description */}
              <div className="bg-card border border-border rounded-lg p-4">
                <h2 className="font-semibold">{cls.name}</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  {cls.description}
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  {cls.isTranscribed
                    ? `${lectures.length} שיעורים מתומללים`
                    : `${cls.lectures.length} שיעורים`}
                </p>
              </div>

              {/* Lecture list */}
              {cls.isTranscribed ? (
                <TranscribedLectureList lectures={lectures} />
              ) : (
                <SimpleLectureList lectures={cls.lectures} />
              )}
            </div>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}

/** Transcribed lecture list — links to LectureDetail */
function TranscribedLectureList({ lectures }) {
  return (
    <div className="space-y-2">
      {lectures.map((lecture) => (
        <Link
          key={lecture.basename}
          to={createPageUrl('LectureDetail') + `?lecture=${lecture.basename}`}
          className="flex items-center gap-3 p-3 border border-border rounded-lg hover:shadow-sm transition bg-card group"
        >
          <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center shrink-0 group-hover:bg-primary/20 transition">
            <Play className="w-4 h-4 text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-medium text-sm truncate">{lecture.title.he}</p>
            <p className="text-xs text-muted-foreground truncate">
              {lecture.longname?.he || lecture.description?.he}
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground shrink-0">
            {lecture.hasSeals && (
              <span className="flex items-center gap-0.5">
                <BookOpen className="w-3 h-3" />
                {lecture.sealCount}
              </span>
            )}
            {lecture.hasSummary && <FileText className="w-3 h-3" />}
          </div>
        </Link>
      ))}
    </div>
  );
}

/** Simple lecture list — external Vimeo links for non-transcribed classes */
function SimpleLectureList({ lectures }) {
  // Group by category if categories exist
  const groups = useMemo(() => {
    const map = new Map();
    lectures.forEach((l) => {
      const cat = l.category || '';
      if (!map.has(cat)) map.set(cat, []);
      map.get(cat).push(l);
    });
    return map;
  }, [lectures]);

  const hasCategories = groups.size > 1 || (groups.size === 1 && ![...groups.keys()][0] === '');

  return (
    <div className="space-y-6">
      {[...groups.entries()].map(([category, items]) => (
        <div key={category}>
          {hasCategories && category && (
            <h3 className="text-sm font-semibold text-muted-foreground mb-2">
              {category.replace(/_/g, ' ')}
            </h3>
          )}
          <div className="space-y-2">
            {items.map((lecture, i) => (
              <a
                key={`${lecture.videoUrl}-${i}`}
                href={lecture.videoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-3 border border-border rounded-lg hover:shadow-sm transition bg-card group"
              >
                <div className="w-10 h-10 bg-muted rounded-full flex items-center justify-center shrink-0 group-hover:bg-primary/10 transition">
                  <Play className="w-4 h-4 text-muted-foreground group-hover:text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-sm truncate">{lecture.title}</p>
                  {lecture.description && (
                    <p className="text-xs text-muted-foreground truncate">
                      {lecture.description}
                    </p>
                  )}
                </div>
                <ExternalLink className="w-4 h-4 text-muted-foreground shrink-0" />
              </a>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
