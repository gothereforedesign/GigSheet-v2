import React, { useState } from 'react';
import { Setlist, Song } from '../types';
import { 
  Plus, ListMusic, Flame, Trash2, ChevronUp, ChevronDown, 
  Music, Sparkles, X, ChevronLeft, LayoutList, LayoutGrid, FolderEdit, Search
} from 'lucide-react';
import { 
  CategoryColorKey, 
  getCategoryPalette 
} from '../lib/categoryStorage';
import { LazyPDFThumbnail } from './LazyPDFThumbnail';

interface SetlistsViewProps {
  section?: 'sheet_music' | 'technique';
  setlists: Setlist[];
  allSongs: Song[];
  genreColors?: Record<string, CategoryColorKey>;
  onCreateSetlist: (name: string, description?: string, section?: 'sheet_music' | 'technique') => Promise<Setlist | undefined | void>;
  onUpdateSetlist: (setlist: Setlist) => Promise<void>;
  onDeleteSetlist: (id: string) => Promise<void>;
  onOpenSetlistPerformance?: (setlist: Setlist, startIndex: number) => void;
  onSelectSong?: (song: Song) => void;
  onEditSong?: (song: Song) => void;
  onOpenGenreManager?: () => void;
}

export const SetlistsView: React.FC<SetlistsViewProps> = ({
  section = 'sheet_music',
  setlists,
  allSongs,
  genreColors,
  onCreateSetlist,
  onUpdateSetlist,
  onDeleteSetlist,
  onOpenSetlistPerformance,
  onSelectSong,
  onEditSong,
  onOpenGenreManager,
}) => {
  const isTechnique = section === 'technique';
  const targetSection = isTechnique ? 'technique' : 'sheet_music';

  // Filter setlists matching section
  const sectionSetlists = setlists.filter(
    (s) => (s.type || 'sheet_music') === targetSection
  );

  // Filter songs matching section
  const sectionSongs = allSongs.filter(
    (s) => (s.section || 'sheet_music') === targetSection
  );

  const [selectedSetlistId, setSelectedSetlistId] = useState<string | null>(null);
  const [displayMode, setDisplayMode] = useState<'list' | 'grid'>('list');
  const [isCreating, setIsCreating] = useState<boolean>(false);
  const [newSetName, setNewSetName] = useState<string>('');
  const [newSetDesc, setNewSetDesc] = useState<string>('');
  const [showAddSongPicker, setShowAddSongPicker] = useState<boolean>(false);
  const [pickerSearchQuery, setPickerSearchQuery] = useState<string>('');

  const activeSetlist = sectionSetlists.find((s) => s.id === selectedSetlistId);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSetName.trim()) return;
    const created = await onCreateSetlist(newSetName.trim(), newSetDesc.trim() || undefined, targetSection);
    setNewSetName('');
    setNewSetDesc('');
    setIsCreating(false);
    if (created && created.id) {
      setSelectedSetlistId(created.id);
    }
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
  };

  // Filtered charts for picker
  const filteredPickerSongs = sectionSongs.filter((song) => {
    if (!pickerSearchQuery.trim()) return true;
    const q = pickerSearchQuery.toLowerCase();
    return (
      song.title.toLowerCase().includes(q) ||
      (song.artist && song.artist.toLowerCase().includes(q)) ||
      (song.genre && song.genre.toLowerCase().includes(q))
    );
  }).sort((a, b) => a.title.localeCompare(b.title, undefined, { numeric: true, sensitivity: 'base' }));

  return (
    <div className="space-y-4 pb-0">
      {/* VIEW 1: 2-COLUMN CATEGORY GRID (Matches Sheet Music / Technique Category View) */}
      {!selectedSetlistId ? (
        <div>
          <div className="grid grid-cols-2 gap-3 sm:gap-4 md:gap-5 lg:gap-6">
            {sectionSetlists.map((setlist) => {
              const palette = getCategoryPalette(setlist.name, genreColors, section);
              const count = setlist.items.length;

              return (
                <div
                  key={setlist.id}
                  onClick={() => setSelectedSetlistId(setlist.id)}
                  className={`relative group aspect-[3/2] rounded-lg md:rounded-xl p-3 sm:p-5 md:p-6 lg:p-8 border flex items-center justify-center text-center cursor-pointer shadow-xs hover:shadow-md hover:scale-[1.01] active:scale-[0.99] transition-all select-none ${palette.cardBg} ${palette.cardBorder} ${palette.cardHover}`}
                >
                  {/* Subtle PDF count badge */}
                  <div className="absolute top-2.5 right-2.5 sm:top-3 sm:right-3 px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-mono font-bold tracking-tight bg-black/20 text-white/95 backdrop-blur-xs border border-white/10 shadow-2xs">
                    <span>{count}</span>
                  </div>

                  <h3 className={`text-xl sm:text-2xl md:text-3xl lg:text-4xl text-[clamp(1.25rem,2.8vw+0.5rem,2.5rem)] font-black tracking-tight line-clamp-2 leading-tight sm:leading-snug md:leading-normal px-2 sm:px-4 ${palette.cardText}`}>
                    {setlist.name}
                  </h3>
                </div>
              );
            })}

            {/* "+ Create Setlist / Routine" Card in the Grid */}
            <div
              onClick={() => setIsCreating(true)}
              className="relative group aspect-[3/2] rounded-lg md:rounded-xl p-3 sm:p-5 border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-600 bg-white dark:bg-slate-900/80 hover:bg-slate-50/80 dark:hover:bg-slate-800/80 flex flex-col items-center justify-center text-center cursor-pointer transition-all select-none shadow-2xs hover:shadow-xs active:scale-[0.99]"
            >
              <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center mb-1.5 text-white shadow-xs ${
                isTechnique ? 'bg-purple-900 dark:bg-purple-700' : 'bg-[#0c4a6e] dark:bg-sky-700'
              }`}>
                <Plus className="w-6 h-6 stroke-[2.5]" />
              </div>
              <span className="text-xs sm:text-sm md:text-base font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">
                New {isTechnique ? 'Routine' : 'Setlist'}
              </span>
            </div>
          </div>
        </div>
      ) : (
        /* VIEW 2: CHARTS LIST OR PREVIEW GRID INSIDE SELECTED SETLIST / ROUTINE - UNIFIED CONTAINER */
        activeSetlist && (
          <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200/90 dark:border-slate-800 p-3 sm:p-4 shadow-2xs space-y-3">
            {/* Top Bar Navigation */}
            <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 flex-wrap">
                {/* Back Arrow Button */}
                <button
                  type="button"
                  onClick={() => setSelectedSetlistId(null)}
                  className="p-1.5 text-slate-700 dark:text-slate-200 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200/90 dark:border-slate-700 rounded-md cursor-pointer active:scale-95 shadow-2xs shrink-0"
                  title={`Back to ${isTechnique ? 'Routines' : 'Setlists'}`}
                >
                  <ChevronLeft className="w-5 h-5 stroke-[2.5]" />
                </button>

                {/* Category / Setlist Title Badge + Category Editor Button */}
                <div className="flex items-center gap-1.5 bg-white dark:bg-slate-800 border border-slate-200/90 dark:border-slate-700 px-2.5 py-1 rounded-md shadow-2xs shrink-0">
                  <h2 className="text-xs sm:text-sm font-black text-slate-900 dark:text-slate-100 truncate max-w-[120px] sm:max-w-[200px]">
                    {activeSetlist.name}
                  </h2>
                  {onOpenGenreManager && (
                    <button
                      type="button"
                      onClick={onOpenGenreManager}
                      className="p-0.5 rounded-xs text-slate-400 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer shrink-0"
                      title="Edit Categories"
                    >
                      <FolderEdit className="w-3.5 h-3.5 stroke-[2]" />
                    </button>
                  )}
                </div>

                {/* Subtle PDF Count Badge */}
                <div className="inline-flex items-center justify-center bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200/80 dark:border-slate-700 px-2 py-1 rounded-md text-xs font-mono font-bold shrink-0 min-w-[28px] text-center" title={`${activeSetlist.items.length} Charts`}>
                  <span>{activeSetlist.items.length}</span>
                </div>
              </div>

              <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                {/* Add Chart Button */}
                <button
                  type="button"
                  onClick={() => setShowAddSongPicker(true)}
                  className="px-2.5 py-1.5 rounded-md bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-black text-xs border border-slate-200/90 dark:border-slate-700 cursor-pointer active:scale-95 shadow-2xs whitespace-nowrap flex items-center gap-1"
                  title="Add Chart to Setlist"
                >
                  <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span className="hidden sm:inline text-[11px] uppercase tracking-wider">Add Chart</span>
                </button>

                {/* View Toggle Button */}
                <button
                  type="button"
                  onClick={() => setDisplayMode(displayMode === 'list' ? 'grid' : 'list')}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-black text-xs border border-slate-200/90 dark:border-slate-700 cursor-pointer active:scale-95 shadow-2xs whitespace-nowrap"
                  title={displayMode === 'list' ? 'Switch to Grid Preview' : 'Switch to List View'}
                >
                  {displayMode === 'list' ? (
                    <>
                      <LayoutGrid className="w-3.5 h-3.5 stroke-[2.2]" />
                      <span className="hidden sm:inline text-[11px] uppercase tracking-wider">Preview</span>
                    </>
                  ) : (
                    <>
                      <LayoutList className="w-3.5 h-3.5 stroke-[2.2]" />
                      <span className="hidden sm:inline text-[11px] uppercase tracking-wider">List</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Description if present */}
            {activeSetlist.description && (
              <p className="text-xs font-medium text-slate-500 px-0.5">
                {activeSetlist.description}
              </p>
            )}

            {/* Items inside Setlist */}
            {activeSetlist.items.length === 0 ? (
              <div className="p-8 sm:p-10 text-center bg-slate-50/80 rounded-lg border border-slate-200/60 space-y-3 shadow-2xs">
                <div className={`w-10 h-10 rounded-md mx-auto flex items-center justify-center border ${
                  isTechnique ? 'bg-purple-50 border-purple-100 text-purple-900' : 'bg-sky-50 border-sky-100 text-[#0c4a6e]'
                }`}>
                  <Music className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-800">
                    No charts in this {isTechnique ? 'routine' : 'setlist'}
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Tap "+ Add Chart" above to select charts from your library.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAddSongPicker(true)}
                  className={`mt-1 px-3.5 py-1.5 text-white text-xs font-black uppercase tracking-wider rounded-md cursor-pointer shadow-2xs active:scale-95 ${
                    isTechnique ? 'bg-purple-900 hover:bg-purple-950' : 'bg-[#0c4a6e] hover:bg-[#073652]'
                  }`}
                >
                  + Add Chart
                </button>
              </div>
            ) : displayMode === 'grid' ? (
              /* GRID PREVIEW MODE */
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-3.5 pt-1">
                {activeSetlist.items.map((item, idx) => {
                  const song = allSongs.find((s) => s.id === item.songId);
                  if (!song) return null;

                  return (
                    <div
                      key={`${item.songId}_${idx}`}
                      onClick={() => onSelectSong?.(song)}
                      className={`relative bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-sm overflow-hidden shadow-2xs hover:shadow-md cursor-pointer group flex flex-col active:scale-[0.98] transition-all ${
                        isTechnique ? 'hover:border-purple-400 dark:hover:border-purple-500' : 'hover:border-sky-400 dark:hover:border-sky-500'
                      }`}
                    >
                      {/* Order Overlay Badge */}
                      <div className="absolute top-2 left-2 z-10 px-2 py-0.5 rounded-md text-[10px] font-black font-mono tracking-tight bg-slate-900/90 text-white shadow-xs">
                        #{idx + 1}
                      </div>

                      {/* Controls Top-Right */}
                      <div className="absolute top-2 right-2 z-10 flex items-center gap-1 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xs p-0.5 rounded-md border border-slate-200 dark:border-slate-700 shadow-xs" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => handleMoveSong(activeSetlist, idx, 'up')}
                          disabled={idx === 0}
                          className="p-0.5 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 disabled:opacity-20 cursor-pointer"
                          title="Move Up"
                        >
                          <ChevronUp className="w-3.5 h-3.5 stroke-[2.5]" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleMoveSong(activeSetlist, idx, 'down')}
                          disabled={idx === activeSetlist.items.length - 1}
                          className="p-0.5 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 disabled:opacity-20 cursor-pointer"
                          title="Move Down"
                        >
                          <ChevronDown className="w-3.5 h-3.5 stroke-[2.5]" />
                        </button>
                        {onEditSong && (
                          <button
                            type="button"
                            onClick={() => onEditSong(song)}
                            className="p-0.5 text-slate-400 dark:text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 cursor-pointer"
                            title="Edit Chart Info"
                          >
                            <FolderEdit className="w-3.5 h-3.5 stroke-[2]" />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleRemoveSongFromSetlist(activeSetlist, idx)}
                          className="p-0.5 text-slate-400 dark:text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 cursor-pointer"
                          title="Remove from setlist"
                        >
                          <X className="w-3.5 h-3.5 stroke-[2.5]" />
                        </button>
                      </div>

                      {/* Lazy Thumbnail Container */}
                      <div className="relative aspect-[16/11] w-full bg-slate-100/80 dark:bg-slate-800/80 border-b border-slate-200/60 dark:border-slate-800 flex items-center justify-center overflow-hidden">
                        <LazyPDFThumbnail
                          songId={song.id}
                          songType={song.type}
                          fileUrl={song.fileUrl}
                          title={song.title}
                          className="w-full h-full object-cover object-top"
                        />
                      </div>

                      {/* Bottom Info Section */}
                      <div className="px-2.5 py-1.5 bg-white dark:bg-slate-900 flex items-center justify-between gap-1.5 min-h-[32px] shrink-0">
                        <div className="min-w-0 flex-1">
                          <h3 className={`text-xs font-bold text-slate-900 dark:text-slate-100 truncate leading-tight ${
                            isTechnique ? 'group-hover:text-purple-900 dark:group-hover:text-purple-300' : 'group-hover:text-[#0c4a6e] dark:group-hover:text-sky-300'
                          }`}>
                            {song.title}
                          </h3>
                          {song.artist && (
                            <p className="text-[10px] font-medium text-slate-400 dark:text-slate-400 truncate -mt-0.5">
                              {song.artist}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              /* LIST MODE */
              <div className="flex flex-col gap-2 pt-1">
                {activeSetlist.items.map((item, idx) => {
                  const song = allSongs.find((s) => s.id === item.songId);
                  if (!song) return null;

                  return (
                    <div
                      key={`${item.songId}_${idx}`}
                      onClick={() => onSelectSong?.(song)}
                      className={`bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-md px-3.5 py-2.5 flex items-center justify-between gap-3 shadow-2xs hover:shadow-xs cursor-pointer group transition-all ${
                        isTechnique ? 'hover:border-purple-400 dark:hover:border-purple-500' : 'hover:border-sky-400 dark:hover:border-sky-500'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        {/* Order Number Badge */}
                        <div className={`w-6 h-6 rounded-md text-xs font-black font-mono flex items-center justify-center shrink-0 border ${
                          isTechnique ? 'bg-purple-50 dark:bg-purple-950/80 text-purple-900 dark:text-purple-300 border-purple-200 dark:border-purple-800' : 'bg-sky-50 dark:bg-sky-950/80 text-[#0c4a6e] dark:text-sky-300 border-sky-200 dark:border-sky-800'
                        }`}>
                          {idx + 1}
                        </div>

                        <div className="min-w-0 flex-1">
                          <h3 className={`text-sm font-bold text-slate-900 dark:text-slate-100 truncate leading-tight ${
                            isTechnique ? 'group-hover:text-purple-900 dark:group-hover:text-purple-300' : 'group-hover:text-[#0c4a6e] dark:group-hover:text-sky-300'
                          }`}>
                            {song.title}
                          </h3>
                          {song.artist && (
                            <p className="text-[11px] font-medium text-slate-400 dark:text-slate-400 truncate mt-0.5">
                              {song.artist}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Right Action Controls */}
                      <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => handleMoveSong(activeSetlist, idx, 'up')}
                          disabled={idx === 0}
                          className="p-1 text-slate-400 dark:text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 disabled:opacity-20 cursor-pointer rounded-md hover:bg-slate-100 dark:hover:bg-slate-800"
                          title="Move Up"
                        >
                          <ChevronUp className="w-4 h-4 stroke-[2.2]" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleMoveSong(activeSetlist, idx, 'down')}
                          disabled={idx === activeSetlist.items.length - 1}
                          className="p-1 text-slate-400 dark:text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 disabled:opacity-20 cursor-pointer rounded-md hover:bg-slate-100 dark:hover:bg-slate-800"
                          title="Move Down"
                        >
                          <ChevronDown className="w-4 h-4 stroke-[2.2]" />
                        </button>
                        {onEditSong && (
                          <button
                            type="button"
                            onClick={() => onEditSong(song)}
                            className="p-1 text-slate-400 dark:text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-colors cursor-pointer"
                            title="Edit Chart Info"
                          >
                            <FolderEdit className="w-4 h-4 stroke-[2]" />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleRemoveSongFromSetlist(activeSetlist, idx)}
                          className="p-1 text-slate-400 dark:text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/60 rounded-md transition-colors cursor-pointer"
                          title="Remove from setlist"
                        >
                          <X className="w-4 h-4 stroke-[2.5]" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )
      )}

      {/* CREATE NEW SETLIST / ROUTINE MODAL */}
      {isCreating && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-md p-5 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                {isTechnique ? (
                  <Flame className="w-5 h-5 text-purple-900 dark:text-purple-400" />
                ) : (
                  <ListMusic className="w-5 h-5 text-[#0c4a6e] dark:text-sky-400" />
                )}
                <h3 className={`text-sm font-black uppercase tracking-wider ${
                  isTechnique ? 'text-purple-900 dark:text-purple-400' : 'text-[#0c4a6e] dark:text-sky-400'
                }`}>
                  Create {isTechnique ? 'Practice Routine' : 'Performance Setlist'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsCreating(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-3">
              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                  {isTechnique ? 'Routine Name' : 'Setlist Name'}
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  placeholder={isTechnique ? 'e.g., Daily Warmup Series' : 'e.g., Friday Night Gig'}
                  value={newSetName}
                  onChange={(e) => setNewSetName(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold outline-none text-slate-800 dark:text-slate-100 focus:border-slate-400 dark:focus:border-slate-500 focus:bg-white dark:focus:bg-slate-800 transition-all"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                  Description / Notes (Optional)
                </label>
                <input
                  type="text"
                  placeholder="Optional notes or details"
                  value={newSetDesc}
                  onChange={(e) => setNewSetDesc(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium outline-none text-slate-800 dark:text-slate-100 focus:border-slate-400 dark:focus:border-slate-500 focus:bg-white dark:focus:bg-slate-800 transition-all"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreating(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={`px-5 py-2 text-white rounded-xl text-xs font-black uppercase tracking-wider cursor-pointer active:scale-95 shadow-md ${
                    isTechnique ? 'bg-purple-900 hover:bg-purple-950 dark:bg-purple-700 dark:hover:bg-purple-600' : 'bg-[#0c4a6e] hover:bg-[#073652] dark:bg-sky-700 dark:hover:bg-sky-600'
                  }`}
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADD CHART TO SETLIST PICKER MODAL */}
      {showAddSongPicker && activeSetlist && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-lg p-5 space-y-3 flex flex-col max-h-[85vh] animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 shrink-0">
              <div className="flex items-center gap-2">
                <Plus className={`w-5 h-5 ${isTechnique ? 'text-purple-900 dark:text-purple-400' : 'text-[#0c4a6e] dark:text-sky-400'}`} />
                <h3 className={`text-sm font-black uppercase tracking-wider ${
                  isTechnique ? 'text-purple-900 dark:text-purple-400' : 'text-[#0c4a6e] dark:text-sky-400'
                }`}>
                  Add Chart to "{activeSetlist.name}"
                </h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowAddSongPicker(false);
                  setPickerSearchQuery('');
                }}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Search Input */}
            <div className="relative shrink-0">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder={`Search ${isTechnique ? 'technique' : 'sheet music'} charts...`}
                value={pickerSearchQuery}
                onChange={(e) => setPickerSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium outline-none text-slate-800 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-800 focus:border-slate-300 dark:focus:border-slate-600"
              />
            </div>

            {/* Song Selection List */}
            <div className="overflow-y-auto space-y-1.5 flex-1 pr-1">
              {filteredPickerSongs.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs font-medium">
                  No matching charts found in library.
                </div>
              ) : (
                filteredPickerSongs.map((song) => {
                  const isInSetlist = activeSetlist.items.some((item) => item.songId === song.id);

                  return (
                    <div
                      key={song.id}
                      onClick={() => handleAddSongToSetlist(activeSetlist, song.id)}
                      className={`p-3 rounded-xl border flex items-center justify-between gap-3 cursor-pointer transition-all ${
                        isInSetlist
                          ? 'bg-slate-50 dark:bg-slate-800/60 border-slate-200/80 dark:border-slate-700/80 opacity-70'
                          : isTechnique
                          ? 'bg-white dark:bg-slate-900 border-slate-200/90 dark:border-slate-800 hover:border-purple-300 dark:hover:border-purple-600 hover:bg-purple-50/50 dark:hover:bg-purple-950/40'
                          : 'bg-white dark:bg-slate-900 border-slate-200/90 dark:border-slate-800 hover:border-sky-300 dark:hover:border-sky-600 hover:bg-sky-50/50 dark:hover:bg-sky-950/40'
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                          {song.title}
                        </h4>
                        <p className="text-[10px] font-medium text-slate-400 dark:text-slate-400 truncate">
                          {song.artist ? `${song.artist} • ` : ''}{song.genre || 'General'}
                        </p>
                      </div>

                      <div className="shrink-0 flex items-center gap-2">
                        {isInSetlist ? (
                          <span className="text-[10px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/80 px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-800">
                            Added
                          </span>
                        ) : (
                          <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-md text-white shadow-2xs ${
                            isTechnique ? 'bg-purple-900 dark:bg-purple-700' : 'bg-[#0c4a6e] dark:bg-sky-700'
                          }`}>
                            + Add
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer */}
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-end shrink-0">
              <button
                type="button"
                onClick={() => {
                  setShowAddSongPicker(false);
                  setPickerSearchQuery('');
                }}
                className={`px-4 py-2 text-white rounded-xl text-xs font-black uppercase tracking-wider cursor-pointer ${
                  isTechnique ? 'bg-purple-900 dark:bg-purple-700' : 'bg-[#0c4a6e] dark:bg-sky-700'
                }`}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
