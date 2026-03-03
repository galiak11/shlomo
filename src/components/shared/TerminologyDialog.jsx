/**
 * TerminologyDialog — Prerequisite glossary for the Shlomo Hatmaot course.
 *
 * 8 categories from the course prereq list (shlomo-website-mvp.md).
 * Opens as a dialog from any page via the `trigger` prop.
 *
 * Usage:
 *   <TerminologyDialog trigger={<button>מונחים</button>} />
 */

import { useState, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Search } from 'lucide-react';

// ─── Data ────────────────────────────────────────────────────────────────────

export const CATEGORIES = [
  {
    id: 'kabbalah',
    label: 'קבלה',
    title: 'קבלה — מבנה הבריאה',
    terms: [
      {
        term: 'ספירות',
        def: 'עשר כוחות/ממדים שדרכם האור העליון מתגלה בעולם (כתר, חוכמה, בינה, חסד, גבורה, תפארת, נצח, הוד, יסוד, מלכות)',
      },
      {
        term: 'אור אין-סוף',
        def: 'הכוח האלוהי הבלתי-מוגבל שמקרין מחוץ לבריאה',
      },
      {
        term: 'ארבעת העולמות',
        def: 'אצילות, בריאה, יצירה, עשייה — ארבע רמות ירידת האור מהמקור למציאות',
      },
      {
        term: 'כלים ואורות',
        def: 'הכלי = המקבל, האור = הנותן; כל ספירה היא כלי הממלא תפקיד',
      },
      {
        term: 'קליפות',
        def: 'כוחות "מעטפת" הסוככות על הקדושה; מקור המניעות, הסבל והחסימות',
      },
      {
        term: 'קליפת נוגה',
        def: 'הקליפה הניטרלית (בין קדושה לטומאה) — רוב החיים היומיומיים נמצאים בה',
      },
    ],
  },
  {
    id: 'soul',
    label: 'נשמה',
    title: 'נשמה ותודעה',
    terms: [
      {
        term: 'חמשת חלקי הנשמה',
        def: 'נפש (חיוני), רוח (רגשי), נשמה (אינטלקטואלי), חיה, יחידה — שכבות עולות של התודעה',
      },
      {
        term: 'צלם',
        def: 'שכבת התודעה שמעל השכל הרציונלי; "הגוף הדק"',
      },
      {
        term: 'שכל הרציונלי',
        def: 'התודעה הרגילה — פועל בתדר של "רצון לקבל"; מוגבל',
      },
      {
        term: 'רצון לקבל / להשפיע',
        def: 'הרצון לקבל = מניע אגואיסטי (עולם הזה); הרצון להשפיע = מניע אלטרואיסטי (קדושה)',
      },
      {
        term: 'התמרה',
        def: 'תהליך המרת "רצון לקבל" ל"רצון להשפיע" — ליבת העבודה הרוחנית',
      },
    ],
  },
  {
    id: 'brainwaves',
    label: 'גלי מוח',
    title: 'גלי מוח ועבודת תודעה',
    terms: [
      {
        term: 'גלי בטא',
        def: 'מצב ערות רגיל, מחשבות מהירות — לא ניתן להפעיל חותמות במצב זה',
      },
      {
        term: 'גלי אלפא',
        def: 'מצב רגיעה עמוקה, "פרה-שינה" — ניתן להתחיל עבודה',
      },
      {
        term: 'גלי תטא',
        def: 'מצב מדיטטיבי עמוק — המצב האידיאלי לצריבה ולהטמעה',
      },
      {
        term: 'הדמיון המונחה',
        def: 'שימוש בכוח הדמיון לשינוי תודעה ולתכנות תת-הכרה',
      },
      {
        term: 'תת-הכרה',
        def: 'החלק הלא-רציונלי של הנפש שמגיב לתדרים, לחזרות ולסמלים',
      },
    ],
  },
  {
    id: 'names',
    label: 'שמות',
    title: 'שמות קדושים וסמלים',
    terms: [
      {
        term: 'שם הוויה (י-ה-ו-ה)',
        def: 'שם האלוהים המרכזי; משמש ככלי לריבוב וחיבור לאורות',
      },
      {
        term: 'ע"ב השמות',
        def: '72 שילובי שמות קדושים הנגזרים מפסוקי שמות י"ד',
      },
      {
        term: 'מטטרון (מט"ט)',
        def: 'שר-מלאך גדול שמשמש תיווך בין עולמות — נוכח בחותמות',
      },
      {
        term: 'ניקוד שם הוויה',
        def: 'ניקוד שונה (סגול, שוואה) = ספירה שונה (חסד, גבורה) — אותו שם, תדר שונה',
      },
      {
        term: '32 נתיבות חוכמה',
        def: 'עשר ספירות + 22 אותיות (ספר יצירה) — מפת הקודים של הבריאה',
      },
    ],
  },
  {
    id: 'practical',
    label: 'מעשי',
    title: 'מושגים מעשיים-פרקטיים',
    terms: [
      {
        term: 'הטמעה / צריבה',
        def: 'הכנסת חותם לתודעה/לכפות הידיים כך שפועל ללא חותם פיזי',
      },
      {
        term: 'חניכה',
        def: 'חיבור לכוח או לתדר מסוים — "פתיחה" שנעשית על-ידי המורה',
      },
      {
        term: 'אורות חסדים',
        def: 'אנרגיית נתינה וחמלה שיוצאת מיד ימין (ספירת חסד); מקור ה"חום" שמורגש בעבודה',
      },
      {
        term: 'אורות חוכמה',
        def: 'אנרגיה של חוכמה/בינה שיוצאת מיד שמאל (ספירת גבורה)',
      },
      {
        term: 'כתר',
        def: 'הספירה העליונה ביותר = "קודקוד" — כאן "נפתחים" בתחילת כל הפעלה',
      },
      {
        term: 'הרחבת כלים',
        def: 'הגדלת "קיבולת" הנשמה לקבל יותר אור ושפע',
      },
      {
        term: 'תיקון שורשי',
        def: 'פתרון בעיה ברמת הסיבה הרוחנית/נשמתית, לא רק בתסמין',
      },
    ],
  },
  {
    id: 'solomon',
    label: 'שלמה',
    title: 'רקע על שלמה המלך והחותמות',
    terms: [
      {
        term: 'שלמה ואשמדאי',
        def: 'סיפור גמרא (גיטין ס"ח) — שלמה לכד את מלך השדים עם חותמו',
      },
      {
        term: 'בית המקדש',
        def: 'שלמה בנה את המקדש; תולעת השמיר שימשה לחציבה ללא כלי ברזל',
      },
      {
        term: 'ספר מפתח שלמה',
        def: 'ספר מסתורין מימי הביניים המיוחס לשלמה ומכיל חותמות',
      },
      {
        term: 'ע"ב השמות (שמות י"ד)',
        def: 'שלושה פסוקים בני 72 אותיות כל אחד — מקור ל-72 שמות',
      },
      {
        term: 'עין הרע',
        def: 'מושג מקראי ותלמודי — הזוהר מסביר מנגנונו; חותם ג׳ פועל נגדו',
      },
    ],
  },
  {
    id: 'reincarnation',
    label: 'גלגולים',
    title: 'גלגולים ותיקון אישי',
    terms: [
      {
        term: 'גלגול נשמות',
        def: 'נשמה חוזרת לעולם בגופים שונים לתיקון חשבונות שלא נסגרו',
      },
      {
        term: 'חשבון שמיים',
        def: '"תיק" הנשמה — חובות וזכויות מגלגולים קודמים שמשפיעים על החיים הנוכחיים',
      },
      {
        term: 'ייסורים ממרקים',
        def: 'עקרון שסבל מטהר חטאים; הקורס מציג חלופות יעילות יותר',
      },
      {
        term: 'שער הגלגולים',
        def: 'ספר האר"י (ר\' חיים ויטאל) על מנגנוני גלגול — מוזכר בשיעורים',
      },
    ],
  },
  {
    id: 'sources',
    label: 'מקורות',
    title: 'מקורות שכדאי להכיר',
    sources: [
      { name: 'ספר יצירה', desc: 'מפת הספירות והאותיות' },
      { name: 'הזוהר הקדוש', desc: 'המקור הקבלי המרכזי; מצוטט רבות' },
      { name: 'ספר תומר דבורה (הרמ"ק)', desc: 'מידות אלוהיות וחיקוין' },
      { name: 'ליקוטי מוהר"ן (רבי נחמן)', desc: 'על כעס, תיקון הכלים' },
      { name: 'שער הגלגולים (האר"י)', desc: 'גלגולים ותיקונים' },
    ],
  },
];

