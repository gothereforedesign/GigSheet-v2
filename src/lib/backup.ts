import { getAllSongs, getAllSetlists, getSongById, saveSongsBatch, saveSetlist } from './db';
import { Song, Setlist } from '../types';
import {
  getStoredCategories,
  saveStoredCategories,
  getStoredCategoryColors,
  saveStoredCategoryColors,
} from './categoryStorage';

export interface LibraryBackup {
  version: number;
  exportDate: string;
  songs: {
    metadata: Song;
    pdfDataUri?: string;
  }[];
  setlists: Setlist[];
  categories?: {
    sheetMusic?: string[];
    technique?: string[];
    sheetMusicColors?: Record<string, string>;
    techniqueColors?: Record<string, string>;
  };
}

async function songContentToDataUri(s: Song): Promise<string | undefined> {
  const fullSong = await getSongById(s.id);
  const blobData = fullSong?.fileBlob || (fullSong as any)?.pdfDataUri || fullSong?.fileUrl;

  if (!blobData) return undefined;

  if (typeof blobData === 'string') {
    if (blobData.startsWith('data:')) {
      return blobData;
    }
    if (blobData.length > 100) {
      const mime = s.type === 'pdf' ? 'application/pdf' : 'image/jpeg';
      return `data:${mime};base64,${blobData}`;
    }
    return blobData;
  }

  let buf: ArrayBuffer;
  if (blobData instanceof ArrayBuffer) {
    buf = blobData;
  } else if (blobData instanceof Blob) {
    buf = await blobData.arrayBuffer();
  } else {
    return undefined;
  }

  if (buf.byteLength === 0) return undefined;

  const bytes = new Uint8Array(buf);
  let binary = '';
  const len = bytes.byteLength;
  const chunkSize = 0x8000;
  for (let i = 0; i < len; i += chunkSize) {
    const chunk = bytes.subarray(i, Math.min(i + chunkSize, len));
    binary += String.fromCharCode.apply(null, chunk as unknown as number[]);
  }
  const mime = s.type === 'pdf' ? 'application/pdf' : 'image/jpeg';
  return `data:${mime};base64,${btoa(binary)}`;
}

export async function exportLibraryData(onProgress?: (msg: string) => void): Promise<Blob> {
  if (onProgress) onProgress('Fetching songs and setlists...');
  const allSongs = await getAllSongs();
  const allSetlists = await getAllSetlists();

  const exportedSongs: { metadata: Song; pdfDataUri?: string }[] = [];

  for (let i = 0; i < allSongs.length; i++) {
    const s = allSongs[i];
    if (onProgress) onProgress(`Packing chart ${i + 1} of ${allSongs.length}: ${s.title}...`);
    const dataUri = await songContentToDataUri(s);

    exportedSongs.push({
      metadata: s,
      pdfDataUri: dataUri,
    });
  }

  const backupObj: LibraryBackup = {
    version: 1,
    exportDate: new Date().toISOString(),
    songs: exportedSongs,
    setlists: allSetlists,
    categories: {
      sheetMusic: getStoredCategories('sheet_music'),
      technique: getStoredCategories('technique'),
      sheetMusicColors: getStoredCategoryColors('sheet_music'),
      techniqueColors: getStoredCategoryColors('technique'),
    },
  };

  const jsonString = JSON.stringify(backupObj, null, 2);
  return new Blob([jsonString], { type: 'application/json' });
}

export async function importLibraryData(
  jsonFile: File,
  onProgress?: (processed: number, total: number) => void
): Promise<void> {
  const text = await jsonFile.text();
  const backup: LibraryBackup = JSON.parse(text);

  if (!backup.songs || !Array.isArray(backup.songs)) {
    throw new Error('Invalid backup file format: missing songs array.');
  }

  try {
    localStorage.setItem('gigsheet_db_seeded', 'true');
  } catch (e) {}

  if (backup.categories) {
    if (backup.categories.sheetMusic) {
      saveStoredCategories('sheet_music', backup.categories.sheetMusic);
    }
    if (backup.categories.technique) {
      saveStoredCategories('technique', backup.categories.technique);
    }
    if (backup.categories.sheetMusicColors) {
      saveStoredCategoryColors('sheet_music', backup.categories.sheetMusicColors as any);
    }
    if (backup.categories.techniqueColors) {
      saveStoredCategoryColors('technique', backup.categories.techniqueColors as any);
    }
  }

  const songsToSave: Song[] = [];
  for (const item of backup.songs) {
    const meta = item.metadata;
    let blobOrUrl: string | Blob | undefined = undefined;
    if (item.pdfDataUri) {
      blobOrUrl = item.pdfDataUri;
    }
    songsToSave.push({
      ...meta,
      fileBlob: blobOrUrl as any,
    });
  }

  if (songsToSave.length > 0) {
    await saveSongsBatch(songsToSave, onProgress);
  }

  if (backup.setlists && Array.isArray(backup.setlists)) {
    for (const setlist of backup.setlists) {
      await saveSetlist(setlist);
    }
  }
}
