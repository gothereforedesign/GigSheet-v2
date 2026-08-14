import * as pdfjsLib from 'pdfjs-dist';

if (typeof window !== 'undefined' && pdfjsLib) {
  pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
}

export { pdfjsLib };

