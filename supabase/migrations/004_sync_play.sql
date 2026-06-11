-- Migration 004: Sync play table
CREATE TABLE IF NOT EXISTS room_sync (
  id         BIGSERIAL PRIMARY KEY,
  room_id    TEXT UNIQUE NOT NULL,
  sender     TEXT,
  song_id    TEXT NOT NULL,
  title      TEXT,
  artist     TEXT,
  audio_url  TEXT,
  is_playing BOOLEAN DEFAULT false,
  position   DOUBLE PRECISION DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER PUBLICATION supabase_realtime ADD TABLE room_sync;
CREATE POLICY "Allow all on room_sync" ON room_sync FOR ALL USING (true) WITH CHECK (true);
