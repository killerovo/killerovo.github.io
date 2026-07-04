-- Migration 006: Gomoku cleanup — indexes, cascade, manual purge
-- Run this in Supabase SQL Editor (https://qudyifwqcdququqndomb.supabase.co)
-- NOTE: Steps 1-3 are safe to run anytime. Step 4 is OPTIONAL — only
-- run it if you want to purge abandoned rooms and orphan chat NOW.

-- ================================================================
-- 1. Add indexes for faster cleanup queries
-- ================================================================
CREATE INDEX IF NOT EXISTS idx_gomoku_rooms_updated ON gomoku_rooms(updated_at);
CREATE INDEX IF NOT EXISTS idx_gomoku_chat_created  ON gomoku_chat(room_id, created_at);

-- ================================================================
-- 2. Clean orphan chat rows BEFORE adding the FK
--    (chat whose room_id no longer exists in gomoku_rooms)
-- ================================================================
DELETE FROM gomoku_chat
WHERE room_id NOT IN (SELECT room_id FROM gomoku_rooms);

-- ================================================================
-- 3. Add CASCADE foreign key: deleting a room auto-deletes its chat
-- ================================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_gomoku_chat_room'
  ) THEN
    ALTER TABLE gomoku_chat
      ADD CONSTRAINT fk_gomoku_chat_room
      FOREIGN KEY (room_id) REFERENCES gomoku_rooms(room_id)
      ON DELETE CASCADE;
  END IF;
END $$;

-- ================================================================
-- 4. [OPTIONAL] Manual purge — delete abandoned rooms older than 7 days
--    Uncomment and run whenever you want to clean up.
-- ================================================================
-- DELETE FROM gomoku_rooms
-- WHERE (player_black IS NULL AND player_white IS NULL)
--   AND status = 'waiting'
--   AND updated_at < now() - INTERVAL '7 days';
-- -- (chat for these rooms is auto-deleted by CASCADE)
