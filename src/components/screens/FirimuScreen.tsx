import React, { useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';
import {
  Play,
  Pause,
  RotateCcw,
  Maximize2,
  Minimize2,
  Volume2,
  VolumeX,
  Search,
  Film,
  Sparkles,
  Download,
  Share2,
  WifiOff,
  ChevronDown,
  ExternalLink,
  Clapperboard,
  Tv,
  Globe,
} from 'lucide-react';
import { MovieItem } from '../../types';
import { AdMobBanner } from '../AdMobBanner';
import { showToast } from '../Toast';

interface FirimuScreenProps {
  initialMovie?: MovieItem | null;
  onClearInitialMovie?: () => void;
  onTriggerAd?: () => void;
}

export const FirimuScreen: React.FC<FirimuScreenProps> = ({
  initialMovie,
  onClearInitialMovie,
  onTriggerAd,
}) => {
  const [movies, setMovies] = useState<MovieItem[]>([]);
  const [selectedMovie, setSelectedMovie] = useState<MovieItem | null>(initialMovie || null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    if (initialMovie) {
      setSelectedMovie(initialMovie);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [initialMovie]);
  const [loadingMore, setLoadingMore] = useState<boolean>(false);
  const [activeVj, setActiveVj] = useState<string>('All');
  const [activeGenre, setActiveGenre] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [startIndex, setStartIndex] = useState<number>(1);
  const [totalResults, setTotalResults] = useState<number>(0);

  // Video player states
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isBuffering, setIsBuffering] = useState<boolean>(false);
  const [isError, setIsError] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const playerContainerRef = useRef<HTMLDivElement | null>(null);
  const hlsRef = useRef<Hls | null>(null);

  const vjList = [
    'All',
    'VJ Junior',
    'VJ Emmy',
    'VJ Ice P',
    'VJ Kriss Sweet',
    'VJ MK Kisuule',
    'VJ Jingo',
  ];

  const genres = [
    'All',
    'Action',
    'Adventure',
    'Comedy',
    'Crime',
    'Drama',
    'Romance',
    'SciFi',
    'Horror',
  ];

  // Fetch movies from naka subdomain
  const loadMovies = async (index = 1, isAppend = false) => {
    if (isAppend) setLoadingMore(true);
    else setLoading(true);

    try {
      const params = new URLSearchParams();
      params.set('maxResults', '18');
      params.set('startIndex', String(index));
      if (searchQuery) params.set('q', searchQuery);
      if (activeGenre !== 'All') params.set('label', activeGenre);

      const res = await fetch(`/api/naka/movies?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to load naka movies');

      const data = await res.json();
      const fetched: MovieItem[] = data.movies || [];

      if (isAppend) {
        setMovies((prev) => [...prev, ...fetched]);
      } else {
        setMovies(fetched);
        if (fetched.length > 0 && !selectedMovie) {
          setSelectedMovie(fetched[0]);
        }
      }

      setTotalResults(data.totalResults || 0);
      setStartIndex(index);
    } catch (err) {
      console.warn('Error fetching naka movies:', err);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    loadMovies(1, false);
  }, [activeGenre]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadMovies(1, false);
  };

  // Video playback loader
  const loadVideo = (movie: MovieItem) => {
    const video = videoRef.current;
    if (!video || !movie.videoUrl) return;

    setIsBuffering(true);
    setIsError(false);
    setIsPlaying(false);

    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    if (movie.videoUrl.includes('.m3u8') && Hls.isSupported()) {
      const hls = new Hls({ enableWorker: true });
      hlsRef.current = hls;
      hls.loadSource(movie.videoUrl);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        setIsBuffering(false);
        video.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
      });
      hls.on(Hls.Events.ERROR, () => {
        setIsError(true);
        setIsBuffering(false);
      });
    } else {
      // Direct MP4 playback
      video.src = movie.videoUrl;
      video.load();
      video.play().then(() => {
        setIsPlaying(true);
        setIsBuffering(false);
      }).catch((e) => {
        console.warn('Play prevented:', e);
        setIsBuffering(false);
      });
    }
  };

  useEffect(() => {
    if (selectedMovie && selectedMovie.videoUrl) {
      loadVideo(selectedMovie);
    }
  }, [selectedMovie?.id]);

  const handleSelectMovie = (movie: MovieItem) => {
    setSelectedMovie(movie);
    if (onTriggerAd && Math.random() > 0.6) {
      onTriggerAd();
    }
    // Scroll smoothly to the player
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      video.play().then(() => setIsPlaying(true));
    } else {
      video.pause();
      setIsPlaying(false);
    }
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !video.muted;
    setIsMuted(video.muted);
  };

  const toggleFullscreen = () => {
    const container = playerContainerRef.current;
    if (!container) return;
    if (!document.fullscreenElement) {
      container.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  const cycleSpeed = () => {
    const video = videoRef.current;
    if (!video) return;
    const speeds = [1, 1.25, 1.5, 2];
    const nextIdx = (speeds.indexOf(playbackSpeed) + 1) % speeds.length;
    const nextSpeed = speeds[nextIdx];
    video.playbackRate = nextSpeed;
    setPlaybackSpeed(nextSpeed);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const video = videoRef.current;
    if (!video) return;
    const newTime = Number(e.target.value);
    video.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const formatTime = (secs: number) => {
    if (isNaN(secs)) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const handleShareMovie = (movie: MovieItem) => {
    if (navigator.share) {
      navigator.share({
        title: movie.title,
        text: `Watch ${movie.cleanTitle} translated by ${movie.vj} on M2A!`,
        url: movie.url || window.location.href,
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(movie.url || window.location.href);
      showToast('Movie link copied to clipboard!', 'success');
    }
  };

  // Filter movies by VJ if selected
  const filteredMovies = movies.filter((m) => {
    if (activeVj === 'All') return true;
    return m.vj.toLowerCase().includes(activeVj.toLowerCase()) || m.title.toLowerCase().includes(activeVj.toLowerCase());
  });

  return (
    <div className="pb-28 max-w-xl mx-auto px-3.5 space-y-4 animate-in fade-in duration-300">
      {/* Top Tag & Subdomain Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-amber-500 to-rose-600 flex items-center justify-center text-white shadow-md">
            <Clapperboard className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-base font-black text-white flex items-center gap-1.5">
              <span>Firimu</span>
              <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 text-[10px] font-black uppercase">
                naka movies
              </span>
            </h2>
            <p className="text-[10px] text-slate-400">
              Luganda Translated Movies from <span className="text-amber-400 font-medium">naka.marketing2advertising.com</span>
            </p>
          </div>
        </div>

        <a
          href="https://naka.marketing2advertising.com/"
          target="_blank"
          rel="noreferrer"
          className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-amber-400 transition"
          title="Visit naka.marketing2advertising.com"
        >
          <ExternalLink className="w-4 h-4" />
        </a>
      </div>

      {/* Built-in Video Player for naka movies */}
      {selectedMovie && (
        <div className="space-y-3">
          <div
            ref={playerContainerRef}
            className="relative overflow-hidden rounded-3xl bg-black border border-white/15 shadow-2xl aspect-video w-full flex items-center justify-center group"
          >
            <video
              ref={videoRef}
              className="w-full h-full object-contain bg-black"
              playsInline
              onTimeUpdate={() => {
                if (videoRef.current) {
                  setCurrentTime(videoRef.current.currentTime);
                  setDuration(videoRef.current.duration || 0);
                }
              }}
              onLoadedMetadata={() => {
                if (videoRef.current) {
                  setDuration(videoRef.current.duration || 0);
                  setIsBuffering(false);
                }
              }}
              onWaiting={() => setIsBuffering(true)}
              onPlaying={() => {
                setIsBuffering(false);
                setIsPlaying(true);
              }}
              onPause={() => setIsPlaying(false)}
              onError={() => {
                setIsError(true);
                setIsBuffering(false);
              }}
            />

            {/* Top Overlay Badges */}
            <div className="absolute top-3 left-3 right-3 flex justify-between items-center z-20 pointer-events-none">
              <div className="flex items-center gap-2 pointer-events-auto">
                <span className="px-2.5 py-1 rounded-full bg-amber-500 text-black text-[10px] font-black tracking-wider shadow">
                  {selectedMovie.vj}
                </span>
                <span className="px-2.5 py-1 rounded-full bg-black/70 backdrop-blur-md text-white text-[10px] font-bold border border-white/10 truncate max-w-[140px] sm:max-w-[200px]">
                  {selectedMovie.cleanTitle}
                </span>
              </div>

              <div className="flex items-center gap-1.5 pointer-events-auto">
                <button
                  onClick={cycleSpeed}
                  className="px-2 py-1 rounded-full bg-black/60 hover:bg-black/90 text-amber-300 backdrop-blur-md border border-white/10 text-[10px] font-black transition"
                  title="Playback speed"
                >
                  {playbackSpeed}x
                </button>
                <button
                  onClick={toggleMute}
                  className="p-1.5 rounded-full bg-black/60 hover:bg-black/90 text-white backdrop-blur-md border border-white/10 transition"
                  title={isMuted ? 'Unmute' : 'Mute'}
                >
                  {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                </button>
                <button
                  onClick={toggleFullscreen}
                  className="p-1.5 rounded-full bg-black/60 hover:bg-black/90 text-white backdrop-blur-md border border-white/10 transition"
                  title="Fullscreen"
                >
                  {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            {/* Buffering Indicator */}
            {isBuffering && !isError && (
              <div className="absolute inset-0 bg-black/70 backdrop-blur-[2px] flex flex-col items-center justify-center z-10 pointer-events-none">
                <div className="w-10 h-10 border-3 border-amber-500/20 border-t-amber-400 rounded-full animate-spin" />
                <span className="mt-3 text-xs font-bold text-white tracking-wide">
                  Buffering Movie Stream…
                </span>
              </div>
            )}

            {/* Error Overlay with Retry */}
            {isError && (
              <div className="absolute inset-0 bg-[#0e0e14]/95 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center z-30">
                <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-500 border border-rose-500/20 flex items-center justify-center mb-3">
                  <WifiOff className="w-6 h-6" />
                </div>
                <h4 className="text-sm font-bold text-white">Stream Error – Try Again</h4>
                <p className="text-[11px] text-slate-400 mt-1 max-w-xs">
                  Could not connect to the video host for this movie.
                </p>
                <div className="mt-4 flex gap-2">
                  <button
                    onClick={() => loadVideo(selectedMovie)}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 text-black text-xs font-black shadow-lg"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Retry Player</span>
                  </button>
                  {selectedMovie.videoUrl && (
                    <a
                      href={selectedMovie.videoUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-1 px-3 py-2 rounded-xl bg-white/10 text-white text-xs font-bold"
                    >
                      <span>Direct Stream</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}
                </div>
              </div>
            )}

            {/* Center Play Click Cover */}
            {!isBuffering && !isError && (
              <button
                onClick={togglePlay}
                className="absolute inset-0 flex items-center justify-center bg-transparent z-0 group"
              >
                {!isPlaying && (
                  <div className="w-14 h-14 rounded-full bg-amber-500/95 hover:bg-amber-400 text-black flex items-center justify-center shadow-2xl shadow-amber-500/40 transform transition active:scale-90">
                    <Play className="w-7 h-7 fill-current ml-0.5" />
                  </div>
                )}
              </button>
            )}

            {/* Bottom Controls Bar on Hover / Pause */}
            <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/90 via-black/50 to-transparent flex flex-col gap-1.5 opacity-90 group-hover:opacity-100 transition z-20">
              {/* Scrub Slider */}
              <input
                type="range"
                min={0}
                max={duration || 100}
                value={currentTime}
                onChange={handleSeek}
                className="w-full h-1 bg-white/30 rounded-lg appearance-none cursor-pointer accent-amber-500"
              />

              <div className="flex justify-between items-center text-[10px] text-slate-300 font-mono">
                <div className="flex items-center gap-2">
                  <button onClick={togglePlay} className="text-white hover:text-amber-400">
                    {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 fill-current" />}
                  </button>
                  <span>{formatTime(currentTime)} / {formatTime(duration)}</span>
                </div>
                <span className="text-amber-300 font-bold">{selectedMovie.vj}</span>
              </div>
            </div>
          </div>

          {/* Currently Selected Movie Details Card */}
          <div className="p-4 rounded-2xl bg-[#14141e] border border-white/5 space-y-2">
            <div className="flex justify-between items-start gap-2">
              <div>
                <span className="text-[10px] font-black uppercase text-amber-400 tracking-wider">
                  {selectedMovie.vj} Presentation
                </span>
                <h3 className="text-sm sm:text-base font-black text-white leading-snug">
                  {selectedMovie.cleanTitle}
                </h3>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                {selectedMovie.url && (
                  <a
                    href={selectedMovie.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 text-[11px] font-bold transition active:scale-95"
                    title="Open on naka.marketing2advertising.com"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Open on Site</span>
                  </a>
                )}
                <button
                  onClick={() => handleShareMovie(selectedMovie)}
                  className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-amber-400 transition"
                  title="Share Movie"
                >
                  <Share2 className="w-4 h-4" />
                </button>
                {selectedMovie.videoUrl && (
                  <a
                    href={selectedMovie.videoUrl}
                    download
                    target="_blank"
                    rel="noreferrer"
                    className="p-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 transition"
                    title="Open / Download Video Link"
                  >
                    <Download className="w-4 h-4" />
                  </a>
                )}
              </div>
            </div>

            {selectedMovie.summary && (
              <p className="text-[11px] text-slate-300 leading-relaxed pt-1">
                {selectedMovie.summary}
              </p>
            )}

            {selectedMovie.categories.length > 0 && (
              <div className="flex flex-wrap gap-1 pt-1">
                {selectedMovie.categories.map((c) => (
                  <span
                    key={c}
                    className="px-2 py-0.5 rounded-full text-[9px] font-semibold bg-white/5 text-slate-300"
                  >
                    {c}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* VJ Filter Chips */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            Filter by VJ Narrator
          </span>
          <span className="text-[10px] text-amber-400 font-bold font-mono">
            {filteredMovies.length} movies loaded
          </span>
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {vjList.map((vj) => {
            const isActive = activeVj === vj;
            return (
              <button
                key={vj}
                onClick={() => setActiveVj(vj)}
                className={`px-3 py-1.5 rounded-full text-xs font-black whitespace-nowrap transition ${
                  isActive
                    ? 'bg-amber-500 text-black shadow-md shadow-amber-500/20'
                    : 'bg-[#14141e] text-slate-400 hover:text-white border border-white/5'
                }`}
              >
                {vj}
              </button>
            );
          })}
        </div>
      </div>

      {/* Genre Filter Chips & Search Bar */}
      <div className="space-y-2">
        <form onSubmit={handleSearchSubmit} className="relative">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search naka movies (e.g. Ohana, Retribution, Junior)…"
            className="w-full h-10 pl-9 pr-20 rounded-xl bg-[#14141e] border border-white/10 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-400 transition"
          />
          <button
            type="submit"
            className="absolute right-1.5 top-1/2 -translate-y-1/2 px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold"
          >
            Search
          </button>
        </form>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {genres.map((g) => {
            const isActive = activeGenre === g;
            return (
              <button
                key={g}
                onClick={() => setActiveGenre(g)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold whitespace-nowrap transition ${
                  isActive
                    ? 'bg-rose-600 text-white'
                    : 'bg-white/5 text-slate-400 hover:text-white'
                }`}
              >
                {g}
              </button>
            );
          })}
        </div>
      </div>

      {/* Movies Catalog Grid */}
      <div>
        <h3 className="text-xs font-black text-white uppercase tracking-wider mb-3 flex items-center gap-1.5">
          <Film className="w-3.5 h-3.5 text-rose-500" />
          Naka Movies Catalog
        </h3>

        {loading && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 animate-pulse">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-44 rounded-2xl bg-[#14141e] border border-white/5 p-2 space-y-2">
                <div className="w-full h-28 bg-white/5 rounded-xl" />
                <div className="w-3/4 h-3 bg-white/10 rounded" />
                <div className="w-1/2 h-2.5 bg-white/5 rounded" />
              </div>
            ))}
          </div>
        )}

        {!loading && filteredMovies.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            {filteredMovies.map((movie) => {
              const isSelected = selectedMovie?.id === movie.id;
              return (
                <div
                  key={movie.id}
                  onClick={() => handleSelectMovie(movie)}
                  className={`group relative overflow-hidden rounded-2xl p-2.5 cursor-pointer transition flex flex-col justify-between border ${
                    isSelected
                      ? 'bg-gradient-to-b from-[#1c1c28] to-[#12121a] border-amber-400 shadow-[0_0_15px_rgba(234,179,8,0.25)]'
                      : 'bg-[#14141e] border-white/5 hover:border-amber-500/40'
                  }`}
                >
                  <div className="relative aspect-[4/3] rounded-xl overflow-hidden bg-black mb-2">
                    <img
                      src={movie.poster}
                      alt={movie.title}
                      loading="lazy"
                      className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />

                    <span className="absolute top-1.5 left-1.5 px-1.5 py-0.2 rounded bg-amber-500 text-black text-[8px] font-black uppercase">
                      {movie.vj}
                    </span>

                    {/* Open on site link */}
                    {movie.url && (
                      <a
                        href={movie.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="absolute bottom-1.5 right-1.5 px-2 py-0.5 rounded-lg bg-black/80 hover:bg-amber-500 hover:text-black text-amber-300 text-[9px] font-bold border border-white/20 flex items-center gap-1 transition"
                        title="Open post on naka.marketing2advertising.com"
                      >
                        <ExternalLink className="w-2.5 h-2.5" />
                        <span>Site</span>
                      </a>
                    )}

                    {/* Play icon overlay */}
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition bg-black/40">
                      <div className="w-9 h-9 rounded-full bg-amber-500 text-black flex items-center justify-center shadow-lg">
                        <Play className="w-4 h-4 fill-current ml-0.5" />
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-xs font-bold text-white group-hover:text-amber-400 line-clamp-2 leading-snug">
                      {movie.cleanTitle}
                    </h4>
                    <span className="text-[10px] text-slate-400 mt-1 block truncate">
                      {movie.vj}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Load More Button */}
        {!loading && movies.length > 0 && (
          <div className="pt-3 text-center">
            <button
              onClick={() => loadMovies(startIndex + 18, true)}
              disabled={loadingMore}
              className="px-6 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-amber-300 flex items-center gap-2 mx-auto transition disabled:opacity-50"
            >
              <ChevronDown className={`w-4 h-4 ${loadingMore ? 'animate-bounce' : ''}`} />
              <span>{loadingMore ? 'Loading More Movies…' : 'Load More Movies'}</span>
            </button>
          </div>
        )}

        {!loading && filteredMovies.length === 0 && (
          <div className="p-8 text-center rounded-2xl bg-[#14141e] border border-white/5">
            <p className="text-xs text-slate-400">No movies found matching current filter.</p>
            <button
              onClick={() => {
                setActiveVj('All');
                setActiveGenre('All');
                setSearchQuery('');
                loadMovies(1, false);
              }}
              className="mt-2 text-xs font-bold text-amber-400"
            >
              Reset filters
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
