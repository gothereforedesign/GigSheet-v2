import React, { useState, useRef, useEffect } from 'react';
import { Music, Trash2, FolderEdit, Database, Sun, Moon, Plus, SlidersHorizontal, ChevronDown } from 'lucide-react';
import { ActiveTab } from '../types';

interface HeaderProps {
  trashCount?: number;
  activeTab?: ActiveTab;
  isDarkMode?: boolean;
  onToggleDarkMode?: () => void;
  onSelectTab?: (tab: ActiveTab) => void;
  onOpenCategoryManager?: () => void;
  onOpenBackupModal?: () => void;
  onAddPdf?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  trashCount = 0,
  activeTab,
  isDarkMode = false,
  onToggleDarkMode,
  onSelectTab,
  onOpenCategoryManager,
  onOpenBackupModal,
  onAddPdf,
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const isTechnique = activeTab === 'technique';
  const isSetlists = activeTab === 'sheet_music_setlists' || activeTab === 'technique_routines';
  const isTrash = activeTab === 'trash';

  const subtitle = isSetlists
    ? (activeTab === 'technique_routines' ? 'Practice Routines' : 'Practice Setlists')
    : isTechnique
    ? 'Technique Directory'
    : isTrash
    ? 'Trash Bin'
    : 'Sheet Music Directory';

  const headerBgClass = isTrash
    ? 'bg-rose-50/90 dark:bg-[#1a090d]/95 border-rose-200/80 dark:border-rose-900/60'
    : isTechnique
    ? 'bg-purple-50/90 dark:bg-[#18092b]/95 border-purple-200/80 dark:border-purple-900/60'
    : isSetlists
    ? 'bg-emerald-50/90 dark:bg-[#042116]/95 border-emerald-200/80 dark:border-emerald-900/60'
    : 'bg-[#f0f7fc]/90 dark:bg-[#071d2c]/95 border-sky-200/80 dark:border-sky-900/60';

  // Click Outside Listener to close menu
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className={`sticky top-0 z-20 backdrop-blur-md border-b px-4 py-3 transition-colors ${headerBgClass}`}>
      <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
        {/* Brand Logo & Section Title */}
        <div
          onClick={() => {
            if (onSelectTab) {
              const rootTab = activeTab === 'trash' ? 'sheet_music' : (activeTab || 'sheet_music');
              onSelectTab(rootTab);
            }
          }}
          className="flex items-center gap-2.5 shrink-0 cursor-pointer group"
          title="Return to Homescreen"
        >
          <div className={`p-1.5 text-white rounded-md shadow-2xs transition-colors group-hover:scale-105 ${
            isTrash
              ? 'bg-rose-800 dark:bg-rose-700'
              : isSetlists
              ? 'bg-emerald-800 dark:bg-emerald-700 shadow-2xs'
              : isTechnique
              ? 'bg-purple-800 dark:bg-purple-700 text-white shadow-2xs'
              : 'bg-[#0c4a6e] dark:bg-sky-700'
          }`}>
            <Music className="w-4 h-4 stroke-[2.5]" />
          </div>
          <div>
            <h1 className={`text-base sm:text-lg font-black uppercase tracking-wider leading-none transition-colors ${
              isTrash
                ? 'text-rose-950 dark:text-rose-200'
                : isSetlists
                ? 'text-emerald-950 dark:text-emerald-200'
                : isTechnique
                ? 'text-purple-950 dark:text-purple-200'
                : 'text-[#0c4a6e] dark:text-sky-300'
            }`}>
              GigSheet
            </h1>
            <p className={`text-[9px] uppercase tracking-widest mt-0.5 transition-colors font-extrabold ${
              isTrash
                ? 'text-rose-700 dark:text-rose-400'
                : isSetlists
                ? 'text-emerald-700 dark:text-emerald-400'
                : isTechnique
                ? 'text-purple-700 dark:text-purple-400'
                : 'text-sky-700 dark:text-sky-400'
            }`}>
              {subtitle}
            </p>
          </div>
        </div>

