import React, { useState, useEffect, useRef } from 'react';
import { Song, ActiveTab } from '../types';
import { PdfSheetViewer } from './PdfSheetViewer';
import { 
  X, ChevronLeft, ChevronRight, ListPlus,
  Loader2, ZoomIn, ZoomOut, RotateCcw,
  Download, Check, Music, Upload
} from 'lucide-react';
import { getSongById, saveSong } from '../lib/db';
import { saveSongDirectDirectBlob } from '../lib/dbStorage';
import { getCategoryPalette, getStoredCategoryColors } from '../lib/categoryStorage';
import { downloadSongPdf } from '../lib/printEngine';

interface SongViewerModalProps {
  song: Song;
  activeTab?: ActiveTab;
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
  activeTab,
  onClose,
  onAddToSetlist,
  onSaveSong,
  navigation,
}) => {
  const [song, setSong] = useState<Song>(initialSong);
  const [isLoading, setIsLoading] = useState(true);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);
  const [, setNumPages] = useState(1);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Landscape Orientation Clean View Mode
  const [isLandscape, setIsLandscape] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return window.matchMedia('(orientation: landscape)').matches;
    }
    return false;
  });
  const [showLandscapeOverlay, setShowLandscapeOverlay] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const mediaQuery = window.matchMedia('(orientation: landscape)');
    const handleOrientationChange = () => {
      const matches = mediaQuery.matches;
      setIsLandscape(matches);
      if (matches) {
        setShowLandscapeOverlay(false);
      }
    };

    handleOrientationChange();

    try {
      mediaQuery.addEventListener('change', handleOrientationChange);
      return () => mediaQuery.removeEventListener('change', handleOrientationChange);
    } catch {
      mediaQuery.addListener(handleOrientationChange);
      return () => mediaQuery.removeListener(handleOrientationChange);
    }
  }, []);

  const isLandscapeClean = isLandscape && !showLandscapeOverlay;

  const handleToggleLandscapeOverlay = () => {
    if (isLandscape) {
      setShowLandscapeOverlay((prev) => !prev);
    }
  };

  // Derive Section Brand Styling based on where PDF is being viewed
  const viewerSection: 'sheet_music' | 'technique' | 'setlists' | 'trash' = (() => {
    if (activeTab === 'technique') return 'technique';
    if (activeTab === 'sheet_music_setlists' || activeTab === 'technique_routines') return 'setlists';
    if (activeTab === 'trash') return 'trash';
    if (activeTab === 'sheet_music') return 'sheet_music';
    return song.section === 'technique' ? 'technique' : 'sheet_music';
  })();

  const isTechnique = viewerSection === 'technique';
  const isSetlists = viewerSection === 'setlists';
  const isTrash = viewerSection === 'trash';

  const section = isTechnique ? 'technique' : 'sheet_music';

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

  // Keyboard navigation listener
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

  // Direct PDF chart download
  const handleDownload = async () => {
    if (isDownloading) return;
    setIsDownloading(true);
    try {
      const ok = await downloadSongPdf(song);
      if (ok) {
        setDownloadSuccess(true);
        setTimeout(() => setDownloadSuccess(false), 2500);
      }
    } catch (err) {
      console.error('Failed to download PDF:', err);
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div 
      className={`song-viewer-modal fixed inset-0 z-50 flex flex-col w-screen h-screen overflow-hidden select-none ${
        isTechnique
          ? 'bg-[#130d1d] text-purple-100'
          : isSetlists
          ? 'bg-[#022c22] text-emerald-100'
          : isTrash
          ? 'bg-[#120508] text-rose-100'
          : 'bg-[#030d17] text-sky-100'
      } ${isLandscapeClean ? 'landscape-clean' : ''}`}
      onClick={handleToggleLandscapeOverlay}
    >
      {/* Top Header Bar - Matches Active Section Palette */}
      <header className={`song-viewer-header sticky top-0 z-50 text-white px-3 sm:px-6 py-3 flex items-center justify-between gap-3 shrink-0 min-h-[60px] border-b backdrop-blur-md transition-all duration-200 ${
        isTechnique
          ? 'bg-[#18092b]/95 border-purple-900/60'
          : isSetlists
          ? 'bg-[#064e3b]/95 border-emerald-900/60'
          : isTrash
          ? 'bg-[#1f0a0f]/95 border-rose-900/60'
          : 'bg-[#071d2c]/95 border-sky-900/60'
      } ${
        isLandscapeClean ? 'hidden' : 'flex'
      }`}>
        {/* Item 1: Close Button + Chart Title */}
        <div className="flex items-center gap-2 max-w-[80vw] sm:max-w-md md:max-w-xl min-w-0">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            className={`p-2 sm:px-3 sm:py-1.5 rounded-md active:scale-95 cursor-pointer transition-colors border shrink-0 flex items-center gap-1.5 shadow-lg ${
              isTechnique
                ? 'bg-purple-950/60 hover:bg-purple-900/60 text-purple-200 border-purple-800/80'
                : isSetlists
                ? 'bg-emerald-950/60 hover:bg-emerald-900/60 text-emerald-200 border-emerald-800/80'
                : isTrash
                ? 'bg-rose-950/60 hover:bg-rose-900/60 text-rose-200 border-rose-800/80'
                : 'bg-[#0c4a6e]/40 hover:bg-[#0c4a6e]/70 text-sky-200 border-sky-800/80'
            }`}
            title="Close Viewer (Esc)"
          >
            <X className="w-4 h-4 stroke-[2.5]" />
            <span className="hidden sm:inline text-xs font-black uppercase tracking-wider">Close</span>
          </button>

          <div className={`flex items-center gap-2 min-w-0 px-3 py-1.5 rounded-md border shadow-lg ${
            isTechnique
              ? 'bg-purple-950/40 border-purple-800/80'
              : isSetlists
              ? 'bg-emerald-950/40 border-emerald-800/80'
              : isTrash
              ? 'bg-rose-950/40 border-rose-800/80'
              : 'bg-[#0c4a6e]/30 border-sky-800/80'
          }`}>
            <h3 className="text-xs sm:text-sm font-extrabold text-white truncate leading-tight">
              {song.title}
            </h3>

            <span className={`hidden md:inline-block text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-xs shrink-0 shadow-2xs ${
              isTechnique
                ? 'bg-purple-950/90 text-purple-200 border border-purple-800'
                : isSetlists
                ? 'bg-emerald-950/90 text-emerald-200 border border-emerald-800'
                : isTrash
                ? 'bg-rose-950/90 text-rose-200 border border-rose-800'
                : 'bg-sky-950/90 text-sky-200 border border-sky-800'
            }`}>
              {navigation?.listName || song.genre || (isTechnique ? 'Scales' : 'Hymns')}
            </span>
          </div>
        </div>

        {/* Item 2: Actions - +Setlist & Download */}
        <div className="flex items-center gap-1.5 shrink-0">
          {onAddToSetlist && (
            <button
              type="button"
              onClick={() => onAddToSetlist(song)}
              className={`px-2.5 sm:px-3 py-1.5 rounded-md text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 border transition-all cursor-pointer active:scale-95 shadow-lg ${
                isTechnique
                  ? 'bg-purple-800 hover:bg-purple-900 text-purple-100 border-purple-700'
                  : isSetlists
                  ? 'bg-emerald-800 hover:bg-emerald-900 text-emerald-100 border-emerald-700'
                  : isTrash
                  ? 'bg-rose-800 hover:bg-rose-900 text-rose-100 border-rose-700'
                  : 'bg-[#0c4a6e] hover:bg-[#073652] text-sky-100 border-sky-700'
              }`}
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
            onClick={handleDownload}
            disabled={isDownloading}
            className={`px-2.5 sm:px-3 py-1.5 rounded-md text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 border cursor-pointer active:scale-95 transition-all shadow-lg ${
              isTechnique
                ? 'bg-purple-800 hover:bg-purple-900 text-purple-100 border-purple-700'
                : isSetlists
                ? 'bg-emerald-800 hover:bg-emerald-900 text-emerald-100 border-emerald-700'
                : isTrash
                ? 'bg-rose-800 hover:bg-rose-900 text-rose-100 border-rose-700'
                : 'bg-[#0c4a6e] hover:bg-[#073652] text-sky-100 border-sky-700'
            } disabled:opacity-60`}
            title="Download PDF chart"
          >
            {isDownloading ? (
              <Loader2 className={`w-3.5 h-3.5 animate-spin ${
                isTechnique ? 'text-purple-300' : isSetlists ? 'text-emerald-300' : isTrash ? 'text-rose-300' : 'text-sky-300'
              }`} />
            ) : downloadSuccess ? (
              <Check className="w-3.5 h-3.5 text-emerald-400 stroke-[2.5]" />
            ) : (
              <Download className={`w-3.5 h-3.5 stroke-[2.2] ${
                isTechnique ? 'text-purple-300' : isSetlists ? 'text-emerald-300' : isTrash ? 'text-rose-300' : 'text-sky-300'
              }`} />
            )}
            <span className="text-[11px] font-black">
              {isDownloading ? 'Saving...' : downloadSuccess ? 'Saved' : 'Download'}
            </span>
          </button>
        </div>
      </header>

      {/* Main Sheet Music Viewing Canvas */}
      <main className={`song-viewer-main flex-1 w-full relative overflow-hidden flex flex-col ${
        isTechnique ? 'bg-[#130d1d]' : isSetlists ? 'bg-[#022c22]' : isTrash ? 'bg-[#120508]' : 'bg-[#030d17]'
      }`}>
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
              isTechnique={isTechnique}
              viewerSection={viewerSection}
              isLandscapeClean={isLandscapeClean}
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
              <div className="printable-song-details max-w-xl w-full bg-slate-900/90 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl backdrop-blur-md text-white flex flex-col items-center text-center gap-5">
                <div className={`no-print w-16 h-16 rounded-2xl flex items-center justify-center shadow-inner ${
                  isTechnique ? 'bg-purple-500/10 border border-purple-500/30 text-purple-400' : 'bg-sky-500/10 border border-sky-500/30 text-sky-400'
                }`}>
                  <Music className="w-8 h-8 stroke-[1.8]" />
                </div>

                <div className="space-y-1 max-w-md">
                  <h3 className="text-xl sm:text-2xl font-black tracking-tight text-white">{song.title}</h3>
                  <p className="text-slate-400 font-medium text-sm">{song.artist || 'Unknown Composer'}</p>
                </div>

                <div className="grid grid-cols-2 gap-2.5 w-full py-2">
                  <div className="bg-slate-950/60 border border-slate-800/80 p-2.5 rounded-xl flex flex-col items-center">
                    <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400">Category</span>
                    <span className={`text-sm font-black mt-0.5 truncate max-w-[120px] ${isTechnique ? 'text-purple-400' : 'text-sky-400'}`}>{song.genre || 'General'}</span>
                  </div>
                  <div className="bg-slate-950/60 border border-slate-800/80 p-2.5 rounded-xl flex flex-col items-center">
                    <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400">Time Sig</span>
                    <span className={`text-sm font-black mt-0.5 ${isTechnique ? 'text-purple-300' : 'text-sky-300'}`}>{song.timeSignature || '4/4'}</span>
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

                <div className="no-print pt-2 w-full flex flex-col sm:flex-row items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className={`w-full sm:w-auto px-5 py-2.5 ${isTechnique ? 'bg-purple-600 hover:bg-purple-500 shadow-purple-600/20' : 'bg-sky-600 hover:bg-sky-500 shadow-sky-600/20'} text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2 cursor-pointer`}
                  >
                    <Upload className="w-4 h-4 stroke-[2.2]" />
                    <span>Attach PDF Chart</span>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="no-print w-full h-full flex flex-col items-center justify-center p-8 text-white text-xs text-center gap-2">
              <Loader2 className="w-8 h-8 animate-spin text-white mb-1" />
              <p className="font-bold uppercase tracking-wider text-white/90">Loading Chart PDF...</p>
            </div>
          )}
        </div>
      </main>

      {/* Bottom Navigation & Performance Controls - Matches Section Palette */}
      <footer className={`song-viewer-footer sticky bottom-0 inset-x-0 z-40 text-white px-3 sm:px-6 py-2.5 sm:py-3 items-center justify-between gap-2 select-none min-h-[60px] w-full shrink-0 border-t backdrop-blur-md transition-all duration-200 ${
        isTechnique
          ? 'bg-[#18092b]/95 border-purple-900/60'
          : isSetlists
          ? 'bg-[#064e3b]/95 border-emerald-900/60'
          : isTrash
          ? 'bg-[#1f0a0f]/95 border-rose-900/60'
          : 'bg-[#071d2c]/95 border-sky-900/60'
      } ${
        isLandscapeClean ? 'hidden' : 'flex'
      }`}>
        {/* Item 3: Zoom Controls */}
        <div className={`flex items-center gap-1 p-1 rounded-md shadow-lg border shrink-0 ${
          isTechnique
            ? 'bg-[#130721] border-purple-800/80 text-purple-200'
            : isSetlists
            ? 'bg-[#043729] border-emerald-800/80 text-emerald-200'
            : isTrash
            ? 'bg-[#180509] border-rose-800/80 text-rose-200'
            : 'bg-[#031320] border-sky-800/80 text-sky-200'
        }`}>
          <button
            type="button"
            onClick={() => updateZoom((z) => Math.max(50, z - 5))}
            className={`px-3 sm:px-4 py-1.5 min-w-[42px] sm:min-w-[48px] h-9 flex items-center justify-center active:scale-95 rounded-sm cursor-pointer transition-all ${
              isTechnique
                ? 'hover:bg-purple-900/50 hover:text-white'
                : isSetlists
                ? 'hover:bg-emerald-900/50 hover:text-white'
                : isTrash
                ? 'hover:bg-rose-900/50 hover:text-white'
                : 'hover:bg-[#0c4a6e]/50 hover:text-white'
            }`}
            title="Zoom Out (-5%)"
          >
            <ZoomOut className="w-4 h-4 stroke-[2.5]" />
          </button>
          
          <span className={`text-xs font-black tracking-wider px-1.5 min-w-[42px] text-center whitespace-nowrap ${
            isTechnique
              ? 'text-purple-300'
              : isSetlists
              ? 'text-emerald-300'
              : isTrash
              ? 'text-rose-300'
              : 'text-sky-300'
          }`}>
            {zoomLevel}%
          </span>

          <button
            type="button"
            onClick={() => updateZoom((z) => Math.min(300, z + 5))}
            className={`px-3 sm:px-4 py-1.5 min-w-[42px] sm:min-w-[48px] h-9 flex items-center justify-center active:scale-95 rounded-sm cursor-pointer transition-all ${
              isTechnique
                ? 'hover:bg-purple-900/50 hover:text-white'
                : isSetlists
                ? 'hover:bg-emerald-900/50 hover:text-white'
                : isTrash
                ? 'hover:bg-rose-900/50 hover:text-white'
                : 'hover:bg-[#0c4a6e]/50 hover:text-white'
            }`}
            title="Zoom In (+5%)"
          >
            <ZoomIn className="w-4 h-4 stroke-[2.5]" />
          </button>

          {zoomLevel !== 100 && (
            <button
              type="button"
              onClick={() => updateZoom(100)}
              className={`px-2.5 py-1.5 h-9 flex items-center justify-center active:scale-95 rounded-sm cursor-pointer transition-all border-l ml-0.5 ${
                isTechnique
                  ? 'border-purple-800/60 hover:bg-purple-900/50 text-purple-300'
                  : isSetlists
                  ? 'border-emerald-800/60 hover:bg-emerald-900/50 text-emerald-300'
                  : isTrash
                  ? 'border-rose-800/60 hover:bg-rose-900/50 text-rose-300'
                  : 'border-sky-800/60 hover:bg-[#0c4a6e]/50 text-sky-300'
              }`}
              title="Reset Zoom to 100%"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Item 4: Directory Navigation */}
        {navigation && navigation.totalCount > 1 ? (
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <button
              onClick={() => navigation.onNavigate(navigation.currentIndex - 1)}
              disabled={navigation.currentIndex <= 0}
              className={`px-3.5 sm:px-5 py-1.5 h-9 min-w-[48px] sm:min-w-[70px] rounded-md active:scale-95 disabled:opacity-25 text-white cursor-pointer transition-all flex items-center justify-center gap-1 shadow-lg font-extrabold text-xs shrink-0 border ${
                isTechnique
                  ? 'bg-[#130721] hover:bg-purple-900/50 border-purple-800/80 text-purple-200'
                  : isSetlists
                  ? 'bg-[#03281f] hover:bg-emerald-900/50 border-emerald-800/80 text-emerald-200'
                  : isTrash
                  ? 'bg-[#180509] hover:bg-rose-900/50 border-rose-800/80 text-rose-200'
                  : 'bg-[#031320] hover:bg-[#0c4a6e]/50 border-sky-800/80 text-sky-200'
              }`}
              title="Previous Chart (Left Arrow)"
            >
              <ChevronLeft className="w-5 h-5 stroke-[2.8]" />
              <span className="hidden sm:inline uppercase tracking-wider text-[11px]">Prev</span>
            </button>

            <div className={`px-3 py-1.5 h-9 flex items-center justify-center border rounded-md text-xs font-black tracking-wider text-center whitespace-nowrap shrink-0 shadow-lg ${
              isTechnique
                ? 'bg-[#18092b] border-purple-800/80 text-purple-200'
                : isSetlists
                ? 'bg-[#064e3b] border-emerald-800/80 text-emerald-200'
                : isTrash
                ? 'bg-[#1f0a0f] border-rose-800/80 text-rose-200'
                : 'bg-[#071d2c] border-sky-800/80 text-sky-200'
            }`}>
              {navigation.currentIndex + 1} <span className="text-slate-500 font-normal mx-0.5">/</span> {navigation.totalCount}
            </div>

            <button
              onClick={() => navigation.onNavigate(navigation.currentIndex + 1)}
              disabled={navigation.currentIndex >= navigation.totalCount - 1}
              className={`px-3.5 sm:px-5 py-1.5 h-9 min-w-[48px] sm:min-w-[70px] rounded-md active:scale-95 disabled:opacity-25 text-white cursor-pointer transition-all flex items-center justify-center gap-1 shadow-lg font-extrabold text-xs shrink-0 border ${
                isTechnique
                  ? 'bg-[#130721] hover:bg-purple-900/50 border-purple-800/80 text-purple-200'
                  : isSetlists
                  ? 'bg-[#03281f] hover:bg-emerald-900/50 border-emerald-800/80 text-emerald-200'
                  : isTrash
                  ? 'bg-[#180509] hover:bg-rose-900/50 border-rose-800/80 text-rose-200'
                  : 'bg-[#031320] hover:bg-[#0c4a6e]/50 border-sky-800/80 text-sky-200'
              }`}
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
