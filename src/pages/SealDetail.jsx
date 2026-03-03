/**
 * SealDetail — Full seal information page.
 *
 * Route: /SealDetail?id={sealId}
 *
 * Shows: large image, name, purpose, key concepts,
 * sacred names, description, qualities, side attributes,
 * and links to related lectures from the learning path.
 */

import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useSeal, useLectures } from '@/hooks/useData';
import { createPageUrl } from '@/utils';
import LEARNING_PATH from '@/data/learning-path';
import { BookOpen, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function SealDetail() {
  const params = new URLSearchParams(window.location.search);
  const sealId = params.get('id') || 'seal-1';
  const seal = useSeal(sealId);
  const lectures = useLectures();

  // Find learning path sessions that reference this seal
  const relatedSessions = useMemo(() => {
    if (!seal) return [];
    return LEARNING_PATH.filter(
      (s) => s.type === 'seal' && s.sealNumber === seal.number
    );
  }, [seal]);

  // Get lecture info for each related session
  const relatedLectures = useMemo(() => {
    return relatedSessions.map((session) => {
      const lecture = lectures.find(
        (l) => l.basename === session.lectureBasename
      );
      return { session, lecture };
    });
  }, [relatedSessions, lectures]);

  if (!seal) {
    return (
      <div className="p-6 text-center">
        <p className="text-muted-foreground">חותם לא נמצא</p>
        <Link to="/" className="text-primary hover:underline mt-2 inline-block">
          חזרה לקטלוג
        </Link>
      </div>
    );
  }

  const content = seal.content;

  return (
    <div className="max-w-3xl mx-auto p-4 sm:p-6 space-y-8">
      {/* Header: Image + Name + Purpose */}
      <header className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
        {seal.imageUrl && (
          <div className="w-40 h-40 sm:w-48 sm:h-48 flex-shrink-0 bg-muted rounded-xl p-3 flex items-center justify-center">
            <img
              src={seal.imageUrl}
              alt={seal.name}
              className="w-full h-full object-contain"
            />
          </div>
        )}
        <div className="text-center sm:text-start space-y-2">
          <h1 className="text-2xl sm:text-3xl font-bold">{seal.purposeSummary}</h1>
          <p className="text-muted-foreground text-lg">{seal.name}</p>
          {seal.keyConcepts && seal.keyConcepts.length > 0 && (
            <p className="text-sm text-muted-foreground">
              {seal.keyConcepts.join(' · ')}
            </p>
          )}
        </div>
      </header>

      {content && (
        <>
          {/* Sacred Names */}
          <section className="bg-card border border-border rounded-xl p-6 text-center space-y-2">
            <p className="text-xs text-muted-foreground tracking-wider">{content.mainTitle}</p>
            <p className="text-xl font-bold text-primary">{content.sealTitle}</p>
          </section>

          {/* Description */}
          <section>
            <p className="text-base leading-relaxed">{content.description}</p>
          </section>

          {/* Qualities */}
          {content.qualities && content.qualities.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-sm font-semibold text-muted-foreground">תכונות</h2>
              <div className="grid gap-3">
                {content.qualities.map((q, i) => (
                  <div
                    key={i}
                    className="bg-card border border-border rounded-lg p-4 flex gap-3"
                  >
                    <span className="font-bold text-primary whitespace-nowrap">{q.name}</span>
                    <span className="text-muted-foreground">{q.explanation}</span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Side Attributes (שמות) */}
          {content.sideAttributes && content.sideAttributes.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-sm font-semibold text-muted-foreground">שמות</h2>
              <div className="grid gap-3">
                {content.sideAttributes.map((a, i) => (
                  <div
                    key={i}
                    className="bg-card border border-border rounded-lg p-4 flex gap-3"
                  >
                    <span className="font-bold text-primary whitespace-nowrap">{a.name}</span>
                    <span className="text-muted-foreground">{a.explanation}</span>
                  </div>
                ))}
              </div>
            </section>
          )}
        </>
      )}

      {/* Related Lectures */}
      {relatedLectures.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
            <BookOpen className="w-4 h-4" />
            שיעורים קשורים
          </h2>
          <div className="grid gap-3">
            {relatedLectures.map(({ session, lecture }) => (
              <Link
                key={session.session}
                to={
                  createPageUrl('LectureDetail') +
                  `?lecture=${session.lectureBasename}`
                }
                className="bg-card border border-border rounded-lg p-4 hover:shadow-md transition group flex items-center gap-3"
              >
                <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                  <Play className="w-4 h-4 text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="font-medium truncate">
                    {lecture ? lecture.title.he : session.title}
                  </p>
                  <p className="text-sm text-muted-foreground truncate">
                    {session.topic}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Back to catalog */}
      <div className="text-center pb-4">
        <Link to="/">
          <Button variant="outline">חזרה לקטלוג</Button>
        </Link>
      </div>
    </div>
  );
}
