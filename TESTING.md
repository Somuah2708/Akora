# Media Editing Verification

This guide outlines manual and automated checks for the updated media editor.

## Manual QA

1. Launch create-post screen and pick a video (<60s).
   - Trim handles appear with floating time labels while dragging.
2. Drag start/end handles:
   - Handles snap smoothly to ~0.05s increments for short clips.
   - Minimum gap (~0.3s) is enforced.
3. Play video in trim mode:
   - Playback loops within trimmed range.
4. Toggle mute control:
   - Audio mutes/unmutes immediately.
5. Tap Done:
   - Video uploads in create flow; console shows metadata.
6. (Dev build) Inspect trimmed file (using validateVideo helper or external player):
   - Duration ≈ trim span, audio removed when muted.

## Automated Helper

Use `validateVideo(uri, expectedDuration, muted)` from `lib/videoValidation.ts` in dev builds to spot mismatches.
