-- Migration: Add ProfileVideo table for profile-uploaded videos with independent view counts

CREATE TABLE IF NOT EXISTS "ProfileVideo" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_email VARCHAR(255) NOT NULL REFERENCES "User"(email) ON DELETE CASCADE,
  video_url TEXT NOT NULL,
  caption TEXT,
  views INTEGER DEFAULT 0,
  created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_profilevideo_user_email ON "ProfileVideo"(user_email);
CREATE INDEX IF NOT EXISTS idx_profilevideo_created_date ON "ProfileVideo"(created_date);
