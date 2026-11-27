export type VideoSource =
  | 'youtube'
  | 'tiktok'
  | 'instagram'
  | 'facebook'
  | 'tilvids'
  | 'nasa';

export type SourceFilter = 'all' | 'offline' | VideoSource;

export type ViewMode = 'grid' | 'shorts' | 'watchlist';

export type CategoryId =
  | 'trending'
  | 'family'
  | 'funny'
  | 'restaurants'
  | 'gadgets'
  | 'news'
  | 'howto'
  | 'podcasts'
  | 'music'
  | 'education'
  | 'sports'
  | 'cars';

export type CreatorAudience =
  | 'all'
  | 'kids'
  | 'food_travel'
  | 'comedy_fun'
  | 'science_news'
  | 'custom';

export interface VideoItem {
  id: string;
  source: VideoSource;
  title: string;
  author: string;
  authorHandle?: string;
  thumbnail: string;
  duration: string;
  views: string;
  published: string;
  isShort: boolean;
  category: CategoryId;
  mediaUrl?: string;
  canonicalUrl?: string;
  offlineReady?: boolean;
}

export interface CreatorProfile {
  handle: string;
  displayName: string;
  avatar: string;
  platforms: VideoSource[];
  audience?: Exclude<CreatorAudience, 'all' | 'custom'>;
  isCustom?: boolean;
}

export interface VideosResponse {
  videos: VideoItem[];
  query: string;
  source: SourceFilter;
  category: CategoryId;
  page: number;
  hasMore: boolean;
  resolvedDirectUrl?: boolean;
}

export interface CreatorResponse {
  creator: CreatorProfile;
  videos: VideoItem[];
}

export type EmojiKey = 'fire' | 'heart' | 'laugh' | 'clap' | 'star';

export interface VideoEngagement {
  views: number;
  reactions: Record<EmojiKey, number>;
  userEmoji: EmojiKey | null;
}
