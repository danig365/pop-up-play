# Reels — Performance Audit & Baseline

Date: 2026-08-07
Purpose: same approach as the Map/Avatars audit — document current design problems and measured "before" numbers, so fixes can be verified against real numbers instead of guesswork.

## Current scale (measured, production DB + disk)

| Metric | Value |
|---|---|
| Total reels | 89 |
| Unique uploaders | 30 |
| Oldest / newest reel | 2026-03-12 / 2026-08-06 |
| Reel table query (`ORDER BY created_date DESC LIMIT 100`) | 0.224ms, Seq Scan — **not a bottleneck at this size**, correctly chosen by the planner |
| Total bytes of the 88 on-disk reel video files matched to DB rows | 2,756,313,416 bytes (**~2.63GB**) |
| Average reel video file size | **~29.87MB** |
| Largest single reel video | 207,163,975 bytes (**~197.6MB** — just under the 200MB upload cap) |
| Smallest reel video | 427,878 bytes (~418KB) |
| Total video files in uploads dir (Reels + ProfileVideo combined) | 187 files, ~4.89GB |

For comparison, TikTok/Instagram-style short-form video is typically 2–8MB for a similar-length clip after compression. The average reel here is **4–15x larger than it needs to be**, entirely because nothing compresses it.

## Live production measurement (real session: page load + swiping through 5 reels)

Captured with a live browser session against the production site (real auth, real data, viewport sized like a phone).

