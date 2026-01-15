/**
 * Express.js Backend API for Pop-Up Play App
 * Connects to PostgreSQL database
 */

import express from 'express';
import pg from 'pg';
import cors from 'cors';
import bodyParser from 'body-parser';
import dotenv from 'dotenv';
import nodemailer from 'nodemailer';

dotenv.config();

const { Pool } = pg;
const app = express();
const PORT = process.env.API_PORT || 3001;

// In-memory store for password reset tokens (in production, use database)
const resetTokens = new Map();

// Configure Gmail SMTP
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

// Test email configuration
transporter.verify((error, success) => {
  if (error) {
    console.log('⚠️ Email service error:', error.message);
  } else {
    console.log('✅ Email service ready');
  }
});

// PostgreSQL connection pool
const poolConfig = {
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT, 10) || 5432,
  database: process.env.DB_NAME || 'popup_play_db',
};

// Only add password if explicitly set (not empty string)
const dbPassword = process.env.DB_PASSWORD;
if (dbPassword && dbPassword.trim && dbPassword.trim().length > 0) {
  poolConfig.password = dbPassword;
}


const pool = new Pool(poolConfig);

// Run migrations on startup
async function runMigrations() {
  try {
    
    // Add missing columns to AccessCode table if they don't exist
    try {
      await pool.query(`
        ALTER TABLE "AccessCode" 
        ADD COLUMN IF NOT EXISTS valid_until TIMESTAMP,
        ADD COLUMN IF NOT EXISTS is_used BOOLEAN DEFAULT false,
        ADD COLUMN IF NOT EXISTS used_by VARCHAR(255),
        ADD COLUMN IF NOT EXISTS used_at TIMESTAMP,
        ADD COLUMN IF NOT EXISTS created_by VARCHAR(255);
      `);
    } catch (migErr) {
      console.warn('⚠️ AccessCode migration note:', migErr.message);
    }

    // Add missing columns to SubscriptionSettings
    try {
      await pool.query(`
        ALTER TABLE "SubscriptionSettings"
        ADD COLUMN IF NOT EXISTS stripe_price_id VARCHAR(255),
        ADD COLUMN IF NOT EXISTS free_trial_enabled BOOLEAN DEFAULT false,
        ADD COLUMN IF NOT EXISTS trial_days INTEGER DEFAULT 30,
        ADD COLUMN IF NOT EXISTS subscription_enabled BOOLEAN DEFAULT false;
      `);
    } catch (migErr) {
      console.warn('⚠️ SubscriptionSettings migration note:', migErr.message);
    }

    // Verify table structures
    const accessCodeCols = await pool.query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name='AccessCode' 
      ORDER BY ordinal_position
    `);

    const subSettingsCols = await pool.query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name='SubscriptionSettings' 
      ORDER BY ordinal_position
    `);

    // Create default SubscriptionSettings if none exists
    const existingSettings = await pool.query(`SELECT COUNT(*) as count FROM "SubscriptionSettings"`);
    if (existingSettings.rows[0].count === 0) {
      await pool.query(`
        INSERT INTO "SubscriptionSettings" 
        (plan_name, description, monthly_price, annual_price, currency, stripe_price_id, free_trial_enabled, trial_days, subscription_enabled, features)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        ON CONFLICT DO NOTHING
      `, ['Basic Plan', 'Basic subscription plan', 0, 0, 'USD', 'price_mock_dev', false, 30, false, '{}']);
    }
  } catch (error) {
    console.error('❌ Migration error:', error.message);
  }
}

// Run migrations
runMigrations();

// Middleware
app.use(cors());
// Increase body size limit to 100MB for base64 encoded images/videos
app.use(bodyParser.json({ limit: '100mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '100mb' }));

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ error: err.message });
});

// ============ Admin Setup Route ============

