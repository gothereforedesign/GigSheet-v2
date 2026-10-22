import React, { useState } from 'react';
import { Setlist, Song } from '../types';
import { 
  Plus, ListMusic, Trash2, ChevronUp, ChevronDown, 
  Music, X, ChevronLeft, LayoutList, LayoutGrid, FolderEdit, Search, Play, Shuffle, Check, Edit3
} from 'lucide-react';
import { 
  CategoryColorKey, 
  getCascadingCategoryPalette
} from '../lib/categoryStorage';
import { LazyPDFThumbnail } from './LazyPDFThumbnail';

interface SetlistsViewProps {
  section?: 'sheet_music' | 'technique';
  setlists: Setlist[];
  allSongs: Song[];
  genreColors?: Record<string, CategoryColorKey>;
  isDarkMode?: boolean;
  selectedSetlistId?: string | null;
  isCreateModalOpen?: boolean;
  onCloseCreateModal?: () => void;
  onSelectSetlistId?: (id: string | null) => void;
  onCreateSetlist: (name: string, description?: string, section?: 'sheet_music' | 'technique') => Promise<Setlist | undefined | void>;
  onUpdateSetlist: (setlist: Setlist) => Promise<void>;
  onDeleteSetlist: (id: string) => Promise<void>;
  onAddSongToSetlist?: (setlist: Setlist, song: Song) => Promise<void>;
  onRemoveSongFromSetlist?: (setlist: Setlist, index: number) => Promise<void>;
  onOpenSetlistPerformance?: (setlist: Setlist, startIndex: number) => void;
  onSelectSong?: (song: Song, contextSetlist?: Setlist, index?: number) => void;
  onEditSong?: (song: Song) => void;
  onOpenGenreManager?: () => void;
  onRandomizePdf?: () => void;
}

