import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { Song, Setlist } from '../types';
import { BUNDLED_SAMPLE_SONGS, BUNDLED_DEFAULT_SETLISTS } from './sampleSongs';

interface GigSheetDB extends DBSchema {
  songs: {
    key: string;
    value: Song;
    indexes: {
      'by-title': string;
      'by-artist': string;
      'by-key': string;
      'by-favorite': number;
      'by-date': number;
    };
  };
  song_blobs: {
    key: string;
    value: { id: string; blob: Blob | ArrayBuffer };
  };
  setlists: {
    key: string;
    value: Setlist;
    indexes: {
      'by-name': string;
      'by-date': number;
    };
  };
  settings: {
    key: string;
    value: any;
  };
}

const DB_NAME = 'gighsheet_db';
const DB_VERSION = 2; // Incremented for blobs store

let dbPromise: Promise<IDBPDatabase<GigSheetDB>> | null = null;

export function getDB() {
  if (!dbPromise) {
    dbPromise = openDB<GigSheetDB>(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion) {
        // Songs store
        if (!db.objectStoreNames.contains('songs')) {
          const songStore = db.createObjectStore('songs', { keyPath: 'id' });
          songStore.createIndex('by-title', 'title');
          songStore.createIndex('by-artist', 'artist');
          songStore.createIndex('by-key', 'key');
          songStore.createIndex('by-favorite', 'favorite');
          songStore.createIndex('by-date', 'dateAdded');
        }

        // New Blobs store for version 2+
        if (!db.objectStoreNames.contains('song_blobs')) {
          db.createObjectStore('song_blobs', { keyPath: 'id' });
        }

        // Setlists store
        if (!db.objectStoreNames.contains('setlists')) {
          const setlistStore = db.createObjectStore('setlists', { keyPath: 'id' });
          setlistStore.createIndex('by-name', 'name');
          setlistStore.createIndex('by-date', 'dateCreated');
        }

        // Settings store
        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings');
        }
      },
    });
  }
  return dbPromise;
}

/**
 * Seed initial data if library is empty
 */
export async function seedInitialDataIfNeeded(): Promise<void> {
  const db = await getDB();
  const count = await db.count('songs');
  if (count === 0 && BUNDLED_SAMPLE_SONGS.length > 0) {
    for (const song of BUNDLED_SAMPLE_SONGS) {
      await saveSong(song);
    }
    for (const setlist of BUNDLED_DEFAULT_SETLISTS) {
      await db.put('setlists', setlist);
    }
  }
}

export async function purgeSampleSongsIfNeeded(): Promise<void> {
  // Purging no longer needed
}

// SONG CRUD operations
export async function getAllSongs(): Promise<Song[]> {
  const db = await getDB();
  await seedInitialDataIfNeeded();
  const all = await db.getAll('songs');
  // We return them WITHOUT blobs to keep memory usage low for the library view
  return all.map(s => ({ ...s, fileBlob: undefined }));
}

export async function getSongById(id: string): Promise<Song | undefined> {
  const db = await getDB();
  const [song, content] = await Promise.all([
    db.get('songs', id),
    db.get('song_blobs', id)
  ]);

  if (!song) {
    // Fallback to sample songs if DB is empty or missed
    const sample = BUNDLED_SAMPLE_SONGS.find(s => s.id === id);
    if (sample) return sample;
    return undefined;
  }

  if (content && content.blob) {
    let blob = content.blob;
    if (blob instanceof Blob) {
      return { ...song, fileBlob: blob };
    } else if (blob instanceof ArrayBuffer || Object.prototype.toString.call(blob) === '[object ArrayBuffer]') {
      const createdBlob = new Blob([blob], { type: song.type === 'pdf' ? 'application/pdf' : 'image/jpeg' });
      return { ...song, fileBlob: createdBlob };
    }
    return { ...song, fileBlob: blob as unknown as Blob };
  }

  // If no blob in song_blobs, check if song itself has fileUrl or sample fallback
  if (song.fileUrl) {
    return song;
  }

  const sample = BUNDLED_SAMPLE_SONGS.find(s => s.id === id);
  if (sample) {
    return { ...song, fileUrl: sample.fileUrl, fileBlob: sample.fileBlob };
  }

  return song;
}

