#!/bin/bash

################################################################################
#                   POPUP-PLAY BACKUP DOWNLOAD SCRIPT                         #
#                                                                              #
# This script downloads the complete backup from your server                  #
# Usage: Edit SERVER_IP below, then run: bash DOWNLOAD_COMMAND.sh             #
#                                                                              #
################################################################################

# ⚙️ CONFIGURATION - EDIT THESE VALUES
################################################################################

SERVER_IP="192.168.1.100"              # 👈 CHANGE THIS to your server IP
SSH_USER="root"                        # Change if different SSH user
SSH_PORT="22"                          # Change if using custom SSH port
BACKUP_FILE="popup_play_complete_backup_20260317_104606.tar.gz"
DOWNLOAD_PATH="./"                     # Current directory by default


################################################################################
# NO CHANGES NEEDED BELOW THIS LINE
################################################################################

echo "╔════════════════════════════════════════════════════════════════════════╗"
echo "║            POPUP-PLAY BACKUP DOWNLOADER                               ║"
echo "╚════════════════════════════════════════════════════════════════════════╝"
echo ""
echo "📋 Configuration:"
echo "   Server IP:     $SERVER_IP"
echo "   SSH User:      $SSH_USER"
echo "   SSH Port:      $SSH_PORT"
echo "   Backup File:   $BACKUP_FILE"
echo "   Download To:   $DOWNLOAD_PATH"
echo ""

# Validate settings
if [ "$SERVER_IP" = "192.168.1.100" ]; then
    echo "⚠️  WARNING: Using default IP 192.168.1.100"
    echo "   Please edit this script and set your actual SERVER_IP"
    echo ""
    read -p "Continue anyway? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Cancelled."
        exit 1
    fi
fi

echo "🚀 Starting download..."
echo "   From: $SSH_USER@$SERVER_IP:/root/pop-up-play/backups/$BACKUP_FILE"
echo ""

# Download using SCP
if [ "$SSH_PORT" = "22" ]; then
    # Default port
    scp "$SSH_USER@$SERVER_IP:/root/pop-up-play/backups/$BACKUP_FILE" "$DOWNLOAD_PATH"
else
    # Custom port
    scp -P "$SSH_PORT" "$SSH_USER@$SERVER_IP:/root/pop-up-play/backups/$BACKUP_FILE" "$DOWNLOAD_PATH"
fi

# Check if download was successful
if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Download successful!"
    echo ""
    echo "📊 File Information:"
    ls -lh "$DOWNLOAD_PATH$BACKUP_FILE"
    echo ""
    echo "🔍 Verifying archive integrity..."
    tar -tzf "$DOWNLOAD_PATH$BACKUP_FILE" > /dev/null
    if [ $? -eq 0 ]; then
        echo "✓ Archive is VALID"
        echo ""
        echo "📦 Archive contents:"
        tar -tzf "$DOWNLOAD_PATH$BACKUP_FILE" | head -10
        echo "   ... and more"
        echo ""
        echo "🎉 Ready to extract and restore!"
        echo ""
        echo "Next steps:"
        echo "1. Extract:  tar -xzf $BACKUP_FILE"
        echo "2. Read:     cat BACKUP_INVENTORY.txt"
        echo "3. Restore:  Follow instructions in BACKUP_INVENTORY.txt"
    else
        echo "❌ Archive verification failed!"
        exit 1
    fi
else
    echo ""
    echo "❌ Download failed!"
    echo ""
    echo "Troubleshooting:"
    echo "• Check server IP is correct: $SERVER_IP"
    echo "• Check SSH port is correct: $SSH_PORT"
    echo "• Verify SSH key is configured"
    echo "• Try manual command:"
    if [ "$SSH_PORT" = "22" ]; then
        echo "  scp $SSH_USER@$SERVER_IP:/root/pop-up-play/backups/$BACKUP_FILE ."
    else
        echo "  scp -P $SSH_PORT $SSH_USER@$SERVER_IP:/root/pop-up-play/backups/$BACKUP_FILE ."
    fi
    exit 1
fi

