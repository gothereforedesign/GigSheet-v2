import React from 'react';
import { Music2, GraduationCap, ListMusic, Shuffle, FileText } from 'lucide-react';
import { ActiveTab } from '../types';

interface BottomNavProps {
  activeTab: ActiveTab;
  selectedCategory?: string | null;
  hasActiveViewer?: boolean;
  isNotesOpen?: boolean;
  onSelectTab: (tab: ActiveTab) => void;
  onOpenCategoryManager?: () => void;
  onAddPdf?: () => void;
  onRandomizePdf?: () => void;
  onToggleNotes?: () => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  isNotesOpen = false,
  onSelectTab,
  onRandomizePdf,
  onToggleNotes,
}) => {
  const isSheetMusicActive = activeTab === 'sheet_music';
  const isTechniqueActive = activeTab === 'technique';
  const isSetlistsActive = activeTab === 'sheet_music_setlists' || activeTab === 'technique_routines';

  const handleSheetMusicClick = () => {
    onSelectTab('sheet_music');
  };

  const handleTechniqueClick = () => {
    onSelectTab('technique');
  };

  const handleSetlistsClick = () => {
    onSelectTab('sheet_music_setlists');
  };

  return (
    <nav className="fixed bottom-0 inset-x-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200/80 dark:border-slate-800 shadow-lg select-none">
      <div className="max-w-md mx-auto flex items-center justify-between h-16 px-3 gap-2">
        {/* LEFT SECTION (1fr): Section 1 - Sheets (Blue Sheet Music Note & Purple Graduation Cap icon buttons) */}
        <div className="flex-1 grid grid-cols-2 gap-1.5 bg-slate-100/90 dark:bg-slate-800/70 p-1.5 rounded-2xl border border-slate-200/70 dark:border-slate-700/70 h-[48px]">
          {/* Blue Button: Sheet Music Note Icon */}
          <button
            type="button"
            onClick={handleSheetMusicClick}
            className={`flex items-center justify-center rounded-xl transition-all cursor-pointer ${
              isSheetMusicActive
                ? 'bg-[#0c4a6e] dark:bg-sky-700 text-white font-black shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-[#0c4a6e] dark:hover:text-sky-300 hover:bg-white/60 dark:hover:bg-slate-700/60'
            }`}
            title="Sheet Music Directory"
            aria-label="Sheet Music"
          >
            <Music2 className={`w-5 h-5 ${isSheetMusicActive ? 'stroke-[2.5]' : 'stroke-2'}`} />
          </button>

          {/* Purple Button: Graduation Cap Icon */}
          <button
            type="button"
            onClick={handleTechniqueClick}
            className={`flex items-center justify-center rounded-xl transition-all cursor-pointer ${
              isTechniqueActive
                ? 'bg-purple-800 dark:bg-purple-700 text-white font-black shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-purple-700 dark:hover:text-purple-300 hover:bg-white/60 dark:hover:bg-slate-700/60'
            }`}
            title="Technique Directory"
            aria-label="Technique"
          >
            <GraduationCap className={`w-5 h-5 ${isTechniqueActive ? 'stroke-[2.5]' : 'stroke-2'}`} />
          </button>
        </div>

        {/* CENTER ACTION: Randomizer Button */}
        <button
          type="button"
          onClick={onRandomizePdf}
          className={`p-3 rounded-2xl text-white transition-all cursor-pointer active:scale-95 shadow-md flex items-center justify-center shrink-0 mx-0.5 ${
            isTechniqueActive
              ? 'bg-purple-800 hover:bg-purple-900 dark:bg-purple-700 dark:hover:bg-purple-600 text-white shadow-purple-900/20'
              : isSetlistsActive
              ? 'bg-emerald-800 hover:bg-emerald-900 dark:bg-emerald-700 dark:hover:bg-emerald-600 text-white shadow-emerald-900/20'
              : 'bg-[#0c4a6e] hover:bg-[#073652] dark:bg-sky-700 dark:hover:bg-sky-600 shadow-sky-900/20'
          }`}
          title="Pick Random Chart"
          aria-label="Pick Random Chart"
        >
          <Shuffle className="w-5 h-5 stroke-[2.5]" />
        </button>

        {/* RIGHT SECTION (1fr): Section 2 - Practice Setlists & Notes Icon Buttons */}
        <div className="flex-1 grid grid-cols-2 gap-1.5 bg-slate-100/90 dark:bg-slate-800/70 p-1.5 rounded-2xl border border-slate-200/70 dark:border-slate-700/70 h-[48px]">
          {/* Emerald Green Button: Practice Setlists Icon */}
          <button
            type="button"
            onClick={handleSetlistsClick}
            className={`flex items-center justify-center rounded-xl transition-all cursor-pointer ${
              isSetlistsActive
                ? 'bg-emerald-800 dark:bg-emerald-700 text-white font-black shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-emerald-800 dark:hover:text-emerald-300 hover:bg-white/60 dark:hover:bg-slate-700/60'
            }`}
            title="Practice Setlists"
            aria-label="Practice Setlists"
          >
            <ListMusic className={`w-5 h-5 ${isSetlistsActive ? 'stroke-[2.5]' : 'stroke-2'}`} />
          </button>

          {/* Notes Feature Button to the Right of Setlists Button */}
          <button
            type="button"
            onClick={onToggleNotes}
            className={`flex items-center justify-center rounded-xl transition-all cursor-pointer ${
              isNotesOpen
                ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 font-black shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-white/60 dark:hover:bg-slate-700/60'
            }`}
            title="Notes"
            aria-label="Notes"
          >
            <FileText className={`w-5 h-5 ${isNotesOpen ? 'stroke-[2.5]' : 'stroke-2'}`} />
          </button>
        </div>
      </div>
    </nav>
  );
};
