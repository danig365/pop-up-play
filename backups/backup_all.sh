#!/bin/bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
BACKUP_DIR="$SCRIPT_DIR"
TIMESTAMP="$(date -u +%Y%m%d_%H%M%S)"

DB_CONTAINER="${DB_CONTAINER:-pop-up-play-db}"
APP_CONTAINER="${APP_CONTAINER:-pop-up-play-app}"
DB_USER="${DB_USER:-popupapp}"
DB_NAME="${DB_NAME:-popup_play_db}"
RETENTION_COUNT="${RETENTION_COUNT:-5}"
CLEANUP_INTERMEDIATE="${CLEANUP_INTERMEDIATE:-true}"

DB_SQL="popup_play_db_${TIMESTAMP}.sql"
DB_DUMP="popup_play_db_${TIMESTAMP}.dump"
DB_GLOBALS="popup_play_globals_${TIMESTAMP}.sql"
CODE_ARCHIVE="popup_play_code_${TIMESTAMP}.tar.gz"
UPLOADS_ARCHIVE="popup_play_uploads_${TIMESTAMP}.tar.gz"
SCHEMA_BACKUP="schema_backup_${TIMESTAMP}.sql"
SEED_BACKUP="seed_backup_${TIMESTAMP}.sql"
INSPECT_DB="docker_postgres_inspection_${TIMESTAMP}.json"
INSPECT_APP="docker_app_inspection_${TIMESTAMP}.json"
DOCKER_VOLUMES="docker_volumes_${TIMESTAMP}.txt"
DOCKER_ANALYSIS="DOCKER_ANALYSIS_${TIMESTAMP}.md"
COMPLETE_ARCHIVE="popup_play_complete_backup_${TIMESTAMP}.tar.gz"
COMPLETE_ZIP="popup_play_complete_backup_${TIMESTAMP}.zip"
RESTORE_SCRIPT="restore_backup_${TIMESTAMP}.sh"

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║          POP-UP-PLAY BACKUP CREATION SCRIPT                  ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""
echo "Timestamp (UTC): $TIMESTAMP"
echo "Backup dir:      $BACKUP_DIR"
echo "Project root:    $PROJECT_ROOT"
echo "Compact output:  $CLEANUP_INTERMEDIATE"
echo ""

command -v docker >/dev/null 2>&1 || { echo "❌ docker command not found"; exit 1; }
command -v tar >/dev/null 2>&1 || { echo "❌ tar command not found"; exit 1; }

if ! docker ps --format '{{.Names}}' | grep -qx "$DB_CONTAINER"; then
  echo "❌ Database container '$DB_CONTAINER' is not running."
  exit 1
fi

if ! docker ps --format '{{.Names}}' | grep -qx "$APP_CONTAINER"; then
  echo "⚠ App container '$APP_CONTAINER' is not running. Continuing with DB + code backup."
fi

echo "🔒 Creating database SQL dump..."
docker exec -i "$DB_CONTAINER" pg_dump -U "$DB_USER" "$DB_NAME" > "$BACKUP_DIR/$DB_SQL"

echo "🔒 Creating database custom dump..."
docker exec -i "$DB_CONTAINER" pg_dump -U "$DB_USER" -Fc "$DB_NAME" > "$BACKUP_DIR/$DB_DUMP"

echo "🔒 Creating schema-only backup..."
docker exec -i "$DB_CONTAINER" pg_dump -U "$DB_USER" --schema-only "$DB_NAME" > "$BACKUP_DIR/$SCHEMA_BACKUP"

echo "🔒 Creating data-only seed backup..."
docker exec -i "$DB_CONTAINER" pg_dump -U "$DB_USER" --data-only --inserts "$DB_NAME" > "$BACKUP_DIR/$SEED_BACKUP"

echo "🔒 Attempting globals/roles backup..."
if docker exec -i "$DB_CONTAINER" pg_dumpall -U postgres --globals-only > "$BACKUP_DIR/$DB_GLOBALS" 2>/dev/null; then
  echo "  ✓ Created globals backup: $DB_GLOBALS"
else
  rm -f "$BACKUP_DIR/$DB_GLOBALS"
  echo "  ⚠ Skipped globals backup (insufficient privileges or pg_dumpall unavailable)."
fi

echo "📦 Creating code archive..."
tar -czf "$BACKUP_DIR/$CODE_ARCHIVE" \
  --exclude='./node_modules' \
  --exclude='./dist' \
  --exclude='./.git' \
  --exclude='./uploads' \
  --exclude='./backups/*.tar.gz' \
  --exclude='./backups/*.sql' \
  --exclude='./backups/*.dump' \
  --exclude='./backups/*.json' \
  --exclude='./backups/*.md' \
  --exclude='./backups/*.txt' \
  --exclude='./backups/DOCKER_*' \
  --exclude='./backups/popup_play_*' \
  --exclude='./.env' \
  -C "$PROJECT_ROOT" .

