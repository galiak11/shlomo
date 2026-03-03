import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

const FOOTER_COLUMNS = [
  {
    title: 'חותמות שלמה',
    links: [
      { label: 'קטלוג חותמות', href: '/' },
    ],
  },
  {
    title: 'שיעורים',
    links: [
      { label: 'הטמעות', href: createPageUrl('ClassLibrary') + '?tab=hatmaot' },
      { label: 'המלך', href: createPageUrl('ClassLibrary') + '?tab=hamelech' },
      { label: 'מפתח שלמה', href: createPageUrl('ClassLibrary') + '?tab=mafteach' },
      { label: 'קידודים', href: createPageUrl('ClassLibrary') + '?tab=kidudim' },
      { label: 'קלפים', href: createPageUrl('ClassLibrary') + '?tab=klafim' },
    ],
  },
  {
    title: 'לימוד',
    links: [
      { label: 'מסלול לימוד', href: createPageUrl('LearningPath') },
    ],
  },
];

export default function Footer() {
  return (
    <footer className="bg-gray-50 border-t border-border mt-auto">
      <div className="container mx-auto px-4 py-10">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
          {FOOTER_COLUMNS.map((column) => (
            <div key={column.title}>
              <h3 className="font-semibold text-sm text-gray-900 mb-3">{column.title}</h3>
              <ul className="space-y-2">
                {column.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      to={link.href}
                      className="text-sm text-gray-600 hover:text-primary transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
      <div className="border-t border-border">
        <div className="container mx-auto px-4 py-4">
          <p className="text-xs text-gray-500 text-center">
            &copy; {new Date().getFullYear()} חותמות שלמה
          </p>
        </div>
      </div>
    </footer>
  );
}
