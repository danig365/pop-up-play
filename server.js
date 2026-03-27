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
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

dotenv.config();

const { Pool } = pg;
const app = express();
const PORT = process.env.API_PORT || 3001;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
const POPUP_ALERT_RADIUS_MILES = Number(process.env.POPUP_ALERT_RADIUS_MILES || 60);
const EMAIL_FROM_ADDRESS =
  process.env.EMAIL_FROM ||
  process.env.SMTP_USER ||
  process.env.GMAIL_USER ||
  'no-reply@popup-play.local';
const EMAIL_FROM_NAME = process.env.EMAIL_FROM_NAME || 'Popupplay.fun';
const EMAIL_FROM = EMAIL_FROM_NAME
  ? `"${String(EMAIL_FROM_NAME).replace(/"/g, '')}" <${EMAIL_FROM_ADDRESS}>`
  : EMAIL_FROM_ADDRESS;
function normalizeGoogleClientId(rawValue) {
  if (!rawValue) return '';

  const trimmed = String(rawValue).trim();

  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    try {
      const url = new URL(trimmed);
      const normalizedPath = url.pathname.replace(/^\/+|\/+$/g, '');
      return normalizedPath || url.hostname;
    } catch {
      const normalized = trimmed
        .replace(/^https?:\/\//, '')
        .replace(/^\/+|\/+$/g, '');

      if (!normalized.includes('/')) {
        return normalized;
      }

      const [, ...parts] = normalized.split('/');
      const fromPath = parts.join('/').replace(/^\/+|\/+$/g, '');
      return fromPath || normalized.split('/')[0];
    }
  }

  return trimmed;
}

const GOOGLE_CLIENT_ID = normalizeGoogleClientId(
  process.env.GOOGLE_CLIENT_ID || process.env.VITE_GOOGLE_CLIENT_ID
);
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;

const JWT_SECRET = process.env.JWT_SECRET || crypto.randomBytes(64).toString('hex');
const JWT_EXPIRES_IN = '7d';
const BCRYPT_SALT_ROUNDS = 12;
const OTP_EXPIRY_MINUTES = 10;
const OTP_LENGTH = 6;

/**
 * Generate a cryptographically secure numeric OTP.
 */
function generateOTP() {
  const digits = '0123456789';
  let otp = '';
  const bytes = crypto.randomBytes(OTP_LENGTH);
  for (let i = 0; i < OTP_LENGTH; i++) {
    otp += digits[bytes[i] % 10];
  }
  return otp;
}

/**
 * Generate a JWT token for a user.
 */
function generateToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role || 'user' },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

/**
 * Verify a JWT token. Returns the decoded payload or null.
 */
function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}

/**
 * Hash a password with bcrypt.
 */
async function hashPassword(password) {
  return bcrypt.hash(password, BCRYPT_SALT_ROUNDS);
}

/**
 * Compare a plaintext password against a stored hash.
 * Handles migration from old base64 "hashes" to bcrypt.
 * Returns { match: boolean, needsUpgrade: boolean }.
 */
async function verifyPassword(password, storedHash) {
  // Check if it's a bcrypt hash (starts with $2a$ or $2b$)
  if (storedHash && (storedHash.startsWith('$2a$') || storedHash.startsWith('$2b$'))) {
    const match = await bcrypt.compare(password, storedHash);
    return { match, needsUpgrade: false };
  }
  // Legacy base64 check — migrate on success
  const legacyHash = Buffer.from(password).toString('base64');
  const match = storedHash === legacyHash;
  return { match, needsUpgrade: match }; // upgrade if it matched
}

/**
 * Strip sensitive fields from a user row before sending to client.
 */
function sanitizeUser(row) {
  const { password_hash, ...safe } = row;
  return safe;
}

function createEmailTransport() {
  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    const smtpPort = parseInt(process.env.SMTP_PORT || '587', 10);
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: smtpPort,
      secure: smtpPort === 465,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }

  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD,
    },
  });
}

const transporter = createEmailTransport();

// Test email configuration
transporter.verify((error, success) => {
  if (error) {
    console.log('⚠️ Email service error:', error.message);
  } else {
    console.log('✅ Email service ready');
  }
});

// PostgreSQL connection pool
function resolveDbHost() {
  const configuredHost = process.env.DB_HOST || 'localhost';

  if (configuredHost !== 'postgres') {
    return configuredHost;
  }

  const isRunningInDocker = fs.existsSync('/.dockerenv') || process.env.DOCKER_CONTAINER === 'true';

  if (isRunningInDocker) {
    return configuredHost;
  }

  return 'localhost';
}

const poolConfig = {
  user: process.env.DB_USER || 'postgres',
  host: resolveDbHost(),
  port: parseInt(process.env.DB_PORT, 10) || 5432,
  database: process.env.DB_NAME || 'popup_play_db',
};

// Only add password if explicitly set (not empty string)
const dbPassword = process.env.DB_PASSWORD;
if (dbPassword && dbPassword.trim && dbPassword.trim().length > 0) {
  poolConfig.password = dbPassword;
}


const pool = new Pool(poolConfig);

