import React, { useState } from 'react';
import { Trash2, RotateCcw, AlertTriangle, FileText, RefreshCw, Loader2, Check } from 'lucide-react';
import { Song } from '../types';
import { resetEntireApp } from '../lib/db';

interface TrashViewProps {
  trashedSongs: Song[];
  onRestoreSong: (id: string) => Promise<void>;
  onPermanentDeleteSong: (id: string) => Promise<void>;
  onEmptyTrash: () => Promise<void>;
  onSelectSong?: (song: Song) => void;
}

export const TrashView: React.FC<TrashViewProps> = ({
  trashedSongs,
  onRestoreSong,
  onPermanentDeleteSong,
  onEmptyTrash,
  onSelectSong,
}) => {
  const [songToDelete, setSongToDelete] = useState<Song | null>(null);
  const [showEmptyConfirm, setShowEmptyConfirm] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [restoringIds, setRestoringIds] = useState<Set<string>>(new Set());

  const handleRestore = async (e: React.MouseEvent, song: Song) => {
    e.stopPropagation();
    setRestoringIds((prev) => new Set(prev).add(song.id));
    try {
      await onRestoreSong(song.id);
    } catch (err) {
      console.error('Failed to restore song:', err);
      setRestoringIds((prev) => {
        const next = new Set(prev);
        next.delete(song.id);
        return next;
      });
    }
  };

  const handleConfirmSingleDelete = async () => {
    if (!songToDelete) return;
    setIsProcessing(true);
    try {
      await onPermanentDeleteSong(songToDelete.id);
      setSongToDelete(null);
    } catch (err) {
      console.error('Failed to permanently delete song:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirmEmptyTrash = async () => {
    setIsProcessing(true);
    try {
      await onEmptyTrash();
      setShowEmptyConfirm(false);
    } catch (err) {
      console.error('Failed to empty trash:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirmResetApp = async () => {
    setIsProcessing(true);
    try {
      await resetEntireApp();
      window.location.reload();
    } catch (err) {
      console.error('Failed to reset app:', err);
      setIsProcessing(false);
    }
  };

  // Filter out items actively being restored
  const visibleTrashedSongs = trashedSongs.filter((s) => !restoringIds.has(s.id));

  return (
    <div className="space-y-4 pb-36 max-w-3xl mx-auto px-1">
      {/* Simplified Header Bar */}
      <div className="flex items-center justify-between gap-3 pb-2 border-b border-rose-200/60 dark:border-rose-900/40">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-rose-100 dark:bg-rose-950/80 rounded-xl text-rose-600 dark:text-rose-400">
            <Trash2 className="w-5 h-5 stroke-[2.2]" />
          </div>
          <div>
            <h2 className="text-base font-black uppercase tracking-wider text-rose-900 dark:text-rose-200">
              Trash Bin ({trashedSongs.length})
            </h2>
            <p className="text-xs text-rose-600/80 dark:text-rose-400/80 font-medium">
              Restore deleted charts or purge them permanently.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {trashedSongs.length > 0 && (
            <button
              type="button"
              onClick={() => setShowEmptyConfirm(true)}
              className="px-3 py-2 bg-rose-50 dark:bg-rose-950/80 hover:bg-rose-100 dark:hover:bg-rose-900 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 rounded-xl text-xs font-extrabold uppercase tracking-wider cursor-pointer transition-all flex items-center gap-1.5 shadow-xs whitespace-nowrap active:scale-95"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Empty Trash</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setShowResetConfirm(true)}
            className="px-3 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-extrabold uppercase tracking-wider cursor-pointer transition-all flex items-center gap-1.5 shadow-xs whitespace-nowrap active:scale-95"
            title="Reset app to clean default state"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Reset</span>
          </button>
        </div>
      </div>

      {/* Clean Trash Songs List */}
      {visibleTrashedSongs.length === 0 ? (
        <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-2xl border border-rose-200/80 dark:border-rose-900/40 space-y-3 shadow-xs">
          <Trash2 className="w-10 h-10 text-rose-300 dark:text-rose-800 mx-auto stroke-[1.5]" />
          <p className="text-sm font-black uppercase tracking-wider text-rose-800 dark:text-rose-300">
            Trash Bin is Empty
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Deleted PDF charts will appear here before permanent removal.
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {visibleTrashedSongs.map((song) => {
            const isRestoring = restoringIds.has(song.id);

            return (
              <div
                key={song.id}
                className="p-3.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl flex items-center justify-between gap-3 shadow-xs hover:border-rose-300 dark:hover:border-rose-800 transition-all"
              >
                {/* Song Info (Clicking opens preview) */}
                <div
                  className={`flex items-center gap-3 min-w-0 flex-1 ${onSelectSong ? 'cursor-pointer group' : ''}`}
                  onClick={() => onSelectSong && onSelectSong(song)}
                >
                  <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0 border border-rose-100 dark:border-rose-900/50 group-hover:scale-105 transition-transform">
                    <FileText className="w-5 h-5 stroke-[2]" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate group-hover:text-rose-600 dark:group-hover:text-rose-400">
                      {song.title}
                    </h3>
                    <div className="flex items-center gap-2 mt-0.5 text-[11px] font-semibold text-slate-400 dark:text-slate-500">
                      <span className="uppercase tracking-wider">
                        {song.genre || 'Hymns'}
                      </span>
                      {song.deletedAt && (
                        <span>
                          • {new Date(song.deletedAt).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Explicit Action Buttons */}
                <div className="flex items-center gap-2 shrink-0">
                  {/* Restore Button */}
                  <button
                    type="button"
                    onClick={(e) => handleRestore(e, song)}
                    disabled={isRestoring}
                    className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black uppercase tracking-wider cursor-pointer transition-all flex items-center gap-1.5 shadow-sm active:scale-95 whitespace-nowrap disabled:opacity-60"
                    title="Restore song to library"
                  >
                    {isRestoring ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Restoring...</span>
                      </>
                    ) : (
                      <>
                        <RotateCcw className="w-3.5 h-3.5 stroke-[2.5]" />
                        <span>Restore</span>
                      </>
                    )}
                  </button>

                  {/* Single Permanent Delete Button */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSongToDelete(song);
                    }}
                    className="p-2 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/80 rounded-xl border border-rose-200 dark:border-rose-900/60 transition-all cursor-pointer active:scale-95"
                    title="Delete permanently"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Single Song Delete Confirmation Modal */}
      {songToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-sm w-full p-5 space-y-4 shadow-2xl border border-rose-200 dark:border-rose-900 animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-3 text-rose-600 dark:text-rose-400">
              <div className="w-10 h-10 rounded-xl bg-rose-100 dark:bg-rose-950/80 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-rose-600 dark:text-rose-400" />
              </div>
              <div>
                <h3 className="text-sm font-black uppercase tracking-wider text-rose-900 dark:text-rose-100">
                  Delete Permanently?
                </h3>
                <p className="text-[10px] font-bold text-rose-600 dark:text-rose-400">
                  Cannot be undone
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 font-medium leading-relaxed bg-slate-50 dark:bg-slate-800/80 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
              Permanently delete <strong className="text-slate-900 dark:text-slate-100">"{songToDelete.title}"</strong> from local storage?
            </p>

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setSongToDelete(null)}
                disabled={isProcessing}
                className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-black uppercase tracking-wider rounded-xl cursor-pointer whitespace-nowrap"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmSingleDelete}
                disabled={isProcessing}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-black uppercase tracking-wider rounded-xl cursor-pointer shadow-md flex items-center gap-1.5 whitespace-nowrap"
              >
                {isProcessing ? 'Deleting...' : 'Delete Permanently'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Empty All Trash Confirmation Modal */}
      {showEmptyConfirm && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-sm w-full p-5 space-y-4 shadow-2xl border border-rose-200 dark:border-rose-900 animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-3 text-rose-600 dark:text-rose-400">
              <div className="w-10 h-10 rounded-xl bg-rose-100 dark:bg-rose-950/80 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-rose-600 dark:text-rose-400" />
              </div>
              <div>
                <h3 className="text-sm font-black uppercase tracking-wider text-rose-900 dark:text-rose-100">
                  Empty Entire Trash?
                </h3>
                <p className="text-[10px] font-bold text-rose-600 dark:text-rose-400">
                  Cannot be undone
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 font-medium leading-relaxed bg-slate-50 dark:bg-slate-800/80 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
              Permanently purge all <strong className="text-slate-900 dark:text-slate-100">{trashedSongs.length}</strong> charts from Trash?
            </p>

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowEmptyConfirm(false)}
                disabled={isProcessing}
                className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-black uppercase tracking-wider rounded-xl cursor-pointer whitespace-nowrap"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmEmptyTrash}
                disabled={isProcessing}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-black uppercase tracking-wider rounded-xl cursor-pointer shadow-md flex items-center gap-1.5 whitespace-nowrap"
              >
                {isProcessing ? 'Emptying...' : 'Empty Trash Now'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reset App Confirmation Modal */}
      {showResetConfirm && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-sm w-full p-5 space-y-4 shadow-2xl border border-rose-300 dark:border-rose-900 animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-3 text-rose-600 dark:text-rose-400">
              <div className="w-10 h-10 rounded-xl bg-rose-100 dark:bg-rose-950/80 flex items-center justify-center shrink-0">
                <RefreshCw className="w-5 h-5 text-rose-600 dark:text-rose-400" />
              </div>
              <div>
                <h3 className="text-sm font-black uppercase tracking-wider text-rose-900 dark:text-rose-100">
                  Reset Entire App?
                </h3>
                <p className="text-[10px] font-bold text-rose-600 dark:text-rose-400">
                  Pristine Factory Reset
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 font-medium leading-relaxed bg-rose-50/60 dark:bg-rose-950/40 p-3 rounded-xl border border-rose-200 dark:border-rose-800">
              This will wipe all local charts, categories, and setlists, restoring GigSheet to factory state.
            </p>

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowResetConfirm(false)}
                disabled={isProcessing}
                className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-black uppercase tracking-wider rounded-xl cursor-pointer whitespace-nowrap"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmResetApp}
                disabled={isProcessing}
                className="px-4 py-2 bg-rose-700 hover:bg-rose-800 text-white text-xs font-black uppercase tracking-wider rounded-xl cursor-pointer shadow-md flex items-center gap-1.5 whitespace-nowrap"
              >
                {isProcessing ? 'Resetting...' : 'Reset Everything Now'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};


