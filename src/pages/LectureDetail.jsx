/**
 * LectureDetail — Full lecture page with video player and content tabs.
 *
 * Route: /LectureDetail?lecture={basename}&t={seconds}
 *
 * Tabs (conditional on data):
 *   תקציר   — Markdown summary
 *   הטמעות  — Hatmaa practice cards with timestamps
 *   חותמות  — Seal cards with explanation/inscription timestamps
 *   ציטוטים — Quoted sources with timestamps
 */

import { useState, useMemo, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useLectures, useLectureMetadata } from '@/hooks/useData';
import { createPageUrl } from '@/utils';
import { toSeconds, formatTime } from '@/components/player/utils';
import VideoPlayer from '@/components/player/VideoPlayer';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Play, Clock, BookOpen, Quote, Star } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

export default function LectureDetail() {
  const params = new URLSearchParams(window.location.search);
  const basename = params.get('lecture') || '';
  const initialTime = params.get('t') ? Number(params.get('t')) : undefined;

  const lectures = useLectures();
  const { data: metadata, isLoading, error } = useLectureMetadata(basename);
  const [seekTime, setSeekTime] = useState(initialTime);
  const playerKeyRef = useRef(0);

  const lecture = useMemo(
    () => lectures.find((l) => l.basename === basename),
    [lectures, basename]
  );

  // Seek to a timestamp
  const handleSeek = useCallback((timeStr) => {
    const seconds = toSeconds(timeStr);
    setSeekTime(seconds);
    playerKeyRef.current += 1;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  // Build highlight ranges from seals
  const highlightRanges = useMemo(() => {
    if (!metadata?.seals) return [];
    return metadata.seals.flatMap((seal) => {
      const ranges = [];
      if (seal.explanationTime) {
        ranges.push({
          startTime: toSeconds(seal.explanationTime.startTime),
          endTime: toSeconds(seal.explanationTime.endTime),
          color: 'rgba(59,130,246,0.3)',
        });
      }
      if (seal.hatmaaTime) {
        ranges.push({
          startTime: toSeconds(seal.hatmaaTime.startTime),
          endTime: toSeconds(seal.hatmaaTime.endTime),
          color: 'rgba(168,85,247,0.3)',
        });
      }
      return ranges;
    });
  }, [metadata]);

  // Determine which tabs to show
  const hasSummary = !!metadata?.summary?.he;
  const hasHatmaot = metadata?.hatmaot?.length > 0;
  const hasSeals = metadata?.seals?.length > 0;
  const hasQuotes = metadata?.quotes?.length > 0;

  const defaultTab = hasSummary ? 'summary' : hasHatmaot ? 'hatmaot' : hasSeals ? 'seals' : 'quotes';

  if (!lecture) {
    return (
      <div className="p-6 text-center">
        <p className="text-muted-foreground">שיעור לא נמצא</p>
        <Link to={createPageUrl('ClassLibrary')} className="text-primary hover:underline mt-2 inline-block">
          חזרה לספריית השיעורים
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 space-y-6">
      {/* Header */}
      <header className="space-y-2">
        <p className="text-sm text-muted-foreground">{lecture.className?.he}</p>
        <h1 className="text-2xl sm:text-3xl font-bold">{lecture.title.he}</h1>
        <p className="text-muted-foreground text-sm leading-relaxed">
          {lecture.description?.he}
        </p>
      </header>

      {/* Video Player */}
      <VideoPlayer
        key={playerKeyRef.current}
        subtitleBasename={basename}
        startTime={seekTime}
        highlightRanges={highlightRanges}
      />

      {/* Loading state */}
      {isLoading && (
        <div className="flex justify-center py-8">
          <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
        </div>
      )}

      {/* Error state */}
      {error && (
        <p className="text-sm text-destructive text-center">שגיאה בטעינת נתוני השיעור</p>
      )}

      {/* Content Tabs */}
      {metadata && (
        <Tabs defaultValue={defaultTab} dir="rtl">
          <TabsList className="w-full flex">
            {hasSummary && (
              <TabsTrigger value="summary" className="flex-1 gap-1">
                <BookOpen className="w-3.5 h-3.5" />
                תקציר
              </TabsTrigger>
            )}
            {hasHatmaot && (
              <TabsTrigger value="hatmaot" className="flex-1 gap-1">
                <Play className="w-3.5 h-3.5" />
                הטמעות
              </TabsTrigger>
            )}
            {hasSeals && (
              <TabsTrigger value="seals" className="flex-1 gap-1">
                <Star className="w-3.5 h-3.5" />
                חותמות
              </TabsTrigger>
            )}
            {hasQuotes && (
              <TabsTrigger value="quotes" className="flex-1 gap-1">
                <Quote className="w-3.5 h-3.5" />
                נוסחאות
              </TabsTrigger>
            )}
          </TabsList>

          {/* Summary Tab */}
          {hasSummary && (
            <TabsContent value="summary">
              <div className="prose prose-sm max-w-none dark:prose-invert rtl-prose">
                <ReactMarkdown>{metadata.summary.he}</ReactMarkdown>
              </div>
            </TabsContent>
          )}

          {/* Hatmaot Tab */}
          {hasHatmaot && (
            <TabsContent value="hatmaot">
              <div className="space-y-3">
                {metadata.hatmaot.map((hatmaa, i) => (
                  <div
                    key={i}
                    className="border border-border rounded-lg p-4 space-y-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-medium text-sm">{hatmaa.name}</h3>
                      <button
                        onClick={() => handleSeek(hatmaa.startTime)}
                        className="flex items-center gap-1 text-xs text-primary hover:underline shrink-0"
                      >
                        <Clock className="w-3 h-3" />
                        {hatmaa.startTime}
                      </button>
                    </div>
                    {hatmaa.goal && (
                      <p className="text-sm text-muted-foreground">{hatmaa.goal}</p>
                    )}
                  </div>
                ))}
              </div>
            </TabsContent>
          )}

          {/* Seals Tab */}
          {hasSeals && (
            <TabsContent value="seals">
              <div className="space-y-4">
                {metadata.seals.map((seal, i) => (
                  <div
                    key={i}
                    className="border border-border rounded-lg overflow-hidden"
                  >
                    <div className="p-4 space-y-3">
                      {/* Seal header */}
                      <div className="flex items-center gap-3">
                        {seal.imageUrl && (
                          <img
                            src={seal.imageUrl}
                            alt={seal.name?.he}
                            className="w-12 h-12 object-contain rounded bg-muted p-1"
                          />
                        )}
                        <div>
                          <h3 className="font-medium">{seal.name?.he}</h3>
                          {seal.description?.he && (
                            <p className="text-sm text-muted-foreground">
                              {seal.description.he}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Seal content */}
                      {seal.sealContent && (
                        <div className="text-center py-2">
                          <p className="text-xs text-muted-foreground">
                            {seal.sealContent.mainTitle}
                          </p>
                          <p className="font-semibold text-primary text-sm">
                            {seal.sealContent.sealTitle}
                          </p>
                        </div>
                      )}

                      {/* Timestamp buttons */}
                      <div className="flex flex-wrap gap-2">
                        {seal.explanationTime && (
                          <button
                            onClick={() => handleSeek(seal.explanationTime.startTime)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs bg-blue-500/10 text-blue-600 hover:bg-blue-500/20 transition"
                          >
                            <BookOpen className="w-3 h-3" />
                            הסבר — {seal.explanationTime.startTime}
                          </button>
                        )}
                        {seal.hatmaaTime && (
                          <button
                            onClick={() => handleSeek(seal.hatmaaTime.startTime)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs bg-purple-500/10 text-purple-600 hover:bg-purple-500/20 transition"
                          >
                            <Play className="w-3 h-3" />
                            הטמעה — {seal.hatmaaTime.startTime}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </TabsContent>
          )}

          {/* Quotes Tab */}
          {hasQuotes && (
            <TabsContent value="quotes">
              <div className="space-y-3">
                {metadata.quotes.map((quote, i) => (
                  <div
                    key={i}
                    className="border border-border rounded-lg p-4 space-y-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-medium text-primary">
                        {quote.source}
                      </p>
                      {quote.timestamp && (
                        <button
                          onClick={() => handleSeek(quote.timestamp)}
                          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary shrink-0"
                        >
                          <Clock className="w-3 h-3" />
                          {quote.timestamp}
                        </button>
                      )}
                    </div>
                    <blockquote className="text-sm border-r-2 border-primary/30 pr-3 italic">
                      {quote.text}
                    </blockquote>
                    {quote.context && (
                      <p className="text-xs text-muted-foreground">{quote.context}</p>
                    )}
                  </div>
                ))}
              </div>
            </TabsContent>
          )}
        </Tabs>
      )}
    </div>
  );
}
