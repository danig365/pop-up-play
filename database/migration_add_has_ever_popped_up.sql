-- Migration: Add has_ever_popped_up column to UserProfile
-- This column tracks whether a user has ever popped up before.
-- Auto-popup on the Home page will only trigger when this is false (first signup).
-- After that, users must manually pop up/down using the button.

ALTER TABLE "UserProfile"
ADD COLUMN IF NOT EXISTS has_ever_popped_up BOOLEAN DEFAULT false;

-- Backfill: Mark all existing users as having popped up before
-- so they don't get auto-popped on next login.
UPDATE "UserProfile" SET has_ever_popped_up = true;
