import { getDB } from './db';
import { Song } from '../types';

/**
 * Checks storage quota via navigator.storage.estimate().
 */
export async function checkStorageQuota(incomingSize: number): Promise<{
  allowed: boolean;
  quota?: number;
  usage?: number;
  available?: number;
  message?: string;
}> {
  if (typeof navigator === 'undefined' || !navigator.storage || !navigator.storage.estimate) {
    return { allowed: true };
  }

  try {
    const estimate = await navigator.storage.estimate();
    const quota = estimate.quota || 0;
    const usage = estimate.usage || 0;
    const available = quota - usage;

    // Leave a 30MB safety buffer
    const safetyBuffer = 30 * 1024 * 1024;

    if (quota > 0 && available - safetyBuffer < incomingSize) {
      return {
        allowed: false,
        quota,
        usage,
        available,
        message: `Storage quota nearly full. Available: ${(available / (1024 * 1024)).toFixed(1)} MB, Required: ${(incomingSize / (1024 * 1024)).toFixed(1)} MB.`,
      };
    }

    return { allowed: true, quota, usage, available };
  } catch (err) {
    console.warn('Storage estimate failed:', err);
    return { allowed: true };
  }
}

/**
 * Saves a song and its raw File/Blob directly to IndexedDB with automatic retry and exponential backoff
 * to prevent transient disk I/O or IDB lock failures during large batch uploads.
 */
export async function saveSongDirectDirectBlob(song: Song, fileBlob: Blob | File, maxRetries = 3): Promise<void> {
  if (!fileBlob || fileBlob.size === 0) {
    throw new Error('Invalid or empty file blob provided.');
  }

  // Store raw File or Blob directly in IndexedDB for zero-copy, instant async storage
  const binaryData: Blob | File = fileBlob;

  let attempt = 0;
  let lastError: any = null;

  while (attempt < maxRetries) {
    attempt++;
    try {
      const db = await getDB();
      const { fileBlob: _, ...metadata } = song;

      // Atomic parallel write to both metadata 'songs' and binary 'song_blobs' stores
      const tx = db.transaction(['songs', 'song_blobs'], 'readwrite');
      await Promise.all([
        tx.objectStore('songs').put(metadata as Song),
        tx.objectStore('song_blobs').put({ id: song.id, blob: binaryData }),
        tx.done,
      ]);

      return; // Success
    } catch (err) {
      lastError = err;
      console.warn(`IndexedDB save attempt ${attempt} failed for "${song.title}":`, err);
      if (attempt < maxRetries) {
        // Exponential backoff: 200ms, 400ms, 800ms...
        const delay = Math.pow(2, attempt) * 100;
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw new Error(`Failed to save after ${maxRetries} attempts: ${lastError?.message || 'Unknown storage error'}`);
}
