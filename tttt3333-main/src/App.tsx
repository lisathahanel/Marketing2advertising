import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import {
  Bookmark,
  Compass,
  Download,
  Eye,
  Film,
  HardDriveDownload,
  History,
  LayoutGrid,
  Link2,
  Loader2,
  Play,
  Plus,
  RefreshCw,
  Search,
  ShieldAlert,
  Shuffle,
  Smartphone,
  Sparkles,
  Trash2,
  User,
  WifiOff,
  X,
} from 'lucide-react';
import { Header } from './components/Header';
import { CreatorStrip } from './components/CreatorStrip';
import { VideoCard } from './components/VideoCard';
import { ShortsFeed } from './components/ShortsFeed';
import { PlayerModal } from './components/PlayerModal';
import { MenuDrawer } from './components/MenuDrawer';
import { InstallAppModal } from './components/InstallAppModal';
import { Footer } from './components/Footer';
import { LegalModal, type LegalDocId } from './components/LegalModal';
import { AdSenseSlot } from './components/AdSenseSlot';
import { useMetaReachability } from './hooks/useMetaReachability';
import { useOnlineStatus, usePWAInstall } from './hooks/usePWAInstall';
import {
  clearAllOfflineVideos,
  formatBytes,
  getOfflineVideoKey,
  listOfflineVideos,
  loadFeedSnapshot,
  purgeExpiredOfflineVideos,
  removeOfflineVideo,
  saveFeedSnapshot,
  saveVideoFor24Hours,
  type OfflineSavedEntry,
} from './lib/offlineVault';
import {
  applyLocalReaction,
  applyLocalView,
  formatM2ACount,
  getOrCreateDeviceId,
  getTopEmojiSummary,
  getVideoEngagementKey,
  loadLocalEngagementMap,
  mergeServerEngagementIntoLocal,
} from './lib/engagement';
import {
  clearWatchHistory,
  getWatchlistKey,
  incrementDailyWatchStats,
  loadDailyWatchStats,
  loadWatchHistory,
  loadWatchlist,
  persistWatchlist,
  recordWatchHistoryItem,
  toggleWatchlistItem,
  type DailyWatchStats,
} from './lib/watchlist';
import type {
  CategoryId,
  CreatorAudience,
  CreatorProfile,
  CreatorResponse,
  EmojiKey,
  SourceFilter,
  VideoEngagement,
  VideoItem,
  VideosResponse,
  ViewMode,
} from './types';

const CATEGORIES: { id: CategoryId; label: string }[] = [
  { id: 'trending', label: 'All Ages' },
  { id: 'family', label: 'Kids & Cartoons' },
  { id: 'funny', label: 'Clean Laughs' },
  { id: 'restaurants', label: 'Food & Travel' },
  { id: 'gadgets', label: 'Tech & Gadgets' },
  { id: 'music', label: 'Music' },
  { id: 'education', label: 'Space & Science' },
  { id: 'sports', label: 'Sports' },
  { id: 'cars', label: 'Cars' },
  { id: 'howto', label: 'How-To' },
  { id: 'podcasts', label: 'Podcasts' },
  { id: 'news', label: 'News' },
];

const SOURCE_TABS: { id: SourceFilter; label: string }[] = [
  { id: 'all', label: 'All Apps' },
  { id: 'offline', label: 'Offline 24h' },
  { id: 'youtube', label: 'YouTube' },
  { id: 'tiktok', label: 'TikTok' },
  { id: 'instagram', label: 'Instagram' },
  { id: 'facebook', label: 'Facebook' },
  { id: 'tilvids', label: 'TILvids' },
  { id: 'nasa', label: 'NASA' },
];

const CURATED_META_CREATORS: { handle: string; displayName: string; tag: string }[] = [
  { handle: 'BestEverFoodReviewShow', displayName: 'Best Ever Food Review', tag: 'Food & Travel' },
  { handle: 'MrBeast', displayName: 'MrBeast', tag: 'Challenges' },
  { handle: 'SamSpedy', displayName: 'SamSpedy', tag: 'Clean Comedy' },
  { handle: 'NatGeo', displayName: 'National Geographic', tag: 'Science & Wildlife' },
  { handle: 'BBCNews', displayName: 'BBC News', tag: 'World News' },
  { handle: 'MunaUG256', displayName: 'Muna UG 256', tag: 'Entertainment' },
];

const DEFAULT_CREATORS: CreatorProfile[] = [
  { handle: 'BestEverFoodReviewShow', displayName: 'Best Ever Food Review Show', avatar: '', platforms: ['youtube'], audience: 'food_travel' },
  { handle: 'MrBeast', displayName: 'MrBeast', avatar: '', platforms: ['youtube'], audience: 'comedy_fun' },
  { handle: 'SamSpedy', displayName: 'SamSpedy', avatar: '', platforms: ['youtube'], audience: 'comedy_fun' },
  { handle: 'NatGeo', displayName: 'NatGeo', avatar: '', platforms: ['youtube'], audience: 'science_news' },
  { handle: 'BBCNews', displayName: 'BBC News', avatar: '', platforms: ['youtube'], audience: 'science_news' },
  { handle: 'tseries', displayName: 'T-Series', avatar: '', platforms: ['youtube'], audience: 'comedy_fun' },
  { handle: 'CoComelon', displayName: 'CoComelon', avatar: '', platforms: ['youtube'], audience: 'kids' },
  { handle: 'SETIndia', displayName: 'SET India', avatar: '', platforms: ['youtube'], audience: 'comedy_fun' },
  { handle: 'kimpro828', displayName: 'KIMPRO', avatar: '', platforms: ['youtube'], audience: 'comedy_fun' },
  { handle: 'SonySAB', displayName: 'Sony SAB', avatar: '', platforms: ['youtube'], audience: 'comedy_fun' },
  { handle: 'KidsDianaShow', displayName: 'Kids Diana Show', avatar: '', platforms: ['youtube'], audience: 'kids' },
  { handle: 'AnayaKandhal', displayName: 'Anaya Kandhal', avatar: '', platforms: ['youtube'], audience: 'kids' },
  { handle: 'VladandNiki', displayName: 'Vlad and Niki', avatar: '', platforms: ['youtube'], audience: 'kids' },
  { handle: 'LikeNastyaofficial', displayName: 'Like Nastya', avatar: '', platforms: ['youtube'], audience: 'kids' },
  { handle: 'toysandcolors', displayName: 'Toys and Colors', avatar: '', platforms: ['youtube'], audience: 'kids' },
  { handle: 'klbrobijurithvik1', displayName: 'KL BRO Biju Rithvik', avatar: '', platforms: ['youtube'], audience: 'comedy_fun' },
  { handle: 'GossipLive', displayName: 'Gossip Live', avatar: '', platforms: ['youtube'], audience: 'comedy_fun' },
  { handle: 'NatGeoAnimals', displayName: 'Nat Geo Animals', avatar: '', platforms: ['youtube'], audience: 'science_news' },
  { handle: 'Nicktoons', displayName: 'Nicktoons', avatar: '', platforms: ['youtube'], audience: 'kids' },
  { handle: 'cnindia', displayName: 'CN India', avatar: '', platforms: ['youtube'], audience: 'kids' },
  { handle: 'Nickelodeon', displayName: 'Nickelodeon', avatar: '', platforms: ['youtube'], audience: 'kids' },
  { handle: 'NickelodeonUK', displayName: 'Nickelodeon UK', avatar: '', platforms: ['youtube'], audience: 'kids' },
  { handle: 'MunaUG256', displayName: 'Muna UG 256', avatar: '', platforms: ['youtube'], audience: 'comedy_fun' },
];

const CUSTOM_CREATORS_KEY = 'reelbox_custom_creators_v1';
const SEEN_VIDEOS_KEY = 'reelbox_seen_videos_v1';
const SAVED_META_LINKS_KEY = 'm2a_saved_meta_links_v1';
const RELOAD_ROTATION_KEY = 'm2a_reload_rotation_v1';
const MAX_SEEN_IDS = 1500;
const MAX_SAVED_META_LINKS = 50;

function createSessionReloadSeed(): number {
  let nextCounter = 1;
  try {
    const prev = Number.parseInt(localStorage.getItem(RELOAD_ROTATION_KEY) || '0', 10) || 0;
    nextCounter = (prev + 1) % 100000;
    localStorage.setItem(RELOAD_ROTATION_KEY, String(nextCounter));
  } catch {
    nextCounter = Math.floor(Math.random() * 10000);
  }
  const jitter = Math.floor(Math.random() * 997) + 1;
  return nextCounter * 131 + jitter;
}

function loadSavedMetaLinks(): VideoItem[] {
  try {
    const raw = localStorage.getItem(SAVED_META_LINKS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (v): v is VideoItem =>
        Boolean(v) &&
        typeof v.id === 'string' &&
        (v.source === 'instagram' || v.source === 'facebook') &&
        typeof v.title === 'string'
    );
  } catch {
    return [];
  }
}

function persistSavedMetaLinks(items: VideoItem[]): void {
  try {
    localStorage.setItem(
      SAVED_META_LINKS_KEY,
      JSON.stringify(items.slice(0, MAX_SAVED_META_LINKS))
    );
  } catch {
    // ignore storage errors
  }
}

function loadSavedCreators(): CreatorProfile[] {
  try {
    const raw = localStorage.getItem(CUSTOM_CREATORS_KEY);
    if (!raw) return DEFAULT_CREATORS;
    const parsed = JSON.parse(raw) as CreatorProfile[];
    if (!Array.isArray(parsed)) return DEFAULT_CREATORS;
    const merged = [...DEFAULT_CREATORS];
    for (const c of parsed) {
      if (
        c &&
        typeof c.handle === 'string' &&
        !merged.some((m) => m.handle.toLowerCase() === c.handle.toLowerCase())
      ) {
        merged.push({ ...c, isCustom: true });
      }
    }
    return merged;
  } catch {
    return DEFAULT_CREATORS;
  }
}

