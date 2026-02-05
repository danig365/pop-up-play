-- Migration: Add Reels table for short-form video content

CREATE TABLE IF NOT EXISTS "Reel" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_email VARCHAR(255) NOT NULL REFERENCES "User"(email) ON DELETE CASCADE,
  video_url TEXT NOT NULL,
  caption TEXT,
  duration INTEGER,
  views INTEGER DEFAULT 0,
  created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_reel_user_email ON "Reel"(user_email);
CREATE INDEX IF NOT EXISTS idx_reel_created_date ON "Reel"(created_date);