export async function getSongBlob(id: string): Promise<Blob | ArrayBuffer | string | null> {
  const db = await getDB();
  const content = await db.get('song_blobs', id);
  if (content && content.blob) {
    let blob = content.blob;
    if (blob instanceof Blob) {
      return blob;
    } else if (blob instanceof ArrayBuffer || Object.prototype.toString.call(blob) === '[object ArrayBuffer]') {
      return blob as ArrayBuffer;
    }
  }
  const song = await db.get('songs', id);
  if (song && song.fileUrl) {
    return song.fileUrl;
  }
  const sample = BUNDLED_SAMPLE_SONGS.find(s => s.id === id);
  if (sample) {
    return sample.fileBlob || sample.fileUrl || null;
  }
  return null;
}

export async function saveSong(song: Song): Promise<void> {
  const db = await getDB();
  const { fileBlob, ...metadata } = song;
  
  try {
    const tx = db.transaction(['songs', 'song_blobs'], 'readwrite');
    tx.objectStore('songs').put(metadata as Song);
    if (fileBlob) {
      tx.objectStore('song_blobs').put({ id: song.id, blob: fileBlob });
    }
    await tx.done;
  } catch (err) {
    console.error('Error saving song with blob:', err);
    try {
      const tx2 = db.transaction('songs', 'readwrite');
      tx2.objectStore('songs').put(metadata as Song);
      await tx2.done;
    } catch (e) {
      console.error('Fallback metadata save failed:', e);
    }
  }
}

export async function saveSongsBatch(
  songs: Song[],
  onProgress?: (processed: number, total: number) => void
): Promise<void> {
  const db = await getDB();
  
  // Save in chunks to ensure fast transactions without blocking the UI
  const chunkSize = 5;
  for (let i = 0; i < songs.length; i += chunkSize) {
    const chunk = songs.slice(i, i + chunkSize);
    const tx = db.transaction(['songs', 'song_blobs'], 'readwrite');
    const songStore = tx.objectStore('songs');
    const blobStore = tx.objectStore('song_blobs');

    for (const song of chunk) {
      const { fileBlob, ...metadata } = song;
      songStore.put(metadata as Song);
      if (fileBlob) {
        blobStore.put({ id: song.id, blob: fileBlob });
      }
    }

    await tx.done;

    const processedCount = Math.min(i + chunkSize, songs.length);
    if (onProgress) {
      onProgress(processedCount, songs.length);
    }

    // Yield quickly to event loop
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
  console.log(`Successfully completed batch save of ${songs.length} songs.`);
}

export async function deleteSong(id: string): Promise<void> {
  const db = await getDB();
  const tx = db.transaction(['songs', 'song_blobs'], 'readwrite');
  await Promise.all([
    tx.objectStore('songs').delete(id),
    tx.objectStore('song_blobs').delete(id),
    tx.done
  ]);
}

export async function toggleSongFavorite(id: string): Promise<boolean> {
  const db = await getDB();
  const song = await db.get('songs', id);
  if (song) {
    song.favorite = !song.favorite;
    await db.put('songs', song);
    return song.favorite;
  }
  return false;
}

export async function updateSongLastPlayed(id: string): Promise<void> {
  const db = await getDB();
  const song = await db.get('songs', id);
  if (song) {
    song.lastPlayed = Date.now();
    await db.put('songs', song);
  }
}

// SETLIST CRUD operations
export async function getAllSetlists(): Promise<Setlist[]> {
  const db = await getDB();
  await seedInitialDataIfNeeded();
  return db.getAll('setlists');
}

export async function getSetlistById(id: string): Promise<Setlist | undefined> {
  const db = await getDB();
  return db.get('setlists', id);
}

export async function saveSetlist(setlist: Setlist): Promise<void> {
  const db = await getDB();
  await db.put('setlists', setlist);
}

export async function deleteSetlist(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('setlists', id);
}

// SETTINGS operations
export async function getSetting<T>(key: string, defaultValue: T): Promise<T> {
  const db = await getDB();
  const val = await db.get('settings', key);
  return val !== undefined ? val : defaultValue;
}

export async function setSetting<T>(key: string, value: T): Promise<void> {
  const db = await getDB();
  await db.put('settings', value, key);
}
