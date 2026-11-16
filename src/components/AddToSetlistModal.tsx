import React, { useState } from 'react';
import { Song, Setlist } from '../types';
import { ListMusic, Plus, Check, X } from 'lucide-react';

interface AddToSetlistModalProps {
  song: Song;
  setlists: Setlist[];
  onSaveSetlistsForSong: (songId: string, updatedSetlistIds: string[]) => Promise<void>;
  onCreateSetlist: (name: string, description?: string, section?: 'sheet_music') => Promise<Setlist | undefined>;
  onClose: () => void;
}

export const AddToSetlistModal: React.FC<AddToSetlistModalProps> = ({
  song,
  setlists,
  onSaveSetlistsForSong,
  onCreateSetlist,
  onClose,
}) => {
  const [selectedSetlistIds, setSelectedSetlistIds] = useState<string[]>(() => {
    const targetIds = new Set<string>([song.id]);
    if (song.originalSongId) targetIds.add(song.originalSongId);

    return setlists
      .filter((s) =>
        s.items.some(
          (item) =>
            targetIds.has(item.songId) ||
            item.songId.endsWith(`_${song.id}`) ||
            (song.originalSongId && item.songId.endsWith(`_${song.originalSongId}`))
        )
      )
      .map((s) => s.id);
  });

  const [newSetName, setNewSetName] = useState<string>('');
  const [isCreatingInline, setIsCreatingInline] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const toggleSetlistSelection = (setlistId: string) => {
    setSelectedSetlistIds((prev) =>
      prev.includes(setlistId)
        ? prev.filter((id) => id !== setlistId)
        : [...prev, setlistId]
    );
  };

  const handleCreateAndSelect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSetName.trim()) return;

    try {
      const created = await onCreateSetlist(newSetName.trim(), undefined, 'sheet_music');
      if (created) {
        setSelectedSetlistIds((prev) => (prev.includes(created.id) ? prev : [...prev, created.id]));
      }
      setNewSetName('');
      setIsCreatingInline(false);
    } catch (err) {
      console.error('Failed to create setlist:', err);
    }
  };

  const handleDone = async () => {
    setIsSubmitting(true);
    try {
      await onSaveSetlistsForSong(song.id, selectedSetlistIds);
      onClose();
    } catch (err) {
      console.error('Failed to update song setlists:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col">
        {/* Minimal Header */}
        <div className="px-4 py-3 flex items-center justify-between border-b border-slate-100 dark:border-slate-800">
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white truncate">
            Add to Setlist
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Minimal Setlist List */}
        <div className="p-3 space-y-2 max-h-[50vh] overflow-y-auto">
          {setlists.length === 0 && !isCreatingInline ? (
            <div className="text-center py-4 text-xs font-bold text-slate-400">
              No setlists yet.
            </div>
          ) : (
            <div className="space-y-1">
              {setlists.map((setlist) => {
                const isChecked = selectedSetlistIds.includes(setlist.id);
                return (
                  <button
                    key={setlist.id}
                    type="button"
                    onClick={() => toggleSetlistSelection(setlist.id)}
                    className={`w-full text-left p-2.5 rounded-xl border flex items-center justify-between transition-all cursor-pointer ${
                      isChecked
                        ? 'bg-blue-50 dark:bg-blue-950/60 border-blue-400 dark:border-blue-600 text-slate-900 dark:text-white font-black text-xs'
                        : 'bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs'
                    }`}
                  >
                    <span className="truncate pr-2">{setlist.name}</span>
                    <div
                      className={`w-4 h-4 rounded-md flex items-center justify-center border shrink-0 ${
                        isChecked
                          ? 'bg-[#0284c7] border-[#0284c7] text-white'
                          : 'border-slate-300 dark:border-slate-600'
                      }`}
                    >
                      {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* Inline Create */}
          {isCreatingInline ? (
            <form onSubmit={handleCreateAndSelect} className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2">
              <input
                type="text"
                autoFocus
                required
                placeholder="Setlist name..."
                value={newSetName}
                onChange={(e) => setNewSetName(e.target.value)}
                className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-white outline-none focus:border-[#0284c7]"
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCreatingInline(false)}
                  className="px-3 py-1.5 text-xs font-bold text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3 py-1.5 text-white rounded-xl text-xs font-black uppercase tracking-wider bg-[#0284c7] hover:bg-sky-700 cursor-pointer"
                >
                  Create
                </button>
              </div>
            </form>
          ) : (
            <button
              type="button"
              onClick={() => setIsCreatingInline(true)}
              className="w-full text-center py-2 text-xs font-extrabold text-[#0284c7] hover:underline cursor-pointer flex items-center justify-center gap-1"
            >
              <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>New Setlist</span>
            </button>
          )}
        </div>

        {/* Minimal Footer */}
        <div className="p-3 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 text-xs font-bold text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleDone}
            disabled={isSubmitting}
            className="px-4 py-1.5 text-white rounded-xl text-xs font-black uppercase tracking-wider bg-[#0284c7] hover:bg-sky-700 cursor-pointer shadow-md disabled:opacity-50"
          >
            {isSubmitting ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
};
