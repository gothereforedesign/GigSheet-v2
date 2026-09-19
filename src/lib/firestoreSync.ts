import {
  doc,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
  collection,
  writeBatch,
} from 'firebase/firestore';
import { db } from './firebase';
import { Song, Setlist } from '../types';

const CHUNK_SIZE = 500000; // 500KB chunk size for base64 data to stay well within Firestore 1MB doc limit

// Convert ArrayBuffer to base64 string
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const len = bytes.byteLength;
  const chunkSize = 0x8000;
  for (let i = 0; i < len; i += chunkSize) {
    const chunk = bytes.subarray(i, Math.min(i + chunkSize, len));
    binary += String.fromCharCode.apply(null, chunk as unknown as number[]);
  }
  return btoa(binary);
}

// Convert base64 string back to ArrayBuffer
function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const clean = base64.replace(/[\r\n\s]/g, '');
  const binary = window.atob(clean);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer as ArrayBuffer;
}

/**
 * Sync single song metadata and binary blob to Firestore Cloud
 */
export async function syncSongToCloud(
  song: Song,
  binaryBuffer?: ArrayBuffer | null
): Promise<void> {
  try {
    const { fileBlob, ...metadata } = song;

    // Sanitize metadata undefined values for Firestore
    const cleanMetadata = JSON.parse(JSON.stringify(metadata));

    // Save song metadata to Firestore 'songs' collection
    await setDoc(doc(db, 'songs', song.id), cleanMetadata, { merge: true });

    // If binary data provided, sync to 'song_blobs'
    if (binaryBuffer && binaryBuffer.byteLength > 0) {
      const base64Data = arrayBufferToBase64(binaryBuffer);

      if (base64Data.length <= CHUNK_SIZE) {
        // Small blob fit in single document
        await setDoc(
          doc(db, 'song_blobs', song.id),
          {
            id: song.id,
            blobData: base64Data,
            chunked: false,
            updatedAt: Date.now(),
          },
          { merge: true }
        );
      } else {
        // Larger blob - split into chunks inside 'chunks' subcollection
        const totalChunks = Math.ceil(base64Data.length / CHUNK_SIZE);
        await setDoc(
          doc(db, 'song_blobs', song.id),
          {
            id: song.id,
            chunked: true,
            totalChunks,
            updatedAt: Date.now(),
          },
          { merge: true }
        );

        for (let i = 0; i < totalChunks; i++) {
          const chunkStr = base64Data.substring(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE);
          await setDoc(doc(db, 'song_blobs', song.id, 'chunks', String(i)), {
            index: i,
            data: chunkStr,
          });
        }
      }
    }
  } catch (err) {
    console.warn(`Failed to sync song ${song.id} to Firestore cloud:`, err);
  }
}

/**
 * Fetch binary PDF ArrayBuffer from Firestore Cloud for a given song ID
 */
export async function getSongBlobFromCloud(id: string): Promise<ArrayBuffer | null> {
  try {
    const blobRef = doc(db, 'song_blobs', id);
    const snap = await getDoc(blobRef);

    if (!snap.exists()) return null;

    const data = snap.data();
    if (!data.chunked && data.blobData) {
      return base64ToArrayBuffer(data.blobData);
    }

    if (data.chunked && data.totalChunks > 0) {
      let fullBase64 = '';
      for (let i = 0; i < data.totalChunks; i++) {
        const chunkSnap = await getDoc(doc(db, 'song_blobs', id, 'chunks', String(i)));
        if (chunkSnap.exists()) {
          fullBase64 += chunkSnap.data().data || '';
        }
      }
      if (fullBase64) {
        return base64ToArrayBuffer(fullBase64);
      }
    }
  } catch (err) {
    console.warn(`Failed to fetch song blob ${id} from Firestore cloud:`, err);
  }
  return null;
}

/**
 * Fetch all song metadata documents from Firestore Cloud
 */
export async function fetchSongsFromCloud(): Promise<Song[]> {
  try {
    const snapshot = await getDocs(collection(db, 'songs'));
    const songs: Song[] = [];
    snapshot.forEach((docSnap) => {
      if (docSnap.exists()) {
        songs.push(docSnap.data() as Song);
      }
    });
    return songs;
  } catch (err) {
    console.warn('Failed to fetch songs from Firestore cloud:', err);
    return [];
  }
}

/**
 * Delete song document and blob from Firestore Cloud
 */
export async function deleteSongFromCloud(id: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 'songs', id));
    await deleteDoc(doc(db, 'song_blobs', id));
  } catch (err) {
    console.warn(`Failed to delete song ${id} from Firestore cloud:`, err);
  }
}

/**
 * Sync setlist to Firestore Cloud
 */
export async function syncSetlistToCloud(setlist: Setlist): Promise<void> {
  try {
    const cleanSetlist = JSON.parse(JSON.stringify(setlist));
    await setDoc(doc(db, 'setlists', setlist.id), cleanSetlist, { merge: true });
  } catch (err) {
    console.warn(`Failed to sync setlist ${setlist.id} to Firestore cloud:`, err);
  }
}

/**
 * Fetch setlists from Firestore Cloud
 */
export async function fetchSetlistsFromCloud(): Promise<Setlist[]> {
  try {
    const snapshot = await getDocs(collection(db, 'setlists'));
    const setlists: Setlist[] = [];
    snapshot.forEach((docSnap) => {
      if (docSnap.exists()) {
        setlists.push(docSnap.data() as Setlist);
      }
    });
    return setlists;
  } catch (err) {
    console.warn('Failed to fetch setlists from Firestore cloud:', err);
    return [];
  }
}

/**
 * Delete setlist from Firestore Cloud
 */
export async function deleteSetlistFromCloud(id: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 'setlists', id));
  } catch (err) {
    console.warn(`Failed to delete setlist ${id} from Firestore cloud:`, err);
  }
}

/**
 * Sync category list and category colors for a section to Firestore Cloud
 */
export async function syncCategoriesToCloud(
  section: 'sheet_music' | 'technique',
  categories: string[],
  colors: Record<string, string>
): Promise<void> {
  try {
    const docId = `categories_${section}`;
    await setDoc(
      doc(db, 'settings', docId),
      {
        section,
        categories: categories || [],
        colors: colors || {},
        updatedAt: Date.now(),
      },
      { merge: true }
    );
  } catch (err) {
    console.warn(`Failed to sync ${section} categories to Firestore cloud:`, err);
  }
}

/**
 * Fetch category config for a section from Firestore Cloud
 */
export async function fetchCategoriesFromCloud(
  section: 'sheet_music' | 'technique'
): Promise<{ categories?: string[]; colors?: Record<string, string> } | null> {
  try {
    const docId = `categories_${section}`;
    const snap = await getDoc(doc(db, 'settings', docId));
    if (snap.exists()) {
      const data = snap.data();
      return {
        categories: Array.isArray(data.categories) ? data.categories : undefined,
        colors: data.colors && typeof data.colors === 'object' ? data.colors : undefined,
      };
    }
  } catch (err) {
    console.warn(`Failed to fetch ${section} categories from Firestore cloud:`, err);
  }
  return null;
}
