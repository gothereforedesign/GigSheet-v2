import { Song, Setlist } from '../types';

export function createValidSamplePdf(title: string, subtitle: string, details: string, chords: string): string {
  const sanitize = (str: string) =>
    (str || '')
      .replace(/\\/g, '\\\\')
      .replace(/\(/g, '\\(')
      .replace(/\)/g, '\\)')
      .replace(/[^\x20-\x7E]/g, '');

  const safeTitle = sanitize(title);
  const safeSubtitle = sanitize(subtitle);
  const safeDetails = sanitize(details);
  const safeChords = sanitize(chords);

  const contentStream =
    'BT\n' +
    '/F1 22 Tf\n' +
    '50 730 Td\n' +
    '(' + safeTitle + ') Tj\n' +
    '/F1 12 Tf\n' +
    '0 -28 Td\n' +
    '(' + safeSubtitle + ') Tj\n' +
    '0 -22 Td\n' +
    '(' + safeDetails + ') Tj\n' +
    '/F1 14 Tf\n' +
    '0 -40 Td\n' +
    '(CHORDS & LEAD SHEET:) Tj\n' +
    '/F1 12 Tf\n' +
    '0 -25 Td\n' +
    '(' + safeChords + ') Tj\n' +
    'ET';

  const streamLen = contentStream.length;

  let body = '%PDF-1.4\n';
  const offsets: number[] = [0];

  function addObj(objStr: string) {
    offsets.push(body.length);
    body += objStr + '\n';
  }

  addObj('1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj');
  addObj('2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj');
  addObj('3 0 obj\n<< /Type /Page /Parent 2 0 R /Resources << /Font << /F1 4 0 R >> >> /MediaBox [0 0 612 792] /Contents 5 0 R >>\nendobj');
  addObj('4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj');
  addObj('5 0 obj\n<< /Length ' + streamLen + ' >>\nstream\n' + contentStream + '\nendstream\nendobj');

  const startXref = body.length;
  let xref = 'xref\n0 ' + offsets.length + '\n0000000000 65535 f \n';
  for (let i = 1; i < offsets.length; i++) {
    xref += String(offsets[i]).padStart(10, '0') + ' 00000 n \n';
  }
  xref += 'trailer\n<< /Size ' + offsets.length + ' /Root 1 0 R >>\nstartxref\n' + startXref + '\n%%EOF';

  const fullPdf = body + xref;
  const b64 = btoa(fullPdf);
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

export const BUNDLED_SAMPLE_SONGS: Song[] = [];

export const BUNDLED_DEFAULT_SETLISTS: Setlist[] = [];
