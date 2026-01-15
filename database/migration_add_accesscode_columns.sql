-- Migration script to add missing columns to AccessCode table
-- Run as postgres superuser

-- Add missing columns for access code redemption
ALTER TABLE "AccessCode" 
ADD COLUMN IF NOT EXISTS valid_until TIMESTAMP,
ADD COLUMN IF NOT EXISTS is_used BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS used_by VARCHAR(255),
ADD COLUMN IF NOT EXISTS used_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS created_by VARCHAR(255);

-- Verify columns
SELECT column_name, data_type FROM information_schema.columns 
WHERE table_name='AccessCode' 
ORDER BY ordinal_position;

-- Show AccessCode table structure
\d "AccessCode"

-- Show current access codes
SELECT id, code, is_used, valid_until, used_by FROM "AccessCode";