        {/* Consolidated Action Buttons */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Primary Action: PDF Upload Button */}
          {onAddPdf && (
            <button
              type="button"
              onClick={onAddPdf}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider text-white transition-all cursor-pointer active:scale-95 shadow-sm ${
                isTechnique
                  ? 'bg-purple-800 hover:bg-purple-900 dark:bg-purple-700'
                  : isSetlists
                  ? 'bg-emerald-800 hover:bg-emerald-900 dark:bg-emerald-700'
                  : 'bg-[#0c4a6e] hover:bg-[#073652] dark:bg-sky-700'
              }`}
              title="Add New PDF Chart"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>PDF</span>
            </button>
          )}

          {/* Quick Action: Light / Dark Mode Toggle */}
          {onToggleDarkMode && (
            <button
              type="button"
              onClick={onToggleDarkMode}
              className="p-2 rounded-lg border border-slate-200/90 dark:border-slate-700 transition-all cursor-pointer active:scale-95 bg-white/80 hover:bg-white dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 shadow-2xs"
              title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
              aria-label="Toggle theme"
            >
              {isDarkMode ? (
                <Sun className="w-4 h-4 stroke-[2.2] text-sky-400" />
              ) : (
                <Moon className="w-4 h-4 stroke-[2.2] text-slate-600" />
              )}
            </button>
          )}

          {/* Consolidated Library Management Menu */}
          <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={() => setIsMenuOpen((prev) => !prev)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-bold transition-all cursor-pointer active:scale-95 ${
                isMenuOpen
                  ? 'bg-slate-200 dark:bg-slate-700 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white'
                  : 'bg-white/80 hover:bg-white dark:bg-slate-800 dark:hover:bg-slate-700 border-slate-200/90 dark:border-slate-700 text-slate-700 dark:text-slate-200 shadow-2xs'
              }`}
              title="Library Management Options"
            >
              <SlidersHorizontal className="w-4 h-4 stroke-[2.2]" />
              <span className="hidden sm:inline uppercase text-[10px] tracking-wider font-extrabold">
                Manage
              </span>
              {trashCount > 0 && (
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
              )}
              <ChevronDown className={`w-3 h-3 stroke-[2.5] transition-transform duration-200 ${isMenuOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Dropdown Menu Popover */}
            {isMenuOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl py-1.5 z-50 animate-in fade-in zoom-in-95 duration-150">
                {onOpenCategoryManager && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsMenuOpen(false);
                      onOpenCategoryManager();
                    }}
                    className="w-full px-3.5 py-2 text-left text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2.5 transition-colors cursor-pointer"
                  >
                    <FolderEdit className="w-4 h-4 stroke-[2] text-slate-500 dark:text-slate-400" />
                    <span>Edit Categories</span>
                  </button>
                )}

                {onOpenBackupModal && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsMenuOpen(false);
                      onOpenBackupModal();
                    }}
                    className="w-full px-3.5 py-2 text-left text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2.5 transition-colors cursor-pointer"
                  >
                    <Database className="w-4 h-4 stroke-[2] text-slate-500 dark:text-slate-400" />
                    <span>Backup & Transfer</span>
                  </button>
                )}

                {onSelectTab && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsMenuOpen(false);
                      onSelectTab(activeTab === 'trash' ? 'sheet_music' : 'trash');
                    }}
                    className={`w-full px-3.5 py-2 text-left text-xs font-bold flex items-center justify-between transition-colors cursor-pointer ${
                      activeTab === 'trash'
                        ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300'
                        : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Trash2 className="w-4 h-4 stroke-[2] text-rose-500 dark:text-rose-400" />
                      <span>Trash Bin</span>
                    </div>
                    {trashCount > 0 && (
                      <span className="px-1.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-rose-100 dark:bg-rose-900/80 text-rose-700 dark:text-rose-300">
                        {trashCount}
                      </span>
                    )}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
