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
    metadata: Partial<Song>;
    pdfDataUri?: string;
    categoryColor?: string;
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

  const mimeType = s.type === 'pdf' ? 'application/pdf' : 'image/jpeg';

  if (typeof blobData === 'string') {
    if (blobData.startsWith('data:')) {
      return blobData;
    }
    if (blobData.length > 100) {
      return `data:${mimeType};base64,${blobData.trim()}`;
    }
    return undefined;
  }

  let blob: Blob;
  if (blobData instanceof Blob) {
    blob = blobData;
  } else if (blobData instanceof ArrayBuffer) {
    blob = new Blob([blobData], { type: mimeType });
  } else if (ArrayBuffer.isView(blobData)) {
    blob = new Blob([(blobData as any).buffer || blobData], { type: mimeType });
  } else {
    return undefined;
  }

  if (blob.size === 0) return undefined;

  return new Promise<string | undefined>((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const res = reader.result;
      if (typeof res === 'string' && res.startsWith('data:')) {
        resolve(res);
      } else {
        resolve(undefined);
      }
    };
    reader.onerror = () => resolve(undefined);
    reader.readAsDataURL(blob);
  });
}

export async function exportLibraryData(onProgress?: (msg: string) => void): Promise<Blob> {
  if (onProgress) onProgress('Fetching songs and setlists...');
  const allSongs = await getAllSongs();
  const allSetlists = await getAllSetlists();

  const sheetMusicColors = getStoredCategoryColors('sheet_music');
  const techniqueColors = getStoredCategoryColors('technique');

  const exportedSongs: { metadata: Partial<Song>; pdfDataUri?: string; categoryColor?: string }[] = [];

  for (let i = 0; i < allSongs.length; i++) {
    const s = allSongs[i];
    if (onProgress) onProgress(`Packing chart ${i + 1} of ${allSongs.length}: ${s.title}...`);
    const dataUri = await songContentToDataUri(s);

    // Retain ALL metadata for complete application state restore
    const { fileBlob, fileUrl, ...retainedMetadata } = s;

    // Retain category color association
    const categoryColor = s.section === 'technique'
      ? techniqueColors[s.genre] || 'violet'
      : sheetMusicColors[s.genre] || 'sky';

    exportedSongs.push({
      metadata: retainedMetadata,
      pdfDataUri: dataUri,
      categoryColor,
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

  const smColors = getStoredCategoryColors('sheet_music');
  const techColors = getStoredCategoryColors('technique');
  let smColorsUpdated = false;
  let techColorsUpdated = false;

  const songsToSave: Song[] = [];
  for (const item of backup.songs) {
    const meta = item.metadata || {};
    let blobOrUrl: string | Blob | undefined = undefined;
    if (item.pdfDataUri) {
      blobOrUrl = item.pdfDataUri;
    }

    // Preserve category colors from item if not already mapped
    if (item.categoryColor && meta.genre) {
      if (meta.section === 'technique') {
        if (!techColors[meta.genre]) {
          techColors[meta.genre] = item.categoryColor as any;
          techColorsUpdated = true;
        }
      } else {
        if (!smColors[meta.genre]) {
          smColors[meta.genre] = item.categoryColor as any;
          smColorsUpdated = true;
        }
      }
    }

    songsToSave.push({
      id: meta.id || `song-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      title: meta.title || 'Untitled Chart',
      artist: meta.artist || '',
      key: meta.key || 'Cmaj',
      originalKey: meta.originalKey || 'Cmaj',
      tempo: meta.tempo || 120,
      timeSignature: meta.timeSignature || '4/4',
      meter: meta.meter,
      lyrics: meta.lyrics,
      genre: meta.genre || 'General',
      section: meta.section || 'sheet_music',
      type: meta.type || 'pdf',
      tags: meta.tags || [],
      dateAdded: meta.dateAdded || Date.now(),
      dateModified: meta.dateModified,
      lastPlayed: meta.lastPlayed,
      favorite: meta.favorite,
      fileName: meta.fileName,
      svgData: meta.svgData,
      annotations: meta.annotations,
      userNotes: meta.userNotes,
      deletedAt: meta.deletedAt,
      originalSongId: meta.originalSongId,
      setlistId: meta.setlistId,
      isSetlistDuplicate: meta.isSetlistDuplicate,
      fileBlob: blobOrUrl as any,
    });
  }

  if (smColorsUpdated) {
    saveStoredCategoryColors('sheet_music', smColors);
  }
  if (techColorsUpdated) {
    saveStoredCategoryColors('technique', techColors);
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
