#!/bin/bash
# =============================================================================
# POP-UP-PLAY CRON INSTALLER
# Run this script ONCE on the HOST machine to install/remove the daily backup
# cron job. The backup runs every day at 2:00 AM server local time.
# =============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DAILY_SCRIPT="$SCRIPT_DIR/daily_backup.sh"
LOG_FILE="$SCRIPT_DIR/backup.log"

# Cron schedule: daily at 2:00 AM
CRON_SCHEDULE="0 2 * * *"
CRON_JOB="$CRON_SCHEDULE $DAILY_SCRIPT >> $LOG_FILE 2>&1"
CRON_MARKER="# pop-up-play-daily-backup"

COMMAND="${1:-install}"

case "$COMMAND" in

  install)
    # Ensure the daily script is executable
    chmod +x "$DAILY_SCRIPT"

    # Remove any existing entry for this job
    crontab -l 2>/dev/null | grep -v "$CRON_MARKER" > /tmp/popup_crontab.tmp || true

    # Append the new cron entry
    echo "$CRON_JOB $CRON_MARKER" >> /tmp/popup_crontab.tmp
    crontab /tmp/popup_crontab.tmp
    rm -f /tmp/popup_crontab.tmp

    echo "✅ Daily backup cron job installed."
    echo ""
    echo "Schedule : $CRON_SCHEDULE (every day at 2:00 AM)"
    echo "Script   : $DAILY_SCRIPT"
    echo "Log file : $LOG_FILE"
    echo ""
    echo "Verify with:  crontab -l"
    echo "Remove with:  bash $SCRIPT_DIR/setup_cron.sh remove"
    ;;

  remove)
    crontab -l 2>/dev/null | grep -v "$CRON_MARKER" > /tmp/popup_crontab.tmp || true
    crontab /tmp/popup_crontab.tmp
    rm -f /tmp/popup_crontab.tmp
    echo "✅ Daily backup cron job removed."
    ;;

  status)
    echo "=== Current crontab entries for pop-up-play ==="
    crontab -l 2>/dev/null | grep "$CRON_MARKER" || echo "(none installed)"
    echo ""
    echo "=== Last 20 backup log lines ==="
    if [ -f "$LOG_FILE" ]; then
      tail -20 "$LOG_FILE"
    else
      echo "(no log file yet)"
    fi
    ;;

  test)
    echo "🔔 Running backup now as a test (output to terminal + log)..."
    bash "$DAILY_SCRIPT"
    ;;

  *)
    echo "Usage: $0 [install|remove|status|test]"
    echo ""
    echo "  install  — Add daily 2 AM cron job (default)"
    echo "  remove   — Remove the cron job"
    echo "  status   — Show cron status and last log lines"
    echo "  test     — Run backup immediately for testing"
    exit 1
    ;;
esac
