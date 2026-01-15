-- Migration: Add attachment_url column to Message table
-- Date: 2026-01-13

ALTER TABLE "Message"
ADD COLUMN IF NOT EXISTS attachment_url TEXT;

-- Verify the change
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'Message' 
ORDER BY ordinal_position;
