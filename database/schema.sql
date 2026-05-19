-- Database Schema for Pop-Up Play App
-- PostgreSQL

-- Users table
CREATE TABLE IF NOT EXISTS "User" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  role VARCHAR(50) DEFAULT 'user',
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
  has_ever_popped_up BOOLEAN DEFAULT false,
  popup_message TEXT,
  photos TEXT[] DEFAULT ARRAY[]::TEXT[],
  videos TEXT[] DEFAULT ARRAY[]::TEXT[],
  location VARCHAR(255),
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  email_notifications_enabled BOOLEAN DEFAULT true,
  last_location_update TIMESTAMP,
  created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT unique_user_profile UNIQUE(user_email)
);

-- Profile Videos table (separate records so each video can track views)
CREATE TABLE IF NOT EXISTS "ProfileVideo" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_email VARCHAR(255) NOT NULL REFERENCES "User"(email) ON DELETE CASCADE,
  video_url TEXT NOT NULL,
  caption TEXT,
  views INTEGER DEFAULT 0,
  created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
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
  deleted_for TEXT[] DEFAULT ARRAY[]::TEXT[],
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
  valid_until TIMESTAMP,
  is_used BOOLEAN DEFAULT false,
  used_by VARCHAR(255),
  used_at TIMESTAMP,
  created_by VARCHAR(255),
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

-- Events table
CREATE TABLE IF NOT EXISTS "Event" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_email VARCHAR(255) NOT NULL REFERENCES "User"(email) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  image_url TEXT,
  address TEXT NOT NULL,
  zip_code VARCHAR(20) NOT NULL,
  city VARCHAR(255),
  state VARCHAR(255),
  country VARCHAR(255),
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  duration_days INTEGER NOT NULL,
  starts_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ends_at TIMESTAMP NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Ad Campaigns table
CREATE TABLE IF NOT EXISTS "AdCampaign" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_email VARCHAR(255) NOT NULL REFERENCES "User"(email) ON DELETE CASCADE,
  business_name VARCHAR(255) NOT NULL,
  contact_email VARCHAR(255) NOT NULL,
  contact_number VARCHAR(50),
  website_url TEXT NOT NULL,
  banner_image_url TEXT,
  duration_days INTEGER,
  pending_duration_days INTEGER,
  pending_amount DECIMAL(10, 2),
  amount_paid DECIMAL(10, 2),
  status VARCHAR(50) DEFAULT 'draft',
  paypal_order_id VARCHAR(255),
  paypal_payment_id VARCHAR(255),
  starts_at TIMESTAMP,
  ends_at TIMESTAMP,
  created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Live Events table
CREATE TABLE IF NOT EXISTS "LiveEvent" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  host_email VARCHAR(255) NOT NULL REFERENCES "User"(email) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  thumbnail_url TEXT,
  stream_provider VARCHAR(50) NOT NULL DEFAULT 'youtube',
  stream_id VARCHAR(255) NOT NULL,
  access_type VARCHAR(20) NOT NULL DEFAULT 'paid',
  price_usd DECIMAL(10, 2) DEFAULT 0,
  status VARCHAR(20) NOT NULL DEFAULT 'draft',
  scheduled_at TIMESTAMP,
  starts_at TIMESTAMP,
  ends_at TIMESTAMP,
  created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT liveevent_access_type_check CHECK (access_type IN ('free', 'paid')),
  CONSTRAINT liveevent_status_check CHECK (status IN ('draft', 'upcoming', 'live', 'ended'))
);

-- Live Event Access table
CREATE TABLE IF NOT EXISTS "LiveEventAccess" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES "LiveEvent"(id) ON DELETE CASCADE,
  user_email VARCHAR(255) NOT NULL REFERENCES "User"(email) ON DELETE CASCADE,
  payment_status VARCHAR(50) NOT NULL DEFAULT 'active',
  payment_provider VARCHAR(50) NOT NULL DEFAULT 'paypal',
  provider_order_id VARCHAR(255),
  paid_amount DECIMAL(10, 2),
  granted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT liveeventaccess_unique_event_user UNIQUE (event_id, user_email)
);

-- Live Event Presence table
CREATE TABLE IF NOT EXISTS "LiveEventPresence" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES "LiveEvent"(id) ON DELETE CASCADE,
  user_email VARCHAR(255) NOT NULL REFERENCES "User"(email) ON DELETE CASCADE,
  session_id VARCHAR(255),
  joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_seen_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  left_at TIMESTAMP,
  created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_user_email ON "User"(email);
CREATE INDEX IF NOT EXISTS idx_userprofile_email ON "UserProfile"(user_email);
CREATE INDEX IF NOT EXISTS idx_profilevideo_user_email ON "ProfileVideo"(user_email);
CREATE INDEX IF NOT EXISTS idx_profilevideo_created_date ON "ProfileVideo"(created_date);
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
CREATE INDEX IF NOT EXISTS idx_event_user_email ON "Event"(user_email);
CREATE INDEX IF NOT EXISTS idx_event_is_active ON "Event"(is_active);
CREATE INDEX IF NOT EXISTS idx_event_ends_at ON "Event"(ends_at);
CREATE INDEX IF NOT EXISTS idx_event_zip_code ON "Event"(zip_code);
CREATE INDEX IF NOT EXISTS idx_adcampaign_user_email ON "AdCampaign"(user_email);
CREATE INDEX IF NOT EXISTS idx_adcampaign_status ON "AdCampaign"(status);
CREATE INDEX IF NOT EXISTS idx_adcampaign_ends_at ON "AdCampaign"(ends_at);
CREATE INDEX IF NOT EXISTS idx_liveevent_host_email ON "LiveEvent"(host_email);
CREATE INDEX IF NOT EXISTS idx_liveevent_status ON "LiveEvent"(status);
CREATE INDEX IF NOT EXISTS idx_liveevent_scheduled_at ON "LiveEvent"(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_liveeventaccess_event_id ON "LiveEventAccess"(event_id);
CREATE INDEX IF NOT EXISTS idx_liveeventaccess_user_email ON "LiveEventAccess"(user_email);
CREATE INDEX IF NOT EXISTS idx_liveeventaccess_payment_status ON "LiveEventAccess"(payment_status);
CREATE INDEX IF NOT EXISTS idx_liveeventpresence_event_id ON "LiveEventPresence"(event_id);
CREATE INDEX IF NOT EXISTS idx_liveeventpresence_user_email ON "LiveEventPresence"(user_email);
CREATE INDEX IF NOT EXISTS idx_liveeventpresence_last_seen_at ON "LiveEventPresence"(last_seen_at);
CREATE INDEX IF NOT EXISTS idx_liveeventpresence_event_last_seen ON "LiveEventPresence"(event_id, last_seen_at);
