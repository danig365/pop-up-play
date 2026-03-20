-- Migration: Add email tracking columns to BroadcastMessage table
-- Purpose: Track how many emails were successfully sent and failed for broadcast messages

ALTER TABLE "BroadcastMessage"
ADD COLUMN IF NOT EXISTS emails_sent INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS emails_failed INTEGER DEFAULT 0;

-- Add a comment describing the columns
COMMENT ON COLUMN "BroadcastMessage".emails_sent IS 'Number of emails successfully sent for this broadcast';
COMMENT ON COLUMN "BroadcastMessage".emails_failed IS 'Number of emails that failed to send for this broadcast';
