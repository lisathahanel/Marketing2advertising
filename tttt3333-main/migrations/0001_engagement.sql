-- Cloudflare D1 migration for marketing2advertising (M2A) per-device views & emoji reactions

CREATE TABLE IF NOT EXISTS video_views (
  video_key TEXT NOT NULL,
  device_id TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (video_key, device_id)
);

CREATE TABLE IF NOT EXISTS video_reactions (
  video_key TEXT NOT NULL,
  device_id TEXT NOT NULL,
  emoji TEXT NOT NULL CHECK (emoji IN ('fire', 'heart', 'laugh', 'clap', 'star')),
  updated_at INTEGER NOT NULL,
  PRIMARY KEY (video_key, device_id)
);

CREATE INDEX IF NOT EXISTS idx_video_views_key ON video_views(video_key);
CREATE INDEX IF NOT EXISTS idx_video_reactions_key ON video_reactions(video_key);
CREATE INDEX IF NOT EXISTS idx_video_reactions_device ON video_reactions(device_id, video_key);
