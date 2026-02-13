-- Run this script as postgres superuser to add the role column
-- Command: sudo -u postgres psql -d popup_play_db -f database/add_role_column.sql

-- Add role column to User table
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS role VARCHAR(50) DEFAULT 'user';

-- Grant permissions to popupapp user
GRANT ALL PRIVILEGES ON TABLE "User" TO popupapp;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO popupapp;

-- Set the admin user's role
UPDATE "User" SET role = 'admin' WHERE email = 'admin@popupplay.com';

-- Verify
SELECT email, name, role FROM "User";
