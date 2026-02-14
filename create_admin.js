/**
 * Script to create an admin user for Pop-Up Play
 * Run with: node create_admin.js
 */

import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USER || 'popupapp',
  password: process.env.DB_PASSWORD || 'popup2024',
  database: process.env.DB_NAME || 'popup_play_db',
});

// Admin user credentials
const ADMIN_EMAIL = 'gdanish365@gmail.com';
const ADMIN_PASSWORD = '00000000';  // Password must be at least 8 characters
const ADMIN_NAME = 'Danish';

// Simple base64 encoding (matches server.js logic)
const passwordHash = Buffer.from(ADMIN_PASSWORD).toString('base64');

async function createAdminUser() {
  console.log('🔧 Creating Admin User for Pop-Up Play...\n');
  
  try {
    // Step 1: Check if role column exists in User table
    console.log('1️⃣ Checking if role column exists...');
    const columnsResult = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'User' AND column_name = 'role'
    `);
    
    if (columnsResult.rows.length === 0) {
      console.log('   ⚠️ Role column missing, adding it...');
      await pool.query(`ALTER TABLE "User" ADD COLUMN IF NOT EXISTS role VARCHAR(50) DEFAULT 'user'`);
      console.log('   ✅ Role column added!');
    } else {
      console.log('   ✅ Role column exists');
    }

    // Step 2: Check if admin user exists
    console.log('\n2️⃣ Checking if admin user exists...');
    const existingUser = await pool.query(`SELECT * FROM "User" WHERE email = $1`, [ADMIN_EMAIL]);
    
    if (existingUser.rows.length > 0) {
      console.log('   ⚠️ Admin user already exists, updating role and password...');
      await pool.query(
        `UPDATE "User" SET role = 'admin', password_hash = $1, name = $2 WHERE email = $3`,
        [passwordHash, ADMIN_NAME, ADMIN_EMAIL]
      );
      console.log('   ✅ Admin user updated!');
    } else {
      console.log('   Creating new admin user...');
      await pool.query(
        `INSERT INTO "User" (email, name, password_hash, role, created_date, updated_date) 
         VALUES ($1, $2, $3, 'admin', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
        [ADMIN_EMAIL, ADMIN_NAME, passwordHash]
      );
      console.log('   ✅ Admin user created!');
    }

    // Step 3: Create admin profile if it doesn't exist
    console.log('\n3️⃣ Checking if admin profile exists...');
    const existingProfile = await pool.query(
      `SELECT * FROM "UserProfile" WHERE user_email = $1`, 
      [ADMIN_EMAIL]
    );
    
    if (existingProfile.rows.length === 0) {
      console.log('   Creating admin profile...');
      await pool.query(
        `INSERT INTO "UserProfile" (user_email, display_name, name, bio, is_popped_up, created_date, updated_date) 
         VALUES ($1, 'Admin', $2, 'App Administrator', false, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
        [ADMIN_EMAIL, ADMIN_NAME]
      );
      console.log('   ✅ Admin profile created!');
    } else {
      console.log('   ✅ Admin profile exists');
    }

    // Step 4: Verify the admin user
    console.log('\n4️⃣ Verifying admin user...');
    const verifyResult = await pool.query(
      `SELECT email, name, role FROM "User" WHERE email = $1`,
      [ADMIN_EMAIL]
    );
    
    if (verifyResult.rows.length > 0 && verifyResult.rows[0].role === 'admin') {
      console.log('   ✅ Admin user verified successfully!');
    } else {
      console.log('   ❌ Admin user verification failed');
    }

    // Print all users for reference
    console.log('\n📋 All users in database:');
    const allUsers = await pool.query(`SELECT email, name, role FROM "User" ORDER BY created_date`);
    console.table(allUsers.rows);

    console.log('\n' + '='.repeat(50));
    console.log('✅ ADMIN USER CREATED SUCCESSFULLY!');
    console.log('='.repeat(50));
    console.log('\n📧 Email:    ' + ADMIN_EMAIL);
    console.log('🔑 Password: ' + ADMIN_PASSWORD);
    console.log('\n🌐 Login at: http://localhost:5173/Login');
    console.log('\n💡 Admin Features:');
    console.log('   - Access Code Manager (/AccessCodeManager)');
    console.log('   - Broadcast Messages (/Broadcast)');
    console.log('   - Subscription Settings (/SubscriptionSettings)');
    console.log('   - About Page Admin Controls (/About)');
    console.log('='.repeat(50));

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

createAdminUser();