function calculateDistanceMiles(lat1, lon1, lat2, lon2) {
  const R = 3959;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

async function sendPopupProximityEmails(poppedProfile) {
  try {
    const lat = Number(poppedProfile.latitude);
    const lon = Number(poppedProfile.longitude);
    const popperName = poppedProfile.display_name || poppedProfile.user_email;
    const popperZip = poppedProfile.zip_code || poppedProfile.location || 'Unknown';
    const popperMessage = poppedProfile.popup_message || 'is active on the map now.';
    const shouldNotifyPopper = poppedProfile.email_notifications_enabled !== false;

    if (shouldNotifyPopper) {
      try {
        await transporter.sendMail({
          from: EMAIL_FROM,
          to: poppedProfile.user_email,
          subject: 'Your pop-up is now live on Pop Up Play',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 640px; margin: 0 auto;">
              <h2 style="color: #1e293b; margin-bottom: 10px;">Your Pop-Up Is Live</h2>
              <p style="color: #334155;">Hi ${popperName},</p>
              <p style="color: #334155;">
                Your profile is now popped up on the map and visible to nearby members.
              </p>
              <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; margin: 16px 0;">
                <p style="margin: 0 0 8px; color: #475569;"><strong>Your ZIP/location:</strong> ${popperZip}</p>
                <p style="margin: 0; color: #1e293b;"><em>“${popperMessage}”</em></p>
              </div>
              <a href="${FRONTEND_URL}/#/Home"
                 style="background-color: #8b5cf6; color: #fff; text-decoration: none; display: inline-block; padding: 12px 18px; border-radius: 6px; font-weight: 600;">
                Open Pop Up Play
              </a>
              <p style="margin-top: 22px; color: #94a3b8; font-size: 12px;">
                You are receiving this because email notifications are enabled in your profile.
              </p>
            </div>
          `,
        });
        console.log(`✅ [PopupEmail] Sent self pop-up confirmation to ${poppedProfile.user_email}`);
      } catch (selfEmailError) {
        console.error('❌ [PopupEmail] Failed to send self pop-up confirmation:', selfEmailError.message);
      }
    }

    if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
      console.log('ℹ️ [PopupEmail] Skipping proximity emails: popped user has no coordinates');
      return;
    }

    const nearbyCandidates = await pool.query(
      `SELECT user_email, display_name, latitude, longitude, zip_code, location, is_popped_up,
              COALESCE(email_notifications_enabled, true) AS email_notifications_enabled
       FROM "UserProfile"
       WHERE user_email != $1
         AND latitude IS NOT NULL
         AND longitude IS NOT NULL
         AND COALESCE(email_notifications_enabled, true) = true`,
      [poppedProfile.user_email]
    );

    if (nearbyCandidates.rows.length === 0) {
      return;
    }

    const recipients = nearbyCandidates.rows.filter((candidate) => {
      const candidateLat = Number(candidate.latitude);
      const candidateLon = Number(candidate.longitude);
      if (!Number.isFinite(candidateLat) || !Number.isFinite(candidateLon)) return false;
      const distance = calculateDistanceMiles(lat, lon, candidateLat, candidateLon);
      return distance <= POPUP_ALERT_RADIUS_MILES;
    });

    if (recipients.length === 0) {
      return;
    }

    await Promise.allSettled(
      recipients.map((recipient) => {
        const recipientZip = recipient.zip_code || recipient.location || 'Unknown';
        const recipientName = recipient.display_name || recipient.user_email;
        const recipientIsPopped = recipient.is_popped_up === true;
        const proximityContextLine = recipientIsPopped
          ? `Distance is calculated between both users' current pop-up locations.`
          : `Distance is calculated from the ZIP/location in your profile to the other user's current pop-up location.`;
        const proximityHeadline = recipientIsPopped
          ? `A user has popped up within ${POPUP_ALERT_RADIUS_MILES} miles of your current pop-up location.`
          : `A user has popped up within ${POPUP_ALERT_RADIUS_MILES} miles of the ZIP/location in your profile.`;

        return transporter.sendMail({
          from: EMAIL_FROM,
          to: recipient.user_email,
          subject: `Someone nearby popped up on Pop Up Play`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 640px; margin: 0 auto;">
              <h2 style="color: #1e293b; margin-bottom: 10px;">New Nearby Pop-Up Alert</h2>
              <p style="color: #334155;">Hi ${recipientName},</p>
              <p style="color: #334155;">
                ${proximityHeadline}
              </p>
              <p style="color: #475569; margin-top: 8px;">${proximityContextLine}</p>
              <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; margin: 16px 0;">
                <p style="margin: 0 0 8px; color: #475569;"><strong>Their ZIP:</strong> ${popperZip}</p>
                <p style="margin: 0 0 8px; color: #475569;"><strong>Your ZIP:</strong> ${recipientZip}</p>
                <p style="margin: 0; color: #1e293b;"><em>“${popperMessage}”</em></p>
              </div>
              <a href="${FRONTEND_URL}/#/OnlineMembers?from=home"
                 style="background-color: #8b5cf6; color: #fff; text-decoration: none; display: inline-block; padding: 12px 18px; border-radius: 6px; font-weight: 600;">
                View Nearby Members
              </a>
              <p style="margin-top: 22px; color: #94a3b8; font-size: 12px;">
                You are receiving this because email notifications are enabled in your profile.
              </p>
              <p style="margin-top: 16px; color: #94a3b8; font-size: 12px; line-height: 1.5;">
                To continue receiving email notifications, make sure your email notifications are enabled in your profile area on <a href="${FRONTEND_URL}" style="color: #8b5cf6;">Popupplay.fun</a>.
              </p>
              <p style="color: #94a3b8; font-size: 12px; line-height: 1.5;">
                If you'd like to stop receiving email notifications, simply select "Turn Off Email Notifications" in your profile area on <a href="${FRONTEND_URL}" style="color: #8b5cf6;">Popupplay.fun</a>.
              </p>
            </div>
          `,
        });
      })
    );

    console.log(`✅ [PopupEmail] Sent nearby pop-up alerts to ${recipients.length} users`);
  } catch (error) {
    console.error('❌ [PopupEmail] Failed to send nearby pop-up alerts:', error.message);
  }
}

// Run migrations on startup
async function runMigrations() {
  try {

    // Create PasswordResetToken table for secure reset token storage
    try {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS "PasswordResetToken" (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          email VARCHAR(255) NOT NULL,
          token VARCHAR(255) UNIQUE NOT NULL,
          expires_at TIMESTAMP NOT NULL,
          used BOOLEAN DEFAULT false,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      await pool.query(`CREATE INDEX IF NOT EXISTS idx_reset_token ON "PasswordResetToken"(token)`);
      await pool.query(`CREATE INDEX IF NOT EXISTS idx_reset_token_expires ON "PasswordResetToken"(expires_at)`);
      console.log('✅ PasswordResetToken table ready');
    } catch (migErr) {
      console.warn('⚠️ PasswordResetToken migration note:', migErr.message);
    }

    // Add is_email_verified column to User table
    try {
      await pool.query(`
        ALTER TABLE "User"
        ADD COLUMN IF NOT EXISTS is_email_verified BOOLEAN DEFAULT false
      `);
      // Mark existing Google OAuth users as verified (they have 'oauth_user' as password_hash)
      await pool.query(`UPDATE "User" SET is_email_verified = true WHERE password_hash = 'oauth_user' AND is_email_verified = false`);
      console.log('✅ User.is_email_verified column ready');
    } catch (migErr) {
      console.warn('⚠️ is_email_verified migration note:', migErr.message);
    }

    // Create EmailVerificationOTP table
    try {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS "EmailVerificationOTP" (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          email VARCHAR(255) NOT NULL,
          otp VARCHAR(10) NOT NULL,
          expires_at TIMESTAMP NOT NULL,
          used BOOLEAN DEFAULT false,
          attempts INTEGER DEFAULT 0,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      await pool.query(`CREATE INDEX IF NOT EXISTS idx_otp_email ON "EmailVerificationOTP"(email)`);
      await pool.query(`CREATE INDEX IF NOT EXISTS idx_otp_expires ON "EmailVerificationOTP"(expires_at)`);
      console.log('✅ EmailVerificationOTP table ready');
    } catch (migErr) {
      console.warn('⚠️ EmailVerificationOTP migration note:', migErr.message);
    }
    
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
        ADD COLUMN IF NOT EXISTS paypal_plan_id VARCHAR(255),
        ADD COLUMN IF NOT EXISTS free_trial_enabled BOOLEAN DEFAULT false,
        ADD COLUMN IF NOT EXISTS trial_days INTEGER DEFAULT 30,
        ADD COLUMN IF NOT EXISTS subscription_enabled BOOLEAN DEFAULT false;
      `);

      await pool.query(`
        UPDATE "SubscriptionSettings"
        SET paypal_plan_id = stripe_price_id
        WHERE (paypal_plan_id IS NULL OR paypal_plan_id = '')
          AND stripe_price_id IS NOT NULL
          AND stripe_price_id <> ''
      `);
    } catch (migErr) {
      console.warn('⚠️ SubscriptionSettings migration note:', migErr.message);
    }

    // Add PayPal order ID column to UserSubscription
    try {
      await pool.query(`
        ALTER TABLE "UserSubscription"
        ADD COLUMN IF NOT EXISTS paypal_order_id VARCHAR(255),
        ADD COLUMN IF NOT EXISTS paypal_subscription_id VARCHAR(255);
      `);
    } catch (migErr) {
      console.warn('⚠️ UserSubscription migration note:', migErr.message);
    }

    // Legacy backfill: ensure old profiles created before the notification rollout keep email notifications enabled
    try {
      const legacyCutoff = process.env.LEGACY_EMAIL_NOTIF_BACKFILL_BEFORE || '2026-03-14 00:00:00';
      const backfillResult = await pool.query(
        `UPDATE "UserProfile"
         SET email_notifications_enabled = true,
             updated_date = CURRENT_TIMESTAMP
         WHERE created_date < $1::timestamp
           AND email_notifications_enabled = false`,
        [legacyCutoff]
      );
      if (backfillResult.rowCount > 0) {
        console.log(`✅ Legacy email notification backfill applied to ${backfillResult.rowCount} profile(s)`);
      }
    } catch (migErr) {
      console.warn('⚠️ Legacy email notification backfill note:', migErr.message);
    }

    // Create Reel table if it doesn't exist
    try {
      // Try to create the table (will fail if no CREATE permission, but table may already exist)
      try {
        await pool.query(`
          CREATE TABLE IF NOT EXISTS "Reel" (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_email VARCHAR(255) NOT NULL REFERENCES "User"(email) ON DELETE CASCADE,
            video_url TEXT NOT NULL,
            caption TEXT,
            duration INTEGER,
            views INTEGER DEFAULT 0,
            created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          )
        `);
      } catch (e) {
        // If permission denied, table was likely created by admin/postgres
        if (!e.message.includes('permission denied')) {
          throw e;
        }
      }
      
      // Try to create indexes (non-blocking if they fail)
      try {
        await pool.query(`CREATE INDEX IF NOT EXISTS idx_reel_user_email ON "Reel"(user_email)`);
      } catch (e) {
        // Silently ignore index creation errors
      }
      
      try {
        await pool.query(`CREATE INDEX IF NOT EXISTS idx_reel_created_date ON "Reel"(created_date)`);
      } catch (e) {
        // Silently ignore index creation errors
      }
      
      console.log('✅ Reel table ready');
    } catch (migErr) {
      console.warn('⚠️ Reel table migration note:', migErr.message);
    }

    // Create ProfileVideo table if it doesn't exist
    try {
      try {
        await pool.query(`
          CREATE TABLE IF NOT EXISTS "ProfileVideo" (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_email VARCHAR(255) NOT NULL REFERENCES "User"(email) ON DELETE CASCADE,
            video_url TEXT NOT NULL,
            caption TEXT,
            views INTEGER DEFAULT 0,
            created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          )
        `);
      } catch (e) {
        if (!e.message.includes('permission denied')) {
          throw e;
        }
      }

      try {
        await pool.query(`CREATE INDEX IF NOT EXISTS idx_profilevideo_user_email ON "ProfileVideo"(user_email)`);
      } catch (e) {
      }

      try {
        await pool.query(`CREATE INDEX IF NOT EXISTS idx_profilevideo_created_date ON "ProfileVideo"(created_date)`);
      } catch (e) {
      }

      console.log('✅ ProfileVideo table ready');
    } catch (migErr) {
      console.warn('⚠️ ProfileVideo table migration note:', migErr.message);
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
        (plan_name, description, monthly_price, annual_price, currency, stripe_price_id, paypal_plan_id, free_trial_enabled, trial_days, subscription_enabled, features)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        ON CONFLICT DO NOTHING
      `, ['Basic Plan', 'Basic subscription plan', 0, 0, 'USD', '', '', false, 30, false, '{}']);
    }
  } catch (error) {
    console.error('❌ Migration error:', error.message);
  }
}

// Run migrations
runMigrations();

// Middleware
app.use(cors());
// Increase body size limit to 250MB for large uploads
app.use(express.json({ limit: '250mb' }));
app.use(express.urlencoded({ extended: true, limit: '250mb' }));
app.use(bodyParser.json({ limit: '250mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '250mb' }));

// ============ File Upload Setup ============
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsDir = path.join(__dirname, 'uploads');

// Create uploads directory if it doesn't exist
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
console.log('📁 Uploads directory:', uploadsDir);

// Serve uploaded files statically
app.use('/api/uploads', express.static(uploadsDir, {
  maxAge: '7d',
  acceptRanges: true,
  setHeaders: (res, filePath) => {
    const ext = path.extname(filePath).toLowerCase();
    const mimeTypes = {
      '.mp4': 'video/mp4', '.mov': 'video/quicktime',
      '.avi': 'video/x-msvideo', '.webm': 'video/webm',
      '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
      '.png': 'image/png', '.gif': 'image/gif', '.webp': 'image/webp',
    };
    if (mimeTypes[ext]) {
      res.setHeader('Content-Type', mimeTypes[ext]);
    }
    // Ensure video files support range requests for proper playback/seeking
    const videoExts = ['.mp4', '.mov', '.avi', '.webm'];
    if (videoExts.includes(ext)) {
      res.setHeader('Accept-Ranges', 'bytes');
      res.setHeader('Cache-Control', 'public, max-age=604800');
    }
  }
}));

// Configure multer for disk storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const uniqueId = crypto.randomBytes(16).toString('hex');
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${Date.now()}_${uniqueId}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 200 * 1024 * 1024 }, // 200MB
  fileFilter: (req, file, cb) => {
    const allowed = [
      'video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/webm',
      'image/jpeg', 'image/png', 'image/gif', 'image/webp'
    ];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error(`File type ${file.mimetype} not allowed`));
  }
});

// File upload endpoint
app.post('/api/upload', upload.single('file'), (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    const fileUrl = `/api/uploads/${req.file.filename}`;
    console.log(`📁 [Upload] Saved: ${req.file.originalname} -> ${fileUrl} (${(req.file.size / 1024 / 1024).toFixed(2)}MB)`);
    res.json({ file_url: fileUrl, file_name: req.file.originalname, file_size: req.file.size });
  } catch (error) {
    console.error('❌ [Upload] Error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Handle multer errors
app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') return res.status(413).json({ error: 'File too large. Maximum size is 200MB.' });
    return res.status(400).json({ error: err.message });
  }
  if (err.message && err.message.includes('not allowed')) return res.status(400).json({ error: err.message });
  console.error('Error:', err);
  res.status(500).json({ error: err.message });
});

// ============ Authentication & Authorization Middleware ============

/**
 * Middleware: Validate JWT token from Authorization header.
 * Falls back to x-user-email header for backward compatibility during migration.
 * Attaches req.authenticatedUser = { email, role, ... } on success.
 */
async function authenticateUser(req, res, next) {
  try {
    // 1. Try JWT from Authorization header first
    const authHeader = req.headers['authorization'];
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.slice(7);
      const decoded = verifyToken(token);
      if (decoded && decoded.email) {
        const result = await pool.query('SELECT email, name, role FROM "User" WHERE email = $1', [decoded.email]);
        if (result.rows.length > 0) {
          req.authenticatedUser = result.rows[0];
          return next();
        }
      }
      // Token was provided but invalid/expired
      return res.status(401).json({ error: 'Authentication failed: invalid or expired token' });
    }

    // 2. Fallback: x-user-email header (backward compat, will be removed later)
    const email = req.headers['x-user-email'];
    if (!email) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const result = await pool.query('SELECT email, name, role FROM "User" WHERE email = $1', [email]);
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Authentication failed: user not found' });
    }

    req.authenticatedUser = result.rows[0];
    next();
  } catch (error) {
    console.error('❌ [Auth Middleware] Error:', error.message);
    res.status(500).json({ error: 'Authentication error' });
  }
}

/**
 * Middleware: Strict JWT auth (no x-user-email fallback).
 * Used for payment/subscription-sensitive endpoints.
 */
async function authenticateUserStrict(req, res, next) {
  try {
    const authHeader = req.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authentication failed: Bearer token required' });
    }

    const token = authHeader.slice(7);
    const decoded = verifyToken(token);
    if (!decoded || !decoded.email) {
      return res.status(401).json({ error: 'Authentication failed: invalid or expired token' });
    }

    const result = await pool.query('SELECT email, name, role FROM "User" WHERE email = $1', [decoded.email]);
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Authentication failed: user not found' });
    }

    req.authenticatedUser = result.rows[0];
    next();
  } catch (error) {
    console.error('❌ [Strict Auth Middleware] Error:', error.message);
    res.status(500).json({ error: 'Authentication error' });
  }
}

/**
 * Middleware: Requires authenticated user with admin role.
 * Must be used after authenticateUser.
 */
function requireAdmin(req, res, next) {
  if (!req.authenticatedUser) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  if (req.authenticatedUser.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden: admin access required' });
  }
  next();
}

// ============ Admin Setup Route ============

// Setup admin user endpoint
app.post('/api/admin/setup', async (req, res) => {
  try {
    const ADMIN_EMAIL = 'admin@popupplay.com';
    const ADMIN_PASSWORD = 'Admin@123';
    const passwordHash = await hashPassword(ADMIN_PASSWORD);

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
    const passwordHash = await hashPassword(ADMIN_PASSWORD);

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

// Get current user (validates JWT)
app.get('/api/auth/me', async (req, res) => {
  try {
    // Try JWT from Authorization header
    const authHeader = req.headers['authorization'];
    let email = null;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const decoded = verifyToken(authHeader.slice(7));
      if (decoded && decoded.email) {
        email = decoded.email;
      } else {
        return res.status(401).json({ error: 'Invalid or expired token' });
      }
    } else {
      // Fallback to x-user-email for backward compat
      email = req.headers['x-user-email'];
    }

    if (!email) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const result = await pool.query('SELECT * FROM "User" WHERE email = $1', [email]);
    
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'User not found' });
    }

    res.json(sanitizeUser(result.rows[0]));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    if (!password) {
      return res.status(400).json({ error: 'Password is required' });
    }

    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    const user = await pool.query('SELECT * FROM "User" WHERE email = $1', [email]);

    if (user.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const storedUser = user.rows[0];

    // Verify password (handles bcrypt and legacy base64 migration)
    const { match, needsUpgrade } = await verifyPassword(password, storedUser.password_hash);
    if (!match) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Block login if email is not verified (skip for OAuth users)
    if (!storedUser.is_email_verified && storedUser.password_hash !== 'oauth_user') {
      return res.status(403).json({ 
        error: 'Please verify your email before signing in. Check your inbox for the verification code.',
        email_not_verified: true,
        email: storedUser.email
      });
    }

    // Upgrade legacy base64 hash to bcrypt
    if (needsUpgrade) {
      const newHash = await hashPassword(password);
      await pool.query('UPDATE "User" SET password_hash = $1 WHERE email = $2', [newHash, email]);
      console.log('🔒 [Login] Upgraded password hash to bcrypt for:', email);
    }

    const token = generateToken(storedUser);
    res.json({ 
      ...sanitizeUser(storedUser),
      token
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
    const existing = await pool.query('SELECT * FROM "User" WHERE email = $1', [email]);

    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'Email already exists' });
    }

    // Create new user with bcrypt hashed password (unverified)
    const passwordHash = await hashPassword(password);
    const user = await pool.query(
      'INSERT INTO "User" (email, name, password_hash, is_email_verified) VALUES ($1, $2, $3, $4) RETURNING *',
      [email, name || email.split('@')[0], passwordHash, false]
    );

    // Generate OTP and store it
    const otp = generateOTP();
    const otpExpiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000).toISOString();
    
    // Invalidate any previous OTPs for this email
    await pool.query('UPDATE "EmailVerificationOTP" SET used = true WHERE email = $1 AND used = false', [email]);
    
    await pool.query(
      'INSERT INTO "EmailVerificationOTP" (email, otp, expires_at) VALUES ($1, $2, $3)',
      [email, otp, otpExpiresAt]
    );

    // Send OTP verification email
    const userName = name || email.split('@')[0];
    const otpMailOptions = {
      from: EMAIL_FROM,
      to: email,
      subject: 'Pop-Up Play - Verify Your Email',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #7c3aed;">Welcome to Pop-Up Play, ${userName}!</h2>
          <p>Please verify your email address by entering the code below:</p>
          <div style="background-color: #f3f4f6; border-radius: 12px; padding: 24px; text-align: center; margin: 24px 0;">
            <p style="font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #1e293b; margin: 0;">${otp}</p>
          </div>
          <p style="color: #6b7280; font-size: 14px;">This code expires in ${OTP_EXPIRY_MINUTES} minutes.</p>
          <p style="color: #6b7280; font-size: 14px;">If you didn't create an account on Pop-Up Play, please ignore this email.</p>
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">
          <p style="color: #6b7280; font-size: 14px;"><strong>The Pop-Up Play Team</strong></p>
        </div>
      `,
    };

    transporter.sendMail(otpMailOptions, (error, info) => {
      if (error) {
        console.error('❌ [Signup] OTP email send failed:', error.message);
      } else {
        console.log('✅ [Signup] OTP email sent to:', email);
      }
    });

    // Return success but WITHOUT a JWT token — user must verify first
    res.json({ 
      ...sanitizeUser(user.rows[0]),
      requires_verification: true,
      message: 'Account created. Please check your email for the verification code.'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Verify Email OTP
app.post('/api/auth/verify-otp', async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ error: 'Email and OTP are required' });
    }

    // Find the latest unused OTP for this email
    const otpResult = await pool.query(
      `SELECT * FROM "EmailVerificationOTP" 
       WHERE email = $1 AND used = false 
       ORDER BY created_at DESC LIMIT 1`,
      [email]
    );

    if (otpResult.rows.length === 0) {
      return res.status(400).json({ error: 'No verification code found. Please request a new one.' });
    }

    const otpRecord = otpResult.rows[0];

    // Check if expired
    if (new Date(otpRecord.expires_at) < new Date()) {
      return res.status(400).json({ error: 'Verification code has expired. Please request a new one.' });
    }

    // Check max attempts (prevent brute force)
    if (otpRecord.attempts >= 5) {
      await pool.query('UPDATE "EmailVerificationOTP" SET used = true WHERE id = $1', [otpRecord.id]);
      return res.status(400).json({ error: 'Too many failed attempts. Please request a new code.' });
    }

    // Increment attempts
    await pool.query('UPDATE "EmailVerificationOTP" SET attempts = attempts + 1 WHERE id = $1', [otpRecord.id]);

    // Verify OTP
    if (otpRecord.otp !== otp) {
      const remaining = 5 - (otpRecord.attempts + 1);
      return res.status(400).json({ error: `Invalid verification code. ${remaining} attempt(s) remaining.` });
    }

    // OTP matches — mark as used
    await pool.query('UPDATE "EmailVerificationOTP" SET used = true WHERE id = $1', [otpRecord.id]);

    // Mark user as verified
    await pool.query('UPDATE "User" SET is_email_verified = true WHERE email = $1', [email]);

    // Fetch updated user
    const userResult = await pool.query('SELECT * FROM "User" WHERE email = $1', [email]);
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = userResult.rows[0];

    // Send welcome email now that they're verified
    const userName = user.name || email.split('@')[0];
    const welcomeMailOptions = {
      from: EMAIL_FROM,
      to: email,
      subject: 'Welcome to Pop-Up Play! 🎉',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #7c3aed;">Welcome to Pop-Up Play, ${userName}!</h2>
          <p>Your email has been verified. Thank you for joining our community!</p>
          <p>Pop-Up Play is a fun way to connect with people nearby. Here's how to get started:</p>
          <ul>
            <li><strong>Complete your profile</strong> - Add a photo and bio to let others know who you are</li>
            <li><strong>Pop Up</strong> - Turn on your location to appear on the map and meet people nearby</li>
            <li><strong>Connect</strong> - Chat, video verify, and make new connections</li>
          </ul>
          <p style="margin-top: 20px;">
            <a href="${FRONTEND_URL}/Home" style="background-color: #7c3aed; color: white; padding: 12px 24px; text-decoration: none; border-radius: 25px; display: inline-block; font-weight: bold;">Start Exploring</a>
          </p>
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">
          <p style="color: #6b7280; font-size: 14px;"><strong>The Pop-Up Play Team</strong></p>
        </div>
      `,
    };

    transporter.sendMail(welcomeMailOptions, (error, info) => {
      if (error) {
        console.error('❌ [VerifyOTP] Welcome email send failed:', error.message);
      } else {
        console.log('✅ [VerifyOTP] Welcome email sent to:', email);
      }
    });

    // Generate JWT token — user is now fully verified
    const jwtToken = generateToken(user);
    console.log('✅ [VerifyOTP] Email verified for:', email);
    
    res.json({ 
      ...sanitizeUser(user),
      token: jwtToken,
      message: 'Email verified successfully!'
    });
  } catch (error) {
    console.error('❌ [VerifyOTP] Error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Resend OTP
app.post('/api/auth/resend-otp', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    // Check if user exists and is not already verified
    const userResult = await pool.query('SELECT * FROM "User" WHERE email = $1', [email]);
    if (userResult.rows.length === 0) {
      // Don't reveal whether user exists
      return res.json({ success: true, message: 'If an account exists, a new verification code has been sent.' });
    }

    const user = userResult.rows[0];
    if (user.is_email_verified) {
      return res.status(400).json({ error: 'Email is already verified. You can sign in.' });
    }

    // Rate limit: check if an OTP was sent in the last 60 seconds
    const recentOTP = await pool.query(
      `SELECT * FROM "EmailVerificationOTP" 
       WHERE email = $1 AND used = false AND created_at > NOW() - INTERVAL '60 seconds'
       ORDER BY created_at DESC LIMIT 1`,
      [email]
    );

    if (recentOTP.rows.length > 0) {
      return res.status(429).json({ error: 'Please wait at least 60 seconds before requesting a new code.' });
    }

    // Invalidate previous OTPs
    await pool.query('UPDATE "EmailVerificationOTP" SET used = true WHERE email = $1 AND used = false', [email]);

    // Generate new OTP
    const otp = generateOTP();
    const otpExpiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000).toISOString();

    await pool.query(
      'INSERT INTO "EmailVerificationOTP" (email, otp, expires_at) VALUES ($1, $2, $3)',
      [email, otp, otpExpiresAt]
    );

    // Send OTP email
    const userName = user.name || email.split('@')[0];
    const otpMailOptions = {
      from: EMAIL_FROM,
      to: email,
      subject: 'Pop-Up Play - New Verification Code',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #7c3aed;">Hello ${userName},</h2>
          <p>Here is your new verification code:</p>
          <div style="background-color: #f3f4f6; border-radius: 12px; padding: 24px; text-align: center; margin: 24px 0;">
            <p style="font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #1e293b; margin: 0;">${otp}</p>
          </div>
          <p style="color: #6b7280; font-size: 14px;">This code expires in ${OTP_EXPIRY_MINUTES} minutes.</p>
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">
          <p style="color: #6b7280; font-size: 14px;"><strong>The Pop-Up Play Team</strong></p>
        </div>
      `,
    };

    transporter.sendMail(otpMailOptions, (error, info) => {
      if (error) {
        console.error('❌ [ResendOTP] Email send failed:', error.message);
      } else {
        console.log('✅ [ResendOTP] OTP email sent to:', email);
      }
    });

    res.json({ success: true, message: 'A new verification code has been sent to your email.' });
  } catch (error) {
    console.error('❌ [ResendOTP] Error:', error.message);
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

    // Generate cryptographically secure reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    
    // Store token in database with 1 hour expiration
    const expiresAt = new Date(Date.now() + 3600000).toISOString();
    try {
      await pool.query(
        'INSERT INTO "PasswordResetToken" (email, token, expires_at) VALUES ($1, $2, $3)',
        [email, resetToken, expiresAt]
      );
    } catch (dbErr) {
      console.error('❌ [ForgotPassword] Failed to store reset token:', dbErr.message);
      return res.status(500).json({ error: 'Failed to generate reset token' });
    }

    // Reset link (in production, this would be your frontend URL)
    const resetLink = `${FRONTEND_URL}/reset-password?token=${resetToken}`;

    // Prepare email content
    const mailOptions = {
      from: EMAIL_FROM,
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
      message: 'If an account exists with that email, a password reset link has been sent'
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

    // Check if token exists and is not expired in database
    const tokenResult = await pool.query(
      'SELECT * FROM "PasswordResetToken" WHERE token = $1 AND used = false',
      [token]
    );

    if (tokenResult.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid or expired reset token' });
    }

    const tokenData = tokenResult.rows[0];
    if (new Date() > new Date(tokenData.expires_at)) {
      // Mark expired token as used
      await pool.query('UPDATE "PasswordResetToken" SET used = true WHERE id = $1', [tokenData.id]);
      return res.status(400).json({ error: 'Reset token has expired' });
    }

    // Update user password with bcrypt
    const email = tokenData.email;
    const passwordHash = await hashPassword(newPassword);
    
    await pool.query(
      'UPDATE "User" SET password_hash = $1 WHERE email = $2',
      [passwordHash, email]
    );

    // Mark token as used
    await pool.query('UPDATE "PasswordResetToken" SET used = true WHERE id = $1', [tokenData.id]);

    // Clean up any other reset tokens for this user
    await pool.query('UPDATE "PasswordResetToken" SET used = true WHERE email = $1', [email]);

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

// Google OAuth Authentication
app.post('/api/auth/google', async (req, res) => {
  try {
    const { code, token } = req.body;

    if (!code && !token) {
      return res.status(400).json({ error: 'Authorization code or ID token is required' });
    }

    if (!GOOGLE_CLIENT_ID) {
      return res.status(500).json({ error: 'Google OAuth is not configured: missing GOOGLE_CLIENT_ID' });
    }

    let idToken = token;
    if (code) {
      if (!GOOGLE_CLIENT_SECRET) {
        return res.status(500).json({ error: 'Google OAuth is not configured: missing GOOGLE_CLIENT_SECRET' });
      }

      const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          code,
          client_id: GOOGLE_CLIENT_ID,
          client_secret: GOOGLE_CLIENT_SECRET,
          redirect_uri: 'postmessage',
          grant_type: 'authorization_code',
        }),
      });

      const tokenResult = await tokenResponse.json();
      if (!tokenResponse.ok) {
        return res.status(401).json({
          error: tokenResult.error_description || tokenResult.error || 'Google token exchange failed',
        });
      }

      idToken = tokenResult.id_token;
    }

    if (!idToken) {
      return res.status(401).json({ error: 'Google ID token not available' });
    }

    // Verify and decode the Google token
    const { OAuth2Client } = await import('google-auth-library');
    const client = new OAuth2Client(GOOGLE_CLIENT_ID);
    
    const ticket = await client.verifyIdToken({
      idToken,
      audience: GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();

    const { email, name, picture } = payload;

    if (!email) {
      return res.status(400).json({ error: 'Invalid Google token' });
    }

    // Check if user exists or create new user
    let user = await pool.query('SELECT * FROM "User" WHERE email = $1', [email]);
    let isNewUser = false;

    if (user.rows.length === 0) {
      isNewUser = true;
      // Create new user from Google auth (no password needed for OAuth users)
      // Google users are auto-verified since Google already verified their email
      user = await pool.query(
        'INSERT INTO "User" (email, name, password_hash, is_email_verified) VALUES ($1, $2, $3, $4) RETURNING *',
        [email, name || email.split('@')[0], 'oauth_user', true]
      );

      // Also create a UserProfile with the Google avatar
      try {
        await pool.query(
          'INSERT INTO "UserProfile" (user_email, display_name, avatar_url) VALUES ($1, $2, $3)',
          [email, name || email.split('@')[0], picture || '']
        );
      } catch (profileErr) {
        console.warn('⚠️ Could not create UserProfile for Google user:', profileErr.message);
      }

      // Send welcome email for new Google users
      const userName = name || email.split('@')[0];
      const welcomeMailOptions = {
        from: EMAIL_FROM,
        to: email,
        subject: 'Welcome to Pop-Up Play! 🎉',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #7c3aed;">Welcome to Pop-Up Play, ${userName}!</h2>
            <p>Thank you for joining our community! We're excited to have you here.</p>
            <p>Pop-Up Play is a fun way to connect with people nearby. Here's how to get started:</p>
            <ul>
              <li><strong>Complete your profile</strong> - Add a photo and bio to let others know who you are</li>
              <li><strong>Pop Up</strong> - Turn on your location to appear on the map and meet people nearby</li>
              <li><strong>Connect</strong> - Chat, video verify, and make new connections</li>
            </ul>
            <p style="margin-top: 20px;">
              <a href="${FRONTEND_URL}/Home" style="background-color: #7c3aed; color: white; padding: 12px 24px; text-decoration: none; border-radius: 25px; display: inline-block; font-weight: bold;">Start Exploring</a>
            </p>
            <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">
            <p style="color: #6b7280; font-size: 14px;">If you have any questions, feel free to reach out to us at popupplay.help@gmail.com</p>
            <p style="color: #6b7280; font-size: 14px;">Happy connecting!</p>
            <p style="color: #6b7280; font-size: 14px;"><strong>The Pop-Up Play Team</strong></p>
          </div>
        `,
      };

      transporter.sendMail(welcomeMailOptions, (error, info) => {
        if (error) {
          console.error('❌ [GoogleSignup] Welcome email send failed:', error.message);
        } else {
          console.log('✅ [GoogleSignup] Welcome email sent to:', email);
        }
      });
    }

    // Return user without sensitive data
    const jwtToken = generateToken(user.rows[0]);
    res.json({ 
      ...sanitizeUser(user.rows[0]),
      token: jwtToken,
      auth_method: 'google',
      is_new_user: isNewUser
    });
  } catch (error) {
    console.error('❌ Google auth error:', error.message);
    res.status(500).json({ error: error.message || 'Google authentication failed' });
  }
});

// Change Password (authenticated user — requires valid JWT)
app.post('/api/auth/change-password', authenticateUser, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const email = req.authenticatedUser.email;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current password and new password are required' });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ error: 'New password must be at least 8 characters' });
    }

    // Get user
    const userResult = await pool.query(
      'SELECT * FROM "User" WHERE email = $1',
      [email]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = userResult.rows[0];

    // Verify current password (supports bcrypt and legacy base64)
    const { match } = await verifyPassword(currentPassword, user.password_hash);
    if (!match) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    // Update to new bcrypt-hashed password
    const newPasswordHash = await hashPassword(newPassword);
    
    await pool.query(
      'UPDATE "User" SET password_hash = $1 WHERE email = $2',
      [newPasswordHash, email]
    );

    console.log('✅ [ChangePassword] Password updated for:', email);
    res.json({ 
      success: true, 
      message: 'Password changed successfully' 
    });
  } catch (error) {
    console.error('❌ [ChangePassword] Error:', error.message);
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

// ============ Access Code Redemption ============

// Secure endpoint for redeeming access codes - allows authenticated users to redeem codes
// without exposing full AccessCode CRUD operations
app.post('/api/access-code/redeem', authenticateUser, async (req, res) => {
  try {
    const { code } = req.body;
    const userEmail = req.authenticatedUser.email;

    if (!code || typeof code !== 'string') {
      return res.status(400).json({ error: 'Access code is required' });
    }

    const normalizedCode = code.trim().toUpperCase();
    console.log(`🔑 [RedeemCode] User ${userEmail} attempting to redeem code: ${normalizedCode}`);

    // Find the access code
    const codeResult = await pool.query(
      'SELECT * FROM "AccessCode" WHERE code = $1 AND is_used = false',
      [normalizedCode]
    );

    if (codeResult.rows.length === 0) {
      console.log(`🔑 [RedeemCode] Invalid or already used code: ${normalizedCode}`);
      return res.status(400).json({ error: 'Invalid or already used code' });
    }

    const accessCode = codeResult.rows[0];

    // Check if expired
    if (accessCode.valid_until && new Date(accessCode.valid_until) < new Date()) {
      console.log(`🔑 [RedeemCode] Code expired: ${normalizedCode}`);
      return res.status(400).json({ error: 'This code has expired' });
    }

    // Mark code as used
    await pool.query(
      'UPDATE "AccessCode" SET is_used = true, used_by = $1, used_at = $2 WHERE id = $3',
      [userEmail, new Date().toISOString(), accessCode.id]
    );
    console.log(`🔑 [RedeemCode] Code marked as used: ${normalizedCode}`);

    // Check if user already has a subscription
    const existingSubResult = await pool.query(
      'SELECT * FROM "UserSubscription" WHERE user_email = $1',
      [userEmail]
    );

    if (existingSubResult.rows.length > 0) {
      // Update existing subscription
      const subId = existingSubResult.rows[0].id;
      await pool.query(
        'UPDATE "UserSubscription" SET status = $1, start_date = $2, end_date = $3 WHERE id = $4',
        ['active', new Date().toISOString(), accessCode.valid_until, subId]
      );
      console.log(`🔑 [RedeemCode] Updated existing subscription for: ${userEmail}`);
    } else {
      // Create new subscription
      await pool.query(
        'INSERT INTO "UserSubscription" (user_email, status, start_date, end_date) VALUES ($1, $2, $3, $4)',
        [userEmail, 'active', new Date().toISOString(), accessCode.valid_until]
      );
      console.log(`🔑 [RedeemCode] Created new subscription for: ${userEmail}`);
    }

    res.json({ 
      success: true, 
      message: 'Access code redeemed successfully',
      valid_until: accessCode.valid_until
    });
  } catch (error) {
    console.error('❌ [RedeemCode] Error:', error.message);
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
app.get('/api/entities/:table', authenticateUser, async (req, res) => {
  try {
    const { table } = req.params;
    const { limit = 100, offset = 0 } = req.query;

    // Validate table name (prevent SQL injection)
    const validTables = ['User', 'UserProfile', 'UserSubscription', 'SubscriptionSettings', 
           'Message', 'AccessCode', 'AboutVideo', 'BlockedUser', 'BroadcastMessage', 'UserSession', 'VideoSignal', 'Reel', 'ProfileVideo'];
    
    if (!validTables.includes(table)) {
      return res.status(400).json({ error: 'Invalid table name' });
    }

    // Admin-only tables: only admins can list all records
    const adminOnlyTables = ['User', 'AccessCode', 'UserSession'];
    if (adminOnlyTables.includes(table) && req.authenticatedUser.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden: admin access required to list this table' });
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
app.post('/api/entities/:table/filter', authenticateUser, async (req, res) => {
  try {
    const { table } = req.params;
    const filters = req.body;

    // Validate table name
    const validTables = ['User', 'UserProfile', 'UserSubscription', 'SubscriptionSettings', 
           'Message', 'AccessCode', 'AboutVideo', 'BlockedUser', 'BroadcastMessage', 'UserSession', 'VideoSignal', 'Reel', 'ProfileVideo'];
    
    if (!validTables.includes(table)) {
      return res.status(400).json({ error: 'Invalid table name' });
    }

    // Admin-only tables: only admins can query all records
    const adminOnlyTables = ['AccessCode'];
    if (adminOnlyTables.includes(table) && req.authenticatedUser.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden: admin access required' });
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
app.post('/api/entities/:table', authenticateUser, async (req, res) => {
  try {
    const { table } = req.params;
    const data = req.body;

    // Debug: Log incoming request for entity creation
    console.log('--- [DEBUG ENTITY CREATE] ---');
    console.log('Table:', table);
    console.log('Data:', JSON.stringify(data, null, 2));
    console.log('-----------------------------');

    // Validate table name
    const validTables = ['User', 'UserProfile', 'UserSubscription', 'SubscriptionSettings', 
           'Message', 'AccessCode', 'AboutVideo', 'BlockedUser', 'BroadcastMessage', 'UserSession', 'VideoSignal', 'Reel', 'ProfileVideo'];
    if (!validTables.includes(table)) {
      console.error('[DEBUG ENTITY CREATE] Invalid table name:', table);
      return res.status(400).json({ error: 'Invalid table name' });
    }

    // Admin-only: only admins can create access codes, subscription settings, about videos, or broadcasts
    const adminOnlyCreateTables = ['AccessCode', 'SubscriptionSettings', 'AboutVideo', 'BroadcastMessage'];
    if (adminOnlyCreateTables.includes(table) && req.authenticatedUser.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden: admin access required to create records in this table' });
    }

    // Handle array columns for specific tables
    const arrayColumns = {
      'UserProfile': ['interests', 'photos', 'videos'],
      'SubscriptionSettings': ['features']
    };
    const tableArrayColumns = arrayColumns[table] || [];

    const columns = Object.keys(data);
    const values = Object.values(data);

    // Debug: Log columns and values
    console.log('[DEBUG ENTITY CREATE] Columns:', columns);
    console.log('[DEBUG ENTITY CREATE] Values:', values);

    // Build placeholders with type casting for array columns
    const placeholders = columns.map((col, i) => {
      if (tableArrayColumns.includes(col)) {
        return `$${i + 1}::text[]`;
      }
      return `$${i + 1}`;
    }).join(', ');

    const columnList = columns.map(col => `"${col}"`).join(', ');

    const query = `INSERT INTO "${table}" (${columnList}) VALUES (${placeholders}) RETURNING *`;

    // Debug: Log final query and values
    console.log('[DEBUG ENTITY CREATE] Query:', query);
    console.log('[DEBUG ENTITY CREATE] Query Values:', values);

    const result = await pool.query(query, values);
    console.log('[DEBUG ENTITY CREATE] Success:', result.rows[0]);

    // --- Auto-send email notification when a Message is created ---
    if (table === 'Message' && result.rows[0]) {
      const msg = result.rows[0];
      const recipientEmail = msg.receiver_email;
      const senderEmail = msg.sender_email;
      const messageContent = msg.content || '';

      if (recipientEmail && senderEmail) {
        // Fire-and-forget: do NOT block the response
        (async () => {
          try {
            // Check if recipient has email notifications enabled
            const profileRes = await pool.query(
              'SELECT display_name, email_notifications_enabled FROM "UserProfile" WHERE user_email = $1 LIMIT 1',
              [recipientEmail]
            );
            const recipientProfile = profileRes.rows[0];
            if (recipientProfile && recipientProfile.email_notifications_enabled === false) {
              console.log(`ℹ️ [ChatNotification] Skipping email to ${recipientEmail} (notifications disabled)`);
              return;
            }

            // Get sender display name
            const senderRes = await pool.query(
              'SELECT display_name FROM "UserProfile" WHERE user_email = $1 LIMIT 1',
              [senderEmail]
            );
            const senderName = senderRes.rows[0]?.display_name || senderEmail.split('@')[0] || 'Someone';

            const mailOptions = {
              from: EMAIL_FROM,
              to: recipientEmail,
              subject: `New message from ${senderName} - Pop Up Play`,
              html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                  <h2 style="color: #1e293b; border-bottom: 2px solid #8b5cf6; padding-bottom: 10px;">New Message from ${senderName}</h2>
                  <div style="background-color: #f1f5f9; padding: 15px; border-radius: 8px; margin: 20px 0;">
                    <p style="color: #1e293b; font-style: italic; margin: 0;">"${messageContent}"</p>
                  </div>
                  <p style="color: #475569; margin: 20px 0;">Log in to <strong>Pop Up Play</strong> to reply to this message.</p>
                  <a href="${FRONTEND_URL}/#/Chat" style="background-color: #8b5cf6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">Reply in Pop Up Play</a>
                  <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 30px 0;">
                  <p style="color: #94a3b8; font-size: 12px;">This is an automated email from Pop Up Play. Please do not reply to this email.</p>
                  <p style="margin-top: 16px; color: #94a3b8; font-size: 12px; line-height: 1.5;">To continue receiving email notifications, make sure your email notifications are enabled in your profile area on <a href="${FRONTEND_URL}" style="color: #8b5cf6;">Popupplay.fun</a>.</p>
                  <p style="color: #94a3b8; font-size: 12px; line-height: 1.5;">If you'd like to stop receiving email notifications, simply select "Turn Off Email Notifications" in your profile area on <a href="${FRONTEND_URL}" style="color: #8b5cf6;">Popupplay.fun</a>.</p>
                </div>
              `,
            };

            transporter.sendMail(mailOptions, (error, info) => {
              if (error) {
                console.error('❌ [ChatNotification:Auto] Email send failed for', recipientEmail, ':', error.message);
              } else {
                console.log('✅ [ChatNotification:Auto] Email sent to', recipientEmail, ':', info.response);
              }
            });
          } catch (emailErr) {
            console.error('❌ [ChatNotification:Auto] Error looking up profiles:', emailErr.message);
          }
        })();
      }
    }

    if (table === 'UserProfile' && result.rows[0]) {
      const createdProfile = result.rows[0];
      const isPopped = createdProfile?.is_popped_up === true;

      if (isPopped) {
        sendPopupProximityEmails(createdProfile);
      }
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error(`❌ [CREATE] Error for table ${req.params.table}:`, error.message);
    console.error(`❌ [CREATE] Full error:`, error);
    if (error.detail) {
      console.error('[DEBUG ENTITY CREATE] Error Detail:', error.detail);
    }
    if (error.code) {
      console.error('[DEBUG ENTITY CREATE] Error Code:', error.code);
    }
    res.status(500).json({ 
      error: error.message,
      details: error.detail || error.code
    });
  }
});

// GET /api/entities/:table/:id (Get single record)
app.get('/api/entities/:table/:id', authenticateUser, async (req, res) => {
  try {
    const { table, id } = req.params;

    // Validate table name
    const validTables = ['User', 'UserProfile', 'UserSubscription', 'SubscriptionSettings', 
           'Message', 'AccessCode', 'AboutVideo', 'BlockedUser', 'BroadcastMessage', 'UserSession', 'VideoSignal', 'Reel', 'ProfileVideo'];
    
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
app.put('/api/entities/:table/:id', authenticateUser, async (req, res) => {
  try {
    const { table, id } = req.params;
    const data = req.body;
    let previousProfile = null;

    // Validate table name
    const validTables = ['User', 'UserProfile', 'UserSubscription', 'SubscriptionSettings', 
           'Message', 'AccessCode', 'AboutVideo', 'BlockedUser', 'BroadcastMessage', 'UserSession', 'VideoSignal', 'Reel', 'ProfileVideo'];
    
    if (!validTables.includes(table)) {
      return res.status(400).json({ error: 'Invalid table name' });
    }

    if (table === 'UserProfile') {
      const previousResult = await pool.query(
        `SELECT id, user_email, display_name, is_popped_up, popup_message, latitude, longitude, zip_code, location
         FROM "UserProfile"
         WHERE id = $1`,
        [id]
      );
      previousProfile = previousResult.rows[0] || null;
    }

    // Admin-only: only admins can update subscription settings, access codes, or about videos
    const adminOnlyUpdateTables = ['SubscriptionSettings', 'AccessCode', 'AboutVideo'];
    if (adminOnlyUpdateTables.includes(table) && req.authenticatedUser.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden: admin access required to update records in this table' });
    }

    // Handle array columns for specific tables
    const arrayColumns = {
      'UserProfile': ['interests', 'photos', 'videos'],
      'SubscriptionSettings': ['features'],
      'Message': ['deleted_for']
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

    if (table === 'UserProfile') {
      const updatedProfile = result.rows[0];
      const wasPopped = previousProfile?.is_popped_up === true;
      const isPopped = updatedProfile?.is_popped_up === true;

      if (!wasPopped && isPopped) {
        sendPopupProximityEmails(updatedProfile);
      }
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
app.delete('/api/entities/:table/:id', authenticateUser, async (req, res) => {
  try {
    const { table, id } = req.params;

    // Validate table name
    const validTables = ['User', 'UserProfile', 'UserSubscription', 'SubscriptionSettings', 
           'Message', 'AccessCode', 'AboutVideo', 'BlockedUser', 'BroadcastMessage', 'UserSession', 'VideoSignal', 'Reel', 'ProfileVideo'];
    
    if (!validTables.includes(table)) {
      return res.status(400).json({ error: 'Invalid table name' });
    }

    // Admin-only: only admins can delete access codes, subscription settings, users, about videos, broadcasts
    const adminOnlyDeleteTables = ['AccessCode', 'SubscriptionSettings', 'User', 'UserSubscription', 'AboutVideo', 'BroadcastMessage'];
    if (adminOnlyDeleteTables.includes(table) && req.authenticatedUser.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden: admin access required to delete records in this table' });
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

// DELETE /api/account/delete - Self-delete: user deletes their own account and ALL related data
app.delete('/api/account/delete', authenticateUser, async (req, res) => {
  try {
    const email = req.authenticatedUser.email;

    // Delete in order (foreign key constraints use CASCADE but let's be explicit)
    await pool.query('DELETE FROM "VideoSignal" WHERE from_email = $1 OR to_email = $1', [email]);
    await pool.query('DELETE FROM "Message" WHERE sender_email = $1 OR receiver_email = $1', [email]);
    await pool.query('DELETE FROM "BlockedUser" WHERE blocker_email = $1 OR blocked_email = $1', [email]);
    await pool.query('DELETE FROM "UserSession" WHERE user_email = $1', [email]);
    await pool.query('DELETE FROM "Reel" WHERE user_email = $1', [email]);
    await pool.query('DELETE FROM "ProfileVideo" WHERE user_email = $1', [email]);
    await pool.query('DELETE FROM "UserSubscription" WHERE user_email = $1', [email]);
    await pool.query('DELETE FROM "UserProfile" WHERE user_email = $1', [email]);
    const deleteResult = await pool.query('DELETE FROM "User" WHERE email = $1 RETURNING *', [email]);

    if (deleteResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    console.log(`🗑️ [SELF-DELETE] User ${email} deleted their account and all related data`);
    res.json({ success: true, deleted: deleteResult.rows[0] });
  } catch (error) {
    console.error('❌ [SELF-DELETE] Error deleting account:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/admin/user/:email - Admin-only: delete a user and ALL related data
app.delete('/api/admin/user/:email', authenticateUser, async (req, res) => {
  try {
    if (req.authenticatedUser.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden: admin access required' });
    }

    const { email } = req.params;

    // Check user exists
    const userResult = await pool.query('SELECT id, email, name FROM "User" WHERE email = $1', [email]);
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Delete in order (foreign key constraints use CASCADE but let's be explicit)
    await pool.query('DELETE FROM "VideoSignal" WHERE from_email = $1 OR to_email = $1', [email]);
    await pool.query('DELETE FROM "Message" WHERE sender_email = $1 OR receiver_email = $1', [email]);
    await pool.query('DELETE FROM "BlockedUser" WHERE blocker_email = $1 OR blocked_email = $1', [email]);
    await pool.query('DELETE FROM "UserSession" WHERE user_email = $1', [email]);
    await pool.query('DELETE FROM "Reel" WHERE user_email = $1', [email]);
    await pool.query('DELETE FROM "UserSubscription" WHERE user_email = $1', [email]);
    await pool.query('DELETE FROM "UserProfile" WHERE user_email = $1', [email]);
    const deleteResult = await pool.query('DELETE FROM "User" WHERE email = $1 RETURNING *', [email]);

    console.log(`🗑️ [ADMIN] Deleted user ${email} and all related data`);
    res.json({ success: true, deleted: deleteResult.rows[0] });
  } catch (error) {
    console.error('❌ [ADMIN] Error deleting user:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// ============ Contact Form ============

app.post('/api/contact', async (req, res) => {
  try {
    const { name, email, subject, message } = req.body;

    if (!name || !email || !message) {
      return res.status(400).json({ error: 'Name, email, and message are required' });
    }

    // Send email to admin
    const adminEmail = process.env.CONTACT_FORM_TO || process.env.EMAIL_FROM || 'popupplay.help@gmail.com';

    const mailOptions = {
      from: EMAIL_FROM,
      to: adminEmail,
      replyTo: email,
      subject: `[Pop Up Play Contact] ${subject || 'New message'} — from ${name}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 640px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #8b5cf6 0%, #06b6d4 100%); padding: 20px; border-radius: 12px 12px 0 0;">
            <h1 style="color: #fff; margin: 0; font-size: 22px;">📬 New Contact Form Submission</h1>
          </div>
          <div style="background: #fff; padding: 24px; border: 1px solid #e2e8f0; border-radius: 0 0 12px 12px;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 12px; font-weight: bold; color: #475569; width: 90px;">Name:</td>
                <td style="padding: 8px 12px; color: #1e293b;">${name}</td>
              </tr>
              <tr>
                <td style="padding: 8px 12px; font-weight: bold; color: #475569;">Email:</td>
                <td style="padding: 8px 12px;"><a href="mailto:${email}" style="color: #8b5cf6;">${email}</a></td>
              </tr>
              ${subject ? `<tr><td style="padding: 8px 12px; font-weight: bold; color: #475569;">Subject:</td><td style="padding: 8px 12px; color: #1e293b;">${subject}</td></tr>` : ''}
            </table>
            <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 16px 0;">
            <div style="background: #f8fafc; padding: 16px; border-radius: 8px; border-left: 4px solid #8b5cf6;">
              <p style="margin: 0 0 4px; font-weight: bold; color: #475569; font-size: 13px;">Message:</p>
              <p style="margin: 0; color: #1e293b; line-height: 1.6; white-space: pre-wrap;">${message}</p>
            </div>
            <p style="margin-top: 20px; color: #94a3b8; font-size: 12px;">Sent from the Pop Up Play contact form on ${new Date().toLocaleString()}</p>
          </div>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);
    console.log(`✅ [Contact] Message from ${email} sent to ${adminEmail}`);

    res.json({ success: true, message: 'Message sent successfully' });
  } catch (error) {
    console.error('❌ [Contact] Error:', error.message);
    res.status(500).json({ error: 'Failed to send message. Please try again later.' });
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

// POST /api/broadcast/send - Send broadcast to all users (admin only)
app.post('/api/broadcast/send', authenticateUser, requireAdmin, async (req, res) => {
  try {
    const { subject, message } = req.body;
    const adminEmail = req.authenticatedUser.email;

    if (!message || !message.trim()) {
      return res.status(400).json({ error: 'Message is required' });
    }

    // Get all users with their email notification preferences
    // INNER JOIN ensures we only include users who still have a profile (filters out deleted accounts)
    const usersResult = await pool.query(
      `SELECT u.email, COALESCE(p.email_notifications_enabled, true) as email_notifications_enabled
       FROM "User" u
       INNER JOIN "UserProfile" p ON u.email = p.user_email
       WHERE u.email != $1`,
      [adminEmail]
    );
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

    // Send emails to all users who have email notifications enabled
    console.log(`📧 [Broadcast] Sending emails to ${allUsers.length} users...`);
    let emailsSent = 0;
    let emailsFailed = 0;

    for (const user of allUsers) {
      if (!user.email_notifications_enabled) {
        console.log(`⏭️  [Broadcast] Skipping email for ${user.email} (notifications disabled)`);
        continue;
      }

      try {
        const htmlContent = `
          <div style="font-family: Arial, sans-serif; max-width: 640px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #8b5cf6 0%, #d946ef 100%); padding: 20px; border-radius: 12px 12px 0 0;">
              <h1 style="color: #fff; margin: 0; font-size: 24px;">📢 New Announcement from Pop Up Play</h1>
            </div>
            <div style="background: #fff; padding: 20px; border: 1px solid #e2e8f0; border-radius: 0 0 12px 12px;">
              ${subject ? `<h2 style="color: #1e293b; margin-top: 0; margin-bottom: 10px;">${subject}</h2>` : ''}
              <p style="color: #334155; line-height: 1.6; white-space: pre-wrap;">${message.trim()}</p>
              <div style="background: #f8fafc; border-left: 4px solid #8b5cf6; padding: 12px; margin: 16px 0; border-radius: 4px;">
                <p style="margin: 0; color: #475569; font-size: 14px;">Sent on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}</p>
              </div>
              <a href="${FRONTEND_URL}/#/Menu"
                 style="background-color: #8b5cf6; color: #fff; text-decoration: none; display: inline-block; padding: 12px 24px; border-radius: 6px; font-weight: 600; margin-top: 16px;">
                Open Pop Up Play
              </a>
              <p style="margin-top: 22px; color: #94a3b8; font-size: 12px; border-top: 1px solid #e2e8f0; padding-top: 12px;">
                You are receiving this because email notifications are enabled in your profile settings. You can manage your preferences in the app.
              </p>
            </div>
          </div>
        `;

        await transporter.sendMail({
          from: EMAIL_FROM,
          to: user.email,
          subject: subject ? `📢 ${subject}` : '📢 New Announcement from Pop Up Play',
          html: htmlContent
        });

        emailsSent++;
        console.log(`✅ [Broadcast] Email sent to ${user.email}`);
      } catch (emailError) {
        emailsFailed++;
        console.error(`❌ [Broadcast] Failed to send email to ${user.email}:`, emailError.message);
      }
    }

    console.log(`📧 [Broadcast] Email sending complete. Sent: ${emailsSent}, Failed: ${emailsFailed}`);

    // Update broadcast record with email sending statistics
    try {
      await pool.query(
        `UPDATE "BroadcastMessage" 
         SET emails_sent = $1, emails_failed = $2, updated_date = CURRENT_TIMESTAMP
         WHERE id = $3`,
        [emailsSent, emailsFailed, broadcast.id]
      );
      console.log(`📊 [Broadcast] Updated email statistics for broadcast ${broadcast.id}`);
    } catch (updateError) {
      console.error(`❌ [Broadcast] Failed to update email statistics:`, updateError.message);
      // Don't fail the whole request if this fails, just log it
    }

    res.json({
      success: true,
      data: {
        broadcast_sent: true,
        recipients: recipientCount,
        broadcast_id: broadcast.id,
        emails_sent: emailsSent,
        emails_failed: emailsFailed
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

// GET /api/broadcast/recent - Get recent broadcasts (admin only)
app.get('/api/broadcast/recent', authenticateUser, requireAdmin, async (req, res) => {
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
app.post('/api/functions/getSubscriptionStatus', authenticateUserStrict, async (req, res) => {
  try {
    const userEmail = req.authenticatedUser.email;

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

    if (subscription.paypal_subscription_id) {
      try {
        const paypalSub = await fetchPayPalSubscription(subscription.paypal_subscription_id);
        const mappedStatus = mapPayPalSubscriptionStatus(paypalSub.status);
        const endDate = paypalSub?.billing_info?.next_billing_time || subscription.end_date;

        if (mappedStatus !== subscription.status || String(endDate || '') !== String(subscription.end_date || '')) {
          await pool.query(
            `UPDATE "UserSubscription"
             SET status = $1,
                 end_date = $2,
                 updated_date = CURRENT_TIMESTAMP
             WHERE id = $3`,
            [mappedStatus, endDate, subscription.id]
          );
          subscription.status = mappedStatus;
          subscription.end_date = endDate;
        }
      } catch (syncErr) {
        console.warn('⚠️ [getSubscriptionStatus] PayPal sync skipped:', syncErr.message);
      }
    }

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

    if (subscription.status === 'pending') {
      return res.json({
        required: true,
        hasAccess: false,
        status: 'pending',
        endDate: subscription.end_date || null
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

// ============ Chat Message Email Notifications ============

// POST /api/email/send-chat-notification - Send email when user receives a message
app.post('/api/email/send-chat-notification', authenticateUser, async (req, res) => {
  try {
    const { recipientEmail, senderEmail, messageContent, senderName } = req.body;

    if (!recipientEmail || !senderEmail || !messageContent || !senderName) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Get recipient user to verify they exist
    const recipientResult = await pool.query(
      'SELECT email FROM "User" WHERE email = $1',
      [recipientEmail]
    );

    if (recipientResult.rows.length === 0) {
      return res.status(404).json({ error: 'Recipient not found' });
    }

    // Prepare email content - similar to forgot password style
    const mailOptions = {
      from: EMAIL_FROM,
      to: recipientEmail,
      subject: `New message from ${senderName} - Pop Up Play`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #1e293b; border-bottom: 2px solid #8b5cf6; padding-bottom: 10px;">New Message from ${senderName}</h2>
          
          <div style="background-color: #f1f5f9; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="color: #1e293b; font-style: italic; margin: 0;">
              "${messageContent}"
            </p>
          </div>

          <p style="color: #475569; margin: 20px 0;">
            Log in to <strong>Pop Up Play</strong> to reply to this message.
          </p>

          <a href="${FRONTEND_URL}/#/Chat" 
             style="background-color: #8b5cf6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">
            Reply in Pop Up Play
          </a>

          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 30px 0;">
          
          <p style="color: #94a3b8; font-size: 12px;">
            This is an automated email from Pop Up Play. Please do not reply to this email.
          </p>
          <p style="margin-top: 16px; color: #94a3b8; font-size: 12px; line-height: 1.5;">
            To continue receiving email notifications, make sure your email notifications are enabled in your profile area on <a href="${FRONTEND_URL}" style="color: #8b5cf6;">Popupplay.fun</a>.
          </p>
          <p style="color: #94a3b8; font-size: 12px; line-height: 1.5;">
            If you'd like to stop receiving email notifications, simply select "Turn Off Email Notifications" in your profile area on <a href="${FRONTEND_URL}" style="color: #8b5cf6;">Popupplay.fun</a>.
          </p>
        </div>
      `,
    };

    // Send email asynchronously (don't wait for completion)
    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.error('❌ [ChatNotification] Email send failed for', recipientEmail, ':', error.message);
      } else {
        console.log('✅ [ChatNotification] Email sent to', recipientEmail, ':', info.response);
      }
    });

    // Respond immediately (email sends in background)
    res.json({ 
      success: true, 
      message: 'Email notification sent to recipient'
    });

  } catch (error) {
    console.error('❌ [ChatNotification] Error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// ============ PayPal Integration Routes ============

// PayPal configuration
const PAYPAL_CLIENT_ID = process.env.PAYPAL_CLIENT_ID;
const PAYPAL_CLIENT_SECRET = process.env.PAYPAL_CLIENT_SECRET;
const PAYPAL_MODE = process.env.PAYPAL_MODE || 'sandbox';
const PAYPAL_WEBHOOK_ID = process.env.PAYPAL_WEBHOOK_ID || '';
const PAYPAL_API_BASE = PAYPAL_MODE === 'sandbox' 
  ? 'https://api-m.sandbox.paypal.com' 
  : 'https://api-m.paypal.com';

// Get PayPal Access Token
async function getPayPalAccessToken() {
  const auth = Buffer.from(`${PAYPAL_CLIENT_ID}:${PAYPAL_CLIENT_SECRET}`).toString('base64');
  
  const response = await fetch(`${PAYPAL_API_BASE}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('PayPal auth error:', error);
    throw new Error('Failed to get PayPal access token');
  }

  const data = await response.json();
  return data.access_token;
}

function mapPayPalSubscriptionStatus(paypalStatus) {
  const normalized = String(paypalStatus || '').toUpperCase();
  if (normalized === 'ACTIVE') return 'active';
  if (normalized === 'APPROVAL_PENDING' || normalized === 'APPROVED') return 'pending';
  if (normalized === 'SUSPENDED') return 'suspended';
  if (normalized === 'CANCELLED') return 'cancelled';
  if (normalized === 'EXPIRED') return 'expired';
  return 'inactive';
}

async function fetchPayPalSubscription(subscriptionId) {
  const accessToken = await getPayPalAccessToken();
  const response = await fetch(`${PAYPAL_API_BASE}/v1/billing/subscriptions/${subscriptionId}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    const issue = err?.details?.[0]?.issue || err?.name || 'PAYPAL_SUBSCRIPTION_FETCH_FAILED';
    throw new Error(issue);
  }

  return response.json();
}

async function upsertUserSubscriptionFromPayPal(userEmail, paypalSubscription) {
  const mappedStatus = mapPayPalSubscriptionStatus(paypalSubscription?.status);
  const startDate = paypalSubscription?.start_time || paypalSubscription?.create_time || null;
  const endDate = paypalSubscription?.billing_info?.next_billing_time || null;

  await pool.query(
    `INSERT INTO "UserSubscription" (
      user_email, status, start_date, end_date, paypal_subscription_id, created_date, updated_date
    )
    VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    ON CONFLICT (id) DO NOTHING`,
    [userEmail, mappedStatus, startDate, endDate, paypalSubscription.id]
  );

  await pool.query(
    `UPDATE "UserSubscription"
     SET status = $1,
         start_date = $2,
         end_date = $3,
         paypal_subscription_id = $4,
         updated_date = CURRENT_TIMESTAMP
     WHERE user_email = $5`,
    [mappedStatus, startDate, endDate, paypalSubscription.id, userEmail]
  );
}

async function verifyPayPalWebhookSignature(webhookEvent, headers) {
  if (!PAYPAL_WEBHOOK_ID) return false;

  const accessToken = await getPayPalAccessToken();
  const payload = {
    auth_algo: headers['paypal-auth-algo'],
    cert_url: headers['paypal-cert-url'],
    transmission_id: headers['paypal-transmission-id'],
    transmission_sig: headers['paypal-transmission-sig'],
    transmission_time: headers['paypal-transmission-time'],
    webhook_id: PAYPAL_WEBHOOK_ID,
    webhook_event: webhookEvent,
  };

  const response = await fetch(`${PAYPAL_API_BASE}/v1/notifications/verify-webhook-signature`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) return false;
  const data = await response.json().catch(() => ({}));
  return data?.verification_status === 'SUCCESS';
}

// Create recurring PayPal Subscription
app.post('/api/paypal/create-subscription', authenticateUserStrict, async (req, res) => {
  try {
    const userEmail = req.authenticatedUser.email;

    // Get subscription settings for price
    const settingsResult = await pool.query('SELECT * FROM "SubscriptionSettings" ORDER BY updated_date DESC LIMIT 1');
    const settings = settingsResult.rows[0];
    
    if (!settings) {
      return res.status(400).json({ error: 'No subscription settings found' });
    }

    const paypalPlanId = (settings.paypal_plan_id || settings.stripe_price_id || '').trim();
    if (!paypalPlanId) {
      return res.status(400).json({ error: 'PayPal plan is not configured. Please contact admin.' });
    }

    const accessToken = await getPayPalAccessToken();

    const subscriptionData = {
      plan_id: paypalPlanId,
      custom_id: userEmail,
      subscriber: {
        email_address: userEmail,
      },
      application_context: {
        brand_name: 'Pop-Up Play',
        user_action: 'SUBSCRIBE_NOW',
        landing_page: 'billing',
        return_url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/#/SubscriptionSuccess`,
        cancel_url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/#/Pricing`,
      },
    };

    const response = await fetch(`${PAYPAL_API_BASE}/v1/billing/subscriptions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(subscriptionData),
    });

    if (!response.ok) {
      const errorJson = await response.json().catch(() => null);
      const issue = errorJson?.details?.[0]?.issue;
      const debugId = errorJson?.debug_id;

      if (issue === 'PAYEE_ACCOUNT_RESTRICTED') {
        console.error('PayPal create order error:', JSON.stringify(errorJson));
        return res.status(503).json({
          error: 'PayPal is temporarily unavailable for this merchant account. Please use an access code or contact support.',
          code: issue,
          debug_id: debugId,
        });
      }

      console.error('PayPal create order error:', JSON.stringify(errorJson));
      return res.status(502).json({
        error: errorJson?.message || 'Failed to create PayPal subscription',
        code: issue || 'PAYPAL_CREATE_SUBSCRIPTION_FAILED',
        debug_id: debugId,
      });
    }

    const subscription = await response.json();
    console.log('✅ PayPal subscription created:', subscription.id);

    res.json({
      subscriptionID: subscription.id,
      status: subscription.status,
      approvalUrl: subscription.links?.find(link => link.rel === 'approve')?.href,
    });
  } catch (error) {
    console.error('❌ PayPal create subscription error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Activate/verify PayPal Subscription after approval
app.post('/api/paypal/activate-subscription', authenticateUserStrict, async (req, res) => {
  try {
    const { subscriptionID } = req.body;
    const userEmail = req.authenticatedUser.email;

    if (!subscriptionID) {
      return res.status(400).json({ error: 'Subscription ID required' });
    }

    const paypalSubscription = await fetchPayPalSubscription(subscriptionID);

    if (paypalSubscription.custom_id && paypalSubscription.custom_id !== userEmail) {
      return res.status(403).json({ error: 'Subscription does not belong to authenticated user' });
    }

    await upsertUserSubscriptionFromPayPal(userEmail, paypalSubscription);

    console.log('✅ PayPal subscription verified and saved for:', userEmail);

    res.json({
      success: true,
      subscriptionID: paypalSubscription.id,
      status: paypalSubscription.status,
      subscription: {
        status: mapPayPalSubscriptionStatus(paypalSubscription.status),
        start_date: paypalSubscription.start_time || paypalSubscription.create_time || null,
        end_date: paypalSubscription.billing_info?.next_billing_time || null,
      },
    });
  } catch (error) {
    console.error('❌ PayPal activate subscription error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Backward-compat endpoints (deprecated)
app.post('/api/paypal/create-order', authenticateUserStrict, async (req, res) => {
  return res.status(410).json({
    error: 'Deprecated endpoint. Use /api/paypal/create-subscription.',
    code: 'PAYPAL_ORDER_DEPRECATED',
  });
});

app.post('/api/paypal/capture-order', authenticateUserStrict, async (req, res) => {
  return res.status(410).json({
    error: 'Deprecated endpoint. Use /api/paypal/activate-subscription.',
    code: 'PAYPAL_CAPTURE_DEPRECATED',
  });
});

// PayPal webhook to keep subscription status synced
app.post('/api/paypal/webhook', express.json({ type: '*/*' }), async (req, res) => {
  try {
    if (!PAYPAL_WEBHOOK_ID) {
      return res.status(400).json({ error: 'PAYPAL_WEBHOOK_ID is not configured' });
    }

    const verified = await verifyPayPalWebhookSignature(req.body, req.headers);
    if (!verified) {
      return res.status(401).json({ error: 'Invalid PayPal webhook signature' });
    }

    const eventType = req.body?.event_type;
    const resource = req.body?.resource || {};
    const subscriptionId = resource.id || resource?.billing_agreement_id;

    if (!subscriptionId) {
      return res.json({ received: true });
    }

    const subResult = await pool.query(
      'SELECT * FROM "UserSubscription" WHERE paypal_subscription_id = $1 ORDER BY updated_date DESC LIMIT 1',
      [subscriptionId]
    );

    if (subResult.rows.length === 0) {
      return res.json({ received: true });
    }

    const localSub = subResult.rows[0];
    const mappedStatus = mapPayPalSubscriptionStatus(resource.status || req.body?.summary || '');
    const nextBilling = resource?.billing_info?.next_billing_time || localSub.end_date;

    if (eventType && eventType.startsWith('BILLING.SUBSCRIPTION.')) {
      await pool.query(
        `UPDATE "UserSubscription"
         SET status = $1,
             end_date = $2,
             updated_date = CURRENT_TIMESTAMP
         WHERE id = $3`,
        [mappedStatus, nextBilling, localSub.id]
      );
    }

    return res.json({ received: true });
  } catch (error) {
    console.error('❌ PayPal webhook error:', error.message);
    return res.status(500).json({ error: error.message });
  }
});

// Get PayPal Client ID for frontend
app.get('/api/paypal/client-id', (req, res) => {
  res.json({ clientId: PAYPAL_CLIENT_ID });
});

// ============ Cancel Subscription ============

// POST /api/subscription/cancel - Cancel user's active subscription
app.post('/api/subscription/cancel', authenticateUserStrict, async (req, res) => {
  try {
    const userEmail = req.authenticatedUser.email;

    const subResult = await pool.query(
      `SELECT * FROM "UserSubscription" WHERE user_email = $1 ORDER BY created_date DESC LIMIT 1`,
      [userEmail]
    );

    if (subResult.rows.length === 0) {
      return res.status(404).json({ error: 'No subscription found' });
    }

    const subscription = subResult.rows[0];

    if (subscription.status !== 'active' && subscription.status !== 'trial') {
      return res.status(400).json({ error: 'Subscription is not active' });
    }

    if (subscription.paypal_subscription_id) {
      const accessToken = await getPayPalAccessToken();
      const cancelResponse = await fetch(
        `${PAYPAL_API_BASE}/v1/billing/subscriptions/${subscription.paypal_subscription_id}/cancel`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ reason: 'User requested cancellation' }),
        }
      );

      if (!cancelResponse.ok) {
        const cancelErr = await cancelResponse.json().catch(() => null);
        const issue = cancelErr?.details?.[0]?.issue || cancelErr?.name;
        const acceptable = ['RESOURCE_NOT_FOUND', 'SUBSCRIPTION_ALREADY_CANCELLED', 'INVALID_STATUS_TO_CANCEL'];
        if (!acceptable.includes(issue)) {
          console.error('❌ PayPal cancel error:', JSON.stringify(cancelErr));
          return res.status(502).json({
            error: cancelErr?.message || 'Failed to cancel PayPal subscription',
            code: issue || 'PAYPAL_CANCEL_FAILED',
          });
        }
      }
    }

    // Cancel the subscription
    await pool.query(
      `UPDATE "UserSubscription"
       SET status = 'cancelled',
           end_date = CURRENT_TIMESTAMP,
           updated_date = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [subscription.id]
    );

    console.log(`✅ Subscription cancelled for: ${userEmail}`);

    res.json({
      success: true,
      message: 'Subscription cancelled successfully',
      status: 'cancelled'
    });
  } catch (error) {
    console.error('❌ Cancel subscription error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// ============ Auto pop-down DISABLED ============
// Users stay popped up indefinitely until they manually pop down.
// The cleanupStalePopups function has been removed.

// cleanupStalePopups API endpoint removed — auto pop-down is disabled.
// Users remain popped up until they manually pop down.

// ============ Test Proximity Email (dry-run + optional live send) ============

/**
 * GET  /api/test/proximity-email?user_email=...          → dry-run (shows who WOULD be emailed)
 * POST /api/test/proximity-email  { user_email: "..." }  → actually sends the emails
 */
app.get('/api/test/proximity-email', async (req, res) => {
  try {
    const userEmail = req.query.user_email;
    if (!userEmail) {
      return res.status(400).json({ error: 'Provide ?user_email=someone@example.com' });
    }

    const profileResult = await pool.query(
      `SELECT * FROM "UserProfile" WHERE user_email = $1`,
      [userEmail]
    );

    if (profileResult.rows.length === 0) {
      return res.status(404).json({ error: `No profile found for ${userEmail}` });
    }

    const profile = profileResult.rows[0];
    const lat = Number(profile.latitude);
    const lon = Number(profile.longitude);

    if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
      return res.json({ error: 'User has no valid coordinates', profile });
    }

    // Same query as sendPopupProximityEmails but returns the data instead of sending
    const nearbyCandidates = await pool.query(
      `SELECT user_email, display_name, latitude, longitude, zip_code, location, is_popped_up,
              COALESCE(email_notifications_enabled, true) AS email_notifications_enabled
       FROM "UserProfile"
       WHERE user_email != $1
         AND latitude IS NOT NULL
         AND longitude IS NOT NULL
         AND COALESCE(email_notifications_enabled, true) = true`,
      [userEmail]
    );

    const allWithDistances = nearbyCandidates.rows.map((c) => {
      const cLat = Number(c.latitude);
      const cLon = Number(c.longitude);
      const distance = (Number.isFinite(cLat) && Number.isFinite(cLon))
        ? calculateDistanceMiles(lat, lon, cLat, cLon)
        : null;
      return {
        ...c,
        distance_basis: c.is_popped_up === true ? 'current_popup_location' : 'profile_zip_or_location',
        distance_miles: distance ? Math.round(distance * 100) / 100 : null,
      };
    });

    const withinRadius = allWithDistances
      .filter((c) => c.distance_miles !== null && c.distance_miles <= POPUP_ALERT_RADIUS_MILES)
      .sort((a, b) => a.distance_miles - b.distance_miles);

    const outsideRadius = allWithDistances
      .filter((c) => c.distance_miles === null || c.distance_miles > POPUP_ALERT_RADIUS_MILES)
      .sort((a, b) => (a.distance_miles || 99999) - (b.distance_miles || 99999));

    res.json({
      mode: 'DRY RUN — no emails sent. POST to /api/test/proximity-email to actually send.',
      popper: {
        user_email: profile.user_email,
        display_name: profile.display_name,
        latitude: lat,
        longitude: lon,
        zip_code: profile.zip_code,
        is_popped_up: profile.is_popped_up,
      },
      radius_miles: POPUP_ALERT_RADIUS_MILES,
      would_email: withinRadius,
      outside_radius: outsideRadius,
      summary: `${withinRadius.length} user(s) within ${POPUP_ALERT_RADIUS_MILES} miles would receive an email.`,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/test/proximity-email', async (req, res) => {
  try {
    const userEmail = req.body.user_email;
    if (!userEmail) {
      return res.status(400).json({ error: 'Provide { "user_email": "someone@example.com" }' });
    }

    const profileResult = await pool.query(
      `SELECT * FROM "UserProfile" WHERE user_email = $1`,
      [userEmail]
    );

    if (profileResult.rows.length === 0) {
      return res.status(404).json({ error: `No profile found for ${userEmail}` });
    }

    const profile = profileResult.rows[0];

    // Actually send the emails
    await sendPopupProximityEmails(profile);

    res.json({
      success: true,
      message: `Proximity emails triggered for ${userEmail}. Check server logs for send results.`,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============ Start Server ============

const server = app.listen(PORT, async () => {
  // Try to seed sample data on startup (non-blocking)
  seedData().catch(err => {
    console.warn('⚠️ Seeding completed with warnings:', err.message);
  });

  // Auto pop-down disabled — users stay popped up until they manually pop down.
  console.log('ℹ️ Auto pop-down is disabled. Users stay popped up until they choose to pop down.');
});
