import * as FileSystem from 'expo-file-system/legacy';

export const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10MB
const IMAGE_EXT = ['jpg','jpeg','png','webp','gif'];
const DOC_EXT = ['pdf','doc','docx'];

export const getExt = (name?: string) => (name || '').split('.').pop()?.toLowerCase() || '';
export const isImageExt = (ext?: string) => IMAGE_EXT.includes((ext||'').toLowerCase());
export const isDocExt = (ext?: string) => DOC_EXT.includes((ext||'').toLowerCase());
export const isImageType = (t?: string) => t === 'image' || (t?.startsWith('image/'));

export const detectMime = (name: string, kind: 'image'|'document') => {
  const ext = getExt(name);
  if (kind === 'image') {
    if (ext === 'png') return 'image/png';
    if (ext === 'webp') return 'image/webp';
    if (ext === 'gif') return 'image/gif';
    return 'image/jpeg';
  }
  if (ext === 'pdf') return 'application/pdf';
  if (ext === 'doc') return 'application/msword';
  if (ext === 'docx') return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  return 'application/octet-stream';
};

export const badgeColorForExt = (ext: string) => {
  if (ext === 'pdf') return '#DC2626';
  if (ext === 'doc' || ext === 'docx') return '#2563EB';
  return '#6B7280';
};

export const validatePickedFile = async (uri: string, name: string, type: 'image' | 'document') => {
  try {
    const info = await FileSystem.getInfoAsync(uri);
    if (!info.exists) return false;
    if (info.size && info.size > MAX_FILE_BYTES) return false;
    const ext = getExt(name);
    if (type === 'image' && !isImageExt(ext)) return false;
    if (type === 'document' && !isDocExt(ext)) return false;
    return true;
  } catch {
    return false;
  }
};
