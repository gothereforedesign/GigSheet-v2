import { pdfjsLib } from './pdfWorker';
import { Song } from '../types';

/**
 * Converts any PDF data source (Blob, ArrayBuffer, base64 data URL, blob URL)
 * into a fresh ArrayBuffer.
 */
async function toArrayBuffer(pdfData: Blob | ArrayBuffer | Uint8Array | string): Promise<ArrayBuffer> {
  if (!pdfData) throw new Error('No PDF data provided');

  if (pdfData instanceof ArrayBuffer) {
    return pdfData.slice(0);
  }
  if (pdfData instanceof Uint8Array || ArrayBuffer.isView(pdfData)) {
    const view = pdfData as Uint8Array;
    const copy = new Uint8Array(view.byteLength);
    copy.set(view);
    return copy.buffer as ArrayBuffer;
  }
  if (pdfData instanceof Blob) {
    const buffer = await pdfData.arrayBuffer();
    return buffer.slice(0);
  }
  if (typeof pdfData === 'string') {
    if (pdfData.startsWith('data:') || pdfData.startsWith('blob:') || pdfData.startsWith('http://') || pdfData.startsWith('https://')) {
      const response = await fetch(pdfData);
      const blob = await response.blob();
      const buffer = await blob.arrayBuffer();
      return buffer.slice(0);
    }
    // Raw base64 string
    const binaryStr = window.atob(pdfData.trim());
    const bytes = new Uint8Array(binaryStr.length);
    for (let i = 0; i < binaryStr.length; i++) {
      bytes[i] = binaryStr.charCodeAt(i);
    }
    return bytes.buffer as ArrayBuffer;
  }

  throw new Error('Unsupported PDF data format');
}

/**
 * Renders all pages of a PDF document to high-resolution PNG Data URLs.
 * Uses 1600px width minimum to ensure notation staves and lyrics are laser-sharp on paper.
 */
async function renderAllPdfPagesToDataUrls(
  pdfData: Blob | ArrayBuffer | Uint8Array | string,
  onProgress?: (current: number, total: number) => void
): Promise<string[]> {
  const arrayBuffer = await toArrayBuffer(pdfData);
  const loadingTask = pdfjsLib.getDocument({
    data: new Uint8Array(arrayBuffer),
    cMapUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/cmaps/',
    cMapPacked: true,
  });

  const pdfDoc = await loadingTask.promise;
  const numPages = pdfDoc.numPages;
  const dataUrls: string[] = [];

  for (let pageNum = 1; pageNum <= numPages; pageNum++) {
    if (onProgress) onProgress(pageNum, numPages);

    const page = await pdfDoc.getPage(pageNum);
    const baseViewport = page.getViewport({ scale: 1.0 });

    // 1600px width minimum for crisp 300 DPI print quality
    const minPrintWidth = 1600;
    const printScale = Math.max(2.0, minPrintWidth / (baseViewport.width || 600));
    const viewport = page.getViewport({ scale: printScale });

    const canvas = document.createElement('canvas');
    canvas.width = Math.floor(viewport.width);
    canvas.height = Math.floor(viewport.height);

    const context = canvas.getContext('2d', { alpha: false });
    if (context) {
      context.fillStyle = '#ffffff';
      context.fillRect(0, 0, canvas.width, canvas.height);

      await page.render({
        canvasContext: context,
        viewport: viewport,
        intent: 'print',
      }).promise;

      dataUrls.push(canvas.toDataURL('image/png', 1.0));
    }
  }

  return dataUrls;
}

/**
 * Creates an isolated, hidden iframe to trigger the native device print dialog
 * without interfering with the parent application DOM, navigation, or styles.
 */
function printInHiddenIframe(htmlContent: string, title: string): Promise<boolean> {
  return new Promise((resolve) => {
    // Remove any previously orphaned print iframes
    const oldFrame = document.getElementById('gigsheet-print-frame');
    if (oldFrame) {
      try {
        oldFrame.remove();
      } catch {}
    }

    const iframe = document.createElement('iframe');
    iframe.id = 'gigsheet-print-frame';
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    iframe.style.visibility = 'hidden';
    iframe.setAttribute('aria-hidden', 'true');

    document.body.appendChild(iframe);

    const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!iframeDoc) {
      resolve(false);
      return;
    }

    iframeDoc.open();
    iframeDoc.write(htmlContent);
    iframeDoc.close();

    const triggerPrint = () => {
      try {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
        resolve(true);
      } catch (err) {
        console.warn('Iframe print execution warning:', err);
        resolve(false);
      } finally {
        // Clean up iframe after printing dialog closes
        setTimeout(() => {
          try {
            iframe.remove();
          } catch {}
        }, 60000);
      }
    };

    // Wait for all image assets to load completely before invoking print
    const images = Array.from(iframeDoc.querySelectorAll('img'));
    if (images.length === 0) {
      setTimeout(triggerPrint, 200);
    } else {
      let loaded = 0;
      const onImgDone = () => {
        loaded++;
        if (loaded >= images.length) {
          setTimeout(triggerPrint, 250);
        }
      };

      images.forEach((img) => {
        if (img.complete) {
          onImgDone();
        } else {
          img.onload = onImgDone;
          img.onerror = onImgDone;
        }
      });

      // Fallback timeout in case image events stall
      setTimeout(triggerPrint, 3000);
    }
  });
}

/**
 * Builds printable HTML document for PDF score pages.
 */
