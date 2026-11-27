import { Menu } from 'lucide-react';
import type { CategoryId, SourceFilter, ViewMode } from '../types';

interface HeaderProps {
  activeCategory: CategoryId;
  activeSource: SourceFilter;
  viewMode: ViewMode;
  onSelectCategory: (cat: CategoryId) => void;
  onSelectViewMode: (mode: ViewMode) => void;
  onJumpToCreators: () => void;
  onOpenOffline: () => void;
  onOpenMenu: () => void;
}

export function Header({
  activeCategory,
  activeSource,
  viewMode,
  onSelectCategory,
  onSelectViewMode,
  onJumpToCreators,
  onOpenOffline,
  onOpenMenu,
}: HeaderProps) {
  const navItems: { id: string; label: string; isActive: boolean; onClick: () => void }[] = [
    {
      id: 'discover',
      label: 'Discover',
      isActive:
        viewMode === 'grid' &&
        activeCategory === 'trending' &&
        activeSource !== 'offline',
      onClick: () => {
        onSelectViewMode('grid');
        onSelectCategory('trending');
      },
    },
    {
      id: 'shorts',
      label: 'Shorts Scroll',
      isActive: viewMode === 'shorts',
      onClick: () => onSelectViewMode('shorts'),
    },
    {
      id: 'family',
      label: 'Family & Kids',
      isActive: viewMode === 'grid' && activeCategory === 'family',
      onClick: () => {
        onSelectViewMode('grid');
        onSelectCategory('family');
      },
    },
    {
      id: 'creators',
      label: 'Creators',
      isActive: false,
      onClick: onJumpToCreators,
    },
    {
      id: 'offline',
      label: 'Offline 24h',
      isActive: viewMode === 'grid' && activeSource === 'offline',
      onClick: onOpenOffline,
    },
  ];

  return (
    <header className="sticky top-0 z-30 border-b border-zinc-800/80 bg-[#09090B]/92 backdrop-blur-md">
      <div className="mx-auto flex h-14 md:h-16 max-w-[1440px] items-center justify-between gap-8 px-4 sm:px-6 lg:px-10">
        {/* Zone 1: Single-line Brand Logo & Wordmark */}
        <button
          type="button"
          onClick={() => {
            onSelectViewMode('grid');
            onSelectCategory('trending');
          }}
          className="inline-flex items-center gap-2.5 font-display text-base sm:text-xl font-bold tracking-tight text-zinc-50 hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-rose-500"
        >
          <img
            src="/icon.svg"
            alt="M2A logo"
            className="h-7 w-7 sm:h-8 sm:w-8 rounded-lg shrink-0"
          />
          <span>marketing2advertising</span>
        </button>

        {/* Zone 2: 5 concise single-line navigation links */}
        <nav
          aria-label="Primary navigation"
          className="hidden md:flex items-center gap-7 text-sm font-medium"
        >
          {navItems.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={item.onClick}
              className={`relative py-1 whitespace-nowrap shrink-0 transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-rose-500 ${
                item.isActive ? 'text-zinc-50' : 'text-zinc-400 hover:text-zinc-100'
              }`}
            >
              {item.label}
              {item.isActive && (
                <span
                  aria-hidden="true"
                  className="absolute inset-x-0 -bottom-[17px] h-0.5 bg-rose-600"
                />
              )}
            </button>
          ))}
        </nav>

        {/* Zone 3: Single primary CTA opening Menu Drawer */}
        <div className="flex items-center shrink-0">
          <button
            type="button"
            onClick={onOpenMenu}
            aria-label="Open menu"
            className="inline-flex items-center gap-2 px-3.5 sm:px-4 py-1.5 sm:py-2 text-xs font-semibold text-white bg-rose-600 rounded-lg hover:bg-rose-500 active:scale-[0.98] transition-all duration-150 whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-500"
          >
            <Menu className="h-3.5 w-3.5" />
            <span>Menu</span>
          </button>
        </div>
      </div>
    </header>
  );
}
