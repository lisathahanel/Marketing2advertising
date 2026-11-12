import React, { useEffect, useState } from 'react';
import {
  Tv,
  Film,
  Grid,
  Gamepad2,
  Briefcase,
  Play,
  RotateCw,
  ExternalLink,
  ChevronRight,
  Sparkles,
  Calendar,
  Clock,
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

export const HomeScreen: React.FC<HomeScreenProps> = ({
  onSelectTab,
  onSelectChannel,
  onSelectPost,
  onSelectMovie,
  channels,
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
        fetch('/api/naka/movies?maxResults=4').then((r) => r.json()).catch(() => ({ movies: [] }))
      ]);
      setPosts(blogData.posts);
      setNakaMovies(movieRes.movies || []);
    } catch (err) {
      console.warn('Failed to load home feed:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadFeed();
  }, []);

  const featuredChannels = channels.slice(0, 6);

  return (
    <div className="pb-28 max-w-xl mx-auto px-3.5 space-y-5 animate-in fade-in duration-300">
      {/* Hero Brand Tagline Banner */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-b from-[#181824] via-[#12121a] to-[#0d0d12] border border-amber-500/30 p-5 shadow-2xl">
        <div className="absolute top-0 right-0 -mt-4 -mr-4 w-36 h-36 rounded-full bg-amber-500/10 blur-2xl pointer-events-none" />

        <div className="flex items-center gap-2 mb-2">
          <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-black uppercase tracking-wider border border-amber-500/30 flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-amber-400" />
            Official M2A App
          </span>
          <span className="flex items-center gap-1 text-[10px] text-rose-400 font-bold">
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
            19 Live Channels
          </span>
        </div>

        <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight leading-snug">
          M2A Digital Hub
        </h1>

        <p className="text-xs text-amber-400 font-semibold tracking-wide mt-1">
          AI Tools | Freelancing | Software | Hosting | Online Learning | Careers
        </p>

        <p className="text-[11px] text-slate-300 mt-2 leading-relaxed">
          Mirroring <span className="text-amber-300 font-medium">marketing2advertising.com</span> with zero sign-up tools, 15 games, high-speed live TV, and automated feed sync.
        </p>

        {/* Quick action buttons */}
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            onClick={() => onSelectTab('tv')}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-rose-600 to-red-500 text-white text-xs font-black shadow-lg shadow-rose-600/20 active:scale-95 transition"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Watch Live TV</span>
          </button>
          <button
            onClick={() => onSelectTab('apps')}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-bold border border-white/10 active:scale-95 transition"
          >
            <Grid className="w-3.5 h-3.5 text-emerald-400" />
            <span>Multi Apps</span>
          </button>
          <button
            onClick={() => onSelectTab('games')}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-bold border border-white/10 active:scale-95 transition"
          >
            <Gamepad2 className="w-3.5 h-3.5 text-purple-400" />
            <span>15 Games</span>
          </button>
        </div>
      </section>

      {/* In-App PWA Install Banner */}
      <div className="p-3.5 rounded-2xl bg-gradient-to-r from-amber-500/10 via-yellow-500/5 to-transparent border border-amber-500/25 flex items-center justify-between">
        <div>
          <h3 className="text-xs font-bold text-white flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-400" />
            Install M2A on Your Device
          </h3>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Fast offline access, full-screen player & home screen icon.
          </p>
        </div>
        <PWAInstallButton compact />
      </div>

      {/* Quick Category Navigation Shortcuts */}
      <section>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
          <button
            onClick={() => onSelectTab('tv')}
            className="flex flex-col items-center justify-center p-2.5 rounded-2xl bg-[#14141e] border border-white/5 hover:border-amber-500/30 group transition"
          >
            <div className="w-9 h-9 rounded-xl bg-rose-500/15 text-rose-400 flex items-center justify-center group-hover:scale-110 transition">
              <Tv className="w-4 h-4" />
            </div>
            <span className="text-[10px] font-bold text-slate-200 mt-1.5">Live TV</span>
            <span className="text-[8px] text-rose-400 font-semibold">19 CH</span>
          </button>

          <button
            onClick={() => onSelectTab('firimu')}
            className="flex flex-col items-center justify-center p-2.5 rounded-2xl bg-[#14141e] border border-white/5 hover:border-amber-500/30 group transition"
          >
            <div className="w-9 h-9 rounded-xl bg-amber-500/15 text-amber-400 flex items-center justify-center group-hover:scale-110 transition">
              <Film className="w-4 h-4" />
            </div>
            <span className="text-[10px] font-bold text-slate-200 mt-1.5">Firimu</span>
            <span className="text-[8px] text-amber-400 font-semibold">naka movies</span>
          </button>

          <button
            onClick={() => onSelectTab('blogs')}
            className="flex flex-col items-center justify-center p-2.5 rounded-2xl bg-[#14141e] border border-white/5 hover:border-amber-500/30 group transition"
          >
            <div className="w-9 h-9 rounded-xl bg-blue-500/15 text-blue-400 flex items-center justify-center group-hover:scale-110 transition">
              <Sparkles className="w-4 h-4" />
            </div>
            <span className="text-[10px] font-bold text-slate-200 mt-1.5">Blogs</span>
            <span className="text-[8px] text-blue-400 font-semibold">Main Site</span>
          </button>

          <button
            onClick={() => onSelectTab('apps')}
            className="flex flex-col items-center justify-center p-2.5 rounded-2xl bg-[#14141e] border border-white/5 hover:border-amber-500/30 group transition"
          >
            <div className="w-9 h-9 rounded-xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center group-hover:scale-110 transition">
              <Grid className="w-4 h-4" />
            </div>
            <span className="text-[10px] font-bold text-slate-200 mt-1.5">Multi Apps</span>
            <span className="text-[8px] text-emerald-400 font-semibold">19 Tools</span>
          </button>

          <button
            onClick={() => onSelectTab('games')}
            className="flex flex-col items-center justify-center p-2.5 rounded-2xl bg-[#14141e] border border-white/5 hover:border-amber-500/30 group transition"
          >
            <div className="w-9 h-9 rounded-xl bg-purple-500/15 text-purple-400 flex items-center justify-center group-hover:scale-110 transition">
              <Gamepad2 className="w-4 h-4" />
            </div>
            <span className="text-[10px] font-bold text-slate-200 mt-1.5">Games</span>
            <span className="text-[8px] text-purple-400 font-semibold">15 Games</span>
          </button>

          <button
            onClick={() => onSelectTab('jobs')}
            className="flex flex-col items-center justify-center p-2.5 rounded-2xl bg-[#14141e] border border-white/5 hover:border-amber-500/30 group transition"
          >
            <div className="w-9 h-9 rounded-xl bg-cyan-500/15 text-cyan-400 flex items-center justify-center group-hover:scale-110 transition">
              <Briefcase className="w-4 h-4" />
            </div>
            <span className="text-[10px] font-bold text-slate-200 mt-1.5">Jobs</span>
            <span className="text-[8px] text-cyan-400 font-semibold">Global</span>
          </button>
        </div>
      </section>

      {/* Responsive AdSense placement after the main navigation shortcuts */}
      <AdSenseAd />

      {/* Live Channels Section */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-2 h-4 rounded-full bg-rose-500" />
            <h2 className="text-base font-black text-white">Live Channels</h2>
            <span className="px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-400 text-[10px] font-black">
              LIVE
            </span>
          </div>
          <button
            onClick={() => onSelectTab('tv')}
            className="text-xs font-bold text-amber-400 hover:text-amber-300 flex items-center gap-0.5"
          >
            <span>See All ({channels.length})</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-3 gap-2.5">
          {featuredChannels.map((channel) => (
            <button
              key={channel.id}
              onClick={() => {
                onSelectTab('tv');
                onSelectChannel(channel);
              }}
              className="group relative overflow-hidden rounded-2xl bg-[#14141e] border border-white/5 hover:border-amber-500/40 p-2.5 text-left transition flex flex-col justify-between h-28"
            >
              <div className="flex justify-between items-start">
                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black text-white shadow-sm"
                  style={{ backgroundColor: `#${channel.color}` }}
                >
                  {channel.name.slice(0, 2).toUpperCase()}
                </div>
                <span className="px-1.5 py-0.2 rounded text-[8px] font-black bg-rose-600 text-white tracking-wider flex items-center gap-1">
                  <span className="w-1 h-1 rounded-full bg-white animate-pulse" />
                  LIVE
                </span>
              </div>

              <div>
                <h4 className="text-xs font-bold text-white group-hover:text-amber-400 truncate">
                  {channel.name}
                </h4>
                <p className="text-[10px] text-slate-400 mt-0.5">{channel.category}</p>
              </div>

              {/* Hover play icon */}
              <div className="absolute inset-0 bg-black/40 backdrop-blur-[1px] opacity-0 group-hover:opacity-100 flex items-center justify-center transition">
                <Play className="w-6 h-6 text-amber-400 fill-current" />
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* Trending Firimu Movies from naka.marketing2advertising.com */}
      {nakaMovies.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-2 h-4 rounded-full bg-gradient-to-b from-amber-400 to-rose-500" />
              <h2 className="text-base font-black text-white">Trending Firimu</h2>
              <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 text-[10px] font-black uppercase">
                naka movies
              </span>
            </div>
            <button
              onClick={() => onSelectTab('firimu')}
              className="text-xs font-bold text-amber-400 hover:text-amber-300 flex items-center gap-0.5"
            >
              <span>Watch All</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {nakaMovies.map((movie) => (
              <div
                key={movie.id}
                onClick={() => {
                  if (onSelectMovie) {
                    onSelectMovie(movie);
                  } else {
                    onSelectTab('firimu');
                  }
                }}
                className="group relative overflow-hidden rounded-2xl bg-[#14141e] border border-white/5 hover:border-amber-500/40 p-2 cursor-pointer transition flex flex-col justify-between"
              >
                <div className="relative aspect-[4/3] rounded-xl overflow-hidden bg-black mb-1.5">
                  <img
                    src={movie.poster}
                    alt={movie.title}
                    loading="lazy"
                    className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                  />
                  <span className="absolute top-1 left-1 px-1.5 py-0.2 rounded bg-amber-500 text-black text-[8px] font-black uppercase">
                    {movie.vj}
                  </span>
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                    <div className="w-8 h-8 rounded-full bg-amber-500 text-black flex items-center justify-center shadow">
                      <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="text-[11px] font-bold text-white group-hover:text-amber-400 line-clamp-1">
                    {movie.cleanTitle}
                  </h4>
                  <span className="text-[9px] text-slate-400 block truncate">
                    {movie.vj}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Latest Blogger Feed Posts from Main Site */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-2 h-4 rounded-full bg-amber-500" />
            <h2 className="text-base font-black text-white">Latest from M2A Blogs</h2>
            <button
              onClick={() => loadFeed(true)}
              className="p-1 rounded text-slate-400 hover:text-white transition"
              title="Refresh feed"
            >
              <RotateCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-amber-400' : ''}`} />
            </button>
          </div>
          <button
            onClick={() => onSelectTab('blogs')}
            className="text-xs font-bold text-amber-400 hover:text-amber-300 flex items-center gap-0.5"
          >
            <span>All Articles</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Loading Skeletons */}
        {loading && (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="flex gap-3 p-3 rounded-2xl bg-[#14141e] border border-white/5 animate-pulse"
              >
                <div className="w-24 h-20 rounded-xl bg-white/5 shrink-0" />
                <div className="flex-1 space-y-2 py-1">
                  <div className="w-3/4 h-3.5 bg-white/10 rounded" />
                  <div className="w-1/2 h-2.5 bg-white/5 rounded" />
                  <div className="w-1/3 h-2 bg-white/5 rounded" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Post Items */}
        {!loading && posts.length > 0 && (
          <div className="space-y-3">
            {posts.map((post, idx) => (
              <React.Fragment key={post.id}>
                {/* Insert native ad after second post */}
                {idx === 2 && <AdMobBanner format="native" />}
                {/* Second AdSense placement after readers have started browsing articles */}
                {idx === 5 && <AdSenseAd />}

                <a
                  href={post.url}
                  className="group flex gap-3.5 p-3 rounded-2xl bg-[#14141e] border border-white/5 hover:border-amber-500/30 cursor-pointer transition active:scale-[0.99] block text-left"
                >
                  <div className="relative w-24 h-24 sm:w-28 sm:h-24 rounded-xl overflow-hidden bg-black shrink-0 border border-white/5">
                    <img
                      src={post.thumbnail}
                      alt={post.title}
                      loading="lazy"
                      className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src =
                          'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400&auto=format&fit=crop&q=80';
                      }}
                    />
                    {post.categories.length > 0 && (
                      <span className="absolute bottom-1 left-1 px-1.5 py-0.2 rounded bg-black/80 backdrop-blur-sm text-[8px] font-black text-amber-300 uppercase">
                        {post.categories[0]}
                      </span>
                    )}
                  </div>

                  <div className="flex-1 flex flex-col justify-between min-w-0">
                    <div>
                      <h3 className="text-xs sm:text-sm font-bold text-white group-hover:text-amber-400 line-clamp-2 leading-snug">
                        {post.title}
                      </h3>
                      {post.summary && (
                        <p className="text-[11px] text-slate-400 line-clamp-2 mt-1">
                          {post.summary}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-3 text-[10px] text-slate-500 mt-2">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-slate-500" />
                        {new Date(post.published).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                        })}
                      </span>
                      <span className="text-amber-400 font-bold flex items-center gap-1 text-[11px] group-hover:underline ml-auto">
                        <span>Open on Site</span>
                        <ExternalLink className="w-3 h-3" />
                      </span>
                    </div>
                  </div>
                </a>
              </React.Fragment>
            ))}
          </div>
        )}

        {!loading && posts.length === 0 && (
          <div className="p-8 text-center rounded-2xl bg-[#14141e] border border-white/5">
            <p className="text-xs text-slate-400">Unable to load feed right now.</p>
            <button
              onClick={() => loadFeed(true)}
              className="mt-3 px-4 py-1.5 rounded-xl bg-amber-500 text-black text-xs font-bold"
            >
              Retry Sync
            </button>
          </div>
        )}
      </section>

      {/* Website Direct Link Card */}
      <div className="p-4 rounded-2xl bg-[#121218] border border-white/5 flex items-center justify-between text-xs">
        <div>
          <span className="font-bold text-white">Looking for desktop experience?</span>
          <p className="text-[10px] text-slate-400 mt-0.5">All tools and posts stay in sync in real-time.</p>
        </div>
        <a
          href="https://www.marketing2advertising.com"
          className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-slate-200 font-semibold transition"
        >
          <span>Open Site</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>
    </div>
  );
};
