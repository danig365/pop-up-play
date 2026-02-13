-- Migration: Add missing profile fields to UserProfile table
-- Date: 2026-01-13

-- Add new columns to UserProfile table if they don't exist
ALTER TABLE "UserProfile"
ADD COLUMN IF NOT EXISTS interests TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN IF NOT EXISTS hobbies TEXT,
ADD COLUMN IF NOT EXISTS looking_for TEXT,
ADD COLUMN IF NOT EXISTS city VARCHAR(255),
ADD COLUMN IF NOT EXISTS state VARCHAR(255),
ADD COLUMN IF NOT EXISTS zip_code VARCHAR(20),
ADD COLUMN IF NOT EXISTS country VARCHAR(255);

-- Update indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_userprofile_city ON "UserProfile"(city);
CREATE INDEX IF NOT EXISTS idx_userprofile_country ON "UserProfile"(country);

-- Verify the changes
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'UserProfile' 
ORDER BY ordinal_position;
