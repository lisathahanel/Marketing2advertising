import { useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Plus, UserPlus, X } from 'lucide-react';
import type { CreatorAudience, CreatorProfile } from '../types';

interface CreatorStripProps {
  creators: CreatorProfile[];
  activeHandle: string | null;
  loadingHandle: string | null;
  audienceFilter: CreatorAudience;
  onChangeAudience: (audience: CreatorAudience) => void;
  onSelectCreator: (handle: string | null) => void;
  onAddCreator: (handle: string) => Promise<void>;
  onRemoveCreator: (handle: string) => void;
}

const AUDIENCE_TABS: { id: CreatorAudience; label: string }[] = [
  { id: 'all', label: 'All Creators' },
  { id: 'kids', label: 'Kids & Family' },
  { id: 'food_travel', label: 'Food & Travel' },
  { id: 'comedy_fun', label: 'Comedy & Fun' },
  { id: 'science_news', label: 'Science & News' },
];

export function CreatorStrip({
  creators,
  activeHandle,
  loadingHandle,
  audienceFilter,
  onChangeAudience,
  onSelectCreator,
  onAddCreator,
  onRemoveCreator,
}: CreatorStripProps) {
  const [showAddInput, setShowAddInput] = useState(false);
  const [newHandle, setNewHandle] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [failedAvatars, setFailedAvatars] = useState<Record<string, boolean>>({});
  const scrollRef = useRef<HTMLDivElement>(null);

  const hasCustomCreators = useMemo(
    () => creators.some((c) => c.isCustom),
    [creators]
  );

  const visibleCreators = useMemo(() => {
    if (audienceFilter === 'all') return creators;
    if (audienceFilter === 'custom') return creators.filter((c) => c.isCustom);
    return creators.filter((c) => c.audience === audienceFilter);
  }, [creators, audienceFilter]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = newHandle.trim().replace(/^@+/, '');
    if (!cleaned || submitting) return;
    setSubmitting(true);
    try {
      await onAddCreator(cleaned);
      setNewHandle('');
      setShowAddInput(false);
    } finally {
      setSubmitting(false);
    }
  };

  const scrollStrip = (dir: -1 | 1) => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * 340, behavior: 'smooth' });
  };

  return (
    <section
      id="m2a-creators-lounge"
      aria-label="Creators and channels"
      className="mb-7 rounded-2xl border border-zinc-800/80 bg-[#121215] p-4 sm:px-5 sm:py-4 scroll-mt-20"
    >
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 mb-3.5">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-baseline gap-2.5">
            <h2 className="font-display text-sm font-semibold text-zinc-100">
              Creator Lounge
            </h2>
            <span className="text-xs text-zinc-400">
              Tap any channel or add @username
            </span>
          </div>

          <div
            role="group"
            aria-label="Filter creators by audience"
            className="flex items-center gap-1 overflow-x-auto no-scrollbar rounded-lg border border-zinc-800 bg-[#09090B] p-0.5"
          >
            {[
              ...AUDIENCE_TABS,
              ...(hasCustomCreators ? [{ id: 'custom' as const, label: 'Saved' }] : []),
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => onChangeAudience(tab.id)}
                className={`rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  audienceFilter === tab.id
                    ? 'bg-zinc-800 text-white'
                    : 'text-zinc-400 hover:text-zinc-100'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <div className="hidden md:flex items-center gap-1">
            <button
              type="button"
              onClick={() => scrollStrip(-1)}
              aria-label="Scroll creators left"
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors cursor-pointer"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => scrollStrip(1)}
              aria-label="Scroll creators right"
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors cursor-pointer"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="flex items-center gap-2">
            {showAddInput ? (
              <div className="flex items-center gap-1.5">
                <input
                  type="text"
                  value={newHandle}
                  onChange={(e) => setNewHandle(e.target.value)}
                  placeholder="@username (e.g. NatGeo)"
                  aria-label="Enter creator username"
                  autoFocus
                  className="h-8 w-44 sm:w-52 rounded-lg border border-zinc-700 bg-[#09090B] px-3 text-xs text-zinc-100 placeholder:text-zinc-500 focus:border-rose-500 focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={submitting || !newHandle.trim()}
                  className="h-8 rounded-lg bg-rose-600 px-3 text-xs font-semibold text-white hover:bg-rose-500 disabled:opacity-50 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  {submitting ? 'Loading...' : 'Show'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddInput(false);
                    setNewHandle('');
                  }}
                  aria-label="Cancel add creator"
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-800 text-zinc-400 hover:text-zinc-100 cursor-pointer"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowAddInput(true)}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-zinc-700/80 bg-zinc-900 px-3 text-xs font-medium text-zinc-200 hover:border-zinc-600 hover:bg-zinc-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <UserPlus className="h-3.5 w-3.5 text-rose-400" />
                <span>Add @username</span>
              </button>
            )}
          </form>
        </div>
      </div>

      {/* Horizontal story ring strip */}
      <div
        ref={scrollRef}
        className="flex items-center gap-4 overflow-x-auto no-scrollbar pb-1 scroll-smooth"
      >
        <button
          type="button"
          onClick={() => onSelectCreator(null)}
          className="group flex flex-col items-center gap-1.5 shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-rose-500 rounded-xl"
        >
          <div
            className={`flex h-14 w-14 items-center justify-center rounded-full border-2 transition-colors ${
              activeHandle === null
                ? 'border-rose-500 bg-rose-600/15 text-white'
                : 'border-zinc-800 bg-zinc-900 text-zinc-400 group-hover:border-zinc-600 group-hover:text-zinc-100'
            }`}
          >
            <span className="font-display text-xs font-bold">All</span>
          </div>
          <span
            className={`max-w-[74px] truncate text-[11px] font-medium ${
              activeHandle === null ? 'text-zinc-100' : 'text-zinc-400'
            }`}
          >
            All Feed
          </span>
        </button>

        {visibleCreators.map((creator) => {
          const isSelected =
            activeHandle?.toLowerCase() === creator.handle.toLowerCase();
          const isLoading =
            loadingHandle?.toLowerCase() === creator.handle.toLowerCase();
          const initials = creator.displayName
            .replace(/^@/, '')
            .slice(0, 2)
            .toUpperCase();
          const showImg = creator.avatar && !failedAvatars[creator.handle];

          return (
            <div
              key={creator.handle}
              className="relative group flex flex-col items-center gap-1.5 shrink-0"
            >
              <button
                type="button"
                onClick={() =>
                  onSelectCreator(isSelected ? null : creator.handle)
                }
                title={`${creator.displayName} (@${creator.handle})`}
                className="flex flex-col items-center gap-1.5 cursor-pointer focus-visible:outline-2 focus-visible:outline-rose-500 rounded-xl"
              >
                <div
                  className={`rounded-full p-[2px] transition-transform duration-150 group-hover:scale-[1.04] ${
                    isSelected
                      ? 'bg-gradient-to-tr from-rose-600 via-rose-500 to-amber-400'
                      : 'bg-gradient-to-tr from-zinc-700 via-zinc-600 to-zinc-700 group-hover:from-rose-600/80 group-hover:to-amber-400/80'
                  }`}
                >
                  <div className="flex h-[52px] w-[52px] items-center justify-center overflow-hidden rounded-full border-2 border-[#121215] bg-zinc-900">
                    {isLoading ? (
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-zinc-500 border-t-rose-500" />
                    ) : showImg ? (
                      <img
                        src={creator.avatar}
                        alt={creator.displayName}
                        referrerPolicy="no-referrer"
                        onError={() =>
                          setFailedAvatars((prev) => ({
                            ...prev,
                            [creator.handle]: true,
                          }))
                        }
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span className="font-display text-xs font-bold text-zinc-200">
                        {initials}
                      </span>
                    )}
                  </div>
                </div>
                <span
                  className={`max-w-[78px] truncate text-[11px] font-medium ${
                    isSelected ? 'text-white' : 'text-zinc-400 group-hover:text-zinc-200'
                  }`}
                >
                  @{creator.handle}
                </span>
              </button>

              {creator.isCustom && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemoveCreator(creator.handle);
                  }}
                  aria-label={`Remove @${creator.handle}`}
                  className="absolute -top-1 -right-1 hidden group-hover:flex h-5 w-5 items-center justify-center rounded-full border border-zinc-700 bg-zinc-900 text-zinc-300 hover:bg-rose-600 hover:text-white cursor-pointer"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
          );
        })}

        <button
          type="button"
          onClick={() => setShowAddInput(true)}
          className="group flex flex-col items-center gap-1.5 shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-rose-500 rounded-xl"
        >
          <div className="flex h-14 w-14 items-center justify-center rounded-full border border-dashed border-zinc-700 bg-zinc-900/60 text-zinc-400 group-hover:border-rose-500 group-hover:text-rose-400 transition-colors">
            <Plus className="h-5 w-5" />
          </div>
          <span className="text-[11px] font-medium text-zinc-400 group-hover:text-zinc-200">
            Add User
          </span>
        </button>
      </div>
    </section>
  );
}
