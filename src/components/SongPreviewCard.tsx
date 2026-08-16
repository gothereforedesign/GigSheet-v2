import React, { useState } from 'react';
import { FolderEdit, Trash2 } from 'lucide-react';
import { Song } from '../types';
import { LazyPDFThumbnail } from './LazyPDFThumbnail';

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
    <div className={`relative overflow-hidden rounded-sm select-none touch-pan-y ${swipeOffset < 0 ? 'bg-rose-600' : 'bg-transparent'}`}>
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
        className={`bg-white border border-slate-200/90 rounded-sm overflow-hidden shadow-2xs hover:shadow-md cursor-pointer group flex flex-col active:scale-[0.98] ${
          isDragging ? 'transition-none' : 'transition-transform duration-200 ease-out'
        } ${
          isTechnique ? 'hover:border-purple-400' : 'hover:border-sky-400'
        }`}
      >
        {/* Lazy Thumbnail Container */}
        <div className="relative aspect-[16/11] w-full bg-slate-100/80 border-b border-slate-200/60 flex items-center justify-center overflow-hidden">
          <LazyPDFThumbnail
            songId={song.id}
            songType={song.type}
            fileUrl={song.fileUrl}
            title={song.title}
            className="w-full h-full object-cover object-top"
          />
        </div>

        {/* Bottom Info Section */}
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