echo "📦 Creating uploads volume backup..."
if docker volume ls --format '{{.Name}}' | grep -qx 'pop-up-play_uploads_data'; then
  docker run --rm \
    -v pop-up-play_uploads_data:/volume:ro \
    -v "$BACKUP_DIR":/backup \
    alpine:3.20 \
    sh -c "tar -czf /backup/$UPLOADS_ARCHIVE -C /volume ."
  echo "  ✓ Created uploads backup from volume pop-up-play_uploads_data"
elif docker volume ls --format '{{.Name}}' | grep -qx 'uploads_data'; then
  docker run --rm \
    -v uploads_data:/volume:ro \
    -v "$BACKUP_DIR":/backup \
    alpine:3.20 \
    sh -c "tar -czf /backup/$UPLOADS_ARCHIVE -C /volume ."
  echo "  ✓ Created uploads backup from volume uploads_data"
else
  echo "  ⚠ uploads volume not found; creating empty placeholder archive"
  tar -czf "$BACKUP_DIR/$UPLOADS_ARCHIVE" -T /dev/null
fi

echo "🐳 Capturing Docker metadata..."
docker inspect "$DB_CONTAINER" > "$BACKUP_DIR/$INSPECT_DB"
if docker ps --format '{{.Names}}' | grep -qx "$APP_CONTAINER"; then
  docker inspect "$APP_CONTAINER" > "$BACKUP_DIR/$INSPECT_APP"
else
  echo "[]" > "$BACKUP_DIR/$INSPECT_APP"
fi
{
  echo "Generated UTC: $(date -u '+%Y-%m-%d %H:%M:%S')"
  echo ""
  echo "Volumes:"
  docker volume ls
  echo ""
  echo "Networks:"
  docker network ls
} > "$BACKUP_DIR/$DOCKER_VOLUMES"

cat > "$BACKUP_DIR/$DOCKER_ANALYSIS" <<EOF
# Docker Analysis Snapshot

Generated (UTC): $(date -u '+%Y-%m-%d %H:%M:%S')

## Containers
- $DB_CONTAINER: $(docker inspect -f '{{.State.Status}}' "$DB_CONTAINER")
- $APP_CONTAINER: $(docker inspect -f '{{.State.Status}}' "$APP_CONTAINER" 2>/dev/null || echo 'not running')

## Volumes
$(docker volume ls --format '- {{.Name}}')

## Networks
$(docker network ls --format '- {{.Name}}')

EOF

echo "🧾 Writing backup inventory..."
{
  echo "POP-UP-PLAY BACKUP INVENTORY"
  echo "Generated UTC: $(date -u '+%Y-%m-%d %H:%M:%S')"
  echo ""
  echo "Created files:"
  ls -lh "$BACKUP_DIR" | awk '{print $9, $5}' | grep -E "${TIMESTAMP}|BACKUP_INVENTORY.txt|verify_backups.sh|backup_all.sh" || true
  echo ""
  echo "Restore DB SQL:"
  echo "  docker exec -i $DB_CONTAINER psql -U $DB_USER $DB_NAME < $DB_SQL"
  echo ""
  echo "Restore DB custom:"
  echo "  docker exec -i $DB_CONTAINER pg_restore -U $DB_USER -d $DB_NAME --jobs=4 $DB_DUMP"
  echo ""
  echo "Restore code:"
  echo "  tar -xzf $CODE_ARCHIVE -C /restore/path"
  echo ""
  echo "Restore uploads:"
  echo "  mkdir -p /restore/uploads && tar -xzf $UPLOADS_ARCHIVE -C /restore/uploads"
  echo ""
  echo "Restore helper script:"
  echo "  bash $RESTORE_SCRIPT"
} > "$BACKUP_DIR/BACKUP_INVENTORY.txt"

echo "🛠 Creating restore helper script..."
cat > "$BACKUP_DIR/$RESTORE_SCRIPT" <<EOF
#!/bin/bash

set -euo pipefail

SCRIPT_DIR="\$(cd "\$(dirname "\${BASH_SOURCE[0]}")" && pwd)"
TIMESTAMP="${TIMESTAMP}"

DB_CONTAINER="\${DB_CONTAINER:-${DB_CONTAINER}}"
APP_CONTAINER="\${APP_CONTAINER:-${APP_CONTAINER}}"
DB_USER="\${DB_USER:-${DB_USER}}"
DB_NAME="\${DB_NAME:-${DB_NAME}}"
TARGET_ROOT="\${TARGET_ROOT:-/tmp/popup_play_restore_\$TIMESTAMP}"

