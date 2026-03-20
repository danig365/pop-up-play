-- Migration: Re-enable email notifications for legacy profiles
-- Purpose: Accounts created before the pop-up email rollout may have notifications disabled.
-- Cutoff date can be adjusted before running on other environments.

UPDATE "UserProfile"
SET email_notifications_enabled = true,
    updated_date = CURRENT_TIMESTAMP
WHERE created_date < TIMESTAMP '2026-03-14 00:00:00'
  AND email_notifications_enabled = false;
