import { supabase } from '@/lib/supabase';

function randomId() {
  // Simple UUID-ish fallback for RN
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

const mimeByExt: Record<string, string> = {
  pdf: 'application/pdf',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
  gif: 'image/gif',
};

export async function uploadProofFromUri(uri: string, userId: string): Promise<{ path: string }> {
  const res = await fetch(uri);
  const arrayBuffer = await res.arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);
  const extGuess = (uri.split('.').pop() || 'pdf').toLowerCase();
  const contentType = mimeByExt[extGuess] || 'application/octet-stream';

  const fileName = `${randomId()}.${extGuess}`;
  const path = `${userId}/${fileName}`;

  const { error } = await supabase.storage.from('proofs').upload(path, bytes, {
    contentType,
    upsert: false,
  });
  if (error) throw error;
  return { path };
}

export async function getSignedProofUrl(path: string, expiresInSeconds = 3600): Promise<string | null> {
  if (!path) return null;
  // If it's already a URL, return as-is
  if (/^https?:\/\//i.test(path)) return path;
  const { data, error } = await supabase.storage.from('proofs').createSignedUrl(path, expiresInSeconds);
  if (error) return null;
  return data?.signedUrl ?? null;
}
