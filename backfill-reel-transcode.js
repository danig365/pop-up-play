// One-time backfill: generate compressed_video_url + thumbnail_url for
// existing reels uploaded before the transcoding pipeline existed.
// Run inside the app container: node backfill-reel-transcode.js
//
// Re-runnable: only processes rows where compressed_video_url IS NULL, so a
// partial/interrupted run can simply be restarted. Original video_url files
// are never touched or deleted — only new compressed_/poster_ files are
// written and the two new columns updated.
import { Pool } from 'pg';
import path from 'path';
import fs from 'fs';
import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'postgres',
  port: parseInt(process.env.DB_PORT, 10) || 5432,
  database: process.env.DB_NAME || 'popup_play_db',
  password: process.env.DB_PASSWORD,
});

const uploadsDir = path.join(process.cwd(), 'uploads');

async function transcodeOne(reel) {
  const filename = reel.video_url.split('/api/uploads/')[1];
  if (!filename) throw new Error('video_url has no /api/uploads/ path');
  const sourcePath = path.join(uploadsDir, filename);
  if (!fs.existsSync(sourcePath)) throw new Error(`source file missing: ${filename}`);

  const baseName = filename.replace(/\.[^.]+$/, '');
  const posterFilename = `poster_${baseName}.jpg`;
  const posterTmpPath = path.join(uploadsDir, `.tmp_${posterFilename}`);
  const posterFinalPath = path.join(uploadsDir, posterFilename);
  const videoFilename = `compressed_${baseName}.mp4`;
  const videoTmpPath = path.join(uploadsDir, `.tmp_${videoFilename}`);
  const videoFinalPath = path.join(uploadsDir, videoFilename);

  try {
    try {
      await execFileAsync('ffmpeg', [
        '-y', '-ss', '1', '-i', sourcePath,
        '-frames:v', '1', '-q:v', '2', '-vf', "scale='min(720,iw)':-2",
        posterTmpPath
      ], { timeout: 60_000 });
    } catch {
      await execFileAsync('ffmpeg', [
        '-y', '-ss', '0', '-i', sourcePath,
        '-frames:v', '1', '-q:v', '2', '-vf', "scale='min(720,iw)':-2",
        posterTmpPath
      ], { timeout: 60_000 });
    }
    fs.renameSync(posterTmpPath, posterFinalPath);
    await pool.query(`UPDATE "Reel" SET thumbnail_url = $1 WHERE id = $2`, [`/api/uploads/${posterFilename}`, reel.id]);

    await execFileAsync('nice', [
      '-n', '19', 'ffmpeg', '-y', '-i', sourcePath,
      '-vf', "scale='min(1080,iw)':'min(1920,ih)':force_original_aspect_ratio=decrease",
      '-c:v', 'libx264', '-preset', 'medium', '-crf', '23',
      '-maxrate', '2500k', '-bufsize', '5000k', '-pix_fmt', 'yuv420p',
      '-c:a', 'aac', '-b:a', '128k',
      '-movflags', '+faststart',
      videoTmpPath
    ], { timeout: 10 * 60_000, maxBuffer: 10 * 1024 * 1024 });
    fs.renameSync(videoTmpPath, videoFinalPath);

    let duration = null;
    try {
      const { stdout } = await execFileAsync('ffprobe', [
        '-v', 'error', '-show_entries', 'format=duration',
        '-of', 'default=noprint_wrappers=1:nokey=1', videoFinalPath
      ], { timeout: 30_000 });
      const parsed = Math.round(parseFloat(stdout));
      if (Number.isFinite(parsed)) duration = parsed;
    } catch {}

    const compressedUrl = `/api/uploads/${videoFilename}`;
    if (duration != null) {
      await pool.query(`UPDATE "Reel" SET compressed_video_url = $1, duration = $2 WHERE id = $3`, [compressedUrl, duration, reel.id]);
    } else {
      await pool.query(`UPDATE "Reel" SET compressed_video_url = $1 WHERE id = $2`, [compressedUrl, reel.id]);
    }

    const originalSize = fs.statSync(sourcePath).size;
    const compressedSize = fs.statSync(videoFinalPath).size;
    return { originalSize, compressedSize };
  } catch (err) {
    for (const tmp of [videoTmpPath, posterTmpPath]) {
      try { if (fs.existsSync(tmp)) fs.unlinkSync(tmp); } catch {}
    }
    throw err;
  }
}

async function main() {
  const { rows } = await pool.query(
    `SELECT id, video_url FROM "Reel" WHERE compressed_video_url IS NULL AND video_url LIKE '%/api/uploads/%' ORDER BY created_date ASC`
  );
  console.log(`Found ${rows.length} reels to transcode.\n`);

  let success = 0, skipped = 0, failed = 0;
  const startTime = Date.now();

  for (let i = 0; i < rows.length; i++) {
    const reel = rows[i];
    const itemStart = Date.now();
    process.stdout.write(`[${i + 1}/${rows.length}] transcoding ${reel.id}... `);
    try {
      const { originalSize, compressedSize } = await transcodeOne(reel);
      const pct = ((1 - compressedSize / originalSize) * 100).toFixed(1);
      const elapsedSec = ((Date.now() - itemStart) / 1000).toFixed(1);
      console.log(`done in ${elapsedSec}s, ${(originalSize / 1024 / 1024).toFixed(1)}MB -> ${(compressedSize / 1024 / 1024).toFixed(1)}MB (-${pct}%)`);
      success++;
    } catch (err) {
      console.log(`FAILED: ${err.message}`);
      failed++;
    }

    const avgSec = (Date.now() - startTime) / 1000 / (i + 1);
    const remaining = rows.length - (i + 1);
    console.log(`   progress: ${success} ok, ${failed} failed, ${skipped} skipped — est. ${Math.round(avgSec * remaining / 60)} min remaining`);
  }

  console.log(`\nDone. success=${success} skipped=${skipped} failed=${failed}, total time ${((Date.now() - startTime) / 60000).toFixed(1)} min`);
  await pool.end();
}

main().catch(err => { console.error('Fatal:', err.message); process.exit(1); });
