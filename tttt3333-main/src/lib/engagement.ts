import type { EmojiKey, VideoEngagement, VideoItem } from '../types';

export const EMOJI_OPTIONS: { key: EmojiKey; glyph: string; label: string }[] = [
  { key: 'fire', glyph: '🔥', label: 'Fire' },
  { key: 'heart', glyph: '❤️', label: 'Love' },
  { key: 'laugh', glyph: '😂', label: 'Funny' },
  { key: 'clap', glyph: '👏', label: 'Respect' },
  { key: 'star', glyph: '🌟', label: 'Favorite' },
];

const DEVICE_ID_KEY = 'm2a_device_id_v1';
const LOCAL_ENGAGEMENT_KEY = 'm2a_engagement_local_v1';
const MAX_LOCAL_RECORDS = 500;

interface LocalEngagementRecord extends VideoEngagement {
  userViewed: boolean;
  updatedAt: number;
}

export function createEmptyReactions(): Record<EmojiKey, number> {
  return { fire: 0, heart: 0, laugh: 0, clap: 0, star: 0 };
}

export function getOrCreateDeviceId(): string {
  if (typeof window === 'undefined') return 'm2a-server-device';
  try {
    const existing = localStorage.getItem(DEVICE_ID_KEY);
    if (existing && /^[a-zA-Z0-9_-]{8,64}$/.test(existing)) {
      return existing;
    }
    const generated =
      typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? `m2a_${crypto.randomUUID().replace(/-/g, '')}`
        : `m2a_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 12)}`;
    localStorage.setItem(DEVICE_ID_KEY, generated);
    return generated;
  } catch {
    return `m2a_ephemeral_${Date.now().toString(36)}`;
  }
}

export function getVideoEngagementKey(video: Pick<VideoItem, 'source' | 'id'>): string {
  return `${video.source}:${video.id}`;
}

function readLocalStore(): Record<string, LocalEngagementRecord> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(LOCAL_ENGAGEMENT_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, LocalEngagementRecord>) : {};
  } catch {
    return {};
  }
}

function writeLocalStore(store: Record<string, LocalEngagementRecord>): void {
  if (typeof window === 'undefined') return;
  try {
    const entries = Object.entries(store);
    if (entries.length > MAX_LOCAL_RECORDS) {
      entries.sort((a, b) => (b[1].updatedAt || 0) - (a[1].updatedAt || 0));
      store = Object.fromEntries(entries.slice(0, MAX_LOCAL_RECORDS));
    }
    localStorage.setItem(LOCAL_ENGAGEMENT_KEY, JSON.stringify(store));
  } catch {
    // ignore storage quota errors
  }
}

export function loadLocalEngagementMap(): Record<string, VideoEngagement> {
  const store = readLocalStore();
  const out: Record<string, VideoEngagement> = {};
  for (const [k, rec] of Object.entries(store)) {
    if (!rec) continue;
    out[k] = {
      views: Math.max(0, Number(rec.views) || 0),
      reactions: {
        fire: Math.max(0, Number(rec.reactions?.fire) || 0),
        heart: Math.max(0, Number(rec.reactions?.heart) || 0),
        laugh: Math.max(0, Number(rec.reactions?.laugh) || 0),
        clap: Math.max(0, Number(rec.reactions?.clap) || 0),
        star: Math.max(0, Number(rec.reactions?.star) || 0),
      },
      userEmoji: rec.userEmoji ?? null,
    };
  }
  return out;
}

export function applyLocalView(videoKey: string): {
  changed: boolean;
  engagement: VideoEngagement;
} {
  const store = readLocalStore();
  const existing = store[videoKey] || {
    views: 0,
    reactions: createEmptyReactions(),
    userEmoji: null,
    userViewed: false,
    updatedAt: Date.now(),
  };

  if (existing.userViewed) {
    return {
      changed: false,
      engagement: {
        views: existing.views,
        reactions: existing.reactions,
        userEmoji: existing.userEmoji,
      },
    };
  }

  const next: LocalEngagementRecord = {
    ...existing,
    views: existing.views + 1,
    userViewed: true,
    updatedAt: Date.now(),
  };
  store[videoKey] = next;
  writeLocalStore(store);

  return {
    changed: true,
    engagement: {
      views: next.views,
      reactions: next.reactions,
      userEmoji: next.userEmoji,
    },
  };
}

export function applyLocalReaction(videoKey: string, emoji: EmojiKey): {
  targetEmoji: EmojiKey | null;
  engagement: VideoEngagement;
} {
  const store = readLocalStore();
  const existing = store[videoKey] || {
    views: 0,
    reactions: createEmptyReactions(),
    userEmoji: null,
    userViewed: false,
    updatedAt: Date.now(),
  };

  const nextReactions = { ...createEmptyReactions(), ...existing.reactions };
  const prevEmoji = existing.userEmoji;
  const targetEmoji: EmojiKey | null = prevEmoji === emoji ? null : emoji;

  if (prevEmoji && nextReactions[prevEmoji] > 0) {
    nextReactions[prevEmoji] -= 1;
  }
  if (targetEmoji) {
    nextReactions[targetEmoji] = (nextReactions[targetEmoji] || 0) + 1;
  }

  const next: LocalEngagementRecord = {
    ...existing,
    reactions: nextReactions,
    userEmoji: targetEmoji,
    updatedAt: Date.now(),
  };
  store[videoKey] = next;
  writeLocalStore(store);

  return {
    targetEmoji,
    engagement: {
      views: next.views,
      reactions: next.reactions,
      userEmoji: next.userEmoji,
    },
  };
}

export function mergeServerEngagementIntoLocal(
  stats: Record<string, VideoEngagement>
): Record<string, VideoEngagement> {
  const store = readLocalStore();
  const out: Record<string, VideoEngagement> = {};

  for (const [key, srv] of Object.entries(stats)) {
    const prev = store[key];
    const merged: LocalEngagementRecord = {
      views: Math.max(srv.views || 0, prev?.userViewed ? 1 : 0),
      reactions: {
        fire: Math.max(0, Number(srv.reactions?.fire) || 0),
        heart: Math.max(0, Number(srv.reactions?.heart) || 0),
        laugh: Math.max(0, Number(srv.reactions?.laugh) || 0),
        clap: Math.max(0, Number(srv.reactions?.clap) || 0),
        star: Math.max(0, Number(srv.reactions?.star) || 0),
      },
      userEmoji: srv.userEmoji ?? null,
      userViewed: prev?.userViewed || false,
      updatedAt: Date.now(),
    };
    store[key] = merged;
    out[key] = {
      views: merged.views,
      reactions: merged.reactions,
      userEmoji: merged.userEmoji,
    };
  }

  writeLocalStore(store);
  return out;
}

export function formatM2ACount(num: number): string {
  if (!Number.isFinite(num) || num <= 0) return '0';
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`;
  return String(Math.floor(num));
}

export function getTopEmojiSummary(engagement?: VideoEngagement): {
  glyphs: string[];
  total: number;
} {
  if (!engagement) return { glyphs: [], total: 0 };
  const active = EMOJI_OPTIONS.map((opt) => ({
    glyph: opt.glyph,
    count: engagement.reactions[opt.key] || 0,
  }))
    .filter((x) => x.count > 0)
    .sort((a, b) => b.count - a.count);

  const total = active.reduce((sum, x) => sum + x.count, 0);
  return {
    glyphs: active.slice(0, 3).map((x) => x.glyph),
    total,
  };
}
