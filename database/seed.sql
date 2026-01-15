-- Seed test data for Pop-Up Play App
-- Run this after schema.sql to populate test users

-- Delete all existing data (careful with this!)
TRUNCATE TABLE "UserSession" CASCADE;
TRUNCATE TABLE "BroadcastMessage" CASCADE;
TRUNCATE TABLE "BlockedUser" CASCADE;
TRUNCATE TABLE "Message" CASCADE;
TRUNCATE TABLE "AboutVideo" CASCADE;
TRUNCATE TABLE "AccessCode" CASCADE;
TRUNCATE TABLE "SubscriptionSettings" CASCADE;
TRUNCATE TABLE "UserSubscription" CASCADE;
TRUNCATE TABLE "UserProfile" CASCADE;
TRUNCATE TABLE "User" CASCADE;

-- Insert Admin User
-- Email: admin@popupplay.com
-- Password: Admin@123 (base64 encoded: QWRtaW5AMTIz)
INSERT INTO "User" (email, name, password_hash, role, created_date, updated_date)
VALUES (
  'admin@popupplay.com',
  'Admin User',
  'QWRtaW5AMTIz',
  'admin',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
);

-- Insert Demo User
-- Email: demo@example.com
-- Password: password123 (base64 encoded: cGFzc3dvcmQxMjM=)
INSERT INTO "User" (email, name, password_hash, created_date, updated_date)
VALUES (
  'demo@example.com',
  'Demo User',
  'cGFzc3dvcmQxMjM=',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
);

-- Insert Test User
-- Email: test@example.com
-- Password: password123 (base64 encoded: cGFzc3dvcmQxMjM=)
INSERT INTO "User" (email, name, password_hash, created_date, updated_date)
VALUES (
  'test@example.com',
  'Test User',
  'cGFzc3dvcmQxMjM=',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
);

-- Create profiles for each user
INSERT INTO "UserProfile" (user_email, display_name, name, bio, is_popped_up, created_date, updated_date)
VALUES (
  'admin@popupplay.com',
  'Admin',
  'Admin User',
  'App Administrator',
  false,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
);

INSERT INTO "UserProfile" (user_email, display_name, name, bio, is_popped_up, created_date, updated_date)
VALUES (
  'demo@example.com',
  'Demo',
  'Demo User',
  'Demo account for testing',
  false,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
);

INSERT INTO "UserProfile" (user_email, display_name, name, bio, is_popped_up, created_date, updated_date)
VALUES (
  'test@example.com',
  'Test',
  'Test User',
  'Test account for trying features',
  false,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
);

-- Add default subscription settings
INSERT INTO "SubscriptionSettings" (plan_name, description, monthly_price, annual_price, currency, created_date, updated_date)
VALUES (
  'Free',
  'Free tier with basic features',
  0.00,
  0.00,
  'USD',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
);

INSERT INTO "SubscriptionSettings" (plan_name, description, monthly_price, annual_price, currency, created_date, updated_date)
VALUES (
  'Premium',
  'Premium tier with all features',
  9.99,
  99.99,
  'USD',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
);

-- Add sample access codes
INSERT INTO "AccessCode" (code, usage_limit, used_count, is_active, description, created_date, updated_date)
VALUES (
  'WELCOME2024',
  100,
  0,
  true,
  'Welcome discount code',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
);

-- Verify data was inserted
SELECT '✅ Database seeded successfully!' as status;
SELECT COUNT(*) as total_users FROM "User";
SELECT COUNT(*) as total_profiles FROM "UserProfile";
