-- Migration: Add explicit LiveKit room_name to LiveEvent

ALTER TABLE "LiveEvent"
ADD COLUMN IF NOT EXISTS room_name VARCHAR(255);

UPDATE "LiveEvent"
SET room_name = COALESCE(NULLIF(room_name, ''), NULLIF(stream_id, ''))
WHERE COALESCE(room_name, '') = '';

ALTER TABLE "LiveEvent"
ALTER COLUMN stream_provider SET DEFAULT 'livekit';

ALTER TABLE "LiveEvent"
ALTER COLUMN room_name SET NOT NULL;
