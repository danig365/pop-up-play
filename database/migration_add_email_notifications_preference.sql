-- Migration: Add email_notifications_enabled column to UserProfile
-- This allows users to opt-in/out of email notifications for chat messages

ALTER TABLE "UserProfile"
ADD COLUMN IF NOT EXISTS email_notifications_enabled BOOLEAN DEFAULT true;

-- Update existing profiles to have the default value
UPDATE "UserProfile"
SET email_notifications_enabled = true
WHERE email_notifications_enabled IS NULL;
