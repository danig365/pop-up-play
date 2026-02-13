-- Add role column to User table for admin functionality
-- This allows users to have roles like 'admin', 'user', 'moderator', etc.

ALTER TABLE "User" ADD COLUMN IF NOT EXISTS role VARCHAR(50) DEFAULT 'user';

-- Set admin@example.com as admin
UPDATE "User" SET role = 'admin' WHERE email = 'admin@example.com';

-- Verify the migration
SELECT email, role FROM "User" ORDER BY created_date;
