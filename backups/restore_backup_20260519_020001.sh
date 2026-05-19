#!/bin/bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TIMESTAMP="20260519_020001"

DB_CONTAINER="${DB_CONTAINER:-dfaeccc51586_pop-up-play-db}"
APP_CONTAINER="${APP_CONTAINER:-pop-up-play-app}"
DB_USER="${DB_USER:-popupapp}"
DB_NAME="${DB_NAME:-popup_play_db}"
TARGET_ROOT="${TARGET_ROOT:-/tmp/popup_play_restore_$TIMESTAMP}"

DB_SQL="popup_play_db_${TIMESTAMP}.sql"
CODE_ARCHIVE="popup_play_code_${TIMESTAMP}.tar.gz"
UPLOADS_ARCHIVE="popup_play_uploads_${TIMESTAMP}.tar.gz"
COMPLETE_ARCHIVE="popup_play_complete_backup_${TIMESTAMP}.tar.gz"
COMPLETE_ZIP="popup_play_complete_backup_${TIMESTAMP}.zip"
SOURCE_DIR="$SCRIPT_DIR"
WORK_DIR="$TARGET_ROOT/bundle_$TIMESTAMP"

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║        POP-UP-PLAY RESTORE SCRIPT (TIMESTAMPED SET)          ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""
echo "Backup set: $TIMESTAMP"
echo "Source dir: $SCRIPT_DIR"
echo "Target dir: $TARGET_ROOT"
echo ""

command -v docker >/dev/null 2>&1 || { echo "❌ docker command not found"; exit 1; }
command -v tar >/dev/null 2>&1 || { echo "❌ tar command not found"; exit 1; }

extract_zip() {
  local src_zip="$1"
  local dest_dir="$2"
  mkdir -p "$dest_dir"
  if command -v unzip >/dev/null 2>&1; then
    unzip -qo "$src_zip" -d "$dest_dir"
  elif command -v python3 >/dev/null 2>&1; then
    python3 - "$src_zip" "$dest_dir" <<'PY'
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
    echo "❌ Need unzip or python3 to extract $src_zip"
    exit 1
  fi
}

if ! docker ps --format '{{.Names}}' | grep -qx "$DB_CONTAINER"; then
  echo "❌ Database container '$DB_CONTAINER' is not running."
  exit 1
fi

if [ ! -f "$SCRIPT_DIR/$DB_SQL" ] || [ ! -f "$SCRIPT_DIR/$CODE_ARCHIVE" ] || [ ! -f "$SCRIPT_DIR/$UPLOADS_ARCHIVE" ]; then
  echo "ℹ Intermediate files not found; restoring from packaged backup bundle"
  mkdir -p "$WORK_DIR"
  if [ -f "$SCRIPT_DIR/$COMPLETE_ARCHIVE" ]; then
    tar -xzf "$SCRIPT_DIR/$COMPLETE_ARCHIVE" -C "$WORK_DIR"
    SOURCE_DIR="$WORK_DIR"
  elif [ -f "$SCRIPT_DIR/$COMPLETE_ZIP" ]; then
    extract_zip "$SCRIPT_DIR/$COMPLETE_ZIP" "$WORK_DIR"
    if [ -f "$WORK_DIR/$COMPLETE_ARCHIVE" ]; then
      tar -xzf "$WORK_DIR/$COMPLETE_ARCHIVE" -C "$WORK_DIR"
      SOURCE_DIR="$WORK_DIR"
    else
      echo "❌ Complete archive not found inside $COMPLETE_ZIP"
      exit 1
    fi
  else
    echo "❌ No restore source found (expected intermediate files, $COMPLETE_ARCHIVE, or $COMPLETE_ZIP)."
    exit 1
  fi
fi

if [ ! -f "$SOURCE_DIR/$DB_SQL" ] || [ ! -f "$SOURCE_DIR/$CODE_ARCHIVE" ] || [ ! -f "$SOURCE_DIR/$UPLOADS_ARCHIVE" ]; then
  echo "❌ Required restore files are missing for timestamp $TIMESTAMP"
  exit 1
fi

echo "📂 Preparing restore directory..."
mkdir -p "$TARGET_ROOT/code" "$TARGET_ROOT/uploads"

echo "🗄 Restoring database from SQL dump..."
docker exec -i "$DB_CONTAINER" psql -U "$DB_USER" "$DB_NAME" < "$SOURCE_DIR/$DB_SQL"

echo "📦 Extracting code archive..."
tar -xzf "$SOURCE_DIR/$CODE_ARCHIVE" -C "$TARGET_ROOT/code"

echo "📦 Extracting uploads archive..."
tar -xzf "$SOURCE_DIR/$UPLOADS_ARCHIVE" -C "$TARGET_ROOT/uploads"

echo ""
echo "✅ Restore steps completed"
echo "Code extracted to:    $TARGET_ROOT/code"
echo "Uploads extracted to: $TARGET_ROOT/uploads"
echo ""
echo "If needed next:"
echo "  1) copy .env into restored code directory"
echo "  2) run npm install && npm run build"
echo "  3) run docker-compose up -d from restored code path"
