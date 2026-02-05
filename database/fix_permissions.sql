-- Fix permissions for popupapp user to create tables
-- Run this as a superuser (postgres)

-- Grant schema usage and creation
GRANT USAGE ON SCHEMA public TO popupapp;
GRANT CREATE ON SCHEMA public TO popupapp;

-- Grant permissions to create tables
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO popupapp;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO popupapp;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO popupapp;

-- Create Reel table if it doesn't exist
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

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_reel_user_email ON "Reel"(user_email);
CREATE INDEX IF NOT EXISTS idx_reel_created_date ON "Reel"(created_date);

-- Grant permissions on Reel table to popupapp
GRANT ALL ON "Reel" TO popupapp;
GRANT ALL ON "Reel"_id_seq TO popupapp;
