import { pdfjsLib } from './pdfWorker';
import { Song } from '../types';
import { getSongById } from './db';

/**
 * Converts any PDF data source (Blob, ArrayBuffer, base64 data URL, blob URL)
 * into a fresh ArrayBuffer.
 */
export async function toArrayBuffer(pdfData: Blob | ArrayBuffer | Uint8Array | string): Promise<ArrayBuffer> {
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
    // Fast path: direct base64 data URI
    if (pdfData.startsWith('data:')) {
      try {
        const commaIdx = pdfData.indexOf(',');
        const base64 = commaIdx >= 0 ? pdfData.slice(commaIdx + 1) : pdfData;
        const binaryStr = window.atob(base64.trim());
        const bytes = new Uint8Array(binaryStr.length);
        for (let i = 0; i < binaryStr.length; i++) {
          bytes[i] = binaryStr.charCodeAt(i);
        }
        return bytes.buffer as ArrayBuffer;
      } catch (decodeErr) {
        console.warn('Direct base64 decode failed, falling back to fetch:', decodeErr);
      }
    }

    if (pdfData.startsWith('blob:') || pdfData.startsWith('http://') || pdfData.startsWith('https://') || pdfData.startsWith('data:')) {
      const response = await fetch(pdfData);
      const blob = await response.blob();
      const buffer = await blob.arrayBuffer();
      return buffer.slice(0);
    }

    // Raw base64 string without scheme
    try {
      const binaryStr = window.atob(pdfData.trim());
      const bytes = new Uint8Array(binaryStr.length);
      for (let i = 0; i < binaryStr.length; i++) {
        bytes[i] = binaryStr.charCodeAt(i);
      }
      return bytes.buffer as ArrayBuffer;
    } catch (e) {
      console.warn('Raw base64 parse failed:', e);
    }
  }

  throw new Error('Unsupported PDF data format');
}

/**
 * Resolves full PDF data for a song, loading from IndexedDB if necessary.
 */
export async function resolveSongPdfData(song: Song): Promise<Blob | ArrayBuffer | string | null> {
  if (song.fileBlob) return song.fileBlob;
  if (song.fileUrl) return song.fileUrl;

  if (song.id) {
    try {
      const fullSong = await getSongById(song.id);
      if (fullSong?.fileBlob) return fullSong.fileBlob;
      if (fullSong?.fileUrl) return fullSong.fileUrl;
    } catch (err) {
      console.warn('Failed to load song from IndexedDB for printing:', err);
    }
  }

  return null;
}

/**
 * Renders all pages of a PDF document to high-resolution PNG Data URLs.
 * Uses 1600px width minimum to ensure notation staves and lyrics are laser-sharp on paper.
 */
