import { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChevronDown, Menu, X, Plus, Minus, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { createPageUrl } from '@/utils';
import { useHomeControls } from '@/contexts/HomeControlsContext';
import { ANIM_SPEEDS } from '@/components/home/SealCard';
import { TerminologyDialog } from '@/components/shared/TerminologyDialog';

const ANIM_SPEED_KEYS = Object.keys(ANIM_SPEEDS);

const NAV_ITEMS = [
  {
    key: 'seals',
    label: 'חותמות',
    href: createPageUrl('Home'),
    matchPaths: ['/', '/Home'],
  },
  {
    key: 'learningPath',
    label: 'מסלול לימוד',
    href: createPageUrl('LearningPath'),
    matchPaths: ['/LearningPath'],
  },
  {
    key: 'classes',
    label: 'קורסים',
    href: createPageUrl('ClassLibrary'),
    matchPaths: ['/ClassLibrary'],
    submenu: [
      { label: 'חותמות שלמה - הטמעות', href: createPageUrl('ClassLibrary') + '?tab=hatmaot' },
      { label: 'חותמות שלמה המלך', href: createPageUrl('ClassLibrary') + '?tab=hamelech' },
      { label: 'מפתח שלמה', href: createPageUrl('ClassLibrary') + '?tab=mafteach' },
      { label: 'קידודי שלמה', href: createPageUrl('ClassLibrary') + '?tab=kidudim' },
      { label: 'קלפי חותמות שלמה', href: createPageUrl('ClassLibrary') + '?tab=klafim' },
    ],
  },
];

function DesktopDropdown({ items, isOpen }) {
  if (!items || items.length === 0) return null;

  return (
    <div
      className={`absolute top-full mt-1 min-w-48 rounded-md bg-white shadow-lg border border-gray-200 py-1 z-50 transition-all duration-200 ${
        isOpen ? 'opacity-100 visible translate-y-0' : 'opacity-0 invisible -translate-y-2'
      }`}
    >
      {items.map((item) => (
        <Link
          key={item.label}
          to={item.href}
          className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-primary transition-colors"
        >
          {item.label}
        </Link>
      ))}
    </div>
  );
}

function MobileDrawer({ isOpen, onClose }) {
  const [expandedItems, setExpandedItems] = useState({});

  const toggleExpanded = (key) => {
    setExpandedItems((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <>
      {/* Overlay */}
      <div
        className={`fixed inset-0 bg-black/50 z-40 transition-opacity duration-300 ${
          isOpen ? 'opacity-100 visible' : 'opacity-0 invisible'
        }`}
        onClick={onClose}
      />

      {/* Drawer — slides from right (RTL) */}
      <div
        className={`fixed top-0 right-0 h-full w-80 max-w-[85vw] bg-white z-50 shadow-xl transform transition-transform duration-300 ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <Link to="/" className="font-semibold text-lg" onClick={onClose}>
            חותמות שלמה
          </Link>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Navigation */}
        <nav className="p-4 overflow-y-auto max-h-[calc(100vh-140px)]">
          {NAV_ITEMS.map((item) => {
            const isExpanded = expandedItems[item.key];
            const hasSubmenu = item.submenu && item.submenu.length > 0;

            return (
              <div key={item.key} className="border-b border-gray-100 last:border-0">
                {hasSubmenu ? (
                  <>
                    <button
                      className="w-full flex items-center justify-between py-3 text-gray-800 hover:text-primary transition-colors"
                      onClick={() => toggleExpanded(item.key)}
                    >
                      <span className="font-medium">{item.label}</span>
                      <ChevronDown
                        className={`h-4 w-4 transition-transform duration-200 ${
                          isExpanded ? 'rotate-180' : ''
                        }`}
                      />
                    </button>
                    <div
                      className={`overflow-hidden transition-all duration-200 ${
                        isExpanded ? 'max-h-96 pb-2' : 'max-h-0'
                      }`}
                    >
                      {item.submenu.map((subItem) => (
                        <Link
                          key={subItem.label}
                          to={subItem.href}
                          className="block py-2 ps-4 text-gray-600 hover:text-primary transition-colors"
                          onClick={onClose}
                        >
                          {subItem.label}
                        </Link>
                      ))}
                    </div>
                  </>
                ) : (
                  <Link
                    to={item.href}
                    className="block py-3 font-medium text-gray-800 hover:text-primary transition-colors"
                    onClick={onClose}
                  >
                    {item.label}
                  </Link>
                )}
              </div>
            );
          })}
        </nav>

        {/* Terminology — mobile */}
        <div className="border-t border-gray-100 px-4 py-3">
          <TerminologyDialog
            trigger={
              <button
                className="flex items-center gap-2 w-full py-2 text-gray-800 hover:text-primary transition-colors"
                onClick={onClose}
              >
                <BookOpen className="w-4 h-4" />
                <span className="font-medium">מילון מונחים</span>
              </button>
            }
          />
        </div>

        {/* CTA at bottom */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t bg-gray-50">
          <Link to={createPageUrl('LearningPath')} onClick={onClose}>
            <Button className="w-full">התחל ללמוד</Button>
          </Link>
        </div>
      </div>
    </>
  );
}

export default function Navbar() {
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState(null);
  const [isScrolled, setIsScrolled] = useState(false);
  const closeTimeoutRef = useRef(null);
  const { controls } = useHomeControls();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const isActive = (item) => {
    return item.matchPaths?.some(p => location.pathname === p);
  };

  const handleDropdownEnter = (key) => {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
    setActiveDropdown(key);
  };

  const handleDropdownLeave = () => {
    closeTimeoutRef.current = setTimeout(() => {
      setActiveDropdown(null);
    }, 150);
  };

  return (
    <>
      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          isScrolled ? 'bg-white shadow-md' : 'bg-white/95 backdrop-blur-sm'
        }`}
      >
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link to="/" className="font-bold text-lg text-gray-900">
              חותמות שלמה
            </Link>

            {/* Desktop: nav items + CTA in one group */}
            <div className="hidden md:flex items-center gap-1">
              <ul className="flex items-center gap-1">
                {NAV_ITEMS.map((item) => {
                  const hasSubmenu = item.submenu && item.submenu.length > 0;
                  const active = isActive(item);

                  return (
                    <li
                      key={item.key}
                      className="relative"
                      onMouseEnter={() => hasSubmenu && handleDropdownEnter(item.key)}
                      onMouseLeave={() => hasSubmenu && handleDropdownLeave()}
                    >
                      {hasSubmenu ? (
                        <>
                          <Link
                            to={item.href ?? '#'}
                            className={`flex items-center gap-1 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                              active
                                ? 'text-primary bg-primary/5'
                                : 'text-gray-700 hover:text-primary hover:bg-gray-100'
                            }`}
                          >
                            {item.label}
                            <ChevronDown className="h-3.5 w-3.5" />
                          </Link>
                          <DesktopDropdown
                            items={item.submenu}
                            isOpen={activeDropdown === item.key}
                          />
                        </>
                      ) : (
                        <Link
                          to={item.href}
                          className={`block px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                            active
                              ? 'text-primary bg-primary/5'
                              : 'text-gray-700 hover:text-primary hover:bg-gray-100'
                          }`}
                        >
                          {item.label}
                        </Link>
                      )}
                    </li>
                  );
                })}
              </ul>

              {/* Terminology — desktop */}
              <TerminologyDialog
                trigger={
                  <button className="flex items-center gap-1 px-3 py-2 text-sm font-medium rounded-md text-gray-700 hover:text-primary hover:bg-gray-100 transition-colors">
                    <BookOpen className="w-3.5 h-3.5" />
                    מונחים
                  </button>
                }
              />

              {/* CTA — right next to the nav items */}
              <div className="w-px h-5 bg-gray-200 mx-1" />
              <Link to={createPageUrl('LearningPath')}>
                <Button size="sm">התחל ללמוד</Button>
              </Link>
            </div>

            {/* Actions: size controls + anim speed + hamburger */}
            <div className="flex items-center gap-1">
              {/* Grid size controls — only on Home page (desktop) */}
              {controls && (
                <>
                  <div className="hidden md:flex items-center gap-0.5">
                    <button
                      onClick={() => controls.onSizeChange(-1)}
                      disabled={controls.sizeLevel <= 0}
                      className="p-1.5 rounded hover:bg-accent text-muted-foreground disabled:opacity-30 disabled:cursor-not-allowed transition"
                      title="הגדל חותמות"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => controls.onSizeChange(1)}
                      disabled={controls.sizeLevel >= controls.maxSize}
                      className="p-1.5 rounded hover:bg-accent text-muted-foreground disabled:opacity-30 disabled:cursor-not-allowed transition"
                      title="הקטן חותמות"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Anim speed debug buttons */}
                  <div className="hidden md:flex items-center gap-0.5 bg-gray-100 rounded-full px-1 py-0.5 ms-1">
                    {ANIM_SPEED_KEYS.map((key) => (
                      <button
                        key={key}
                        onClick={() => controls.setAnimSpeed(key)}
                        className={`px-2 py-0.5 text-[10px] rounded-full transition ${
                          controls.animSpeed === key
                            ? 'bg-primary text-primary-foreground'
                            : 'text-muted-foreground hover:bg-accent'
                        }`}
                      >
                        {ANIM_SPEEDS[key].label}
                      </button>
                    ))}
                  </div>
                </>
              )}

              {/* Hamburger — mobile only */}
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden"
                onClick={() => setMobileMenuOpen(true)}
              >
                <Menu className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      </nav>

      <MobileDrawer
        isOpen={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
      />
    </>
  );
}