// ─── Reusable term list item ──────────────────────────────────────────────────

function TermItem({ term, def, catLabel }) {
  return (
    <div className="py-3 border-b border-border/40 last:border-0">
      <div className="flex items-center gap-2 flex-wrap" dir="rtl">
        <p className="font-semibold text-sm text-foreground leading-snug">{term}</p>
        {catLabel && (
          <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded shrink-0">
            {catLabel}
          </span>
        )}
      </div>
      <p className="text-xs text-muted-foreground leading-relaxed mt-1" dir="rtl">{def}</p>
    </div>
  );
}

// ─── Component ───────────────────────────────────────────────────────────────

export function TerminologyDialog({ trigger }) {
  const [query, setQuery] = useState('');

  const searchResults = useMemo(() => {
    const q = query.trim();
    if (!q) return null;

    const results = [];
    for (const cat of CATEGORIES) {
      const items = cat.terms
        ? cat.terms.filter(({ term, def }) => term.includes(q) || def.includes(q))
        : (cat.sources || []).filter(({ name, desc }) => name.includes(q) || (desc && desc.includes(q)));

      for (const item of items) {
        results.push({
          term: item.term || item.name,
          def: item.def || item.desc || '',
          catLabel: cat.label,
        });
      }
    }
    return results;
  }, [query]);

  return (
    <Dialog onOpenChange={(open) => { if (!open) setQuery(''); }}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>

      <DialogContent className="max-w-2xl p-0 overflow-hidden flex flex-col h-[85vh] sm:h-[80vh]">

        {/* ── Header ── */}
        {/*
          RTL flex order (right → left):
          [spacer — clears the absolute X button] [title+subtitle — flex-1] [search — far left end]
        */}
        <div className="flex items-center gap-3 px-6 pt-5 pb-4 border-b shrink-0" dir="rtl">

          {/* Spacer: physical right, keeps content clear of the Radix close button */}
          <div className="w-6 shrink-0" aria-hidden />

          {/* Title */}
          <div className="flex-1 min-w-0">
            <DialogTitle className="text-base font-bold leading-tight">מילון מונחים</DialogTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              הכירות בסיסית עם מונחי הקורס
            </p>
          </div>

          {/* Search — "far end" (physical left in RTL) */}
          <div className="flex items-center gap-1.5 border border-border rounded-md px-2.5 py-1.5 bg-background shrink-0 focus-within:border-primary transition-colors">
            <Search className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
            <input
              type="text"
              placeholder="חיפוש מונח..."
              dir="rtl"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="text-xs w-28 bg-transparent focus:outline-none placeholder:text-muted-foreground/50"
            />
          </div>
        </div>

        {/* ── Search results ── */}
        {searchResults ? (
          <div className="flex-1 overflow-y-auto px-6 py-2">
            {searchResults.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-10" dir="rtl">
                לא נמצאו תוצאות עבור &ldquo;{query}&rdquo;
              </p>
            ) : (
              <>
                <p className="text-[11px] text-muted-foreground py-2 text-right">
                  {searchResults.length} תוצאות
                </p>
                {searchResults.map(({ term, def, catLabel }) => (
                  <TermItem key={`${catLabel}-${term}`} term={term} def={def} catLabel={catLabel} />
                ))}
              </>
            )}
          </div>
        ) : (

          /* ── Category tabs ── */
          <Tabs defaultValue={CATEGORIES[0].id} dir="rtl" className="flex flex-col flex-1 overflow-hidden">

            {/* Tab bar — horizontally scrollable */}
            <div className="overflow-x-auto border-b bg-muted/30 shrink-0">
              <TabsList className="h-auto w-max min-w-full flex flex-nowrap gap-0.5 bg-transparent rounded-none px-3 py-2 justify-start">
                {CATEGORIES.map((cat) => (
                  <TabsTrigger
                    key={cat.id}
                    value={cat.id}
                    className="text-xs px-3 py-1.5 rounded-md data-[state=active]:bg-background data-[state=active]:shadow-sm shrink-0"
                  >
                    {cat.label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>

            {/* Tab content — scrollable */}
            <div className="flex-1 overflow-y-auto">
              {CATEGORIES.map((cat) => (
                <TabsContent key={cat.id} value={cat.id} className="mt-0 px-6 pt-4 pb-6">

                  {/* Category title */}
                  <p className="text-sm font-bold text-primary mb-1" dir="rtl">{cat.title}</p>
                  <div className="border-b border-border mb-1" />

                  {cat.terms ? (
                    /* Term definition list */
                    cat.terms.map(({ term, def }) => (
                      <TermItem key={term} term={term} def={def} />
                    ))
                  ) : (
                    /* Sources list */
                    <>
                      {cat.sources.map(({ name, desc }) => (
                        <TermItem key={name} term={name} def={desc || ''} />
                      ))}
                    </>
                  )}
                </TabsContent>
              ))}
            </div>
          </Tabs>
        )}

      </DialogContent>
    </Dialog>
  );
}
