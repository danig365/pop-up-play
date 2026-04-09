/**
 * Migration: Merge duplicate case-variant accounts, normalize all emails to lowercase,
 * and add case-insensitive unique indexes.
 *
 * Run: node database/merge_duplicate_emails.mjs
 *
 * What it does:
 * 1. Finds duplicate User rows that differ only by email case.
 * 2. For each set of duplicates, keeps the OLDEST row (canonical) and reassigns
 *    all related data (profiles, messages, subscriptions, etc.) to it.
 * 3. Merges the duplicate UserProfile into the canonical one (keeps the most recently
 *    updated data).
 * 4. Deletes the duplicate User row (CASCADE takes care of leftover orphan rows).
 * 5. Lowercases all remaining emails across every table.
 * 6. Creates unique indexes on lower(email) to prevent recurrence.
 */

import pg from 'pg';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config();

const { Pool } = pg;

function resolveDbHost() {
  const configuredHost = process.env.DB_HOST || 'localhost';
  if (configuredHost !== 'postgres') return configuredHost;
  const isDocker = fs.existsSync('/.dockerenv') || process.env.DOCKER_CONTAINER === 'true';
  return isDocker ? configuredHost : 'localhost';
}

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: resolveDbHost(),
  port: parseInt(process.env.DB_PORT, 10) || 5432,
  database: process.env.DB_NAME || 'popup_play_db',
  password: process.env.DB_PASSWORD || undefined,
});