function loadSeenIds(): string[] {
  try {
    const raw = localStorage.getItem(SEEN_VIDEOS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.filter((x): x is string => typeof x === 'string')
      : [];
  } catch {
    return [];
  }
}

export default function App() {
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [category, setCategory] = useState<CategoryId>('trending');
  const [source, setSource] = useState<SourceFilter>('all');
  const [searchInput, setSearchInput] = useState('');
  const [activeQuery, setActiveQuery] = useState('');

  const [creators, setCreators] = useState<CreatorProfile[]>(loadSavedCreators);
  const creatorsRef = useRef<CreatorProfile[]>(creators);
  creatorsRef.current = creators;
  const sessionSeedRef = useRef<number>(createSessionReloadSeed());
  const [creatorAudience, setCreatorAudience] = useState<CreatorAudience>('all');
  const [activeCreatorHandle, setActiveCreatorHandle] = useState<string | null>(null);
  const [loadingCreatorHandle, setLoadingCreatorHandle] = useState<string | null>(null);
  const [creatorNotice, setCreatorNotice] = useState<string | null>(null);

  const [seenIds, setSeenIds] = useState<string[]>(loadSeenIds);
  const seenIdsRef = useRef<string[]>(seenIds);
  seenIdsRef.current = seenIds;

  const [watchlist, setWatchlist] = useState<VideoItem[]>(loadWatchlist);
  const [watchHistory, setWatchHistory] = useState<VideoItem[]>(loadWatchHistory);
  const [dailyStats, setDailyStats] = useState<DailyWatchStats>(loadDailyWatchStats);

  const [selectedVideo, setSelectedVideo] = useState<VideoItem | null>(null);
  const [skipNotice, setSkipNotice] = useState<string | null>(null);
  const [heroImgFailed, setHeroImgFailed] = useState(false);

  const [menuOpen, setMenuOpen] = useState(false);
  const [installModalOpen, setInstallModalOpen] = useState(false);
  const [legalDoc, setLegalDoc] = useState<LegalDocId | null>(null);

  const [offlineEntries, setOfflineEntries] = useState<OfflineSavedEntry[]>([]);
  const offlineEntriesRef = useRef<OfflineSavedEntry[]>([]);
  offlineEntriesRef.current = offlineEntries;
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [packProgress, setPackProgress] = useState<string | null>(null);
  const [offlineNotice, setOfflineNotice] = useState<string | null>(null);

  const [savedMetaLinks, setSavedMetaLinks] = useState<VideoItem[]>(loadSavedMetaLinks);
  const savedMetaLinksRef = useRef<VideoItem[]>(savedMetaLinks);
  savedMetaLinksRef.current = savedMetaLinks;
  const [metaLinkInput, setMetaLinkInput] = useState('');
  const [metaLinkBusy, setMetaLinkBusy] = useState(false);
  const [metaLinkNotice, setMetaLinkNotice] = useState<string | null>(null);

  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const isOnline = useOnlineStatus();
  const { metaStatus, anyMetaBlocked, recheckMeta, markMetaBlocked, isMetaBlocked } =
    useMetaReachability(isOnline);
  const metaStatusRef = useRef(metaStatus);
  metaStatusRef.current = metaStatus;
  const prevOnlineRef = useRef(isOnline);

  const sentinelRef = useRef<HTMLDivElement>(null);
  const autoSkipCountRef = useRef(0);
  const deviceIdRef = useRef<string>(getOrCreateDeviceId());
  const [engagementMap, setEngagementMap] = useState<Record<string, VideoEngagement>>(
    loadLocalEngagementMap
  );

  const watchlistKeys = useMemo(() => {
    const s = new Set<string>();
    for (const item of watchlist) {
      s.add(getWatchlistKey(item));
    }
    return s;
  }, [watchlist]);

  const offlineMap = useMemo(() => {
    const map: Record<string, OfflineSavedEntry> = {};
    for (const entry of offlineEntries) {
      map[entry.key] = entry;
    }
    return map;
  }, [offlineEntries]);

  const offlineTotalBytes = useMemo(
    () => offlineEntries.reduce((acc, e) => acc + e.sizeBytes, 0),
    [offlineEntries]
  );

  const refreshOfflineVault = useCallback(async () => {
    const valid = await listOfflineVideos();
    setOfflineEntries(valid);
    return valid;
  }, []);

  useEffect(() => {
    void refreshOfflineVault();
    const timer = setInterval(() => {
      void purgeExpiredOfflineVideos().then(setOfflineEntries);
    }, 60_000);
    return () => clearInterval(timer);
  }, [refreshOfflineVault]);

  const handleToggleWatchlist = useCallback((video: VideoItem) => {
    setWatchlist((prev) => toggleWatchlistItem(prev, video).next);
  }, []);

  const handleClearWatchlist = useCallback(() => {
    persistWatchlist([]);
    setWatchlist([]);
  }, []);

  const handleClearHistory = useCallback(() => {
    clearWatchHistory();
    setWatchHistory([]);
  }, []);

  const handleInstallClick = async () => {
    if (isInstalled) return;
    if (isInstallable) {
      const result = await install();
      if (result !== 'accepted') {
        setInstallModalOpen(true);
      }
      return;
    }
    setInstallModalOpen(true);
  };

  const handleToggleOfflineSave = useCallback(
    async (video: VideoItem) => {
      const key = getOfflineVideoKey(video);
      if (offlineEntriesRef.current.some((e) => e.key === key)) {
        await removeOfflineVideo(key);
        const next = await refreshOfflineVault();
        setOfflineNotice('Removed from 24h Offline Vault.');
        if (source === 'offline') {
          setVideos(next.map((e) => e.video));
        }
        return;
      }

      setSavingKey(key);
      setOfflineNotice(null);
      try {
        await saveVideoFor24Hours(video);
        await refreshOfflineVault();
        setOfflineNotice(`"${video.title}" saved to watch offline for 24 hours.`);
      } catch (err) {
        setOfflineNotice(
          err instanceof Error ? err.message : 'Unable to save video offline.'
        );
      } finally {
        setSavingKey(null);
      }
    },
    [refreshOfflineVault, source]
  );

  const handleDownloadOfflinePack = useCallback(async () => {
    if (!isOnline || packProgress) return;
    setOfflineNotice(null);
    setPackProgress('Finding compact offline videos...');

    try {
      const resp = await fetch('/api/offline-pack');
      if (!resp.ok) throw new Error('Could not fetch offline pack.');
      const data = (await resp.json()) as { videos?: VideoItem[] };
      const existingKeys = new Set(offlineEntriesRef.current.map((e) => e.key));
      const candidates = (data.videos || [])
        .filter((v) => !existingKeys.has(getOfflineVideoKey(v)))
        .slice(0, 6);

      if (candidates.length === 0) {
        setOfflineNotice('Your 24h Offline Pack is already downloaded.');
        return;
      }

      let savedCount = 0;
      for (let i = 0; i < candidates.length; i++) {
        setPackProgress(`Saving ${i + 1}/${candidates.length} for 24h offline...`);
        try {
          await saveVideoFor24Hours(candidates[i]);
          savedCount += 1;
          await refreshOfflineVault();
        } catch {
          // continue with remaining videos if one fails
        }
      }

      if (savedCount > 0) {
        setOfflineNotice(
          `Saved ${savedCount} ${savedCount === 1 ? 'video' : 'videos'} for 24 hours of offline viewing without internet.`
        );
      } else {
        setOfflineNotice('Could not download offline pack right now. Try saving individual NASA or TILvids clips.');
      }
    } catch (err) {
      setOfflineNotice(
        err instanceof Error ? err.message : 'Unable to prepare offline pack.'
      );
    } finally {
      setPackProgress(null);
    }
  }, [isOnline, packProgress, refreshOfflineVault]);

  const handleClearOfflineVault = useCallback(async () => {
    await clearAllOfflineVideos();
    setOfflineEntries([]);
    setOfflineNotice('Cleared all 24h offline videos.');
    if (source === 'offline') {
      setVideos([]);
    }
  }, [source]);

  const markVideoSeen = useCallback((video: VideoItem) => {
    const key = `${video.source}:${video.id}`;
    setSeenIds((prev) => {
      if (prev.includes(key)) return prev;
      const next = [key, ...prev].slice(0, MAX_SEEN_IDS);
      try {
        localStorage.setItem(SEEN_VIDEOS_KEY, JSON.stringify(next));
      } catch {
        // ignore storage quota errors
      }
      return next;
    });
  }, []);

  const resetSeenHistory = () => {
    setSeenIds([]);
    seenIdsRef.current = [];
    try {
      localStorage.removeItem(SEEN_VIDEOS_KEY);
    } catch {
      // ignore
    }
    void loadVideos(activeQuery, source, category, viewMode, 0, false, true);
  };

  const saveCustomCreators = (list: CreatorProfile[]) => {
    try {
      const customOnly = list.filter((c) => c.isCustom);
      localStorage.setItem(CUSTOM_CREATORS_KEY, JSON.stringify(customOnly));
    } catch {
      // ignore storage errors
    }
  };

  const loadVideos = useCallback(
    async (
      q: string,
      src: SourceFilter,
      cat: CategoryId,
      mode: ViewMode,
      pageNum: number,
      append: boolean,
      fresh = false
    ) => {
      if (src === 'offline') {
        const valid = await refreshOfflineVault();
        const lowerQ = q.trim().toLowerCase();
        const list = valid
          .map((e) => e.video)
          .filter(
            (v) =>
              !lowerQ ||
              v.title.toLowerCase().includes(lowerQ) ||
              v.author.toLowerCase().includes(lowerQ)
          );
        setVideos(list);
        setLoading(false);
        setLoadingMore(false);
        setHasMore(false);
        setError(null);
        return;
      }

      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        const valid = await refreshOfflineVault();
        const savedList = valid.map((e) => e.video);
        const snapshot = loadFeedSnapshot();
        const combined = savedList.length > 0 ? savedList : snapshot;
        setVideos(combined);
        setLoading(false);
        setLoadingMore(false);
        setHasMore(false);
        setError(null);
        return;
      }

      if (append) {
        setLoadingMore(true);
      } else {
        setLoading(true);
        setError(null);
      }

      try {
        const currentSeen = seenIdsRef.current;
        const resp = await fetch('/api/videos', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            q,
            source: src,
            category: cat,
            mode: mode === 'shorts' ? 'shorts' : 'all',
            page: pageNum,
            fresh: fresh || pageNum === 0,
            seed: sessionSeedRef.current + pageNum * 31,
            creatorHandles: creatorsRef.current.map((c) => c.handle),
            seenIds: currentSeen.slice(0, 600),
          }),
        });
        if (!resp.ok) {
          throw new Error('Could not load videos right now.');
        }
        const data = (await resp.json()) as VideosResponse;
        const seenLookup = new Set(currentSeen);
        const currentMeta = metaStatusRef.current;

        const isAllowedForNetwork = (v: VideoItem) => {
          if (v.source === 'instagram' && currentMeta.instagram === 'blocked') return false;
          if (v.source === 'facebook' && currentMeta.facebook === 'blocked') return false;
          return true;
        };

        if (data.resolvedDirectUrl && data.videos?.length === 1) {
          const resolvedItem = data.videos[0];
          if (resolvedItem.source === 'instagram' || resolvedItem.source === 'facebook') {
            setSavedMetaLinks((prev) => {
              const deduped = prev.filter(
                (x) => !(x.source === resolvedItem.source && x.id === resolvedItem.id)
              );
              const next = [resolvedItem, ...deduped].slice(0, MAX_SAVED_META_LINKS);
              persistSavedMetaLinks(next);
              return next;
            });
          }
        }

        let incoming = (data.videos || []).filter((v) =>
          data.resolvedDirectUrl
            ? true
            : isAllowedForNetwork(v) && !seenLookup.has(`${v.source}:${v.id}`)
        );

        if (!append && !data.resolvedDirectUrl) {
          const lowerQ = q.trim().toLowerCase();
          const savedMatching = savedMetaLinksRef.current.filter((v) => {
            if (!isAllowedForNetwork(v)) return false;
            if (seenLookup.has(`${v.source}:${v.id}`)) return false;
            if (src !== 'all' && v.source !== src) return false;
            if (
              lowerQ &&
              !v.title.toLowerCase().includes(lowerQ) &&
              !v.author.toLowerCase().includes(lowerQ)
            ) {
              return false;
            }
            return true;
          });
          if (src === 'instagram' || src === 'facebook') {
            incoming = savedMatching;
          } else if (src === 'all' && pageNum === 0 && savedMatching.length > 0) {
            incoming = [...savedMatching.slice(0, 4), ...incoming];
          }
        }

        if (append) {
          setVideos((prev) => {
            const existing = new Set(prev.map((v) => `${v.source}:${v.id}`));
            const freshItems = incoming.filter((v) => !existing.has(`${v.source}:${v.id}`));
            return [...prev, ...freshItems];
          });
        } else {
          setVideos(incoming);
          setHeroImgFailed(false);
          if (!data.resolvedDirectUrl && incoming.length > 0) {
            saveFeedSnapshot(incoming);
          }
        }

        setPage(pageNum);
        setHasMore(Boolean(data.hasMore));

        if (!append && data.resolvedDirectUrl && incoming.length === 1) {
          const directItem = incoming[0];
          if (!isAllowedForNetwork(directItem)) {
            setMetaLinkNotice(
              `${directItem.source === 'instagram' ? 'Instagram' : 'Facebook'} appears blocked on your current network. Try switching to YouTube, TikTok, TILvids, or NASA.`
            );
          } else {
            handleOpenVideo(directItem);
          }
        }
      } catch (err) {
        if (!append) {
          const valid = await refreshOfflineVault();
          const savedList = valid.map((e) => e.video);
          const snapshot = loadFeedSnapshot();
          if (savedList.length > 0 || snapshot.length > 0) {
            setVideos(savedList.length > 0 ? savedList : snapshot);
            setError(null);
          } else {
            setError(
              err instanceof Error ? err.message : 'Unable to reach video feed.'
            );
          }
        }
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [refreshOfflineVault]
  );

  const handleOpenVideo = useCallback(
    (video: VideoItem) => {
      autoSkipCountRef.current = 0;
      setSkipNotice(null);
      setSelectedVideo(video);
      setWatchHistory((prev) => recordWatchHistoryItem(prev, video));
      setDailyStats((prev) => incrementDailyWatchStats(prev));
      if (source !== 'offline') {
        markVideoSeen(video);
      }
    },
    [markVideoSeen, source]
  );

  const handleAutoSkip = useCallback(
    (badVideo: VideoItem) => {
      if (!isOnline) return;
      markVideoSeen(badVideo);
      autoSkipCountRef.current += 1;
      setSkipNotice('Skipped unavailable video');
      setTimeout(() => setSkipNotice(null), 1800);

      setVideos((prev) => {
        const idx = prev.findIndex(
          (v) => v.id === badVideo.id && v.source === badVideo.source
        );
        const filtered = prev.filter(
          (v) => !(v.id === badVideo.id && v.source === badVideo.source)
        );
        if (
          selectedVideo &&
          selectedVideo.id === badVideo.id &&
          selectedVideo.source === badVideo.source
        ) {
          if (autoSkipCountRef.current <= 5 && filtered.length > 0) {
            const nextIdx = idx >= 0 && idx < filtered.length ? idx : 0;
            const nextVid = filtered[nextIdx];
            setSelectedVideo(nextVid);
            markVideoSeen(nextVid);
          } else {
            setSelectedVideo(null);
          }
        }
        return filtered;
      });
    },
    [isOnline, markVideoSeen, selectedVideo]
  );

  const handleClosePlayer = () => {
    if (source !== 'offline') {
      const seenLookup = new Set(seenIdsRef.current);
      setVideos((prev) => prev.filter((v) => !seenLookup.has(`${v.source}:${v.id}`)));
    }
    setSelectedVideo(null);
    setSkipNotice(null);
  };

  useEffect(() => {
    const wasOnline = prevOnlineRef.current;
    prevOnlineRef.current = isOnline;
    if (wasOnline && !isOnline && offlineEntriesRef.current.length > 0 && source !== 'offline') {
      setSource('offline');
      setActiveCreatorHandle(null);
    } else if (!wasOnline && isOnline && source !== 'offline') {
      void loadVideos(activeQuery, source, category, viewMode, 0, false, false);
    }
  }, [isOnline, source, activeQuery, category, viewMode, loadVideos]);

  useEffect(() => {
    if (activeCreatorHandle || viewMode === 'watchlist') return;
    void loadVideos(activeQuery, source, category, viewMode, 0, false, false);
  }, [activeQuery, source, category, viewMode, activeCreatorHandle, loadVideos]);

  useEffect(() => {
    if (source === 'offline') return;
    if (metaStatus.instagram === 'blocked' || metaStatus.facebook === 'blocked') {
      setVideos((prev) =>
        prev.filter((v) => {
          if (v.source === 'instagram' && metaStatus.instagram === 'blocked') return false;
          if (v.source === 'facebook' && metaStatus.facebook === 'blocked') return false;
          return true;
        })
      );
    }
  }, [metaStatus, source]);

  const handleAddMetaLink = async (e: React.FormEvent) => {
    e.preventDefault();
    const raw = metaLinkInput.trim();
    if (!raw || metaLinkBusy) return;
    if (!isOnline) {
      setMetaLinkNotice('Connect to the internet to add an Instagram Reel or Facebook link.');
      return;
    }

    setMetaLinkBusy(true);
    setMetaLinkNotice(null);
    try {
      const resp = await fetch('/api/videos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ q: raw, source: 'all', category, mode: 'all', page: 0 }),
      });
      if (!resp.ok) throw new Error('Could not resolve that link.');
      const data = (await resp.json()) as VideosResponse;
      const item = data.videos?.[0];
      if (!item || (item.source !== 'instagram' && item.source !== 'facebook')) {
        setMetaLinkNotice(
          'Paste a valid public Instagram Reel/Post link or Facebook Watch/Reel/fb.watch link.'
        );
        return;
      }
      setSavedMetaLinks((prev) => {
        const deduped = prev.filter((x) => !(x.source === item.source && x.id === item.id));
        const next = [item, ...deduped].slice(0, MAX_SAVED_META_LINKS);
        persistSavedMetaLinks(next);
        return next;
      });
      setMetaLinkInput('');
      if (source === item.source || source === 'all') {
        setVideos((prev) => [
          item,
          ...prev.filter((x) => !(x.source === item.source && x.id === item.id)),
        ]);
      }
      if (!isMetaBlocked(item.source)) {
        handleOpenVideo(item);
      }
    } catch (err) {
      setMetaLinkNotice(err instanceof Error ? err.message : 'Unable to add link.');
    } finally {
      setMetaLinkBusy(false);
    }
  };

  const handleLoadMore = useCallback(() => {
    if (loading || loadingMore || !hasMore || activeCreatorHandle || viewMode === 'watchlist') {
      return;
    }
    void loadVideos(activeQuery, source, category, viewMode, page + 1, true, false);
  }, [
    loading,
    loadingMore,
    hasMore,
    activeCreatorHandle,
    viewMode,
    activeQuery,
    source,
    category,
    page,
    loadVideos,
  ]);

  useEffect(() => {
    if (viewMode !== 'grid' || !hasMore || activeCreatorHandle) return;
    const node = sentinelRef.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          handleLoadMore();
        }
      },
      { rootMargin: '320px' }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [viewMode, hasMore, activeCreatorHandle, handleLoadMore]);

  const loadCreatorVideos = async (handle: string, addIfNew = false) => {
    const clean = handle.trim().replace(/^@+/, '');
    if (!clean) return;

    if (!isOnline) {
      setCreatorNotice(
        `You are offline — reconnect to load @${clean}, or switch to Offline 24h videos.`
      );
      return;
    }

    setViewMode('grid');
    setLoadingCreatorHandle(clean);
    setCreatorNotice(null);
    setError(null);
    setLoading(true);

    try {
      const resp = await fetch(`/api/creator?username=${encodeURIComponent(clean)}`);
      if (!resp.ok) {
        const body = (await resp.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error || 'Could not load that username.');
      }
      const data = (await resp.json()) as CreatorResponse;
      if (!data.videos || data.videos.length === 0) {
        setCreatorNotice(`No public family-safe videos found for @${clean}. Try another username.`);
        setActiveCreatorHandle(null);
        void loadVideos(activeQuery, source, category, 'grid', 0, false, false);
        return;
      }

      const seenLookup = new Set(seenIdsRef.current);
      const unseenCreatorVideos = data.videos.filter(
        (v) => !seenLookup.has(`${v.source}:${v.id}`)
      );

      setActiveCreatorHandle(data.creator.handle);
      setVideos(unseenCreatorVideos.length > 0 ? unseenCreatorVideos : data.videos);
      setHasMore(false);
      setSearchInput('');
      setActiveQuery('');

      setCreators((prev) => {
        const idx = prev.findIndex(
          (c) => c.handle.toLowerCase() === data.creator.handle.toLowerCase()
        );
        let next: CreatorProfile[];
        if (idx >= 0) {
          next = prev.map((c, i) =>
            i === idx
              ? {
                  ...c,
                  displayName: data.creator.displayName || c.displayName,
                  avatar: data.creator.avatar || c.avatar,
                  platforms: data.creator.platforms,
                }
              : c
          );
        } else if (addIfNew) {
          next = [{ ...data.creator, isCustom: true }, ...prev];
        } else {
          next = prev;
        }
        saveCustomCreators(next);
        return next;
      });
    } catch (err) {
      setCreatorNotice(
        err instanceof Error ? err.message : 'Unable to look up username.'
      );
      setActiveCreatorHandle(null);
    } finally {
      setLoadingCreatorHandle(null);
      setLoading(false);
    }
  };

  const handleSelectCreator = (handle: string | null) => {
    setCreatorNotice(null);
    if (!handle) {
      setActiveCreatorHandle(null);
      return;
    }
    void loadCreatorVideos(handle, true);
  };

  const handleRemoveCreator = (handle: string) => {
    setCreators((prev) => {
      const next = prev.filter(
        (c) => c.handle.toLowerCase() !== handle.toLowerCase()
      );
      saveCustomCreators(next);
      return next;
    });
    if (activeCreatorHandle?.toLowerCase() === handle.toLowerCase()) {
      setActiveCreatorHandle(null);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = searchInput.trim();
    setCreatorNotice(null);
    if (viewMode === 'watchlist') setViewMode('grid');
    if (/^@[a-zA-Z0-9_.-]{2,50}$/.test(trimmed)) {
      void loadCreatorVideos(trimmed, true);
      return;
    }
    setActiveCreatorHandle(null);
    setActiveQuery(trimmed);
  };

  const handleClearSearch = () => {
    setSearchInput('');
    setActiveQuery('');
    setActiveCreatorHandle(null);
    setCreatorNotice(null);
  };

  const handleSelectCategory = (cat: CategoryId) => {
    setActiveCreatorHandle(null);
    setCreatorNotice(null);
    if (source === 'offline') setSource('all');
    if (viewMode === 'watchlist') setViewMode('grid');
    setCategory(cat);
    if (cat === 'family') {
      setCreatorAudience('kids');
    } else if (cat === 'trending') {
      setCreatorAudience('all');
    }
    if (activeQuery) {
      setSearchInput('');
      setActiveQuery('');
    }
  };

  const handleJumpToCreators = () => {
    if (viewMode === 'watchlist' || viewMode === 'shorts') {
      setViewMode('grid');
    }
    requestAnimationFrame(() => {
      document.getElementById('m2a-creators-lounge')?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    });
  };

  const handleOpenOffline = () => {
    setActiveCreatorHandle(null);
    setViewMode('grid');
    setSource('offline');
  };

  const handleRandomPlay = () => {
    const pool =
      viewMode === 'watchlist'
        ? watchlist.length > 0
          ? watchlist
          : watchHistory
        : videos;
    if (pool.length === 0) return;
    const pick = pool[Math.floor(Math.random() * pool.length)];
    handleOpenVideo(pick);
  };

  const handleRefreshNew = useCallback(() => {
    if (activeCreatorHandle) {
      void loadCreatorVideos(activeCreatorHandle, false);
      return;
    }
    sessionSeedRef.current =
      (sessionSeedRef.current + 137 + Math.floor(Math.random() * 97)) % 1_000_000;
    void loadVideos(activeQuery, source, category, viewMode, 0, false, true);
  }, [activeCreatorHandle, activeQuery, source, category, viewMode, loadVideos]);

  // Sync per-device M2A views & emoji reaction counts for currently loaded videos + watchlist
  useEffect(() => {
    if (!isOnline) return;
    const pool = viewMode === 'watchlist' ? [...watchlist, ...watchHistory] : videos;
    if (pool.length === 0) return;

    let active = true;
    const keys = Array.from(new Set(pool.map((v) => getVideoEngagementKey(v)))).slice(0, 100);
    fetch('/api/engagement/batch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deviceId: deviceIdRef.current, videoKeys: keys }),
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { stats?: Record<string, VideoEngagement> } | null) => {
        if (!active || !data?.stats) return;
        const merged = mergeServerEngagementIntoLocal(data.stats);
        setEngagementMap((prev) => ({ ...prev, ...merged }));
      })
      .catch(() => {
        // offline or transient failure — keep local cache
      });
    return () => {
      active = false;
    };
  }, [videos, watchlist, watchHistory, viewMode, isOnline]);

  const handleRecordView = useCallback(
    (video: VideoItem) => {
      const videoKey = getVideoEngagementKey(video);
      const { changed, engagement } = applyLocalView(videoKey);
      if (changed) {
        setEngagementMap((prev) => ({ ...prev, [videoKey]: engagement }));
      }
      if (!isOnline) return;
      fetch('/api/engagement/view', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deviceId: deviceIdRef.current, videoKey }),
      })
        .then((r) => (r.ok ? r.json() : null))
        .then((data: { engagement?: VideoEngagement } | null) => {
          if (!data?.engagement) return;
          const merged = mergeServerEngagementIntoLocal({ [videoKey]: data.engagement });
          setEngagementMap((prev) => ({ ...prev, ...merged }));
        })
        .catch(() => {
          // ignore network error; local view remains recorded for this device
        });
    },
    [isOnline]
  );

  const handleReactEmoji = useCallback(
    (video: VideoItem, emoji: EmojiKey) => {
      const videoKey = getVideoEngagementKey(video);
      const { targetEmoji, engagement } = applyLocalReaction(videoKey, emoji);
      setEngagementMap((prev) => ({ ...prev, [videoKey]: engagement }));

      if (!isOnline) return;
      fetch('/api/engagement/react', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deviceId: deviceIdRef.current,
          videoKey,
          emoji: targetEmoji,
        }),
      })
        .then((r) => (r.ok ? r.json() : null))
        .then((data: { engagement?: VideoEngagement } | null) => {
          if (!data?.engagement) return;
          const merged = mergeServerEngagementIntoLocal({ [videoKey]: data.engagement });
          setEngagementMap((prev) => ({ ...prev, ...merged }));
        })
        .catch(() => {
          // ignore transient sync error
        });
    },
    [isOnline]
  );

  const handleSupportCreator = (video: VideoItem) => {
    setSelectedVideo(null);
    setSkipNotice(null);
    setViewMode('grid');
    if (video.authorHandle) {
      setCreatorNotice(
        `Supporting @${video.authorHandle} — saved to Creators & showing their videos.`
      );
      void loadCreatorVideos(video.authorHandle, true);
      return;
    }
    const authorQuery = video.author.trim();
    if (authorQuery) {
      setActiveCreatorHandle(null);
      setSearchInput(authorQuery);
      setActiveQuery(authorQuery);
      setCreatorNotice(`Supporting ${authorQuery} — showing matching videos.`);
    }
  };

  const featuredVideo = videos[0] ?? null;
  const featuredEngagement = featuredVideo
    ? engagementMap[getVideoEngagementKey(featuredVideo)]
    : undefined;
  const featuredEmojiSummary = getTopEmojiSummary(featuredEngagement);

  const showHero =
    viewMode === 'grid' &&
    !activeQuery &&
    !activeCreatorHandle &&
    category === 'trending' &&
    source === 'all';

  const gridVideos = showHero && videos.length > 4 ? videos.slice(1) : videos;

  const activeCreatorObj = activeCreatorHandle
    ? creators.find(
        (c) => c.handle.toLowerCase() === activeCreatorHandle.toLowerCase()
      )
    : null;

  const activePlaylist =
    viewMode === 'watchlist'
      ? watchlist.length > 0
        ? watchlist
        : watchHistory
      : videos;

  return (
    <div className="min-h-screen flex flex-col bg-[#09090B] text-zinc-50">
      <Header
        activeCategory={category}
        activeSource={source}
        viewMode={viewMode}
        onSelectCategory={handleSelectCategory}
        onSelectViewMode={setViewMode}
        onJumpToCreators={handleJumpToCreators}
        onOpenOffline={handleOpenOffline}
        onOpenMenu={() => setMenuOpen(true)}
      />

      <main className="flex-1 mx-auto w-full max-w-[1440px] px-4 sm:px-6 py-6 lg:px-10 lg:py-8 pb-20 md:pb-8">
        {showHero && (
          <section
            aria-label="Featured screening"
            className="m2a-fade-up mb-7 grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch"
          >
            <div className="lg:col-span-5 flex flex-col justify-between rounded-2xl border border-zinc-800/80 bg-[#121215] p-6 sm:p-7">
              <div>
                <p className="text-xs font-medium text-zinc-400">
                  marketing2advertising · All-Ages Watchroom
                </p>
                <h1 className="mt-2.5 font-display text-3xl sm:text-4xl xl:text-[2.55rem] font-bold tracking-tight leading-[1.08] text-balance text-zinc-50">
                  Every app, one clean stage — always something new.
                </h1>
                <p className="mt-3.5 text-[15px] leading-relaxed text-zinc-400 max-w-md">
                  Kids animations, clean comedy, food tours, space &amp; science,
                  music, and Shorts Scroll in one family-safe lounge with zero
                  repeats and zero login.
                </p>
              </div>

              <div className="mt-6 space-y-5">
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setViewMode('shorts')}
                    className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-rose-600 rounded-lg hover:bg-rose-500 active:scale-[0.98] transition-all duration-150 whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-500"
                  >
                    <Smartphone className="h-4 w-4" />
                    <span>Open Shorts Scroll</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleRandomPlay}
                    disabled={videos.length === 0}
                    className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-zinc-100 bg-zinc-800 rounded-lg border border-zinc-700 hover:bg-zinc-700 disabled:opacity-50 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    <Shuffle className="h-4 w-4 text-rose-400" />
                    <span>Surprise Me</span>
                  </button>

                  <button
                    type="button"
                    disabled={!isOnline || Boolean(packProgress)}
                    onClick={() => void handleDownloadOfflinePack()}
                    className="inline-flex items-center gap-2 px-3.5 py-2.5 text-xs font-semibold text-emerald-200 bg-emerald-950/60 rounded-lg border border-emerald-500/35 hover:bg-emerald-900/60 disabled:opacity-50 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    {packProgress ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        <span>{packProgress}</span>
                      </>
                    ) : (
                      <>
                        <HardDriveDownload className="h-3.5 w-3.5 text-emerald-400" />
                        <span>Save 24h Pack</span>
                      </>
                    )}
                  </button>

                  {!isInstalled && (
                    <button
                      type="button"
                      onClick={() => void handleInstallClick()}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-300 hover:text-white underline underline-offset-4 decoration-zinc-600 hover:decoration-zinc-300 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      <Download className="h-3.5 w-3.5 text-rose-400" />
                      <span>Install App</span>
                    </button>
                  )}
                </div>

                {/* Unboxed Session Progress Strip */}
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t border-zinc-800/80 pt-3.5 text-xs text-zinc-400 tabular-nums">
                  <span>
                    <strong className="font-semibold text-zinc-100">{dailyStats.count}</strong>{' '}
                    watched today
                  </span>
                  <span aria-hidden="true">·</span>
                  <button
                    type="button"
                    onClick={() => setViewMode('watchlist')}
                    className="hover:text-white transition-colors cursor-pointer"
                  >
                    <strong className="font-semibold text-zinc-100">{watchlist.length}</strong>{' '}
                    in Watchlist
                  </button>
                  <span aria-hidden="true">·</span>
                  <button
                    type="button"
                    onClick={handleOpenOffline}
                    className="hover:text-emerald-300 transition-colors cursor-pointer"
                  >
                    <strong className="font-semibold text-emerald-400">
                      {offlineEntries.length}
                    </strong>{' '}
                    offline 24h ready
                  </button>
                </div>
              </div>
            </div>

            <div className="lg:col-span-7">
              {featuredVideo ? (
                <button
                  type="button"
                  onClick={() => handleOpenVideo(featuredVideo)}
                  className="group relative h-full min-h-[250px] lg:min-h-[340px] w-full overflow-hidden rounded-2xl border border-zinc-800/80 bg-zinc-900 text-left focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-rose-500 cursor-pointer"
                >
                  {!heroImgFailed && featuredVideo.thumbnail ? (
                    <img
                      src={featuredVideo.thumbnail}
                      alt={featuredVideo.title}
                      referrerPolicy="no-referrer"
                      onError={() => setHeroImgFailed(true)}
                      className="h-full w-full object-cover transition-transform duration-300 ease-out group-hover:scale-[1.02]"
                    />
                  ) : (
                    <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900">
                      <Film className="h-10 w-10 text-zinc-500" />
                    </div>
                  )}

                  <div
                    aria-hidden="true"
                    className="absolute inset-0 bg-gradient-to-t from-black/92 via-black/35 to-transparent"
                  />

                  <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-4 p-6">
                    <div className="min-w-0">
                      <p className="flex flex-wrap items-center gap-1.5 text-xs font-medium text-zinc-300">
                        <span className="text-rose-400">Spotlight Pick</span>
                        <span aria-hidden="true">·</span>
                        <span>{featuredVideo.source.toUpperCase()}</span>
                        <span aria-hidden="true">·</span>
                        <span className="truncate">{featuredVideo.author}</span>
                        <span aria-hidden="true">·</span>
                        <span className="tabular-nums">{featuredVideo.duration}</span>
                        {(featuredEngagement?.views || 0) > 0 && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span className="inline-flex items-center gap-1 tabular-nums">
                              <Eye className="h-3 w-3 text-zinc-400" />
                              {formatM2ACount(featuredEngagement?.views || 0)}
                            </span>
                          </>
                        )}
                        {featuredEmojiSummary.total > 0 && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span className="tabular-nums">
                              {featuredEmojiSummary.glyphs.join('')}{' '}
                              {formatM2ACount(featuredEmojiSummary.total)}
                            </span>
                          </>
                        )}
                      </p>
                      <h2 className="mt-1.5 font-display text-xl sm:text-2xl font-bold text-white line-clamp-2">
                        {featuredVideo.title}
                      </h2>
                    </div>

                    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-rose-600 text-white shadow-lg group-hover:bg-rose-500 transition-colors">
                      <Play className="h-5 w-5 fill-current ml-0.5" />
                    </span>
                  </div>
                </button>
              ) : (
                <div className="h-full min-h-[250px] lg:min-h-[340px] w-full animate-pulse rounded-2xl border border-zinc-800/80 bg-zinc-900" />
              )}
            </div>
          </section>
        )}

        {/* All-Ages Creator Lounge */}
        <CreatorStrip
          creators={creators}
          activeHandle={activeCreatorHandle}
          loadingHandle={loadingCreatorHandle}
          audienceFilter={creatorAudience}
          onChangeAudience={setCreatorAudience}
          onSelectCreator={handleSelectCreator}
          onAddCreator={(handle) => loadCreatorVideos(handle, true)}
          onRemoveCreator={handleRemoveCreator}
        />

        {creatorNotice && (
          <div className="mb-5 flex items-center justify-between gap-3 rounded-xl border border-zinc-800 bg-[#121215] px-4 py-3 text-xs text-zinc-300">
            <span>{creatorNotice}</span>
            <button
              type="button"
              onClick={() => setCreatorNotice(null)}
              aria-label="Dismiss notice"
              className="text-zinc-400 hover:text-zinc-100 cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Unified Discovery Command Dock */}
        <section aria-label="Search and filters" className="mb-7 space-y-3.5">
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-3">
            <form
              onSubmit={handleSearchSubmit}
              className="relative flex flex-1 items-center"
            >
              <Search
                className="pointer-events-none absolute left-3.5 h-4 w-4 text-zinc-400"
                aria-hidden="true"
              />
              <input
                type="search"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search videos, type @username, or paste YouTube / TikTok / Instagram / Facebook / TILvids link..."
                aria-label="Search videos or enter a @username or video link"
                className="h-11 w-full rounded-xl border border-zinc-800 bg-[#121215] pl-10 pr-24 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-zinc-600 focus:outline-none"
              />
              {(searchInput || activeQuery || activeCreatorHandle) && (
                <button
                  type="button"
                  onClick={handleClearSearch}
                  aria-label="Clear search"
                  className="absolute right-[78px] flex h-7 w-7 items-center justify-center rounded-md text-zinc-400 hover:text-zinc-100 cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
              <button
                type="submit"
                className="absolute right-1.5 h-8 rounded-lg bg-zinc-800 px-3.5 text-xs font-semibold text-zinc-100 hover:bg-zinc-700 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                Search
              </button>
            </form>

            {/* 3-Way View Switcher */}
            <div
              role="group"
              aria-label="Layout mode"
              className="flex items-center gap-1 overflow-x-auto no-scrollbar rounded-xl border border-zinc-800 bg-[#121215] p-1 shrink-0"
            >
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  viewMode === 'grid'
                    ? 'bg-zinc-800 text-white'
                    : 'text-zinc-400 hover:text-zinc-100'
                }`}
              >
                <LayoutGrid className="h-3.5 w-3.5" />
                <span>Explore Grid</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('shorts')}
                className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  viewMode === 'shorts'
                    ? 'bg-rose-600 text-white'
                    : 'text-zinc-400 hover:text-zinc-100'
                }`}
              >
                <Smartphone className="h-3.5 w-3.5" />
                <span>Shorts Scroll</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('watchlist')}
                className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  viewMode === 'watchlist'
                    ? 'bg-zinc-800 text-white'
                    : 'text-zinc-400 hover:text-zinc-100'
                }`}
              >
                <Bookmark className="h-3.5 w-3.5 text-rose-400" />
                <span>Watchlist</span>
                {watchlist.length > 0 && (
                  <span className="text-[11px] text-zinc-400 tabular-nums">
                    {watchlist.length}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Mood & Age Categories + App Source Switcher */}
          {!activeCreatorHandle && viewMode !== 'watchlist' && (
            <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3">
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
                {CATEGORIES.map((cat) => {
                  const isActive = category === cat.id && !activeQuery;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => handleSelectCategory(cat.id)}
                      className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                        isActive
                          ? 'border-rose-600/70 bg-rose-600/15 text-rose-300'
                          : 'border-zinc-800 bg-[#121215] text-zinc-400 hover:border-zinc-700 hover:text-zinc-100'
                      }`}
                    >
                      {cat.label}
                    </button>
                  );
                })}
              </div>

              <div
                role="group"
                aria-label="Filter by video app"
                className="flex items-center gap-1 overflow-x-auto no-scrollbar rounded-xl border border-zinc-800 bg-[#121215] p-1 shrink-0"
              >
                {SOURCE_TABS.map((tab) => {
                  const isActive = source === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setSource(tab.id)}
                      className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                        isActive
                          ? 'bg-zinc-800 text-white'
                          : 'text-zinc-400 hover:text-zinc-100'
                      }`}
                    >
                      {tab.label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* 24-Hour Offline Video Vault Status Bar */}
          {(source === 'offline' ||
            offlineEntries.length > 0 ||
            packProgress ||
            offlineNotice ||
            !isOnline) && (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-zinc-800/80 bg-[#121215] px-4 py-2.5 text-xs">
              <div className="flex flex-wrap items-center gap-2 text-zinc-300">
                {!isOnline ? (
                  <WifiOff className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                ) : (
                  <HardDriveDownload className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                )}
                <span>
                  {packProgress ||
                    offlineNotice ||
                    (offlineEntries.length > 0
                      ? `${offlineEntries.length} ${
                          offlineEntries.length === 1 ? 'video' : 'videos'
                        } saved for 24h offline playback (${formatBytes(offlineTotalBytes)})`
                      : 'Save NASA or TILvids videos to watch offline without internet for 24 hours.')}
                </span>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {isOnline && (
                  <button
                    type="button"
                    disabled={Boolean(packProgress)}
                    onClick={() => void handleDownloadOfflinePack()}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/35 bg-emerald-950/60 px-3 py-1 font-medium text-emerald-200 hover:bg-emerald-900/60 disabled:opacity-60 transition-colors cursor-pointer whitespace-nowrap shrink-0"
                  >
                    <HardDriveDownload className="h-3 w-3" />
                    <span>{packProgress ? 'Caching...' : 'Cache 24h Pack'}</span>
                  </button>
                )}
                {offlineEntries.length > 0 && source !== 'offline' && (
                  <button
                    type="button"
                    onClick={handleOpenOffline}
                    className="rounded-lg bg-zinc-800 px-3 py-1 font-medium text-zinc-100 hover:bg-zinc-700 transition-colors cursor-pointer whitespace-nowrap shrink-0"
                  >
                    Watch Offline ({offlineEntries.length})
                  </button>
                )}
                {offlineEntries.length > 0 && (
                  <button
                    type="button"
                    onClick={() => void handleClearOfflineVault()}
                    title="Clear all 24h offline videos"
                    className="inline-flex items-center gap-1 rounded-lg border border-zinc-800 px-2.5 py-1 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors cursor-pointer whitespace-nowrap shrink-0"
                  >
                    <Trash2 className="h-3 w-3" />
                    <span>Clear</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Regional Network Auto-Detection Notice */}
          {anyMetaBlocked && isOnline && source !== 'offline' && (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-500/30 bg-amber-950/30 px-4 py-2.5 text-xs text-amber-200">
              <div className="flex items-center gap-2 min-w-0">
                <ShieldAlert className="h-4 w-4 text-amber-400 shrink-0" />
                <span>
                  {metaStatus.facebook === 'blocked' && metaStatus.instagram === 'blocked'
                    ? 'Facebook & Instagram appear blocked on this network — auto-switching to YouTube, TikTok, TILvids & NASA.'
                    : metaStatus.facebook === 'blocked'
                    ? 'Facebook appears blocked on this network — auto-switching to other apps.'
                    : 'Instagram appears blocked on this network — auto-switching to other apps.'}
                </span>
              </div>
              <button
                type="button"
                onClick={recheckMeta}
                className="rounded-lg border border-amber-400/30 bg-amber-900/40 px-3 py-1 font-medium text-amber-100 hover:bg-amber-900/70 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                Recheck Access
              </button>
            </div>
          )}

          {/* Paste-a-Link when Instagram or Facebook tab is active and reachable */}
          {(source === 'instagram' || source === 'facebook') &&
            !activeCreatorHandle &&
            viewMode !== 'watchlist' &&
            !isMetaBlocked(source) && (
              <div className="rounded-xl border border-zinc-800 bg-[#121215] p-4 space-y-3">
                <form
                  onSubmit={(e) => void handleAddMetaLink(e)}
                  className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5"
                >
                  <div className="relative flex-1 flex items-center">
                    <Link2
                      className="pointer-events-none absolute left-3 h-4 w-4 text-zinc-400"
                      aria-hidden="true"
                    />
                    <input
                      type="url"
                      value={metaLinkInput}
                      onChange={(e) => setMetaLinkInput(e.target.value)}
                      placeholder={
                        source === 'instagram'
                          ? 'Paste any public Instagram Reel link (instagram.com/reel/...)'
                          : 'Paste any public Facebook Watch, Reel, or fb.watch link...'
                      }
                      aria-label={`Paste public ${source} video link`}
                      className="h-10 w-full rounded-lg border border-zinc-800 bg-[#09090B] pl-9 pr-3 text-xs text-zinc-100 placeholder:text-zinc-500 focus:border-zinc-600 focus:outline-none"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={metaLinkBusy || !metaLinkInput.trim()}
                    className="inline-flex h-10 items-center justify-center gap-1.5 rounded-lg bg-rose-600 px-4 text-xs font-semibold text-white hover:bg-rose-500 disabled:opacity-50 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    {metaLinkBusy ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Plus className="h-3.5 w-3.5" />
                    )}
                    <span>Add Link & Watch</span>
                  </button>
                </form>
                {metaLinkNotice && (
                  <p className="text-xs text-amber-300">{metaLinkNotice}</p>
                )}
              </div>
            )}
        </section>

        {/* Section Header */}
        <div className="mb-5 flex flex-wrap items-center justify-between gap-4 border-b border-zinc-800/60 pb-3">
          <div className="flex items-center gap-3 min-w-0">
            <h2 className="font-display text-lg font-semibold text-zinc-100 truncate">
              {viewMode === 'watchlist'
                ? 'Your M2A Watchlist & History'
                : activeCreatorHandle
                ? `${activeCreatorObj?.displayName || `@${activeCreatorHandle}`} · @${activeCreatorHandle}`
                : source === 'offline'
                ? 'Offline Vault (24 Hours)'
                : activeQuery
                ? `Results for "${activeQuery}"`
                : viewMode === 'shorts'
                ? 'Endless Shorts Scroll'
                : CATEGORIES.find((c) => c.id === category)?.label || 'Videos'}
            </h2>
            {activeCreatorHandle && viewMode !== 'watchlist' && (
              <button
                type="button"
                onClick={() => setActiveCreatorHandle(null)}
                className="text-xs font-medium text-rose-400 hover:text-rose-300 whitespace-nowrap shrink-0 cursor-pointer"
              >
                Back to All Feed
              </button>
            )}
          </div>

          {viewMode !== 'watchlist' ? (
            <div className="flex items-center gap-4 text-xs text-zinc-400 shrink-0">
              {seenIds.length > 0 && source !== 'offline' && (
                <span className="flex items-center gap-1.5 tabular-nums">
                  <span>{seenIds.length} watched hidden</span>
                  <span aria-hidden="true">·</span>
                  <button
                    type="button"
                    onClick={resetSeenHistory}
                    className="text-zinc-300 hover:text-white underline underline-offset-2 cursor-pointer"
                  >
                    Reset
                  </button>
                </span>
              )}
              <button
                type="button"
                onClick={handleRefreshNew}
                disabled={loading || (!isOnline && source !== 'offline')}
                className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-800 bg-[#121215] px-3 py-1.5 text-xs font-medium text-zinc-200 hover:border-zinc-700 hover:bg-zinc-800 disabled:opacity-50 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
                <span>Refresh New</span>
              </button>
              {!loading && (
                <span className="tabular-nums">
                  {videos.length} {videos.length === 1 ? 'video' : 'videos'}
                </span>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-3 text-xs text-zinc-400 shrink-0">
              {watchlist.length > 0 && (
                <button
                  type="button"
                  onClick={() => handleOpenVideo(watchlist[0])}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-500 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <Play className="h-3.5 w-3.5 fill-current" />
                  <span>Play Watchlist</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className="rounded-lg border border-zinc-800 bg-[#121215] px-3 py-1.5 text-xs font-medium text-zinc-200 hover:bg-zinc-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                Back to Explore
              </button>
            </div>
          )}
        </div>

        {/* Main Content Area */}
        {viewMode === 'watchlist' ? (
          watchlist.length === 0 && watchHistory.length === 0 ? (
            <div className="rounded-2xl border border-zinc-800 bg-[#121215] p-12 text-center">
              <Bookmark className="mx-auto h-8 w-8 text-zinc-500" />
              <h3 className="mt-3 text-base font-semibold text-zinc-100">
                Your Watchlist is empty
              </h3>
              <p className="mx-auto mt-1 max-w-md text-sm text-zinc-400">
                Tap the bookmark icon on any video card, Shorts reel, or Watchroom player to build your personal binge queue without creating an account.
              </p>
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className="mt-5 inline-flex items-center gap-2 rounded-lg bg-rose-600 px-4 py-2 text-xs font-semibold text-white hover:bg-rose-500 transition-colors cursor-pointer"
              >
                <Sparkles className="h-3.5 w-3.5" />
                <span>Explore Fresh Videos</span>
              </button>
            </div>
          ) : (
            <div className="space-y-10">
              {watchlist.length > 0 && (
                <section aria-label="Saved Watchlist">
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <h3 className="font-display text-sm font-semibold text-zinc-200">
                      Saved to Watch Later ({watchlist.length})
                    </h3>
                    <button
                      type="button"
                      onClick={handleClearWatchlist}
                      className="inline-flex items-center gap-1 text-xs text-zinc-400 hover:text-zinc-100 cursor-pointer"
                    >
                      <Trash2 className="h-3 w-3" />
                      <span>Clear Watchlist</span>
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {watchlist.map((video) => {
                      const vKey = getOfflineVideoKey(video);
                      return (
                        <VideoCard
                          key={`wl-${video.source}-${video.id}`}
                          video={video}
                          offlineEntry={offlineMap[vKey]}
                          engagement={engagementMap[vKey]}
                          isWatchlisted
                          isSavingOffline={savingKey === vKey}
                          isOnline={isOnline}
                          onSelect={handleOpenVideo}
                          onToggleWatchlist={handleToggleWatchlist}
                          onToggleOfflineSave={(v) => void handleToggleOfflineSave(v)}
                        />
                      );
                    })}
                  </div>
                </section>
              )}

              {watchHistory.length > 0 && (
                <section aria-label="Recently Watched">
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <h3 className="inline-flex items-center gap-2 font-display text-sm font-semibold text-zinc-200">
                      <History className="h-4 w-4 text-zinc-400" />
                      <span>Recently Watched ({watchHistory.length})</span>
                    </h3>
                    <button
                      type="button"
                      onClick={handleClearHistory}
                      className="inline-flex items-center gap-1 text-xs text-zinc-400 hover:text-zinc-100 cursor-pointer"
                    >
                      <Trash2 className="h-3 w-3" />
                      <span>Clear History</span>
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {watchHistory.map((video) => {
                      const vKey = getOfflineVideoKey(video);
                      return (
                        <VideoCard
                          key={`hist-${video.source}-${video.id}`}
                          video={video}
                          offlineEntry={offlineMap[vKey]}
                          engagement={engagementMap[vKey]}
                          isWatchlisted={watchlistKeys.has(getWatchlistKey(video))}
                          isSavingOffline={savingKey === vKey}
                          isOnline={isOnline}
                          onSelect={handleOpenVideo}
                          onToggleWatchlist={handleToggleWatchlist}
                          onToggleOfflineSave={(v) => void handleToggleOfflineSave(v)}
                        />
                      );
                    })}
                  </div>
                </section>
              )}

              {isOnline && watchlist.length + watchHistory.length >= 4 && (
                <AdSenseSlot
                  isOnline={isOnline}
                  slotKey="watchlist-footer"
                  format="auto"
                  minHeightClass="min-h-[100px]"
                />
              )}
            </div>
          )
        ) : loading ? (
          viewMode === 'shorts' ? (
            <div className="mx-auto h-[560px] w-full max-w-[420px] animate-pulse rounded-2xl border border-zinc-800 bg-zinc-900" />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {Array.from({ length: 8 }).map((_, idx) => (
                <div key={idx} className="space-y-3">
                  <div className="aspect-video w-full animate-pulse rounded-xl bg-zinc-900 border border-zinc-800/60" />
                  <div className="h-4 w-5/6 animate-pulse rounded bg-zinc-900" />
                  <div className="h-3 w-1/2 animate-pulse rounded bg-zinc-900" />
                </div>
              ))}
            </div>
          )
        ) : error ? (
          <div className="rounded-2xl border border-zinc-800 bg-[#121215] p-10 text-center">
            <p className="text-sm font-medium text-zinc-200">{error}</p>
            <button
              type="button"
              onClick={() =>
                loadVideos(activeQuery, source, category, viewMode, 0, false, true)
              }
              className="mt-4 rounded-lg bg-rose-600 px-4 py-2 text-xs font-semibold text-white hover:bg-rose-500 transition-colors cursor-pointer"
            >
              Try Again
            </button>
          </div>
        ) : (source === 'instagram' || source === 'facebook') &&
          !activeCreatorHandle &&
          isMetaBlocked(source) ? (
          <div className="rounded-2xl border border-zinc-800 bg-[#121215] p-8 sm:p-10 text-center">
            <WifiOff className="mx-auto h-9 w-9 text-amber-400" />
            <h3 className="mt-3 text-base font-semibold text-zinc-100">
              {source === 'instagram' ? 'Instagram Reels' : 'Facebook Videos'} unavailable on this network
            </h3>
            <p className="mx-auto mt-1.5 max-w-md text-xs leading-relaxed text-zinc-400">
              {source === 'facebook' ? 'Facebook' : 'Instagram'} appears restricted or unreachable in your region or network. YouTube, TikTok, TILvids, NASA, and your 24-hour Offline Vault remain ready without restrictions.
            </p>
            <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => setSource('all')}
                className="rounded-lg bg-rose-600 px-4 py-2 text-xs font-semibold text-white hover:bg-rose-500 transition-colors cursor-pointer"
              >
                Switch to Playable Apps
              </button>
              <button
                type="button"
                onClick={recheckMeta}
                className="rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2 text-xs font-semibold text-zinc-100 hover:bg-zinc-700 transition-colors cursor-pointer"
              >
                Recheck Network
              </button>
              {offlineEntries.length > 0 && (
                <button
                  type="button"
                  onClick={handleOpenOffline}
                  className="rounded-lg border border-emerald-500/35 bg-emerald-950/60 px-4 py-2 text-xs font-semibold text-emerald-200 hover:bg-emerald-900/60 transition-colors cursor-pointer"
                >
                  Watch 24h Offline Videos ({offlineEntries.length})
                </button>
              )}
            </div>
          </div>
        ) : viewMode === 'shorts' ? (
          <ShortsFeed
            videos={videos}
            loadingMore={loadingMore}
            hasMore={hasMore && !activeCreatorHandle}
            isOnline={isOnline}
            metaBlocked={{
              instagram: metaStatus.instagram === 'blocked',
              facebook: metaStatus.facebook === 'blocked',
            }}
            offlineMap={offlineMap}
            engagementMap={engagementMap}
            watchlistKeys={watchlistKeys}
            savingKey={savingKey}
            onToggleWatchlist={handleToggleWatchlist}
            onToggleOfflineSave={(video) => void handleToggleOfflineSave(video)}
            onJumpToOfflineVault={handleOpenOffline}
            onMarkMetaBlocked={markMetaBlocked}
            onRecheckMeta={recheckMeta}
            onRecordView={handleRecordView}
            onReactEmoji={handleReactEmoji}
            onSupportCreator={handleSupportCreator}
            onLoadMore={handleLoadMore}
            onMarkSeen={markVideoSeen}
            onSkipUnavailable={handleAutoSkip}
            onSelectCreator={(handle) => void loadCreatorVideos(handle, true)}
            onExitShorts={() => setViewMode('grid')}
          />
        ) : (source === 'instagram' || source === 'facebook') &&
          !activeCreatorHandle &&
          gridVideos.length === 0 ? (
          <div className="space-y-6">
            <div className="rounded-2xl border border-zinc-800 bg-[#121215] p-8 text-center">
              <Film className="mx-auto h-8 w-8 text-zinc-500" />
              <h3 className="mt-3 text-base font-semibold text-zinc-100">
                Watch {source === 'instagram' ? 'Instagram Reels' : 'Facebook Videos'} without logging in
              </h3>
              <p className="mx-auto mt-1.5 max-w-lg text-xs leading-relaxed text-zinc-400">
                Paste any public {source === 'instagram' ? 'Instagram Reel link' : 'Facebook Watch, Reel, or fb.watch link'} above to watch it here, or open one of the curated family-safe creators below.
              </p>
            </div>

            <div>
              <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-zinc-400">
                Curated Public Creators
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {CURATED_META_CREATORS.map((creator) => (
                  <button
                    key={creator.handle}
                    type="button"
                    onClick={() => void loadCreatorVideos(creator.handle, false)}
                    className="flex items-center justify-between gap-3 rounded-xl border border-zinc-800 bg-[#121215] p-4 text-left hover:border-zinc-700 hover:bg-zinc-900 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-zinc-800 text-rose-400">
                        <User className="h-4 w-4" />
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-zinc-100">
                          {creator.displayName}
                        </p>
                        <p className="truncate text-xs text-zinc-400">
                          @{creator.handle} · {creator.tag}
                        </p>
                      </div>
                    </div>
                    <Play className="h-4 w-4 shrink-0 text-zinc-400" />
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : gridVideos.length === 0 ? (
          <div className="rounded-2xl border border-zinc-800 bg-[#121215] p-12 text-center">
            <Film className="mx-auto h-8 w-8 text-zinc-500" />
            <h3 className="mt-3 text-base font-semibold text-zinc-100">
              {source === 'offline'
                ? 'No 24h offline videos saved yet'
                : 'No unseen matching videos left'}
            </h3>
            <p className="mt-1 text-sm text-zinc-400">
              {source === 'offline'
                ? 'Tap "Save 24h" on any NASA or TILvids video or click "Cache 24h Pack" while online to watch with zero internet for 24 hours.'
                : 'Try Refresh New, switch categories, or reset your watched history.'}
            </p>
            <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
              {source === 'offline' && isOnline ? (
                <button
                  type="button"
                  disabled={Boolean(packProgress)}
                  onClick={() => void handleDownloadOfflinePack()}
                  className="rounded-lg bg-rose-600 px-4 py-2 text-xs font-semibold text-white hover:bg-rose-500 disabled:opacity-60 transition-colors cursor-pointer"
                >
                  {packProgress || 'Save 24h Offline Pack'}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleRefreshNew}
                  disabled={!isOnline}
                  className="rounded-lg bg-rose-600 px-4 py-2 text-xs font-semibold text-white hover:bg-rose-500 disabled:opacity-50 transition-colors cursor-pointer"
                >
                  Load Fresh Videos
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  setSource('all');
                  handleClearSearch();
                  setCategory('trending');
                }}
                className="rounded-lg bg-zinc-800 px-4 py-2 text-xs font-semibold text-zinc-100 hover:bg-zinc-700 transition-colors cursor-pointer"
              >
                Reset Filters
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Row 1 Opening Picks */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {gridVideos.slice(0, 4).map((video) => {
                const vKey = getOfflineVideoKey(video);
                return (
                  <VideoCard
                    key={`${video.source}-${video.id}`}
                    video={video}
                    offlineEntry={offlineMap[vKey]}
                    engagement={engagementMap[vKey]}
                    isWatchlisted={watchlistKeys.has(getWatchlistKey(video))}
                    isSavingOffline={savingKey === vKey}
                    isOnline={isOnline}
                    onSelect={handleOpenVideo}
                    onToggleWatchlist={handleToggleWatchlist}
                    onToggleOfflineSave={(v) => void handleToggleOfflineSave(v)}
                  />
                );
              })}
            </div>
{/* Mid-Feed Discovery Rows */}
            {gridVideos.length > 4 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {gridVideos.slice(4, 16).map((video) => {
                  const vKey = getOfflineVideoKey(video);
                  return (
                    <VideoCard
                      key={`${video.source}-${video.id}`}
                      video={video}
                      offlineEntry={offlineMap[vKey]}
                      engagement={engagementMap[vKey]}
                      isWatchlisted={watchlistKeys.has(getWatchlistKey(video))}
                      isSavingOffline={savingKey === vKey}
                      isOnline={isOnline}
                      onSelect={handleOpenVideo}
                      onToggleWatchlist={handleToggleWatchlist}
                      onToggleOfflineSave={(v) => void handleToggleOfflineSave(v)}
                    />
                  );
                })}
              </div>
            )}
{/* Remaining Endless Scroll Grid */}
            {gridVideos.length > 16 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {gridVideos.slice(16).map((video) => {
                  const vKey = getOfflineVideoKey(video);
                  return (
                    <VideoCard
                      key={`${video.source}-${video.id}`}
                      video={video}
                      offlineEntry={offlineMap[vKey]}
                      engagement={engagementMap[vKey]}
                      isWatchlisted={watchlistKeys.has(getWatchlistKey(video))}
                      isSavingOffline={savingKey === vKey}
                      isOnline={isOnline}
                      onSelect={handleOpenVideo}
                      onToggleWatchlist={handleToggleWatchlist}
                      onToggleOfflineSave={(v) => void handleToggleOfflineSave(v)}
                    />
                  );
                })}
              </div>
            )}

            {hasMore && !activeCreatorHandle && source !== 'offline' && (
              <div
                ref={sentinelRef}
                className="mt-10 flex flex-col items-center justify-center gap-3"
              >
                <button
                  type="button"
                  onClick={handleLoadMore}
                  disabled={loadingMore}
                  className="rounded-xl border border-zinc-800 bg-[#121215] px-6 py-2.5 text-xs font-semibold text-zinc-200 hover:border-zinc-700 hover:bg-zinc-800 disabled:opacity-60 transition-colors cursor-pointer"
                >
                  {loadingMore ? 'Loading fresh videos...' : 'Load More New Videos'}
                </button>
              </div>
            )}
          </>
        )}
      </main>

      <Footer
        isInstalled={isInstalled}
        onInstallClick={() => void handleInstallClick()}
        onOpenLegal={setLegalDoc}
      />

      {/* Compact Native-Style Mobile Thumb Bar (<= 15% combined sticky height) */}
      <nav
        aria-label="Mobile quick navigation"
        className="md:hidden fixed bottom-0 inset-x-0 z-30 h-14 border-t border-zinc-800/80 bg-[#09090B]/95 backdrop-blur-md"
      >
        <div className="grid h-full grid-cols-4">
          <button
            type="button"
            onClick={() => {
              setActiveCreatorHandle(null);
              if (source === 'offline') setSource('all');
              setViewMode('grid');
            }}
            className={`flex flex-col items-center justify-center gap-0.5 text-[11px] font-medium cursor-pointer ${
              viewMode === 'grid' && source !== 'offline'
                ? 'text-rose-400'
                : 'text-zinc-400'
            }`}
          >
            <Compass className="h-4 w-4" />
            <span>Discover</span>
          </button>

          <button
            type="button"
            onClick={() => setViewMode('shorts')}
            className={`flex flex-col items-center justify-center gap-0.5 text-[11px] font-medium cursor-pointer ${
              viewMode === 'shorts' ? 'text-rose-400' : 'text-zinc-400'
            }`}
          >
            <Smartphone className="h-4 w-4" />
            <span>Shorts</span>
          </button>

          <button
            type="button"
            onClick={() => setViewMode('watchlist')}
            className={`flex flex-col items-center justify-center gap-0.5 text-[11px] font-medium cursor-pointer ${
              viewMode === 'watchlist' ? 'text-rose-400' : 'text-zinc-400'
            }`}
          >
            <Bookmark className="h-4 w-4" />
            <span>
              Watchlist{watchlist.length > 0 ? ` (${watchlist.length})` : ''}
            </span>
          </button>

          <button
            type="button"
            onClick={handleOpenOffline}
            className={`flex flex-col items-center justify-center gap-0.5 text-[11px] font-medium cursor-pointer ${
              viewMode === 'grid' && source === 'offline'
                ? 'text-emerald-400'
                : 'text-zinc-400'
            }`}
          >
            <HardDriveDownload className="h-4 w-4" />
            <span>Offline</span>
          </button>
        </div>
      </nav>

      {!isOnline && (
        <div
          role="status"
          className="fixed bottom-16 md:bottom-4 left-4 z-40 rounded-lg border border-amber-500/40 bg-amber-950/95 px-3.5 py-2 text-xs font-medium text-amber-200 shadow-lg"
        >
          {offlineEntries.length > 0
            ? `Offline Mode — ${offlineEntries.length} saved 24h ${
                offlineEntries.length === 1 ? 'video' : 'videos'
              } ready to watch.`
            : 'Offline Mode — App is ready offline. Reconnect to save 24h videos.'}
        </div>
      )}

      <MenuDrawer
        open={menuOpen}
        isInstalled={isInstalled}
        isOnline={isOnline}
        hasVideos={videos.length > 0}
        offlineCount={offlineEntries.length}
        offlineTotalBytes={offlineTotalBytes}
        packProgress={packProgress}
        onClose={() => setMenuOpen(false)}
        onInstallClick={() => void handleInstallClick()}
        onDownloadOfflinePack={() => void handleDownloadOfflinePack()}
        onOpenOfflineVault={handleOpenOffline}
        onRandomPlay={handleRandomPlay}
        onSelectViewMode={setViewMode}
        onSelectCategory={handleSelectCategory}
      />

      <InstallAppModal
        open={installModalOpen}
        isIOS={isIOS}
        onClose={() => setInstallModalOpen(false)}
      />

      <LegalModal
        doc={legalDoc}
        onSelectDoc={setLegalDoc}
        onClose={() => setLegalDoc(null)}
      />

      <PlayerModal
        video={selectedVideo}
        playlist={activePlaylist}
        skipNotice={skipNotice}
        isOnline={isOnline}
        metaBlocked={{
          instagram: metaStatus.instagram === 'blocked',
          facebook: metaStatus.facebook === 'blocked',
        }}
        offlineMap={offlineMap}
        engagementMap={engagementMap}
        watchlistKeys={watchlistKeys}
        savingKey={savingKey}
        onToggleWatchlist={handleToggleWatchlist}
        onToggleOfflineSave={(video) => void handleToggleOfflineSave(video)}
        onJumpToOfflineVault={handleOpenOffline}
        onMarkMetaBlocked={markMetaBlocked}
        onRecheckMeta={recheckMeta}
        onRecordView={handleRecordView}
        onReactEmoji={handleReactEmoji}
        onSupportCreator={handleSupportCreator}
        onRefreshFeed={handleRefreshNew}
        refreshingFeed={loading}
        onClose={handleClosePlayer}
        onSelectVideo={handleOpenVideo}
        onSelectCreator={(handle) => void loadCreatorVideos(handle, true)}
        onAutoSkip={handleAutoSkip}
      />
    </div>
  );
}
