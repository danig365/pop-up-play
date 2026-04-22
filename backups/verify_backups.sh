#!/bin/bash

set -euo pipefail

BACKUP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ERRORS=0
WARNINGS=0
TMP_ROOT=""

cleanup() {
  if [ -n "$TMP_ROOT" ] && [ -d "$TMP_ROOT" ]; then
    rm -rf "$TMP_ROOT"
  fi
}
trap cleanup EXIT

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║        POP-UP-PLAY BACKUP VERIFICATION (LATEST SET)          ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""
echo "📋 Backup directory: $BACKUP_DIR"
echo ""

shopt -s nullglob

complete_zips=("$BACKUP_DIR"/popup_play_complete_backup_*.zip)
complete_archives=("$BACKUP_DIR"/popup_play_complete_backup_*.tar.gz)

if [ ${#complete_zips[@]} -eq 0 ] && [ ${#complete_archives[@]} -eq 0 ]; then
  echo "❌ No complete backup bundle found (.zip or .tar.gz)."
  exit 1
fi

latest_zip=""
latest_tar=""
latest_complete=""
TIMESTAMP=""

if [ ${#complete_zips[@]} -gt 0 ]; then
  latest_zip="$(ls -1t "$BACKUP_DIR"/popup_play_complete_backup_*.zip | head -1)"
fi

if [ ${#complete_archives[@]} -gt 0 ]; then
  latest_tar="$(ls -1t "$BACKUP_DIR"/popup_play_complete_backup_*.tar.gz | head -1)"
fi

if [ -n "$latest_zip" ]; then
  latest_complete="$latest_zip"
  latest_base="$(basename "$latest_zip")"
  TIMESTAMP="${latest_base#popup_play_complete_backup_}"
  TIMESTAMP="${TIMESTAMP%.zip}"
elif [ -n "$latest_tar" ]; then
  latest_complete="$latest_tar"
  latest_base="$(basename "$latest_tar")"
  TIMESTAMP="${latest_base#popup_play_complete_backup_}"
  TIMESTAMP="${TIMESTAMP%.tar.gz}"
fi

COMPLETE_ZIP="$BACKUP_DIR/popup_play_complete_backup_${TIMESTAMP}.zip"
COMPLETE_TAR="$BACKUP_DIR/popup_play_complete_backup_${TIMESTAMP}.tar.gz"

DB_SQL="$BACKUP_DIR/popup_play_db_${TIMESTAMP}.sql"
DB_DUMP="$BACKUP_DIR/popup_play_db_${TIMESTAMP}.dump"
CODE_ARCHIVE="$BACKUP_DIR/popup_play_code_${TIMESTAMP}.tar.gz"
UPLOADS_ARCHIVE="$BACKUP_DIR/popup_play_uploads_${TIMESTAMP}.tar.gz"
SCHEMA_BACKUP="$BACKUP_DIR/schema_backup_${TIMESTAMP}.sql"
SEED_BACKUP="$BACKUP_DIR/seed_backup_${TIMESTAMP}.sql"
INSPECT_DB="$BACKUP_DIR/docker_postgres_inspection_${TIMESTAMP}.json"
INSPECT_APP="$BACKUP_DIR/docker_app_inspection_${TIMESTAMP}.json"
DOCKER_VOLUMES="$BACKUP_DIR/docker_volumes_${TIMESTAMP}.txt"
DOCKER_ANALYSIS="$BACKUP_DIR/DOCKER_ANALYSIS_${TIMESTAMP}.md"
INVENTORY_FILE="$BACKUP_DIR/BACKUP_INVENTORY.txt"
RESTORE_SCRIPT="$BACKUP_DIR/restore_backup_${TIMESTAMP}.sh"

SOURCE_ROOT="$BACKUP_DIR"

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
    echo "❌ Need unzip or python3 to read zip backup"
    exit 1
  fi
}

prepare_source_root() {
  local needs_extract=0
  [ -f "$DB_SQL" ] || needs_extract=1
  [ -f "$DB_DUMP" ] || needs_extract=1
  [ -f "$CODE_ARCHIVE" ] || needs_extract=1
  [ -f "$UPLOADS_ARCHIVE" ] || needs_extract=1

  if [ "$needs_extract" -eq 0 ]; then
    return
  fi

  TMP_ROOT="$(mktemp -d)"
  local work_dir="$TMP_ROOT/work"
  mkdir -p "$work_dir"

  local tar_source=""
  if [ -f "$COMPLETE_TAR" ]; then
    tar_source="$COMPLETE_TAR"
  elif [ -f "$COMPLETE_ZIP" ]; then
    extract_zip "$COMPLETE_ZIP" "$work_dir"
    if [ -f "$work_dir/popup_play_complete_backup_${TIMESTAMP}.tar.gz" ]; then
      tar_source="$work_dir/popup_play_complete_backup_${TIMESTAMP}.tar.gz"
    else
      echo "❌ Could not find tar archive inside zip bundle"
      exit 1
    fi
  else
    echo "❌ Missing complete backup bundle for extraction"
    exit 1
  fi

  mkdir -p "$work_dir/extracted"
  tar -xzf "$tar_source" -C "$work_dir/extracted"
  SOURCE_ROOT="$work_dir/extracted"

  DB_SQL="$SOURCE_ROOT/popup_play_db_${TIMESTAMP}.sql"
  DB_DUMP="$SOURCE_ROOT/popup_play_db_${TIMESTAMP}.dump"
  CODE_ARCHIVE="$SOURCE_ROOT/popup_play_code_${TIMESTAMP}.tar.gz"
  UPLOADS_ARCHIVE="$SOURCE_ROOT/popup_play_uploads_${TIMESTAMP}.tar.gz"
  SCHEMA_BACKUP="$SOURCE_ROOT/schema_backup_${TIMESTAMP}.sql"
  SEED_BACKUP="$SOURCE_ROOT/seed_backup_${TIMESTAMP}.sql"
  INSPECT_DB="$SOURCE_ROOT/docker_postgres_inspection_${TIMESTAMP}.json"
  INSPECT_APP="$SOURCE_ROOT/docker_app_inspection_${TIMESTAMP}.json"
  DOCKER_VOLUMES="$SOURCE_ROOT/docker_volumes_${TIMESTAMP}.txt"
  DOCKER_ANALYSIS="$SOURCE_ROOT/DOCKER_ANALYSIS_${TIMESTAMP}.md"
  INVENTORY_FILE="$SOURCE_ROOT/BACKUP_INVENTORY.txt"
}

check_exists() {
  local file="$1"
  local label="$2"
  if [ -f "$file" ]; then
    local size
    size="$(du -h "$file" | cut -f1)"
    echo "  ✓ $label: $(basename "$file") ($size)"
  else
    echo "  ✗ $label missing: $(basename "$file")"
    ERRORS=$((ERRORS + 1))
  fi
}

check_nonempty() {
  local file="$1"
  local label="$2"
  if [ -s "$file" ]; then
    echo "  ✓ $label is non-empty"
  else
    echo "  ✗ $label is empty"
    ERRORS=$((ERRORS + 1))
  fi
}

check_tar() {
  local file="$1"
  local label="$2"
  if tar -tzf "$file" >/dev/null 2>&1; then
    local count
    count="$(tar -tzf "$file" | wc -l)"
    echo "  ✓ $label valid tar.gz ($count entries)"
  else
    echo "  ✗ $label corrupted or unreadable"
    ERRORS=$((ERRORS + 1))
  fi
}

check_json() {
  local file="$1"
  local label="$2"
  if command -v python3 >/dev/null 2>&1; then
    if python3 -m json.tool "$file" >/dev/null 2>&1; then
      echo "  ✓ $label valid JSON"
    else
      echo "  ✗ $label invalid JSON"
      ERRORS=$((ERRORS + 1))
    fi
  else
    echo "  ⚠ python3 not available; skipped JSON validation for $label"
    WARNINGS=$((WARNINGS + 1))
  fi
}

check_zip() {
  local file="$1"
  local label="$2"
  if command -v unzip >/dev/null 2>&1; then
    if unzip -t "$file" >/dev/null 2>&1; then
      echo "  ✓ $label valid zip"
    else
      echo "  ✗ $label corrupted or unreadable"
      ERRORS=$((ERRORS + 1))
    fi
  elif command -v python3 >/dev/null 2>&1; then
    if python3 - "$file" <<'PY'
import sys
import zipfile

path = sys.argv[1]
with zipfile.ZipFile(path, 'r') as zf:
    bad = zf.testzip()
    if bad is not None:
        raise SystemExit(1)
PY
    then
      echo "  ✓ $label valid zip"
    else
      echo "  ✗ $label corrupted or unreadable"
      ERRORS=$((ERRORS + 1))
    fi
  else
    echo "  ⚠ unzip/python3 not available; skipped zip validation for $label"
    WARNINGS=$((WARNINGS + 1))
  fi
}

echo "🧩 Target backup set timestamp: $TIMESTAMP"
echo ""

prepare_source_root

echo "📦 Core artifacts"
if [ -f "$COMPLETE_ZIP" ]; then
  check_exists "$COMPLETE_ZIP" "Zip wrapper"
else
  echo "  ⚠ Zip wrapper missing for timestamp $TIMESTAMP"
  WARNINGS=$((WARNINGS + 1))
fi
if [ -f "$COMPLETE_TAR" ]; then
  check_exists "$COMPLETE_TAR" "Complete archive"
fi
check_exists "$DB_SQL" "Database SQL dump"
check_exists "$DB_DUMP" "Database custom dump"
check_exists "$CODE_ARCHIVE" "Code archive"
check_exists "$UPLOADS_ARCHIVE" "Uploads archive"
check_exists "$SCHEMA_BACKUP" "Schema backup"
check_exists "$SEED_BACKUP" "Seed backup"
check_exists "$INSPECT_DB" "Postgres inspect"
check_exists "$INSPECT_APP" "App inspect"
check_exists "$DOCKER_VOLUMES" "Docker volumes snapshot"
check_exists "$DOCKER_ANALYSIS" "Docker analysis"
check_exists "$INVENTORY_FILE" "Inventory file"
if [ -f "$RESTORE_SCRIPT" ]; then
  check_exists "$RESTORE_SCRIPT" "Restore script"
else
  check_exists "$SOURCE_ROOT/restore_backup_${TIMESTAMP}.sh" "Restore script (bundled)"
fi
echo ""

echo "🔍 Integrity checks"
[ -f "$COMPLETE_TAR" ] && check_tar "$COMPLETE_TAR" "Complete archive"
[ -f "$CODE_ARCHIVE" ] && check_tar "$CODE_ARCHIVE" "Code archive"
[ -f "$UPLOADS_ARCHIVE" ] && check_tar "$UPLOADS_ARCHIVE" "Uploads archive"
[ -f "$COMPLETE_ZIP" ] && check_zip "$COMPLETE_ZIP" "Zip wrapper"
[ -f "$DB_SQL" ] && check_nonempty "$DB_SQL" "Database SQL dump"
[ -f "$SCHEMA_BACKUP" ] && check_nonempty "$SCHEMA_BACKUP" "Schema backup"
[ -f "$SEED_BACKUP" ] && check_nonempty "$SEED_BACKUP" "Seed backup"
if [ -f "$RESTORE_SCRIPT" ]; then
  [ -x "$RESTORE_SCRIPT" ] && echo "  ✓ Restore script is executable"
  [ ! -x "$RESTORE_SCRIPT" ] && { echo "  ✗ Restore script is not executable"; ERRORS=$((ERRORS + 1)); }
fi
[ -f "$INSPECT_DB" ] && check_json "$INSPECT_DB" "Postgres inspect"
[ -f "$INSPECT_APP" ] && check_json "$INSPECT_APP" "App inspect"

if [ -f "$DB_DUMP" ]; then
  if command -v pg_restore >/dev/null 2>&1; then
    if pg_restore -l "$DB_DUMP" >/dev/null 2>&1; then
      echo "  ✓ Database custom dump readable by pg_restore"
    else
      echo "  ✗ Database custom dump unreadable by pg_restore"
      ERRORS=$((ERRORS + 1))
    fi
  else
    echo "  ⚠ pg_restore not available; skipped custom dump semantic check"
    WARNINGS=$((WARNINGS + 1))
  fi
fi

echo ""
echo "📊 Backup directory summary"
echo "  Total files: $(find "$BACKUP_DIR" -maxdepth 1 -type f | wc -l)"
echo "  Total size:  $(du -sh "$BACKUP_DIR" | cut -f1)"
echo ""

if [ "$ERRORS" -eq 0 ] && [ "$WARNINGS" -eq 0 ]; then
  echo "✅ Verification status: HEALTHY"
elif [ "$ERRORS" -eq 0 ]; then
  echo "⚠ Verification status: ACCEPTABLE (warnings only)"
else
  echo "❌ Verification status: FAILED"
fi

echo "Errors: $ERRORS | Warnings: $WARNINGS"

if [ "$ERRORS" -gt 0 ]; then
  exit 1
fi
