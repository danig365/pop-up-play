-- Migration: Normalize all emails to lowercase and prevent future case-variant duplicates
-- Run this ONCE. It is idempotent (safe to re-run).

-- Step 1: Lowercase all User emails
UPDATE "User"
SET email = lower(email), updated_date = CURRENT_TIMESTAMP
WHERE email != lower(email);

-- Step 2: Lowercase all UserProfile user_email values
UPDATE "UserProfile"
SET user_email = lower(user_email), updated_date = CURRENT_TIMESTAMP
WHERE user_email != lower(user_email);

-- Step 3: Lowercase emails in related tables
UPDATE "UserSubscription"
SET user_email = lower(user_email)
WHERE user_email != lower(user_email);

UPDATE "Message"
SET sender_email = lower(sender_email)
WHERE sender_email != lower(sender_email);

UPDATE "Message"
SET receiver_email = lower(receiver_email)
WHERE receiver_email != lower(receiver_email);

UPDATE "BlockedUser"
SET blocker_email = lower(blocker_email)
WHERE blocker_email != lower(blocker_email);

UPDATE "BlockedUser"
SET blocked_email = lower(blocked_email)
WHERE blocked_email != lower(blocked_email);

UPDATE "UserSession"
SET user_email = lower(user_email)
WHERE user_email != lower(user_email);

UPDATE "Reel"
SET user_email = lower(user_email)
WHERE user_email != lower(user_email);

UPDATE "ProfileVideo"
SET user_email = lower(user_email)
WHERE user_email != lower(user_email);

UPDATE "EmailVerificationOTP"
SET email = lower(email)
WHERE email != lower(email);

UPDATE "PasswordResetToken"
SET email = lower(email)
WHERE email != lower(email);

-- Step 4: Create unique index on lower(email) for User table (prevents future duplicates)
-- The existing UNIQUE on email column already enforces exact-match uniqueness.
-- This additional index enforces case-insensitive uniqueness.
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_email_lower ON "User" (lower(email));

-- Step 5: Create unique index on lower(user_email) for UserProfile table
CREATE UNIQUE INDEX IF NOT EXISTS idx_userprofile_email_lower ON "UserProfile" (lower(user_email));