DB_SQL="popup_play_db_\${TIMESTAMP}.sql"
CODE_ARCHIVE="popup_play_code_\${TIMESTAMP}.tar.gz"
UPLOADS_ARCHIVE="popup_play_uploads_\${TIMESTAMP}.tar.gz"
COMPLETE_ARCHIVE="popup_play_complete_backup_\${TIMESTAMP}.tar.gz"
COMPLETE_ZIP="popup_play_complete_backup_\${TIMESTAMP}.zip"
SOURCE_DIR="\$SCRIPT_DIR"
WORK_DIR="\$TARGET_ROOT/bundle_\$TIMESTAMP"

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║        POP-UP-PLAY RESTORE SCRIPT (TIMESTAMPED SET)          ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""
echo "Backup set: \$TIMESTAMP"
echo "Source dir: \$SCRIPT_DIR"
echo "Target dir: \$TARGET_ROOT"
echo ""

command -v docker >/dev/null 2>&1 || { echo "❌ docker command not found"; exit 1; }
command -v tar >/dev/null 2>&1 || { echo "❌ tar command not found"; exit 1; }

extract_zip() {
  local src_zip="\$1"
  local dest_dir="\$2"
  mkdir -p "\$dest_dir"
  if command -v unzip >/dev/null 2>&1; then
    unzip -qo "\$src_zip" -d "\$dest_dir"
  elif command -v python3 >/dev/null 2>&1; then
    python3 - "\$src_zip" "\$dest_dir" <<'PY'
import sys
import zipfile
from pathlib import Path

src = Path(sys.argv[1])
dst = Path(sys.argv[2])
dst.mkdir(parents=True, exist_ok=True)
with zipfile.ZipFile(src, 'r') as zf:
    zf.extractall(dst)
PY
  else
    echo "❌ Need unzip or python3 to extract \$src_zip"
    exit 1
  fi
}

if ! docker ps --format '{{.Names}}' | grep -qx "\$DB_CONTAINER"; then
  echo "❌ Database container '\$DB_CONTAINER' is not running."
  exit 1
fi

if [ ! -f "\$SCRIPT_DIR/\$DB_SQL" ] || [ ! -f "\$SCRIPT_DIR/\$CODE_ARCHIVE" ] || [ ! -f "\$SCRIPT_DIR/\$UPLOADS_ARCHIVE" ]; then
  echo "ℹ Intermediate files not found; restoring from packaged backup bundle"
  mkdir -p "\$WORK_DIR"
  if [ -f "\$SCRIPT_DIR/\$COMPLETE_ARCHIVE" ]; then
    tar -xzf "\$SCRIPT_DIR/\$COMPLETE_ARCHIVE" -C "\$WORK_DIR"
    SOURCE_DIR="\$WORK_DIR"
  elif [ -f "\$SCRIPT_DIR/\$COMPLETE_ZIP" ]; then
    extract_zip "\$SCRIPT_DIR/\$COMPLETE_ZIP" "\$WORK_DIR"
    if [ -f "\$WORK_DIR/\$COMPLETE_ARCHIVE" ]; then
      tar -xzf "\$WORK_DIR/\$COMPLETE_ARCHIVE" -C "\$WORK_DIR"
      SOURCE_DIR="\$WORK_DIR"
    else
      echo "❌ Complete archive not found inside \$COMPLETE_ZIP"
      exit 1
    fi
  else
    echo "❌ No restore source found (expected intermediate files, \$COMPLETE_ARCHIVE, or \$COMPLETE_ZIP)."
    exit 1
  fi
fi

if [ ! -f "\$SOURCE_DIR/\$DB_SQL" ] || [ ! -f "\$SOURCE_DIR/\$CODE_ARCHIVE" ] || [ ! -f "\$SOURCE_DIR/\$UPLOADS_ARCHIVE" ]; then
  echo "❌ Required restore files are missing for timestamp \$TIMESTAMP"
  exit 1
fi

echo "📂 Preparing restore directory..."
mkdir -p "\$TARGET_ROOT/code" "\$TARGET_ROOT/uploads"

echo "🗄 Restoring database from SQL dump..."
docker exec -i "\$DB_CONTAINER" psql -U "\$DB_USER" "\$DB_NAME" < "\$SOURCE_DIR/\$DB_SQL"

echo "📦 Extracting code archive..."
tar -xzf "\$SOURCE_DIR/\$CODE_ARCHIVE" -C "\$TARGET_ROOT/code"

echo "📦 Extracting uploads archive..."
tar -xzf "\$SOURCE_DIR/\$UPLOADS_ARCHIVE" -C "\$TARGET_ROOT/uploads"

