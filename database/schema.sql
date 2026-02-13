-- Database Schema for Pop-Up Play App
-- PostgreSQL

-- Users table
CREATE TABLE IF NOT EXISTS "User" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255),
  created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User Profiles table
CREATE TABLE IF NOT EXISTS "UserProfile" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_email VARCHAR(255) NOT NULL REFERENCES "User"(email) ON DELETE CASCADE,
  display_name VARCHAR(255),
  name VARCHAR(255),
  bio TEXT,
  avatar_url TEXT,
  age INTEGER,
  gender VARCHAR(50),
  interested_in VARCHAR(50),
  interests TEXT[] DEFAULT ARRAY[]::TEXT[],
  hobbies TEXT,
  looking_for TEXT,
  city VARCHAR(255),
  state VARCHAR(255),
  zip_code VARCHAR(20),
  country VARCHAR(255),
  is_popped_up BOOLEAN DEFAULT false,
  popup_message TEXT,
  photos TEXT[] DEFAULT ARRAY[]::TEXT[],
  videos TEXT[] DEFAULT ARRAY[]::TEXT[],
  location VARCHAR(255),
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  last_location_update TIMESTAMP,
  created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT unique_user_profile UNIQUE(user_email)
);

-- User Subscriptions table
CREATE TABLE IF NOT EXISTS "UserSubscription" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_email VARCHAR(255) NOT NULL REFERENCES "User"(email) ON DELETE CASCADE,
  status VARCHAR(50) DEFAULT 'inactive',
  plan VARCHAR(100),
  start_date TIMESTAMP,
  end_date TIMESTAMP,
  stripe_subscription_id VARCHAR(255),
  created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Subscription Settings table
CREATE TABLE IF NOT EXISTS "SubscriptionSettings" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_name VARCHAR(255) NOT NULL,
  description TEXT,
  monthly_price DECIMAL(10, 2),
  annual_price DECIMAL(10, 2),
  currency VARCHAR(10) DEFAULT 'USD',
  features TEXT[] DEFAULT ARRAY[]::TEXT[],
  created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Messages table
CREATE TABLE IF NOT EXISTS "Message" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_email VARCHAR(255) NOT NULL REFERENCES "User"(email) ON DELETE CASCADE,
  receiver_email VARCHAR(255) NOT NULL REFERENCES "User"(email) ON DELETE CASCADE,
  recipient_email VARCHAR(255),
  content TEXT NOT NULL,
  read BOOLEAN DEFAULT false,
  is_read BOOLEAN DEFAULT false,
  conversation_id VARCHAR(255),
  attachment_url TEXT,
  created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Access Codes table
CREATE TABLE IF NOT EXISTS "AccessCode" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(50) UNIQUE NOT NULL,
  usage_limit INTEGER,
  used_count INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  description TEXT,
  created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- About Videos table
CREATE TABLE IF NOT EXISTS "AboutVideo" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  video_url TEXT NOT NULL,
  description TEXT,
  "order" INTEGER,
  created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Blocked Users table
CREATE TABLE IF NOT EXISTS "BlockedUser" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_email VARCHAR(255) NOT NULL REFERENCES "User"(email) ON DELETE CASCADE,
  blocked_email VARCHAR(255) NOT NULL REFERENCES "User"(email) ON DELETE CASCADE,
  created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT unique_block UNIQUE(blocker_email, blocked_email)
);

-- Broadcast Messages table
CREATE TABLE IF NOT EXISTS "BroadcastMessage" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_email VARCHAR(255) NOT NULL REFERENCES "User"(email) ON DELETE CASCADE,
  subject VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  recipients_count INTEGER DEFAULT 0,
  created_by VARCHAR(255) NOT NULL,
  created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User Sessions table (for multi-device session management)
CREATE TABLE IF NOT EXISTS "UserSession" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_email VARCHAR(255) NOT NULL REFERENCES "User"(email) ON DELETE CASCADE,
  device_id VARCHAR(255) NOT NULL,
  last_active TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  user_agent TEXT,
  created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT unique_user_device UNIQUE(user_email, device_id)
);

-- Video Signals table (for WebRTC peer connections)
CREATE TABLE IF NOT EXISTS "VideoSignal" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  call_id VARCHAR(255) NOT NULL,
  from_email VARCHAR(255) NOT NULL REFERENCES "User"(email) ON DELETE CASCADE,
  to_email VARCHAR(255) NOT NULL REFERENCES "User"(email) ON DELETE CASCADE,
  signal_type VARCHAR(50) NOT NULL,
  signal_data TEXT,
  created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Reels table (for short-form video content)
CREATE TABLE IF NOT EXISTS "Reel" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_email VARCHAR(255) NOT NULL REFERENCES "User"(email) ON DELETE CASCADE,
  video_url TEXT NOT NULL,
  caption TEXT,
  duration INTEGER,
  views INTEGER DEFAULT 0,
  created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_user_email ON "User"(email);
CREATE INDEX IF NOT EXISTS idx_userprofile_email ON "UserProfile"(user_email);
CREATE INDEX IF NOT EXISTS idx_usersubscription_email ON "UserSubscription"(user_email);
CREATE INDEX IF NOT EXISTS idx_message_sender ON "Message"(sender_email);
CREATE INDEX IF NOT EXISTS idx_message_recipient ON "Message"(recipient_email);
CREATE INDEX IF NOT EXISTS idx_message_conversation ON "Message"(conversation_id);
CREATE INDEX IF NOT EXISTS idx_blockeduser_blocker ON "BlockedUser"(blocker_email);
CREATE INDEX IF NOT EXISTS idx_broadcast_from ON "BroadcastMessage"(from_email);
CREATE INDEX IF NOT EXISTS idx_usersession_email ON "UserSession"(user_email);
CREATE INDEX IF NOT EXISTS idx_usersession_device ON "UserSession"(device_id);
CREATE INDEX IF NOT EXISTS idx_reel_user_email ON "Reel"(user_email);
CREATE INDEX IF NOT EXISTS idx_reel_created_date ON "Reel"(created_date);
