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
      blocked() {
        console.warn('IndexedDB open blocked by another tab or connection');
      },
      blocking() {
        console.warn('IndexedDB connection blocking higher version upgrade');
      },
      terminated() {
        console.warn('IndexedDB connection terminated unexpectedly, resetting connection promise');
        dbPromise = null;
      },
    }).catch((err) => {
      console.error('Failed to open IndexedDB:', err);
      dbPromise = null;
      throw err;
    });
  }
  return dbPromise;
}

/**
 * Seed initial data if library is empty
 */
export async function seedInitialDataIfNeeded(): Promise<void> {
  try {
    const db = await getDB();
    const count = await db.count('songs');
    if (count === 0 && BUNDLED_SAMPLE_SONGS.length > 0) {
      console.info('Library database empty, seeding initial sample songs and default setlists...');
      for (const song of BUNDLED_SAMPLE_SONGS) {
        await saveSong(song);
      }
      for (const setlist of BUNDLED_DEFAULT_SETLISTS) {
        await db.put('setlists', setlist);
      }
    }

    if (typeof window !== 'undefined') {
      localStorage.setItem('gigsheet_db_seeded', 'true');
    }
  } catch (err) {
    console.warn('Failed to check or seed initial data:', err);
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

  const sample = BUNDLED_SAMPLE_SONGS.find(
    s => s.id === id || s.title.toLowerCase().trim() === song.title.toLowerCase().trim()
  );

  if (content && content.blob) {
    let raw = content.blob;
    if (raw instanceof Blob) {
      return { ...song, fileBlob: raw };
    }
    if (raw instanceof ArrayBuffer || Object.prototype.toString.call(raw) === '[object ArrayBuffer]') {
      const createdBlob = new Blob([raw], { type: song.type === 'pdf' ? 'application/pdf' : 'image/jpeg' });
      return { ...song, fileBlob: createdBlob };
    }
    if (ArrayBuffer.isView(raw) || (raw && (raw as any).buffer instanceof ArrayBuffer)) {
      const createdBlob = new Blob([(raw as any).buffer || raw], { type: song.type === 'pdf' ? 'application/pdf' : 'image/jpeg' });
      return { ...song, fileBlob: createdBlob };
    }
    if (typeof raw === 'string') {
      const strRaw = raw as string;
      if (sample && (strRaw.includes('<0/Type') || strRaw.length < 100)) {
        return { ...song, fileUrl: sample.fileUrl, fileBlob: sample.fileBlob };
      }
      return { ...song, fileBlob: raw as any };
    }
    return { ...song, fileBlob: raw as unknown as Blob };
  }

  // Check if fileBlob or pdfDataUri is attached directly on the song object in 'songs' store
  const anySong = song as any;
  if (anySong.fileBlob) {
    const raw = anySong.fileBlob;
    if (raw instanceof Blob) {
      return song;
    }
    if (raw instanceof ArrayBuffer || Object.prototype.toString.call(raw) === '[object ArrayBuffer]') {
      const createdBlob = new Blob([raw], { type: song.type === 'pdf' ? 'application/pdf' : 'image/jpeg' });
      return { ...song, fileBlob: createdBlob };
    }
    if (typeof raw === 'string' && sample && (raw.includes('<0/Type') || raw.length < 100)) {
      return { ...song, fileUrl: sample.fileUrl, fileBlob: sample.fileBlob };
    }
    return { ...song, fileBlob: raw };
  }

  if (anySong.pdfDataUri) {
    if (typeof anySong.pdfDataUri === 'string' && sample && (anySong.pdfDataUri.includes('<0/Type') || anySong.pdfDataUri.length < 100)) {
      return { ...song, fileUrl: sample.fileUrl, fileBlob: sample.fileBlob };
    }
    return { ...song, fileBlob: anySong.pdfDataUri };
  }

  // If song has a fileUrl (data URI or blob URL or http URL)
  if (song.fileUrl) {
    if (typeof song.fileUrl === 'string' && sample && (song.fileUrl.includes('<0/Type') || song.fileUrl.length < 100)) {
      return { ...song, fileUrl: sample.fileUrl, fileBlob: sample.fileBlob };
    }
    return song;
  }

  // Fallback to sample song matching ID or title
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
    } else if (typeof blob === 'string') {
      return blob;
    }
  }
  const song = await db.get('songs', id);
  if (song && song.fileUrl) {
    return song.fileUrl;
  }
  const sample = BUNDLED_SAMPLE_SONGS.find(
    s => s.id === id || (song && s.title.toLowerCase().trim() === song.title.toLowerCase().trim())
  );
  if (sample) {
    return sample.fileBlob || sample.fileUrl || null;
  }
  return null;
}

