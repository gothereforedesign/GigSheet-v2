/**
 * Types for GigSheet Sheet Music Directory & Performance Manager
 */

export type SongType = 'pdf' | 'image' | 'svg' | 'musicxml';

export type MusicKey = 
  | 'Cmaj' | 'Cmin' | 'Dbmaj' | 'Dbmin' | 'Dmaj' | 'Dmin' | 'Ebmaj' | 'Ebmin' | 'Emaj' | 'Emin' | 'Fmaj' | 'Fmin' 
  | 'F#maj' | 'F#min' | 'Gmaj' | 'Gmin' | 'Abmaj' | 'Abmin' | 'Amaj' | 'Amin' | 'Bbmaj' | 'Bbmin' | 'Bmaj' | 'Bmin';

export type TimeSignature = '4/4' | '3/4' | '6/8' | '2/4' | '5/4' | '7/8' | '12/8';

export interface AnnotationPoint {
  x: number; // percentage 0-100
  y: number; // percentage 0-100
  color: string;
  size: number;
}

export interface SongAnnotation {
  id: string;
  pageIndex: number;
  points: AnnotationPoint[];
  textNotes?: { id: string; x: number; y: number; text: string }[];
}

export interface Song {
  id: string;
  title: string;
  artist: string;            // Composer or Artist
  key: MusicKey;
  originalKey: MusicKey;
  tempo: number;             // BPM
  timeSignature: TimeSignature;
  // Hymn / Song specific fields
  meter?: string;            // Hymn meter e.g. 'C.M.', 'L.M.', '8.7.8.7.D', '7.7.7.7'
  lyrics?: string;           // Verse and chorus text lyrics
  genre: string;             // Hymns, Jazz, etc.
  section?: 'sheet_music' | 'technique'; // Main category section
  type: SongType;
  tags?: string[];
  dateAdded: number;         // Timestamp
  dateModified?: number;      // Timestamp
  lastPlayed?: number;       // Timestamp
  favorite?: boolean;
  
  // Storage content
  fileBlob?: Blob | ArrayBuffer; // For PDF or Image
  fileUrl?: string;              // Data URL or Object URL
  fileName?: string;

  // SVG representation fallback for offline built-ins or vector lead sheets
  svgData?: string;

  // Song annotations
  annotations?: SongAnnotation[];
  userNotes?: string;

  // Soft delete flag for trash bin
  deletedAt?: number;
}

export interface SetlistItem {
  songId: string;
  notes?: string;
  transposedKey?: MusicKey;
  targetTempo?: number;
}

export interface Setlist {
  id: string;
  name: string;
  description?: string;
  dateCreated: number;
  dateModified: number;
  items: SetlistItem[];
  tags?: string[];
  color?: string;
}

export type ActiveTab = 'sheet_music' | 'technique' | 'trash' | 'dexie';

export interface ViewFilterState {
  searchQuery: string;
  genreFilter: string;
  keyFilter: string;
  typeFilter: string;
  favoriteOnly: boolean;
  sortBy: 'title' | 'artist' | 'key' | 'tempo' | 'dateAdded' | 'lastPlayed';
  sortOrder: 'asc' | 'desc';
}
