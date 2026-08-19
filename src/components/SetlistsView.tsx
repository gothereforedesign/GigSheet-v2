import React, { useState } from 'react';
import { Setlist, Song, SetlistItem } from '../types';
import { Plus, ListMusic, Play, Trash2, ChevronUp, ChevronDown, Music, Calendar, Clock, Edit2, ArrowRight } from 'lucide-react';

interface SetlistsViewProps {
  setlists: Setlist[];
  allSongs: Song[];
  onCreateSetlist: (name: string, description?: string) => Promise<void>;
  onUpdateSetlist: (setlist: Setlist) => Promise<void>;
  onDeleteSetlist: (id: string) => Promise<void>;
  onOpenSetlistPerformance: (setlist: Setlist, startIndex: number) => void;
}

export const SetlistsView: React.FC<SetlistsViewProps> = ({
  setlists,
  allSongs,
  onCreateSetlist,
  onUpdateSetlist,
  onDeleteSetlist,
  onOpenSetlistPerformance,
}) => {
  const [selectedSetlistId, setSelectedSetlistId] = useState<string | null>(null);
  const [newSetName, setNewSetName] = useState<string>('');
  const [newSetDesc, setNewSetDesc] = useState<string>('');
  const [isCreating, setIsCreating] = useState<boolean>(false);
  const [showAddSongPicker, setShowAddSongPicker] = useState<boolean>(false);

  const activeSetlist = setlists.find((s) => s.id === selectedSetlistId);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSetName) return;
    await onCreateSetlist(newSetName, newSetDesc);
    setNewSetName('');
    setNewSetDesc('');
    setIsCreating(false);
  };

  const handleMoveSong = (setlist: Setlist, index: number, direction: 'up' | 'down') => {
    const newItems = [...setlist.items];
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= newItems.length) return;

    const temp = newItems[index];
    newItems[index] = newItems[targetIdx];
    newItems[targetIdx] = temp;

    onUpdateSetlist({
      ...setlist,
      items: newItems,
      dateModified: Date.now(),
    });
  };

  const handleRemoveSongFromSetlist = (setlist: Setlist, index: number) => {
    const newItems = setlist.items.filter((_, i) => i !== index);
    onUpdateSetlist({
      ...setlist,
      items: newItems,
      dateModified: Date.now(),
    });
  };

  const handleAddSongToSetlist = (setlist: Setlist, songId: string) => {
    if (setlist.items.some((item) => item.songId === songId)) return;
    const newItems = [...setlist.items, { songId }];
    onUpdateSetlist({
      ...setlist,
      items: newItems,
      dateModified: Date.now(),
    });
    setShowAddSongPicker(false);
  };

  return (
    <div className="space-y-4 pb-24">
      {/* Header Bar */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-black uppercase tracking-wider text-[#0c4a6e]">
            Setlists & Gig Planners
          </h2>
        </div>

        <button
          onClick={() => setIsCreating(true)}
          className="px-3.5 py-2 bg-[#0c4a6e] hover:bg-[#073652] text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 shadow-2xs"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>New Setlist</span>
        </button>
      </div>

      {/* Create Setlist Form Modal / Card */}
      {isCreating && (
        <form onSubmit={handleCreate} className="p-4 bg-white border border-slate-200 rounded-2xl shadow-md space-y-3">
          <h3 className="text-xs font-black uppercase tracking-wider text-[#0c4a6e]">
            Create New Setlist
          </h3>
          <div>
            <input
              type="text"
              required
              placeholder="Setlist Name (e.g. Friday Lounge Gig)"
              value={newSetName}
              onChange={(e) => setNewSetName(e.target.value)}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-[#0c4a6e] outline-none"
            />
          </div>
          <div>
            <input
              type="text"
              placeholder="Description or venue (Optional)"
              value={newSetDesc}
              onChange={(e) => setNewSetDesc(e.target.value)}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-[#0c4a6e] outline-none"
            />
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsCreating(false)}
              className="px-3 py-1.5 text-xs font-bold text-slate-500 hover:text-slate-800 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-[#0c4a6e] text-white rounded-xl text-xs font-black uppercase tracking-wider cursor-pointer active:scale-95"
            >
              Create Setlist
            </button>
          </div>
        </form>
      )}

      {/* Main Setlists Grid or Detail View */}
      {!selectedSetlistId ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {setlists.map((setlist) => (
            <div
              key={setlist.id}
              onClick={() => setSelectedSetlistId(setlist.id)}
              className="p-4 bg-white border border-slate-200 rounded-2xl shadow-2xs hover:border-sky-300 transition-all space-y-3 flex flex-col justify-between cursor-pointer active:scale-[0.98]"
            >
              <div className="space-y-2">
                <div className="flex justify-end">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteSetlist(setlist.id);
                    }}
                    className="p-1 text-slate-300 hover:text-rose-600 active:scale-95 cursor-pointer"
                    title="Delete Setlist"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div>
                  <h3 className="text-sm font-black uppercase tracking-wider text-[#0c4a6e]">
                    {setlist.name}
                  </h3>
                  {setlist.description && (
                    <p className="text-xs font-medium text-slate-500 line-clamp-2">
                      {setlist.description}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Active Selected Setlist Detail Editor */
        activeSetlist && (
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-white border border-slate-200 rounded-2xl shadow-xs">
              <div>
                <button
                  onClick={() => setSelectedSetlistId(null)}
                  className="text-[10px] font-black uppercase tracking-wider text-sky-600 hover:underline mb-1 block cursor-pointer"
                >
                  ← Back to Setlists
                </button>
                <h3 className="text-base font-black uppercase tracking-wider text-[#0c4a6e]">
                  {activeSetlist.name}
                </h3>
                <p className="text-xs font-medium text-slate-500">
                  {activeSetlist.description || 'No description provided.'}
                </p>
              </div>

              <button
                onClick={() => onOpenSetlistPerformance(activeSetlist, 0)}
                disabled={activeSetlist.items.length === 0}
                className="px-4 py-2.5 bg-[#0c4a6e] hover:bg-[#073652] disabled:opacity-40 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer active:scale-95 shadow-md"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>Start Performance</span>
              </button>
            </div>

            {/* Setlist Song Items List */}
            <div className="space-y-2">
              <div className="flex items-center justify-between px-1">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                  Order ({activeSetlist.items.length} Songs)
                </span>
                <button
                  onClick={() => setShowAddSongPicker(true)}
                  className="px-3 py-1 bg-sky-50 border border-sky-200 text-sky-800 rounded-xl text-xs font-black flex items-center gap-1 cursor-pointer active:scale-95"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Song</span>
                </button>
              </div>

              {/* Add Song Picker Dropdown */}
              {showAddSongPicker && (
                <div className="p-3 bg-white border border-sky-300 rounded-2xl shadow-md space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black uppercase tracking-wider text-[#0c4a6e]">
                      Select Song from Directory
                    </span>
                    <button
                      onClick={() => setShowAddSongPicker(false)}
                      className="text-xs text-slate-400 hover:text-slate-600"
                    >
                      Close
                    </button>
                  </div>
                  <div className="max-h-48 overflow-y-auto space-y-1">
                    {[...allSongs].sort((a, b) => a.title.localeCompare(b.title, undefined, { numeric: true, sensitivity: 'base' })).map((song) => (
                      <button
                        key={song.id}
                        onClick={() => handleAddSongToSetlist(activeSetlist, song.id)}
                        className="w-full text-left p-2 hover:bg-slate-50 rounded-xl flex items-center justify-between text-xs font-bold text-[#0c4a6e]"
                      >
                        <span>{song.title} ({song.artist})</span>
                        <span className="text-[10px] text-slate-400">{song.key} {song.tempo > 0 ? `• ${song.tempo} BPM` : ''}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Items List */}
              {activeSetlist.items.map((item, idx) => {
                const song = allSongs.find((s) => s.id === item.songId);
                return (
                  <div
                    key={`${item.songId}_${idx}`}
                    className="p-3.5 bg-white border border-slate-200 rounded-2xl flex items-center justify-between gap-3 shadow-2xs hover:border-slate-300 transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-6 h-6 rounded-full bg-slate-100 text-[#0c4a6e] text-xs font-black flex items-center justify-center shrink-0">
                        {idx + 1}
                      </span>
                      <div>
                        <h4 className="text-xs font-black uppercase tracking-wider text-[#0c4a6e]">
                          {song?.title || 'Unknown Song'}
                        </h4>
                        <p className="text-[10px] font-bold text-slate-400">
                          {song?.artist} • Key: {item.transposedKey || song?.key} { (item.targetTempo || song?.tempo || 0) > 0 ? `• ${item.targetTempo || song?.tempo} BPM` : '' }
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleMoveSong(activeSetlist, idx, 'up')}
                        disabled={idx === 0}
                        className="p-1 text-slate-400 hover:text-slate-800 disabled:opacity-30 cursor-pointer"
                      >
                        <ChevronUp className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleMoveSong(activeSetlist, idx, 'down')}
                        disabled={idx === activeSetlist.items.length - 1}
                        className="p-1 text-slate-400 hover:text-slate-800 disabled:opacity-30 cursor-pointer"
                      >
                        <ChevronDown className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleRemoveSongFromSetlist(activeSetlist, idx)}
                        className="p-1 text-slate-300 hover:text-rose-600 cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )
      )}
    </div>
  );
};
