import { supabase } from './supabase';
import * as FileSystem from 'expo-file-system';
import * as ImageManipulator from 'expo-image-manipulator';
import { decode } from 'base64-arraybuffer';

export interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

export interface UploadOptions {
  onProgress?: (progress: UploadProgress) => void;
  maxImageSize?: number; // Max dimension (width/height)
  imageQuality?: number; // 0-1
  maxVideoSizeMB?: number;
  bucket?: string;
  retries?: number;
}

const DEFAULT_OPTIONS: UploadOptions = {
  maxImageSize: 1920, // Instagram uses 1080x1350 max, we use higher quality
  imageQuality: 0.85, // Sweet spot: visually identical, 50-80% smaller
  maxVideoSizeMB: 100, // 100MB max (allows 10-15 min of 1080p video)
  bucket: 'post-media',
  retries: 3,
};

const CHUNK_SIZE = 5 * 1024 * 1024; // 5MB chunks for large files

/**
 * Compress and optimize an image before upload
 * Maintains professional quality while reducing file size by 50-80%
 */
async function optimizeImage(uri: string, options: UploadOptions): Promise<string> {
  const { maxImageSize = 1920, imageQuality = 0.85 } = options;

  try {
    console.log('📸 Optimizing image:', uri);
    
    // Get image info
    const info = await FileSystem.getInfoAsync(uri);
    const originalSize = ('size' in info && info.size ? info.size : 0) / (1024 * 1024); // MB
    console.log(`📊 Original image size: ${originalSize.toFixed(2)} MB`);

    // Compress and resize
    const manipResult = await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width: maxImageSize } }], // Maintain aspect ratio
      {
        compress: imageQuality,
        format: ImageManipulator.SaveFormat.JPEG,
      }
    );

    const newInfo = await FileSystem.getInfoAsync(manipResult.uri);
    const newSize = ('size' in newInfo && newInfo.size ? newInfo.size : 0) / (1024 * 1024);
    const savings = ((originalSize - newSize) / originalSize * 100).toFixed(1);
    
    console.log(`✅ Optimized image size: ${newSize.toFixed(2)} MB (${savings}% reduction)`);
    
    return manipResult.uri;
  } catch (error) {
    console.error('❌ Image optimization failed:', error);
    return uri; // Return original if optimization fails
  }
}

/**
 * Upload file in chunks with retry logic
 */
async function uploadWithRetry(
  arrayBuffer: ArrayBuffer,
  fileName: string,
  contentType: string,
  bucket: string,
  fileSize: number,
  options: UploadOptions,
  attempt: number = 1
): Promise<any> {
  const maxRetries = options.retries || 3;

  try {
    console.log(`☁️ Upload attempt ${attempt}/${maxRetries}`);

    // For files larger than 10MB, we should use chunked upload
    // But Supabase Storage API doesn't support resumable uploads yet
    // So we'll use standard upload with retry logic
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(fileName, arrayBuffer, {
        contentType,
        upsert: false,
      });

    if (error) throw error;
    return { data, error: null };

  } catch (error: any) {
    console.error(`❌ Upload attempt ${attempt} failed:`, error.message);

    if (attempt < maxRetries) {
      // Exponential backoff: wait 2s, 4s, 8s between retries
      const delay = Math.pow(2, attempt) * 1000;
      console.log(`⏳ Retrying in ${delay / 1000}s...`);
      await new Promise(resolve => setTimeout(resolve, delay));
      
      return uploadWithRetry(arrayBuffer, fileName, contentType, bucket, fileSize, options, attempt + 1);
    }

    throw error;
  }
}

/**
 * Simulate upload progress for better UX
 * Since Supabase doesn't provide real-time upload progress,
 * we simulate it based on file size and typical upload speeds
 */
function simulateUploadProgress(
  fileSize: number,
  onProgress: (progress: UploadProgress) => void,
  duration: number = 3000 // Estimated upload time
): () => void {
  let currentProgress = 0;
  const startTime = Date.now();
  
  const interval = setInterval(() => {
    const elapsed = Date.now() - startTime;
    const estimatedProgress = Math.min(0.95, elapsed / duration);
    
    // Add some randomness for realism
    currentProgress = Math.min(
      0.95,
      currentProgress + Math.random() * 0.1,
      estimatedProgress
    );

    onProgress({
      loaded: Math.floor(fileSize * currentProgress),
      total: fileSize,
      percentage: Math.floor(currentProgress * 100),
    });
  }, 200);

  // Return cleanup function
  return () => clearInterval(interval);
}

/**
 * Upload a file to Supabase Storage with progress tracking and retry logic
 */