| Measurement | Result |
|---|---|
| Time until the first video is playable (`readyState >= 3`) | 416–469ms — fine on its own; the first reel happened to be a small file |
| Total wall-clock time for page load + swiping through 5 reels | ~8.0 seconds |
| Total non-video API bytes (reel list + profile lookups + view-count writes) | ~944KB–1.08MB, **dominated by a single 639,706-byte `UserProfile.filter({})` call** (see problem #4) |
| Total video bytes transferred across 5 swiped-to reels | **106.15MB across 14 HTTP requests for only 5 distinct video files** |
| **Duplicate/redundant fetching of the same file, observed directly** | See below — confirmed, not hypothetical |

### The "same file fetched multiple times" problem, quantified

Three of the five videos swiped to were fetched **nearly in full more than once**, within milliseconds of each other:

| File | Requests observed (each is a real HTTP range request) | Real file size | Bytes actually transferred | Wasted (duplicate) bytes |
|---|---|---|---|---|
| `...71f951df...mp4` | 19.82MB, 0.04MB, 19.60MB — 3 requests in 14ms | ~19.82MB | 39.46MB | ~19.6MB |
| `...4cbf6fcf...mov` | 13.93MB, 0.08MB, 13.83MB, 0.27MB, 13.71MB — 5 requests in 25ms | ~13.93MB | 41.82MB | ~27.9MB |
| `...3d3ae940...mp4` | 10.28MB, 0.03MB, 10.06MB — 3 requests in 137ms | ~10.28MB | 20.37MB | ~10.1MB |

That's **~57.6MB of the 106.15MB transferred in this one test — over half — was pure duplicate data**, the same video fetched two or three times back-to-back rather than once. This is the real substance behind the "14MB file fetched multiple times at overlapping byte ranges" observation noted in the original cross-feature triage; it wasn't a one-off, it reproduces on ordinary swiping and roughly doubles the real bandwidth cost on top of the files already being oversized.

**Likely root cause:** phone-camera video exports (particularly `.mov`) very commonly store their metadata atom (`moov`) at the *end* of the file rather than the beginning ("faststart" not applied). A browser asked to play such a file often has to make a first request to locate/read that trailing metadata, then a second pass from the beginning once it understands the stream — and depending on how much of the file the browser speculatively buffers on each pass, this can look exactly like "the same ~14–20MB fetched two or three times." This is fixed as a natural side effect of server-side transcoding (Phase 1 below) as long as the transcode step applies the standard `-movflags +faststart` (or equivalent) so metadata is always at the front of the output file — it isn't a separate bug to hunt down independently.

## Design problems identified (ranked by impact)

### 1. No server-side video compression/transcoding at all — the root cause of both the size problem AND the duplicate-fetch problem
`ReelUpload.jsx` uploads the raw, unmodified file straight from the user's device (phone camera `.mov`/`.mp4`, whatever resolution/bitrate/codec it was recorded at) via `multer` disk storage, capped only at 200MB by file size, with zero re-encoding step. This is the exact same class of problem as the original "500KB–5.5MB raw avatar used as a 48px pin" issue from the map audit — except the stakes are much larger here, since videos are inherently bigger and there's no equivalent of the thumbnailing pipeline at all for video. Confirmed live, this single issue is responsible for both: (a) files averaging ~30MB when they should be a few MB, and (b) the measured duplicate/redundant fetching below, where un-optimized files without "faststart" metadata placement get fetched two or three times by the browser. This explains almost the entire "Reels is slow" complaint by itself.

### 2. No poster/thumbnail frame for any reel
Confirmed: `Reel` table has no `thumbnail_url`-style column, and `ReelViewer.jsx`'s `<video>` tag has no `poster` attribute. Every reel shows a blank black rectangle until its video begins loading/playing. There's also no static preview available for places a reel might be referenced outside the main viewer (e.g. a "New Reel posted" notification).

### 3. Reels' own avatar overlay doesn't use the thumbnail pipeline that already exists
`ReelViewer.jsx` renders the poster's avatar via `profile?.avatar_url` — the **raw** original image — instead of `profile?.avatar_thumb_url`, which the map work already built, backfilled for existing profiles, and generates automatically on every new upload. This is a free win: confirmed live, a single reel's avatar overlay pulled down a **297KB raw photo** to display in a 48px circle, when the already-existing thumbnail would be ~1-2KB.

### 4. `UserProfile.filter({})` fetches the entire UserProfile table just to label reel authors
`Reels.jsx`'s `reelProfiles` query calls `base44.entities.UserProfile.filter({})` — an empty filter, meaning **every column of every profile in the database**, then filters down to the ~30 unique reel-uploader emails **client-side in JS**. Confirmed live: this one request alone was a **639,711-byte (625KB) payload** for a lookup that only needs `display_name`, `avatar_thumb_url`, `current_city`, `current_state` for ~30 people. This is the same "SELECT * overfetching" problem identified and fixed for the map's original activeUsers query, just unfixed here.

### 5. Full reel list + full profile table refetch every 30 seconds, unconditionally
`useQuery({ queryKey: ['reels'], ..., refetchInterval: 30000 })` refetches the entire reel list every 30 seconds regardless of whether the tab is visible or the user is actively watching, and since `reelProfiles`'s queryKey is `['reelProfiles', reels]`, every one of those refetches also re-triggers the full 625KB all-profiles fetch above. This compounds problem #4 into a recurring background cost rather than a one-time page-load cost.

### 6. No real pagination
`base44.entities.Reel.list()` defaults to (and the frontend never overrides) a flat `limit=100`. Fine today at 89 total reels, but there's no cursor/offset-based pagination or infinite scroll — once the reel count exceeds 100, older reels simply become unreachable through the normal feed rather than the app degrading gracefully. Worth building properly now rather than retrofitting later, matching how the map moved from "fetch everyone" to real viewport-bounded pagination.

### 7. No CDN / dedicated media host
Every byte of every video streams from the same Node/Express process that serves the entire app's API traffic (multer disk storage + `express.static`), with no CDN or separate media server in front. Not an urgent problem at 89 reels / 30 uploaders, but a real scaling concern — high concurrent Reels viewership would compete directly with API request handling on the same process. (Same "deferred, revisit at scale" category as the map's CDN recommendation.)

### 8. View-count increments are non-atomic and unbounced
`ReelViewer.jsx` computes the new view count client-side (`(reel.views || 0) + 1`) and sends the literal resulting number via `Reel.update()`, which the server writes as a plain `SET views = <value>`. Two viewers loading the same reel around the same time can both read the same starting count and both write the same result, silently losing an increment (last-write-wins on a stale read) — a correctness issue rather than a performance one, but easy to fix alongside (an atomic `SET views = views + 1` server-side would remove the race entirely and needs no client-side read first).

