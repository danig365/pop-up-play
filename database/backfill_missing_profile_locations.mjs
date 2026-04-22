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

const APPLY = process.argv.includes('--apply');
const SHOW_UNRESOLVED = process.argv.includes('--show-unresolved');

const locationCache = new Map();

function normalizePostalCode(zip) {
  let clean = String(zip || '').trim().replace(/\s+/g, ' ');
  if (!clean) return '';

  if (/^\d{5}-\d{4}$/.test(clean)) {
    clean = clean.slice(0, 5);
  }

  if (/[a-zA-Z]/.test(clean)) {
    clean = clean.toUpperCase();
  }

  return clean;
}

function countryCandidatesFor(zip, country) {
  const candidates = [];
  const normalized = String(country || '').trim().toLowerCase();

  const map = {
    us: 'us',
    usa: 'us',
    'united states': 'us',
    'united states of america': 'us',
    nl: 'nl',
    netherlands: 'nl',
    nederland: 'nl',
    ca: 'ca',
    canada: 'ca',
    gb: 'gb',
    uk: 'gb',
    'united kingdom': 'gb',
    de: 'de',
    germany: 'de',
    fr: 'fr',
    france: 'fr',
    au: 'au',
    australia: 'au',
  };

  if (map[normalized]) candidates.push(map[normalized]);

  if (/[a-zA-Z]/.test(zip)) {
    candidates.push('nl', 'gb');
  }

  candidates.push('us');
  return [...new Set(candidates)];
}

function hasText(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

async function lookupWithZippopotam(zip, countryCode) {
  const response = await fetch(`https://api.zippopotam.us/${countryCode}/${encodeURIComponent(zip)}`);
  if (!response.ok) return null;

  const data = await response.json();
  const place = data?.places?.[0];
  if (!place) return null;

  const city = place['place name'] || '';
  const state = place['state abbreviation'] || place.state || '';
  const country = data?.country ||
    (countryCode === 'nl' ? 'Netherlands' : countryCode === 'us' ? 'United States' : countryCode.toUpperCase());

  if (!city && !state && !country) return null;
  return { city, state, country };
}

async function lookupWithNominatim(zip, countryCode) {
  const params = new URLSearchParams({
    postalcode: zip,
    format: 'json',
    addressdetails: '1',
    limit: '1',
  });

  if (countryCode) {
    params.set('country', countryCode);
  }

  const response = await fetch(`https://nominatim.openstreetmap.org/search?${params.toString()}`, {
    headers: { 'User-Agent': 'PopUpPlay/1.0' },
  });
  if (!response.ok) return null;

  const data = await response.json();
  const address = data?.[0]?.address;
  if (!address) return null;

  const city = address.city || address.town || address.village || address.municipality || address.county || '';
  const state = address.state || address.region || address.state_district || '';
  const country = address.country || '';

  if (!city && !state && !country) return null;
  return { city, state, country };
}

async function lookupLocation(zip, country) {
  const normalizedZip = normalizePostalCode(zip);
  if (!normalizedZip) return null;

  const key = `${normalizedZip}_${String(country || '').trim().toLowerCase() || 'auto'}`;
  if (locationCache.has(key)) {
    return locationCache.get(key);
  }

  const candidates = countryCandidatesFor(normalizedZip, country);

  for (const candidate of candidates) {
    try {
      const result = await lookupWithZippopotam(normalizedZip, candidate);
      if (result) {
        locationCache.set(key, result);
        return result;
      }
    } catch {
      // Try next candidate/provider.
    }
  }

  for (const candidate of [...candidates, '']) {
    try {
      const result = await lookupWithNominatim(normalizedZip, candidate);
      if (result) {
        locationCache.set(key, result);
        return result;
      }
    } catch {
      // Try next candidate.
    }
  }

  locationCache.set(key, null);
  return null;
}

function nextFieldValue(currentValue, fetchedValue) {
  if (hasText(currentValue)) return currentValue;
  return hasText(fetchedValue) ? fetchedValue.trim() : currentValue;
}

async function run() {
  const client = await pool.connect();
  try {
    const candidates = await client.query(`
      SELECT id, user_email, zip_code, city, state, country
      FROM "UserProfile"
      WHERE COALESCE(trim(zip_code), '') <> ''
        AND (
          COALESCE(trim(city), '') = ''
          OR COALESCE(trim(state), '') = ''
          OR COALESCE(trim(country), '') = ''
        )
      ORDER BY updated_date DESC NULLS LAST, created_date DESC NULLS LAST
    `);

    console.log(`Found ${candidates.rows.length} profile(s) with ZIP but missing location fields.`);
    if (candidates.rows.length === 0) {
      return;
    }

    const unresolved = [];
    const updates = [];

    for (const row of candidates.rows) {
      const location = await lookupLocation(row.zip_code, row.country);

      if (!location) {
        unresolved.push({ id: row.id, user_email: row.user_email, zip_code: row.zip_code });
        continue;
      }

      const city = nextFieldValue(row.city, location.city);
      const state = nextFieldValue(row.state, location.state);
      const country = nextFieldValue(row.country, location.country);

      const changed = city !== row.city || state !== row.state || country !== row.country;
      if (!changed) continue;

      updates.push({
        id: row.id,
        user_email: row.user_email,
        zip_code: row.zip_code,
        old_city: row.city,
        old_state: row.state,
        old_country: row.country,
        new_city: city,
        new_state: state,
        new_country: country,
      });
    }

    console.log(`Resolvable updates: ${updates.length}`);
    console.log(`Unresolved ZIPs: ${unresolved.length}`);

    if (updates.length > 0) {
      console.log('\nProfiles to update (missing fields only):');
      for (const update of updates) {
        console.log(
          `- ${update.user_email} | ZIP ${update.zip_code} | ` +
          `city: "${update.old_city || ''}" -> "${update.new_city || ''}", ` +
          `state: "${update.old_state || ''}" -> "${update.new_state || ''}", ` +
          `country: "${update.old_country || ''}" -> "${update.new_country || ''}"`
        );
      }
    }

    if (SHOW_UNRESOLVED && unresolved.length > 0) {
      console.log('\nUnresolved profiles:');
      for (const item of unresolved) {
        console.log(`- ${item.user_email} | ZIP ${item.zip_code} | id ${item.id}`);
      }
    }

    if (!APPLY) {
      console.log('\nDry run only. Re-run with --apply to write updates.');
      return;
    }

    await client.query('BEGIN');
    for (const update of updates) {
      await client.query(
        `
          UPDATE "UserProfile"
          SET city = $1,
              state = $2,
              country = $3,
              updated_date = CURRENT_TIMESTAMP
          WHERE id = $4
        `,
        [update.new_city, update.new_state, update.new_country, update.id]
      );
    }
    await client.query('COMMIT');

    console.log(`\nApplied ${updates.length} profile update(s).`);
  } catch (error) {
    try {
      await client.query('ROLLBACK');
    } catch {
      // Ignore rollback failure.
    }
    console.error('Backfill failed:', error.message);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

run();
