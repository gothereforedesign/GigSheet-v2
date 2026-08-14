import React, { useState, useEffect } from 'react';
import { pdfjsLib } from '../lib/pdfWorker';
import { FileText, FolderEdit, Trash2, Music } from 'lucide-react';
import { Song } from '../types';
import { getSongBlob } from '../lib/db';

// Global in-memory thumbnail cache so rendered thumbnails persist while the app is open
const thumbnailCache = new Map<string, string>();

// Concurrency queue to prevent 50 PDFs from rendering thumbnails simultaneously
let runningThumbnailJobs = 0;
const MAX_CONCURRENT_THUMBNAILS = 2;
const thumbnailQueue: (() => void)[] = [];

function enqueueThumbnailTask(task: () => Promise<void>) {
  return new Promise<void>((resolve) => {
    const runTask = async () => {
      runningThumbnailJobs++;
      try {
        await task();
      } finally {
        runningThumbnailJobs--;
        if (thumbnailQueue.length > 0) {
          const next = thumbnailQueue.shift();
          if (next) next();
        }
        resolve();
      }
    };

    if (runningThumbnailJobs < MAX_CONCURRENT_THUMBNAILS) {
      runTask();
    } else {
      thumbnailQueue.push(runTask);
    }
  });
}

interface SongPreviewCardProps {
  song: Song;
  isTechnique?: boolean;
  onSelectSong: (song: Song) => void;
  onDeleteSong: (id: string) => void;
  onEditSong: (song: Song) => void;
}

