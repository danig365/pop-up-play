#!/bin/bash

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║     POP-UP-PLAY BACKUP VERIFICATION SCRIPT                    ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

BACKUP_DIR="/root/pop-up-play/backups"
ERRORS=0
WARNINGS=0

echo "📋 BACKUP LOCATION: $BACKUP_DIR"
echo ""

# Check if backup directory exists
if [ ! -d "$BACKUP_DIR" ]; then
    echo "❌ ERROR: Backup directory not found!"
    exit 1
fi

echo "🔍 VERIFYING BACKUP FILES..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Database backups
echo "📊 DATABASE BACKUPS:"
if ls "$BACKUP_DIR"/popup_play_db_*.sql 1> /dev/null 2>&1; then
    for file in "$BACKUP_DIR"/popup_play_db_*.sql; do
        size=$(du -h "$file" | cut -f1)
        lines=$(wc -l < "$file")
        echo "  ✓ $(basename $file) - $size ($lines SQL statements)"
    done
else
    echo "  ⚠ No SQL backups found"
    ((WARNINGS++))
fi

echo ""

if ls "$BACKUP_DIR"/popup_play_db_*.dump 1> /dev/null 2>&1; then
    for file in "$BACKUP_DIR"/popup_play_db_*.dump; do
        size=$(du -h "$file" | cut -f1)
        echo "  ✓ $(basename $file) - $size (custom format)"
    done
else
    echo "  ⚠ No custom format backups found"
    ((WARNINGS++))
fi

echo ""
echo "📦 CODE BACKUPS:"
if ls "$BACKUP_DIR"/popup_play_code_*.tar.gz 1> /dev/null 2>&1; then
    for file in "$BACKUP_DIR"/popup_play_code_*.tar.gz; do
        size=$(du -h "$file" | cut -f1)
        # Test tar integrity
        if tar -tzf "$file" > /dev/null 2>&1; then
            files=$(tar -tzf "$file" | wc -l)
            echo "  ✓ $(basename $file) - $size ($files files, VALID ✓)"
        else
            echo "  ✗ $(basename $file) - CORRUPTED!"
            ((ERRORS++))
        fi
    done
else
    echo "  ❌ No code backups found"
    ((ERRORS++))
fi

echo ""
echo "📄 SCHEMA & DOCUMENTATION:"
if [ -f "$BACKUP_DIR/schema_backup_"*.sql ]; then
    schema_file=$(ls "$BACKUP_DIR"/schema_backup_*.sql | head -1)
    size=$(du -h "$schema_file" | cut -f1)
    echo "  ✓ Schema backup - $size"
else
    echo "  ⚠ No schema backup"
    ((WARNINGS++))
fi

if [ -f "$BACKUP_DIR/seed_backup_"*.sql ]; then
    seed_file=$(ls "$BACKUP_DIR"/seed_backup_*.sql | head -1)
    size=$(du -h "$seed_file" | cut -f1)
    echo "  ✓ Seed data backup - $size"
fi

if [ -f "$BACKUP_DIR"/DOCKER_ANALYSIS_*.md ]; then
    echo "  ✓ Docker analysis documentation"
fi

if [ -f "$BACKUP_DIR/BACKUP_INVENTORY.txt" ]; then
    echo "  ✓ Backup inventory"
fi

if [ -f "$BACKUP_DIR/DOCKER_COMPREHENSIVE_REPORT.txt" ]; then
    echo "  ✓ Comprehensive Docker report"
fi

echo ""
echo "🐳 DOCKER INSPECTION FILES:"
if ls "$BACKUP_DIR"/docker_*_inspection_*.json 1> /dev/null 2>&1; then
    for file in "$BACKUP_DIR"/docker_*_inspection_*.json; do
        size=$(du -h "$file" | cut -f1)
        if python3 -m json.tool "$file" > /dev/null 2>&1; then
            echo "  ✓ $(basename $file) - $size (VALID JSON ✓)"
        else
            echo "  ✗ $(basename $file) - Invalid JSON!"
            ((ERRORS++))
        fi
    done
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Summary statistics
echo "📊 BACKUP STATISTICS:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
total_size=$(du -sh "$BACKUP_DIR" | cut -f1)
total_files=$(ls -1 "$BACKUP_DIR" | wc -l)
db_size=$(du -sh "$BACKUP_DIR"/popup_play_db_* 2>/dev/null | awk '{sum+=$1} END {print sum}')
code_size=$(du -sh "$BACKUP_DIR"/popup_play_code_* 2>/dev/null | awk '{s=$1} END {print s}')

echo "  Total Files: $total_files"
echo "  Total Size: $total_size"
echo "  Database Backups: $db_size"
echo "  Code Backups: $code_size"
echo "  Created: $(date)"
echo ""

# Health check
echo "💊 BACKUP HEALTH CHECK:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if [ $ERRORS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
    echo "  ✓ All backups verified successfully!"
    echo "  Status: HEALTHY ✓"
elif [ $ERRORS -eq 0 ]; then
    echo "  ⚠ Minor warnings found"
    echo "  Status: ACCEPTABLE"
else
    echo "  ✗ Critical errors found"
    echo "  Status: NEEDS ATTENTION"
fi

echo ""
echo "Errors: $ERRORS | Warnings: $WARNINGS"
echo ""

if [ $ERRORS -gt 0 ]; then
    exit 1
else
    exit 0
fi