### 9. No preloading of the next reel
`Reels.jsx` uses `AnimatePresence mode="wait"` keyed on `currentIndex`, so the current `<video>` element fully unmounts and a brand-new one mounts on every swipe — nothing primes the next reel's video in the background while the current one is playing. Every swipe pays a full cold-start load. (This is the video equivalent of the map's avatar-preloading fix — buffered/adjacent content isn't warmed ahead of time.)

### 10. Minor data quality: `duration` is sometimes NULL
Several real rows have an empty `duration` column (confirmed via live query). `ReelUpload.jsx` waits on `video.onloadedmetadata` before reading `video.duration`, but this can still end up `NaN`/unset for certain files/codecs the browser can't probe client-side. Not a performance issue, but worth tightening alongside the other upload-path work (e.g. compute duration server-side during transcoding instead of trusting the browser).

## What's already fine (confirmed via live measurement / EXPLAIN ANALYZE — not re-touching)

- **Byte-range streaming is already correctly implemented.** `express.static` on `/api/uploads` is configured with `acceptRanges: true` and explicit `Accept-Ranges: bytes` headers for video extensions; confirmed live with a real `206 Partial Content` response and a correct `Content-Range` header. The mechanics of how videos are *served* are correct — the problem is purely how large the files are, not how they're streamed.
- **Cache headers are already sensible**: `Cache-Control: public, max-age=604800` (7 days) on video files, matching the map's earlier "cache headers already correct" finding.
- **The `Reel` table itself is not a database bottleneck** at current scale — 0.224ms for the full sorted listing query, appropriately using a sequential scan + quicksort over only 89 rows (the existing `idx_reel_created_date` index isn't needed yet, same story as the map's `is_popped_up` index before real selectivity existed).
- ~~No repeated/overlapping byte-range refetching observed~~ — **correction**: a longer, real multi-swipe session (below) did reproduce this, confirming and quantifying the original cross-feature triage note. Moved to the design problems list below with real numbers.

## Fix priority (mirroring the map's phased approach)

1. **Server-side video transcoding/compression on upload** — by far the biggest win; this is the direct equivalent of the map's Phase 3 avatar-thumbnailing work, sized for video instead of images.
2. **Generate and store a poster/thumbnail frame per reel** (new `thumbnail_url` column) — wire it into `<video poster>` and anywhere reels are referenced outside the main viewer.
3. **Switch the Reels avatar overlay to `avatar_thumb_url`** — trivial, no backend change needed, the pipeline already exists.
4. **Replace `UserProfile.filter({})` with a properly scoped, server-filtered lookup** for just the reel authors' emails (either extend the filter endpoint to accept an email list, or add a small purpose-built endpoint, matching the map's `/api/map/nearby-profiles` pattern).
5. **Add real pagination/infinite scroll**, and make the 30s refetch conditional on tab visibility (or drop it in favor of invalidating on actual mutations, e.g. after a new upload).
6. **Preload the next reel's video** in the background while the current one plays.
7. **Make view-count increments atomic server-side** (`SET views = views + 1`), removing the read-then-write race.
8. **CDN / dedicated media host** — deferred, revisit once concurrent Reels usage grows enough to compete meaningfully with API traffic on the same process.

## Rollout safety

Same posture as the map work: this is live production data (89 real reels from 30 real uploaders) and a live backup should be verified fresh before any code affecting stored data or files begins. Video transcoding in particular should be additive-first (store a new, separate compressed/derived file and thumbnail, leave the original upload untouched) exactly like the avatar thumbnailing approach — never overwrite or delete an original video file in place.

## Results after implementation (2026-08-07)

All 5 phases shipped and verified live. All 89/89 reels now have `compressed_video_url` + `thumbnail_url` populated (85 backfilled via `backfill-reel-transcode.js`, 0 failed; 4 picked up automatically by the sweep job during earlier redeploys). Original video files were never touched or deleted — every number below is the new derived file living alongside the untouched original.

### Storage / file size (full dataset, all 89 reels, measured on-disk)

