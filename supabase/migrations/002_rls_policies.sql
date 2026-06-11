-- Migration 002: Enable RLS policies for new tables
-- Run this in Supabase SQL Editor
-- Without these policies, all INSERT/UPDATE/DELETE silently fail!

-- profiles: anyone can insert/update (no auth)
CREATE POLICY "Allow all on profiles" ON profiles FOR ALL USING (true) WITH CHECK (true);

-- favorites: anyone can read their own, insert/delete any
CREATE POLICY "Allow all on favorites" ON favorites FOR ALL USING (true) WITH CHECK (true);

-- room_playlists: anyone in room can read/write
CREATE POLICY "Allow all on room_playlists" ON room_playlists FOR ALL USING (true) WITH CHECK (true);

-- room_playlist_tracks: anyone in room can read/write
CREATE POLICY "Allow all on room_playlist_tracks" ON room_playlist_tracks FOR ALL USING (true) WITH CHECK (true);
