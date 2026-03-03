/**
 * SealCardExpanded — sliding overlay panel showing seal details.
 *
 * Uses Sheet component (slides from right in RTL).
 * Click "פרטים נוספים" → SealDetail page.
 */

import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';

export default function SealCardExpanded({ seal, open, onClose }) {
  const content = seal.content;

  return (
    <Sheet open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-md overflow-y-auto p-0"
      >
        {/* Header */}
        <div className="sticky top-0 bg-background/95 backdrop-blur-sm p-4 pb-3 border-b border-border z-10">
          <div className="flex items-center gap-3 pr-0 pl-8">
            {seal.imageUrl && (
              <img
                src={seal.imageUrl}
                alt={seal.name}
                className="w-14 h-14 object-contain rounded-lg bg-muted p-1 flex-shrink-0"
              />
            )}
            <SheetHeader className="space-y-0.5 text-start">
              <SheetTitle className="text-lg">{seal.purposeSummary}</SheetTitle>
              <SheetDescription>{seal.name}</SheetDescription>
            </SheetHeader>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {content && (
            <>
              {/* Sacred names */}
              <div className="text-center">
                <p className="text-xs text-muted-foreground mb-1">{content.mainTitle}</p>
                <p className="font-semibold text-primary">{content.sealTitle}</p>
              </div>

              {/* Key Concepts */}
              {seal.keyConcepts && seal.keyConcepts.length > 0 && (
                <p className="text-sm text-muted-foreground text-center">
                  {seal.keyConcepts.join(' · ')}
                </p>
              )}

              {/* Description */}
              <p className="text-sm leading-relaxed">{content.description}</p>

              {/* Qualities */}
              {content.qualities && content.qualities.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-muted-foreground mb-2">תכונות</h4>
                  <div className="space-y-1.5">
                    {content.qualities.map((q, i) => (
                      <div key={i} className="flex gap-2 text-sm">
                        <span className="font-medium text-primary shrink-0">{q.name}</span>
                        <span className="text-muted-foreground">— {q.explanation}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Side Attributes */}
              {content.sideAttributes && content.sideAttributes.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-muted-foreground mb-2">שמות</h4>
                  <div className="space-y-1.5">
                    {content.sideAttributes.map((a, i) => (
                      <div key={i} className="flex gap-2 text-sm">
                        <span className="font-medium text-primary shrink-0">{a.name}</span>
                        <span className="text-muted-foreground">— {a.explanation}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {/* Action */}
          <Link to={createPageUrl('SealDetail') + `?id=${seal.id}`} onClick={onClose}>
            <Button className="w-full mt-2">פרטים נוספים</Button>
          </Link>
        </div>
      </SheetContent>
    </Sheet>
  );
}
