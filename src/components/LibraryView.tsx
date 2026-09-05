import React, { useState } from 'react';
import { Song, ViewFilterState } from '../types';
import { 
  Music, Trash2, FolderEdit, ListPlus, ChevronLeft, FileText, LayoutList, LayoutGrid
} from 'lucide-react';
import { 
  CategoryColorKey, 
  getCategoryPalette, 
  getCascadingCategoryPalette,
  DEFAULT_SHEET_MUSIC_CATEGORIES, 
  DEFAULT_TECHNIQUE_CATEGORIES 
} from '../lib/categoryStorage';
import { SongPreviewCard } from './SongPreviewCard';

interface LibraryViewProps {
  songs: Song[];
  genres?: string[];
  genreColors?: Record<string, CategoryColorKey>;
  filterState: ViewFilterState;
  activeTab?: string;
  selectedCategory?: string | null;
  isDarkMode?: boolean;
  onSelectCategory?: (category: string | null) => void;
  onFilterChange: (filters: Partial<ViewFilterState>) => void;
  onSelectSong: (song: Song) => void;
  onToggleFavorite: (id: string) => void;
  onDeleteSong: (id: string) => void;
  onEditSong: (song: Song) => void;
  onAddToSetlist?: (song: Song) => void;
  onOpenGenreManager?: () => void;
  onAddChart?: () => void;
  trashCount?: number;
  onOpenTrash?: () => void;
}

interface SongRowProps {
  song: Song;
  isTechnique?: boolean;
  onSelectSong: (song: Song) => void;
  onDeleteSong: (id: string) => void;
  onEditSong: (song: Song) => void;
  onAddToSetlist?: (song: Song) => void;
}

