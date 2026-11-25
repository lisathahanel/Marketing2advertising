import React, {useEffect, useMemo, useRef, useState} from 'react';
import {Link, useNavigate} from 'react-router-dom';
import {ArrowRight, Search, X} from 'lucide-react';
import {useCatalogue} from '../context/CatalogueContext.tsx';
import {PosterImage} from './PosterImage.tsx';

export const SearchOverlay: React.FC = () => {
  const {items, isSearchOpen, closeSearch} = useCatalogue();
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (isSearchOpen) {
      window.setTimeout(() => inputRef.current?.focus(), 40);
    } else {
      setQuery('');
    }
  }, [isSearchOpen]);

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items.slice(0, 8);
    return items
      .filter((item) => {
        const haystack = [
          item.displayTitle,
          item.title,
          item.vjName,
          ...item.genres,
          ...item.labels,
          ...item.synopsis,
        ]
          .join(' ')
          .toLowerCase();
        return haystack.includes(q);
      })
      .slice(0, 10);
  }, [items, query]);

  if (!isSearchOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = query.trim();
    closeSearch();
    navigate(trimmed ? `/search?q=${encodeURIComponent(trimmed)}` : '/search');
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-[#040714]/85 px-4 pt-16 backdrop-blur-md sm:pt-24"
      role="dialog"
      aria-modal="true"
      aria-label="Instant catalogue search"
      onClick={closeSearch}
    >
      <div
        className="w-full max-w-2xl overflow-hidden rounded-2xl border border-white/[0.16] bg-[#0E111E] shadow-[0_32px_64px_rgba(0,0,0,0.85)]"
        onClick={(e) => e.stopPropagation()}
      >
        <form
          onSubmit={handleSubmit}
          className="flex items-center gap-3 border-b border-white/[0.08] px-4 py-3.5"
        >
          <Search className="h-5 w-5 shrink-0 text-[#0483EE]" aria-hidden="true" />
          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search Luganda movies, series, VJs, genres..."
            className="w-full bg-transparent text-base text-[#F9F9F9] placeholder-[#6E768A] focus:outline-none"
          />
          <button
            type="button"
            onClick={closeSearch}
            aria-label="Close search"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-[#A4A9B8] hover:bg-white/[0.07] hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </form>

        <div className="max-h-[60vh] overflow-y-auto p-3">
          <div className="mb-2 flex items-center justify-between px-2 text-xs text-[#A4A9B8]">
            <span>
              {query.trim()
                ? `Top matches for "${query.trim()}"`
                : 'Recently added'}
            </span>
            <Link
              to={
                query.trim()
                  ? `/search?q=${encodeURIComponent(query.trim())}`
                  : '/search'
              }
              onClick={closeSearch}
              className="inline-flex items-center gap-1 font-semibold text-[#38BDF8] hover:underline"
            >
              <span>Full search</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {matches.length === 0 ? (
            <div className="px-4 py-10 text-center text-sm text-[#A4A9B8]">
              No movies or series matched &ldquo;{query.trim()}&rdquo;.
            </div>
          ) : (
            <ul className="divide-y divide-white/[0.06]">
              {matches.map((item) => (
                <li key={item.pathname}>
                  <Link
                    to={item.pathname}
                    onClick={closeSearch}
                    className="flex items-center gap-3.5 rounded-xl px-2.5 py-2.5 transition-colors hover:bg-white/[0.06]"
                  >
                    <div className="h-14 w-10 shrink-0 overflow-hidden rounded-md bg-[#040714]">
                      <PosterImage
                        src={item.posterUrl}
                        alt={item.displayTitle}
                        title={item.displayTitle}
                        className="h-full w-full object-cover"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-display text-sm font-semibold text-[#F9F9F9]">
                        {item.displayTitle}
                      </p>
                      <p className="mt-0.5 truncate text-xs text-[#A4A9B8] tabular-nums">
                        {item.vjName}
                        {item.genres[0] ? ` · ${item.genres[0]}` : ''}
                        {item.parts.length > 1
                          ? ` · ${item.parts.length} ${item.contentType === 'series' ? 'Episodes' : 'Parts'}`
                          : ''}
                      </p>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};
