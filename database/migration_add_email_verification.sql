-- Migration: Add email verification OTP support
-- Adds is_email_verified column to User table and creates EmailVerificationOTP table

-- Add is_email_verified column to User table
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS is_email_verified BOOLEAN DEFAULT false;

-- Mark existing Google OAuth users as verified
UPDATE "User" SET is_email_verified = true WHERE password_hash = 'oauth_user' AND is_email_verified = false;

-- Create EmailVerificationOTP table
CREATE TABLE IF NOT EXISTS "EmailVerificationOTP" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) NOT NULL,
  otp VARCHAR(10) NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  used BOOLEAN DEFAULT false,
  attempts INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_otp_email ON "EmailVerificationOTP"(email);
CREATE INDEX IF NOT EXISTS idx_otp_expires ON "EmailVerificationOTP"(expires_at);
