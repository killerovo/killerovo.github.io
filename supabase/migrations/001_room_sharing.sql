-- Migration 001: Room sharing - favorites + room playlists
-- Run this in Supabase SQL Editor (https://qudyifwqcdququqndomb.supabase.co)

-- 1. Profiles table (username = account, no password)
CREATE TABLE IF NOT EXISTS profiles (
  username   TEXT PRIMARY KEY,
  room_id    TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Favorites table (per-user, isolated)
CREATE TABLE IF NOT EXISTS favorites (
  id         BIGSERIAL PRIMARY KEY,
  username   TEXT NOT NULL REFERENCES profiles(username) ON DELETE CASCADE,
  song_id    TEXT NOT NULL,
  title      TEXT,
  artist     TEXT,
  audio_url  TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_favorites_username ON favorites(username);

-- 3. Room playlists metadata
CREATE TABLE IF NOT EXISTS room_playlists (
  id         BIGSERIAL PRIMARY KEY,
  room_id    TEXT NOT NULL,
  name       TEXT NOT NULL,
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_room_playlists_room ON room_playlists(room_id);

-- 4. Room playlist tracks
CREATE TABLE IF NOT EXISTS room_playlist_tracks (
  id          BIGSERIAL PRIMARY KEY,
  playlist_id BIGINT NOT NULL REFERENCES room_playlists(id) ON DELETE CASCADE,
  room_id     TEXT NOT NULL,
  song_id     TEXT NOT NULL,
  title       TEXT,
  artist      TEXT,
  audio_url   TEXT,
  created_at  TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_room_playlist_tracks_playlist ON room_playlist_tracks(playlist_id);
CREATE INDEX IF NOT EXISTS idx_room_playlist_tracks_room ON room_playlist_tracks(room_id);

-- Enable Realtime for all new tables
ALTER PUBLICATION supabase_realtime ADD TABLE profiles;
ALTER PUBLICATION supabase_realtime ADD TABLE favorites;
ALTER PUBLICATION supabase_realtime ADD TABLE room_playlists;
ALTER PUBLICATION supabase_realtime ADD TABLE room_playlist_tracks;
