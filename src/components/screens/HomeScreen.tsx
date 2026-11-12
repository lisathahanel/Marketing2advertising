import React, { useEffect, useMemo, useState } from 'react';
import {
  Tv, Film, Grid, Gamepad2, Briefcase, Play, RotateCw, ExternalLink,
  ChevronRight, Sparkles, Calendar, ArrowUpRight, Newspaper, Search,
  Radio, Clapperboard, WandSparkles
} from 'lucide-react';
import { BlogPost, Channel, MovieItem, TabType } from '../../types';
import { fetchBloggerPosts } from '../../services/blogger';
import { AdMobBanner } from '../AdMobBanner';
import { AdSenseAd } from '../AdSenseAd';
import { PWAInstallButton } from '../PWAInstallButton';

interface HomeScreenProps {
  onSelectTab: (tab: TabType) => void;
  onSelectChannel: (channel: Channel) => void;
  onSelectPost: (post: BlogPost) => void;
  onSelectMovie?: (movie: MovieItem) => void;
  channels: Channel[];
}

const categories = [
  { id: 'tv' as TabType, label: 'Live TV', detail: 'Watch now', icon: Tv, tone: 'from-rose-500/20 to-orange-500/5', accent: 'text-rose-300', glow: 'group-hover:border-rose-400/40' },
  { id: 'firimu' as TabType, label: 'Firimu', detail: 'Movies & series', icon: Film, tone: 'from-amber-400/20 to-yellow-500/5', accent: 'text-amber-300', glow: 'group-hover:border-amber-300/40' },
  { id: 'blogs' as TabType, label: 'Stories', detail: 'Ideas & updates', icon: Newspaper, tone: 'from-sky-400/20 to-blue-500/5', accent: 'text-sky-300', glow: 'group-hover:border-sky-300/40' },
  { id: 'apps' as TabType, label: 'AI & Apps', detail: 'Useful tools', icon: Grid, tone: 'from-emerald-400/20 to-teal-500/5', accent: 'text-emerald-300', glow: 'group-hover:border-emerald-300/40' },
  { id: 'games' as TabType, label: 'Games', detail: 'Play & relax', icon: Gamepad2, tone: 'from-violet-400/20 to-purple-500/5', accent: 'text-violet-300', glow: 'group-hover:border-violet-300/40' },
  { id: 'jobs' as TabType, label: 'Careers', detail: 'Find opportunities', icon: Briefcase, tone: 'from-cyan-400/20 to-blue-500/5', accent: 'text-cyan-300', glow: 'group-hover:border-cyan-300/40' },
];