echo ""
echo "✅ Restore steps completed"
echo "Code extracted to:    \$TARGET_ROOT/code"
echo "Uploads extracted to: \$TARGET_ROOT/uploads"
echo ""
echo "If needed next:"
echo "  1) copy .env into restored code directory"
echo "  2) run npm install && npm run build"
echo "  3) run docker-compose up -d from restored code path"
EOF
chmod +x "$BACKUP_DIR/$RESTORE_SCRIPT"

echo "📦 Creating complete backup bundle..."
tar -czf "$BACKUP_DIR/$COMPLETE_ARCHIVE" \
  -C "$BACKUP_DIR" \
  "$DB_SQL" \
  "$DB_DUMP" \
  "$CODE_ARCHIVE" \
  "$UPLOADS_ARCHIVE" \
  "$SCHEMA_BACKUP" \
  "$SEED_BACKUP" \
  "$INSPECT_DB" \
  "$INSPECT_APP" \
  "$DOCKER_VOLUMES" \
  "$DOCKER_ANALYSIS" \
  "BACKUP_INVENTORY.txt" \
  "verify_backups.sh" \
  "backup_all.sh" \
  "$RESTORE_SCRIPT"

echo "📦 Creating zip wrapper..."
if command -v zip >/dev/null 2>&1; then
  zip -j -q "$BACKUP_DIR/$COMPLETE_ZIP" "$BACKUP_DIR/$COMPLETE_ARCHIVE"
else
  echo "  ⚠ zip not found; creating zip using Python"
  python3 - "$BACKUP_DIR/$COMPLETE_ARCHIVE" "$BACKUP_DIR/$COMPLETE_ZIP" <<'PY'
import sys
import zipfile
from pathlib import Path

source = Path(sys.argv[1])
target = Path(sys.argv[2])
with zipfile.ZipFile(target, 'w', zipfile.ZIP_DEFLATED) as zf:
    zf.write(source, arcname=source.name)
PY
fi

if [ "$CLEANUP_INTERMEDIATE" = "true" ]; then
  echo "🧹 Removing intermediate files (compact mode)..."
  rm -f \
    "$BACKUP_DIR/$DB_SQL" \
    "$BACKUP_DIR/$DB_DUMP" \
    "$BACKUP_DIR/$DB_GLOBALS" \
    "$BACKUP_DIR/$CODE_ARCHIVE" \
    "$BACKUP_DIR/$UPLOADS_ARCHIVE" \
    "$BACKUP_DIR/$SCHEMA_BACKUP" \
    "$BACKUP_DIR/$SEED_BACKUP" \
    "$BACKUP_DIR/$INSPECT_DB" \
    "$BACKUP_DIR/$INSPECT_APP" \
    "$BACKUP_DIR/$DOCKER_VOLUMES" \
    "$BACKUP_DIR/$DOCKER_ANALYSIS" \
    "$BACKUP_DIR/BACKUP_INVENTORY.txt" \
    "$BACKUP_DIR/$COMPLETE_ARCHIVE"
fi

echo "🧹 Applying retention policy (keep last $RETENTION_COUNT backups per type)..."
prune_by_pattern() {
  local pattern="$1"
  mapfile -t files < <(ls -1t "$BACKUP_DIR"/$pattern 2>/dev/null || true)
  if [ "${#files[@]}" -gt "$RETENTION_COUNT" ]; then
    for old_file in "${files[@]:$RETENTION_COUNT}"; do
      rm -f "$old_file"
      echo "  removed $(basename "$old_file")"
    done
  fi
}

prune_by_pattern 'popup_play_db_*.sql'
prune_by_pattern 'popup_play_db_*.dump'
prune_by_pattern 'popup_play_globals_*.sql'
prune_by_pattern 'popup_play_code_*.tar.gz'
prune_by_pattern 'popup_play_uploads_*.tar.gz'
prune_by_pattern 'schema_backup_*.sql'
prune_by_pattern 'seed_backup_*.sql'
prune_by_pattern 'docker_postgres_inspection_*.json'
prune_by_pattern 'docker_app_inspection_*.json'
prune_by_pattern 'docker_volumes_*.txt'
prune_by_pattern 'DOCKER_ANALYSIS_*.md'
prune_by_pattern 'popup_play_complete_backup_*.tar.gz'
prune_by_pattern 'popup_play_complete_backup_*.zip'
prune_by_pattern 'restore_backup_*.sh'

echo ""
echo "✅ Backup completed successfully"
if [ "$CLEANUP_INTERMEDIATE" = "true" ]; then
  echo "Primary artifact: $COMPLETE_ZIP"
else
  echo "Primary artifact: $COMPLETE_ARCHIVE"
  echo "Zip wrapper:      $COMPLETE_ZIP"
fi
echo "Restore script:   $RESTORE_SCRIPT"
echo "Run verification:  bash $BACKUP_DIR/verify_backups.sh"
