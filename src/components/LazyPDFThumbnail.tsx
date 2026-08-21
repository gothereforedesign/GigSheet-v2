import React, { useState, useEffect, useRef } from 'react';
import { pdfjsLib } from '../lib/pdfWorker';
import { getSongBlob } from '../lib/db';
import { FileText, Image as ImageIcon, Music, Loader2 } from 'lucide-react';

interface LazyPDFThumbnailProps {
  songId: string;
  songType: 'pdf' | 'image' | 'musicxml' | 'svg';
  fileUrl?: string;
  title: string;
  className?: string;
}

// Global memory cache for rendered thumbnail data URLs
const thumbCache = new Map<string, string>();

export const LazyPDFThumbnail: React.FC<LazyPDFThumbnailProps> = ({
  songId,
  songType,
  fileUrl,
  title,
  className = 'w-full h-full object-cover',
}) => {
  const [thumbUrl, setThumbUrl] = useState<string | null>(thumbCache.get(songId) || null);
  const [isLoading, setIsLoading] = useState<boolean>(!thumbCache.has(songId));
  const [hasError, setHasError] = useState<boolean>(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const isVisibleRef = useRef<boolean>(false);

  useEffect(() => {
    if (thumbCache.has(songId)) {
      setThumbUrl(thumbCache.get(songId)!);
      setIsLoading(false);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          isVisibleRef.current = true;
          observer.disconnect();
          loadThumbnail();
        }
      },
      { rootMargin: '200px' }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => {
      observer.disconnect();
    };
  }, [songId]);

  const loadThumbnail = async () => {
    if (thumbCache.has(songId)) {
      setThumbUrl(thumbCache.get(songId)!);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);

      if (fileUrl && (songType === 'image' || songType === 'svg')) {
        thumbCache.set(songId, fileUrl);
        setThumbUrl(fileUrl);
        setIsLoading(false);
        return;
      }

      const blobOrData = await getSongBlob(songId);
      if (!blobOrData) {
        setIsLoading(false);
        setHasError(true);
        return;
      }

      if (songType === 'image' || (blobOrData instanceof Blob && blobOrData.type.startsWith('image/'))) {
        const url = blobOrData instanceof Blob ? URL.createObjectURL(blobOrData) : String(blobOrData);
        thumbCache.set(songId, url);
        setThumbUrl(url);
        setIsLoading(false);
        return;
      }

      if (songType === 'pdf' || (blobOrData instanceof Blob && blobOrData.type.includes('pdf'))) {
        let arrayBuffer: ArrayBuffer;
        if (blobOrData instanceof ArrayBuffer) {
          arrayBuffer = blobOrData;
        } else if (blobOrData instanceof Blob) {
          arrayBuffer = await blobOrData.arrayBuffer();
        } else if (typeof blobOrData === 'string' && blobOrData.startsWith('data:')) {
          const res = await fetch(blobOrData);
          arrayBuffer = await res.arrayBuffer();
        } else {
          setIsLoading(false);
          setHasError(true);
          return;
        }

        let pdf: any = null;
        let page: any = null;
        try {
          pdf = await pdfjsLib.getDocument({
            data: new Uint8Array(arrayBuffer),
            cMapUrl: 'https://unpkg.com/pdfjs-dist@3.11.174/cmaps/',
            cMapPacked: true,
            standardFontDataUrl: 'https://unpkg.com/pdfjs-dist@3.11.174/standard_fonts/',
            disableAutoFetch: false,
            disableStream: false,
            stopAtErrors: false,
          }).promise;
          page = await pdf.getPage(1);

          const baseViewport = page.getViewport({ scale: 1.0 });
          // Ensure thumbnail canvas is at least 320px wide for crisp preview regardless of small intrinsic PDF point size
          const targetWidth = 320;
          const scale = Math.max(0.5, targetWidth / (baseViewport.width || 300));
          const viewport = page.getViewport({ scale });

          const canvas = document.createElement('canvas');
          canvas.width = Math.floor(viewport.width);
          canvas.height = Math.floor(viewport.height);
          const ctx = canvas.getContext('2d');

          if (ctx) {
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            await page.render({ canvasContext: ctx, viewport }).promise;
            const dataUrl = canvas.toDataURL('image/jpeg', 0.8);

            thumbCache.set(songId, dataUrl);
            setThumbUrl(dataUrl);
            setIsLoading(false);
          }
        } finally {
          if (page) {
            try { page.cleanup(); } catch (e) {}
          }
          if (pdf) {
            try { await pdf.destroy(); } catch (e) {}
          }
        }
      } else {
        setIsLoading(false);
        setHasError(true);
      }
    } catch (err) {
      console.warn('Failed to generate thumbnail for song:', songId, err);
      setIsLoading(false);
      setHasError(true);
    }
  };

  return (
    <div ref={containerRef} className="w-full h-full relative overflow-hidden bg-slate-100 flex items-center justify-center">
      {thumbUrl ? (
        <img
          src={thumbUrl}
          alt={title}
          className={`${className} animate-in fade-in duration-300`}
        />
      ) : isLoading ? (
        <div className="flex flex-col items-center justify-center gap-1.5 p-4 text-slate-400">
          <Loader2 className="w-5 h-5 animate-spin text-sky-600" />
          <span className="text-[10px] font-bold uppercase tracking-wider">Loading...</span>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center gap-1.5 p-4 text-slate-400">
          <FileText className="w-6 h-6 text-slate-400" />
          <span className="text-[10px] font-bold uppercase tracking-wider">PDF Chart</span>
        </div>
      )}
    </div>
  );
};