// Helper to convert any Blob, File, ArrayBuffer, or data URL into a clean ArrayBuffer
// This avoids Chromium's disk-blob streaming subsystem which causes "Failed to write blobs (IOError)"
async function serializeToBinary(blobOrBuffer: Blob | File | ArrayBuffer | string | undefined | null): Promise<ArrayBuffer | null> {
  if (!blobOrBuffer) return null;
  if (blobOrBuffer instanceof ArrayBuffer) {
    return blobOrBuffer;
  }
  if (ArrayBuffer.isView(blobOrBuffer) || (blobOrBuffer && (blobOrBuffer as any).buffer instanceof ArrayBuffer)) {
    return (blobOrBuffer as any).buffer as ArrayBuffer;
  }
  if (typeof (blobOrBuffer as Blob).arrayBuffer === 'function') {
    try {
      return await (blobOrBuffer as Blob).arrayBuffer();
    } catch (e) {
      console.warn('arrayBuffer() call failed on blob:', e);
    }
  }
  if (typeof blobOrBuffer === 'string') {
    const str = blobOrBuffer.trim();
    if (str.startsWith('data:')) {
      const commaIdx = str.indexOf(',');
      if (commaIdx !== -1) {
        const meta = str.substring(0, commaIdx);
        const rawData = str.substring(commaIdx + 1);
        if (meta.includes('base64')) {
          try {
            const cleanBase64 = rawData.replace(/[\r\n\s]/g, '');
            const binaryStr = window.atob(cleanBase64);
            const len = binaryStr.length;
            const bytes = new Uint8Array(len);
            for (let i = 0; i < len; i++) {
              bytes[i] = binaryStr.charCodeAt(i);
            }
            return bytes.buffer as ArrayBuffer;
          } catch (e) {
            console.warn('Direct base64 decode failed, trying fetch fallback:', e);
          }
        }
      }
      try {
        const res = await fetch(str);
        if (res.ok) {
          return await res.arrayBuffer();
        }
      } catch (e) {
        console.warn('Fetch data URI failed:', e);
      }
    }
    if (str.length > 100) {
      try {
        const cleanBase64 = str.replace(/[\r\n\s]/g, '');
        const binaryStr = window.atob(cleanBase64);
        const len = binaryStr.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
          bytes[i] = binaryStr.charCodeAt(i);
        }
        return bytes.buffer as ArrayBuffer;
      } catch (e) {}
    }
  }
  return null;
}

export async function saveSong(song: Song): Promise<void> {
  const db = await getDB();
  const { fileBlob, ...metadata } = song;
  
  let binaryData: ArrayBuffer | null = null;
  const candidate = fileBlob || (song as any).pdfDataUri || song.fileUrl;
  if (candidate) {
    try {
      binaryData = await serializeToBinary(candidate);
    } catch (e) {
      console.warn('Could not serialize candidate fileBlob:', e);
    }
  }

  // Ensure default section property
  if (!metadata.section) {
    metadata.section = 'sheet_music';
  }

  try {
    const tx = db.transaction(['songs', 'song_blobs'], 'readwrite');
    tx.objectStore('songs').put(metadata as Song);
    if (binaryData) {
      tx.objectStore('song_blobs').put({ id: song.id, blob: binaryData });
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
      throw e;
    }
  }
}

