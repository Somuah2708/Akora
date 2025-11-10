// Notification Sound Placeholder
// 
// To add a custom notification sound:
// 1. Add an MP3 file to assets/notification.mp3
// 2. The NotificationBanner component will automatically use it
//
// For now, the app will use haptic feedback only if the sound file is not present.
//
// Recommended sound characteristics:
// - Duration: 0.3-0.5 seconds
// - Format: MP3 or M4A
// - Sample rate: 44.1 kHz
// - Bit rate: 128 kbps
// - Volume: Normalized to prevent clipping
//
// Free sound resources:
// - https://mixkit.co/free-sound-effects/notification/
// - https://freesound.org/search/?q=notification
// - https://notificationsounds.com/

export const NOTIFICATION_SOUND_PATH = require('@assets/notification.mp3');
