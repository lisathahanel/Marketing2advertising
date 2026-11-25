import React from 'react';
import {Link} from 'react-router-dom';
import {Play} from 'lucide-react';
import type {MovieItem} from '../lib/bloggerParser.ts';
import {PosterImage} from './PosterImage.tsx';

interface MovieCardProps {
  item: MovieItem;
  compact?: boolean;
  progressPct?: number;
  resumeUrl?: string;
}

export const MovieCard: React.FC<MovieCardProps> = ({
  item,
  compact = false,
  progressPct,
  resumeUrl,
}) => {
  const primaryGenre =
    item.genres[0] || (item.contentType === 'series' ? 'Series' : 'Movie');
  const partCountText =
    item.parts.length > 1
      ? item.contentType === 'series'
        ? `${item.parts.length} Eps`
        : `${item.parts.length} Parts`
      : item.contentType === 'series'
        ? 'Series'
        : item.year;

  const hasProgress =
    typeof progressPct === 'number' && Number.isFinite(progressPct) && progressPct > 0;

  return (
    <Link
      to={resumeUrl || item.pathname}
      className="group flex flex-col focus-visible:outline-none"
    >
      <div className="disney-card-frame relative aspect-[2/3] w-full overflow-hidden rounded-xl border border-white/[0.1] bg-[#0E111E] group-hover:scale-[1.03] group-hover:border-white/80 group-focus-visible:ring-2 group-focus-visible:ring-[#0063E5]">
        <PosterImage
          src={item.posterUrl}
          alt={item.displayTitle}
          title={item.displayTitle}
          className="h-full w-full object-cover transition-transform duration-300 ease-out group-hover:scale-[1.03]"
        />
        <div
          className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#040714]/85 via-transparent to-transparent opacity-45 transition-opacity duration-200 group-hover:opacity-85"
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-0 transition-opacity duration-200 group-hover:opacity-100"
          aria-hidden="true"
        >
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[#F9F9F9] text-[#040714] shadow-[0_0_24px_rgba(0,0,0,0.65)] transition-transform duration-150 group-hover:scale-105">
            <Play className="ml-0.5 h-5 w-5 fill-current" />
          </span>
        </div>

        {hasProgress && (
          <div
            className="absolute inset-x-0 bottom-0 h-1 bg-white/25"
            aria-hidden="true"
          >
            <div
              className="h-full bg-[#0483EE]"
              style={{width: `${Math.min(100, Math.max(4, progressPct))}%`}}
            />
          </div>
        )}
      </div>

      <div className={compact ? 'mt-2.5' : 'mt-3'}>
        <h3 className="line-clamp-2 font-display text-[15px] font-semibold leading-snug text-[#F9F9F9] transition-colors group-hover:text-white">
          {item.displayTitle}
        </h3>
        <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-[#A4A9B8] tabular-nums">
          <span className="max-w-[110px] truncate">{item.vjName}</span>
          <span aria-hidden="true">·</span>
          <span className="max-w-[90px] truncate">{primaryGenre}</span>
          <span aria-hidden="true">·</span>
          <span>{partCountText}</span>
        </div>
      </div>
    </Link>
  );
};
