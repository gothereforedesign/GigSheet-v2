import { Song, Setlist } from '../types';

export function createValidSamplePdf(title: string, subtitle: string, details: string, chords: string): string {
  const contentStream = `BT
/F1 22 Tf
50 730 Td
(${title}) Tj
/F1 12 Tf
0 -28 Td
(${subtitle}) Tj
0 -22 Td
(${details}) Tj
/F1 14 Tf
0 -40 Td
(CHORDS & LEAD SHEET:) Tj
/F1 12 Tf
0 -25 Td
(${chords}) Tj
ET`;

  const encoder = new TextEncoder();
  const contentBytes = encoder.encode(contentStream);
  const streamLen = contentBytes.length;

  let pdf = '%PDF-1.4\n';
  const offsets: number[] = [0];

  function getLen(str: string) {
    return encoder.encode(str).length;
  }

  function addObj(str: string) {
    offsets.push(getLen(pdf));
    pdf += str + '\n';
  }

  addObj('1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj');
  addObj('2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj');
  addObj('3 0 obj\n<< /Type /Page /Parent 2 0 R /Resources << /Font << /F1 4 0 R >> >> /MediaBox [0 0 612 792] /Contents 5 0 R >>\nendobj');
  addObj('4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj');
  addObj(`5 0 obj\n<< /Length ${streamLen} >>\nstream\n${contentStream}\nendstream\nendobj`);

  const startXref = getLen(pdf);
  let xref = `xref\n0 ${offsets.length}\n0000000000 65535 f \n`;
  for (let i = 1; i < offsets.length; i++) {
    xref += String(offsets[i]).padStart(10, '0') + ' 00000 n \n';
  }
  xref += `trailer\n<< /Size ${offsets.length} /Root 1 0 R >>\nstartxref\n${startXref}\n%%EOF`;

  pdf += xref;

  const pdfBytes = encoder.encode(pdf);
  let binStr = '';
  for (let i = 0; i < pdfBytes.length; i++) {
    binStr += String.fromCharCode(pdfBytes[i]);
  }
  const b64 = typeof btoa === 'function' ? btoa(binStr) : (globalThis as any).Buffer ? (globalThis as any).Buffer.from(pdfBytes).toString('base64') : '';
  return 'data:application/pdf;base64,' + b64;
}

const SAMPLE_PDF_AUTUMN_LEAVES = createValidSamplePdf(
  'Autumn Leaves',
  'Composer: Joseph Kosma',
  'Key: Emin | Tempo: 120 BPM | Style: Jazz Standard',
  '[4/4] Am7 | D7 | GMaj7 | CMaj7 | F#m7b5 | B7 | Em'
);

const SAMPLE_PDF_FLY_ME = createValidSamplePdf(
  'Fly Me to the Moon',
  'Composer: Bart Howard',
  'Key: Cmaj | Tempo: 118 BPM | Style: Swing',
  '[4/4] Am7 | Dm7 | G7 | CMaj7 | FMaj7 | Bm7b5 | E7 | Am'
);

const SAMPLE_PDF_MIGHTY_FORTRESS = createValidSamplePdf(
  'A Mighty Fortress Is Our God',
  'Composer: Martin Luther',
  'Key: Cmaj | Tempo: 100 BPM | Meter: 8.7.8.7.6.6.6.6.7',
  '[4/4] C | G | Am | F | C/E | G | C'
);

const SAMPLE_PDF_AMAZING_GRACE = createValidSamplePdf(
  'Amazing Grace',
  'Composer: John Newton',
  'Key: Gmaj | Tempo: 84 BPM | Meter: C.M.',
  '[3/4] G | C/G | G | D7 | G | C | G | D7 | G'
);

const SAMPLE_PDF_MAJOR_SCALES = createValidSamplePdf(
  'Major Scales & Arpeggios',
  'Section: Technique Warmup',
  'Key: Cmaj | Tempo: 140 BPM',
  'C - D - E - F - G - A - B - C | Arpeggios: C - E - G - C'
);

