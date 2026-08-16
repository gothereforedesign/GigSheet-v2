import Dexie, { Table } from 'dexie';

export type PDFCategory = 'Sheet Music' | 'Technique' | 'Scales' | 'Exercises' | 'Unassigned';

export interface PDFDocument {
  id?: number;
  title: string;
  category: PDFCategory;
  tags: string[];
  fileName: string;
  fileSize: number;
  blob: Blob;
  createdAt: number;
}

export class MusicPDFStore extends Dexie {
  pdfs!: Table<PDFDocument, number>;

  constructor() {
    super('MusicPDFStore');
    this.version(1).stores({
      pdfs: '++id, title, category, *tags, fileName, fileSize, createdAt',
    });
  }
}

export const db = new MusicPDFStore();
