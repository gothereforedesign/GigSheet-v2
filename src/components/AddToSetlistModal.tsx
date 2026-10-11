import React, { useState } from 'react';
import { Song, Setlist } from '../types';
import { ListMusic, Plus, Check, X } from 'lucide-react';

interface AddToSetlistModalProps {
  song: Song;
  setlists: Setlist[];
  onSaveSetlistsForSong: (songId: string, updatedSetlistIds: string[]) => Promise<void>;
  onCreateSetlist: (name: string, description?: string, section?: 'sheet_music' | 'technique') => Promise<Setlist | undefined>;
  onClose: () => void;
}

export const AddToSetlistModal: React.FC<AddToSetlistModalProps> = ({
  song,
  setlists,
  onSaveSetlistsForSong,
  onCreateSetlist,
  onClose,
}) => {
  const targetSection: 'sheet_music' | 'technique' = song.section === 'technique' ? 'technique' : 'sheet_music';

  // Show all setlists so any chart can be added to any setlist
  const allSetlists = setlists;

  // Initial selected setlist IDs containing this song (or its originalSongId)
  const [selectedSetlistIds, setSelectedSetlistIds] = useState<string[]>(() => {
    const targetIds = new Set<string>([song.id]);
    if (song.originalSongId) targetIds.add(song.originalSongId);

    return allSetlists
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
  const [isCreatingInline, setIsCreatingInline] = useState<boolean>(() => allSetlists.length === 0);
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
      const created = await onCreateSetlist(newSetName.trim(), undefined, targetSection);
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
    <div className="fixed inset-0 z-50 flex items-start justify-center p-3 sm:p-4 pt-4 sm:pt-8 md:pt-12 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white dark:bg-slate-900 w-full max-w-md max-h-[82vh] sm:max-h-[85vh] rounded-2xl shadow-2xl overflow-hidden border border-slate-200/90 dark:border-slate-800 flex flex-col">
        {/* Header - Signature Emerald Green Setlists Theme */}
        <div className="px-5 py-4 flex items-center justify-between text-white bg-emerald-800 dark:bg-emerald-900 border-b border-emerald-700 dark:border-emerald-800">
          <div className="flex items-center gap-2.5 min-w-0">
            <ListMusic className="w-5 h-5 shrink-0 text-emerald-200" />
            <div className="min-w-0">
              <h3 className="text-sm font-black uppercase tracking-wider truncate leading-tight text-white">
                Add to Setlist
              </h3>
              <p className="text-[11px] font-medium text-emerald-100/90 truncate mt-0.5">
                "{song.title}"
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-white/10 text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* List of Setlists */}
        <div className="p-4 space-y-3 max-h-[60vh] overflow-y-auto">
          {allSetlists.length === 0 && !isCreatingInline ? (
            <div className="text-center py-6 px-4 bg-emerald-50/60 dark:bg-emerald-950/30 border border-dashed border-emerald-200 dark:border-emerald-800 rounded-xl space-y-2.5">
              <p className="text-xs font-bold text-emerald-950 dark:text-emerald-200">
                No setlists created yet.
              </p>
              <button
                type="button"
                onClick={() => setIsCreatingInline(true)}
                className="text-xs font-black uppercase tracking-wider px-3.5 py-2 rounded-lg text-white bg-emerald-800 hover:bg-emerald-900 dark:bg-emerald-700 dark:hover:bg-emerald-600 transition-all cursor-pointer"
              >
                + Create First Setlist
              </button>
            </div>
          ) : (
            <div className="space-y-1.5">
              {allSetlists.map((setlist) => {
                const isChecked = selectedSetlistIds.includes(setlist.id);
                return (
                  <button
                    key={setlist.id}
                    type="button"
                    onClick={() => toggleSetlistSelection(setlist.id)}
                    className={`w-full text-left p-3 rounded-xl border flex items-center justify-between transition-all cursor-pointer ${
                      isChecked
                        ? 'bg-emerald-50 dark:bg-emerald-950/70 border-emerald-400 dark:border-emerald-600 text-emerald-950 dark:text-emerald-100 shadow-2xs font-black'
                        : 'bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 hover:border-emerald-300 dark:hover:border-emerald-700 text-slate-700 dark:text-slate-200 font-bold'
                    }`}
                  >
                    <div className="min-w-0 pr-2">
                      <div className="flex items-center gap-2">
                        <p className="text-xs truncate">{setlist.name}</p>
                        <span className="text-[10px] font-mono tabular-nums text-emerald-700 dark:text-emerald-400 font-bold shrink-0">
                          · {setlist.items.length}
                        </span>
                      </div>
                      {setlist.description && (
                        <p className="text-[10px] text-slate-400 dark:text-slate-400 font-normal line-clamp-1">
                          {setlist.description}
                        </p>
                      )}
                    </div>

                    <div
                      className={`w-5 h-5 rounded-md flex items-center justify-center border shrink-0 transition-all ${
                        isChecked
                          ? 'bg-emerald-800 dark:bg-emerald-600 border-emerald-800 dark:border-emerald-600 text-white'
                          : 'border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800'
                      }`}
                    >
                      {isChecked && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* Inline Create Form */}
          {isCreatingInline ? (
            <form onSubmit={handleCreateAndSelect} className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-emerald-800 dark:text-emerald-400">
                New Setlist Name
              </span>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  autoFocus
                  required
                  placeholder="e.g. Friday Gig Set"
                  value={newSetName}
                  onChange={(e) => setNewSetName(e.target.value)}
                  className="flex-1 p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold outline-none text-slate-800 dark:text-slate-100 focus:border-emerald-500"
                />
                <button
                  type="submit"
                  className="px-3 py-2 text-white rounded-lg text-xs font-bold uppercase tracking-wider cursor-pointer bg-emerald-800 hover:bg-emerald-900 dark:bg-emerald-700 dark:hover:bg-emerald-600"
                >
                  Create
                </button>
                {allSetlists.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setIsCreatingInline(false)}
                    className="px-2 py-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs font-bold cursor-pointer"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </form>
          ) : (
            <button
              type="button"
              onClick={() => setIsCreatingInline(true)}
              className="w-full text-left py-2 px-1 text-xs font-extrabold flex items-center gap-1 cursor-pointer transition-colors text-emerald-700 dark:text-emerald-400 hover:text-emerald-950 dark:hover:text-emerald-200"
            >
              <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Create New Setlist</span>
            </button>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
          <p className="text-[10px] font-medium text-slate-500 dark:text-slate-400 max-w-[200px] leading-tight">
            Chart category & location remain unchanged in library.
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-xs font-bold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleDone}
              disabled={isSubmitting}
              className="px-4 py-2 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer active:scale-95 shadow-md bg-emerald-800 hover:bg-emerald-900 dark:bg-emerald-700 dark:hover:bg-emerald-600"
            >
              {isSubmitting ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