export const BUNDLED_SAMPLE_SONGS: Song[] = [
  // Original Library Songs (Sheet Music & Technique)
  {
    id: 'song_mighty_fortress',
    title: 'A Mighty Fortress Is Our God',
    artist: 'Martin Luther',
    key: 'Cmaj',
    originalKey: 'Cmaj',
    tempo: 100,
    timeSignature: '4/4',
    meter: '8.7.8.7.6.6.6.6.7',
    genre: 'Hymns',
    section: 'sheet_music',
    type: 'pdf',
    dateAdded: Date.now() - 50000000,
    fileBlob: SAMPLE_PDF_MIGHTY_FORTRESS as any,
    fileUrl: SAMPLE_PDF_MIGHTY_FORTRESS,
  },
  {
    id: 'song_autumn_leaves',
    title: 'Autumn Leaves',
    artist: 'Joseph Kosma',
    key: 'Emin',
    originalKey: 'Emin',
    tempo: 120,
    timeSignature: '4/4',
    genre: 'Jazz',
    section: 'sheet_music',
    type: 'pdf',
    dateAdded: Date.now() - 40000000,
    fileBlob: SAMPLE_PDF_AUTUMN_LEAVES as any,
    fileUrl: SAMPLE_PDF_AUTUMN_LEAVES,
  },
  {
    id: 'song_fly_me',
    title: 'Fly Me to the Moon',
    artist: 'Bart Howard',
    key: 'Cmaj',
    originalKey: 'Cmaj',
    tempo: 118,
    timeSignature: '4/4',
    genre: 'Jazz',
    section: 'sheet_music',
    type: 'pdf',
    dateAdded: Date.now() - 30000000,
    fileBlob: SAMPLE_PDF_FLY_ME as any,
    fileUrl: SAMPLE_PDF_FLY_ME,
  },
  {
    id: 'song_amazing_grace',
    title: 'Amazing Grace',
    artist: 'John Newton',
    key: 'Gmaj',
    originalKey: 'Gmaj',
    tempo: 84,
    timeSignature: '3/4',
    meter: 'C.M.',
    genre: 'Hymns',
    section: 'sheet_music',
    type: 'pdf',
    dateAdded: Date.now() - 20000000,
    fileBlob: SAMPLE_PDF_AMAZING_GRACE as any,
    fileUrl: SAMPLE_PDF_AMAZING_GRACE,
  },
  {
    id: 'song_major_scales',
    title: 'Major Scales & Arpeggios',
    artist: 'Technique Warmup',
    key: 'Cmaj',
    originalKey: 'Cmaj',
    tempo: 140,
    timeSignature: '4/4',
    genre: 'Scales',
    section: 'technique',
    type: 'pdf',
    dateAdded: Date.now() - 10000000,
    fileBlob: SAMPLE_PDF_MAJOR_SCALES as any,
    fileUrl: SAMPLE_PDF_MAJOR_SCALES,
  },

  // Duplicated Song Records for Default Setlists and Practice Routines
  {
    id: 'song_setlist_setlist_sunday_worship_song_mighty_fortress',
    title: 'A Mighty Fortress Is Our God',
    artist: 'Martin Luther',
    key: 'Cmaj',
    originalKey: 'Cmaj',
    tempo: 100,
    timeSignature: '4/4',
    meter: '8.7.8.7.6.6.6.6.7',
    genre: 'Hymns',
    section: 'sheet_music',
    type: 'pdf',
    dateAdded: Date.now() - 10000000,
    fileBlob: SAMPLE_PDF_MIGHTY_FORTRESS as any,
    fileUrl: SAMPLE_PDF_MIGHTY_FORTRESS,
    originalSongId: 'song_mighty_fortress',
    setlistId: 'setlist_sunday_worship',
    isSetlistDuplicate: true,
  },
  {
    id: 'song_setlist_setlist_sunday_worship_song_amazing_grace',
    title: 'Amazing Grace',
    artist: 'John Newton',
    key: 'Gmaj',
    originalKey: 'Gmaj',
    tempo: 84,
    timeSignature: '3/4',
    meter: 'C.M.',
    genre: 'Hymns',
    section: 'sheet_music',
    type: 'pdf',
    dateAdded: Date.now() - 10000000,
    fileBlob: SAMPLE_PDF_AMAZING_GRACE as any,
    fileUrl: SAMPLE_PDF_AMAZING_GRACE,
    originalSongId: 'song_amazing_grace',
    setlistId: 'setlist_sunday_worship',
    isSetlistDuplicate: true,
  },
  {
    id: 'song_setlist_setlist_jazz_gig_song_autumn_leaves',
    title: 'Autumn Leaves',
    artist: 'Joseph Kosma',
    key: 'Emin',
    originalKey: 'Emin',
    tempo: 120,
    timeSignature: '4/4',
    genre: 'Jazz',
    section: 'sheet_music',
    type: 'pdf',
    dateAdded: Date.now() - 5000000,
    fileBlob: SAMPLE_PDF_AUTUMN_LEAVES as any,
    fileUrl: SAMPLE_PDF_AUTUMN_LEAVES,
    originalSongId: 'song_autumn_leaves',
    setlistId: 'setlist_jazz_gig',
    isSetlistDuplicate: true,
  },
  {
    id: 'song_setlist_setlist_jazz_gig_song_fly_me',
    title: 'Fly Me to the Moon',
    artist: 'Bart Howard',
    key: 'Cmaj',
    originalKey: 'Cmaj',
    tempo: 118,
    timeSignature: '4/4',
    genre: 'Jazz',
    section: 'sheet_music',
    type: 'pdf',
    dateAdded: Date.now() - 5000000,
    fileBlob: SAMPLE_PDF_FLY_ME as any,
    fileUrl: SAMPLE_PDF_FLY_ME,
    originalSongId: 'song_fly_me',
    setlistId: 'setlist_jazz_gig',
    isSetlistDuplicate: true,
  },
  {
    id: 'song_setlist_routine_daily_warmup_song_major_scales',
    title: 'Major Scales & Arpeggios',
    artist: 'Technique Warmup',
    key: 'Cmaj',
    originalKey: 'Cmaj',
    tempo: 140,
    timeSignature: '4/4',
    genre: 'Scales',
    section: 'technique',
    type: 'pdf',
    dateAdded: Date.now() - 2000000,
    fileBlob: SAMPLE_PDF_MAJOR_SCALES as any,
    fileUrl: SAMPLE_PDF_MAJOR_SCALES,
    originalSongId: 'song_major_scales',
    setlistId: 'routine_daily_warmup',
    isSetlistDuplicate: true,
  },
];