// Setup admin user endpoint
app.post('/api/admin/setup', async (req, res) => {
  try {
    const ADMIN_EMAIL = 'admin@popupplay.com';
    const ADMIN_PASSWORD = 'Admin@123';
    const passwordHash = Buffer.from(ADMIN_PASSWORD).toString('base64');

    // Check if role column exists (don't try to create it - no permission)
    const columnCheck = await pool.query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'User' AND column_name = 'role'
    `);
    const hasRoleColumn = columnCheck.rows.length > 0;

    // Check if admin user exists
    const existing = await pool.query(`SELECT * FROM "User" WHERE email = $1`, [ADMIN_EMAIL]);

    if (existing.rows.length > 0) {
      // Update existing user to be admin
      if (hasRoleColumn) {
        await pool.query(
          `UPDATE "User" SET role = 'admin', password_hash = $1, name = 'Admin User' WHERE email = $2`,
          [passwordHash, ADMIN_EMAIL]
        );
      } else {
        await pool.query(
          `UPDATE "User" SET password_hash = $1, name = 'Admin User' WHERE email = $2`,
          [passwordHash, ADMIN_EMAIL]
        );
      }
    } else {
      // Create new admin user
      if (hasRoleColumn) {
        await pool.query(
          `INSERT INTO "User" (email, name, password_hash, role) VALUES ($1, $2, $3, 'admin')`,
          [ADMIN_EMAIL, 'Admin User', passwordHash]
        );
      } else {
        await pool.query(
          `INSERT INTO "User" (email, name, password_hash) VALUES ($1, $2, $3)`,
          [ADMIN_EMAIL, 'Admin User', passwordHash]
        );
      }
    }

    // Create profile if it doesn't exist
    const profileExists = await pool.query(`SELECT * FROM "UserProfile" WHERE user_email = $1`, [ADMIN_EMAIL]);
    if (profileExists.rows.length === 0) {
      await pool.query(
        `INSERT INTO "UserProfile" (user_email, display_name, name, bio, is_popped_up) VALUES ($1, 'Admin', 'Admin User', 'App Administrator', false)`,
        [ADMIN_EMAIL]
      );
    }

    // Get the admin user to return
    const adminUser = await pool.query(`SELECT email, name, role FROM "User" WHERE email = $1`, [ADMIN_EMAIL]);

    // Get all users for debugging
    const allUsers = await pool.query(`SELECT email, name, role FROM "User"`);

    res.json({
      success: true,
      message: 'Admin user created successfully',
      credentials: {
        email: ADMIN_EMAIL,
        password: ADMIN_PASSWORD
      },
      user: adminUser.rows[0],
      allUsers: allUsers.rows
    });
  } catch (error) {
    console.error('❌ Admin setup error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Debug endpoint to check user role
app.get('/api/admin/check/:email', async (req, res) => {
  try {
    const { email } = req.params;
    const user = await pool.query(`SELECT email, name, role FROM "User" WHERE email = $1`, [email]);
    if (user.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(user.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET version of admin setup for easy browser access
app.get('/api/admin/setup', async (req, res) => {
  try {
    const ADMIN_EMAIL = 'admin@popupplay.com';
    const ADMIN_PASSWORD = 'Admin@123';
    const passwordHash = Buffer.from(ADMIN_PASSWORD).toString('base64');

    // Check if role column exists
    const columnCheck = await pool.query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'User' AND column_name = 'role'
    `);
    
    const hasRoleColumn = columnCheck.rows.length > 0;

    // Check if admin user exists
    const existing = await pool.query(`SELECT * FROM "User" WHERE email = $1`, [ADMIN_EMAIL]);

    if (existing.rows.length > 0) {
      // Update existing user
      if (hasRoleColumn) {
        await pool.query(
          `UPDATE "User" SET role = 'admin', password_hash = $1, name = 'Admin User' WHERE email = $2`,
          [passwordHash, ADMIN_EMAIL]
        );
      } else {
        await pool.query(
          `UPDATE "User" SET password_hash = $1, name = 'Admin User' WHERE email = $2`,
          [passwordHash, ADMIN_EMAIL]
        );
      }
      console.log('✓ Admin user updated');
    } else {
      // Create new admin user
      if (hasRoleColumn) {
        await pool.query(
          `INSERT INTO "User" (email, name, password_hash, role) VALUES ($1, $2, $3, 'admin')`,
          [ADMIN_EMAIL, 'Admin User', passwordHash]
        );
      } else {
        await pool.query(
          `INSERT INTO "User" (email, name, password_hash) VALUES ($1, $2, $3)`,
          [ADMIN_EMAIL, 'Admin User', passwordHash]
        );
      }
    }

    // Create profile if it doesn't exist
    const profileExists = await pool.query(`SELECT * FROM "UserProfile" WHERE user_email = $1`, [ADMIN_EMAIL]);
    if (profileExists.rows.length === 0) {
      await pool.query(
        `INSERT INTO "UserProfile" (user_email, display_name, name, bio, is_popped_up) VALUES ($1, 'Admin', 'Admin User', 'App Administrator', false)`,
        [ADMIN_EMAIL]
      );
    }

    const adminUser = await pool.query(`SELECT email, name, role FROM "User" WHERE email = $1`, [ADMIN_EMAIL]);
    const allUsers = await pool.query(`SELECT email, name, role FROM "User"`);

    res.json({
      success: true,
      message: hasRoleColumn ? 'Admin user created/updated successfully' : 'Admin user created but role column is missing - need to add it with postgres user',
      hasRoleColumn,
      credentials: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD },
      user: adminUser.rows[0],
      allUsers: allUsers.rows
    });
  } catch (error) {
    console.error('❌ Admin setup error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============ Authentication Routes ============

// Get current user
app.get('/api/auth/me', async (req, res) => {
  try {
    const email = req.headers['x-user-email'];
    if (!email) {
      return res.status(401).json({ error: 'No user email provided' });
    }

    const result = await pool.query('SELECT * FROM "User" WHERE email = $1', [email]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password, name } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    if (!password) {
      return res.status(400).json({ error: 'Password is required' });
    }

    let user = await pool.query('SELECT * FROM "User" WHERE email = $1', [email]);

    if (user.rows.length === 0) {
      // Create new user with password hash (simple hashing for demo)
      // In production, use bcrypt or similar for proper password hashing
      const passwordHash = Buffer.from(password).toString('base64');
      user = await pool.query(
        'INSERT INTO "User" (email, name, password_hash) VALUES ($1, $2, $3) RETURNING *',
        [email, name || email.split('@')[0], passwordHash]
      );
    } else {
      // Validate password
      const storedUser = user.rows[0];
      const passwordHash = Buffer.from(password).toString('base64');
      
      if (storedUser.password_hash !== passwordHash) {
        return res.status(401).json({ error: 'Invalid email or password' });
      }
    }

    res.json({ 
      ...user.rows[0], 
      token: 'mock_token_' + Math.random().toString(36).substr(2, 20),
      password_hash: undefined // Don't send password hash to client
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Signup
app.post('/api/auth/signup', async (req, res) => {
  try {
    const { email, password, name } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    if (!password) {
      return res.status(400).json({ error: 'Password is required' });
    }

    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    // Check if user already exists
    let user = await pool.query('SELECT * FROM "User" WHERE email = $1', [email]);

    if (user.rows.length > 0) {
      return res.status(400).json({ error: 'Email already exists' });
    }

    // Create new user with password hash (simple hashing for demo)
    // In production, use bcrypt or similar for proper password hashing
    const passwordHash = Buffer.from(password).toString('base64');
    user = await pool.query(
      'INSERT INTO "User" (email, name, password_hash) VALUES ($1, $2, $3) RETURNING *',
      [email, name || email.split('@')[0], passwordHash]
    );

    res.json({ 
      ...user.rows[0], 
      token: 'mock_token_' + Math.random().toString(36).substr(2, 20),
      password_hash: undefined // Don't send password hash to client
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Forgot Password
app.post('/api/auth/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    // Check if user exists
    const user = await pool.query('SELECT * FROM "User" WHERE email = $1', [email]);

    if (user.rows.length === 0) {
      // For security, don't reveal if email exists
      return res.json({ 
        success: true, 
        message: 'If an account exists with that email, a password reset link has been sent' 
      });
    }

    // Generate reset token (random 32 character string)
    const resetToken = Math.random().toString(36).substr(2) + Math.random().toString(36).substr(2);
    
    // Store token with expiration (1 hour)
    const expiryTime = Date.now() + 3600000; // 1 hour
    resetTokens.set(resetToken, { email, expiryTime });

    // Reset link (in production, this would be your frontend URL)
    const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;

    // Prepare email content
    const mailOptions = {
      from: process.env.GMAIL_USER,
      to: email,
      subject: 'Pop-Up Play - Password Reset Request',
      html: `
        <h2>Password Reset Request</h2>
        <p>You requested a password reset for your Pop-Up Play account.</p>
        <p>Click the link below to reset your password (valid for 1 hour):</p>
        <p><a href="${resetLink}" style="background-color: #1e293b; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">Reset Password</a></p>
        <p>Or copy and paste this link in your browser:</p>
        <p>${resetLink}</p>
        <hr>
        <p>If you did not request this, please ignore this email.</p>
        <p>Your reset token: <code>${resetToken}</code></p>
      `,
    };

    // Send email
    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.error('❌ [ForgotPassword] Email send failed:', error.message);
        // Still respond with success for security (don't reveal if email sent failed)
      } else {
        console.log('✅ [ForgotPassword] Reset email sent:', info.response);
      }
    });

    res.json({ 
      success: true, 
      message: 'If an account exists with that email, a password reset link has been sent',
      token: resetToken // For testing purposes only - remove in production
    });
  } catch (error) {
    console.error('❌ [ForgotPassword] Error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Reset Password (handle token validation and password update)
app.post('/api/auth/reset-password', async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({ error: 'Token and new password are required' });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    // Check if token exists and is not expired
    const tokenData = resetTokens.get(token);
    if (!tokenData) {
      return res.status(400).json({ error: 'Invalid or expired reset token' });
    }

    if (Date.now() > tokenData.expiryTime) {
      resetTokens.delete(token);
      return res.status(400).json({ error: 'Reset token has expired' });
    }

    // Update user password
    const email = tokenData.email;
    const passwordHash = Buffer.from(newPassword).toString('base64');
    
    await pool.query(
      'UPDATE "User" SET password_hash = $1 WHERE email = $2',
      [passwordHash, email]
    );

    // Delete used token
    resetTokens.delete(token);

    console.log('✅ [ResetPassword] Password updated for:', email);
    res.json({ 
      success: true, 
      message: 'Password has been reset successfully' 
    });
  } catch (error) {
    console.error('❌ [ResetPassword] Error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Logout
app.post('/api/auth/logout', async (req, res) => {
  try {
    const { email } = req.body;
    
    if (email) {
      // Delete all sessions for this user
      try {
        await pool.query(
          'DELETE FROM "UserSession" WHERE user_email = $1',
          [email]
        );
      } catch (error) {
        console.warn('⚠️ [Server.logout] Failed to clear sessions:', error.message);
      }
    }
    
    res.json({ success: true, message: 'Logged out successfully' });
  } catch (error) {
    console.error('❌ [Server.logout] Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============ User Routes ============

app.get('/api/users', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM "User"');
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/users/:email', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM "User" WHERE email = $1', [req.params.email]);
    res.json(result.rows[0] || {});
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============ Generic Entity Routes ============

// GET /api/entities/:table
app.get('/api/entities/:table', async (req, res) => {
  try {
    const { table } = req.params;
    const { limit = 100, offset = 0 } = req.query;

    // Validate table name (prevent SQL injection)
    const validTables = ['User', 'UserProfile', 'UserSubscription', 'SubscriptionSettings', 
                         'Message', 'AccessCode', 'AboutVideo', 'BlockedUser', 'BroadcastMessage', 'UserSession', 'VideoSignal'];
    
    if (!validTables.includes(table)) {
      return res.status(400).json({ error: 'Invalid table name' });
    }

    const result = await pool.query(
      `SELECT * FROM "${table}" LIMIT $1 OFFSET $2`,
      [limit, offset]
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/entities/:table/filter
app.post('/api/entities/:table/filter', async (req, res) => {
  try {
    const { table } = req.params;
    const filters = req.body;

    // Validate table name
    const validTables = ['User', 'UserProfile', 'UserSubscription', 'SubscriptionSettings', 
                         'Message', 'AccessCode', 'AboutVideo', 'BlockedUser', 'BroadcastMessage', 'UserSession', 'VideoSignal'];
    
    if (!validTables.includes(table)) {
      return res.status(400).json({ error: 'Invalid table name' });
    }

    // Build WHERE clause
    const conditions = [];
    const values = [];
    let paramCount = 1;

    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        conditions.push(`"${key}" = $${paramCount}`);
        values.push(value);
        paramCount++;
      }
    });

    const whereClause = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';
    const query = `SELECT * FROM "${table}" ${whereClause}`;

    const result = await pool.query(query, values);
    res.json(result.rows);
  } catch (error) {
    console.error(`❌ [FILTER] Error for table ${req.params.table}:`, error.message);
    console.error(`❌ [FILTER] Full error:`, error);
    res.status(500).json({ 
      error: error.message,
      details: error.detail || error.code
    });
  }
});

// POST /api/entities/:table (Create)
app.post('/api/entities/:table', async (req, res) => {
  try {
    const { table } = req.params;
    const data = req.body;

    // Validate table name
    const validTables = ['User', 'UserProfile', 'UserSubscription', 'SubscriptionSettings', 
                         'Message', 'AccessCode', 'AboutVideo', 'BlockedUser', 'BroadcastMessage', 'UserSession', 'VideoSignal'];
    
    if (!validTables.includes(table)) {
      return res.status(400).json({ error: 'Invalid table name' });
    }

    // Handle array columns for specific tables
    const arrayColumns = {
      'UserProfile': ['interests', 'photos', 'videos'],
      'SubscriptionSettings': ['features']
    };
    const tableArrayColumns = arrayColumns[table] || [];
    
    const columns = Object.keys(data);
    const values = Object.values(data);
    
    // Build placeholders with type casting for array columns
    const placeholders = columns.map((col, i) => {
      if (tableArrayColumns.includes(col)) {
        return `$${i + 1}::text[]`;
      }
      return `$${i + 1}`;
    }).join(', ');
    
    const columnList = columns.map(col => `"${col}"`).join(', ');

    const query = `INSERT INTO "${table}" (${columnList}) VALUES (${placeholders}) RETURNING *`;
    
    const result = await pool.query(query, values);
    res.json(result.rows[0]);
  } catch (error) {
    console.error(`❌ [CREATE] Error for table ${req.params.table}:`, error.message);
    console.error(`❌ [CREATE] Full error:`, error);
    res.status(500).json({ 
      error: error.message,
      details: error.detail || error.code
    });
  }
});

// GET /api/entities/:table/:id (Get single record)
app.get('/api/entities/:table/:id', async (req, res) => {
  try {
    const { table, id } = req.params;

    // Validate table name
    const validTables = ['User', 'UserProfile', 'UserSubscription', 'SubscriptionSettings', 
                         'Message', 'AccessCode', 'AboutVideo', 'BlockedUser', 'BroadcastMessage', 'UserSession', 'VideoSignal'];
    
    if (!validTables.includes(table)) {
      return res.status(400).json({ error: 'Invalid table name' });
    }

    const result = await pool.query(
      `SELECT * FROM "${table}" WHERE id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Record not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error(`❌ Get error for table ${req.params.table}:`, error.message);
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/entities/:table/:id (Update)
app.put('/api/entities/:table/:id', async (req, res) => {
  try {
    const { table, id } = req.params;
    const data = req.body;

    // Validate table name
    const validTables = ['User', 'UserProfile', 'UserSubscription', 'SubscriptionSettings', 
                         'Message', 'AccessCode', 'AboutVideo', 'BlockedUser', 'BroadcastMessage', 'UserSession', 'VideoSignal'];
    
    if (!validTables.includes(table)) {
      return res.status(400).json({ error: 'Invalid table name' });
    }

    // Handle array columns for specific tables
    const arrayColumns = {
      'UserProfile': ['interests', 'photos', 'videos'],
      'SubscriptionSettings': ['features']
    };
    const tableArrayColumns = arrayColumns[table] || [];
    
    const columns = Object.keys(data);
    const values = Object.values(data).map((value, i) => {
      const col = columns[i];
      // Convert arrays to proper PostgreSQL array format
      if (tableArrayColumns.includes(col) && Array.isArray(value)) {
        return value; // Keep as array - node-postgres will handle conversion
      }
      return value;
    });
    
    const setClause = columns.map((col, i) => {
      if (tableArrayColumns.includes(col)) {
        return `"${col}" = $${i + 1}::text[]`;
      }
      return `"${col}" = $${i + 1}`;
    }).join(', ');

    const query = `UPDATE "${table}" SET ${setClause}, updated_date = CURRENT_TIMESTAMP WHERE id = $${columns.length + 1} RETURNING *`;

    const result = await pool.query(query, [...values, id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Record not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error(`❌ Update error for table ${req.params.table}:`, error.message, error.detail, error.code);
    res.status(500).json({ 
      error: error.message,
      detail: error.detail,
      code: error.code
    });
  }
});

// DELETE /api/entities/:table/:id
app.delete('/api/entities/:table/:id', async (req, res) => {
  try {
    const { table, id } = req.params;

    // Validate table name
    const validTables = ['User', 'UserProfile', 'UserSubscription', 'SubscriptionSettings', 
                         'Message', 'AccessCode', 'AboutVideo', 'BlockedUser', 'BroadcastMessage', 'UserSession', 'VideoSignal'];
    
    if (!validTables.includes(table)) {
      return res.status(400).json({ error: 'Invalid table name' });
    }

    const result = await pool.query(
      `DELETE FROM "${table}" WHERE id = $1 RETURNING *`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Record not found' });
    }

    res.json({ success: true, deleted: result.rows[0] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============ Health Check ============

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'API is running' });
});

// ============ Seed Sample Data ============

async function seedData() {
  // Seeding is now done manually via SQL - skip automatic seeding
}

// ============ Broadcast API Routes ============

// POST /api/broadcast/send - Send broadcast to all users
app.post('/api/broadcast/send', async (req, res) => {
  try {
    const { subject, message } = req.body;
    const adminEmail = req.headers['x-user-email'];

    if (!adminEmail) {
      return res.status(401).json({ error: 'User email required' });
    }

    if (!message || !message.trim()) {
      return res.status(400).json({ error: 'Message is required' });
    }

    // Get all users
    const usersResult = await pool.query('SELECT email FROM "User" WHERE email != $1', [adminEmail]);
    const allUsers = usersResult.rows;
    const recipientCount = allUsers.length;

    if (recipientCount === 0) {
      return res.json({
        success: true,
        data: {
          broadcast_sent: true,
          recipients: 0,
          message: 'No other users to send broadcast to'
        }
      });
    }

    // Create broadcast message record
    const broadcastResult = await pool.query(
      `INSERT INTO "BroadcastMessage" (from_email, subject, message, recipients_count, created_by, created_date, updated_date)
       VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       RETURNING *`,
      [adminEmail, subject || 'Announcement', message.trim(), recipientCount, adminEmail]
    );

    const broadcast = broadcastResult.rows[0];

    // Create message records for each user
    const messageInserts = allUsers.map(user => [
      adminEmail,
      user.email,
      user.email, // recipient_email
      subject ? `📢 **${subject}**\n\n${message.trim()}` : `📢 ${message.trim()}`,
      false, // read
      false, // is_read
      null, // conversation_id
      null, // attachment_url
    ]);

    if (messageInserts.length > 0) {
      const placeholders = messageInserts
        .map((_, i) => `($${i * 8 + 1}, $${i * 8 + 2}, $${i * 8 + 3}, $${i * 8 + 4}, $${i * 8 + 5}, $${i * 8 + 6}, $${i * 8 + 7}, $${i * 8 + 8})`)
        .join(',');

      const values = messageInserts.flat();

      await pool.query(
        `INSERT INTO "Message" (sender_email, receiver_email, recipient_email, content, read, is_read, conversation_id, attachment_url)
         VALUES ${placeholders}`,
        values
      );
    }

    res.json({
      success: true,
      data: {
        broadcast_sent: true,
        recipients: recipientCount,
        broadcast_id: broadcast.id
      }
    });
  } catch (error) {
    console.error('❌ [Broadcast] Error:', error.message);
    console.error('❌ [Broadcast] Full error:', error);
    res.status(500).json({ 
      error: error.message,
      details: error.detail
    });
  }
});

// GET /api/broadcast/recent - Get recent broadcasts
app.get('/api/broadcast/recent', async (req, res) => {
  try {
    const limit = req.query.limit || 20;

    const result = await pool.query(
      `SELECT * FROM "BroadcastMessage" 
       ORDER BY created_date DESC 
       LIMIT $1`,
      [limit]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('❌ [Broadcast] Error fetching broadcasts:', error.message);
    res.status(500).json({ 
      error: error.message,
      details: error.detail
    });
  }
});

// ============ Subscription Status Endpoint ============

// POST /api/functions/getSubscriptionStatus - Check user subscription status
app.post('/api/functions/getSubscriptionStatus', async (req, res) => {
  try {
    // Get user email from auth header or session
    const userEmail = req.headers['x-user-email'] || req.body?.user_email;

    if (!userEmail) {
      return res.status(401).json({ 
        required: true,
        hasAccess: false,
        status: 'unauthorized'
      });
    }

    // Check if user is admin - admins bypass subscription requirements
    const userResult = await pool.query(
      `SELECT role FROM "User" WHERE email = $1`,
      [userEmail]
    );

    if (userResult.rows.length > 0 && userResult.rows[0].role === 'admin') {
      // Admin user - always has access
      return res.json({ 
        required: false,
        hasAccess: true,
        status: 'admin'
      });
    }

    // Get the most recently updated subscription settings
    const settingsResult = await pool.query(
      `SELECT * FROM "SubscriptionSettings" 
       ORDER BY updated_date DESC 
       LIMIT 1`
    );

    if (settingsResult.rows.length === 0 || !settingsResult.rows[0].subscription_enabled) {
      // Subscription not enabled in settings
      return res.json({ 
        required: false,
        hasAccess: true,
        status: 'subscription_disabled'
      });
    }

    const setting = settingsResult.rows[0];

    // Check user subscription
    const subsResult = await pool.query(
      `SELECT * FROM "UserSubscription" 
       WHERE user_email = $1
       ORDER BY created_date DESC
       LIMIT 1`,
      [userEmail]
    );

    if (subsResult.rows.length === 0) {
      // No subscription - check if trial is enabled
      if (setting.free_trial_enabled) {
        // Create trial subscription
        const trialStart = new Date();
        const trialEnd = new Date();
        trialEnd.setDate(trialEnd.getDate() + (setting.trial_days || 30));

        try {
          await pool.query(
            `INSERT INTO "UserSubscription" 
             (user_email, status, start_date, end_date)
             VALUES ($1, $2, $3, $4)`,
            [userEmail, 'trial', trialStart.toISOString(), trialEnd.toISOString()]
          );
        } catch (err) {
          // Trial already exists, ignore duplicate
        }

        return res.json({
          required: true,
          hasAccess: true,
          status: 'trial',
          trialEnd: trialEnd.toISOString()
        });
      } else {
        // No subscription and no trial
        return res.json({
          required: true,
          hasAccess: false,
          status: 'none'
        });
      }
    }

    const subscription = subsResult.rows[0];

    // Check if subscription is active and not expired
    if (subscription.status === 'active') {
      const endDate = new Date(subscription.end_date);
      const now = new Date();

      if (now > endDate) {
        // Subscription expired
        await pool.query(
          `UPDATE "UserSubscription" SET status = $1 WHERE id = $2`,
          ['expired', subscription.id]
        );
        return res.json({
          required: true,
          hasAccess: false,
          status: 'expired',
          endDate: subscription.end_date
        });
      }

      // Active subscription
      return res.json({
        required: true,
        hasAccess: true,
        status: 'active',
        endDate: subscription.end_date
      });
    }

    // Trial subscription
    if (subscription.status === 'trial') {
      const endDate = new Date(subscription.end_date);
      const now = new Date();

      if (now > endDate) {
        // Trial expired
        await pool.query(
          `UPDATE "UserSubscription" SET status = $1 WHERE id = $2`,
          ['expired', subscription.id]
        );
        return res.json({
          required: true,
          hasAccess: false,
          status: 'expired',
          endDate: subscription.end_date
        });
      }

      return res.json({
        required: true,
        hasAccess: true,
        status: 'trial',
        endDate: subscription.end_date
      });
    }

    // Any other status (inactive, expired, etc.)
    return res.json({
      required: true,
      hasAccess: false,
      status: subscription.status || 'inactive'
    });
  } catch (error) {
    console.error('❌ [getSubscriptionStatus] Error:', error.message);
    // Fail secure - deny access on error
    res.status(500).json({ 
      required: true,
      hasAccess: false,
      status: 'error',
      error: error.message
    });
  }
});

// ============ Start Server ============

const server = app.listen(PORT, async () => {
  
  // Try to seed sample data on startup (non-blocking)
  seedData().catch(err => {
    console.warn('⚠️ Seeding completed with warnings:', err.message);
  });
});