async function run() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // ---- 1. Find duplicate User rows grouped by lower(email) ----
    const dupeGroups = await client.query(`
      SELECT lower(email) AS canonical_email, array_agg(email ORDER BY created_date ASC) AS emails,
             array_agg(id ORDER BY created_date ASC) AS ids
      FROM "User"
      GROUP BY lower(email)
      HAVING count(*) > 1
    `);

    console.log(`Found ${dupeGroups.rows.length} email(s) with case-variant duplicates.`);

    for (const group of dupeGroups.rows) {
      const canonicalEmail = group.canonical_email; // lowercase
      const keepId = group.ids[0]; // oldest
      const keepEmail = group.emails[0];
      const dupeIds = group.ids.slice(1);
      const dupeEmails = group.emails.slice(1);

      console.log(`\n=== Merging "${dupeEmails.join('", "')}" → "${keepEmail}" (will become "${canonicalEmail}") ===`);

      for (let i = 0; i < dupeIds.length; i++) {
        const dupeEmail = dupeEmails[i];

        // ---- 2. Merge UserProfile: keep most recently updated data ----
        const canonicalProfile = await client.query(
          `SELECT * FROM "UserProfile" WHERE user_email = $1 LIMIT 1`,
          [keepEmail]
        );
        const dupeProfile = await client.query(
          `SELECT * FROM "UserProfile" WHERE user_email = $1 LIMIT 1`,
          [dupeEmail]
        );

        if (canonicalProfile.rows.length > 0 && dupeProfile.rows.length > 0) {
          const canon = canonicalProfile.rows[0];
          const dupe = dupeProfile.rows[0];

          // If dupe was updated more recently, copy its important fields to canonical
          if (new Date(dupe.updated_date) > new Date(canon.updated_date)) {
            console.log(`  Merging profile data from "${dupeEmail}" (newer) into "${keepEmail}"`);
            await client.query(`
              UPDATE "UserProfile"
              SET display_name     = COALESCE($1, display_name),
                  bio              = COALESCE($2, bio),
                  avatar_url       = COALESCE($3, avatar_url),
                  age              = COALESCE($4, age),
                  gender           = COALESCE($5, gender),
                  interested_in    = COALESCE($6, interested_in),
                  zip_code         = COALESCE($7, zip_code),
                  latitude         = COALESCE($8, latitude),
                  longitude        = COALESCE($9, longitude),
                  location         = COALESCE($10, location),
                  popup_message    = COALESCE($11, popup_message),
                  is_popped_up     = $12,
                  has_ever_popped_up = COALESCE($13, has_ever_popped_up),
                  email_notifications_enabled = COALESCE($14, email_notifications_enabled),
                  photos           = CASE WHEN array_length($15::text[], 1) > 0 THEN $15::text[] ELSE photos END,
                  videos           = CASE WHEN array_length($16::text[], 1) > 0 THEN $16::text[] ELSE videos END,
                  updated_date     = CURRENT_TIMESTAMP
              WHERE id = $17
            `, [
              dupe.display_name, dupe.bio, dupe.avatar_url, dupe.age,
              dupe.gender, dupe.interested_in, dupe.zip_code,
              dupe.latitude, dupe.longitude, dupe.location,
              dupe.popup_message, dupe.is_popped_up,
              dupe.has_ever_popped_up, dupe.email_notifications_enabled,
              dupe.photos || [], dupe.videos || [],
              canon.id
            ]);
          }
        } else if (dupeProfile.rows.length > 0 && canonicalProfile.rows.length === 0) {
          // No canonical profile exists — reassign the dupe profile
          console.log(`  Reassigning orphan profile from "${dupeEmail}" to "${keepEmail}"`);
          await client.query(
            `UPDATE "UserProfile" SET user_email = $1, updated_date = CURRENT_TIMESTAMP WHERE user_email = $2`,
            [keepEmail, dupeEmail]
          );
        }

        // ---- 3. Reassign related data from dupe to canonical ----
        const reassignTables = [
          { table: 'Message', cols: ['sender_email', 'receiver_email'] },
          { table: 'BlockedUser', cols: ['blocker_email', 'blocked_email'] },
          { table: 'UserSubscription', cols: ['user_email'] },
          { table: 'UserSession', cols: ['user_email'] },
          { table: 'Reel', cols: ['user_email'] },
          { table: 'ProfileVideo', cols: ['user_email'] },
          { table: 'VideoSignal', cols: ['from_email', 'to_email'] },
        ];

        for (const { table, cols } of reassignTables) {
          for (const col of cols) {
            const updated = await client.query(
              `UPDATE "${table}" SET "${col}" = $1 WHERE "${col}" = $2`,
              [keepEmail, dupeEmail]
            );
            if (updated.rowCount > 0) {
              console.log(`  Reassigned ${updated.rowCount} row(s) in ${table}.${col}`);
            }
          }
        }

        // ---- 4. Delete the duplicate profile (if it still exists separately) ----
        if (dupeProfile.rows.length > 0 && canonicalProfile.rows.length > 0) {
          await client.query(`DELETE FROM "UserProfile" WHERE user_email = $1`, [dupeEmail]);
          console.log(`  Deleted duplicate UserProfile for "${dupeEmail}"`);
        }

        // ---- 5. Delete the duplicate User row ----
        await client.query(`DELETE FROM "User" WHERE email = $1`, [dupeEmail]);
        console.log(`  Deleted duplicate User row for "${dupeEmail}"`);
      }

      // ---- 6. Normalize the canonical User email to lowercase ----
      if (keepEmail !== canonicalEmail) {
        await client.query(`UPDATE "User" SET email = $1, updated_date = CURRENT_TIMESTAMP WHERE id = $2`, [canonicalEmail, keepId]);
        await client.query(`UPDATE "UserProfile" SET user_email = $1, updated_date = CURRENT_TIMESTAMP WHERE user_email = $2`, [canonicalEmail, keepEmail]);
        // Also update related tables
        const relatedCols = [
          ['Message', 'sender_email'], ['Message', 'receiver_email'],
          ['BlockedUser', 'blocker_email'], ['BlockedUser', 'blocked_email'],
          ['UserSubscription', 'user_email'], ['UserSession', 'user_email'],
          ['Reel', 'user_email'], ['ProfileVideo', 'user_email'],
          ['VideoSignal', 'from_email'], ['VideoSignal', 'to_email'],
        ];
        for (const [table, col] of relatedCols) {
          await client.query(`UPDATE "${table}" SET "${col}" = $1 WHERE "${col}" = $2`, [canonicalEmail, keepEmail]);
        }
        console.log(`  Renamed "${keepEmail}" → "${canonicalEmail}"`);
      }
    }

    // ---- 7. Temporarily drop FK constraints to allow bulk email lowercase ----
    console.log('\nTemporarily dropping FK constraints for bulk email update...');
    const fkConstraints = [
      ['UserProfile', 'UserProfile_user_email_fkey', 'user_email', 'User', 'email'],
      ['UserSubscription', 'UserSubscription_user_email_fkey', 'user_email', 'User', 'email'],
      ['Message', 'Message_sender_email_fkey', 'sender_email', 'User', 'email'],
      ['Message', 'Message_receiver_email_fkey', 'receiver_email', 'User', 'email'],
      ['BlockedUser', 'BlockedUser_blocker_email_fkey', 'blocker_email', 'User', 'email'],
      ['BlockedUser', 'BlockedUser_blocked_email_fkey', 'blocked_email', 'User', 'email'],
      ['UserSession', 'UserSession_user_email_fkey', 'user_email', 'User', 'email'],
      ['Reel', 'Reel_user_email_fkey', 'user_email', 'User', 'email'],
      ['ProfileVideo', 'ProfileVideo_user_email_fkey', 'user_email', 'User', 'email'],
      ['VideoSignal', 'VideoSignal_from_email_fkey', 'from_email', 'User', 'email'],
      ['VideoSignal', 'VideoSignal_to_email_fkey', 'to_email', 'User', 'email'],
      ['BroadcastMessage', 'BroadcastMessage_from_email_fkey', 'from_email', 'User', 'email'],
    ];

    for (const [table, fk] of fkConstraints) {
      try { await client.query(`ALTER TABLE "${table}" DROP CONSTRAINT IF EXISTS "${fk}"`); } catch (_) {}
    }

    // ---- 8. Bulk lowercase all remaining emails ----
    console.log('Normalizing all remaining emails to lowercase...');
    await client.query(`UPDATE "User" SET email = lower(email), updated_date = CURRENT_TIMESTAMP WHERE email != lower(email)`);
    await client.query(`UPDATE "UserProfile" SET user_email = lower(user_email), updated_date = CURRENT_TIMESTAMP WHERE user_email != lower(user_email)`);
    await client.query(`UPDATE "UserSubscription" SET user_email = lower(user_email) WHERE user_email != lower(user_email)`);
    await client.query(`UPDATE "Message" SET sender_email = lower(sender_email) WHERE sender_email != lower(sender_email)`);
    await client.query(`UPDATE "Message" SET receiver_email = lower(receiver_email) WHERE receiver_email != lower(receiver_email)`);
    await client.query(`UPDATE "BlockedUser" SET blocker_email = lower(blocker_email) WHERE blocker_email != lower(blocker_email)`);
    await client.query(`UPDATE "BlockedUser" SET blocked_email = lower(blocked_email) WHERE blocked_email != lower(blocked_email)`);
    await client.query(`UPDATE "UserSession" SET user_email = lower(user_email) WHERE user_email != lower(user_email)`);
    await client.query(`UPDATE "Reel" SET user_email = lower(user_email) WHERE user_email != lower(user_email)`);
    await client.query(`UPDATE "ProfileVideo" SET user_email = lower(user_email) WHERE user_email != lower(user_email)`);
    await client.query(`UPDATE "VideoSignal" SET from_email = lower(from_email) WHERE from_email != lower(from_email)`);
    await client.query(`UPDATE "VideoSignal" SET to_email = lower(to_email) WHERE to_email != lower(to_email)`);
    await client.query(`UPDATE "BroadcastMessage" SET from_email = lower(from_email) WHERE from_email != lower(from_email)`);

    // OTP and reset token tables
    try { await client.query(`UPDATE "EmailVerificationOTP" SET email = lower(email) WHERE email != lower(email)`); } catch (_) {}
    try { await client.query(`UPDATE "PasswordResetToken" SET email = lower(email) WHERE email != lower(email)`); } catch (_) {}

    // ---- 9. Create case-insensitive unique indexes ----
    console.log('Creating case-insensitive unique indexes...');
    await client.query(`CREATE UNIQUE INDEX IF NOT EXISTS idx_user_email_lower ON "User" (lower(email))`);
    await client.query(`CREATE UNIQUE INDEX IF NOT EXISTS idx_userprofile_email_lower ON "UserProfile" (lower(user_email))`);

    // ---- 10. Re-add FK constraints ----
    console.log('Restoring FK constraints...');
    for (const [table, fk, col, refTable, refCol] of fkConstraints) {
      try {
        await client.query(`ALTER TABLE "${table}" ADD CONSTRAINT "${fk}" FOREIGN KEY ("${col}") REFERENCES "${refTable}"("${refCol}") ON DELETE CASCADE`);
      } catch (fkErr) {
        console.warn(`  ⚠️ Could not re-add FK ${fk}: ${fkErr.message}`);
      }
    }

    await client.query('COMMIT');
    console.log('\n✅ Migration complete! All emails are now lowercase with unique indexes in place.');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Migration failed (rolled back):', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

run();
