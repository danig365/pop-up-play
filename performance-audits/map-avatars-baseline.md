# Map / Profile Avatars — Performance Audit & Baseline

Date: 2026-08-06
Purpose: document current design problems and measured "before" numbers so post-fix improvements can be verified against a real baseline, not guesswork.

## Current scale (measured, production DB)

| Metric | Value |
|---|---|
| Total UserProfile rows | 676 |
| Currently `is_popped_up = true` | 349 |
| Of those, inactive 7+ days or never active | **323 (92.5%)** |
| Avg photos per popped-up profile | ~2.1 |
| Max photos on a single profile | 9 |

## Measured baseline numbers (before any fix)

| Measurement | Result |
|---|---|
| DB query plan for `WHERE is_popped_up = true` | **Sequential scan** (no index exists on `is_popped_up`) |
| DB execution time at 676 rows | 0.626 ms |
| Real end-to-end API response time (`POST /api/entities/UserProfile/filter`, 5 runs) | 23–43 ms |
| Real JSON payload size for 349 popped-up profiles | **332 KB** (340,005 bytes), every 30s, per logged-in client |
| Sample avatar file sizes on disk | 500 KB – 5.5 MB (raw, unresized uploads) |
| Total uploads directory size | 6.9 GB |
| Index on `latitude`/`longitude` | **None** |
| Marker clustering library | **None installed** |
| `React.memo` on marker component | **Not used** — icon HTML rebuilt from scratch every render |
| Bounding-box query filtering | **None** — fetches every popped-up row nationwide regardless of visible map area |
| Auto-expiry of `is_popped_up` | **Explicitly disabled** (`server.js`: "Auto pop-down is disabled. Users stay popped up until they choose to pop down.") |
| HTTP/2 | ✅ Already enabled (nginx reverse proxy) — not a bottleneck |
| HTTP cache headers on avatar images | ✅ Already set (`Cache-Control: max-age=604800` + ETag) — not a bottleneck |
| Per-marker hover cost (`guardAction`) | ✅ Cheap, no network call — not a bottleneck |

## Live production measurement (real browser, real network, popupplay.fun)

Measured by actually loading the live site in a headless browser and capturing real network traffic — not estimates.