export const HomeScreen: React.FC<HomeScreenProps> = ({
  onSelectTab, onSelectChannel, onSelectPost, onSelectMovie, channels,
}) => {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [nakaMovies, setNakaMovies] = useState<MovieItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadFeed = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const [blogData, movieRes] = await Promise.all([
        fetchBloggerPosts({ site: 'main', maxResults: 8 }),
        fetch('/api/naka/movies?maxResults=8').then((r) => r.json()).catch(() => ({ movies: [] })),
      ]);
      setPosts(blogData.posts || []);
      setNakaMovies(movieRes.movies || []);
    } catch (err) {
      console.warn('Failed to load home feed:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { loadFeed(); }, []);

  const featuredMovie = nakaMovies[0];
  const featuredPost = posts[0];
  const featuredImage = featuredMovie?.poster || featuredPost?.thumbnail || '';
  const featuredTitle = featuredMovie?.cleanTitle || featuredPost?.title || 'Discover more with M2A';
  const featuredDescription = featuredMovie?.summary || featuredPost?.summary || 'Your destination for entertainment, useful digital tools, stories and opportunities.';
  const featuredDate = featuredMovie?.published || featuredPost?.published;
  const featuredChannels = channels.slice(0, 6);
  const sidePosts = useMemo(() => posts.slice(featuredMovie ? 0 : 1, featuredMovie ? 3 : 4), [posts, featuredMovie]);

  const openFeatured = () => {
    if (featuredMovie && onSelectMovie) onSelectMovie(featuredMovie);
    else if (featuredPost) onSelectPost(featuredPost);
    else onSelectTab('blogs');
  };

  return (
    <div className="m2a-home mx-auto w-full max-w-[1440px] px-3 pb-36 pt-3 sm:px-6 sm:pt-5 lg:px-10 lg:pb-40 space-y-8 sm:space-y-11 animate-in fade-in duration-300">
      {/* Editorial hero: cinematic feature with a desktop reading rail */}
      <section className="grid grid-cols-1 xl:grid-cols-[minmax(0,1.8fr)_minmax(300px,.82fr)] gap-4 lg:gap-5">
        <div className="m2a-feature group relative min-h-[390px] sm:min-h-[470px] overflow-hidden rounded-[1.8rem] border border-white/10 bg-[#15171c] shadow-[0_28px_90px_rgba(0,0,0,.42)]">
          {featuredImage ? (
            <img src={featuredImage} alt={featuredTitle} className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-[1.035]" />
          ) : (
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_75%_25%,rgba(16,185,129,.22),transparent_28%),radial-gradient(circle_at_25%_80%,rgba(245,158,11,.2),transparent_35%),linear-gradient(135deg,#22252c,#0c1014)]" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-[#080a0e] via-[#080a0e]/65 to-[#080a0e]/5" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#080a0e]/70 via-transparent to-transparent" />
          <div className="absolute left-5 top-5 sm:left-7 sm:top-7 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-300/30 bg-black/45 px-3 py-1.5 text-[10px] font-black uppercase tracking-[.18em] text-amber-200 backdrop-blur-md">
              <Sparkles className="h-3 w-3" /> M2A Spotlight
            </span>
            {featuredMovie && <span className="rounded-full border border-white/15 bg-black/40 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-white/90 backdrop-blur-md">Featured film</span>}
          </div>
          <div className="absolute bottom-0 left-0 right-0 p-5 sm:p-8 lg:p-10">
            <div className="mb-3 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.18em] text-emerald-300">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,.9)]" />
              Entertainment · Technology · Ideas
            </div>
            <h1 className="max-w-3xl text-3xl font-black leading-[1.04] tracking-tight text-white drop-shadow sm:text-4xl lg:text-5xl xl:text-[3.6rem]">
              {featuredTitle}
            </h1>
            <p className="mt-3 max-w-2xl line-clamp-2 text-sm leading-relaxed text-slate-200/90 sm:text-base">
              {featuredDescription}
            </p>
            <div className="mt-5 flex flex-wrap items-center gap-3">
              <button onClick={openFeatured} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-gradient-to-r from-amber-400 to-yellow-300 px-5 py-3 text-xs font-black text-[#17130a] shadow-[0_8px_28px_rgba(245,158,11,.22)] transition hover:-translate-y-0.5 hover:shadow-[0_12px_34px_rgba(245,158,11,.3)] active:scale-95">
                <Play className="h-4 w-4 fill-current" /> {featuredMovie ? 'Watch featured film' : 'Read featured story'}
              </button>
              <button onClick={() => onSelectTab(featuredMovie ? 'firimu' : 'blogs')} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-xs font-bold text-white backdrop-blur-md transition hover:bg-white/15">
                Explore M2A <ArrowUpRight className="h-4 w-4" />
              </button>
              {featuredDate && <span className="text-[11px] text-white/65">{new Date(featuredDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>}
            </div>
          </div>
          <div className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full border border-amber-300/10" />
          <div className="pointer-events-none absolute -right-5 -top-9 h-44 w-44 rounded-full border border-emerald-300/10" />
        </div>

        <aside className="flex min-h-[390px] flex-col rounded-[1.8rem] border border-white/[.08] bg-[#12161b] p-4 shadow-[0_20px_60px_rgba(0,0,0,.22)] sm:p-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[.2em] text-amber-300">The latest</p>
              <h2 className="mt-1 text-lg font-black text-white">Fresh from M2A</h2>
            </div>
            <button onClick={() => loadFeed(true)} aria-label="Refresh latest posts" className="rounded-xl border border-white/10 bg-white/5 p-2 text-slate-400 transition hover:text-amber-300">
              <RotateCw className={`h-4 w-4 ${refreshing ? 'animate-spin text-amber-300' : ''}`} />
            </button>
          </div>
          <div className="flex-1 space-y-3">
            {loading && [1, 2, 3].map((item) => <div key={item} className="flex gap-3 rounded-xl border border-white/5 p-2 animate-pulse"><div className="h-[76px] w-[88px] shrink-0 rounded-lg bg-white/10" /><div className="flex-1 space-y-2 py-2"><div className="h-3 w-4/5 rounded bg-white/10" /><div className="h-2 w-2/3 rounded bg-white/5" /><div className="h-2 w-1/3 rounded bg-white/5" /></div></div>)}
            {!loading && sidePosts.map((post) => (
              <button key={post.id} onClick={() => onSelectPost(post)} className="group flex w-full gap-3 rounded-xl border border-white/[.06] bg-white/[.025] p-2 text-left transition hover:border-amber-300/30 hover:bg-white/[.055]">
                <img src={post.thumbnail} alt="" loading="lazy" className="h-[76px] w-[88px] shrink-0 rounded-lg bg-black object-cover" onError={(e) => { (e.target as HTMLImageElement).style.visibility = 'hidden'; }} />
                <span className="flex min-w-0 flex-1 flex-col justify-center">
                  <span className="line-clamp-2 text-xs font-bold leading-snug text-slate-100 transition group-hover:text-amber-200">{post.title}</span>
                  <span className="mt-2 text-[10px] text-slate-500">{new Date(post.published).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                </span>
                <ChevronRight className="mt-auto mb-1 h-4 w-4 shrink-0 text-slate-600 group-hover:text-amber-300" />
              </button>
            ))}
            {!loading && sidePosts.length === 0 && <p className="rounded-xl border border-white/5 p-4 text-xs leading-relaxed text-slate-400">New stories and updates will appear here as the M2A feed syncs.</p>}
          </div>
          <button onClick={() => onSelectTab('blogs')} className="mt-4 flex w-full items-center justify-between rounded-xl border border-amber-300/20 bg-amber-300/[.06] px-4 py-3 text-xs font-bold text-amber-200 transition hover:bg-amber-300/10">
            Browse all stories <ArrowUpRight className="h-4 w-4" />
          </button>
        </aside>
      </section>

      {/* Clear category navigation with a unified premium card system */}
      <section>
        <div className="mb-4 flex items-end justify-between gap-3">
          <div><p className="text-[10px] font-black uppercase tracking-[.2em] text-emerald-300">Explore the hub</p><h2 className="mt-1 text-xl font-black tracking-tight text-white sm:text-2xl">Everything in one place</h2></div>
          <span className="hidden text-xs text-slate-500 sm:block">Choose your next destination</span>
        </div>
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3 xl:grid-cols-6">
          {categories.map(({ id, label, detail, icon: Icon, tone, accent, glow }) => (
            <button key={id} onClick={() => onSelectTab(id)} className={`group relative flex min-h-[100px] items-center gap-3 overflow-hidden rounded-2xl border border-white/[.08] bg-gradient-to-br ${tone} p-3.5 text-left transition duration-200 hover:-translate-y-1 hover:bg-white/[.06] ${glow} sm:min-h-[116px] sm:flex-col sm:items-start sm:justify-between sm:p-4`}>
              <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-black/20 ${accent} transition group-hover:scale-110`}><Icon className="h-5 w-5" /></span>
              <span className="min-w-0"><span className="block text-sm font-black text-white">{label}</span><span className="mt-0.5 block text-[10px] text-slate-400">{detail}</span></span>
              <ArrowUpRight className="absolute right-3 top-3 h-4 w-4 text-white/25 transition group-hover:text-white/80" />
            </button>
          ))}
        </div>
      </section>

      {/* Install prompt, visually secondary to the content */}
      <section className="flex flex-col gap-3 rounded-2xl border border-emerald-300/15 bg-[linear-gradient(100deg,rgba(16,185,129,.09),rgba(245,158,11,.055),rgba(255,255,255,.015))] p-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-emerald-300/20 bg-emerald-300/10 text-emerald-300"><WandSparkles className="h-5 w-5" /></div>
          <div><h3 className="text-sm font-black text-white">Take M2A with you</h3><p className="mt-0.5 text-[11px] text-slate-400">Install the app for a quicker, full-screen experience.</p></div>
        </div>
        <PWAInstallButton compact />
      </section>

      {/* Existing responsive AdSense placement retained */}
      <AdSenseAd />

      {/* Live TV preview */}
      <section>
        <div className="mb-4 flex items-end justify-between">
          <div><p className="text-[10px] font-black uppercase tracking-[.2em] text-rose-300">On air now</p><h2 className="mt-1 flex items-center gap-2 text-xl font-black text-white sm:text-2xl"><Radio className="h-5 w-5 text-rose-400" /> Live channels</h2></div>
          <button onClick={() => onSelectTab('tv')} className="flex items-center gap-1 text-xs font-bold text-amber-300 hover:text-amber-200">All channels <ChevronRight className="h-4 w-4" /></button>
        </div>
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-6">
          {featuredChannels.map((channel) => (
            <button key={channel.id} onClick={() => { onSelectTab('tv'); onSelectChannel(channel); }} className="group relative flex min-h-[116px] flex-col justify-between overflow-hidden rounded-2xl border border-white/[.08] bg-[#14191f] p-3 text-left transition hover:-translate-y-0.5 hover:border-rose-300/35 hover:bg-[#191e25]">
              <div className="flex items-center justify-between gap-2"><span className="flex h-9 w-9 items-center justify-center rounded-xl text-xs font-black text-white shadow" style={{ backgroundColor: `#${channel.color}` }}>{channel.logo ? <img src={channel.logo} alt="" className="h-full w-full rounded-xl object-contain" /> : channel.name.slice(0, 2).toUpperCase()}</span><span className="flex items-center gap-1 rounded-full bg-rose-500/15 px-2 py-1 text-[8px] font-black tracking-wider text-rose-300"><span className="h-1.5 w-1.5 rounded-full bg-rose-400 animate-pulse" /> LIVE</span></div>
              <span><span className="block truncate text-xs font-bold text-white group-hover:text-amber-200">{channel.name}</span><span className="mt-0.5 block truncate text-[10px] text-slate-500">{channel.category}</span></span>
            </button>
          ))}
        </div>
      </section>

      {/* Cinematic Firimu collection */}
      {nakaMovies.length > 0 && (
        <section>
          <div className="mb-4 flex items-end justify-between">
            <div><p className="text-[10px] font-black uppercase tracking-[.2em] text-amber-300">Now showing</p><h2 className="mt-1 flex items-center gap-2 text-xl font-black text-white sm:text-2xl"><Clapperboard className="h-5 w-5 text-amber-300" /> Trending Firimu</h2></div>
            <button onClick={() => onSelectTab('firimu')} className="flex items-center gap-1 text-xs font-bold text-amber-300 hover:text-amber-200">Explore films <ChevronRight className="h-4 w-4" /></button>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
            {nakaMovies.slice(0, 6).map((movie) => (
              <button key={movie.id} onClick={() => onSelectMovie ? onSelectMovie(movie) : onSelectTab('firimu')} className="group min-w-0 overflow-hidden rounded-2xl border border-white/[.08] bg-[#14171c] text-left transition hover:-translate-y-1 hover:border-amber-300/35">
                <div className="relative aspect-[2/3] overflow-hidden bg-black"><img src={movie.poster} alt={movie.title} loading="lazy" className="h-full w-full object-cover transition duration-500 group-hover:scale-105" /><div className="absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-black/15" /><span className="absolute left-2 top-2 rounded-md bg-amber-300 px-2 py-1 text-[8px] font-black uppercase text-black">{movie.vj || 'M2A'}</span><span className="absolute bottom-2 right-2 flex h-8 w-8 items-center justify-center rounded-full bg-amber-300 text-black shadow-lg"><Play className="ml-0.5 h-3.5 w-3.5 fill-current" /></span></div>
                <div className="p-2.5"><span className="line-clamp-1 block text-[11px] font-bold text-white group-hover:text-amber-200">{movie.cleanTitle || movie.title}</span><span className="mt-1 block truncate text-[9px] text-slate-500">{movie.vj}</span></div>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Editorial article cards */}
      <section>
        <div className="mb-4 flex items-end justify-between gap-3">
          <div><p className="text-[10px] font-black uppercase tracking-[.2em] text-sky-300">Ideas worth your time</p><h2 className="mt-1 text-xl font-black text-white sm:text-2xl">Latest from M2A Blogs</h2></div>
          <div className="flex items-center gap-2">
            <button onClick={() => loadFeed(true)} aria-label="Refresh blog feed" className="rounded-lg border border-white/10 bg-white/5 p-2 text-slate-400 transition hover:text-amber-300"><RotateCw className={`h-4 w-4 ${refreshing ? 'animate-spin text-amber-300' : ''}`} /></button>
            <button onClick={() => onSelectTab('blogs')} className="flex items-center gap-1 text-xs font-bold text-amber-300 hover:text-amber-200">All stories <ChevronRight className="h-4 w-4" /></button>
          </div>
        </div>
        {loading && <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">{[1, 2, 3].map((item) => <div key={item} className="h-64 animate-pulse rounded-2xl border border-white/5 bg-white/[.035]" />)}</div>}
        {!loading && posts.length > 0 && (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {posts.slice(0, 6).map((post, index) => (
              <React.Fragment key={post.id}>
                {index === 3 && <div className="sm:col-span-2 lg:col-span-3"><AdMobBanner format="native" /></div>}
                {index === 5 && <div className="sm:col-span-2 lg:col-span-3"><AdSenseAd /></div>}
                <button onClick={() => onSelectPost(post)} className="group flex min-h-[116px] gap-3 overflow-hidden rounded-2xl border border-white/[.08] bg-[#14171c] p-2.5 text-left transition hover:-translate-y-0.5 hover:border-amber-300/30 hover:bg-[#191d23]">
                  <div className="relative h-[112px] w-[112px] shrink-0 overflow-hidden rounded-xl bg-black sm:h-[124px] sm:w-[124px]"><img src={post.thumbnail} alt={post.title} loading="lazy" className="h-full w-full object-cover transition duration-500 group-hover:scale-105" onError={(e) => { (e.target as HTMLImageElement).style.opacity = '0'; }} />{post.categories?.[0] && <span className="absolute bottom-1.5 left-1.5 max-w-[90%] truncate rounded bg-black/75 px-2 py-1 text-[8px] font-black uppercase text-amber-200">{post.categories[0]}</span>}</div>
                  <span className="flex min-w-0 flex-1 flex-col py-1"><span className="line-clamp-3 text-xs font-bold leading-snug text-white transition group-hover:text-amber-200 sm:text-sm">{post.title}</span>{post.summary && <span className="mt-1.5 line-clamp-2 text-[10px] leading-relaxed text-slate-400">{post.summary}</span>}<span className="mt-auto flex items-center gap-1 pt-2 text-[9px] text-slate-500"><Calendar className="h-3 w-3" />{new Date(post.published).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}<ArrowUpRight className="ml-auto h-3.5 w-3.5 text-amber-300 opacity-0 transition group-hover:opacity-100" /></span></span>
                </button>
              </React.Fragment>
            ))}
          </div>
        )}
        {!loading && posts.length === 0 && <div className="rounded-2xl border border-white/[.08] bg-[#14171c] p-8 text-center"><Search className="mx-auto h-6 w-6 text-slate-500" /><p className="mt-2 text-xs text-slate-400">Unable to load the blog feed right now.</p><button onClick={() => loadFeed(true)} className="mt-3 rounded-xl bg-amber-300 px-4 py-2 text-xs font-black text-black">Retry sync</button></div>}
      </section>

      <footer className="flex flex-col items-center justify-between gap-3 rounded-2xl border border-white/[.07] bg-[#11151a] px-5 py-4 text-center sm:flex-row sm:text-left">
        <div><p className="text-xs font-black tracking-wide text-white">M2A <span className="text-amber-300">·</span> Marketing2Advertising</p><p className="mt-1 text-[10px] text-slate-500">Entertainment, technology, stories and digital opportunities.</p></div>
        <a href="https://www.marketing2advertising.com" className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3.5 py-2 text-[10px] font-bold text-slate-300 transition hover:border-amber-300/30 hover:text-amber-200">Visit main website <ExternalLink className="h-3.5 w-3.5" /></a>
      </footer>
    </div>
  );
};
