import { Platform } from 'react-native';

export type CloudinaryProcessOptions = {
  trimStart?: number;
  trimEnd?: number;
  muted?: boolean;
};

const CLOUD_NAME = process.env.EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME;
const UPLOAD_PRESET = process.env.EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

export function isCloudinaryConfigured() {
  return !!CLOUD_NAME && !!UPLOAD_PRESET;
}

// Uploads the local file to Cloudinary unsigned preset, then returns a transformed URL
export async function processVideoWithCloudinary(
  localUri: string,
  opts: CloudinaryProcessOptions
): Promise<string> {
  if (!CLOUD_NAME || !UPLOAD_PRESET) throw new Error('Cloudinary not configured');

  const form = new FormData();
  form.append('upload_preset', UPLOAD_PRESET);
  form.append('file', {
    uri: localUri,
    // these names are hints; Cloudinary detects type automatically
    name: `upload_${Date.now()}.mp4`,
    type: Platform.OS === 'ios' ? 'video/quicktime' : 'video/mp4',
  } as any);

  const uploadRes = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/auto/upload`, {
    method: 'POST',
    body: form,
  });
  if (!uploadRes.ok) throw new Error('Cloudinary upload failed');
  const data = await uploadRes.json();
  const publicId = data.public_id as string;
  const format = (data.format || 'mp4') as string;

  const parts: string[] = [];
  if (opts.trimStart != null) parts.push(`so_${Math.max(0, opts.trimStart)}`);
  if (opts.trimEnd != null && opts.trimStart != null && opts.trimEnd > opts.trimStart) {
    parts.push(`eo_${opts.trimEnd}`);
  }
  if (opts.muted) parts.push('ac_none');
  const transform = parts.join(',');

  // Construct derived URL
  const transformed = transform
    ? `https://res.cloudinary.com/${CLOUD_NAME}/video/upload/${transform}/${publicId}.${format}`
    : (data.secure_url as string);

  return transformed;
}
