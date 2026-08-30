import React, { useState, useEffect, useRef } from 'react';
import { Song } from '../types';
import { PdfSheetViewer } from './PdfSheetViewer';
import { 
  X, ChevronLeft, ChevronRight, ListPlus,
  Loader2, ExternalLink, ZoomIn, ZoomOut, RotateCcw,
  Upload, Music, FileText, Clock, Hash
} from 'lucide-react';
import { getSongById, saveSong } from '../lib/db';
import { saveSongDirectDirectBlob } from '../lib/dbStorage';
import { getCategoryPalette, getStoredCategoryColors } from '../lib/categoryStorage';

interface SongViewerModalProps {
  song: Song;
  onClose: () => void;
  onAddToSetlist?: (song: Song) => void;
  onSaveSong?: (song: Song) => void;
  navigation?: {
    currentIndex: number;
    totalCount: number;
    onNavigate: (index: number) => void;
    listName?: string;
  };
}

export const SongViewerModal: React.FC<SongViewerModalProps> = ({
  song: initialSong,
  onClose,
  onAddToSetlist,
  onSaveSong,
  navigation,
}) => {
  const [song, setSong] = useState<Song>(initialSong);
  const [isLoading, setIsLoading] = useState(true);
  const [, setNumPages] = useState(1);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Derive Category Brand Styling
  const section = song.section === 'technique' ? 'technique' : 'sheet_music';
  const isTechnique = section === 'technique';
  const categoryColors = getStoredCategoryColors(section);
  const palette = getCategoryPalette(song.genre, categoryColors, section);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    try {
      const updatedSong: Song = {
        ...song,
        type: 'pdf',
        fileName: file.name,
        fileBlob: file,
        dateModified: Date.now(),
      };

      await saveSongDirectDirectBlob(updatedSong, file);
      const reloaded = await getSongById(song.id);
      if (reloaded) {
        setSong(reloaded);
        if (onSaveSong) onSaveSong(reloaded);
      } else {
        setSong(updatedSong);
        if (onSaveSong) onSaveSong(updatedSong);
      }
    } catch (err) {
      console.error('Failed to attach PDF to song:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const [zoomLevel, setZoomLevel] = useState<number>(() => {
    try {
      const songZoom = localStorage.getItem(`gigsheet_pdf_zoom_${initialSong.id}`);
      if (songZoom) {
        const val = parseInt(songZoom, 10);
        if (!isNaN(val) && val >= 50 && val <= 300) return val;
      }
    } catch (e) {}
    return 100;
  });

  useEffect(() => {
    try {
      const songZoom = localStorage.getItem(`gigsheet_pdf_zoom_${initialSong.id}`);
      if (songZoom) {
        const val = parseInt(songZoom, 10);
        if (!isNaN(val) && val >= 50 && val <= 300) {
          setZoomLevel(val);
          return;
        }
      }
    } catch (e) {}
    setZoomLevel(100);
  }, [initialSong.id]);

  const updateZoom = (newZoom: number | ((prev: number) => number)) => {
    setZoomLevel((prev) => {
      const next = typeof newZoom === 'function' ? newZoom(prev) : newZoom;
      const clamped = Math.min(300, Math.max(50, next));
      try {
        localStorage.setItem(`gigsheet_pdf_zoom_${song.id || initialSong.id}`, String(clamped));
      } catch (e) {}
      return clamped;
    });
  };

  // Synchronously sync initial song props and fetch full PDF blob from DB
  useEffect(() => {
    let isMounted = true;
    
    // Check if initialSong already has blob/fileUrl/svgData attached
    const hasContent = Boolean(initialSong.fileBlob || initialSong.fileUrl || initialSong.svgData);
    setSong(initialSong);

    if (!hasContent) {
      setIsLoading(true);
    } else {
      setIsLoading(false);
    }

    const fetchFullSong = async () => {
      try {
        const fullSong = await getSongById(initialSong.id);
        if (fullSong && isMounted) {
          setSong(fullSong);
        }
      } catch (err) {
        console.error('Failed to load full song content:', err);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    fetchFullSong();

    return () => {
      isMounted = false;
    };
  }, [initialSong.id, initialSong.fileBlob, initialSong.fileUrl, initialSong.svgData]);

  // Keyboard navigation listener (Left/Right arrow keys & Escape)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const targetTag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      if (targetTag === 'input' || targetTag === 'textarea') return;

      if (e.key === 'Escape') {
        onClose();
        return;
      }

      if (navigation && navigation.totalCount > 1) {
        if (e.key === 'ArrowLeft' && navigation.currentIndex > 0) {
          navigation.onNavigate(navigation.currentIndex - 1);
        } else if (e.key === 'ArrowRight' && navigation.currentIndex < navigation.totalCount - 1) {
          navigation.onNavigate(navigation.currentIndex + 1);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigation, onClose]);

  // Screen Wake Lock API handle
  useEffect(() => {
    let wakeLock: any = null;
    const requestWakeLock = async () => {
      try {
        if ('wakeLock' in navigator) {
          wakeLock = await (navigator as any).wakeLock.request('screen');
        }
      } catch (err) {
        console.warn('Wake Lock request failed:', err);
      }
    };
    requestWakeLock();

    return () => {
      if (wakeLock) {
        wakeLock.release().catch(() => {});
      }
    };
  }, []);

  // Open PDF safely in new tab / window with native PDF viewer print controls
  const handleOpenPdf = () => {
    const file = song.fileBlob || song.fileUrl;
    if (!file) return;

    try {
      if (typeof file === 'string') {
        if (file.startsWith('data:')) {
          fetch(file)
            .then((res) => res.blob())
            .then((blob) => {
              const pdfBlob = blob.type.includes('pdf') ? blob : new Blob([blob], { type: 'application/pdf' });
              const blobUrl = URL.createObjectURL(pdfBlob);
              window.open(blobUrl, '_blank');
            })
            .catch(() => {
              window.open(file, '_blank');
            });
          return;
        }
        window.open(file, '_blank');
        return;
      }

      if (file instanceof Blob) {
        const pdfBlob = file.type.includes('pdf') ? file : new Blob([file], { type: 'application/pdf' });
        const blobUrl = URL.createObjectURL(pdfBlob);
        window.open(blobUrl, '_blank');
        return;
      }

      if (file instanceof ArrayBuffer) {
        const blob = new Blob([file], { type: 'application/pdf' });
        const blobUrl = URL.createObjectURL(blob);
        window.open(blobUrl, '_blank');
        return;
      }
    } catch (err) {
      console.error('Failed to open PDF in new tab:', err);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-950 text-white w-screen h-screen overflow-hidden select-none">
      {/* Top Header Bar */}
      <header className="sticky top-0 z-50 text-white px-3 sm:px-6 py-3 flex items-center justify-between gap-3 shrink-0 min-h-[60px] bg-slate-950/90 border-b border-slate-800/80 backdrop-blur-md">
        {/* Item 1: Close Button + Chart Title */}
        <div className="flex items-center gap-2 max-w-[80vw] sm:max-w-md md:max-w-xl min-w-0">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            className="p-2 sm:px-3 sm:py-1.5 rounded-md bg-slate-900 hover:bg-slate-800 text-white active:scale-95 cursor-pointer transition-colors border border-slate-700/80 shrink-0 flex items-center gap-1.5 shadow-lg"
            title="Close Viewer (Esc)"
          >
            <X className="w-4 h-4 stroke-[2.5]" />
            <span className="hidden sm:inline text-xs font-black uppercase tracking-wider">Close</span>
          </button>

          <div className="flex items-center gap-2 min-w-0 px-3 py-1.5 rounded-md bg-slate-900 border border-slate-700/80 shadow-lg">
            <h3 className="text-xs sm:text-sm font-extrabold text-white truncate leading-tight">
              {song.title}
            </h3>

            <span className="hidden md:inline-block text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-xs bg-slate-800 text-slate-300 border border-slate-700 shrink-0 shadow-2xs">
              {navigation?.listName || song.genre || (isTechnique ? 'Scales' : 'Hymns')}
            </span>
          </div>
        </div>

        {/* Item 2: Actions */}
        <div className="flex items-center gap-1.5 shrink-0">
          {onAddToSetlist && (
            <button
              type="button"
              onClick={() => onAddToSetlist(song)}
              className="px-2.5 sm:px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-sky-300 hover:text-white rounded-md text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 border border-slate-700/80 transition-all cursor-pointer active:scale-95 shadow-lg"
              title={isTechnique ? "Add to Practice Routine" : "Add to Performance Setlist"}
            >
              <ListPlus className="w-3.5 h-3.5 stroke-[2.2]" />
              <span className="hidden sm:inline text-[11px] font-black">
                {isTechnique ? '+ Routine' : '+ Setlist'}
              </span>
            </button>
          )}

          <button
            type="button"
            onClick={handleOpenPdf}
            className="px-2.5 sm:px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-md text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 border border-slate-700/80 transition-all cursor-pointer active:scale-95 shadow-lg"
            title="Open PDF chart in new tab to view or print"
          >
            <span className="text-[11px] font-black">Open PDF</span>
            <ExternalLink className="w-3.5 h-3.5 stroke-[2.2]" />
          </button>
        </div>
      </header>

      {/* Main Sheet Music Viewing Canvas */}
      <main className="flex-1 w-full relative overflow-hidden flex flex-col bg-slate-950">
        <input 
          type="file" 
          ref={fileInputRef} 
          onChange={handleFileUpload} 
          accept="application/pdf" 
          className="hidden" 
        />
        <div className="w-full h-full flex-1 relative overflow-hidden">
          {(song.fileBlob || song.fileUrl) ? (
            <PdfSheetViewer
              pdfData={song.fileBlob || song.fileUrl!}
              title={song.title}
              songId={song.id}
              zoomLevel={zoomLevel}
              externalZoomControls={true}
              onNumPagesChange={setNumPages}
            />
          ) : song.svgData ? (
            <div className="w-full h-full overflow-auto flex items-center justify-center p-4">
              <div 
                className="max-w-4xl w-full flex justify-center bg-white p-4 rounded-xl shadow-lg border border-slate-200"
                dangerouslySetInnerHTML={{ __html: song.svgData }}
              />
            </div>
          ) : !isLoading ? (
            <div className="w-full h-full overflow-y-auto p-4 sm:p-8 flex items-center justify-center">
              <div className="max-w-xl w-full bg-slate-900/90 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl backdrop-blur-md text-white flex flex-col items-center text-center gap-5">
                <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shadow-inner">
                  <Music className="w-8 h-8 stroke-[1.8]" />
                </div>

                <div className="space-y-1 max-w-md">
                  <h3 className="text-xl sm:text-2xl font-black tracking-tight text-white">{song.title}</h3>
                  <p className="text-slate-400 font-medium text-sm">{song.artist || 'Unknown Composer'}</p>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 w-full py-2">
                  <div className="bg-slate-950/60 border border-slate-800/80 p-2.5 rounded-xl flex flex-col items-center">
                    <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400">Key</span>
                    <span className="text-sm font-black text-amber-400 mt-0.5">{song.key}</span>
                  </div>
                  <div className="bg-slate-950/60 border border-slate-800/80 p-2.5 rounded-xl flex flex-col items-center">
                    <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400">Tempo</span>
                    <span className="text-sm font-black text-sky-400 mt-0.5">{song.tempo} BPM</span>
                  </div>
                  <div className="bg-slate-950/60 border border-slate-800/80 p-2.5 rounded-xl flex flex-col items-center">
                    <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400">Time Sig</span>
                    <span className="text-sm font-black text-indigo-400 mt-0.5">{song.timeSignature}</span>
                  </div>
                  <div className="bg-slate-950/60 border border-slate-800/80 p-2.5 rounded-xl flex flex-col items-center">
                    <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400">Genre</span>
                    <span className="text-sm font-black text-emerald-400 mt-0.5 truncate max-w-[80px]">{song.genre}</span>
                  </div>
                </div>

                {song.meter && (
                  <div className="w-full bg-slate-950/40 border border-slate-800/50 p-3 rounded-xl text-xs text-left text-slate-300">
                    <span className="font-bold text-slate-400 uppercase text-[10px] tracking-wider block mb-0.5">Hymn Meter</span>
                    {song.meter}
                  </div>
                )}

                {(song.lyrics || song.userNotes) && (
                  <div className="w-full bg-slate-950/40 border border-slate-800/50 p-3 rounded-xl text-xs text-left text-slate-300 max-h-40 overflow-y-auto">
                    <span className="font-bold text-slate-400 uppercase text-[10px] tracking-wider block mb-1">Notes / Lyrics</span>
                    <p className="whitespace-pre-wrap leading-relaxed text-slate-200">{song.lyrics || song.userNotes}</p>
                  </div>
                )}

                <div className="pt-2 w-full flex flex-col sm:flex-row items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full sm:w-auto px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-lg shadow-indigo-600/20 active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Upload className="w-4 h-4 stroke-[2.2]" />
                    <span>Attach PDF Chart</span>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center p-8 text-white text-xs text-center gap-2">
              <Loader2 className="w-8 h-8 animate-spin text-white mb-1" />
              <p className="font-bold uppercase tracking-wider text-white/90">Loading Chart PDF...</p>
            </div>
          )}
        </div>
      </main>

      {/* Bottom Navigation & Performance Controls */}
      <footer className="sticky bottom-0 inset-x-0 z-40 text-white px-3 sm:px-6 py-2.5 sm:py-3 flex items-center justify-between gap-2 select-none min-h-[60px] w-full shrink-0 pointer-events-none bg-transparent">
        {/* Item 3: Zoom Controls */}
        <div className="flex items-center gap-1 bg-slate-900/90 border border-slate-700/80 p-1 rounded-md shadow-lg backdrop-blur-md pointer-events-auto shrink-0">
          <button
            type="button"
            onClick={() => updateZoom((z) => Math.max(50, z - 5))}
            className="px-3 sm:px-4 py-1.5 min-w-[42px] sm:min-w-[48px] h-9 flex items-center justify-center text-slate-300 hover:text-white hover:bg-slate-800 active:scale-95 rounded-sm cursor-pointer transition-all"
            title="Zoom Out (-5%)"
          >
            <ZoomOut className="w-4 h-4 stroke-[2.5]" />
          </button>
          
          <span className="text-xs font-black tracking-wider text-slate-200 px-1.5 min-w-[42px] text-center whitespace-nowrap">
            {zoomLevel}%
          </span>

          <button
            type="button"
            onClick={() => updateZoom((z) => Math.min(300, z + 5))}
            className="px-3 sm:px-4 py-1.5 min-w-[42px] sm:min-w-[48px] h-9 flex items-center justify-center text-slate-300 hover:text-white hover:bg-slate-800 active:scale-95 rounded-sm cursor-pointer transition-all"
            title="Zoom In (+5%)"
          >
            <ZoomIn className="w-4 h-4 stroke-[2.5]" />
          </button>

          {zoomLevel !== 100 && (
            <button
              type="button"
              onClick={() => updateZoom(100)}
              className="px-2.5 py-1.5 h-9 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 active:scale-95 rounded-sm cursor-pointer transition-all border-l border-slate-800 ml-0.5"
              title="Reset Zoom to 100%"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Item 4: Directory Navigation */}
        {navigation && navigation.totalCount > 1 ? (
          <div className="flex items-center gap-1.5 sm:gap-2 pointer-events-auto shrink-0">
            <button
              onClick={() => navigation.onNavigate(navigation.currentIndex - 1)}
              disabled={navigation.currentIndex <= 0}
              className="px-3.5 sm:px-5 py-1.5 h-9 min-w-[48px] sm:min-w-[70px] rounded-md bg-slate-900/90 hover:bg-slate-800 active:scale-95 disabled:opacity-25 text-white cursor-pointer transition-all flex items-center justify-center gap-1 shadow-lg backdrop-blur-md font-extrabold text-xs shrink-0 border border-slate-700/80"
              title="Previous Chart (Left Arrow)"
            >
              <ChevronLeft className="w-5 h-5 stroke-[2.8]" />
              <span className="hidden sm:inline uppercase tracking-wider text-[11px]">Prev</span>
            </button>

            <div className="px-3 py-1.5 h-9 flex items-center justify-center bg-slate-900/90 border border-slate-700/80 text-slate-200 rounded-md text-xs font-black tracking-wider text-center whitespace-nowrap shrink-0 shadow-lg backdrop-blur-md">
              {navigation.currentIndex + 1} <span className="text-slate-500 font-normal mx-0.5">/</span> {navigation.totalCount}
            </div>

            <button
              onClick={() => navigation.onNavigate(navigation.currentIndex + 1)}
              disabled={navigation.currentIndex >= navigation.totalCount - 1}
              className="px-3.5 sm:px-5 py-1.5 h-9 min-w-[48px] sm:min-w-[70px] rounded-md bg-slate-900/90 hover:bg-slate-800 active:scale-95 disabled:opacity-25 text-white cursor-pointer transition-all flex items-center justify-center gap-1 shadow-lg backdrop-blur-md font-extrabold text-xs shrink-0 border border-slate-700/80"
              title="Next Chart (Right Arrow)"
            >
              <span className="hidden sm:inline uppercase tracking-wider text-[11px]">Next</span>
              <ChevronRight className="w-5 h-5 stroke-[2.8]" />
            </button>
          </div>
        ) : null}
      </footer>
    </div>
  );
};
