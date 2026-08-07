// One-time backfill: generate/regenerate avatar_thumb_url for existing self-hosted avatars.
// Run inside the app container: node backfill-avatar-thumbnails.js
// Regenerates ALL matching profiles (not just ones missing a thumbnail) so that
// a later fix to the thumbnail pipeline (e.g. EXIF auto-rotation) can be re-applied
// to thumbnails that were already generated before the fix.
import { Pool } from 'pg';
import sharp from 'sharp';
import path from 'path';
import fs from 'fs';

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'postgres',
  port: parseInt(process.env.DB_PORT, 10) || 5432,
  database: process.env.DB_NAME || 'popup_play_db',
  password: process.env.DB_PASSWORD,
});

const uploadsDir = path.join(process.cwd(), 'uploads');
const AVATAR_THUMB_SIZE = 96;

async function main() {
  const { rows } = await pool.query(
    `SELECT id, avatar_url FROM "UserProfile" WHERE avatar_url LIKE '%/api/uploads/%'`
  );
  console.log(`Found ${rows.length} profiles with a self-hosted avatar to (re)generate a thumbnail for.`);

  let success = 0, skipped = 0, failed = 0;

  for (const row of rows) {
    try {
      const filename = row.avatar_url.split('/api/uploads/')[1];
      if (!filename) { skipped++; continue; }
      const sourcePath = path.join(uploadsDir, filename);
      if (!fs.existsSync(sourcePath)) { skipped++; continue; }

      const thumbFilename = `thumb_${filename.replace(/\.[^.]+$/, '')}.webp`;
      const thumbPath = path.join(uploadsDir, thumbFilename);

      await sharp(sourcePath)
        .rotate()
        .resize(AVATAR_THUMB_SIZE, AVATAR_THUMB_SIZE, { fit: 'cover' })
        .webp({ quality: 80 })
        .toFile(thumbPath);

      await pool.query(`UPDATE "UserProfile" SET avatar_thumb_url = $1 WHERE id = $2`, [`/api/uploads/${thumbFilename}`, row.id]);
      success++;
    } catch (err) {
      console.error(`❌ Failed for profile ${row.id}:`, err.message);
      failed++;
    }
  }

  console.log(`Done. success=${success} skipped=${skipped} failed=${failed}`);
  await pool.end();
}

main().catch(err => { console.error('Fatal:', err.message); process.exit(1); });