export const BUNDLED_DEFAULT_SETLISTS: Setlist[] = [
  {
    id: 'setlist_sunday_worship',
    name: 'Sunday Worship',
    dateCreated: Date.now() - 10000000,
    dateModified: Date.now() - 10000000,
    type: 'sheet_music',
    items: [
      { songId: 'song_setlist_setlist_sunday_worship_song_mighty_fortress', notes: 'Opener hymn' },
      { songId: 'song_setlist_setlist_sunday_worship_song_amazing_grace', notes: 'Refinement' },
    ],
  },
  {
    id: 'setlist_jazz_gig',
    name: 'Jazz Standards Set',
    dateCreated: Date.now() - 5000000,
    dateModified: Date.now() - 5000000,
    type: 'sheet_music',
    items: [
      { songId: 'song_setlist_setlist_jazz_gig_song_autumn_leaves', notes: 'Swing feel' },
      { songId: 'song_setlist_setlist_jazz_gig_song_fly_me', notes: 'Up tempo' },
    ],
  },
  {
    id: 'routine_daily_warmup',
    name: 'Daily Warmup Routine',
    dateCreated: Date.now() - 2000000,
    dateModified: Date.now() - 2000000,
    type: 'technique',
    items: [
      { songId: 'song_setlist_routine_daily_warmup_song_major_scales', notes: '10 mins at 120 BPM' },
    ],
  },
];
