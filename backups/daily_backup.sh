#!/bin/bash
# =============================================================================
# POP-UP-PLAY DAILY BACKUP SCRIPT
# Runs backup_all.sh and enforces a 7-day age-based retention policy.
# Intended to be called by cron (see setup_cron.sh) on the HOST machine.
# =============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG_FILE="$SCRIPT_DIR/backup.log"
RETENTION_DAYS="${RETENTION_DAYS:-7}"

log() {
  echo "[$(date -u '+%Y-%m-%d %H:%M:%S UTC')] $*" | tee -a "$LOG_FILE"
}

# Rotate log: keep last 500 lines to prevent unbounded growth
rotate_log() {
  if [ -f "$LOG_FILE" ] && [ "$(wc -l < "$LOG_FILE")" -gt 500 ]; then
    tail -400 "$LOG_FILE" > "${LOG_FILE}.tmp" && mv "${LOG_FILE}.tmp" "$LOG_FILE"
  fi
}

rotate_log

log "========================================================"
log "  Daily backup started"
log "  Retention: $RETENTION_DAYS days"
log "========================================================"

# ---- Auto-detect Docker container names ----
# Accept env overrides, otherwise find the first running container whose name
# contains the well-known substrings (handles compose-prefixed names like
# dfaeccc51586_pop-up-play-db).
if [ -z "${DB_CONTAINER:-}" ]; then
  DB_CONTAINER=$(docker ps --format '{{.Names}}' 2>/dev/null | grep -m1 'pop-up-play-db' || true)
  if [ -z "$DB_CONTAINER" ]; then
    DB_CONTAINER=$(docker ps --format '{{.Names}}' 2>/dev/null | grep -m1 'popup.*db\|pop.*up.*db\|postgres' || true)
  fi
fi
if [ -z "${APP_CONTAINER:-}" ]; then
  APP_CONTAINER=$(docker ps --format '{{.Names}}' 2>/dev/null | grep -m1 'pop-up-play-app\|popup.*app' || true)
  APP_CONTAINER="${APP_CONTAINER:-pop-up-play-app}"
fi
export DB_CONTAINER APP_CONTAINER
log "DB container : $DB_CONTAINER"
log "App container: $APP_CONTAINER"

if [ -z "$DB_CONTAINER" ]; then
  log "❌ Could not find running database container. Aborting."
  exit 1
fi

# ---- Free up space: prune dangling Docker images before backing up ----
BEFORE_FREE=$(df --output=avail / | tail -1)
docker image prune -f >> "$LOG_FILE" 2>&1 || true
AFTER_FREE=$(df --output=avail / | tail -1)
FREED_KB=$(( AFTER_FREE - BEFORE_FREE ))
log "🧹 Docker image prune freed ~$(( FREED_KB / 1024 ))MB"

# Run the full backup (disable count-based pruning; we handle age-based below)
if DB_CONTAINER="$DB_CONTAINER" APP_CONTAINER="$APP_CONTAINER" \
   RETENTION_COUNT=999 CLEANUP_INTERMEDIATE=true \
   bash "$SCRIPT_DIR/backup_all.sh" >> "$LOG_FILE" 2>&1; then
  log "✅ backup_all.sh completed successfully"
else
  EXIT_CODE=$?
  log "❌ backup_all.sh failed with exit code $EXIT_CODE"
  exit $EXIT_CODE
fi

# ---- Age-based retention: delete complete backup zips older than N days ----
log "🧹 Applying $RETENTION_DAYS-day retention policy..."

deleted_count=0
while IFS= read -r -d '' old_file; do
  rm -f "$old_file"
  log "  Deleted old backup: $(basename "$old_file")"
  ((deleted_count++)) || true
done < <(find "$SCRIPT_DIR" -maxdepth 1 -name 'popup_play_complete_backup_*.zip' -mtime "+$RETENTION_DAYS" -print0 2>/dev/null)

# Also prune any leftover intermediate files older than N days (edge case cleanup)
while IFS= read -r -d '' old_file; do
  rm -f "$old_file"
  log "  Cleaned stale file: $(basename "$old_file")"
done < <(find "$SCRIPT_DIR" -maxdepth 1 \( \
  -name 'popup_play_db_*.sql' \
  -o -name 'popup_play_db_*.dump' \
  -o -name 'popup_play_globals_*.sql' \
  -o -name 'popup_play_code_*.tar.gz' \
  -o -name 'popup_play_uploads_*.tar.gz' \
  -o -name 'schema_backup_*.sql' \
  -o -name 'seed_backup_*.sql' \
  -o -name 'popup_play_complete_backup_*.tar.gz' \
  -o -name 'restore_backup_*.sh' \
  -o -name 'docker_postgres_inspection_*.json' \
  -o -name 'docker_app_inspection_*.json' \
  -o -name 'docker_volumes_*.txt' \
  -o -name 'DOCKER_ANALYSIS_*.md' \
\) -mtime "+$RETENTION_DAYS" -print0 2>/dev/null)

log "  Retention cleanup done (removed $deleted_count old zip(s))"

# ---- Summary of current backups ----
log "📋 Current backups:"
while IFS= read -r -d '' f; do
  size=$(du -sh "$f" 2>/dev/null | cut -f1)
  age_days=$(( ( $(date +%s) - $(stat -c %Y "$f") ) / 86400 ))
  log "  $(basename "$f")  [${size}, ${age_days}d old]"
done < <(find "$SCRIPT_DIR" -maxdepth 1 -name 'popup_play_complete_backup_*.zip' -print0 2>/dev/null | sort -z)

log "========================================================"
log "  Daily backup finished"
log "========================================================"
