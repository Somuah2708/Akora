// Simple video validation utilities using ffmpeg-kit-react-native (if available)
// Verifies approximate duration and presence/absence of audio stream for muted videos.

let FFprobeKit: any = null;
try {
  const fm = require('ffmpeg-kit-react-native');
  FFprobeKit = fm.FFprobeKit;
} catch (e) {
  // silent
}

export type VideoValidationResult = {
  duration?: number;
  hasAudio?: boolean;
  expectedDuration?: number;
  mutedExpected?: boolean;
  durationMatches?: boolean;
  audioMatches?: boolean;
  raw?: any;
};

export async function validateVideo(
  uri: string,
  expectedDuration?: number,
  mutedExpected?: boolean,
  toleranceSeconds: number = 0.35
): Promise<VideoValidationResult> {
  if (!FFprobeKit) {
    return {
      expectedDuration,
      mutedExpected,
      durationMatches: false,
      audioMatches: false,
    };
  }
  try {
    const probeSession = await FFprobeKit.getMediaInformation(uri);
    const info = probeSession.getMediaInformation();
    const streams = info?.getStreams() || [];
    const duration = info?.getDuration() ? parseFloat(info.getDuration()) : undefined;
    const audioStream = streams.find((s: any) => s.getType && s.getType() === 'audio');
    const hasAudio = !!audioStream;
    const durationMatches =
      duration !== undefined && expectedDuration !== undefined
        ? Math.abs(duration - expectedDuration) <= toleranceSeconds
        : false;
    const audioMatches = mutedExpected !== undefined ? (mutedExpected ? !hasAudio : hasAudio) : false;
    return {
      duration,
      hasAudio,
      expectedDuration,
      mutedExpected,
      durationMatches,
      audioMatches,
      raw: info,
    };
  } catch (e) {
    return { expectedDuration, mutedExpected, raw: { error: String(e) } };
  }
}
