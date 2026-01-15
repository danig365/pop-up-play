/**
 * Mock Base44 Client - Complete replacement for Base44 SDK
 * Provides all the same methods and entity operations
 */

import { mockDb } from './mockDatabase';
import { mockAuth } from './mockAuth';

// Entity class for CRUD operations
class MockEntity {
  constructor(tableName) {
    this.tableName = tableName;
  }

  async list(sortBy = '', limit = null) {
    const records = mockDb.list(this.tableName);
    if (limit) {
      return records.slice(0, limit);
    }
    return records;
  }

  async filter(criteria = {}) {
    return mockDb.find(this.tableName, criteria);
  }

  async findOne(criteria = {}) {
    return mockDb.findOne(this.tableName, criteria);
  }

  async create(data) {
    return mockDb.insert(this.tableName, data);
  }

  async update(id, data) {
    return mockDb.update(this.tableName, id, data);
  }

  async delete(id) {
    mockDb.delete(this.tableName, id);
    return { success: true };
  }

  async bulkCreate(records) {
    return records.map(record => mockDb.insert(this.tableName, record));
  }
}

// Integrations mock
class MockIntegrations {
  Core = {
    UploadFile: async ({ file }) => {
      // Simulate file upload
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = () => {
          resolve({
            file_url: reader.result, // Data URL for mock purposes
            file_name: file.name,
          });
        };
        reader.readAsDataURL(file);
      });
    },
    SendEmail: async (config) => {
      console.log('Email sent (mock):', config);
      return { success: true };
    },
  };
}

// Functions/Lambdas mock
class MockFunctions {
  async invoke(functionName, params = {}) {
    console.log(`Function invoked (mock): ${functionName}`, params);
    
    // Simulate different function responses
    switch (functionName) {
      case 'createCheckout':
        return {
          checkout_url: 'https://checkout.example.com/mock',
          session_id: 'mock_session_' + Math.random().toString(36).substr(2, 9),
        };
      case 'sendBroadcast':
        return { success: true, broadcast_sent: true };
      case 'getSubscriptionStatus':
        return { is_active: true, status: 'active' };
      case 'popDownUser':
        return { success: true };
      default:
        return { success: true };
    }
  }
}

// Logs mock
class MockAppLogs {
  async logUserInApp(pageName) {
    console.log(`User activity logged (mock): ${pageName}`);
    return { success: true };
  }
}

// Main Base44 client
class MockBase44 {
  constructor() {
    this.auth = mockAuth;
    this.integrations = new MockIntegrations();
    this.functions = new MockFunctions();
    this.appLogs = new MockAppLogs();
    
    // Create all entity types
    this.entities = {
      User: new MockEntity('User'),
      UserProfile: new MockEntity('UserProfile'),
      UserSubscription: new MockEntity('UserSubscription'),
      SubscriptionSettings: new MockEntity('SubscriptionSettings'),
      Message: new MockEntity('Message'),
      AccessCode: new MockEntity('AccessCode'),
      AboutVideo: new MockEntity('AboutVideo'),
      BlockedUser: new MockEntity('BlockedUser'),
      BroadcastMessage: new MockEntity('BroadcastMessage'),
    };
    
    // Service role for admin operations
    this.asServiceRole = {
      entities: this.entities,
      integrations: this.integrations,
    };

    // Initialize mock data
    this.initializeMockData();
  }

  initializeMockData() {
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

    // Add demo user if not exists
    const existingUser = mockDb.findOne('User', { email: 'demo@example.com' });
    if (!existingUser) {
      mockDb.insert('User', {
        email: 'demo@example.com',
        name: 'Demo User',
      });
    }

    // Add demo subscription settings if not exists
    const existingSettings = mockDb.list('SubscriptionSettings');
    if (existingSettings.length === 0) {
      mockDb.insert('SubscriptionSettings', {
        plan_name: 'Pro',
        monthly_price: 9.99,
        annual_price: 99.99,
        features: ['Feature 1', 'Feature 2', 'Feature 3'],
      });
    }

    // Add demo user profile if not exists
    const existingProfile = mockDb.findOne('UserProfile', { user_email: 'demo@example.com' });
    if (!existingProfile) {
      mockDb.insert('UserProfile', {
        user_email: 'demo@example.com',
        name: 'Demo User',
        bio: 'Welcome to the app!',
        avatar_url: 'https://ui-avatars.com/api/?name=Demo+User&background=random',
        is_popped_up: false,
      });
    }
  }

  resetData() {
    mockDb.clear();
    this.initializeMockData();
  }
}

export const base44 = new MockBase44();