export async function saveSongsBatch(
  songs: Song[],
  onProgress?: (processed: number, total: number) => void
): Promise<void> {
  const db = await getDB();
  
  const chunkSize = 5;
  for (let i = 0; i < songs.length; i += chunkSize) {
    const chunk = songs.slice(i, i + chunkSize);
    
    const preparedItems = await Promise.all(
      chunk.map(async (song) => {
        const { fileBlob, ...metadata } = song;
        let binaryData: ArrayBuffer | null = null;
        const candidate = fileBlob || (song as any).pdfDataUri || song.fileUrl;
        if (candidate) {
          try {
            binaryData = await serializeToBinary(candidate);
          } catch (e) {
            console.warn('Batch serialization failed:', e);
          }
        }

        if (!metadata.section) {
          metadata.section = 'sheet_music';
        }

        return { metadata: metadata as Song, id: song.id, binaryData };
      })
    );

    // Write chunk to IndexedDB
    try {
      const tx = db.transaction(['songs', 'song_blobs'], 'readwrite');
      const songStore = tx.objectStore('songs');
      const blobStore = tx.objectStore('song_blobs');

      const puts: Promise<any>[] = [];
      for (const item of preparedItems) {
        puts.push(songStore.put(item.metadata));
        if (item.binaryData) {
          puts.push(blobStore.put({ id: item.id, blob: item.binaryData }));
        }
      }
      await Promise.all(puts);
      await tx.done;
    } catch (err) {
      console.warn('Batch blob transaction error, retrying individual items:', err);
      // Fallback: save one by one so partial failures don't abort all charts
      for (const item of preparedItems) {
        try {
          const singleTx = db.transaction(['songs', 'song_blobs'], 'readwrite');
          await Promise.all([
            singleTx.objectStore('songs').put(item.metadata),
            item.binaryData ? singleTx.objectStore('song_blobs').put({ id: item.id, blob: item.binaryData }) : Promise.resolve(),
            singleTx.done
          ]);
        } catch (itemErr) {
          try {
            const metaTx = db.transaction('songs', 'readwrite');
            await Promise.all([
              metaTx.objectStore('songs').put(item.metadata),
              metaTx.done
            ]);
          } catch (metaErr) {
            console.error(`Failed to save song ${item.id}:`, metaErr);
          }
        }
      }
    }

    // Step 3: Explicitly release references so browser GC can reclaim memory
    for (let k = 0; k < preparedItems.length; k++) {
      preparedItems[k].binaryData = null;
    }

    if (onProgress) {
      onProgress(Math.min(i + chunk.length, songs.length), songs.length);
    }

    // Yield control to the browser microtask loop to allow garbage collection and UI updates
    await new Promise((resolve) => setTimeout(resolve, 40));
  }
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

export async function deleteSongsBatch(ids: string[]): Promise<void> {
  if (!ids || ids.length === 0) return;
  const db = await getDB();
  const chunkSize = 25;
  for (let i = 0; i < ids.length; i += chunkSize) {
    const chunk = ids.slice(i, i + chunkSize);
    try {
      const tx = db.transaction(['songs', 'song_blobs'], 'readwrite');
      const songStore = tx.objectStore('songs');
      const blobStore = tx.objectStore('song_blobs');
      const deletes: Promise<any>[] = [];
      for (const id of chunk) {
        deletes.push(songStore.delete(id));
        deletes.push(blobStore.delete(id));
      }
      await Promise.all(deletes);
      await tx.done;
    } catch (err) {
      console.warn('Batch delete transaction error, deleting individually:', err);
      for (const id of chunk) {
        try {
          await deleteSong(id);
        } catch (singleErr) {
          console.error(`Failed to delete song ${id}:`, singleErr);
        }
      }
    }
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
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
