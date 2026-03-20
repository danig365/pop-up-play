-- Migration: Create PasswordResetToken table for secure reset token storage
-- Replaces in-memory token storage

CREATE TABLE IF NOT EXISTS "PasswordResetToken" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) NOT NULL REFERENCES "User"(email) ON DELETE CASCADE,
  token VARCHAR(255) UNIQUE NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  used BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index for fast lookup by token
CREATE INDEX IF NOT EXISTS idx_reset_token ON "PasswordResetToken"(token);

-- Index for cleanup of expired tokens
CREATE INDEX IF NOT EXISTS idx_reset_token_expires ON "PasswordResetToken"(expires_at);
