/**
 * Mock Data Generator - Seeds the mock database with sample data
 */

import { mockDb } from './mockDatabase';

export function seedMockData() {
  // Clear existing data if running in development
  if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
    // Only seed if the database is empty
    const hasData = Object.values(mockDb.data).some(table => table && table.length > 0);
    if (hasData) {
      return; // Data already exists
    }
  }

  // Initialize tables
  mockDb.createTable('User');
  mockDb.createTable('UserProfile');
  mockDb.createTable('UserSubscription');
  mockDb.createTable('SubscriptionSettings');
  mockDb.createTable('Message');
  mockDb.createTable('AccessCode');
  mockDb.createTable('AboutVideo');
  mockDb.createTable('BlockedUser');
  mockDb.createTable('BroadcastMessage');

  // Create sample users
  const sampleUsers = [
    { email: 'demo@example.com', name: 'Demo User' },
    { email: 'john@example.com', name: 'John Doe' },
    { email: 'jane@example.com', name: 'Jane Smith' },
  ];

  sampleUsers.forEach(user => {
    mockDb.insert('User', user);
  });

  // Create sample user profiles
  const sampleProfiles = [
    {
      user_email: 'demo@example.com',
      name: 'Demo User',
      bio: 'Welcome to the app! This is a demo user.',
      avatar_url: 'https://ui-avatars.com/api/?name=Demo+User&background=0D8ABC&color=fff',
      is_popped_up: true,
      photos: [],
      videos: [],
    },
    {
      user_email: 'john@example.com',
      name: 'John Doe',
      bio: 'Explorer and traveler',
      avatar_url: 'https://ui-avatars.com/api/?name=John+Doe&background=FF6B6B&color=fff',
      is_popped_up: true,
      photos: [],
      videos: [],
    },
    {
      user_email: 'jane@example.com',
      name: 'Jane Smith',
      bio: 'Creative designer',
      avatar_url: 'https://ui-avatars.com/api/?name=Jane+Smith&background=4ECDC4&color=fff',
      is_popped_up: false,
      photos: [],
      videos: [],
    },
  ];

  sampleProfiles.forEach(profile => {
    mockDb.insert('UserProfile', profile);
  });

  // Create sample subscription settings
  mockDb.insert('SubscriptionSettings', {
    plan_name: 'Pro Plan',
    description: 'Full access to all features',
    monthly_price: 9.99,
    annual_price: 99.99,
    currency: 'USD',
    features: [
      'Unlimited messages',
      'Video calls',
      'Priority support',
      'Ad-free experience'
    ],
  });

  // Create sample subscription for demo user
  mockDb.insert('UserSubscription', {
    user_email: 'demo@example.com',
    status: 'active',
    plan: 'Pro',
    start_date: new Date().toISOString(),
    end_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
  });

  // Create sample access codes
  mockDb.insert('AccessCode', {
    code: 'WELCOME2024',
    usage_limit: 100,
    used_count: 5,
    is_active: true,
    description: 'Welcome code for new users',
  });

  mockDb.insert('AccessCode', {
    code: 'FRIEND20',
    usage_limit: 50,
    used_count: 12,
    is_active: true,
    description: 'Friend referral code',
  });

  // Create sample messages
  mockDb.insert('Message', {
    sender_email: 'john@example.com',
    recipient_email: 'demo@example.com',
    content: 'Hey, how are you doing?',
    is_read: true,
    conversation_id: 'conv_john_demo',
  });

  mockDb.insert('Message', {
    sender_email: 'demo@example.com',
    recipient_email: 'john@example.com',
    content: 'Great! How about you?',
    is_read: true,
    conversation_id: 'conv_john_demo',
  });

  mockDb.insert('Message', {
    sender_email: 'jane@example.com',
    recipient_email: 'demo@example.com',
    content: 'Hi there!',
    is_read: false,
    conversation_id: 'conv_jane_demo',
  });

  // Create sample broadcast messages
  mockDb.insert('BroadcastMessage', {
    from_email: 'demo@example.com',
    subject: 'Welcome to our app!',
    message: 'We are excited to have you here. Enjoy exploring all the features!',
    recipients_count: 3,
    created_by: 'demo@example.com',
  });

  // Create sample about videos
  mockDb.insert('AboutVideo', {
    title: 'How to Get Started',
    video_url: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
    description: 'A quick guide to getting started with the app',
    order: 1,
  });

  mockDb.insert('AboutVideo', {
    title: 'Features Overview',
    video_url: 'https://www.youtube.com/embed/jNQXAC9IVRw',
    description: 'Learn about all the amazing features',
    order: 2,
  });

  console.log('✅ Mock data seeded successfully');
}