export const SetlistsView: React.FC<SetlistsViewProps> = ({
  section = 'sheet_music',
  setlists,
  allSongs,
  isDarkMode = false,
  selectedSetlistId: propSelectedSetlistId,
  isCreateModalOpen = false,
  onCloseCreateModal,
  onSelectSetlistId,
  onCreateSetlist,
  onUpdateSetlist,
  onDeleteSetlist,
  onAddSongToSetlist,
  onRemoveSongFromSetlist,
  onOpenSetlistPerformance,
  onSelectSong,
  onEditSong,
  onOpenGenreManager,
  onRandomizePdf,
}) => {
  const targetSection = section === 'technique' ? 'technique' : 'sheet_music';

  // All setlists unified in the Emerald Green Setlists view
  const sectionSetlists = setlists;

  // Library songs excluding setlist duplicate records
  const librarySongs = React.useMemo(
    () => allSongs.filter((s) => !s.deletedAt && !s.isSetlistDuplicate && !s.setlistId),
    [allSongs]
  );

  // Resolve a SetlistItem songId to its Song object (supporting both direct song IDs and legacy duplicate IDs)
  const resolveSongForItem = React.useCallback(
    (itemSongId: string): Song | undefined => {
      const direct = allSongs.find((s) => s.id === itemSongId && !s.deletedAt);
      if (direct) {
        if (direct.originalSongId) {
          const orig = allSongs.find((s) => s.id === direct.originalSongId && !s.deletedAt);
          if (orig) return orig;
        }
        return direct;
      }
      return allSongs.find(
        (s) =>
          !s.deletedAt &&
          (s.originalSongId === itemSongId || itemSongId.endsWith(`_${s.id}`))
      );
    },
    [allSongs]
  );

  const [internalSetlistId, setInternalSetlistId] = useState<string | null>(null);
  const selectedSetlistId = propSelectedSetlistId !== undefined ? propSelectedSetlistId : internalSetlistId;

  const handleSetSelectedSetlistId = (id: string | null) => {
    setInternalSetlistId(id);
    if (onSelectSetlistId) {
      onSelectSetlistId(id);
    }
  };

  const [displayMode, setDisplayMode] = useState<'list' | 'grid'>(() => {
    try {
      return (localStorage.getItem('gigsheet_display_mode_setlists') as 'list' | 'grid') || 'list';
    } catch {
      return 'list';
    }
  });

  const handleToggleDisplayMode = (mode: 'list' | 'grid') => {
    setDisplayMode(mode);
    try {
      localStorage.setItem('gigsheet_display_mode_setlists', mode);
    } catch {}
  };

  const [isCreating, setIsCreating] = useState<boolean>(false);
  const [newSetName, setNewSetName] = useState<string>('');
  const [newSetDesc, setNewSetDesc] = useState<string>('');

  // Inline rename state for active setlist
  const [isRenamingActive, setIsRenamingActive] = useState<boolean>(false);
  const [renameText, setRenameText] = useState<string>('');
  const [renameDesc, setRenameDesc] = useState<string>('');
  const [confirmingDeleteSetlist, setConfirmingDeleteSetlist] = useState<boolean>(false);

  // Add chart picker modal state
  const [showAddSongPicker, setShowAddSongPicker] = useState<boolean>(false);
  const [pickerSearchQuery, setPickerSearchQuery] = useState<string>('');
  const [pickerSectionFilter, setPickerSectionFilter] = useState<'all' | 'sheet_music' | 'technique'>('all');
  const [pickerCategoryFilter, setPickerCategoryFilter] = useState<string>('ALL');

  const activeSetlist = sectionSetlists.find((s) => s.id === selectedSetlistId);

  const showCreateModal = isCreating || isCreateModalOpen;
  const closeCreateModal = () => {
    setIsCreating(false);
    if (onCloseCreateModal) onCloseCreateModal();
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSetName.trim()) return;
    const created = await onCreateSetlist(newSetName.trim(), newSetDesc.trim() || undefined, targetSection);
    setNewSetName('');
    setNewSetDesc('');
    closeCreateModal();
    if (created && created.id) {
      handleSetSelectedSetlistId(created.id);
    }
  };

  const handleStartInlineRename = (setlist: Setlist) => {
    setRenameText(setlist.name);
    setRenameDesc(setlist.description || '');
    setIsRenamingActive(true);
  };

  const handleSaveInlineRename = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeSetlist || !renameText.trim()) return;
    await onUpdateSetlist({
      ...activeSetlist,
      name: renameText.trim(),
      description: renameDesc.trim() || undefined,
      dateModified: Date.now(),
    });
    setIsRenamingActive(false);
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
    if (onRemoveSongFromSetlist) {
      onRemoveSongFromSetlist(setlist, index);
    } else {
      const newItems = setlist.items.filter((_, i) => i !== index);
      onUpdateSetlist({
        ...setlist,
        items: newItems,
        dateModified: Date.now(),
      });
    }
  };

  const findSongIndexInSetlist = (setlist: Setlist, song: Song): number => {
    return setlist.items.findIndex((item) => {
      if (item.songId === song.id) return true;
      const resolved = resolveSongForItem(item.songId);
      return resolved?.id === song.id;
    });
  };

  const handleToggleSongInSetlist = async (setlist: Setlist, song: Song) => {
    const existingIdx = findSongIndexInSetlist(setlist, song);
    if (existingIdx !== -1) {
      handleRemoveSongFromSetlist(setlist, existingIdx);
    } else if (onAddSongToSetlist) {
      await onAddSongToSetlist(setlist, song);
    } else {
      await onUpdateSetlist({
        ...setlist,
        items: [...setlist.items, { songId: song.id }],
        dateModified: Date.now(),
      });
    }
  };

  // Categories available in picker
  const pickerCategories = React.useMemo(() => {
    const cats = new Set<string>();
    librarySongs.forEach((s) => {
      const songSec = s.section === 'technique' ? 'technique' : 'sheet_music';
      if (pickerSectionFilter !== 'all' && songSec !== pickerSectionFilter) return;
      const cat = (s.genre || (songSec === 'technique' ? 'Scales' : 'Hymns')).trim();
      if (cat) cats.add(cat);
    });
    return Array.from(cats).sort((a, b) => a.localeCompare(b));
  }, [librarySongs, pickerSectionFilter]);

  // Filtered charts for picker
  const filteredPickerSongs = React.useMemo(() => {
    return librarySongs
      .filter((song) => {
        const songSec = song.section === 'technique' ? 'technique' : 'sheet_music';
        if (pickerSectionFilter !== 'all' && songSec !== pickerSectionFilter) return false;

        const songCat = (song.genre || (songSec === 'technique' ? 'Scales' : 'Hymns')).trim();
        if (pickerCategoryFilter !== 'ALL' && songCat.toLowerCase() !== pickerCategoryFilter.toLowerCase()) {
          return false;
        }

        if (!pickerSearchQuery.trim()) return true;
        const q = pickerSearchQuery.toLowerCase();
        return (
          song.title.toLowerCase().includes(q) ||
          (song.artist && song.artist.toLowerCase().includes(q)) ||
          songCat.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => a.title.localeCompare(b.title, undefined, { numeric: true, sensitivity: 'base' }));
  }, [librarySongs, pickerSectionFilter, pickerCategoryFilter, pickerSearchQuery]);

  // Resolved items for active setlist
  const resolvedSetlistEntries = React.useMemo(() => {
    if (!activeSetlist) return [];
    return activeSetlist.items
      .map((item, idx) => ({
        item,
        idx,
        song: resolveSongForItem(item.songId),
      }))
      .filter((entry): entry is { item: typeof activeSetlist.items[number]; idx: number; song: Song } => Boolean(entry.song));
  }, [activeSetlist, resolveSongForItem]);

  return (
    <div className="space-y-4 pb-0">
      {/* VIEW 1: 2-COLUMN SETLISTS GRID IN RICH EMERALD GREEN PALETTE */}
      {!selectedSetlistId ? (
        sectionSetlists.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-4 text-center bg-emerald-50/80 dark:bg-emerald-950/30 border border-dashed border-emerald-300/80 dark:border-emerald-800/80 rounded-xl space-y-3.5">
            <div className="p-3.5 rounded-2xl bg-emerald-800 dark:bg-emerald-700 text-white shadow-md">
              <ListMusic className="w-8 h-8 stroke-[2]" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-emerald-950 dark:text-emerald-100">
                No Setlists Yet
              </h3>
              <p className="text-xs text-emerald-800/80 dark:text-emerald-300/80 max-w-sm">
                Create custom performance setlists or practice routines and organize charts from any category in your preferred order.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsCreating(true)}
              className="mt-1 px-4 py-2.5 rounded-xl bg-emerald-800 hover:bg-emerald-900 dark:bg-emerald-700 dark:hover:bg-emerald-600 text-white text-xs font-black uppercase tracking-wider flex items-center gap-1.5 shadow-md cursor-pointer active:scale-95 transition-all"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>Create Setlist</span>
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Setlists Directory Action Bar */}
            <div className="flex items-center justify-between gap-2 px-0.5">
              <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-zinc-400 font-bold">
                <span className="text-emerald-900 dark:text-emerald-300 font-black uppercase tracking-wider">
                  Setlists
                </span>
                <span aria-hidden="true">·</span>
                <span className="font-mono tabular-nums">
                  {sectionSetlists.length} {sectionSetlists.length === 1 ? 'setlist' : 'setlists'}
                </span>
              </div>

              <div className="flex items-center gap-2">
                {onOpenGenreManager && (
                  <button
                    type="button"
                    onClick={onOpenGenreManager}
                    className="px-2.5 py-1.5 rounded-lg bg-white dark:bg-zinc-900 hover:bg-emerald-50 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-200 border border-slate-200 dark:border-zinc-800 text-xs font-bold flex items-center gap-1.5 cursor-pointer active:scale-95 transition-all shadow-2xs whitespace-nowrap"
                    title="Reorder, Rename, or Delete Setlists"
                  >
                    <FolderEdit className="w-3.5 h-3.5 stroke-[2] text-emerald-700 dark:text-emerald-400" />
                    <span>Edit</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setIsCreating(true)}
                  className="px-3 py-1.5 rounded-lg bg-emerald-800 hover:bg-emerald-900 dark:bg-emerald-700 dark:hover:bg-emerald-600 text-white text-xs font-black uppercase tracking-wider flex items-center gap-1.5 cursor-pointer active:scale-95 transition-all shadow-sm whitespace-nowrap"
                >
                  <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span>New Setlist</span>
                </button>
              </div>
            </div>

            {/* 2-Column Setlists Grid */}
            <div className="grid grid-cols-2 gap-3 sm:gap-4 md:gap-5 lg:gap-6">
              {sectionSetlists.map((setlist, idx) => {
                const validCount = setlist.items.filter((item) => Boolean(resolveSongForItem(item.songId))).length;
                const palette = getCascadingCategoryPalette(idx, sectionSetlists.length, 'setlists');

                return (
                  <div
                    key={setlist.id}
                    onClick={() => handleSetSelectedSetlistId(setlist.id)}
                    style={{
                      backgroundColor: palette.cardBgHex,
                      borderColor: palette.cardBorderHex,
                    }}
                    className="relative group aspect-[3/2] rounded-lg md:rounded-xl p-3 sm:p-5 md:p-6 lg:p-8 border flex flex-col items-center justify-center text-center cursor-pointer shadow-xs hover:shadow-md hover:scale-[1.01] active:scale-[0.99] transition-all select-none hover:brightness-110 text-white"
                  >
                    {/* Setlist Count Badge */}
                    <div className="absolute top-2.5 right-2.5 sm:top-3 sm:right-3 px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-mono tabular-nums font-bold tracking-tight bg-black/25 text-white/95 backdrop-blur-xs border border-white/15 shadow-2xs flex items-center gap-1">
                      <ListMusic className="w-3 h-3 text-emerald-200 stroke-[2.5]" />
                      <span>{validCount}</span>
                    </div>

                    <h3 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl text-[clamp(1.25rem,2.8vw+0.5rem,2.5rem)] font-black tracking-tight line-clamp-2 leading-tight sm:leading-snug md:leading-normal px-2 sm:px-4 text-white">
                      {setlist.name}
                    </h3>

                    {setlist.description && (
                      <p className="text-[11px] sm:text-xs font-medium text-emerald-100/85 line-clamp-1 mt-1 px-2">
                        {setlist.description}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )
      ) : (
        /* VIEW 2: CHARTS LIST OR PREVIEW GRID INSIDE SELECTED SETLIST - EMERALD GREEN PALETTE */
        activeSetlist && (
          <div
            style={{
              backgroundColor: isDarkMode
                ? 'rgba(6, 78, 59, 0.35)'
                : 'rgba(236, 253, 245, 0.9)',
              borderColor: isDarkMode
                ? 'rgba(16, 185, 129, 0.3)'
                : 'rgba(110, 231, 183, 0.55)',
            }}
            className="rounded-lg md:rounded-xl border p-3 sm:p-4.5 shadow-2xs space-y-3 transition-colors"
          >
            {/* Top Bar Navigation */}
            <div className="flex items-center justify-between gap-2 pb-2 border-b border-emerald-200/60 dark:border-emerald-900/60 flex-wrap">
              <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 flex-wrap">
                {/* Back Arrow Button */}
                <button
                  type="button"
                  onClick={() => {
                    setIsRenamingActive(false);
                    setConfirmingDeleteSetlist(false);
                    handleSetSelectedSetlistId(null);
                  }}
                  className="p-1.5 text-emerald-900 dark:text-emerald-100 bg-white/90 dark:bg-emerald-900/80 hover:bg-white dark:hover:bg-emerald-800 border border-emerald-200 dark:border-emerald-700 rounded-md cursor-pointer active:scale-95 shadow-2xs shrink-0"
                  title="Back to Setlists"
                >
                  <ChevronLeft className="w-5 h-5 stroke-[2.5]" />
                </button>

                {/* Setlist Title Badge + Quick Rename & Manager Buttons */}
                <div className="flex items-center gap-2 bg-white/95 dark:bg-emerald-900/80 border border-emerald-200 dark:border-emerald-700 px-2.5 py-1 rounded-md shadow-2xs shrink-0">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0 shadow-2xs bg-emerald-600 dark:bg-emerald-400" />
                  <h2
                    onClick={() => handleStartInlineRename(activeSetlist)}
                    className="text-xs sm:text-sm font-black text-emerald-950 dark:text-emerald-100 truncate max-w-[130px] sm:max-w-[220px] cursor-pointer hover:underline"
                    title="Click to rename setlist"
                  >
                    {activeSetlist.name}
                  </h2>
                  <button
                    type="button"
                    onClick={() => handleStartInlineRename(activeSetlist)}
                    className="p-0.5 rounded-xs text-emerald-600 dark:text-emerald-300 hover:text-emerald-900 dark:hover:text-emerald-100 hover:bg-emerald-100 dark:hover:bg-emerald-800 cursor-pointer shrink-0"
                    title="Rename Setlist"
                  >
                    <Edit3 className="w-3.5 h-3.5 stroke-[2]" />
                  </button>
                </div>

                {/* Section Count Badge */}
                <div
                  className="inline-flex items-center justify-center border px-2 py-1 rounded-md text-xs font-mono tabular-nums font-bold shrink-0 min-w-[28px] text-center bg-white/80 dark:bg-emerald-950/80 text-emerald-900 dark:text-emerald-200 border-emerald-300 dark:border-emerald-800"
                  title={`${resolvedSetlistEntries.length} Charts`}
                >
                  <span>{resolvedSetlistEntries.length}</span>
                </div>
              </div>

              <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                {/* Play / Perform Setlist From Start Button */}
                {resolvedSetlistEntries.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      if (onOpenSetlistPerformance) {
                        onOpenSetlistPerformance(activeSetlist, 0);
                      } else if (onSelectSong && resolvedSetlistEntries[0]) {
                        onSelectSong(resolvedSetlistEntries[0].song, activeSetlist, 0);
                      }
                    }}
                    className="px-2.5 py-1.5 rounded-md bg-emerald-700 hover:bg-emerald-800 dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white font-black text-xs border border-emerald-600 cursor-pointer active:scale-95 shadow-2xs whitespace-nowrap flex items-center gap-1"
                    title="Start Setlist from #1"
                  >
                    <Play className="w-3.5 h-3.5 fill-current stroke-[2]" />
                    <span className="hidden sm:inline text-[11px] uppercase tracking-wider">Play</span>
                  </button>
                )}

                {/* Add Chart Button */}
                <button
                  type="button"
                  onClick={() => setShowAddSongPicker(true)}
                  className="px-2.5 py-1.5 rounded-md bg-emerald-800 hover:bg-emerald-900 dark:bg-emerald-700 dark:hover:bg-emerald-600 text-white font-black text-xs border border-emerald-700 cursor-pointer active:scale-95 shadow-2xs whitespace-nowrap flex items-center gap-1"
                  title="Add or Remove Charts in Setlist"
                >
                  <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span className="text-[11px] uppercase tracking-wider">Charts</span>
                </button>

                {/* Randomize Setlist Button */}
                {onRandomizePdf && resolvedSetlistEntries.length > 0 && (
                  <button
                    type="button"
                    onClick={onRandomizePdf}
                    className="p-1.5 rounded-md bg-white/90 dark:bg-emerald-900/80 hover:bg-white dark:hover:bg-emerald-800 text-emerald-900 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-700 cursor-pointer active:scale-95 shadow-2xs"
                    title="Randomize Setlist"
                    aria-label="Randomize Setlist"
                  >
                    <Shuffle className="w-4 h-4 stroke-[2.2]" />
                  </button>
                )}

                {/* View Toggle Button */}
                <button
                  type="button"
                  onClick={() => handleToggleDisplayMode(displayMode === 'list' ? 'grid' : 'list')}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-white/90 dark:bg-emerald-900/80 hover:bg-white dark:hover:bg-emerald-800 text-emerald-900 dark:text-emerald-200 font-black text-xs border border-emerald-200 dark:border-emerald-700 cursor-pointer active:scale-95 shadow-2xs whitespace-nowrap"
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

                {/* Delete Setlist Button */}
                <button
                  type="button"
                  onClick={() => setConfirmingDeleteSetlist((prev) => !prev)}
                  className="p-1.5 rounded-md bg-white/90 dark:bg-emerald-900/80 hover:bg-rose-50 dark:hover:bg-rose-950/60 text-emerald-800 dark:text-emerald-300 hover:text-rose-600 dark:hover:text-rose-400 border border-emerald-200 dark:border-emerald-700 hover:border-rose-200 dark:hover:border-rose-800 cursor-pointer active:scale-95 shadow-2xs transition-colors"
                  title="Delete Setlist"
                >
                  <Trash2 className="w-4 h-4 stroke-[2]" />
                </button>
              </div>
            </div>

            {/* Inline Delete Confirmation Banner */}
            {confirmingDeleteSetlist && (
              <div className="p-3 bg-rose-50 dark:bg-rose-950/70 rounded-lg border border-rose-300 dark:border-rose-800 flex items-center justify-between gap-3 shadow-xs">
                <p className="text-xs font-bold text-rose-900 dark:text-rose-200">
                  Delete setlist <span className="font-black">"{activeSetlist.name}"</span>? Your PDF charts will remain safely in your library.
                </p>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => setConfirmingDeleteSetlist(false)}
                    className="px-2.5 py-1 text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      setConfirmingDeleteSetlist(false);
                      await onDeleteSetlist(activeSetlist.id);
                      handleSetSelectedSetlistId(null);
                    }}
                    className="px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-md text-xs font-black uppercase tracking-wider cursor-pointer shadow-2xs"
                  >
                    Delete
                  </button>
                </div>
              </div>
            )}

            {/* Inline Rename / Edit Description Bar */}
            {isRenamingActive ? (
              <form
                onSubmit={handleSaveInlineRename}
                className="p-3 bg-white dark:bg-slate-900 rounded-lg border border-emerald-300 dark:border-emerald-700 space-y-2.5 shadow-xs"
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-wider text-emerald-800 dark:text-emerald-400 mb-1">
                      Setlist Name
                    </label>
                    <input
                      type="text"
                      required
                      autoFocus
                      value={renameText}
                      onChange={(e) => setRenameText(e.target.value)}
                      className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-xs font-bold text-slate-900 dark:text-slate-100 outline-none focus:border-emerald-600"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-wider text-emerald-800 dark:text-emerald-400 mb-1">
                      Notes / Description (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Sunday Morning Service"
                      value={renameDesc}
                      onChange={(e) => setRenameDesc(e.target.value)}
                      className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-xs font-medium text-slate-900 dark:text-slate-100 outline-none focus:border-emerald-600"
                    />
                  </div>
                </div>
                <div className="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsRenamingActive(false)}
                    className="px-3 py-1 text-xs font-bold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-3.5 py-1 bg-emerald-800 hover:bg-emerald-900 dark:bg-emerald-700 text-white rounded-md text-xs font-black uppercase tracking-wider cursor-pointer"
                  >
                    Save
                  </button>
                </div>
              </form>
            ) : (
              activeSetlist.description && (
                <p className="text-xs font-medium text-emerald-900/90 dark:text-emerald-300 px-0.5">
                  {activeSetlist.description}
                </p>
              )
            )}

            {/* Items inside Setlist */}
            {resolvedSetlistEntries.length === 0 ? (
              <div className="p-8 sm:p-10 text-center bg-white/85 dark:bg-emerald-950/60 rounded-lg border border-emerald-200 dark:border-emerald-800/80 space-y-3 shadow-2xs">
                <div className="w-10 h-10 rounded-md mx-auto flex items-center justify-center border bg-emerald-100 dark:bg-emerald-900 border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-200">
                  <Music className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm font-bold text-emerald-950 dark:text-emerald-100">
                    No charts in this setlist
                  </p>
                  <p className="text-xs text-emerald-700 dark:text-emerald-400 mt-0.5">
                    Add PDF charts from your Sheet Music or Technique directories to build this setlist.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAddSongPicker(true)}
                  className="mt-1 px-4 py-2 text-white text-xs font-black uppercase tracking-wider rounded-md cursor-pointer shadow-2xs active:scale-95 bg-emerald-800 hover:bg-emerald-900 dark:bg-emerald-700 dark:hover:bg-emerald-600 inline-flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span>Add Charts</span>
                </button>
              </div>
            ) : displayMode === 'grid' ? (
              /* GRID PREVIEW MODE */
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-3.5 pt-1">
                {resolvedSetlistEntries.map(({ item, idx, song }, displayIndex) => (
                  <div
                    key={`${item.songId}_${idx}`}
                    onClick={() => onSelectSong?.(song, activeSetlist, displayIndex)}
                    className="relative bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-900 rounded-sm overflow-hidden shadow-2xs hover:shadow-md cursor-pointer group flex flex-col active:scale-[0.98] transition-all hover:border-emerald-500 dark:hover:border-emerald-400"
                  >
                    {/* Order Overlay Badge */}
                    <div className="absolute top-2 left-2 z-10 px-2 py-0.5 rounded-md text-[10px] font-black font-mono tabular-nums tracking-tight shadow-xs bg-emerald-950/90 text-emerald-200 border border-emerald-500/40">
                      #{displayIndex + 1}
                    </div>

                    {/* Controls Top-Right */}
                    <div
                      className="absolute top-2 right-2 z-10 flex items-center gap-1 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xs p-0.5 rounded-md border border-emerald-200 dark:border-emerald-800 shadow-xs"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        type="button"
                        onClick={() => handleMoveSong(activeSetlist, idx, 'up')}
                        disabled={displayIndex === 0}
                        className="p-0.5 text-slate-500 dark:text-slate-400 hover:text-emerald-900 dark:hover:text-emerald-100 disabled:opacity-20 cursor-pointer"
                        title="Move Up"
                      >
                        <ChevronUp className="w-3.5 h-3.5 stroke-[2.5]" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleMoveSong(activeSetlist, idx, 'down')}
                        disabled={displayIndex === resolvedSetlistEntries.length - 1}
                        className="p-0.5 text-slate-500 dark:text-slate-400 hover:text-emerald-900 dark:hover:text-emerald-100 disabled:opacity-20 cursor-pointer"
                        title="Move Down"
                      >
                        <ChevronDown className="w-3.5 h-3.5 stroke-[2.5]" />
                      </button>
                      {onEditSong && (
                        <button
                          type="button"
                          onClick={() => onEditSong(song)}
                          className="p-0.5 text-slate-400 dark:text-slate-500 hover:text-emerald-800 dark:hover:text-emerald-200 cursor-pointer"
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
                    <div className="relative aspect-[16/11] w-full bg-slate-100/80 dark:bg-slate-800/80 border-b border-emerald-100 dark:border-emerald-900 flex items-center justify-center overflow-hidden">
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
                        <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate leading-tight group-hover:text-emerald-800 dark:group-hover:text-emerald-300">
                          {song.title}
                        </h3>
                        <p className="text-[10px] font-medium text-slate-400 dark:text-slate-400 truncate">
                          {song.artist ? `${song.artist} · ` : ''}{song.genre || (song.section === 'technique' ? 'Technique' : 'Sheet Music')}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              /* LIST MODE */
              <div className="flex flex-col gap-2 pt-1">
                {resolvedSetlistEntries.map(({ item, idx, song }, displayIndex) => (
                  <div
                    key={`${item.songId}_${idx}`}
                    onClick={() => onSelectSong?.(song, activeSetlist, displayIndex)}
                    className="bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-900/80 rounded-md px-3.5 py-2.5 flex items-center justify-between gap-3 shadow-2xs hover:shadow-xs cursor-pointer group transition-all hover:border-emerald-500 dark:hover:border-emerald-400"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      {/* Order Number Badge */}
                      <div className="w-6 h-6 rounded-md text-xs font-black font-mono tabular-nums flex items-center justify-center shrink-0 border bg-emerald-50 dark:bg-emerald-950/80 text-emerald-900 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800">
                        {displayIndex + 1}
                      </div>

                      <div className="min-w-0 flex-1">
                        <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate leading-tight group-hover:text-emerald-800 dark:group-hover:text-emerald-300">
                          {song.title}
                        </h3>
                        <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-400 dark:text-slate-400 truncate mt-0.5">
                          {song.artist && (
                            <>
                              <span className="truncate">{song.artist}</span>
                              <span aria-hidden="true">·</span>
                            </>
                          )}
                          <span className="truncate">
                            {song.genre || (song.section === 'technique' ? 'Technique' : 'Sheet Music')}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Right Action Controls */}
                    <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={() => handleMoveSong(activeSetlist, idx, 'up')}
                        disabled={displayIndex === 0}
                        className="p-1 text-slate-400 dark:text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 disabled:opacity-20 cursor-pointer rounded-md hover:bg-slate-100 dark:hover:bg-slate-800"
                        title="Move Up"
                      >
                        <ChevronUp className="w-4 h-4 stroke-[2.2]" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleMoveSong(activeSetlist, idx, 'down')}
                        disabled={displayIndex === resolvedSetlistEntries.length - 1}
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
                ))}
              </div>
            )}
          </div>
        )
      )}

      {/* CREATE NEW SETLIST MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-start justify-center p-3 sm:p-4 pt-6 sm:pt-12">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-md p-5 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <ListMusic className="w-5 h-5 text-emerald-700 dark:text-emerald-400" />
                <h3 className="text-sm font-black uppercase tracking-wider text-emerald-800 dark:text-emerald-400">
                  Create New Setlist
                </h3>
              </div>
              <button
                type="button"
                onClick={closeCreateModal}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-3">
              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                  Setlist Name
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  placeholder="e.g., Sunday Service, Jazz Gig, Daily Warmup"
                  value={newSetName}
                  onChange={(e) => setNewSetName(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold outline-none text-slate-800 dark:text-slate-100 focus:border-emerald-500 focus:bg-white dark:focus:bg-slate-800 transition-all"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                  Description / Notes (Optional)
                </label>
                <input
                  type="text"
                  placeholder="Optional notes, venue, or date"
                  value={newSetDesc}
                  onChange={(e) => setNewSetDesc(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium outline-none text-slate-800 dark:text-slate-100 focus:border-emerald-500 focus:bg-white dark:focus:bg-slate-800 transition-all"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={closeCreateModal}
                  className="px-4 py-2 text-xs font-bold text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-white rounded-xl text-xs font-black uppercase tracking-wider cursor-pointer active:scale-95 shadow-md bg-emerald-800 hover:bg-emerald-900 dark:bg-emerald-700 dark:hover:bg-emerald-600"
                >
                  Create Setlist
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADD / MANAGE CHARTS IN SETLIST PICKER MODAL */}
      {showAddSongPicker && activeSetlist && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-start justify-center p-3 sm:p-4 pt-4 sm:pt-8 md:pt-12">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-lg p-4 sm:p-5 space-y-3 flex flex-col max-h-[82vh] sm:max-h-[85vh] animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 shrink-0">
              <div className="flex items-center gap-2 min-w-0">
                <ListMusic className="w-5 h-5 text-emerald-700 dark:text-emerald-400 shrink-0" />
                <div className="min-w-0">
                  <h3 className="text-sm font-black uppercase tracking-wider text-emerald-800 dark:text-emerald-400 truncate">
                    Manage Charts in "{activeSetlist.name}"
                  </h3>
                  <p className="text-[11px] font-medium text-slate-400 dark:text-slate-400">
                    Tap any chart to add or remove · {resolvedSetlistEntries.length} selected
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowAddSongPicker(false);
                  setPickerSearchQuery('');
                }}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Section Filter Tabs (All | Sheet Music | Technique) */}
            <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl shrink-0">
              <button
                type="button"
                onClick={() => {
                  setPickerSectionFilter('all');
                  setPickerCategoryFilter('ALL');
                }}
                className={`flex-1 py-1.5 px-2.5 rounded-lg text-xs font-bold transition-colors cursor-pointer whitespace-nowrap ${
                  pickerSectionFilter === 'all'
                    ? 'bg-emerald-800 text-white shadow-2xs'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                All Charts
              </button>
              <button
                type="button"
                onClick={() => {
                  setPickerSectionFilter('sheet_music');
                  setPickerCategoryFilter('ALL');
                }}
                className={`flex-1 py-1.5 px-2.5 rounded-lg text-xs font-bold transition-colors cursor-pointer whitespace-nowrap ${
                  pickerSectionFilter === 'sheet_music'
                    ? 'bg-[#0c4a6e] text-white shadow-2xs'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Sheet Music
              </button>
              <button
                type="button"
                onClick={() => {
                  setPickerSectionFilter('technique');
                  setPickerCategoryFilter('ALL');
                }}
                className={`flex-1 py-1.5 px-2.5 rounded-lg text-xs font-bold transition-colors cursor-pointer whitespace-nowrap ${
                  pickerSectionFilter === 'technique'
                    ? 'bg-purple-800 text-white shadow-2xs'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Technique
              </button>
            </div>

            {/* Category Quick Filter Bar */}
            {pickerCategories.length > 1 && (
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar shrink-0">
                <button
                  type="button"
                  onClick={() => setPickerCategoryFilter('ALL')}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold whitespace-nowrap cursor-pointer transition-colors ${
                    pickerCategoryFilter === 'ALL'
                      ? 'bg-emerald-100 dark:bg-emerald-900/80 text-emerald-900 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-700'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  All Categories
                </button>
                {pickerCategories.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setPickerCategoryFilter(cat)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold whitespace-nowrap cursor-pointer transition-colors ${
                      pickerCategoryFilter === cat
                        ? 'bg-emerald-100 dark:bg-emerald-900/80 text-emerald-900 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-700'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            )}

            {/* Search Input */}
            <div className="relative shrink-0">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search charts by title, artist, or category..."
                value={pickerSearchQuery}
                onChange={(e) => setPickerSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium outline-none text-slate-800 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-800 focus:border-emerald-500"
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
                  const existingIdx = findSongIndexInSetlist(activeSetlist, song);
                  const isInSetlist = existingIdx !== -1;

                  return (
                    <div
                      key={song.id}
                      onClick={() => handleToggleSongInSetlist(activeSetlist, song)}
                      className={`p-3 rounded-xl border flex items-center justify-between gap-3 transition-all cursor-pointer ${
                        isInSetlist
                          ? 'bg-emerald-50/90 dark:bg-emerald-950/60 border-emerald-400 dark:border-emerald-700'
                          : 'bg-white dark:bg-slate-900 border-slate-200/90 dark:border-slate-800 hover:border-emerald-400 dark:hover:border-emerald-600 hover:bg-emerald-50/40 dark:hover:bg-emerald-950/30'
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                          {song.title}
                        </h4>
                        <p className="text-[10px] font-medium text-slate-400 dark:text-slate-400 truncate">
                          {song.artist ? `${song.artist} · ` : ''}{song.genre || (song.section === 'technique' ? 'Technique' : 'Sheet Music')}
                        </p>
                      </div>

                      <div className="shrink-0 flex items-center gap-2">
                        {isInSetlist ? (
                          <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-md border text-emerald-800 dark:text-emerald-200 bg-emerald-100 dark:bg-emerald-900/90 border-emerald-300 dark:border-emerald-700 flex items-center gap-1">
                            <Check className="w-3 h-3 stroke-[3]" />
                            <span>Added</span>
                          </span>
                        ) : (
                          <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-md text-white shadow-2xs bg-emerald-800 hover:bg-emerald-900 dark:bg-emerald-700">
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
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0">
              <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300 font-mono tabular-nums">
                {resolvedSetlistEntries.length} {resolvedSetlistEntries.length === 1 ? 'chart' : 'charts'} in setlist
              </span>
              <button
                type="button"
                onClick={() => {
                  setShowAddSongPicker(false);
                  setPickerSearchQuery('');
                }}
                className="px-5 py-2 text-white rounded-xl text-xs font-black uppercase tracking-wider cursor-pointer bg-emerald-800 hover:bg-emerald-900 dark:bg-emerald-700"
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
