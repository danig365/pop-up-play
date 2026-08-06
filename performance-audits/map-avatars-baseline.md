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
