import React, { useEffect, useState, useRef, useCallback } from 'react';
import { pdfjsLib } from '../lib/pdfWorker';
import { AlertCircle, Loader2, ZoomIn, ZoomOut, RotateCcw, ExternalLink } from 'lucide-react';

interface PdfSheetViewerProps {
  pdfData: Blob | ArrayBuffer | Uint8Array | string;
  title?: string;
  songId?: string;
  zoomLevel?: number;
  externalZoomControls?: boolean;
  onNumPagesChange?: (pages: number) => void;
}

// Individual progressive page renderer component with canvas cancellation
interface PdfPageProps {
  pdfDoc: any;
  pageNumber: number;
  zoomScale: number;
  title: string;
}

const PdfPage: React.FC<PdfPageProps> = React.memo(({
  pdfDoc,
  pageNumber,
  zoomScale,
  title,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isRendered, setIsRendered] = useState(false);
  const [aspectRatio, setAspectRatio] = useState<number>(1.414); // Standard A4 default
  const renderTaskRef = useRef<any>(null);

  useEffect(() => {
    let isCancelled = false;

    const renderPage = async () => {
      if (!pdfDoc || !canvasRef.current) return;

      try {
        // Cancel any pending render task on this canvas
        if (renderTaskRef.current) {
          try {
            renderTaskRef.current.cancel();
          } catch (e) {}
          renderTaskRef.current = null;
        }

        const page = await pdfDoc.getPage(pageNumber);
        if (isCancelled || !canvasRef.current) return;

        // Base viewport at 1.0 scale to get true aspect ratio
        const baseViewport = page.getViewport({ scale: 1.0 });
        if (baseViewport.width > 0 && baseViewport.height > 0) {
          setAspectRatio(baseViewport.height / baseViewport.width);
        }

        // Render resolution: Crisp 2.0x for ultra-sharp sheet music staves and notation
        const renderScale = 2.0;
        const viewport = page.getViewport({ scale: renderScale });

        const canvas = canvasRef.current;
        const context = canvas.getContext('2d', { alpha: false });
        if (!context) return;

        canvas.width = Math.floor(viewport.width);
        canvas.height = Math.floor(viewport.height);

        // Fill canvas with pure white background before drawing
        context.fillStyle = '#ffffff';
        context.fillRect(0, 0, canvas.width, canvas.height);

        const renderContext = {
          canvasContext: context,
          viewport: viewport,
          intent: 'display',
        };

        const task = page.render(renderContext);
        renderTaskRef.current = task;

        await task.promise;

        if (!isCancelled) {
          setIsRendered(true);
        }
      } catch (err: any) {
        // If cancelled, ignore error
        if (err?.name !== 'RenderingCancelledException' && !isCancelled) {
          console.warn(`Page ${pageNumber} render warning:`, err);
        }
      }
    };

    renderPage();

    return () => {
      isCancelled = true;
      if (renderTaskRef.current) {
        try {
          renderTaskRef.current.cancel();
        } catch (e) {}
      }
    };
  }, [pdfDoc, pageNumber]);

  return (
    <div
      ref={containerRef}
      className="bg-white rounded-lg shadow-xl border border-slate-800 overflow-hidden relative transition-all duration-150 flex justify-center"
      style={{
        width: `${zoomScale}%`,
        maxWidth: zoomScale <= 100 ? '100%' : 'none',
        minHeight: !isRendered ? '320px' : undefined,
        aspectRatio: !isRendered ? `1 / ${aspectRatio}` : undefined,
      }}
    >
      <canvas
        ref={canvasRef}
        className="w-full h-auto object-contain block pointer-events-none rounded-lg"
        style={{ display: isRendered ? 'block' : 'none' }}
      />

      {!isRendered && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/60 text-slate-300 p-4 space-y-2">
          <Loader2 className="w-6 h-6 animate-spin text-sky-400" />
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-300">
            Page {pageNumber}
          </span>
        </div>
      )}
    </div>
  );
});