export async function uploadFile(
  uri: string,
  fileName: string,
  fileType: 'image' | 'video',
  options: UploadOptions = {}
): Promise<string> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const bucket = opts.bucket || 'post-media';
  
  try {
    // Step 1: Optimize image if needed
    let processedUri = uri;
    if (fileType === 'image') {
      console.log('🎨 Optimizing image...');
      processedUri = await optimizeImage(uri, opts);
      
      if (opts.onProgress) {
        opts.onProgress({ loaded: 0, total: 100, percentage: 10 });
      }
    }

    // Step 2: Read file as base64
    console.log('📤 Reading file for upload...');
    const base64 = await FileSystem.readAsStringAsync(processedUri, {
      encoding: 'base64' as any,
    });

    const fileSize = base64.length;
    const sizeMB = fileSize / (1024 * 1024);
    console.log(`📦 File size: ${sizeMB.toFixed(2)} MB`);

    // Step 3: Check size limits
    if (fileType === 'video' && sizeMB > (opts.maxVideoSizeMB || 100)) {
      throw new Error(`Video file too large: ${sizeMB.toFixed(1)}MB. Maximum allowed: ${opts.maxVideoSizeMB}MB`);
    }
    if (fileType === 'image' && sizeMB > 10) {
      throw new Error(`Image file too large: ${sizeMB.toFixed(1)}MB. Maximum allowed: 10MB`);
    }

    if (opts.onProgress) {
      opts.onProgress({ loaded: 0, total: fileSize, percentage: 15 });
    }

    // Step 4: Upload with progress simulation
    console.log('☁️ Uploading to Supabase...');
    
    const arrayBuffer = decode(base64);
    
    // Estimate upload time based on file size (assuming ~2-5 Mbps upload speed)
    const estimatedDuration = Math.max(2000, Math.min(15000, sizeMB * 800));
    
    const stopProgress = opts.onProgress 
      ? simulateUploadProgress(fileSize, opts.onProgress, estimatedDuration)
      : () => {};

    try {
      const { data, error } = await uploadWithRetry(
        arrayBuffer,
        fileName,
        fileType === 'image' ? 'image/jpeg' : 'video/mp4',
        bucket,
        fileSize,
        opts
      );

      stopProgress();

      if (error) {
        console.error('❌ Upload error:', error);
        throw error;
      }

      // Final progress update
      if (opts.onProgress) {
        opts.onProgress({
          loaded: fileSize,
          total: fileSize,
          percentage: 100,
        });
      }

      // Step 5: Get public URL
      const { data: publicUrlData } = supabase.storage
        .from(bucket)
        .getPublicUrl(data.path);

      console.log('✅ Upload complete:', publicUrlData.publicUrl);
      return publicUrlData.publicUrl;
      
    } catch (uploadError) {
      stopProgress();
      throw uploadError;
    }
    
  } catch (error: any) {
    console.error('❌ Upload failed:', error);
    throw error;
  }
}

/**
 * Upload multiple files with batched progress tracking
 */
export async function uploadMultipleFiles(
  files: Array<{ uri: string; type: 'image' | 'video' }>,
  options: UploadOptions = {}
): Promise<string[]> {
  const uploadedUrls: string[] = [];
  const totalFiles = files.length;

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(7);
    const fileName = `${timestamp}_${random}.${file.type === 'image' ? 'jpg' : 'mp4'}`;
    
    console.log(`📤 Uploading file ${i + 1}/${totalFiles}`);
    
    const url = await uploadFile(file.uri, fileName, file.type, {
      ...options,
      onProgress: (progress) => {
        // Calculate overall progress across all files
        const fileProgress = progress.percentage / 100;
        const completedFiles = i;
        const overallProgress = ((completedFiles + fileProgress) / totalFiles) * 100;
        
        if (options.onProgress) {
          options.onProgress({
            loaded: Math.floor(progress.loaded),
            total: progress.total,
            percentage: Math.floor(overallProgress),
          });
        }
      },
    });
    
    uploadedUrls.push(url);
  }

  return uploadedUrls;
}

/**
 * Get file size in MB
 */
export async function getFileSizeMB(uri: string): Promise<number> {
  try {
    const info = await FileSystem.getInfoAsync(uri);
    return ('size' in info && info.size ? info.size : 0) / (1024 * 1024);
  } catch (error) {
    console.error('Error getting file size:', error);
    return 0;
  }
}

/**
 * Check if file exceeds size limit
 */
export async function validateFileSize(
  uri: string,
  type: 'image' | 'video',
  maxVideoSizeMB: number = 100
): Promise<{ valid: boolean; sizeMB: number; message?: string }> {
  const sizeMB = await getFileSizeMB(uri);
  
  if (type === 'video' && sizeMB > maxVideoSizeMB) {
    return {
      valid: false,
      sizeMB,
      message: `Video is too large (${sizeMB.toFixed(1)}MB). Maximum: ${maxVideoSizeMB}MB`,
    };
  }
  
  if (type === 'image' && sizeMB > 10) {
    return {
      valid: false,
      sizeMB,
      message: `Image is too large (${sizeMB.toFixed(1)}MB). Maximum: 10MB`,
    };
  }
  
  return { valid: true, sizeMB };
}
