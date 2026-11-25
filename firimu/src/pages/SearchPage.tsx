import React, {useMemo, useState} from 'react';
import {Link, useSearchParams} from 'react-router-dom';
import {Search} from 'lucide-react';
import {MovieCard} from '../components/MovieCard.tsx';
import {SeoHead} from '../components/SeoHead.tsx';
import {useCatalogue} from '../context/CatalogueContext.tsx';
import {SITE_NAME} from '../lib/constants.ts';

const PAGE_SIZE = 24;

export const SearchPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialQuery = searchParams.get('q') ?? '';
  const [query, setQuery] = useState(initialQuery);
  const [typeFilter, setTypeFilter] = useState<'all' | 'movie' | 'series'>('all');
  const [page, setPage] = useState(1);

  const {items, loading} = useCatalogue();

  const handleQueryChange = (val: string) => {
    setQuery(val);
    setPage(1);
    if (val.trim()) {
      setSearchParams({q: val}, {replace: true});
    } else {
      setSearchParams({}, {replace: true});
    }
  };

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((item) => {
      if (typeFilter !== 'all' && item.contentType !== typeFilter) return false;
      if (!q) return true;
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
    });
  }, [items, query, typeFilter]);

  const totalPages = Math.max(1, Math.ceil(results.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paged = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return results.slice(start, start + PAGE_SIZE);
  }, [results, currentPage]);

  const trimmed = query.trim();

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <SeoHead
        title={
          trimmed
            ? `Search: ${trimmed} — ${SITE_NAME}`
            : `Instant Search — ${SITE_NAME}`
        }
        description="Search Luganda translated movies, series, VJs, genres, and synopses instantly."
        canonicalPath="/search"
      />

      <nav
        aria-label="Breadcrumb"
        className="mb-3 flex items-center gap-2 text-xs text-[#A4A9B8]"
      >
        <Link to="/" className="hover:text-white">
          Home
        </Link>
        <span aria-hidden="true">/</span>
        <span className="text-[#F9F9F9]">Search</span>
      </nav>

      <div className="mb-8 border-b border-white/[0.08] pb-6">
        <h1 className="font-display text-2xl font-extrabold tracking-tight text-[#F9F9F9] sm:text-3xl">
          Search Firimu &amp; Series
        </h1>
        <p className="mt-1 text-sm text-[#A4A9B8]">
          Search across titles, VJs, genres, and synopses instantly.
        </p>

        <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search
              className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#0483EE]"
              aria-hidden="true"
            />
            <input
              type="search"
              value={query}
              onChange={(e) => handleQueryChange(e.target.value)}
              placeholder="Type a movie title, VJ name (e.g. Vj Junior), genre..."
              aria-label="Search full catalogue"
              className="h-12 w-full rounded-xl border border-white/[0.14] bg-[#0E111E] pl-12 pr-4 text-base text-[#F9F9F9] placeholder-[#6E768A] focus:border-[#0063E5] focus:outline-none"
            />
          </div>

          <div className="inline-flex items-center gap-1 self-start rounded-xl border border-white/[0.1] bg-[#0E111E] p-1 sm:self-auto">
            {(['all', 'movie', 'series'] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => {
                  setTypeFilter(t);
                  setPage(1);
                }}
                className={`min-h-[38px] whitespace-nowrap rounded-lg px-4 py-1.5 text-xs font-semibold transition-colors ${
                  typeFilter === t
                    ? 'bg-[#0063E5] text-white'
                    : 'text-[#A4A9B8] hover:text-white'
                }`}
              >
                {t === 'all' ? 'All' : t === 'movie' ? 'Movies' : 'Series'}
              </button>
            ))}
          </div>
        </div>

        <p className="mt-3 text-xs text-[#A4A9B8] tabular-nums">
          {results.length} result{results.length === 1 ? '' : 's'}
          {trimmed ? ` for "${trimmed}"` : ''}
        </p>
      </div>

      {loading && items.length === 0 ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {Array.from({length: 12}).map((_, idx) => (
            <div
              key={idx}
              className="aspect-[2/3] animate-pulse rounded-xl bg-[#0E111E]"
            />
          ))}
        </div>
      ) : paged.length === 0 ? (
        <div className="rounded-2xl border border-white/[0.1] bg-[#0E111E] px-6 py-16 text-center">
          <p className="font-display text-lg font-semibold text-white">
            No matching movies or series found
          </p>
          <p className="mt-1 text-sm text-[#A4A9B8]">
            Try a shorter keyword or search by VJ name such as Vj Emmy or Vj Junior.
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {paged.map((item) => (
              <MovieCard key={item.pathname} item={item} />
            ))}
          </div>

          {totalPages > 1 && (
            <nav
              aria-label="Search pagination"
              className="mt-10 flex flex-wrap items-center justify-center gap-2 tabular-nums"
            >
              <button
                type="button"
                disabled={currentPage <= 1}
                onClick={() => {
                  setPage(currentPage - 1);
                  window.scrollTo({top: 0, behavior: 'smooth'});
                }}
                className="inline-flex min-h-[44px] items-center rounded-lg border border-white/[0.12] bg-[#0E111E] px-4 text-sm font-medium text-[#F9F9F9] hover:border-white/35 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Previous
              </button>
              <span className="px-3 text-sm text-[#A4A9B8]">
                Page <strong className="text-white">{currentPage}</strong> of{' '}
                <strong className="text-white">{totalPages}</strong>
              </span>
              <button
                type="button"
                disabled={currentPage >= totalPages}
                onClick={() => {
                  setPage(currentPage + 1);
                  window.scrollTo({top: 0, behavior: 'smooth'});
                }}
                className="inline-flex min-h-[44px] items-center rounded-lg border border-white/[0.12] bg-[#0E111E] px-4 text-sm font-medium text-[#F9F9F9] hover:border-white/35 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Next
              </button>
            </nav>
          )}
        </>
      )}
    </div>
  );
};
