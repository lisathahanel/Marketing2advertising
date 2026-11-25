import React, {useMemo, useState} from 'react';
import {Link, useParams} from 'react-router-dom';
import {MovieCard} from '../components/MovieCard.tsx';
import {SeoHead} from '../components/SeoHead.tsx';
import {useCatalogue} from '../context/CatalogueContext.tsx';
import {
  MOVIE_FEED_LABEL,
  SERIES_FEED_LABEL,
  SITE_NAME,
} from '../lib/constants.ts';

type SortMode = 'newest' | 'oldest' | 'az';
const PAGE_SIZE = 24;

function getArchiveDisplayTitle(rawLabel: string): string {
  const low = rawLabel.toLowerCase();
  if (low === MOVIE_FEED_LABEL) return 'All Movies (Firimu)';
  if (low === SERIES_FEED_LABEL) return 'All Series';
  return rawLabel;
}

export const LabelArchivePage: React.FC = () => {
  const {label = ''} = useParams<{label: string}>();
  const decodedLabel = decodeURIComponent(label);
  const {items, loading} = useCatalogue();
  const [sortBy, setSortBy] = useState<SortMode>('newest');
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    const target = decodedLabel.trim().toLowerCase();
    const list = items.filter((item) => {
      if (target === MOVIE_FEED_LABEL) return item.contentType === 'movie';
      if (target === SERIES_FEED_LABEL) return item.contentType === 'series';
      if (target === 'live tv' || target === 'livetv') {
        return (
          item.isLiveTv ||
          item.labels.some(
            (l) => l.toLowerCase() === 'live tv' || l.toLowerCase() === 'livetv',
          )
        );
      }
      return (
        item.labels.some((l) => l.toLowerCase() === target) ||
        item.genres.some((g) => g.toLowerCase() === target) ||
        item.vjName.toLowerCase() === target
      );
    });

    const sorted = [...list];
    if (sortBy === 'newest') {
      sorted.sort(
        (a, b) =>
          new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime(),
      );
    } else if (sortBy === 'oldest') {
      sorted.sort(
        (a, b) =>
          new Date(a.publishedAt).getTime() - new Date(b.publishedAt).getTime(),
      );
    } else {
      sorted.sort((a, b) => a.displayTitle.localeCompare(b.displayTitle));
    }
    return sorted;
  }, [items, decodedLabel, sortBy]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paged = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, currentPage]);

  const headingTitle = getArchiveDisplayTitle(decodedLabel);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <SeoHead
        title={`${headingTitle} — ${SITE_NAME}`}
        description={`Browse ${headingTitle} Luganda translated movies and series on ${SITE_NAME}.`}
        canonicalPath={`/search/label/${encodeURIComponent(decodedLabel)}`}
      />

      <nav
        aria-label="Breadcrumb"
        className="mb-3 flex items-center gap-2 text-xs text-[#A4A9B8]"
      >
        <Link to="/" className="hover:text-white">
          Home
        </Link>
        <span aria-hidden="true">/</span>
        <span className="text-[#F9F9F9]">{headingTitle}</span>
      </nav>

      <div className="mb-8 flex flex-col gap-4 border-b border-white/[0.08] pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-extrabold tracking-tight text-[#F9F9F9] sm:text-3xl">
            {headingTitle}
          </h1>
          <p className="mt-1 text-sm text-[#A4A9B8] tabular-nums">
            {filtered.length} title{filtered.length === 1 ? '' : 's'} available
          </p>
        </div>

        <div className="inline-flex items-center gap-1 self-start rounded-xl border border-white/[0.1] bg-[#0E111E] p-1">
          {(
            [
              {id: 'newest', label: 'Newest'},
              {id: 'oldest', label: 'Oldest'},
              {id: 'az', label: 'A–Z'},
            ] as const
          ).map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => {
                setSortBy(opt.id);
                setPage(1);
              }}
              className={`min-h-[38px] whitespace-nowrap rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                sortBy === opt.id
                  ? 'bg-[#0063E5] text-white'
                  : 'text-[#A4A9B8] hover:text-white'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
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
            No titles found in {headingTitle}
          </p>
          <p className="mt-1 text-sm text-[#A4A9B8]">
            Explore the full catalogue on the home page or try searching.
          </p>
          <Link
            to="/"
            className="mt-5 inline-flex min-h-[44px] items-center rounded-lg bg-[#0063E5] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#0483EE]"
          >
            Browse All
          </Link>
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
              aria-label="Archive pagination"
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
