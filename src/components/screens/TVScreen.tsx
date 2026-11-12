import React, { useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';
import {
  Play,
  RotateCcw,
  Maximize2,
  Minimize2,
  Volume2,
  VolumeX,
  Search,
  Radio,
  WifiOff,
  Tv,
} from 'lucide-react';
import { Channel } from '../../types';
import { AdMobBanner } from '../AdMobBanner';

interface TVScreenProps {
  channels: Channel[];
  selectedChannel: Channel | null;
  onSelectChannel: (channel: Channel) => void;
}

export const TVScreen: React.FC<TVScreenProps> = ({
  channels,
  selectedChannel,
  onSelectChannel,
}) => {
  const [activeCategory, setActiveCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isError, setIsError] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('Network not well – Try Again');

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const playerContainerRef = useRef<HTMLDivElement | null>(null);
  const hlsRef = useRef<Hls | null>(null);

  const categories = ['ALL', 'News', 'Entertainment', 'Sports', 'Community', 'Faith'];

  // Default to first channel if none selected
  const currentChannel = selectedChannel || channels[0];

  const loadStream = (channel: Channel) => {
    const video = videoRef.current;
    if (!video || !channel.url) return;

    setIsLoading(true);
    setIsError(false);
    setIsPlaying(false);

    // Destroy existing HLS instance
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    if (Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
        backBufferLength: 60,
      });

      hlsRef.current = hls;
      hls.loadSource(channel.url);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        setIsLoading(false);
        video
          .play()
          .then(() => setIsPlaying(true))
          .catch((err) => {
            console.warn('Autoplay prevented or failed:', err);
            setIsPlaying(false);
          });
      });

      hls.on(Hls.Events.ERROR, (_event, data) => {
        console.warn('HLS stream error:', data);
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              setErrorMessage('Network not well – Try Again');
              setIsError(true);
              setIsLoading(false);
              hls.startLoad();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              hls.recoverMediaError();
              break;
            default:
              hls.destroy();
              setIsError(true);
              setIsLoading(false);
              break;
          }
        }
      });
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      // Native Safari / iOS WebKit HLS
      video.src = channel.url;
      video.addEventListener('loadedmetadata', () => {
        setIsLoading(false);
        video
          .play()
          .then(() => setIsPlaying(true))
          .catch(() => setIsPlaying(false));
      });
      video.addEventListener('error', () => {
        setIsError(true);
        setIsLoading(false);
        setErrorMessage('Network not well – Try Again');
      });
    } else {
      setIsError(true);
      setErrorMessage('HLS stream playback not supported in this browser.');
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (currentChannel) {
      loadStream(currentChannel);
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [currentChannel?.id]);

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

  const filteredChannels = channels.filter((ch) => {
    const matchesCat = activeCategory === 'ALL' || ch.category.toLowerCase() === activeCategory.toLowerCase();
    const matchesQuery =
      !searchQuery ||
      ch.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ch.category.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesQuery;
  });

  return (
    <div className="pb-28 max-w-xl mx-auto px-3.5 space-y-4 animate-in fade-in duration-300">
      {/* Live Video Player Shell */}
      <div
        ref={playerContainerRef}
        className="relative overflow-hidden rounded-3xl bg-black border border-white/10 shadow-2xl aspect-video w-full flex items-center justify-center group"
      >
        <video
          ref={videoRef}
          className="w-full h-full object-contain bg-black"
          playsInline
          muted={isMuted}
          onWaiting={() => setIsLoading(true)}
          onPlaying={() => {
            setIsLoading(false);
            setIsPlaying(true);
          }}
          onPause={() => setIsPlaying(false)}
        />

        {/* Top Badges Overlay */}
        <div className="absolute top-3 left-3 right-3 flex justify-between items-center z-20 pointer-events-none">
          <div className="flex items-center gap-2 pointer-events-auto">
            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-600 text-white text-[10px] font-black tracking-widest shadow-lg">
              <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
              LIVE
            </span>
            {currentChannel && (
              <span className="px-2.5 py-1 rounded-full bg-black/70 backdrop-blur-md text-white text-[10px] font-bold border border-white/10 truncate max-w-[140px] sm:max-w-[200px]">
                {currentChannel.name}
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5 pointer-events-auto">
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
              {isFullscreen ? (
                <Minimize2 className="w-3.5 h-3.5" />
              ) : (
                <Maximize2 className="w-3.5 h-3.5" />
              )}
            </button>
          </div>
        </div>

        {/* Loading Overlay */}
        {isLoading && !isError && (
          <div className="absolute inset-0 bg-black/70 backdrop-blur-[2px] flex flex-col items-center justify-center z-10">
            <div className="w-10 h-10 border-3 border-amber-500/20 border-t-amber-400 rounded-full animate-spin" />
            <span className="mt-3 text-xs font-bold text-white tracking-wide">Connecting…</span>
            <span className="text-[10px] text-amber-400/80 mt-1">Live HLS feed</span>
          </div>
        )}

        {/* Error State: "Network not well – Try Again" exactly matching site */}
        {isError && (
          <div className="absolute inset-0 bg-[#0e0e14]/95 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center z-30">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-500 border border-rose-500/20 flex items-center justify-center mb-3">
              <WifiOff className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-bold text-white">{errorMessage}</h4>
            <p className="text-[11px] text-slate-400 mt-1 max-w-xs">
              Check internet connection or switch to another live channel below.
            </p>
            <button
              onClick={() => currentChannel && loadStream(currentChannel)}
              className="mt-4 flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-rose-600 to-amber-500 text-white text-xs font-black shadow-lg shadow-rose-600/20 active:scale-95 transition"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Retry Stream</span>
            </button>
          </div>
        )}

        {/* Play Pause click cover */}
        {!isLoading && !isError && (
          <button
            onClick={togglePlay}
            className="absolute inset-0 flex items-center justify-center bg-transparent z-0 group"
          >
            {!isPlaying && (
              <div className="w-14 h-14 rounded-full bg-amber-500/90 hover:bg-amber-400 text-black flex items-center justify-center shadow-xl shadow-amber-500/30 transform transition active:scale-90">
                <Play className="w-7 h-7 fill-current ml-0.5" />
              </div>
            )}
          </button>
        )}
      </div>

      {/* Currently Playing Channel Info Card */}
      {currentChannel && (
        <div className="p-3.5 rounded-2xl bg-[#14141e] border border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-black text-white shadow-sm shrink-0"
              style={{ backgroundColor: `#${currentChannel.color}` }}
            >
              {currentChannel.name.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-white">{currentChannel.name}</h3>
                <span className="px-1.5 py-0.2 rounded bg-white/5 text-slate-400 text-[9px] font-semibold">
                  {currentChannel.category}
                </span>
              </div>
              <p className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-1">
                <Radio className="w-3 h-3 text-rose-400" />
                Live Broadcast · 24/7 Stream
              </p>
            </div>
          </div>

          <button
            onClick={() => currentChannel && loadStream(currentChannel)}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-amber-400 border border-white/5 transition"
            title="Refresh stream"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Category Filter Chips */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-1.5">
            <Tv className="w-3.5 h-3.5 text-amber-400" />
            Live Channels ({filteredChannels.length})
          </h3>
        </div>

        {/* Search Bar */}
        <div className="relative mb-3">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search channels…"
            className="w-full h-10 pl-9 pr-4 rounded-xl bg-[#14141e] border border-white/10 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-400 transition"
          />
        </div>

        {/* Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {categories.map((cat) => {
            const isActive = activeCategory === cat;
            return (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-3 py-1.5 rounded-full text-xs font-extrabold whitespace-nowrap transition ${
                  isActive
                    ? 'bg-rose-600 text-white shadow-md shadow-rose-600/30'
                    : 'bg-[#14141e] text-slate-400 hover:text-white border border-white/5'
                }`}
              >
                {cat}
              </button>
            );
          })}
        </div>
      </div>

      {/* Channels Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
        {filteredChannels.map((ch) => {
          const isSelected = currentChannel?.id === ch.id;
          return (
            <button
              key={ch.id}
              onClick={() => {
                onSelectChannel(ch);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className={`group relative overflow-hidden rounded-2xl p-3 text-left transition flex flex-col justify-between h-28 border ${
                isSelected
                  ? 'bg-gradient-to-b from-[#1c1c28] to-[#12121a] border-amber-400 shadow-[0_0_15px_rgba(234,179,8,0.2)]'
                  : 'bg-[#14141e] border-white/5 hover:border-white/20'
              }`}
            >
              <div className="flex justify-between items-start">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black text-white shadow-md"
                  style={{ backgroundColor: `#${ch.color}` }}
                >
                  {ch.name.slice(0, 2).toUpperCase()}
                </div>
                {isSelected ? (
                  <span className="px-1.5 py-0.2 rounded text-[8px] font-black bg-amber-400 text-black">
                    PLAYING
                  </span>
                ) : (
                  <span className="px-1.5 py-0.2 rounded text-[8px] font-bold bg-white/5 text-slate-400">
                    {ch.category}
                  </span>
                )}
              </div>

              <div>
                <h4
                  className={`text-xs font-bold truncate ${
                    isSelected ? 'text-amber-400' : 'text-white group-hover:text-amber-400'
                  }`}
                >
                  {ch.name}
                </h4>
                <p className="text-[10px] text-slate-500 mt-0.5">{ch.category} TV</p>
              </div>

              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition">
                <Play className="w-5 h-5 text-amber-400 fill-current" />
              </div>
            </button>
          );
        })}
      </div>

      {filteredChannels.length === 0 && (
        <div className="p-8 text-center rounded-2xl bg-[#14141e] border border-white/5">
          <p className="text-xs text-slate-400">No channels found matching "{searchQuery}"</p>
          <button
            onClick={() => {
              setSearchQuery('');
              setActiveCategory('ALL');
            }}
            className="mt-2 text-xs font-bold text-amber-400"
          >
            Clear filters
          </button>
        </div>
      )}
    </div>
  );
};
