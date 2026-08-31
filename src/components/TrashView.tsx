import React, { useState } from 'react';
import { Trash2, RotateCcw, AlertTriangle, FileText, Check } from 'lucide-react';
import { Song } from '../types';

interface TrashViewProps {
  trashedSongs: Song[];
  onRestoreSong: (id: string) => Promise<void>;
  onPermanentDeleteSong: (id: string) => Promise<void>;
  onEmptyTrash: () => Promise<void>;
}

export const TrashView: React.FC<TrashViewProps> = ({
  trashedSongs,
  onRestoreSong,
  onPermanentDeleteSong,
  onEmptyTrash,
}) => {
  const [songToDelete, setSongToDelete] = useState<Song | null>(null);
  const [showEmptyConfirm, setShowEmptyConfirm] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

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

  return (
    <div className="space-y-4 pb-36 max-w-4xl mx-auto">
      {/* Header Bar */}
      <div className="flex items-center justify-between px-1">
        <div>
          <h2 className="text-sm font-black uppercase tracking-wider text-[#0c4a6e] dark:text-sky-300 flex items-center gap-2">
            <Trash2 className="w-4 h-4 text-slate-500 dark:text-slate-400" />
            <span>Trash Bin</span>
          </h2>
          <p className="text-[10px] text-slate-400 dark:text-slate-400 font-medium">
            Deleted charts stay here until permanently purged.
          </p>
        </div>

        {trashedSongs.length > 0 && (
          <button
            type="button"
            onClick={() => setShowEmptyConfirm(true)}
            className="px-3 py-1.5 bg-rose-50 dark:bg-rose-950/60 hover:bg-rose-100 dark:hover:bg-rose-900/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 rounded-md text-xs font-black uppercase tracking-wider cursor-pointer transition-all flex items-center gap-1.5 shadow-2xs whitespace-nowrap"
          >
            <Trash2 className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
            <span>Empty Trash</span>
          </button>
        )}
      </div>

      {/* Trash Songs List */}
      {trashedSongs.length === 0 ? (
        <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 space-y-3 shadow-2xs">
          <Trash2 className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto" />
          <p className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Trash Bin is Empty
          </p>
          <p className="text-[10px] text-slate-400 dark:text-slate-400">
            Charts deleted from Sheet Music will appear here before permanent deletion.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {trashedSongs.map((song) => (
            <div
              key={song.id}
              className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg flex items-center justify-between gap-3 shadow-2xs hover:border-slate-300 dark:hover:border-slate-700 transition-all"
            >
              <div className="flex items-center gap-3 overflow-hidden">
                <div className="w-10 h-10 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 flex items-center justify-center shrink-0">
                  <FileText className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                </div>
                <div className="truncate">
                  <h3 className="text-xs font-extrabold text-[#0c4a6e] dark:text-sky-300 truncate">
                    {song.title}
                  </h3>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] font-bold text-slate-400 dark:text-slate-400 uppercase tracking-wider">
                      {song.genre || 'Hymns'}
                    </span>
                    {song.deletedAt && (
                      <span className="text-[10px] text-rose-500 dark:text-rose-400 font-medium">
                        • Deleted {new Date(song.deletedAt).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => onRestoreSong(song.id)}
                  className="px-3 py-1.5 bg-sky-50 dark:bg-sky-950/60 hover:bg-sky-100 dark:hover:bg-sky-900/60 text-[#0c4a6e] dark:text-sky-300 border border-sky-200 dark:border-sky-800 rounded-md text-xs font-black uppercase tracking-wider cursor-pointer transition-all flex items-center gap-1.5 whitespace-nowrap"
                  title="Restore to Library"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
                  <span>Restore</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSongToDelete(song)}
                  className="p-2 bg-rose-50 dark:bg-rose-950/60 hover:bg-rose-100 dark:hover:bg-rose-900/60 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800 rounded-md transition-all cursor-pointer"
                  title="Delete Permanently"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Single Song Delete Confirmation Modal */}
      {songToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-lg max-w-sm w-full p-5 space-y-4 shadow-2xl border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-3 text-rose-600 dark:text-rose-400">
              <div className="w-10 h-10 rounded-md bg-rose-100 dark:bg-rose-950/80 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-rose-600 dark:text-rose-400" />
              </div>
              <div>
                <h3 className="text-sm font-black uppercase tracking-wider text-slate-900 dark:text-slate-100">
                  Permanently Delete?
                </h3>
                <p className="text-[10px] font-bold text-slate-400 dark:text-slate-400">
                  This action cannot be undone.
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 font-medium leading-relaxed bg-slate-50 dark:bg-slate-800/80 p-3 rounded-md border border-slate-200 dark:border-slate-700">
              Are you sure you want to permanently delete <strong className="text-slate-900 dark:text-slate-100">"{songToDelete.title}"</strong>? It will be removed from memory.
            </p>

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setSongToDelete(null)}
                disabled={isProcessing}
                className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-black uppercase tracking-wider rounded-md cursor-pointer whitespace-nowrap"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmSingleDelete}
                disabled={isProcessing}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-black uppercase tracking-wider rounded-md cursor-pointer shadow-md flex items-center gap-1.5 whitespace-nowrap"
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
          <div className="bg-white dark:bg-slate-900 rounded-lg max-w-sm w-full p-5 space-y-4 shadow-2xl border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-3 text-rose-600 dark:text-rose-400">
              <div className="w-10 h-10 rounded-md bg-rose-100 dark:bg-rose-950/80 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-rose-600 dark:text-rose-400" />
              </div>
              <div>
                <h3 className="text-sm font-black uppercase tracking-wider text-slate-900 dark:text-slate-100">
                  Empty Entire Trash?
                </h3>
                <p className="text-[10px] font-bold text-slate-400 dark:text-slate-400">
                  This action cannot be undone.
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 font-medium leading-relaxed bg-slate-50 dark:bg-slate-800/80 p-3 rounded-md border border-slate-200 dark:border-slate-700">
              Permanently delete all <strong className="text-slate-900 dark:text-slate-100">{trashedSongs.length}</strong> charts currently in the Trash Bin?
            </p>

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowEmptyConfirm(false)}
                disabled={isProcessing}
                className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-black uppercase tracking-wider rounded-md cursor-pointer whitespace-nowrap"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmEmptyTrash}
                disabled={isProcessing}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-black uppercase tracking-wider rounded-md cursor-pointer shadow-md flex items-center gap-1.5 whitespace-nowrap"
              >
                {isProcessing ? 'Emptying...' : 'Empty Trash Now'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