export const SongPreviewCard: React.FC<SongPreviewCardProps> = ({
  song,
  isTechnique = false,
  onSelectSong,
  onDeleteSong,
  onEditSong,
}) => {
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(() => {
    return thumbnailCache.get(song.id) || null;
  });
  const [isLoading, setIsLoading] = useState<boolean>(!thumbnailCache.has(song.id));

  useEffect(() => {
    if (thumbnailCache.has(song.id)) {
      setThumbnailUrl(thumbnailCache.get(song.id)!);
      setIsLoading(false);
      return;
    }

    let isCancelled = false;

    async function loadThumbnail() {
      try {
        setIsLoading(true);

        if (song.fileUrl && (song.type === 'image' || song.type === 'svg')) {
          thumbnailCache.set(song.id, song.fileUrl);
          if (!isCancelled) {
            setThumbnailUrl(song.fileUrl);
            setIsLoading(false);
          }
          return;
        }

        const blobOrData = await getSongBlob(song.id);
        if (isCancelled) return;

        if (!blobOrData) {
          setIsLoading(false);
          return;
        }

        if (song.type === 'image' || (blobOrData instanceof Blob && blobOrData.type.startsWith('image/'))) {
          const url = blobOrData instanceof Blob ? URL.createObjectURL(blobOrData) : String(blobOrData);
          thumbnailCache.set(song.id, url);
          if (!isCancelled) {
            setThumbnailUrl(url);
            setIsLoading(false);
          }
          return;
        }

        if (song.type === 'pdf' || (blobOrData instanceof Blob && blobOrData.type.includes('pdf'))) {
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
            return;
          }

          if (isCancelled) return;

          const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) }).promise;
          if (isCancelled) return;

          const page = await pdf.getPage(1);
          if (isCancelled) return;

          const viewport = page.getViewport({ scale: 0.6 });
          const canvas = document.createElement('canvas');
          canvas.width = Math.floor(viewport.width);
          canvas.height = Math.floor(viewport.height);
          const ctx = canvas.getContext('2d');

          if (ctx) {
            await page.render({ canvasContext: ctx, viewport, canvas }).promise;
            if (isCancelled) return;

            const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
            thumbnailCache.set(song.id, dataUrl);
            if (!isCancelled) {
              setThumbnailUrl(dataUrl);
              setIsLoading(false);
            }
            return;
          }
        }

        setIsLoading(false);
      } catch (err) {
        console.warn(`Could not render thumbnail for ${song.title}:`, err);
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    }

    enqueueThumbnailTask(loadThumbnail);

    return () => {
      isCancelled = true;
    };
  }, [song.id, song.type, song.fileUrl]);

  // Swipe left to delete gesture handler
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const startXRef = React.useRef<number | null>(null);
  const startYRef = React.useRef<number | null>(null);
  const isPointerDownRef = React.useRef(false);
  const isSwipingRef = React.useRef(false);
  const animFrameRef = React.useRef<number | null>(null);

  const handlePointerDown = (e: React.PointerEvent) => {
    if (e.button !== undefined && e.button !== 0) return;
    startXRef.current = e.clientX;
    startYRef.current = e.clientY;
    isPointerDownRef.current = true;
    isSwipingRef.current = false;
    setIsDragging(true);
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {}
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isPointerDownRef.current || startXRef.current === null || startYRef.current === null) return;
    const diffX = e.clientX - startXRef.current;
    const diffY = e.clientY - startYRef.current;

    if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 5) {
      if (diffX < 0) {
        isSwipingRef.current = true;
        const offset = Math.max(-130, diffX);
        if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = requestAnimationFrame(() => {
          setSwipeOffset(offset);
        });
      } else {
        if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = requestAnimationFrame(() => {
          setSwipeOffset(0);
        });
      }
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!isPointerDownRef.current) return;
    isPointerDownRef.current = false;
    setIsDragging(false);
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {}

    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);

    if (swipeOffset < -65) {
      onDeleteSong(song.id);
    }
    setSwipeOffset(0);
    startXRef.current = null;
    startYRef.current = null;
    setTimeout(() => {
      isSwipingRef.current = false;
    }, 100);
  };

  const handleClick = (e: React.MouseEvent) => {
    if (isSwipingRef.current || Math.abs(swipeOffset) > 10) {
      e.stopPropagation();
      return;
    }
    onSelectSong(song);
  };

  return (
    <div className={`relative overflow-hidden rounded-lg select-none touch-pan-y ${swipeOffset < 0 ? 'bg-rose-600' : 'bg-transparent'}`}>
      {/* Trash Background Indicator Revealed ONLY on Left Swipe */}
      {swipeOffset < 0 && (
        <div className="absolute inset-y-0 right-0 w-28 bg-rose-600 flex items-center justify-end px-3 sm:px-4 text-white font-black text-xs gap-1.5">
          <Trash2 className="w-5 h-5 stroke-[2.2]" />
          <span className="uppercase text-[10px] tracking-wider font-black">Trash</span>
        </div>
      )}

      <div
        style={{ transform: `translate3d(${swipeOffset}px, 0, 0)`, willChange: 'transform' }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onClick={handleClick}
        className={`bg-white border border-slate-200/90 rounded-lg overflow-hidden shadow-2xs hover:shadow-md cursor-pointer group flex flex-col active:scale-[0.98] ${
          isDragging ? 'transition-none' : 'transition-transform duration-200 ease-out'
        } ${
          isTechnique ? 'hover:border-purple-400' : 'hover:border-sky-400'
        }`}
      >
        {/* Thumbnail Container (compact 30% shorter aspect ratio) */}
        <div className="relative aspect-[16/11] w-full bg-slate-100/80 border-b border-slate-200/60 flex items-center justify-center overflow-hidden">
          {thumbnailUrl ? (
            <img
              src={thumbnailUrl}
              alt={song.title}
              className="w-full h-full object-cover object-top"
            />
          ) : (
            <div className="flex flex-col items-center justify-center p-3 text-center text-slate-400">
              {isLoading ? (
                <div className={`w-6 h-6 border-2 border-t-transparent rounded-full animate-spin ${
                  isTechnique ? 'border-purple-600' : 'border-sky-600'
                }`} />
              ) : (
                <>
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-1.5 ${
                    isTechnique ? 'bg-purple-50 text-purple-900' : 'bg-sky-50 text-[#0c4a6e]'
                  }`}>
                    <FileText className="w-4 h-4 stroke-[1.8]" />
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">PDF Sheet</span>
                </>
              )}
            </div>
          )}
        </div>

        {/* Bottom Info Section - 75% smaller height to maximize PDF visibility */}
        <div className="px-2.5 py-1 bg-white flex items-center justify-between gap-1.5 min-h-[28px] shrink-0">
          <div className="min-w-0 flex-1">
            <h3 className={`text-xs font-bold text-slate-900 truncate leading-tight ${
              isTechnique ? 'group-hover:text-purple-900' : 'group-hover:text-[#0c4a6e]'
            }`}>
              {song.title}
            </h3>
            {song.artist && (
              <p className="text-[10px] font-medium text-slate-400 truncate -mt-0.5">
                {song.artist}
              </p>
            )}
          </div>

          {/* Edit Button directly visible on preview card */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onEditSong(song);
            }}
            className={`p-1 rounded-md text-slate-400 hover:text-slate-800 active:scale-90 cursor-pointer shrink-0 ${
              isTechnique ? 'hover:bg-purple-50 hover:text-purple-900' : 'hover:bg-slate-100 hover:text-[#0c4a6e]'
            }`}
            title="Edit Chart Info"
          >
            <FolderEdit className="w-3.5 h-3.5 stroke-[2]" />
          </button>
        </div>
      </div>
    </div>
  );
};