const SongRow: React.FC<SongRowProps> = ({
  song,
  isTechnique = false,
  onSelectSong,
  onDeleteSong,
  onEditSong,
  onAddToSetlist,
}) => {
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const startXRef = React.useRef<number | null>(null);
  const startYRef = React.useRef<number | null>(null);
  const isPointerDownRef = React.useRef(false);
  const isSwipingRef = React.useRef(false);
  const animFrameRef = React.useRef<number | null>(null);

  const handlePointerDown = (e: React.PointerEvent) => {
    if (e.button !== undefined && e.button !== 0) return;
    startXRef.current = e.clientX;
    startYRef.current = e.clientY;
    isPointerDownRef.current = true;
    isSwipingRef.current = false;
    setIsDragging(true);
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {}
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isPointerDownRef.current || startXRef.current === null || startYRef.current === null) return;
    const diffX = e.clientX - startXRef.current;
    const diffY = e.clientY - startYRef.current;

    if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 5) {
      if (diffX < 0) {
        isSwipingRef.current = true;
        const offset = Math.max(-130, diffX);
        if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = requestAnimationFrame(() => {
          setSwipeOffset(offset);
        });
      } else {
        if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = requestAnimationFrame(() => {
          setSwipeOffset(0);
        });
      }
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!isPointerDownRef.current) return;
    isPointerDownRef.current = false;
    setIsDragging(false);
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {}

    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);

    if (swipeOffset < -65) {
      onDeleteSong(song.id);
    }
    setSwipeOffset(0);
    startXRef.current = null;
    startYRef.current = null;
    setTimeout(() => {
      isSwipingRef.current = false;
    }, 100);
  };

  const handleClick = (e: React.MouseEvent) => {
    if (isSwipingRef.current || Math.abs(swipeOffset) > 10) {
      e.stopPropagation();
      return;
    }
    onSelectSong(song);
  };

  return (
    <div className={`relative overflow-hidden rounded-md select-none touch-pan-y ${swipeOffset < 0 ? 'bg-rose-600' : 'bg-transparent'}`}>
      {/* Trash Background Indicator Revealed ONLY on Left Swipe */}
      {swipeOffset < 0 && (
        <div className="absolute inset-y-0 right-0 w-28 bg-rose-600 flex items-center justify-end px-4 text-white font-black text-xs gap-1.5">
          <Trash2 className="w-5 h-5 stroke-[2.2]" />
          <span className="uppercase text-[10px] tracking-wider font-black">Trash</span>
        </div>
      )}

      <div
        style={{ transform: `translate3d(${swipeOffset}px, 0, 0)`, willChange: 'transform' }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onClick={handleClick}
        className={`bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-md px-4 py-3 flex items-center justify-between gap-3 shadow-2xs hover:shadow-xs cursor-pointer group ${
          isDragging ? 'transition-none' : 'transition-transform duration-200 ease-out'
        } ${
          isTechnique ? 'hover:border-purple-400 dark:hover:border-purple-500' : 'hover:border-sky-400 dark:hover:border-sky-500'
        }`}
      >
        <div className="min-w-0 flex-1">
          <h3 className={`text-sm font-bold text-slate-900 dark:text-slate-100 truncate transition-colors leading-tight ${
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

        <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
          {onAddToSetlist && (
            <button
              type="button"
              onClick={() => onAddToSetlist(song)}
              className={`p-1.5 rounded-lg text-slate-400 dark:text-slate-500 active:scale-95 transition-all cursor-pointer ${
                isTechnique ? 'hover:text-purple-900 dark:hover:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-950/60' : 'hover:text-[#0c4a6e] dark:hover:text-sky-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
              title={isTechnique ? "Add to Practice Routine" : "Add to Performance Setlist"}
            >
              <ListPlus className="w-4 h-4 stroke-[2]" />
            </button>
          )}

          <button
            type="button"
            onClick={() => onEditSong(song)}
            className={`p-1.5 rounded-lg text-slate-400 dark:text-slate-500 active:scale-95 transition-all cursor-pointer ${
              isTechnique ? 'hover:text-purple-900 dark:hover:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-950/60' : 'hover:text-[#0c4a6e] dark:hover:text-sky-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
            title="Edit Chart Info"
          >
            <FolderEdit className="w-4 h-4 stroke-[2]" />
          </button>
        </div>
      </div>
    </div>
  );
};

export const LibraryView: React.FC<LibraryViewProps> = ({
  songs,
  genres = [],
  genreColors,
  filterState,
  activeTab = 'sheet_music',
  selectedCategory: propSelectedCategory,
  isDarkMode = false,
  onSelectCategory,
  onFilterChange,
  onSelectSong,
  onDeleteSong,
  onEditSong,
  onAddToSetlist,
  onOpenGenreManager,
  onAddChart,
  trashCount,
  onOpenTrash,
}) => {
  const section: 'sheet_music' | 'technique' = activeTab === 'technique' ? 'technique' : 'sheet_music';
  const isTechnique = section === 'technique';

  // Persistent Display Mode ('list' | 'grid')
  const [displayMode, setDisplayMode] = useState<'list' | 'grid'>(() => {
    try {
      const storageKey = isTechnique ? 'gigsheet_display_mode_technique' : 'gigsheet_display_mode_sheet_music';
      return (localStorage.getItem(storageKey) as 'list' | 'grid') || 'list';
    } catch {
      return 'list';
    }
  });

  const handleToggleDisplayMode = (mode: 'list' | 'grid') => {
    setDisplayMode(mode);
    try {
      const storageKey = isTechnique ? 'gigsheet_display_mode_technique' : 'gigsheet_display_mode_sheet_music';
      localStorage.setItem(storageKey, mode);
    } catch (e) {
      // ignore
    }
  };

  // Selected Category State: null means we show the 2-column Category Grid!
  const [internalSelectedCategory, setInternalSelectedCategory] = useState<string | null>(null);
  const selectedCategory = propSelectedCategory !== undefined ? propSelectedCategory : internalSelectedCategory;

  const handleSetSelectedCategory = (cat: string | null) => {
    if (onSelectCategory) {
      onSelectCategory(cat);
    } else {
      setInternalSelectedCategory(cat);
    }
  };

  // Extract list of defined categories for this section
  const availableCategories = React.useMemo(() => {
    if (genres && genres.length > 0) {
      return genres;
    }
    return isTechnique ? DEFAULT_TECHNIQUE_CATEGORIES : DEFAULT_SHEET_MUSIC_CATEGORIES;
  }, [genres, isTechnique]);

  // Filtered Songs when inside a category
  const filteredSongs = songs.filter((song) => {
    if (selectedCategory && selectedCategory !== 'ALL_SECTION_CHARTS') {
      const defaultCat = isTechnique ? 'Scales' : 'Hymns';
      const songCategory = song.genre || defaultCat;
      if (songCategory !== selectedCategory) return false;
    }
    return true;
  });

  // Sorted Songs
  const sortedSongs = [...filteredSongs].sort((a, b) =>
    a.title.localeCompare(b.title, undefined, { numeric: true, sensitivity: 'base' })
  );

  // Category Color Palette for current selected category
  const currentPalette = getCategoryPalette(selectedCategory || undefined, genreColors, section);

  // Count charts per category for display on category square cards
  const categoryChartCounts = React.useMemo(() => {
    const counts: Record<string, number> = {};
    const normalizedMap: Record<string, string> = {};

    availableCategories.forEach((cat) => {
      counts[cat] = 0;
      normalizedMap[cat.trim().toLowerCase()] = cat;
    });

    songs.forEach((song) => {
      const defaultCat = isTechnique ? 'Scales' : 'Hymns';
      const rawCat = (song.genre || defaultCat).trim();
      const norm = rawCat.toLowerCase();

      const matchedKey = normalizedMap[norm];
      if (matchedKey) {
        counts[matchedKey] = (counts[matchedKey] || 0) + 1;
      } else if (counts[rawCat] !== undefined) {
        counts[rawCat] += 1;
      } else {
        counts[rawCat] = 1;
      }
    });
    return counts;
  }, [availableCategories, songs, isTechnique]);

  // Determine if we should render the Category Grid or the Chart List
  const showCategorySquaresGrid = selectedCategory === null;

  return (
    <div className="space-y-4 pb-0">
      {/* VIEW 1: 2-COLUMN CATEGORY GRID (3:2 Aspect Ratio Cards with Cascading Color Progression) */}
      {showCategorySquaresGrid ? (
        <div>
          <div className="grid grid-cols-2 gap-3 sm:gap-4 md:gap-5 lg:gap-6">
            {availableCategories.map((catName, index) => {
              const palette = getCascadingCategoryPalette(index, availableCategories.length, section);
              const count = categoryChartCounts[catName] || 0;

              return (
                <div
                  key={catName}
                  onClick={() => handleSetSelectedCategory(catName)}
                  style={{
                    backgroundColor: palette.cardBgHex,
                    borderColor: palette.cardBorderHex,
                  }}
                  className={`relative group aspect-[3/2] rounded-lg md:rounded-xl p-3 sm:p-5 md:p-6 lg:p-8 border flex items-center justify-center text-center cursor-pointer shadow-xs hover:shadow-md hover:scale-[1.01] active:scale-[0.99] transition-all select-none hover:brightness-110 ${palette.cardText}`}
                >
                  {/* Subtle PDF count badge */}
                  <div className="absolute top-2.5 right-2.5 sm:top-3 sm:right-3 px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-mono font-bold tracking-tight bg-black/25 text-white/95 backdrop-blur-xs border border-white/15 shadow-2xs">
                    <span>{count}</span>
                  </div>

                  <h3 className={`text-xl sm:text-2xl md:text-3xl lg:text-4xl text-[clamp(1.25rem,2.8vw+0.5rem,2.5rem)] font-black tracking-tight line-clamp-2 leading-tight sm:leading-snug md:leading-normal px-2 sm:px-4 ${palette.cardText}`}>
                    {catName}
                  </h3>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* VIEW 2: CHARTS LIST OR PREVIEW GRID INSIDE SELECTED CATEGORY - UNIFIED CONTAINER WITH CATEGORY HUE TINT */
        <div
          style={{
            backgroundColor: isDarkMode ? currentPalette.darkContainerBg : currentPalette.lightContainerBg,
            borderColor: isDarkMode ? currentPalette.darkContainerBorder : currentPalette.lightContainerBorder,
          }}
          className="rounded-lg md:rounded-xl border p-3 sm:p-4.5 shadow-2xs space-y-3 transition-colors"
        >
          {/* Top Bar Navigation (Back arrow -> Category Title & Edit -> PDF Count -> View Toggle & Trash) */}
          <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-200/60 dark:border-slate-800">
            <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 flex-wrap">
              {/* Back Arrow Button */}
              <button
                type="button"
                onClick={() => handleSetSelectedCategory(null)}
                className="p-1.5 text-slate-700 dark:text-slate-200 bg-white/90 dark:bg-slate-800 hover:bg-white dark:hover:bg-slate-700 border border-slate-200/90 dark:border-slate-700 rounded-md cursor-pointer active:scale-95 shadow-2xs shrink-0"
                title="Back to Categories"
              >
                <ChevronLeft className="w-5 h-5 stroke-[2.5]" />
              </button>

              {/* Category Title Badge + Edit Category Button */}
              <div className="flex items-center gap-2 bg-white/95 dark:bg-slate-800 border border-slate-200/90 dark:border-slate-700 px-2.5 py-1 rounded-md shadow-2xs shrink-0">
                <span 
                  className="w-2.5 h-2.5 rounded-full shrink-0 shadow-2xs" 
                  style={{ backgroundColor: currentPalette.dotHex }}
                />
                <h2 className="text-xs sm:text-sm font-black text-slate-900 dark:text-slate-100 truncate max-w-[110px] sm:max-w-[180px]">
                  {selectedCategory === 'ALL_SECTION_CHARTS' ? 'All Charts' : selectedCategory}
                </h2>
                {onOpenGenreManager && (
                  <button
                    type="button"
                    onClick={onOpenGenreManager}
                    className="p-0.5 rounded-xs text-slate-400 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer shrink-0"
                    title="Edit Category"
                  >
                    <FolderEdit className="w-3.5 h-3.5 stroke-[2]" />
                  </button>
                )}
              </div>

              {/* Subtle PDF Count Badge */}
              <div className="inline-flex items-center justify-center bg-white/80 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200/80 dark:border-slate-700 px-2 py-1 rounded-md text-xs font-mono font-bold shrink-0 min-w-[28px] text-center" title={`${filteredSongs.length} Charts`}>
                <span>{filteredSongs.length}</span>
              </div>
            </div>

            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              {/* View Toggle Button */}
              <button
                type="button"
                onClick={() => handleToggleDisplayMode(displayMode === 'list' ? 'grid' : 'list')}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-white/90 dark:bg-slate-800 hover:bg-white dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-black text-xs border border-slate-200/90 dark:border-slate-700 cursor-pointer active:scale-95 shadow-2xs whitespace-nowrap"
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

              {/* Trash Icon Button */}
              {onOpenTrash && (
                <button
                  type="button"
                  onClick={onOpenTrash}
                  className="p-1.5 rounded-md bg-white/90 dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-rose-950/60 text-slate-600 dark:text-slate-300 hover:text-rose-700 dark:hover:text-rose-300 border border-slate-200/90 dark:border-slate-700 hover:border-rose-200 dark:hover:border-rose-800 transition-colors cursor-pointer active:scale-95 shadow-2xs"
                  title="Open Trash"
                >
                  <Trash2 className="w-4 h-4 stroke-[2.2]" />
                </button>
              )}
            </div>
          </div>

          {/* List or Grid of Charts */}
          {sortedSongs.length === 0 ? (
            <div className="p-8 sm:p-10 text-center bg-slate-50/80 dark:bg-slate-850/80 rounded-lg border border-slate-200/60 dark:border-slate-800 space-y-3 shadow-2xs">
              <div className={`w-10 h-10 rounded-md mx-auto flex items-center justify-center border ${
                isTechnique
                  ? 'bg-purple-50 dark:bg-purple-950/60 border-purple-100 dark:border-purple-800 text-purple-900 dark:text-purple-300'
                  : 'bg-sky-50 dark:bg-sky-950/60 border-sky-100 dark:border-sky-800 text-[#0c4a6e] dark:text-sky-300'
              }`}>
                <Music className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-800 dark:text-slate-100">
                  No charts in this category
                </p>
                <p className="text-xs text-slate-400 dark:text-slate-400 mt-0.5">
                  Tap "+ Add Chart" below to import PDFs into this category.
                </p>
              </div>
              <button
                type="button"
                onClick={onAddChart || (() => handleSetSelectedCategory(null))}
                className={`mt-1 px-4 py-2 text-white text-xs font-black uppercase tracking-wider rounded-md cursor-pointer shadow-2xs active:scale-95 whitespace-nowrap ${
                  isTechnique
                    ? 'bg-purple-900 hover:bg-purple-950 dark:bg-purple-700 dark:hover:bg-purple-600'
                    : 'bg-[#0c4a6e] hover:bg-[#073652] dark:bg-sky-700 dark:hover:bg-sky-600'
                }`}
              >
                + Add Chart
              </button>
            </div>
          ) : displayMode === 'grid' ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-3.5 pt-1">
              {sortedSongs.map((song) => (
                <SongPreviewCard
                  key={song.id}
                  song={song}
                  isTechnique={isTechnique}
                  onSelectSong={onSelectSong}
                  onDeleteSong={onDeleteSong}
                  onEditSong={onEditSong}
                  onAddToSetlist={onAddToSetlist}
                />
              ))}
            </div>
          ) : (
            <div className="flex flex-col gap-2 pt-1">
              {sortedSongs.map((song) => (
                <SongRow
                  key={song.id}
                  song={song}
                  isTechnique={isTechnique}
                  onSelectSong={onSelectSong}
                  onDeleteSong={onDeleteSong}
                  onEditSong={onEditSong}
                  onAddToSetlist={onAddToSetlist}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

