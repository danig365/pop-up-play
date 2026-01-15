-- SQL Script to create admin user for Pop-Up Play
-- Run this in your PostgreSQL database

-- First, ensure the role column exists
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS role VARCHAR(50) DEFAULT 'user';

-- Create the admin user (or update if exists)
-- Email: admin@popupplay.com
-- Password: Admin@123
-- Password hash (base64 encoded): QWRtaW5AMTIz

INSERT INTO "User" (email, name, password_hash, role, created_date, updated_date)
VALUES (
  'admin@popupplay.com',
  'Admin User',
  'QWRtaW5AMTIz',
  'admin',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
)
ON CONFLICT (email) DO UPDATE SET
  role = 'admin',
  password_hash = 'QWRtaW5AMTIz',
  name = 'Admin User',
  updated_date = CURRENT_TIMESTAMP;

-- Create admin profile if it doesn't exist
INSERT INTO "UserProfile" (user_email, display_name, name, bio, is_popped_up, created_date, updated_date)
VALUES (
  'admin@popupplay.com',
  'Admin',
  'Admin User',
  'App Administrator',
  false,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
)
ON CONFLICT (user_email) DO NOTHING;

-- Verify the admin user was created
SELECT email, name, role FROM "User" WHERE email = 'admin@popupplay.com';

-- Show all users
SELECT email, name, role FROM "User" ORDER BY created_date;