function buildPdfPrintHtml(title: string, dataUrls: string[]): string {
  const safeTitle = title.replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>${safeTitle}</title>
  <style>
    @page {
      size: auto;
      margin: 0.3in;
    }
    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    html, body {
      margin: 0 !important;
      padding: 0 !important;
      background: #ffffff !important;
      color: #000000 !important;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    }
    .print-container {
      width: 100%;
      max-width: 100%;
      margin: 0 auto;
    }
    .print-page {
      display: block;
      width: 100%;
      max-width: 100%;
      height: auto;
      page-break-inside: avoid !important;
      break-inside: avoid !important;
      page-break-after: always !important;
      break-after: page !important;
      margin: 0 0 1rem 0;
    }
    .print-page:last-child {
      page-break-after: auto !important;
      break-after: auto !important;
      margin-bottom: 0 !important;
    }
    img {
      display: block;
      width: 100%;
      max-width: 100%;
      height: auto;
      border: 0;
    }
  </style>
</head>
<body>
  <div class="print-container">
    ${dataUrls
      .map(
        (url, idx) => `
      <div class="print-page">
        <img src="${url}" alt="Page ${idx + 1}" />
      </div>`
      )
      .join('')}
  </div>
</body>
</html>`;
}

/**
 * Builds printable HTML document for songs without PDF attachments (chords, lyrics, notes).
 */
function buildTextSongPrintHtml(song: Song): string {
  const safeTitle = song.title.replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const safeArtist = (song.artist || '').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const safeGenre = (song.genre || '').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const safeLyrics = (song.lyrics || song.userNotes || '')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>${safeTitle}</title>
  <style>
    @page {
      size: auto;
      margin: 0.5in;
    }
    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    html, body {
      margin: 0 !important;
      padding: 0 !important;
      background: #ffffff !important;
      color: #111827 !important;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      line-height: 1.5;
    }
    .sheet-card {
      max-width: 750px;
      margin: 0 auto;
      padding: 1.5rem;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
    }
    .header {
      border-bottom: 2px solid #0f172a;
      padding-bottom: 0.75rem;
      margin-bottom: 1rem;
    }
    .title {
      font-size: 24px;
      font-weight: 900;
      margin: 0;
      color: #0f172a;
    }
    .artist {
      font-size: 14px;
      color: #475569;
      font-weight: 600;
      margin-top: 2px;
    }
    .meta-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 8px;
      margin-bottom: 1.25rem;
      background: #f8fafc;
      padding: 10px;
      border-radius: 6px;
      border: 1px solid #e2e8f0;
    }
    .meta-item {
      text-align: center;
    }
    .meta-label {
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      color: #64748b;
    }
    .meta-val {
      font-size: 14px;
      font-weight: 800;
      color: #0c4a6e;
      margin-top: 2px;
    }
    .notes-section {
      margin-top: 1rem;
      font-family: monospace;
      font-size: 13px;
      white-space: pre-wrap;
      line-height: 1.6;
      background: #ffffff;
      padding: 1rem;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
    }
  </style>
</head>
<body>
  <div class="sheet-card">
    <div class="header">
      <h1 class="title">${safeTitle}</h1>
      ${safeArtist ? `<div class="artist">${safeArtist}</div>` : ''}
    </div>
    <div class="meta-grid">
      <div class="meta-item">
        <div class="meta-label">Key</div>
        <div class="meta-val">${song.key || 'C'}</div>
      </div>
      <div class="meta-item">
        <div class="meta-label">Tempo</div>
        <div class="meta-val">${song.tempo ? `${song.tempo} BPM` : '120'}</div>
      </div>
      <div class="meta-item">
        <div class="meta-label">Time Signature</div>
        <div class="meta-val">${song.timeSignature || '4/4'}</div>
      </div>
      <div class="meta-item">
        <div class="meta-label">Category</div>
        <div class="meta-val">${safeGenre || 'General'}</div>
      </div>
    </div>
    ${
      song.meter
        ? `<div style="font-size: 12px; margin-bottom: 0.75rem; color: #475569;"><strong>Hymn Meter:</strong> ${song.meter}</div>`
        : ''
    }
    ${
      safeLyrics
        ? `<div class="notes-section"><strong>Notes & Chords:</strong>\n\n${safeLyrics}</div>`
        : '<div style="font-size: 12px; color: #94a3b8; text-align: center; padding: 2rem;">No lyrics or chord notes attached.</div>'
    }
  </div>
</body>
</html>`;
}

/**
 * Main print routine. Renders the PDF vector pages in memory and triggers the device print dialog.
 */
export async function printSong(
  song: Song,
  onStatusChange?: (status: string) => void
): Promise<void> {
  try {
    const hasPdf = Boolean(song.fileBlob || song.fileUrl);

    if (hasPdf) {
      onStatusChange?.('Rendering high-resolution pages...');
      const pdfData = song.fileBlob || song.fileUrl!;
      const dataUrls = await renderAllPdfPagesToDataUrls(pdfData, (current, total) => {
        onStatusChange?.(`Rendering page ${current} of ${total}...`);
      });

      if (dataUrls.length === 0) {
        throw new Error('No printable pages rendered');
      }

      onStatusChange?.('Opening print dialog...');
      const printHtml = buildPdfPrintHtml(song.title, dataUrls);
      const success = await printInHiddenIframe(printHtml, song.title);

      if (!success) {
        // Fallback: direct window.print()
        window.print();
      }
    } else {
      onStatusChange?.('Preparing chart...');
      const printHtml = buildTextSongPrintHtml(song);
      const success = await printInHiddenIframe(printHtml, song.title);
      if (!success) {
        window.print();
      }
    }
  } catch (err) {
    console.error('Error during print execution:', err);
    // Ultimate fallback: trigger top-level window.print()
    try {
      window.print();
    } catch (windowErr) {
      console.error('window.print() fallback failed:', windowErr);
    }
  } finally {
    onStatusChange?.('');
  }
}
