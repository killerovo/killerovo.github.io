-- Migration 005: Gomoku (五子棋) — room-based real-time game
-- Run this in Supabase SQL Editor (https://qudyifwqcdququqndomb.supabase.co)

-- 1. Gomoku rooms — holds full game state as JSONB moves array
CREATE TABLE IF NOT EXISTS gomoku_rooms (
  id           BIGSERIAL PRIMARY KEY,
  room_id      TEXT UNIQUE NOT NULL,
  player_black TEXT,
  player_white TEXT,
  status       TEXT DEFAULT 'waiting',   -- waiting | playing | finished
  moves        JSONB DEFAULT '[]',       -- [{x,y,color}, ...]
  current_turn TEXT DEFAULT 'black',
  winner       TEXT,
  undo_count   INTEGER DEFAULT 0,
  undo_request TEXT,                     -- color of player requesting undo, NULL if none
  created_at   TIMESTAMPTZ DEFAULT now(),
  updated_at   TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_gomoku_rooms_room ON gomoku_rooms(room_id);

-- 2. Gomoku chat — per-room chat messages
CREATE TABLE IF NOT EXISTS gomoku_chat (
  id         BIGSERIAL PRIMARY KEY,
  room_id    TEXT NOT NULL,
  username   TEXT NOT NULL,
  message    TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_gomoku_chat_room ON gomoku_chat(room_id);

-- 3. RLS policies (open, consistent with existing project)
CREATE POLICY "Allow all on gomoku_rooms" ON gomoku_rooms FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on gomoku_chat"  ON gomoku_chat  FOR ALL USING (true) WITH CHECK (true);

-- 4. Enable Realtime for both tables
ALTER PUBLICATION supabase_realtime ADD TABLE gomoku_rooms;
ALTER PUBLICATION supabase_realtime ADD TABLE gomoku_chat;