| Measurement | Result |
|---|---|
| Home page networkidle time | 2.2 s (the page shell itself loads fine) |
| "Members Popped Up on the Map" counter | **349** — confirms the full nationwide dataset is fetched regardless of the visible map area (this session's map defaulted to the NY/NJ area since headless Chrome has no geolocation permission — irrelevant to the finding, since the count is identical either way) |
| Markers actually placed in the DOM on initial load | 31 |
| **Avatar image bytes downloaded in that single page load** | **35.09 MB, for only 26 avatar images** — average ~1.35 MB per avatar |
| Single largest avatar observed | **3.26 MB** for one profile photo used as a 48px map pin |
| Reels page networkidle time | **>30 s — hit the measurement timeout without ever reaching idle** |
| Reels page media requests observed | A single reel's `.mov` file (14 MB) was requested **multiple times** at overlapping large byte ranges — consistent with the browser repeatedly re-fetching large chunks of an unoptimized, non-web-streaming-friendly video format rather than playing it efficiently |

This is materially worse than the earlier estimates: with real avatar files running 1–3+ MB each, a normal browsing session (panning past more than the initial ~26-31 markers) will pull down tens of megabytes just for pins on a map, before any other content loads. The Reels page timeout is a very concrete, reproducible confirmation that a single unoptimized video file is enough to prevent the page from ever settling.

*(Note: per-request timing in this pass had a measurement bug — reported durations are unreliable and are not included above. Byte sizes and whole-page timing, which are what matters most here, are accurate and reproducible.)*

## Design problems identified (ranked by severity at scale)

### 1. No expiry on `is_popped_up` — the root data-hygiene problem
Auto pop-down was deliberately disabled. Once a user pops up, they stay "active on the map" **forever** unless they manually toggle off. Right now this already means 92.5% of "active" markers belong to people who haven't opened the app in a week or more, or never came back after their first pop-up.

This is not just a trust/accuracy issue — it's the root cause that inflates every downstream cost. The marker/avatar dataset size doesn't track *real concurrent activity*, it tracks **cumulative historical signups**. At scale, a platform with 500,000 total signups over its lifetime could have tens of thousands of "ghost" markers rendering and fetching avatars, even with only a few hundred people genuinely online. Every other fix below (indexing, thumbnailing, clustering) is treating a symptom unless this is fixed too — this is the one thing that makes the dataset grow unboundedly over time independent of organic active-user growth.

### 2. No image thumbnailing — confirmed root cause of "slow avatar loading"
Raw uploaded photos (500 KB – 5.5 MB observed) are served as-is and displayed at 48×48px map pins. At 349 concurrent markers this is already a meaningfully heavy load; at thousands of markers it becomes untenable. No `sharp`/image-processing library exists anywhere in the stack.

### 3. No bounding-box filtering — architecturally wrong, compounds with scale
Every client fetches *every* popped-up profile nationwide/worldwide every 30 seconds, regardless of what's visible on their screen. Today that's 332 KB per poll per client; with real growth (and without fix #1) this scales linearly with total ghost+real popped-up count, multiplied by every concurrent user polling independently. There's no pan/zoom-triggered refetch at all — just a flat unconditional timer.

### 4. `SELECT *` overfetching
The query returns every column — full `bio`, `interests`, `hobbies`, `photos[]`, `videos[]` — none of which the map needs (it only needs id, name, avatar, lat/lng, popup message). This inflates the 332 KB payload well beyond what map rendering actually requires.

### 5. Missing indexes
No index on `is_popped_up` (confirmed sequential scan) and no index on `latitude`/`longitude`. This is survivable today at 676 rows but is a hard prerequisite before adding bounding-box queries — without a spatial or composite lat/lng index, a bounding-box `WHERE` clause would *also* degrade to a sequential scan at scale.

### 6. No marker memoization + O(n×m) per-render cost
`getUsersWithLocation()` (`CityMap.jsx`) runs unmemoized on every render — recomputing privacy-jitter trigonometry for every marker any time *any* prop changes (e.g., an unrelated unread-message update). Worse, the unread-count lookup for each marker (`unreadMessages.filter(m => m.sender_email === profile.user_email)`) is a nested loop — O(markers × unread messages) — recalculated every render. `UserMarker` itself isn't wrapped in `React.memo`, and its Leaflet icon HTML string is rebuilt from scratch every render rather than once.

### 7. No marker clustering
Every popped-up profile gets its own individual DOM marker. Not urgent at 349, but becomes **mandatory** (not optional) once ghost-entry cleanup is in place and the platform grows — rendering thousands of individual DOM nodes with images will make the map unusable/crash-prone well before that scale is reached.

### 8. No CDN
Avatars are served from the app's own server (`popupplay.fun/api/uploads/...`), not an edge network. Cache headers are already correctly set, so repeat views are fine — but cold cache / first load / geographically distant users get no benefit.

## What's already fine (confirmed, not re-touching)
- HTTP/2 is active via nginx — connection multiplexing isn't a problem.
- HTTP cache headers (`max-age=604800`, ETag) are already correctly configured.
- The per-marker hover/paywall check (`guardAction`) is cheap and makes no network call.

## Database handling — additional findings

### 9. No connection pool size configured
`server.js` builds the `pg` `Pool` with only `user`/`host`/`port`/`database`/`password` — no `max` is set, so it silently falls back to the library default of **10 concurrent connections**. Every client polling the map every 30 seconds is a DB-bound request; under real concurrent load (many users online at once, each polling independently, plus every other endpoint sharing the same pool) this becomes a queueing point once concurrent in-flight queries exceed 10 — requests start waiting for a free connection rather than failing outright, which shows up as intermittent slowness that's hard to diagnose from the frontend. Needs an explicit `max` sized to expected concurrency, and ideally query volume should drop anyway once bounding-box fetching (below) replaces "fetch everything, every 30s, from every client."

### 10. PostGIS is not installed — and isn't even available on the current image
Checked directly: `postgres:16-alpine` (the image this app runs) does not ship the PostGIS extension at all — `pg_available_extensions` returns zero rows for it. Real geospatial indexing (`GiST` + `ST_DWithin` for true radius queries) would require switching to a PostGIS-enabled image (e.g. `postgis/postgis:16-3.4`), which is an **infrastructure change**, not just a code change — needs a Docker image swap, a `geography`/`geometry` column added and backfilled from the existing `latitude`/`longitude` columns, and verification that nothing else in the stack assumes plain `postgres:16-alpine`.

This is not needed yet. At current and realistically-near-term scale, a plain composite B-tree index on `(latitude, longitude)` supporting a rectangular bounding-box `WHERE` clause is enough, costs nothing infrastructure-wise, and directly unblocks fix #5 below. PostGIS becomes worth the migration cost later if the platform reaches a scale where true circular radius queries or very large row counts make a plain B-tree bounding box insufficient — not before.

### 11. A reusable server-side Haversine function already exists
`calculateDistanceMiles()` is already defined in `server.js` (used today for the "notify nearby users on pop-up" and event-radius features) but is **not used anywhere in the map's marker-fetch endpoint** — confirming again that the map query does zero distance filtering today. Reusing this existing function for bounding-box/radius filtering is less work than writing new distance logic from scratch.

## Client-suggested techniques — what applies here

The client sent detailed suggestions (MapLibre GL JS + PostGIS, and two caching/optimization lists). Most of the caching-list items are the same ones already in the "Design problems" and "Fix priority" sections above (bounding-box fetch, clustering, thumbnailing, CDN, indexes, debounce, lazy loading, fewer re-renders) — cross-referenced here rather than duplicated, plus the few genuinely new refinements they add:

- **MapLibre GL JS (replace Leaflet)** — technically valid, but I'd defer this. MapLibre's real performance advantage over Leaflet only shows up when markers are rendered as GL-native data-driven layers (a GeoJSON source painted via WebGL) — not when using MapLibre's own `Marker` class with custom HTML content, which has the *same* one-DOM-node-per-marker ceiling Leaflet has today. Since this app's markers are custom avatar images with hover popups and click-to-profile behavior (not just simple pins), adopting MapLibre without also rebuilding marker rendering as GL-native layers would cost real migration effort for close to zero performance gain. Leaflet with clustering handles tens of thousands of markers fine in production elsewhere — well beyond where this platform is or will soon be. **Recommendation: revisit only if marker counts regularly exceed the low thousands even after clustering is in place.**
- **PostGIS** — see finding #10 above: valid long-term, not needed yet, real infra cost when it is.
- **Specific thumbnail size/format targets** — new, concrete detail to fold into fix #2: generate **WebP** (not just resized JPEG) at roughly 64×64 (~10–20KB) for map pins, targeting a similar order of magnitude to what the client cited (32px→5-10KB, 64px→10-20KB, 96px→20-30KB).
- **Placeholder avatar that fades in once loaded** — new, cheap addition: show the existing default silhouette immediately, fade the real avatar in on load instead of leaving a blank/loading pin. Frontend-only, pairs naturally with fix #2.
- **Preload a buffer zone (N/S/E/W) around the current viewport** — refinement to fix #5: the bounding-box query should pad the actual visible bounds by a margin, not fetch only the exact visible rectangle, so a small pan doesn't trigger a visible pop-in.
- **Load closest markers' avatars first, rest progressively** — refinement to fix #2/#5: when a batch of markers loads, prioritize avatar loading by proximity to the user rather than firing all requests simultaneously.
- **Explicit debounce on pan/zoom before refetching** — already implied by fix #5, now made explicit: debounce map-move events (e.g. ~300-500ms after the user stops moving) before firing the bounding-box query, so continuous panning doesn't spam the API.

## Fix priority for maximum real-world impact
1. **Auto-expire stale pop-ups** (fixes the root data-hygiene problem — shrinks every downstream cost automatically)
2. **Avatar thumbnailing** — WebP, ~64×64 for map pins, plus placeholder-then-fade-in on the frontend
3. **Marker memoization + trim `SELECT *` to only needed columns**
4. **Add composite index on `(latitude, longitude)` + explicit pool `max`** — prerequisite for #5, no infra change needed
5. **Bounding-box fetch with a buffer margin + debounced refetch on pan/zoom** (reusing the existing server-side Haversine function), loading closest markers first
6. **Marker clustering**
7. **CDN** (lower priority given cache headers already help; matters most for cold/first loads and geographic distribution)

**Deferred, not needed yet:** PostGIS migration, MapLibre GL JS migration — both revisited only if scale genuinely outgrows the above.

---

## Implementation progress

### Phase 1 — DB indexes + pool sizing — ✅ shipped and verified
- `idx_userprofile_popped_up` (partial) and `idx_userprofile_lat_lng` (composite) both confirmed present via `\di`.
- Bounding-box style query (`latitude BETWEEN ... AND longitude BETWEEN ...`) confirmed using `Bitmap Index Scan on idx_userprofile_lat_lng` — ready for Phase 4.
- Low-selectivity query (`is_popped_up = true AND last_active > NOW() - INTERVAL '2 hours'`, simulating the post-Phase-2 state) confirmed using an index scan, not a sequential scan.
- `WHERE is_popped_up = true` alone still shows `Seq Scan` today — correct, expected planner behavior at ~51% table selectivity (349/676), not a defect. Will increasingly favor the index as the real "popped up" population shrinks relative to total registered users going forward.
- Pool `max` explicitly set (previously unset, silently defaulting to the `pg` library's default of 10).

### Phase 2 — Auto-expire stale pop-ups — ✅ shipped and verified
- Startup cleanup + 15-minute recurring interval added, reusing the existing `last_active` heartbeat (no new tracking built).
- **Real result on deploy: popped-up count dropped from 349 to 3, instantly.** (346 stale entries cleaned up — slightly more than the 323 measured at the 7-day threshold, since the shipped 2-hour threshold is stricter.)
- Confirmed 0 stale entries remain; the 3 remaining were all active within the prior 25 minutes.

### Phase 3 — Avatar thumbnailing — ✅ shipped and verified
- `sharp` added, `avatar_thumb_url` column added, hooked into the existing generic `UserProfile` update handler (fires only when `avatar_url` changes and points to our own `/api/uploads/` path — Google-hosted avatars skipped, already pre-sized via Google's own `=s96-c` suffix).
- Live end-to-end test: updating a real profile's avatar triggered thumbnail generation automatically — **507 KB → 2.99 KB (a ~170x reduction)** for that file, correctly served over HTTP (200, 2986 bytes).
- One-time backfill run against production: 250 profiles had a self-hosted avatar, **249 backfilled successfully**, 1 skipped (a pre-existing orphaned `avatar_url` pointing to a file no longer on disk — unrelated pre-existing data issue, not caused by this work).
- `UserMarker.jsx` updated to prefer `avatar_thumb_url`, falling back to `avatar_url` then the default silhouette — covers brand-new uploads (before their thumbnail finishes), Google avatars, and any edge case gracefully.
- **A live full-page "avatar bytes for the map" re-measurement is no longer meaningfully reproducible** — with only 3 users genuinely popped up post-Phase-2 (down from 349), there usually aren't enough real markers on screen at once for a fair comparison. This is the intended outcome, not a measurement gap: Phase 2 already resolved the bulk of the problem at its root, and Phase 3 ensures whatever markers *do* appear going forward use a ~170x-smaller image instead of a multi-MB original.

### Phase 4 — New map-specific endpoint (trimmed columns + bounding box) — ✅ shipped and verified
- New `GET /api/map/nearby-profiles` endpoint (optional `minLat`/`maxLat`/`minLng`/`maxLng`), returning only 12 needed columns instead of `SELECT *`, with an unbounded fallback for the initial load before the map has real bounds yet.
- No-bounds fetch of all 3 currently popped-up users: **1,400 bytes** (vs. 340,005 bytes for the old full-column fetch at 349 rows pre-Phase-2 — the improvement compounds both fewer rows *and* fewer columns per row).
- Bounding box targeting a specific real user's coordinates correctly isolated exactly that one user; an empty-region bounding box correctly returned `[]` (2 bytes).
- `EXPLAIN ANALYZE` on the exact bounding-box query confirms `Index Scan using idx_userprofile_popped_up` — Phase 2's cleanup made Phase 1's partial index immediately effective for this real query shape (is_popped_up=true now matches only 3 of 676 rows, a highly selective condition the planner correctly chose to use an index for).

### Phase 5 — Frontend bounding-box refetch, memoization, buffer + debounce — ✅ shipped and verified
- `Home.jsx`: split into two queries — a bounds-scoped one (feeds the actual rendered markers) and a separate lightweight unbounded one purely for the "Members Popped Up on the Map" total count badge, so that number stays a true global stat rather than being affected by viewport scoping.
- `CityMap.jsx`: new `MapBoundsWatcher` (via react-leaflet's `useMapEvents`) reports padded (25% buffer) bounds up on mount and on debounced (400ms) `moveend`; `getUsersWithLocation` memoized with `useMemo`; the previous O(markers × unread messages) per-render `.filter()` replaced with a single pre-computed `Map` lookup.
- `UserMarker.jsx`: wrapped in `React.memo`; Leaflet icon HTML memoized so it's no longer rebuilt from scratch on every render.
- Live browser test against the deployed site confirmed all of the above working together: badge correctly showed the true total (3) independent of viewport; initial load fired the new endpoint with real computed bounds; a simulated map pan produced exactly **one** new debounced fetch with updated bounds (not a flood of requests during the drag); no new console errors introduced.

### Phase 6 — Marker clustering — ✅ shipped and verified
- Added `react-leaflet-cluster` wrapping the marker list in `CityMap.jsx` (`maxClusterRadius={60}`, `disableClusteringAtZoom={13}` matching `MAX_SAFE_MAP_ZOOM`, `chunkedLoading` for large marker counts, cluster-coverage-on-hover disabled).
- **False-alarm investigation, documented for future debugging**: initial live testing (6 real-but-inactive profiles temporarily flagged `is_popped_up=true` with test coordinates to get a visible cluster) showed **zero markers rendering at all** — not even individually. Isolated by removing the `MarkerClusterGroup` wrapper entirely and re-testing: markers were *still* zero, proving `react-leaflet-cluster` was never the cause. Root cause: `Home.jsx` has a pre-existing "Filter By Gender" control that defaults to `genderFilter = 'female'` (unrelated to any phase of this work), and none of the test profiles (nor, at the time, any of the 3 real active users) had `gender = 'female'`, so `filteredActiveUsers` was legitimately empty. Re-tested with the filter set to "All genders" — clustering rendered correctly (a single cluster bubble showing the correct count over the clustered test coordinates; clicking it zoomed in and correctly expanded into individual custom-avatar markers). **Lesson for future map testing: always check/set the gender filter to "All genders" first, or seed test data with a gender that matches the currently-selected filter.**
- The 6 temporarily-modified test profiles were reverted immediately after verification (`is_popped_up=false`, `latitude`/`longitude`/`popup_message` back to `NULL`, `last_active` restored to its pre-test value for the 2 profiles that had one) — confirmed against the pre-test backup (`popup_play_complete_backup_20260806_040842.zip`), all 6 originally had `NULL` lat/lng, so this was a clean revert with nothing to reconstruct. Post-revert active count confirmed back to 3.

### Phase 7 — Placeholder + fade-in avatars — ✅ shipped and verified
- `UserMarker.jsx`: the map pin's silhouette placeholder is now the container's `background-image` (always present immediately, no network dependency), with the real avatar `<img>` layered on top starting at `opacity: 0` and transitioning to `opacity: 1` on `onload` (250ms ease-out) — so the pin never shows a blank/empty circle while the image is in flight, and there's no layout shift when it arrives. `onerror` falls back to the same placeholder SVG.
- Verified live: temporarily popped up one existing inactive profile with a real backfilled `avatar_thumb_url` at NYC coordinates, confirmed the rendered marker HTML contains the placeholder as `background-image` plus the real `<img>` with the opacity-transition inline style, and that computed `opacity` reached `1` once loaded. No console errors. Reverted immediately after (`is_popped_up=false`, `latitude`/`longitude`/`last_active` back to `NULL`) — this profile had no prior popped-up state or coordinates, so the revert is exact.

## Plan status: all 7 phases complete
All phases from the approved implementation plan have shipped and been verified against the live site with real measurements.

### Post-launch correction: auto-expiry policy (2026-08-06, after Phase 7)
The client's actual product decision is that staying "popped up" is a **manual-only** action (users pop down themselves) — the aggressive 2-hour auto-expiry added in Phase 2 contradicted that and was reverted. Kept instead: a lenient **30-day** no-heartbeat safety net (`POPUP_STALE_HOURS = 24 * 30` in `server.js`), run once daily instead of every 15 minutes, so real users are never affected and only genuinely abandoned/uninstalled accounts get cleaned up over time.
- Restored the 346 profiles the Phase 2 job had force-popped-down, using the exact `popup_message` values from the pre-Phase-2 backup (`popup_play_complete_backup_20260806_040842.zip`) — confirmed `latitude`/`longitude` were never touched by the cleanup query, so this was an exact, lossless restore. The 3 real users who had popped up since were explicitly excluded from the restore so their current live state wasn't overwritten.
- On restart, the new 30-day net immediately (and correctly) re-expired 261 of those 346 whose `last_active` was already 30+ days stale, leaving **88** genuinely-recent profiles popped up. This is working as designed, not a bug — it's the intended middle ground between "everyone stays forever" and the old 2-hour auto pop-down the client didn't want.

### Final post-fix measurement (live production, current state: 88 active, 676 total profiles)
| Measurement | Before (original baseline) | After (now) |
|---|---|---|
| `is_popped_up = true` count | 349 (92.5% stale 7+ days) | 88 (30-day safety net; 0% forced by an over-aggressive timer) |
| Query plan for `is_popped_up = true` | Seq Scan | **Index Scan**, 0.215ms execution (`idx_userprofile_popped_up`, confirmed via `EXPLAIN ANALYZE` at current 88/676 selectivity) |
| Avg avatar file size (real sample, 38 distinct active-user avatars) | 1,059,641 bytes (~1.03MB) raw | **1,929 bytes (~1.9KB)** WebP thumbnail — **549x smaller**, measured directly via `curl -I` on the live files, not estimated |
| Total avatar bytes for all currently-active profiles | ~35MB/26 avatars in the original single-view baseline (1.35MB avg) | ~88 × 1.9KB ≈ **166KB total** for all 88 active profiles — smaller total payload while serving 3x more profiles |
| Map data payload (unbounded fetch, trimmed columns) | 340,005 bytes / 349 rows (974 bytes/row, `SELECT *`) | **37,122 bytes / 88 rows** (422 bytes/row — bytes/row itself roughly halved from column trimming, on top of fewer rows) |
| Bounded (viewport-scoped) fetch, empty region | N/A (didn't exist) | **2 bytes** (`[]`) — confirmed via live intercepted request when the default NYC viewport has no active users nearby (expected: current 88 real users are geographically scattered, not clustered near the default map center) |
| Home page load (goto → networkidle) | 2.2s | **1.38s** |
| Console errors introduced by any phase | — | None (checked on every live verification pass) |

Net effect: fewer, more meaningful "active" profiles (real safety net instead of either extreme), each one ~550x cheaper to render as an avatar, fetched through an indexed, column-trimmed, viewport-scoped endpoint instead of a full-table unindexed scan — while still respecting the client's manual-pop-down product requirement.

## Client-reported bugs (2026-08-06, live device testing) — all fixed and verified

The client tested the live map and reported four issues via a screen recording. Root-caused and fixed each:

1. **Profile photos rotated sideways/upside-down.** `generateAvatarThumbnail()` in `server.js` called `sharp(...).resize(...)` without first calling `.rotate()`. Phone cameras (especially portrait shots) store orientation as EXIF metadata rather than physically rotating pixels; `sharp`'s output strips metadata, so without an explicit `.rotate()` call to auto-orient the pixels first, the thumbnail bakes in the raw, un-rotated sensor orientation. Fixed by adding `.rotate()` before `.resize()`. Verified directly: regenerated a real photo's thumbnail with and without the fix side-by-side — "without" was rotated 90°, "with" was correctly upright. Regenerated all 251 existing self-hosted thumbnails with the fix applied (`backfill-avatar-thumbnails.js`, now safe to re-run any time since it regenerates rather than only filling gaps).
2. **Blank white avatar for users without a photo.** Introduced in Phase 7: the placeholder silhouette is a CSS `background-image: url('...')` on the marker's container div, but the placeholder SVG's own markup used literal single quotes (`xmlns='...'`) — which prematurely closed the single-quoted `url('...')`, silently invalidating the whole CSS declaration. Same root cause broke the `onerror` fallback (a single-quoted JS string) for photos that fail to load, which doubles as the explanation for report #4 below. Fixed by re-encoding the placeholder's internal quotes as `%27` so it's safe inside single-quoted, double-quoted, or unquoted contexts.
3. **Some photos randomly missing on iPhone.** Same bug as #2 — when a real photo failed to load (flaky mobile connection), the broken `onerror` fallback threw instead of swapping in the placeholder, leaving a blank image. Fixed by the same encoding change.
4. **Profile card blinks/disappears after tapping; feels unstable.** Two distinct causes, both mobile/touch-specific:
   - The existing hover-preview logic (`mouseover` opens, `mouseout` schedules a close 200ms later) doesn't map cleanly onto touch — a tap synthesizes both events close together, so the popup opened and then auto-closed itself ~200ms later. Fixed by detecting touch/coarse-pointer devices (`matchMedia('(hover: none), (pointer: coarse)')`) and skipping the hover handlers entirely on touch — tap just opens, and closes via the popup's own close button or by tapping elsewhere on the map.
   - A second, subtler cause: the popup's `autoPan` (Leaflet's default) pans the map slightly to fit the popup on screen when it opens; that pan fires a map "move" event, which makes the marker-clustering plugin recompute and briefly re-add the tapped marker to the map — closing its own popup as a side effect roughly 0.5-1s after it opened, intermittently. Fixed by setting `autoPan={false}` (the popup is small enough, 220px max, to fit on screen without panning in the vast majority of cases).
   - Verified live with an emulated iPhone (touch + viewport): tapped a real marker and sampled popup open/closed state every 100ms for 1.5s across 4 separate runs — popup stayed open for the full window every time (previously intermittent, closing anywhere from ~200ms to ~1s after opening). Also capped the popup's width (`maxWidth=220`, `max-w-[80vw]` on the content) so it can't overflow narrow phone screens.

All four fixes deployed and verified against the live production site; no data was modified for this round (code/asset-only changes plus a thumbnail regeneration that only rewrites derived `.webp` files, never the original uploads or any DB row other than `avatar_thumb_url`).

## Second round of client-reported bugs (2026-08-07)

1. **"Admin user is popped up but doesn't show on map."** Root cause: `Home.jsx`'s `filteredActiveUsers` applies the "Filter By Gender" dropdown (default `Female`) to *every* profile, including the current user's own. If your own gender doesn't match whatever filter happens to be selected, your own pin is invisible on your own map even while live — this is also why the map's own count ("0 of 87 active nearby") disagreed with the "X others nearby" text elsewhere on the page, which reads from the *unfiltered* list. Fixed: the gender filter now always keeps the current user's own profile regardless of its value (`profile.gender === genderFilter || profile.id === myProfile?.id`) — the filter is for browsing others, not for hiding yourself.
2. **"Avatars are flickering."** Root cause found via temporary diagnostic logging (mount/unmount/icon-recompute instrumentation on `UserMarker`, removed after use) — this was not a rendering bug in the marker/clustering code itself. On every page load, three bounds-scoped fetches fire in sequence: (1) unbounded (shows everyone), (2) bounds computed around the map's *default* center — fired before the user's real geolocation has resolved and re-centered the map — which correctly (but uselessly) returns **zero** results, and (3) bounds around the *real* location once geolocation resolves and the map flies there. Step 2's legitimate-but-wrong empty result wiped every marker off the map for ~2 seconds before step 3's real results replaced them — reading as "avatars flicker" (appear → vanish → reappear) on every load. Fixed in `CityMap.jsx`'s `MapBoundsWatcher`: it no longer reports bounds immediately on mount using whatever the map's starting center happens to be. It now waits for a real `moveend` (either from the geolocation-driven re-center or a user's own pan/zoom) before reporting bounds for the first time, with a 5-second fallback timer so users who deny/lack location access still eventually get a scoped fetch instead of staying unbounded forever.
   - Verified live: sampled the rendered marker/cluster count every 150ms through a full page load over a real dense cluster (27 active users) — count went `0 → 23 (everyone, unbounded) → 14 (settles to the real nearby set)` and never dropped back to 0 after first appearing. Confirmed via network capture that the wasted zero-result "default center" request no longer fires at all — only the unbounded request followed directly by the real, correctly-scoped one.

Both fixes deployed and verified live; no user data was modified (code-only changes).

## Third round of client-reported bugs (2026-08-07)

1. **Console crash: `Cannot read properties of undefined (reading 'x')` inside Leaflet's `DistanceGrid`, via `_childMarkerMoved` → `_addLayer` → `getNearObject` → `_sqDist`.** Root cause: `CityMap.jsx` decided whether a marker was "the current user" (and therefore should use raw instead of privacy-obfuscated coordinates) by comparing `currentUserProfile?.id === profile.id`, where `currentUserProfile` was `myProfile` — a separate, slower-loading React Query. On first render, `myProfile` is still `undefined`, so your own marker briefly renders with *obfuscated* coordinates like everyone else; a moment later, once `myProfile` resolves, it switches to *raw* coordinates — moving an already-mounted, already-clustered marker. `leaflet.markercluster` doesn't expect a clustered marker's position to change and its internal spatial grid crashes. Fixed by comparing against `currentUserEmail` (the logged-in user's email) instead — `activeUsers`/markers can't even be fetched until `user?.email` already exists (the query is `enabled: !!user?.email`), so by the time any marker exists at all, this comparison is already stable and never flips mid-flight. `Home.jsx` now passes `currentUserEmail={user?.email}` to `CityMap` instead of the whole `myProfile` object.
   - Verified live: reproduced the exact trigger (logged-in test account popped up at its own real coordinates, fresh page load, 4s settle window spanning the old switch-over point) — zero errors beyond the pre-existing, unrelated analytics warning. Reverted the test account to its prior state afterward (`is_popped_up=false`, matching before).
2. **"Hover/click an avatar, see the info box, try to move to it, it disappears."** Root cause: the popup opens on marker hover and starts a 200ms close timer on marker mouseout, cancelled only once the mouse actually enters the popup content. 200ms often isn't enough time to physically move the mouse from the marker up to the popup above it, so the popup closed itself mid-transit before the cancel could fire. Fixed by raising that grace period to 400ms in `UserMarker.jsx`.
   - Verified live: hovered a real marker, then moved the mouse toward the popup in six steps over ~360ms (simulating realistic transit) — popup stayed open throughout, where before this exact timing would have closed it.

Both fixes deployed and verified live; no user data was modified beyond a temporary, fully-reverted test-account pop-up used to reproduce bug #1.

## Fourth round of client-reported bugs (2026-08-07): popup unreachable near the map's edge

Report: "hover/click an avatar, see the info box, but when I try to move to it (to reach the Video Verify button etc.), it disappears." Investigated with temporary diagnostic logging (removed after use) to separate three distinct things that were tangled together:

1. **Avatar "reload" on hover — not an actual reload.** Confirmed via diagnostics that the marker's own icon never recomputes on hover (`isHovered` isn't a dependency of the memoized icon), and the popup's internal avatar `<img>` is the same persisting DOM node across repeated hovers (tagged an element, hovered away and back, tag survived — no fresh `<img>`, no re-fetch). No literal reload happens; nothing further to fix here.
2. **The popup genuinely can be geometrically clipped and unreachable.** The map card used `rounded-2xl overflow-hidden` for its rounded appearance. For a marker near the top edge of the visible map, its popup (which opens above the marker) can extend above the map card's own boundary — and `overflow: hidden` clipped that portion away, along with the ability to hover/click into it (the video-verify button lives in exactly that clipped region for markers positioned this way). Confirmed via `getBoundingClientRect()`: the popup's top edge was above the map container's top edge, in the clipped zone.
3. **The "obvious" fix (re-enable the popup's `autoPan` to nudge the map into keeping the popup fully visible) reintroduces the earlier "closes right after opening" bug** — confirmed by directly re-testing it: the popup opened, `leaflet.markercluster`'s own internal move-handling reprocessed the visible marker set a few hundred ms into the pan (its own listener, separate from anything in our code), and the popup closed itself. This is a native library behavior tied to any map move while clustering is active, not something reachable from the React/query layer — a `popupopen`/`popupclose`-aware suppression of our own bounds-refetch (added defensively regardless) did not prevent it, because the plugin's own internal handling isn't gated by that.

**Fix:** removed `rounded-2xl overflow-hidden` from the map card entirely (`CityMap.jsx`) — the map is now a plain rectangle, matching what the tiles already are natively, so there's no rounded-vs-square mismatch to hide and nothing left to clip a popup against. `autoPan` stays off (avoiding the native reclustering-close behavior). Screenshotted the corners before and after: before, `overflow: visible` alone left visibly square tile corners jammed into a rounded card (a real regression); after, dropping the rounding entirely reads as a clean, intentional square card and blends normally with the rest of the page (which keeps its own rounded cards elsewhere).

Verified live end-to-end: drove a real Playwright click all the way through — hovered a marker near the map's edge, located the "Video Verify" button inside its popup, confirmed `document.elementFromPoint()` at the button's center resolves to the button itself (not something else on top of it), clicked it, and confirmed navigation to `/VideoCall?user=...` — the exact interaction the client reported as broken.

No user data was modified (code/CSS-only changes).

## Fifth round of client-reported bugs (2026-08-07), tested on a real mobile device

1. **Popup box too large for the phone screen.** Tightened `UserMarker.jsx`'s popup content (width 220→210px, avatar 40px→32px, padding/margins reduced throughout) and dropped the conflicting global CSS cap (`App.css`'s `.leaflet-popup-content` max-width 280px → 220px, which was wider than the component's own 220px prop and could win depending on specificity). Verified live on an emulated Pixel 5: popup content measured ~210×226px after the change, visibly more compact.
2. **Markers flicker every time the map is panned to see other people.** Investigated with the same mount/unmount + icon-recompute diagnostic technique as before (added temporarily, removed after use), this time reproducing a real drag-pan instead of just initial load. Result: markers that stay on screen across the pan do **not** unmount or re-fade — only markers newly scrolled into view do (this class of bug, full marker churn on every bounds change, turned out to have already been fixed as a side effect of the `keepPreviousData` change made earlier in this session, before this round). The actual remaining cause: a marker's avatar only starts loading once its component mounts, i.e. once it's actually scrolled into view — so revealing several new markers in one pan (common when moving toward a dense cluster) shows several placeholder→photo fades at once, which is more visible on a slower mobile connection and reads as "flickering."
   - **Fix:** `CityMap.jsx` now preloads (`new Image().src = ...`) every profile's avatar as soon as its data arrives from the bounds-scoped fetch — covering the full padded/buffered area, not just markers currently on screen — so by the time a marker is actually panned into view, its avatar is already in the browser's cache and appears instantly instead of fading in.
   - Verified live: 39 avatar thumbnail requests fired within 3 seconds of page load (well ahead of any of those markers being scrolled into view), confirming the preload fires eagerly for the whole buffered set.
3. **Separate issue found (not yet fixed) while verifying #1 on a real device**: for a marker positioned near the left/right edge of the phone screen, its popup can extend past the edge of the browser viewport itself, cutting off content like the Video Verify button — a different edge than the map-clipping issue fixed in round 4 (that was the map card's own boundary; this is the actual device screen edge, which matters now that `autoPan` is off). Attempted a CSS-margin nudge-back-on-screen fix twice (once via `requestAnimationFrame`, once with a longer `setTimeout`); both were unreliable — Leaflet appears to recompute/overwrite the popup's own margin after the fix runs, so the correction didn't reliably stick. Reverted both attempts rather than ship something unverified. Left as a known, narrow edge case (only affects markers very close to the left/right screen edge) pending a proper fix.

All fixes deployed and verified live except item 3, which was attempted, found unreliable, and reverted. No user data was modified.

## Sixth round: client-provided video (2026-08-07)

First time working from a video instead of a text/screenshot report. Extracted frames with `ffmpeg` (no direct video support in the available tools) to see the reported behavior, plus the client's own narration (provided as a transcript): *"when I start typing in this box, look what happens... see how it keeps flickering when I type in the box?"* — referring to the "What are you looking for?" popup-message textarea on Home.

(A red pin with a white "C" visible over Fort Worth in several frames turned out to be unrelated to the reported bug — most likely the basemap tile's own city-icon styling for a major city, not app-rendered. Not investigated further since the client's own narration pointed at the typing behavior specifically, not this pin.)

**Root cause, confirmed in code:** `Home.jsx` passed an inline arrow function as `onProfileClick` to `<CityMap>` on every render: `onProfileClick={(profile) => { if (!guardAction('view full profiles')) return; navigate(...); }}`. Every keystroke in the textarea updates `popupMessage` state (also in `Home.jsx`), re-rendering `Home.jsx` and recreating that inline function with a new reference each time. That prop was threaded all the way down to every `UserMarker` — which is wrapped in `React.memo` specifically to skip re-rendering when nothing relevant changed. A new function reference on every keystroke defeated that memoization for every marker on the map, all at once, on every single character typed.

The deeper finding: `onProfileClick` was never actually called anywhere inside `UserMarker` — it was dead code. The real navigation-to-profile path is the marker's own `dblclick` handler, which calls `navigate()` directly and had **no subscription check at all** — meaning the `guardAction('view full profiles')` paywall guard that lived in the dead prop was never enforced anywhere, and a non-paying user could reach a full profile page by double-clicking a marker, bypassing the paywall that the single-click popup already enforces.

**Fix:** removed the dead `onProfileClick` prop entirely (`Home.jsx` → `CityMap.jsx` → `UserMarker.jsx`), and moved the `guardAction('view full profiles')` check into the `dblclick` handler that's actually used. This fixes the flicker (markers no longer re-render on every keystroke) and closes the paywall bypass as a side effect of tracing the dead code to its origin. Also removed `navigate`/`guardAction`/their now-unused imports from `Home.jsx`.

Verified live: added a temporary render-counter (`window.__markerRenderCount()`, removed after use) and typed 16 characters into the textarea — 0 additional marker re-renders recorded (previously every keystroke would re-render every marker on the map). Also verified double-click still correctly navigates to a profile for a paying account (no regression), confirming the guard applies without breaking the normal path. No user data was modified — this was a pure code fix (dead prop removal + guard relocation).

## Seventh round: second client-provided video (2026-08-07)

Client's narration: *"when I go view somebody's profile, when I click right here and I try to scroll up in the box to click that, you see it disappears... it needs to stay like that so we can click it... you see how it comes back?"* — a popup closing while trying to scroll inside it.

Extracted frames again with `ffmpeg`. Found direct visual proof of the mechanism: comparing the frame right before the popup vanished against the frame right after showed **new city labels appearing on the map** (Tehran, Mashhad, Isfahan, Shiraz) that weren't visible a moment earlier — meaning the map had actually zoomed in between those two frames. The popup didn't just close on its own; the map moved.

**Root cause:** `MapContainer` never explicitly sets `scrollWheelZoom`, so it uses Leaflet's default (`true`) — scrolling the mouse wheel anywhere over the map, including over an open popup sitting visually on top of it, zooms the map instead of scrolling within the popup. That zoom is a map move like any other, which (per the finding in round 4) makes the clustering plugin reprocess and close whatever popup is open. The client's instinct to scroll the popup to reach a lower button was instead zooming the map underneath it and closing the very popup they were trying to use.

**Fix:** added `onWheel={(e) => e.stopPropagation()}` to the popup's content `<div>` in `UserMarker.jsx` — stops the wheel event from ever bubbling out to Leaflet's zoom listener on the map container, without touching `scrollWheelZoom` globally (so normal zooming anywhere else on the map is untouched).

Verified live: scrolled the mouse wheel directly over an open popup's content — it stayed open (previously would have closed). As a negative control, scrolled over an empty part of the map with no popup open — the visible map content still changed (city labels updated), confirming normal scroll-to-zoom still works everywhere it's supposed to. No user data was modified.

## Eighth round: the actual root cause of "popup disappears / flashes elsewhere" (2026-08-07)

Client still saw the popup close while moving toward the Video Verify button, even after the wheel-event fix. Rather than guess again, added temporary, heavily-labeled debug logging (mount/unmount, every render with the position it used, every mouse/popup event, every map move, whether bounds-refetch fired or was skipped) and had the client reproduce it once with the browser console open, then paste the log — no automated testing this round, by request.

The pasted log made the mechanism obvious: on **every** `mouseover`/`mouseout`/popup-hover event, the marker's `RENDER` log fired, and within 2–6ms a `popupclose` immediately followed by a `popupopen` fired in lockstep — far faster than any real mouse movement, and clearly tied to render cycles rather than the cursor's actual position.

**Root cause:** `UserMarker.jsx` passed `position={[displayLat, displayLon]}` — a brand-new array literal built inline on every render. `isHovered`/`popupHovered` state (updated on every mouseover/mouseout/popup-hover) re-renders the component several times a second while the user is simply moving the mouse toward the popup. react-leaflet's `Marker` compares `position` by reference, so a new array — even with numerically identical coordinates — reads as "the marker moved," calling `marker.setLatLng()` again on every single re-render. Calling `setLatLng` on a marker inside an active `MarkerClusterGroup` makes the plugin reprocess and re-add that marker (same mechanism identified in earlier rounds for `autoPan` and scroll-wheel-zoom) — closing whatever popup was open, and occasionally showing it briefly at an intermediate/wrong spot mid-recluster-animation, matching "flashes at another part of the map."

**Fix:** memoized the position array — `const position = useMemo(() => [displayLat, displayLon], [displayLat, displayLon])` — so it's only a new reference when the actual coordinates change, not on every hover-driven re-render.

Verified with the same debug logging still attached: hovered a marker and moved the mouse in ten small steps toward the popup, exactly reproducing the reported motion. Result: `popupopen` fired once, `popupclose` fired **zero** times for the entire sequence (previously every render triggered a close+reopen pair), and the Video Verify button remained reachable throughout. Removed all debug logging afterward and re-verified the same sequence on the clean build — popup stayed open the whole time. No user data was modified; this was a pure code fix.
