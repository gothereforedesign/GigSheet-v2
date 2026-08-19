import { getDB, saveSongsBatch, saveSetlist } from './db';
import { Song, Setlist } from '../types';

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

export async function exportLibraryData(onProgress?: (msg: string) => void): Promise<Blob> {
  if (onProgress) onProgress('Fetching songs and setlists...');
  const db = await getDB();
  const allSongs = await db.getAll('songs');
  const allSetlists = await db.getAll('setlists');
  const allBlobs = await db.getAll('song_blobs');

  const blobMap = new Map<string, ArrayBuffer | Blob>();
  for (const b of allBlobs) {
    if (b && b.id && b.blob) {
      blobMap.set(b.id, b.blob);
    }
  }

  const exportedSongs: { metadata: Song; pdfDataUri?: string }[] = [];

  for (let i = 0; i < allSongs.length; i++) {
    const s = allSongs[i];
    if (onProgress) onProgress(`Packing chart ${i + 1} of ${allSongs.length}...`);
    let dataUri: string | undefined = undefined;
    const blobData = blobMap.get(s.id);
    if (blobData) {
      let buf: ArrayBuffer;
      if (blobData instanceof ArrayBuffer) {
        buf = blobData;
      } else if (blobData instanceof Blob) {
        buf = await blobData.arrayBuffer();
      } else {
        buf = new ArrayBuffer(0);
      }

      if (buf.byteLength > 0) {
        const bytes = new Uint8Array(buf);
        let binary = '';
        const chunkSize = 0x8000;
        for (let j = 0; j < bytes.length; j += chunkSize) {
          binary += String.fromCharCode.apply(null, Array.from(bytes.subarray(j, j + chunkSize)));
        }
        const mime = s.type === 'pdf' ? 'application/pdf' : 'image/jpeg';
        dataUri = `data:${mime};base64,${btoa(binary)}`;
      }
    } else if (s.fileUrl) {
      dataUri = s.fileUrl;
    }

    exportedSongs.push({
      metadata: s,
      pdfDataUri: dataUri,
    });
  }

  const sheetMusicCats = localStorage.getItem('gigsheet_categories_sheet_music');
  const techniqueCats = localStorage.getItem('gigsheet_categories_technique');
  const sheetMusicCols = localStorage.getItem('gigsheet_colors_sheet_music');
  const techniqueCols = localStorage.getItem('gigsheet_colors_technique');

  const backupObj: LibraryBackup = {
    version: 1,
    exportDate: new Date().toISOString(),
    songs: exportedSongs,
    setlists: allSetlists,
    categories: {
      sheetMusic: sheetMusicCats ? JSON.parse(sheetMusicCats) : undefined,
      technique: techniqueCats ? JSON.parse(techniqueCats) : undefined,
      sheetMusicColors: sheetMusicCols ? JSON.parse(sheetMusicCols) : undefined,
      techniqueColors: techniqueCols ? JSON.parse(techniqueCols) : undefined,
    },
  };

  const jsonString = JSON.stringify(backupObj);
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

  if (backup.categories) {
    if (backup.categories.sheetMusic) {
      localStorage.setItem('gigsheet_categories_sheet_music', JSON.stringify(backup.categories.sheetMusic));
    }
    if (backup.categories.technique) {
      localStorage.setItem('gigsheet_categories_technique', JSON.stringify(backup.categories.technique));
    }
    if (backup.categories.sheetMusicColors) {
      localStorage.setItem('gigsheet_colors_sheet_music', JSON.stringify(backup.categories.sheetMusicColors));
    }
    if (backup.categories.techniqueColors) {
      localStorage.setItem('gigsheet_colors_technique', JSON.stringify(backup.categories.techniqueColors));
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
