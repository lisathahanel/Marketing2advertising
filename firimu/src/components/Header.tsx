import React, {useEffect, useRef, useState} from 'react';
import {Link, useLocation} from 'react-router-dom';
import {ChevronDown, Menu, Play, Search, X} from 'lucide-react';
import {useCatalogue} from '../context/CatalogueContext.tsx';
import {MOVIE_GENRES, SERIES_FEED_LABEL, VJ_LIST} from '../lib/constants.ts';
import {PWAInstallButton} from './PWAInstallModal.tsx';

export const Header: React.FC = () => {
  const {openSearch, offlineMovies} = useCatalogue();
  const location = useLocation();
  const [openDropdown, setOpenDropdown] = useState<'movies' | 'vj' | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobileAccordion, setMobileAccordion] = useState<'movies' | 'vj' | null>(
    null,
  );
  const [scrolled, setScrolled] = useState(false);
  const navRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setOpenDropdown(null);
    setMobileOpen(false);
  }, [location.pathname, location.search]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16);
    onScroll();
    window.addEventListener('scroll', onScroll, {passive: true});
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(e.target as Node)) {
        setOpenDropdown(null);
      }
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  const offlineLabel =
    offlineMovies.length > 0 ? `Offline (${offlineMovies.length})` : 'Offline';

  return (
    <header
      className={`sticky top-0 z-40 transition-colors duration-200 ${
        scrolled
          ? 'border-b border-white/[0.1] bg-[#040714]/94 shadow-[0_8px_30px_rgba(0,0,0,0.65)] backdrop-blur-md'
          : 'border-b border-white/[0.06] bg-gradient-to-b from-[#040714]/95 to-[#040714]/75 backdrop-blur-md'
      }`}
    >
      <div
        ref={navRef}
        className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:gap-8 lg:px-8"
      >
        {/* Zone 1: Brand Wordmark */}
        <Link
          to="/"
          className="flex shrink-0 items-center gap-2.5 whitespace-nowrap rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0063E5]"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[#0483EE] to-[#0063E5] text-white shadow-[0_0_20px_rgba(0,99,229,0.45)]">
            <Play className="ml-0.5 h-4 w-4 fill-current" aria-hidden="true" />
          </span>
          <span className="font-display text-lg font-extrabold tracking-tight text-[#F9F9F9]">
            Firimu
          </span>
        </Link>

        {/* Zone 2: Desktop Navigation (5 concise links) */}
        <nav
          aria-label="Main navigation"
          className="hidden items-center gap-6 text-[13px] font-semibold tracking-wide text-[#CACACA] lg:flex"
        >
          <Link
            to="/"
            data-active={location.pathname === '/'}
            className="disney-nav-link whitespace-nowrap shrink-0 py-2 transition-colors hover:text-white"
          >
            Home
          </Link>

          {/* Movies Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() =>
                setOpenDropdown((prev) => (prev === 'movies' ? null : 'movies'))
              }
              aria-expanded={openDropdown === 'movies'}
              className="disney-nav-link inline-flex min-h-[40px] items-center gap-1 whitespace-nowrap shrink-0 py-2 transition-colors hover:text-white"
            >
              <span>Movies</span>
              <ChevronDown
                className={`h-4 w-4 transition-transform duration-150 ${
                  openDropdown === 'movies' ? 'rotate-180 text-[#38BDF8]' : ''
                }`}
                aria-hidden="true"
              />
            </button>
            {openDropdown === 'movies' && (
              <div className="absolute left-0 top-full mt-2 w-60 rounded-xl border border-white/[0.14] bg-[#0E111E]/98 p-2 shadow-[0_24px_48px_rgba(0,0,0,0.85)] backdrop-blur-xl">
                <Link
                  to="/search/label/nakamovies"
                  className="block rounded-lg px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#0063E5]/20"
                >
                  All Movies (Firimu)
                </Link>
                <a href="/tv/"
                  className="block rounded-lg px-3 py-2 text-sm text-[#CACACA] transition-colors hover:bg-white/[0.07] hover:text-white"
                >
                  Live TV
                </a>
                <div className="my-1 border-t border-white/[0.08]" />
                {MOVIE_GENRES.map((genre) => (
                  <Link
                    key={genre}
                    to={`/search/label/${encodeURIComponent(genre)}`}
                    className="block rounded-lg px-3 py-2 text-sm text-[#CACACA] transition-colors hover:bg-white/[0.07] hover:text-white"
                  >
                    {genre}
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* VJ Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() =>
                setOpenDropdown((prev) => (prev === 'vj' ? null : 'vj'))
              }
              aria-expanded={openDropdown === 'vj'}
              className="disney-nav-link inline-flex min-h-[40px] items-center gap-1 whitespace-nowrap shrink-0 py-2 transition-colors hover:text-white"
            >
              <span>VJs</span>
              <ChevronDown
                className={`h-4 w-4 transition-transform duration-150 ${
                  openDropdown === 'vj' ? 'rotate-180 text-[#38BDF8]' : ''
                }`}
                aria-hidden="true"
              />
            </button>
            {openDropdown === 'vj' && (
              <div className="absolute left-0 top-full mt-2 w-48 rounded-xl border border-white/[0.14] bg-[#0E111E]/98 p-2 shadow-[0_24px_48px_rgba(0,0,0,0.85)] backdrop-blur-xl">
                {VJ_LIST.map((vj) => (
                  <Link
                    key={vj}
                    to={`/search/label/${encodeURIComponent(vj)}`}
                    className="block rounded-lg px-3 py-2 text-sm text-[#CACACA] transition-colors hover:bg-white/[0.07] hover:text-white"
                  >
                    {vj}
                  </Link>
                ))}
              </div>
            )}
          </div>

          <Link
            to={`/search/label/${SERIES_FEED_LABEL}`}
            data-active={location.pathname.includes(SERIES_FEED_LABEL)}
            className="disney-nav-link whitespace-nowrap shrink-0 py-2 transition-colors hover:text-white"
          >
            Series
          </Link>

          <Link
            to="/offline"
            data-active={location.pathname === '/offline'}
            className="disney-nav-link whitespace-nowrap shrink-0 py-2 transition-colors hover:text-white tabular-nums"
          >
            {offlineLabel}
          </Link>
        </nav>

        {/* Zone 3: Search, Install & Mobile Trigger */}
        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          <button
            type="button"
            onClick={openSearch}
            aria-label="Search movies and series"
            className="inline-flex min-h-[42px] items-center gap-2 whitespace-nowrap shrink-0 rounded-lg border border-white/[0.14] bg-[#0E111E]/90 px-3 py-2 text-xs font-medium text-[#CACACA] transition-colors hover:border-white/40 hover:text-white"
          >
            <Search className="h-4 w-4 text-[#CACACA]" aria-hidden="true" />
            <span className="hidden sm:inline">Search</span>
            <kbd className="hidden rounded bg-white/[0.08] px-1.5 py-0.5 text-[10px] font-semibold text-[#A4A9B8] md:inline">
              Ctrl K
            </kbd>
          </button>

          <div className="hidden sm:block">
            <PWAInstallButton />
          </div>

          <button
            type="button"
            onClick={() => setMobileOpen((prev) => !prev)}
            aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={mobileOpen}
            className="flex h-11 w-11 items-center justify-center rounded-lg border border-white/[0.14] bg-[#0E111E] text-[#F9F9F9] hover:border-white/40 lg:hidden"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Navigation Drawer */}
      {mobileOpen && (
        <div className="border-t border-white/[0.08] bg-[#040714] px-4 pb-6 pt-3 lg:hidden">
          <nav aria-label="Mobile navigation" className="space-y-1">
            <Link
              to="/"
              className="flex min-h-[44px] items-center rounded-lg px-3 text-sm font-medium text-[#F9F9F9] hover:bg-white/[0.07]"
            >
              Home
            </Link>

            {/* Movies Accordion */}
            <div>
              <button
                type="button"
                onClick={() =>
                  setMobileAccordion((prev) =>
                    prev === 'movies' ? null : 'movies',
                  )
                }
                aria-expanded={mobileAccordion === 'movies'}
                className="flex min-h-[44px] w-full items-center justify-between rounded-lg px-3 text-sm font-medium text-[#F9F9F9] hover:bg-white/[0.07]"
              >
                <span>Movies</span>
                <ChevronDown
                  className={`h-4 w-4 transition-transform ${
                    mobileAccordion === 'movies' ? 'rotate-180 text-[#38BDF8]' : ''
                  }`}
                />
              </button>
              {mobileAccordion === 'movies' && (
                <div className="mt-1 space-y-1 pl-4">
                  <Link
                    to="/search/label/nakamovies"
                    className="flex min-h-[44px] items-center rounded-lg px-3 text-sm font-semibold text-white hover:bg-white/[0.07]"
                  >
                    All Movies (Firimu)
                  </Link>
                  <a href="/tv/"
                    className="flex min-h-[44px] items-center rounded-lg px-3 text-sm text-[#A4A9B8] hover:bg-white/[0.07] hover:text-white"
                  >
                    Live TV
                  </a>
                  {MOVIE_GENRES.map((genre) => (
                    <Link
                      key={genre}
                      to={`/search/label/${encodeURIComponent(genre)}`}
                      className="flex min-h-[44px] items-center rounded-lg px-3 text-sm text-[#A4A9B8] hover:bg-white/[0.07] hover:text-white"
                    >
                      {genre}
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* VJ Accordion */}
            <div>
              <button
                type="button"
                onClick={() =>
                  setMobileAccordion((prev) => (prev === 'vj' ? null : 'vj'))
                }
                aria-expanded={mobileAccordion === 'vj'}
                className="flex min-h-[44px] w-full items-center justify-between rounded-lg px-3 text-sm font-medium text-[#F9F9F9] hover:bg-white/[0.07]"
              >
                <span>VJs</span>
                <ChevronDown
                  className={`h-4 w-4 transition-transform ${
                    mobileAccordion === 'vj' ? 'rotate-180 text-[#38BDF8]' : ''
                  }`}
                />
              </button>
              {mobileAccordion === 'vj' && (
                <div className="mt-1 space-y-1 pl-4">
                  {VJ_LIST.map((vj) => (
                    <Link
                      key={vj}
                      to={`/search/label/${encodeURIComponent(vj)}`}
                      className="flex min-h-[44px] items-center rounded-lg px-3 text-sm text-[#A4A9B8] hover:bg-white/[0.07] hover:text-white"
                    >
                      {vj}
                    </Link>
                  ))}
                </div>
              )}
            </div>

            <Link
              to={`/search/label/${SERIES_FEED_LABEL}`}
              className="flex min-h-[44px] items-center rounded-lg px-3 text-sm font-medium text-[#F9F9F9] hover:bg-white/[0.07]"
            >
              Series
            </Link>

            <Link
              to="/offline"
              className="flex min-h-[44px] items-center rounded-lg px-3 text-sm font-medium text-[#38BDF8] hover:bg-white/[0.07]"
            >
              {offlineLabel}
            </Link>

            <Link
              to="/p/about"
              className="flex min-h-[44px] items-center rounded-lg px-3 text-sm font-medium text-[#F9F9F9] hover:bg-white/[0.07]"
            >
              About
            </Link>

            <div className="pt-3">
              <PWAInstallButton className="w-full justify-center" />
            </div>
          </nav>
        </div>
      )}
    </header>
  );
};
