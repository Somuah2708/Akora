#!/bin/bash

# Script to download a free notification sound
# Run this to add a notification sound to your project

echo "🎵 Downloading notification sound..."

# Create assets directory if it doesn't exist
mkdir -p assets

# Download a free notification sound from Mixkit
curl -L "https://assets.mixkit.co/active_storage/sfx/2354/2354.wav" -o assets/notification-temp.wav

# Check if ffmpeg is available to convert to mp3
if command -v ffmpeg &> /dev/null; then
    echo "Converting to MP3..."
    ffmpeg -i assets/notification-temp.wav -acodec libmp3lame -ab 128k assets/notification.mp3
    rm assets/notification-temp.wav
    echo "✅ Notification sound added successfully!"
    echo "📁 Location: assets/notification.mp3"
else
    echo "⚠️  ffmpeg not found. You can:"
    echo "   1. Install ffmpeg: brew install ffmpeg"
    echo "   2. Or manually convert notification-temp.wav to notification.mp3"
    echo "   3. Or download an MP3 directly from:"
    echo "      - https://mixkit.co/free-sound-effects/notification/"
    echo "      - https://notificationsounds.com/"
fi
