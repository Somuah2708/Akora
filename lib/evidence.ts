import { supabase } from '@/lib/supabase';

// Evidence upload helper for recommendation activity documents (private bucket 'evidence').
// Mirrors style of lib/storage.ts (proofs) but supports multi-file batching.

function randomId() {
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
  txt: 'text/plain',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
};

export interface EvidenceFileInput {
  uri: string; // React Native / web fetchable URI
  name?: string; // optional original filename
  mimeType?: string; // override
}

export interface UploadedEvidence {
  path: string; // storage path inside bucket
  originalName?: string;
}

/**
 * Upload a single evidence file. Returns its storage path.
 */
export async function uploadEvidenceFile(input: EvidenceFileInput, userId: string, requestId: string): Promise<UploadedEvidence> {
  const { uri, name, mimeType } = input;
  const res = await fetch(uri);
  const blob = await res.blob();
  const extGuess = (name?.split('.').pop() || uri.split('.').pop() || 'pdf').toLowerCase();
  const contentType = mimeType || mimeByExt[extGuess] || 'application/octet-stream';

  const fileName = `${randomId()}.${extGuess}`;
  const path = `${userId}/${requestId}/${fileName}`;

  const { error } = await supabase.storage.from('evidence').upload(path, blob, {
    contentType,
    upsert: false,
  });
  if (error) throw error;
  return { path, originalName: name };
}

/**
 * Batch upload multiple evidence files. Stops & throws on first failure.
 */
export async function uploadEvidenceFiles(files: EvidenceFileInput[], userId: string, requestId: string): Promise<UploadedEvidence[]> {
  const results: UploadedEvidence[] = [];
  for (const f of files) {
    const uploaded = await uploadEvidenceFile(f, userId, requestId);
    results.push(uploaded);
  }
  return results;
}

/**
 * Generate a signed URL for a single evidence path (private bucket).
 */
export async function getSignedEvidenceUrl(path: string, expiresInSeconds = 3600): Promise<string | null> {
  if (!path) return null;
  if (/^https?:\/\//i.test(path)) return path; // already a full URL
  const { data, error } = await supabase.storage.from('evidence').createSignedUrl(path, expiresInSeconds);
  if (error) return null;
  return data?.signedUrl ?? null;
}

/**
 * Batch signed URLs resolution.
 */
export async function getSignedEvidenceUrls(paths: string[], expiresInSeconds = 3600): Promise<(string | null)[]> {
  return Promise.all(paths.map((p) => getSignedEvidenceUrl(p, expiresInSeconds)));
}

/**
 * Delete a single evidence file (owner or admin/staff enforced via RLS policies).
 */
export async function deleteEvidenceFile(path: string): Promise<boolean> {
  if (!path) return false;
  const { error } = await supabase.storage.from('evidence').remove([path]);
  return !error;
}

/**
 * Replace existing evidence set: deletes old paths not retained & uploads new ones.
 * Returns final list of paths.
 */
export async function replaceEvidenceFiles(options: {
  existingPaths: string[];
  retainPaths: string[]; // subset of existingPaths to keep
  newFiles: EvidenceFileInput[];
  userId: string;
  requestId: string;
}): Promise<string[]> {
  const { existingPaths, retainPaths, newFiles, userId, requestId } = options;
  const toDelete = existingPaths.filter((p) => !retainPaths.includes(p));
  if (toDelete.length) {
    await supabase.storage.from('evidence').remove(toDelete);
  }
  const uploaded: UploadedEvidence[] = await uploadEvidenceFiles(newFiles, userId, requestId);
  return [...retainPaths, ...uploaded.map((u) => u.path)];
}

/**
 * Utility: Convert array of evidence paths to signed URL mapping object.
 */
export async function mapEvidenceSignedUrls(paths: string[], expiresInSeconds = 3600): Promise<Record<string, string | null>> {
  const signed = await getSignedEvidenceUrls(paths, expiresInSeconds);
  return paths.reduce<Record<string, string | null>>((acc, p, i) => {
    acc[p] = signed[i];
    return acc;
  }, {});
}
