import React from 'react';
import { Music, Trash2, FolderEdit, Database, Sun, Moon } from 'lucide-react';
import { ActiveTab } from '../types';

interface HeaderProps {
  trashCount?: number;
  activeTab?: ActiveTab;
  isDarkMode?: boolean;
  onToggleDarkMode?: () => void;
  onSelectTab?: (tab: ActiveTab) => void;
  onOpenCategoryManager?: () => void;
  onOpenBackupModal?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  trashCount = 0,
  activeTab,
  isDarkMode = false,
  onToggleDarkMode,
  onSelectTab,
  onOpenCategoryManager,
  onOpenBackupModal,
}) => {
  const isTechnique = activeTab === 'technique' || activeTab === 'technique_routines';

  return (
    <header className="sticky top-0 z-20 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800/80 px-4 py-3 transition-colors">
      <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
        <div className="flex items-center gap-2.5 shrink-0">
          <div className={`p-1.5 text-white rounded-md shadow-2xs transition-colors ${
            isTechnique ? 'bg-purple-900 dark:bg-purple-700' : 'bg-[#0c4a6e] dark:bg-sky-700'
          }`}>
            <Music className="w-4 h-4 stroke-[2.5]" />
          </div>
          <div>
            <h1 className={`text-base sm:text-lg font-black uppercase tracking-wider leading-none transition-colors ${
              isTechnique ? 'text-purple-900 dark:text-purple-300' : 'text-[#0c4a6e] dark:text-sky-300'
            }`}>
              GigSheet
            </h1>
            <p className={`text-[9px] uppercase tracking-widest mt-0.5 transition-colors ${
              isTechnique ? 'text-purple-600 dark:text-purple-400 font-extrabold' : 'text-slate-400 dark:text-slate-400 font-bold'
            }`}>
              {isTechnique ? 'Technique Directory' : 'Sheet Music Directory'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {onToggleDarkMode && (
            <button
              type="button"
              onClick={onToggleDarkMode}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-slate-200/90 dark:border-slate-700 text-xs font-bold transition-all cursor-pointer active:scale-95 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 shadow-2xs"
              title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
            >
              {isDarkMode ? (
                <Sun className="w-4 h-4 stroke-[2.2] text-amber-400" />
              ) : (
                <Moon className="w-4 h-4 stroke-[2.2] text-slate-600" />
              )}
              <span className="hidden sm:inline uppercase text-[10px] tracking-wider">
                {isDarkMode ? 'Light' : 'Dark'}
              </span>
            </button>
          )}

          {onOpenBackupModal && (
            <button
              type="button"
              onClick={onOpenBackupModal}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-slate-200/90 dark:border-slate-700 text-xs font-bold transition-all cursor-pointer active:scale-95 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 hover:text-slate-900 dark:text-slate-200 dark:hover:text-white shadow-2xs"
              title="Backup & Transfer Library"
            >
              <Database className="w-4 h-4 stroke-[2.2] text-[#0c4a6e] dark:text-sky-400" />
              <span className="hidden sm:inline uppercase text-[10px] tracking-wider">
                Backup
              </span>
            </button>
          )}

          {onOpenCategoryManager && (
            <button
              type="button"
              onClick={onOpenCategoryManager}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-slate-200/90 dark:border-slate-700 text-xs font-bold transition-all cursor-pointer active:scale-95 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 hover:text-slate-900 dark:text-slate-200 dark:hover:text-white shadow-2xs"
              title="Edit Categories"
            >
              <FolderEdit className="w-4 h-4 stroke-[2.2] text-slate-600 dark:text-slate-300" />
              <span className="hidden sm:inline uppercase text-[10px] tracking-wider">
                Edit
              </span>
            </button>
          )}

          {onSelectTab && (
            <button
              type="button"
              onClick={() => onSelectTab(activeTab === 'trash' ? 'sheet_music' : 'trash')}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 sm:px-3 sm:py-1.5 rounded-md border text-xs font-bold transition-all cursor-pointer active:scale-95 ${
                activeTab === 'trash'
                  ? 'bg-rose-50 dark:bg-rose-950/60 border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-300 shadow-2xs'
                  : 'bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 border-slate-200 dark:border-slate-700 text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white'
              }`}
              title="Open Trash Bin"
            >
              <Trash2 className="w-4 h-4 stroke-[2.2]" />
              <span className="hidden sm:inline uppercase text-[10px] tracking-wider">
                Trash {trashCount > 0 && `(${trashCount})`}
              </span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};