export async function renderAllPdfPagesToDataUrls(
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
export function printInHiddenIframe(htmlContent: string, title: string): Promise<boolean> {
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
export function buildPdfPrintHtml(title: string, dataUrls: string[]): string {
  const safeTitle = title.replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>${safeTitle} - Sheet Music</title>
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
      background: #f8fafc;
      color: #000000 !important;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    }
    .no-print-toolbar {
      position: sticky;
      top: 0;
      z-index: 999;
      background: #0f172a;
      color: #ffffff;
      padding: 12px 24px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    }
    .no-print-toolbar h2 {
      margin: 0;
      font-size: 15px;
      font-weight: 800;
    }
    .no-print-toolbar .actions {
      display: flex;
      gap: 10px;
    }
    .no-print-toolbar button {
      background: #0284c7;
      color: #ffffff;
      border: 0;
      padding: 8px 18px;
      border-radius: 6px;
      font-weight: 800;
      font-size: 13px;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }
    .no-print-toolbar button.close-btn {
      background: #334155;
    }
    .print-container {
      width: 100%;
      max-width: 900px;
      margin: 20px auto;
      background: #ffffff;
      padding: 20px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.08);
      border-radius: 8px;
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
      margin: 0 0 1.5rem 0;
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
      border-radius: 4px;
    }
    @media print {
      .no-print-toolbar {
        display: none !important;
      }
      body {
        background: #ffffff !important;
      }
      .print-container {
        margin: 0 !important;
        padding: 0 !important;
        max-width: 100% !important;
        box-shadow: none !important;
        border-radius: 0 !important;
      }
      .print-page {
        margin-bottom: 0 !important;
      }
    }
  </style>
</head>
<body>
  <div class="no-print-toolbar">
    <div>
      <h2>${safeTitle}</h2>
      <span style="font-size: 11px; opacity: 0.7;">Print-Ready High Resolution Vector Score</span>
    </div>
    <div class="actions">
      <button type="button" onclick="window.print()">🖨️ Print Now (Ctrl+P / Cmd+P)</button>
      <button type="button" class="close-btn" onclick="window.close()">Close Window</button>
    </div>
  </div>
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
  <script>
    // Auto-trigger print dialog when window finishes loading
    window.addEventListener('load', function() {
      setTimeout(function() {
        try { window.print(); } catch(e) {}
      }, 500);
    });
  </script>
</body>
</html>`;
}

/**
 * Builds printable HTML document for songs without PDF attachments (chords, lyrics, notes).
 */
export function buildTextSongPrintHtml(song: Song): string {
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
  <title>${safeTitle} - Sheet Music</title>
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
      background: #f8fafc;
      color: #111827 !important;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      line-height: 1.5;
    }
    .no-print-toolbar {
      position: sticky;
      top: 0;
      z-index: 999;
      background: #0f172a;
      color: #ffffff;
      padding: 12px 24px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    }
    .no-print-toolbar h2 {
      margin: 0;
      font-size: 15px;
      font-weight: 800;
    }
    .no-print-toolbar button {
      background: #0284c7;
      color: #ffffff;
      border: 0;
      padding: 8px 18px;
      border-radius: 6px;
      font-weight: 800;
      font-size: 13px;
      cursor: pointer;
    }
    .sheet-card {
      max-width: 750px;
      margin: 24px auto;
      padding: 2rem;
      background: #ffffff;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.06);
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
    @media print {
      .no-print-toolbar {
        display: none !important;
      }
      body {
        background: #ffffff !important;
      }
      .sheet-card {
        margin: 0 !important;
        padding: 0 !important;
        max-width: 100% !important;
        border: none !important;
        box-shadow: none !important;
      }
    }
  </style>
</head>
<body>
  <div class="no-print-toolbar">
    <div>
      <h2>${safeTitle}</h2>
    </div>
    <button type="button" onclick="window.print()">🖨️ Print Chart (Ctrl+P / Cmd+P)</button>
  </div>
  <div class="sheet-card">
    <div class="header">
      <h1 class="title">${safeTitle}</h1>
      ${safeArtist ? `<div class="artist">${safeArtist}</div>` : ''}
    </div>
    <div class="meta-grid">
      <div class="meta-item">
        <div class="meta-label">Category</div>
        <div class="meta-val">${safeGenre || 'General'}</div>
      </div>
      <div class="meta-item">
        <div class="meta-label">Time Signature</div>
        <div class="meta-val">${song.timeSignature || '4/4'}</div>
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
  <script>
    window.addEventListener('load', function() {
      setTimeout(function() {
        try { window.print(); } catch(e) {}
      }, 500);
    });
  </script>
</body>
</html>`;
}

/**
 * Opens the song in a new browser tab formatted cleanly for native full-page printing.
 * This 100% bypasses any iframe sandbox restrictions.
 */
export async function openSongInPrintTab(
  song: Song,
  onStatusChange?: (status: string) => void
): Promise<boolean> {
  try {
    const pdfData = await resolveSongPdfData(song);

    if (pdfData) {
      onStatusChange?.('Rendering print-ready pages...');
      const dataUrls = await renderAllPdfPagesToDataUrls(pdfData, (current, total) => {
        onStatusChange?.(`Rendering page ${current} of ${total}...`);
      });

      if (dataUrls.length === 0) throw new Error('No printable pages rendered');

      onStatusChange?.('Opening print window...');
      const htmlContent = buildPdfPrintHtml(song.title, dataUrls);
      const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
      const blobUrl = URL.createObjectURL(blob);

      const win = window.open(blobUrl, '_blank');
      if (!win) {
        // Fallback: create temporary download/open link
        const a = document.createElement('a');
        a.href = blobUrl;
        a.target = '_blank';
        a.click();
      }
      return true;
    } else {
      onStatusChange?.('Preparing chart...');
      const htmlContent = buildTextSongPrintHtml(song);
      const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
      const blobUrl = URL.createObjectURL(blob);
      const win = window.open(blobUrl, '_blank');
      if (!win) {
        const a = document.createElement('a');
        a.href = blobUrl;
        a.target = '_blank';
        a.click();
      }
      return true;
    }
  } catch (err) {
    console.error('Failed to open print tab:', err);
    return false;
  } finally {
    onStatusChange?.('');
  }
}

/**
 * Downloads the PDF file directly to disk for offline printing or AirPrint.
 */
export async function downloadSongPdf(song: Song): Promise<boolean> {
  try {
    const pdfData = await resolveSongPdfData(song);
    if (!pdfData) return false;

    let blobUrl = '';
    let shouldRevoke = false;

    if (pdfData instanceof Blob) {
      blobUrl = URL.createObjectURL(pdfData);
      shouldRevoke = true;
    } else if (pdfData instanceof ArrayBuffer) {
      const blob = new Blob([pdfData], { type: 'application/pdf' });
      blobUrl = URL.createObjectURL(blob);
      shouldRevoke = true;
    } else if (typeof pdfData === 'string') {
      if (pdfData.startsWith('blob:')) {
        blobUrl = pdfData;
      } else {
        const arrayBuf = await toArrayBuffer(pdfData);
        const blob = new Blob([arrayBuf], { type: 'application/pdf' });
        blobUrl = URL.createObjectURL(blob);
        shouldRevoke = true;
      }
    }

    if (!blobUrl) return false;

    const safeFilename = `${song.title.replace(/[^a-zA-Z0-9_\- ]/g, '_').trim() || 'sheet_music'}.pdf`;
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = safeFilename;
    document.body.appendChild(a);
    a.click();
    a.remove();

    if (shouldRevoke) {
      setTimeout(() => URL.revokeObjectURL(blobUrl), 60000);
    }
    return true;
  } catch (err) {
    console.error('Failed to download PDF:', err);
    return false;
  }
}

/**
 * Main print routine. Renders the PDF vector pages in memory and triggers the device print dialog.
 */
export async function printSong(
  song: Song,
  onStatusChange?: (status: string) => void
): Promise<void> {
  try {
    const pdfData = await resolveSongPdfData(song);

    if (pdfData) {
      onStatusChange?.('Rendering high-resolution pages...');
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
        // Fallback: open in print tab
        await openSongInPrintTab(song, onStatusChange);
      }
    } else {
      onStatusChange?.('Preparing chart...');
      const printHtml = buildTextSongPrintHtml(song);
      const success = await printInHiddenIframe(printHtml, song.title);
      if (!success) {
        await openSongInPrintTab(song, onStatusChange);
      }
    }
  } catch (err) {
    console.error('Error during print execution:', err);
    // Ultimate fallback: open printable score tab
    try {
      await openSongInPrintTab(song, onStatusChange);
    } catch (tabErr) {
      console.error('Print tab fallback failed:', tabErr);
      try {
        window.print();
      } catch (windowErr) {
        console.error('window.print() fallback failed:', windowErr);
      }
    }
  } finally {
    onStatusChange?.('');
  }
}