export const PdfSheetViewer: React.FC<PdfSheetViewerProps> = ({
  pdfData,
  title = 'Sheet Music PDF',
  songId,
  zoomLevel: externalZoom,
  externalZoomControls = false,
  onNumPagesChange,
}) => {
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [numPages, setNumPages] = useState<number>(0);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);

  // Initialize zoom
  const getInitialZoom = (id?: string) => {
    try {
      if (id) {
        const songZoom = localStorage.getItem(`gigsheet_pdf_zoom_${id}`);
        if (songZoom) {
          const val = parseInt(songZoom, 10);
          if (!isNaN(val) && val >= 50 && val <= 300) return val;
        }
      }
      const globalZoom = localStorage.getItem('gigsheet_global_pdf_zoom');
      if (globalZoom) {
        const val = parseInt(globalZoom, 10);
        if (!isNaN(val) && val >= 50 && val <= 300) return val;
      }
    } catch (e) {
      console.error('Error reading saved zoom:', e);
    }
    return 100;
  };

  const [zoomLevel, setZoomLevel] = useState<number>(() => getInitialZoom(songId));
  const effectiveZoom = externalZoom !== undefined ? externalZoom : zoomLevel;

  useEffect(() => {
    setZoomLevel(getInitialZoom(songId));
  }, [songId]);

  const updateZoom = (newZoom: number | ((prev: number) => number)) => {
    setZoomLevel((prev) => {
      const next = typeof newZoom === 'function' ? newZoom(prev) : newZoom;
      const clamped = Math.min(300, Math.max(50, next));
      try {
        if (songId) {
          localStorage.setItem(`gigsheet_pdf_zoom_${songId}`, String(clamped));
        }
        localStorage.setItem('gigsheet_global_pdf_zoom', String(clamped));
      } catch (e) {}
      return clamped;
    });
  };

  // Convert input into ArrayBuffer efficiently
  const getArrayBuffer = useCallback(async (): Promise<{ buffer: ArrayBuffer; blobUrl: string }> => {
    if (!pdfData) throw new Error('No PDF data provided');

    if (pdfData instanceof ArrayBuffer) {
      const blob = new Blob([pdfData], { type: 'application/pdf' });
      return { buffer: pdfData, blobUrl: URL.createObjectURL(blob) };
    }
    if (pdfData instanceof Uint8Array) {
      const copy = new Uint8Array(pdfData.byteLength);
      copy.set(pdfData);
      const buffer = copy.buffer as ArrayBuffer;
      const blob = new Blob([buffer], { type: 'application/pdf' });
      return { buffer, blobUrl: URL.createObjectURL(blob) };
    }
    if (pdfData instanceof Blob) {
      const createdBlobUrl = URL.createObjectURL(pdfData);
      const buffer = await pdfData.arrayBuffer();
      return { buffer, blobUrl: createdBlobUrl };
    }
    if (typeof pdfData === 'string') {
      if (pdfData.startsWith('data:application/pdf') || pdfData.startsWith('data:')) {
        const res = await fetch(pdfData);
        const blob = await res.blob();
        const buffer = await blob.arrayBuffer();
        return { buffer, blobUrl: URL.createObjectURL(blob) };
      }
      if (pdfData.startsWith('blob:') || pdfData.startsWith('http://') || pdfData.startsWith('https://')) {
        const response = await fetch(pdfData);
        const blob = await response.blob();
        const buffer = await blob.arrayBuffer();
        return { buffer, blobUrl: pdfData.startsWith('blob:') ? pdfData : URL.createObjectURL(blob) };
      }
      // Raw base64 string fallback
      const binaryStr = window.atob(pdfData.trim());
      const bytes = new Uint8Array(binaryStr.length);
      for (let i = 0; i < binaryStr.length; i++) {
        bytes[i] = binaryStr.charCodeAt(i);
      }
      const blob = new Blob([bytes], { type: 'application/pdf' });
      return { buffer: bytes.buffer, blobUrl: URL.createObjectURL(blob) };
    }
    throw new Error('Unsupported PDF data format');
  }, [pdfData]);

  // Load PDF document proxy
  useEffect(() => {
    let isCancelled = false;
    let localBlobUrl: string | null = null;

    const loadDocument = async () => {
      setLoading(true);
      setError(null);

      try {
        const { buffer, blobUrl: url } = await getArrayBuffer();
        if (isCancelled) {
          if (url && url.startsWith('blob:')) URL.revokeObjectURL(url);
          return;
        }

        localBlobUrl = url;
        setBlobUrl(url);

        const version = pdfjsLib.version || '6.2.108';
        const loadingTask = pdfjsLib.getDocument({
          data: new Uint8Array(buffer),
          cMapUrl: `https://cdn.jsdelivr.net/npm/pdfjs-dist@${version}/cmaps/`,
          cMapPacked: true,
          disableAutoFetch: false,
          disableStream: false,
        });

        const loadedDoc = await loadingTask.promise;
        if (isCancelled) return;

        setPdfDoc(loadedDoc);
        setNumPages(loadedDoc.numPages);
        if (onNumPagesChange) {
          onNumPagesChange(loadedDoc.numPages);
        }
        setLoading(false);
      } catch (err: any) {
        console.error('PDF Document load error:', err);
        if (!isCancelled) {
          setError(err.message || 'Failed to load PDF document.');
          setLoading(false);
        }
      }
    };

    loadDocument();

    return () => {
      isCancelled = true;
      if (localBlobUrl && localBlobUrl.startsWith('blob:')) {
        try {
          URL.revokeObjectURL(localBlobUrl);
        } catch (e) {}
      }
    };
  }, [pdfData, getArrayBuffer]);

  const pageNumbers = React.useMemo(() => {
    if (!numPages) return [];
    return Array.from({ length: numPages }, (_, i) => i + 1);
  }, [numPages]);

  return (
    <div className="w-full h-full bg-slate-950 relative flex flex-col items-center overflow-hidden select-none">
      {/* Main Scrollable Canvas Area */}
      <div className="w-full h-full overflow-y-auto pt-2 pb-24 px-2 flex flex-col items-center scroll-smooth">
        {loading && (
          <div className="my-auto flex flex-col items-center justify-center p-8 bg-slate-900/80 rounded-2xl border border-slate-800 text-white text-center space-y-3 max-w-sm mx-auto shadow-2xl">
            <Loader2 className="w-8 h-8 text-sky-400 animate-spin" />
            <div>
              <p className="text-xs font-black uppercase tracking-wider text-sky-300">
                Opening Sheet Music PDF
              </p>
              <p className="text-[10px] text-slate-400 mt-0.5 font-medium">
                Loading high-definition vector pages...
              </p>
            </div>
          </div>
        )}

        {error && !loading && (
          <div className="my-auto flex flex-col items-center justify-center p-6 bg-slate-900 rounded-2xl border border-rose-900/50 text-slate-300 text-center space-y-4 max-w-md mx-auto shadow-2xl">
            <AlertCircle className="w-10 h-10 text-rose-500" />
            <div>
              <p className="text-sm font-black uppercase tracking-wider text-white">
                PDF Render Notice
              </p>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                {error}
              </p>
            </div>

            {blobUrl && (
              <a
                href={blobUrl}
                target="_blank"
                rel="noreferrer"
                className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold uppercase tracking-wider rounded-xl transition-all flex items-center gap-1.5 shadow-md"
              >
                <span>Open in Native Viewer</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
          </div>
        )}

        {!loading && !error && pdfDoc && numPages > 0 && (
          <div className="flex flex-col items-center w-full space-y-3 my-2 max-w-5xl">
            {pageNumbers.map((pNum) => (
              <PdfPage
                key={pNum}
                pdfDoc={pdfDoc}
                pageNumber={pNum}
                zoomScale={effectiveZoom}
                title={title}
              />
            ))}
          </div>
        )}
      </div>

      {/* Floating Zoom & Page Counter Bar (Shown if external controls are not used) */}
      {!externalZoomControls && (
        <div className="absolute bottom-3 inset-x-0 z-30 flex items-center justify-center gap-2.5 px-3 max-w-lg mx-auto pointer-events-none">
          <div className="bg-slate-900/95 backdrop-blur-md border border-slate-700/80 rounded-2xl px-2.5 py-1.5 shadow-2xl flex items-center gap-1.5 pointer-events-auto">
            <button
              type="button"
              onClick={() => updateZoom((z) => Math.max(50, z - 5))}
              className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-800 active:scale-95 rounded-xl cursor-pointer transition-all"
              title="Zoom Out (-5%)"
            >
              <ZoomOut className="w-4 h-4" />
            </button>

            <span className="text-[11px] font-black uppercase tracking-wider text-sky-300 px-1 min-w-[38px] text-center select-none whitespace-nowrap">
              {zoomLevel}%
            </span>

            <button
              type="button"
              onClick={() => updateZoom((z) => Math.min(300, z + 5))}
              className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-800 active:scale-95 rounded-xl cursor-pointer transition-all"
              title="Zoom In (+5%)"
            >
              <ZoomIn className="w-4 h-4" />
            </button>

            {zoomLevel !== 100 && (
              <button
                type="button"
                onClick={() => updateZoom(100)}
                className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 active:scale-95 rounded-xl cursor-pointer transition-all border-l border-slate-800 ml-0.5"
                title="Reset Zoom (100%)"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {numPages > 1 && (
            <div className="bg-slate-900/95 backdrop-blur-md border border-slate-700/80 text-white text-[10px] font-extrabold uppercase tracking-wider px-3 py-1.5 rounded-2xl shadow-2xl pointer-events-auto select-none whitespace-nowrap">
              {numPages} Pages
            </div>
          )}
        </div>
      )}
    </div>
  );
};
