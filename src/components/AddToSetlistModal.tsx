import React, { useState } from 'react';
import { Song, Setlist } from '../types';
import { ListMusic, Flame, Plus, Check, X } from 'lucide-react';

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
  const isTechnique = song.section === 'technique';
  const targetSection: 'sheet_music' | 'technique' = isTechnique ? 'technique' : 'sheet_music';

  // Filter setlists matching this song's section
  const sectionSetlists = setlists.filter(
    (s) => (s.type || 'sheet_music') === targetSection
  );

  // Initial selected setlist IDs containing this song
  const [selectedSetlistIds, setSelectedSetlistIds] = useState<string[]>(() => {
    return sectionSetlists
      .filter((s) => s.items.some((item) => item.songId === song.id || item.songId.includes(`_${song.id}`)))
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
      const created = await onCreateSetlist(newSetName.trim(), undefined, targetSection);
      if (created) {
        setSelectedSetlistIds((prev) => [...prev, created.id]);
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
      <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden border border-slate-200/90 dark:border-slate-800 flex flex-col">
        {/* Header */}
        <div
          className={`px-5 py-4 flex items-center justify-between text-white ${
            isTechnique ? 'bg-purple-900 dark:bg-purple-800' : 'bg-[#0c4a6e] dark:bg-sky-800'
          }`}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            {isTechnique ? (
              <Flame className="w-5 h-5 shrink-0 text-purple-200" />
            ) : (
              <ListMusic className="w-5 h-5 shrink-0 text-sky-200" />
            )}
            <div className="min-w-0">
              <h3 className="text-sm font-black uppercase tracking-wider truncate leading-tight text-white">
                {isTechnique ? 'Add to Practice Routine' : 'Add to Performance Setlist'}
              </h3>
              <p className="text-[11px] font-medium text-slate-200/90 truncate mt-0.5">
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

        {/* List of Setlists / Routines */}
        <div className="p-4 space-y-3 max-h-[60vh] overflow-y-auto">
          {sectionSetlists.length === 0 && !isCreatingInline ? (
            <div className="text-center py-6 px-4 bg-slate-50 dark:bg-slate-800/60 border border-dashed border-slate-200 dark:border-slate-700 rounded-xl space-y-2">
              <p className="text-xs font-bold text-slate-600 dark:text-slate-300">
                No {isTechnique ? 'practice routines' : 'setlists'} created yet.
              </p>
              <button
                type="button"
                onClick={() => setIsCreatingInline(true)}
                className={`text-xs font-black uppercase tracking-wider px-3 py-1.5 rounded-lg text-white transition-all cursor-pointer ${
                  isTechnique ? 'bg-purple-900 hover:bg-purple-950 dark:bg-purple-700 dark:hover:bg-purple-600' : 'bg-[#0c4a6e] hover:bg-[#073652] dark:bg-sky-700 dark:hover:bg-sky-600'
                }`}
              >
                + Create First {isTechnique ? 'Routine' : 'Setlist'}
              </button>
            </div>
          ) : (
            <div className="space-y-1.5">
              {sectionSetlists.map((setlist) => {
                const isChecked = selectedSetlistIds.includes(setlist.id);
                return (
                  <button
                    key={setlist.id}
                    type="button"
                    onClick={() => toggleSetlistSelection(setlist.id)}
                    className={`w-full text-left p-3 rounded-xl border flex items-center justify-between transition-all cursor-pointer ${
                      isChecked
                        ? isTechnique
                          ? 'bg-purple-50 dark:bg-purple-950/70 border-purple-300 dark:border-purple-700 text-purple-950 dark:text-purple-200 shadow-2xs font-black'
                          : 'bg-sky-50 dark:bg-sky-950/70 border-sky-300 dark:border-sky-700 text-[#0c4a6e] dark:text-sky-200 shadow-2xs font-black'
                        : 'bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 text-slate-700 dark:text-slate-200 font-bold'
                    }`}
                  >
                    <div>
                      <p className="text-xs">{setlist.name}</p>
                      {setlist.description && (
                        <p className="text-[10px] text-slate-400 dark:text-slate-400 font-normal line-clamp-1">
                          {setlist.description}
                        </p>
                      )}
                    </div>

                    <div
                      className={`w-5 h-5 rounded-md flex items-center justify-center border transition-all ${
                        isChecked
                          ? isTechnique
                            ? 'bg-purple-900 dark:bg-purple-600 border-purple-900 dark:border-purple-600 text-white'
                            : 'bg-[#0c4a6e] dark:bg-sky-600 border-[#0c4a6e] dark:border-sky-600 text-white'
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
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-400">
                New {isTechnique ? 'Routine' : 'Setlist'} Name
              </span>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  autoFocus
                  required
                  placeholder={isTechnique ? 'e.g. Daily Speed Routine' : 'e.g. Friday Gig Set'}
                  value={newSetName}
                  onChange={(e) => setNewSetName(e.target.value)}
                  className="flex-1 p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold outline-none text-slate-800 dark:text-slate-100 focus:border-sky-500"
                />
                <button
                  type="submit"
                  className={`px-3 py-2 text-white rounded-lg text-xs font-bold uppercase tracking-wider cursor-pointer ${
                    isTechnique ? 'bg-purple-900 hover:bg-purple-950 dark:bg-purple-700 dark:hover:bg-purple-600' : 'bg-[#0c4a6e] hover:bg-[#073652] dark:bg-sky-700 dark:hover:bg-sky-600'
                  }`}
                >
                  Add
                </button>
                <button
                  type="button"
                  onClick={() => setIsCreatingInline(false)}
                  className="px-2 py-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs font-bold cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            sectionSetlists.length > 0 && (
              <button
                type="button"
                onClick={() => setIsCreatingInline(true)}
                className={`w-full text-left py-2 px-1 text-xs font-extrabold flex items-center gap-1 cursor-pointer transition-colors ${
                  isTechnique ? 'text-purple-600 dark:text-purple-400 hover:text-purple-800' : 'text-sky-600 dark:text-sky-400 hover:text-sky-800'
                }`}
              >
                <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>Create New {isTechnique ? 'Routine' : 'Setlist'}</span>
              </button>
            )
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
              className={`px-4 py-2 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer active:scale-95 shadow-md ${
                isTechnique ? 'bg-purple-900 hover:bg-purple-950 dark:bg-purple-700 dark:hover:bg-purple-600' : 'bg-[#0c4a6e] hover:bg-[#073652] dark:bg-sky-700 dark:hover:bg-sky-600'
              }`}
            >
              {isSubmitting ? 'Saving...' : 'Done'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
