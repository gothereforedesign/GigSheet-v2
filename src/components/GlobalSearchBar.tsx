import React, { useState, useRef, useEffect } from 'react';
import { Search, X, Music, GraduationCap, ListMusic, FileText } from 'lucide-react';
import { Song, Setlist } from '../types';

interface GlobalSearchBarProps {
  allSongs: Song[];
  setlists?: Setlist[];
  onSelectSong: (song: Song) => void;
  isDarkMode?: boolean;
}

export const GlobalSearchBar: React.FC<GlobalSearchBarProps> = ({
  allSongs,
  setlists = [],
  onSelectSong,
  isDarkMode = false,
}) => {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Filter non-deleted songs across the entire app
  const activeSongs = allSongs.filter((s) => !s.deletedAt && !s.isSetlistDuplicate && !s.setlistId);

  const trimmedQuery = query.trim().toLowerCase();

  const matchingSongs = trimmedQuery
    ? activeSongs.filter((song) => {
        const titleMatch = song.title.toLowerCase().includes(trimmedQuery);
        const artistMatch = song.artist ? song.artist.toLowerCase().includes(trimmedQuery) : false;
        const genreMatch = song.genre ? song.genre.toLowerCase().includes(trimmedQuery) : false;
        const notesMatch = song.lyrics ? song.lyrics.toLowerCase().includes(trimmedQuery) : false;
        return titleMatch || artistMatch || genreMatch || notesMatch;
      }).sort((a, b) => a.title.localeCompare(b.title, undefined, { numeric: true, sensitivity: 'base' }))
    : [];

  // Close overlay on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleClear = () => {
    setQuery('');
    setIsOpen(false);
  };

  const handleSelectResult = (song: Song) => {
    onSelectSong(song);
    handleClear();
  };

  return (
    <>
      {/* Backdrop overlay when search is active to keep search visible above keyboard & page content */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-xs transition-opacity animate-in fade-in duration-150"
          onClick={() => setIsOpen(false)}
        />
      )}

      <div
        ref={containerRef}
        className={`fixed bottom-[68px] inset-x-0 pointer-events-none px-3 select-none transition-all duration-200 ${
          isOpen ? 'z-50' : 'z-20'
        }`}
      >
        <div className="max-w-md mx-auto relative pointer-events-auto">
          {/* Floating Results Popover Panel */}
          {isOpen && trimmedQuery.length > 0 && (
            <div className="absolute bottom-[52px] inset-x-0 max-h-[60vh] sm:max-h-80 overflow-y-auto bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200/90 dark:border-slate-800 rounded-2xl shadow-2xl p-2 z-50 space-y-1 animate-in fade-in slide-in-from-bottom-2 duration-150">
              <div className="px-2.5 py-1 flex items-center justify-between text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500 border-b border-slate-100 dark:border-zinc-800/80 mb-1">
                <span>Search Results ({matchingSongs.length})</span>
                <span>All App PDFs</span>
              </div>

              {matchingSongs.length === 0 ? (
                <div className="p-6 text-center text-slate-400 dark:text-zinc-500 text-xs font-medium space-y-1">
                  <p className="font-bold">No matching PDFs found</p>
                  <p className="text-[10px] text-slate-400/80">Try searching for a song title or composer.</p>
                </div>
              ) : (
                matchingSongs.map((song) => {
                  const isTech = song.section === 'technique';
                  const sectionBadgeClass = isTech
                    ? 'bg-purple-100 dark:bg-purple-950/80 text-purple-800 dark:text-purple-300 border-purple-300 dark:border-purple-800'
                    : 'bg-sky-100 dark:bg-sky-950/80 text-[#0c4a6e] dark:text-sky-300 border-sky-300 dark:border-sky-800';

                  return (
                    <div
                      key={song.id}
                      onClick={() => handleSelectResult(song)}
                      className="p-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800/90 cursor-pointer flex items-center justify-between gap-2.5 transition-colors group border border-transparent hover:border-slate-200 dark:hover:border-slate-700"
                    >
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <div className={`p-1.5 rounded-lg shrink-0 ${
                          isTech ? 'bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300' : 'bg-sky-100 dark:bg-sky-950 text-[#0c4a6e] dark:text-sky-300'
                        }`}>
                          {isTech ? <GraduationCap className="w-4 h-4 stroke-[2]" /> : <Music className="w-4 h-4 stroke-[2]" />}
                        </div>

                        <div className="min-w-0 flex-1">
                          <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate group-hover:text-blue-600 dark:group-hover:text-sky-400">
                            {song.title}
                          </h4>
                          {song.artist && (
                            <p className="text-[10px] font-medium text-slate-400 dark:text-zinc-400 truncate -mt-0.5">
                              {song.artist}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {/* Section badge only - category name on right cut per user request */}
                        <span className={`text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-xs border ${sectionBadgeClass}`}>
                          {isTech ? 'Technique' : 'Sheet Music'}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* Search Bar Input Container */}
          <div className={`bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border rounded-full shadow-lg h-10 px-3.5 flex items-center gap-2 transition-all ${
            isOpen
              ? 'border-sky-500 dark:border-sky-400 ring-2 ring-sky-500/20 shadow-xl'
              : 'border-slate-200/90 dark:border-slate-800'
          }`}>
            <Search className="w-4 h-4 text-slate-400 dark:text-zinc-500 shrink-0 stroke-[2.2]" />

            <input
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setIsOpen(true);
              }}
              onFocus={() => setIsOpen(true)}
              placeholder="Search all PDFs in app..."
              className="flex-1 bg-transparent border-none outline-none text-xs font-bold text-slate-800 dark:text-zinc-100 placeholder:text-slate-400/80 dark:placeholder:text-zinc-500"
            />

            {query.length > 0 && (
              <button
                type="button"
                onClick={handleClear}
                className="p-1 rounded-full text-slate-400 hover:text-slate-700 dark:text-zinc-400 dark:hover:text-zinc-100 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer active:scale-95 transition-all shrink-0"
                title="Clear search"
              >
                <X className="w-3.5 h-3.5 stroke-[2.5]" />
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
};
