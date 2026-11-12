import React, { useEffect, useMemo, useState } from 'react';
import {
  Tv, Film, Grid, Gamepad2, Play, RotateCw, ExternalLink, ChevronRight,
  Sparkles, Calendar, ArrowUpRight, Newspaper, Radio, Clapperboard,
  Info, Quote, GraduationCap, Search, Zap, CirclePlay
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

const quickLinks = [
  { label: 'Movies', sub: 'Explore the library', tab: 'catalogue' as TabType, Icon: Film, color: 'text-rose-300', glow: 'from-rose-500/20', border: 'hover:border-rose-400/50', orb: 'bg-rose-400/15' },
  { label: 'TV', sub: 'Live channels', tab: 'tv' as TabType, Icon: Tv, color: 'text-lime-300', glow: 'from-lime-400/20', border: 'hover:border-lime-300/50', orb: 'bg-lime-400/15' },
  { label: 'Games', sub: 'Play something', tab: 'games' as TabType, Icon: Gamepad2, color: 'text-sky-300', glow: 'from-sky-400/20', border: 'hover:border-sky-300/50', orb: 'bg-sky-400/15' },
  { label: 'Information', sub: 'Guides & updates', tab: 'blogs' as TabType, Icon: Info, color: 'text-violet-300', glow: 'from-violet-500/20', border: 'hover:border-violet-300/50', orb: 'bg-violet-400/15' },
  { label: 'AI Tools', sub: 'Create more', tab: 'apps' as TabType, Icon: Zap, color: 'text-orange-300', glow: 'from-orange-400/20', border: 'hover:border-orange-300/50', orb: 'bg-orange-400/15' },
  { label: 'Quotes', sub: 'Words to keep', tab: 'blogs' as TabType, Icon: Quote, color: 'text-teal-300', glow: 'from-teal-400/20', border: 'hover:border-teal-300/50', orb: 'bg-teal-400/15' },
  { label: 'Firimu', sub: 'Movies from Naka', tab: 'firimu' as TabType, Icon: Clapperboard, color: 'text-pink-300', glow: 'from-pink-500/20', border: 'hover:border-pink-300/50', orb: 'bg-pink-400/15' },
  { label: 'Courses', sub: 'Learn & grow', tab: 'apps' as TabType, Icon: GraduationCap, color: 'text-emerald-300', glow: 'from-emerald-400/20', border: 'hover:border-emerald-300/50', orb: 'bg-emerald-400/15' },
];

export const HomeScreen: React.FC<HomeScreenProps> = ({
  onSelectTab, onSelectChannel, onSelectPost, onSelectMovie, channels,
}) => {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [nakaMovies, setNakaMovies] = useState<MovieItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeSlide, setActiveSlide] = useState(0);

  const loadFeed = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    // GitHub Pages is a static host, so use Blogger JSONP directly rather than
    // calling the Express-only /api/naka/movies route.
    const blogRequest = fetchBloggerPosts({ site: 'main', maxResults: 10 })
      .then((blogData) => setPosts(blogData.posts || []))
      .catch((err) => console.warn('M2A blog feed unavailable:', err))
      .finally(() => setLoading(false));

    const movieRequest = fetchBloggerPosts({ site: 'naka', maxResults: 12 })
      .then(({ posts: moviePosts }) => {
        const movies: MovieItem[] = moviePosts.map((post) => {
          const vjMatch = post.title.match(/(VJ\\s+[A-Za-z0-9\\s]+?)(?:\\s*[-–—:]|\\s+in|\\s+kali|\\s+new|\\s*$)/i)
            || post.content.match(/(VJ\\s+[A-Za-z0-9\\s]{3,20})/i);
          const vj = vjMatch?.[1]?.trim() || 'VJ Junior';
          const videoMatch = post.content.match(/\\[\\/ddr45\\/\\](.*?)\\[\\/ddr45\\/\\]/i)
            || post.content.match(/https?:\\/\\/[^\\s"'<>]+\\.(?:mp4|m3u8)(?:\\?[^\\s"'<>]*)?/i);
          return {
            id: post.id,
            title: post.title,
            cleanTitle: post.title.replace(/^VJ\\s+[^–—:-]+[–—:-]\\s*/i, '').trim(),
            vj,
            videoUrl: videoMatch?.[1]?.trim() || videoMatch?.[0]?.trim() || '',
            poster: post.thumbnail,
            summary: post.summary,
            content: post.content,
            categories: post.categories,
            published: post.published,
            url: post.url,
          };
        });
        setNakaMovies(movies);
      })
      .catch((err) => console.warn('M2A Firimu feed unavailable:', err));

    await Promise.allSettled([blogRequest, movieRequest]);
    setRefreshing(false);
  };

  useEffect(() => { loadFeed(); }, []);

  const slides = useMemo(() => [
    ...nakaMovies.slice(0, 5).map((movie) => ({
      key: `movie-${movie.id}`, title: movie.cleanTitle || movie.title,
      description: movie.summary || 'Discover this title in the M2A Firimu collection.',
      image: movie.poster, kind: 'Firimu', movie,
    })),
    ...posts.slice(0, 5).map((post) => ({
      key: `post-${post.id}`, title: post.title,
      description: post.summary || 'Explore the latest ideas, guides and updates from Marketing2Advertising.',
      image: post.thumbnail, kind: post.categories?.[0] || 'M2A Story', post,
    })),
  ], [nakaMovies, posts]);

  useEffect(() => {
    if (slides.length < 2) return;
    const timer = window.setInterval(() => setActiveSlide((index) => (index + 1) % slides.length), 6500);
    return () => window.clearInterval(timer);
  }, [slides.length]);

  useEffect(() => { if (activeSlide >= slides.length) setActiveSlide(0); }, [activeSlide, slides.length]);

  const active = slides[activeSlide];
  const featuredChannels = channels.slice(0, 6);
  const latestPosts = posts.slice(0, 5);

  const openSlide = () => {
    if (!active) return onSelectTab('firimu');
    if ('movie' in active && active.movie) {
      if (onSelectMovie) onSelectMovie(active.movie);
      else onSelectTab('firimu');
    } else if ('post' in active && active.post) onSelectPost(active.post);
  };

  return (
    <div className="m2a-home mx-auto w-full max-w-[1500px] space-y-9 px-3 pb-40 pt-3 sm:space-y-12 sm:px-6 sm:pt-5 lg:px-10">
      {/* Premium cinematic hero */}
      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.8fr)_minmax(310px,.72fr)]">
        <div className="group relative isolate min-h-[440px] overflow-hidden rounded-[24px] border border-white/10 bg-[#090e18] shadow-[0_24px_90px_rgba(0,0,0,.55)] sm:min-h-[520px]">
          {active?.image ? <img key={active.key} src={active.image} alt={active.title} loading="eager" fetchPriority="high" decoding="async" className="absolute inset-0 -z-20 h-full w-full object-cover transition duration-1000 group-hover:scale-[1.025]" /> : <div className="absolute inset-0 -z-20 bg-[radial-gradient(ellipse_at_70%_25%,rgba(124,255,0,.18),transparent_30%),linear-gradient(135deg,#101b2e,#05070d_70%)]" />}
          <div className="absolute inset-0 -z-10 bg-gradient-to-t from-[#05070d] via-[#05070d]/65 to-[#05070d]/10" />
          <div className="absolute inset-0 -z-10 bg-gradient-to-r from-[#05070d]/75 via-transparent to-transparent" />
          <div className="pointer-events-none absolute -right-24 -top-24 -z-10 h-80 w-80 rounded-full border border-lime-300/15 shadow-[0_0_80px_rgba(124,255,0,.08)]" />
          <div className="absolute left-5 right-5 top-5 flex flex-wrap items-center justify-between gap-3 sm:left-8 sm:right-8 sm:top-8">
            <span className="inline-flex items-center gap-2 rounded-full border border-lime-300/30 bg-black/40 px-3 py-1.5 text-[10px] font-black uppercase tracking-[.2em] text-lime-300 backdrop-blur-xl"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#7CFF00] shadow-[0_0_12px_#7CFF00]" /> M2A Spotlight</span>
            <span className="rounded-full border border-white/15 bg-black/35 px-3 py-1.5 text-[9px] font-bold uppercase tracking-widest text-white/80 backdrop-blur-xl">{active?.kind || 'Discover M2A'}</span>
          </div>
          <div className="absolute bottom-0 left-0 right-0 p-5 sm:p-8 lg:p-10">
            <p className="mb-3 flex items-center gap-2 text-[10px] font-black uppercase tracking-[.22em] text-lime-300"><Sparkles className="h-3.5 w-3.5" /> Entertainment · Technology · Discovery</p>
            <h1 className="max-w-3xl text-3xl font-black leading-[1.04] tracking-tight text-white drop-shadow-[0_3px_20px_rgba(0,0,0,.8)] sm:text-5xl lg:text-6xl">{active?.title || 'Your world. Your entertainment.'}</h1>
            <p className="mt-3 max-w-2xl line-clamp-2 text-sm leading-relaxed text-slate-200/90 sm:text-base">{active?.description || 'Stream, discover, play and explore the M2A digital universe.'}</p>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <button onClick={openSlide} className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-[#7CFF00] px-6 py-3 text-xs font-black uppercase tracking-wide text-[#071000] shadow-[0_0_28px_rgba(124,255,0,.28)] transition hover:-translate-y-0.5 hover:shadow-[0_0_38px_rgba(124,255,0,.45)] active:scale-95"><Play className="h-4 w-4 fill-current" /> {active && 'movie' in active ? 'Watch now' : 'Explore now'}</button>
              <button onClick={() => onSelectTab('catalogue')} className="inline-flex min-h-12 items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-5 py-3 text-xs font-bold text-white backdrop-blur-xl transition hover:border-lime-300/40 hover:bg-white/15">Browse library <ArrowUpRight className="h-4 w-4" /></button>
            </div>
            <div className="mt-7 flex items-center gap-2" aria-label="Featured carousel navigation">
              {slides.slice(0, 8).map((slide, index) => <button key={slide.key} onClick={() => setActiveSlide(index)} aria-label={`Show featured item ${index + 1}`} aria-current={activeSlide === index ? 'true' : undefined} className={`h-1.5 rounded-full transition-all duration-300 ${activeSlide === index ? 'w-9 bg-[#7CFF00] shadow-[0_0_12px_rgba(124,255,0,.7)]' : 'w-2 bg-white/40 hover:bg-white/75'}`} />)}
              <span className="ml-2 text-[9px] font-bold tracking-widest text-white/50">{slides.length ? String(activeSlide + 1).padStart(2, '0') : '01'} / {String(Math.min(slides.length, 8)).padStart(2, '0')}</span>
            </div>
          </div>
        </div>

        {/* Latest stories glass panel */}
        <aside className="flex min-h-[420px] flex-col overflow-hidden rounded-[24px] border border-sky-300/15 bg-[linear-gradient(145deg,rgba(20,34,55,.82),rgba(8,12,21,.92))] p-4 shadow-[0_18px_60px_rgba(0,0,0,.35)] backdrop-blur-2xl sm:p-5">
          <div className="mb-4 flex items-center justify-between">
            <div><p className="text-[9px] font-black uppercase tracking-[.22em] text-sky-300">M2A Updates</p><h2 className="mt-1 text-lg font-black text-white">Latest from M2A</h2></div>
            <button onClick={() => loadFeed(true)} aria-label="Refresh latest articles" className="rounded-xl border border-white/10 bg-white/5 p-2 text-slate-300 transition hover:border-lime-300/30 hover:text-lime-300"><RotateCw className={`h-4 w-4 ${refreshing ? 'animate-spin text-lime-300' : ''}`} /></button>
          </div>
          <div className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
            {loading && [1, 2, 3, 4].map((item) => <div key={item} className="flex animate-pulse gap-3 rounded-xl border border-white/5 p-2"><div className="h-[66px] w-[78px] rounded-lg bg-white/10" /><div className="flex-1 space-y-2 py-2"><div className="h-3 w-4/5 rounded bg-white/10" /><div className="h-2 w-2/5 rounded bg-white/5" /></div></div>)}
            {!loading && latestPosts.map((post) => <button key={post.id} onClick={() => onSelectPost(post)} className="group flex w-full gap-3 rounded-xl border border-white/[.06] bg-white/[.025] p-2 text-left transition duration-200 hover:translate-x-1 hover:border-sky-300/30 hover:bg-sky-300/[.06]"><img src={post.thumbnail} alt="" loading="lazy" className="h-[66px] w-[78px] shrink-0 rounded-lg bg-black object-cover" onError={(e) => { (e.target as HTMLImageElement).style.opacity = '0'; }} /><span className="flex min-w-0 flex-1 flex-col justify-center"><span className="line-clamp-2 text-[11px] font-bold leading-snug text-slate-100 group-hover:text-lime-200">{post.title}</span><span className="mt-2 flex items-center gap-1 text-[9px] text-slate-500"><Calendar className="h-3 w-3" />{new Date(post.published).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span></span><ChevronRight className="my-auto h-4 w-4 text-slate-600 group-hover:text-sky-300" /></button>)}
            {!loading && latestPosts.length === 0 && <p className="rounded-xl border border-white/5 p-4 text-xs text-slate-400">New articles will appear here when the M2A feed syncs.</p>}
          </div>
          <button onClick={() => onSelectTab('blogs')} className="mt-3 flex w-full items-center justify-between rounded-xl border border-sky-300/20 bg-sky-300/[.06] px-4 py-3 text-xs font-bold text-sky-200 transition hover:bg-sky-300/10">View all articles <ArrowUpRight className="h-4 w-4" /></button>
        </aside>
      </section>

      {/* Eight colorful destinations from the brief */}
      <section>
        <div className="mb-4 flex items-end justify-between"><div><p className="text-[9px] font-black uppercase tracking-[.24em] text-[#7CFF00]">Jump right in</p><h2 className="mt-1 text-xl font-black tracking-tight text-white sm:text-2xl">Explore M2A</h2></div><span className="hidden text-[10px] text-slate-500 sm:block">Eight ways to discover something new</span></div>
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 xl:grid-cols-8">
          {quickLinks.map(({ label, sub, tab, Icon, color, glow, border, orb }) => <button key={label} onClick={() => onSelectTab(tab)} className={`group relative min-h-[116px] overflow-hidden rounded-2xl border border-white/[.09] bg-gradient-to-br ${glow} to-[#0b101a] p-3.5 text-left shadow-[inset_0_1px_0_rgba(255,255,255,.04)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_10px_30px_rgba(0,0,0,.35)] ${border}`}><span className={`absolute -right-5 -top-6 h-20 w-20 rounded-full blur-2xl transition group-hover:scale-150 ${orb}`} /><span className={`relative flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-black/25 ${color} shadow-[0_0_22px_rgba(255,255,255,.04)] transition group-hover:scale-110`}><Icon className="h-5 w-5" /></span><span className="relative mt-3 block text-xs font-black text-white">{label}</span><span className="relative mt-0.5 block text-[9px] text-slate-500">{sub}</span></button>)}
        </div>
      </section>

      <section className="flex flex-col gap-3 rounded-2xl border border-lime-300/15 bg-[linear-gradient(100deg,rgba(124,255,0,.08),rgba(56,189,248,.04),rgba(255,255,255,.015))] p-4 sm:flex-row sm:items-center sm:justify-between sm:px-6"><div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-xl border border-lime-300/20 bg-lime-300/10 text-lime-300"><Sparkles className="h-5 w-5" /></div><div><h3 className="text-sm font-black text-white">Make M2A yours</h3><p className="mt-0.5 text-[10px] text-slate-400">Install the app for quick, full-screen access.</p></div></div><PWAInstallButton compact /></section>

      <div className="rounded-2xl border border-white/[.07] bg-[#0b1019]/70 p-2 shadow-[0_0_30px_rgba(56,189,248,.035)]"><AdSenseAd /></div>

      {/* Firimu is deliberately promoted as a major streaming destination */}
      {nakaMovies.length > 0 && <section className="overflow-hidden rounded-[24px] border border-pink-300/15 bg-[linear-gradient(145deg,rgba(45,13,38,.25),rgba(8,12,21,.8)_45%,rgba(9,18,28,.85))] p-3.5 shadow-[0_15px_55px_rgba(0,0,0,.28)] sm:p-5">
        <div className="mb-4 flex items-end justify-between gap-3"><div><p className="text-[9px] font-black uppercase tracking-[.24em] text-pink-300">Naka movie collection</p><h2 className="mt-1 flex items-center gap-2 text-xl font-black text-white sm:text-2xl"><Clapperboard className="h-5 w-5 text-pink-300" /> Firimu spotlight</h2><p className="mt-1 text-[10px] text-slate-500">Fresh titles from the M2A movie feed</p></div><button onClick={() => onSelectTab('firimu')} className="flex shrink-0 items-center gap-1 rounded-lg border border-pink-300/20 bg-pink-300/[.06] px-3 py-2 text-[10px] font-black text-pink-200 transition hover:bg-pink-300/10">View all <ChevronRight className="h-3.5 w-3.5" /></button></div>
        <div className="-mx-1 flex snap-x snap-mandatory gap-3 overflow-x-auto px-1 pb-2 [scrollbar-width:thin] [scrollbar-color:rgba(124,255,0,.3)_transparent]">
          {nakaMovies.slice(0, 10).map((movie) => <button key={movie.id} onClick={() => onSelectMovie ? onSelectMovie(movie) : onSelectTab('firimu')} className="group w-[142px] shrink-0 snap-start overflow-hidden rounded-xl border border-white/[.08] bg-[#090e17] text-left transition duration-300 hover:-translate-y-1 hover:border-pink-300/40 hover:shadow-[0_8px_28px_rgba(236,72,153,.12)] sm:w-[170px]"><div className="relative aspect-[2/3] overflow-hidden bg-black"><img src={movie.poster} alt={movie.title} loading="lazy" className="h-full w-full object-cover transition duration-500 group-hover:scale-110" /><div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-black/15" /><span className="absolute left-2 top-2 rounded-md border border-pink-200/30 bg-black/65 px-2 py-1 text-[8px] font-black uppercase text-pink-200 backdrop-blur">{movie.vj || 'M2A'}</span><span className="absolute bottom-2 right-2 flex h-8 w-8 items-center justify-center rounded-full border border-lime-200/30 bg-[#7CFF00] text-black shadow-[0_0_18px_rgba(124,255,0,.35)]"><Play className="ml-0.5 h-3.5 w-3.5 fill-current" /></span></div><div className="p-2.5"><span className="line-clamp-2 block min-h-8 text-[10px] font-bold text-white group-hover:text-lime-200">{movie.cleanTitle || movie.title}</span><span className="mt-1 block truncate text-[9px] text-slate-500">{movie.vj}</span></div></button>)}
        </div>
      </section>}

      {/* Live channels row */}
      <section><div className="mb-4 flex items-end justify-between"><div><p className="text-[9px] font-black uppercase tracking-[.22em] text-lime-300">Streaming now</p><h2 className="mt-1 flex items-center gap-2 text-xl font-black text-white sm:text-2xl"><Radio className="h-5 w-5 text-lime-300" /> Live TV channels</h2></div><button onClick={() => onSelectTab('tv')} className="flex items-center gap-1 text-[10px] font-black text-lime-300 hover:text-white">All channels <ChevronRight className="h-4 w-4" /></button></div><div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-6">{featuredChannels.map((channel) => <button key={channel.id} onClick={() => { onSelectTab('tv'); onSelectChannel(channel); }} className="group flex min-h-[112px] flex-col justify-between rounded-xl border border-white/[.08] bg-[linear-gradient(145deg,rgba(20,32,45,.85),rgba(8,12,19,.9))] p-3 text-left transition hover:-translate-y-0.5 hover:border-lime-300/30 hover:shadow-[0_0_24px_rgba(124,255,0,.06)]"><div className="flex items-center justify-between"><span className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-xl border border-white/10 text-xs font-black text-white" style={{ backgroundColor: `#${channel.color}` }}>{channel.logo ? <img src={channel.logo} alt="" className="h-full w-full object-contain" /> : channel.name.slice(0, 2).toUpperCase()}</span><span className="flex items-center gap-1 rounded-full bg-lime-300/10 px-2 py-1 text-[8px] font-black text-lime-300"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-lime-300" /> LIVE</span></div><span><span className="block truncate text-xs font-bold text-white group-hover:text-lime-200">{channel.name}</span><span className="mt-0.5 block truncate text-[9px] text-slate-500">{channel.category}</span></span></button>)}</div></section>

      {/* Latest article cards */}
      <section><div className="mb-4 flex items-end justify-between"><div><p className="text-[9px] font-black uppercase tracking-[.22em] text-sky-300">Read, learn, discover</p><h2 className="mt-1 text-xl font-black text-white sm:text-2xl">More from M2A</h2></div><button onClick={() => onSelectTab('blogs')} className="flex items-center gap-1 text-[10px] font-black text-sky-300 hover:text-white">All articles <ChevronRight className="h-4 w-4" /></button></div>
        {loading && <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">{[1,2,3].map((n) => <div key={n} className="h-28 animate-pulse rounded-xl bg-white/[.04]" />)}</div>}
        {!loading && posts.length > 0 && <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">{posts.slice(0,6).map((post,index) => <React.Fragment key={post.id}>{index===3 && <div className="sm:col-span-2 lg:col-span-3"><AdMobBanner format="native" /></div>}{index===5 && <div className="sm:col-span-2 lg:col-span-3"><AdSenseAd /></div>}<button onClick={() => onSelectPost(post)} className="group flex gap-3 rounded-xl border border-white/[.08] bg-[#0d1420]/80 p-2.5 text-left transition hover:-translate-y-0.5 hover:border-sky-300/30 hover:bg-[#111c2b]"><img src={post.thumbnail} alt="" loading="lazy" className="h-24 w-24 shrink-0 rounded-lg bg-black object-cover" onError={(e) => { (e.target as HTMLImageElement).style.opacity = '0'; }} /><span className="flex min-w-0 flex-1 flex-col py-1"><span className="line-clamp-3 text-xs font-bold leading-snug text-white group-hover:text-lime-200">{post.title}</span>{post.summary && <span className="mt-1 line-clamp-2 text-[10px] text-slate-500">{post.summary}</span>}<span className="mt-auto flex items-center gap-1 pt-2 text-[9px] text-slate-600"><Calendar className="h-3 w-3" />{new Date(post.published).toLocaleDateString(undefined,{month:'short',day:'numeric'})}<ArrowUpRight className="ml-auto h-3.5 w-3.5 text-sky-300 opacity-0 transition group-hover:opacity-100" /></span></span></button></React.Fragment>)}</div>}
        {!loading && posts.length===0 && <div className="rounded-xl border border-white/10 bg-white/[.03] p-6 text-center text-xs text-slate-400">Unable to load the blog feed right now. <button onClick={() => loadFeed(true)} className="ml-2 font-bold text-lime-300">Retry</button></div>}
      </section>

      <footer className="flex flex-col items-center justify-between gap-3 rounded-2xl border border-white/[.07] bg-[#080d16]/80 px-5 py-4 text-center sm:flex-row sm:text-left"><div><p className="text-xs font-black tracking-wide text-white">M2A <span className="text-[#7CFF00]">×</span> Marketing2Advertising</p><p className="mt-1 text-[9px] text-slate-500">Entertainment, technology, stories and digital opportunities.</p></div><a href="https://www.marketing2advertising.com" className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3.5 py-2 text-[10px] font-bold text-slate-300 transition hover:border-lime-300/30 hover:text-lime-200">Visit main website <ExternalLink className="h-3.5 w-3.5" /></a></footer>
    </div>
  );
};