| Metric | Before | After | Change |
|---|---|---|---|
| Total video bytes (all reels) | 2,767,368,430 (~2.64GB) | 522,984,401 (~498.8MB) | **-81.1%** |
| Average file size | ~29.65MB | ~5.60MB | **-81.1%** |
| `duration` NULL rows | several (unquantified) | **0** | fixed for free via `ffprobe` |
| Poster/thumbnail frames | 0 | 89 (4.1MB total, ~46KB avg) | new |

### Live duplicate-fetch bug (the "same file fetched 2-3x" problem)

Re-ran the identical live 5-swipe test methodology against the now-fully-backfilled production site:

| Measurement | Before | After |
|---|---|---|
| Video requests for a 5-swipe session | 14 requests for 5 distinct files | **7 requests for 7 distinct files** (includes 1 next-reel preload) |
| Duplicate/redundant re-fetching of the same file | **~57.6MB (54%) wasted**, 3 of 5 files fetched 2-3x each | **zero** — every file fetched exactly once, each a single clean `206` covering the full range (e.g. `bytes 0-8062313/8062314`) |
| Total video bytes for the session | 106.15MB | 27.91MB |

The faststart fix (`-movflags +faststart` in the transcode step) fully eliminated the duplicate-fetch pattern — confirmed directly, not inferred.

### Other measured fixes

| Metric | Before | After | Change |
|---|---|---|---|
| `reelProfiles` lookup payload | 639,706 bytes (`UserProfile.filter({})`, all columns, all users) | 8,513 bytes (`/api/reels/author-profiles`, trimmed columns, ~30 authors) | **-98.7%** |
| Reels avatar overlay image | up to 297KB raw photo | ~1-2KB `avatar_thumb_url` (confirmed: 96px `.webp` thumbnail) | ~99% |
| Background polling while idle | full reel list + full profile table refetch every 30s unconditionally | none (React Query default: refetch on focus/reconnect + explicit invalidation on upload) | eliminated |
| View-count increments | client-computed `reel.views + 1` via generic `PUT`, racy | atomic `SET views = views + 1 RETURNING views` via dedicated endpoint | race eliminated (verified: two rapid calls → 34→35→36, no lost update) |
| Next-reel preloading | none — every swipe is a cold start | hidden off-screen `<video preload="auto">` for `reels[currentIndex+1]`, confirmed reaching `readyState 4` alongside the active video | new |

### Net effect

A 5-swipe session that used to transfer ~107MB (106.15MB video + ~1MB API) now transfers **under 28MB video + ~9KB API** — roughly a **4x reduction in total bytes for the same user action**, with the single biggest contributor (duplicate fetching) eliminated entirely rather than just reduced.

## Follow-up: original files deleted after validation (2026-08-07, same day)

The rollout above deliberately kept every original raw video alongside its compressed copy, as a safety net while the pipeline was still unproven. Once all 89 compressed outputs were confirmed valid and playing correctly in production, the originals were deleted to reclaim disk space — bringing `/app/uploads` from **7.4GB down to 5.0GB**. `video_url` now points directly at the compressed file for every reel (no separate "original" reference remains). Going forward, every new upload's original is now deleted automatically once its compressed version is validated, so this doesn't re-accumulate over time.

**Bug found and fixed during the pre-deletion validation pass:** 4 of the 89 compressed files (from 3 underlying source videos) turned out to be corrupt — valid file size but zero decodable video/audio streams (`ffprobe` reported `nb_streams=0`). Root cause: the one-time backfill script and the app's own background sweep job both independently picked up the same not-yet-transcoded row and ran `ffmpeg` against the identical temp filename at the same time, corrupting the output (their concurrency guards only protected each process from itself, not from each other). This was caught by validating every compressed file against the originals *before* deleting anything — exactly the reason the originals were kept as a safety net in the first place. Fixed by:
- Re-transcoding the 3 affected videos from their still-intact originals (confirmed valid: real streams, correct duration, plays cleanly live).
- Adding an atomic database-level claim (`UPDATE ... WHERE compressed_video_url IS NULL`) so two processes can never transcode the same reel at once again, plus a hard validation gate (`ffprobe` must confirm real streams + duration before a compressed file is ever marked "ready") — both now live in `transcodeReel()` in server.js.

No reel was affected in the final result — all 89 were re-verified valid after the fix, before any original was deleted.
