import React from 'react';
import { Music2, ListMusic, GraduationCap, Flame, Plus } from 'lucide-react';
import { ActiveTab } from '../types';

interface BottomNavProps {
  activeTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
  onOpenCategoryManager?: () => void;
  onAddPdf?: () => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  onSelectTab,
  onAddPdf,
}) => {
  const isSheetMusicSection = activeTab === 'sheet_music' || activeTab === 'sheet_music_setlists';
  const isSetlistsActive = activeTab === 'sheet_music_setlists';
  const isTechniqueSection = activeTab === 'technique' || activeTab === 'technique_routines';
  const isRoutinesActive = activeTab === 'technique_routines';

  const handleSheetClick = () => {
    if (activeTab === 'sheet_music') {
      // 2nd tap: switch to setlists category ("hidden section")
      onSelectTab('sheet_music_setlists');
    } else if (activeTab === 'sheet_music_setlists') {
      // 3rd tap: cycle back to original sheet music
      onSelectTab('sheet_music');
    } else {
      // 1st tap: navigate to sheet music section
      onSelectTab('sheet_music');
    }
  };

  const handleTechClick = () => {
    if (activeTab === 'technique') {
      // 2nd tap: switch to routines category ("hidden section")
      onSelectTab('technique_routines');
    } else if (activeTab === 'technique_routines') {
      // 3rd tap: cycle back to original technique
      onSelectTab('technique');
    } else {
      // 1st tap: navigate to technique section
      onSelectTab('technique');
    }
  };

  return (
    <nav className="fixed bottom-0 inset-x-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200/80 dark:border-slate-800 shadow-lg select-none">
      <div className="max-w-md mx-auto flex items-center justify-between h-16 px-4 gap-2">
        {/* 1. Sheet Music / Setlist Tab Button */}
        <button
          type="button"
          onClick={handleSheetClick}
          className={`flex-1 flex flex-col items-center justify-center py-2 px-3 rounded-2xl transition-all cursor-pointer ${
            isSheetMusicSection
              ? 'text-[#0c4a6e] dark:text-sky-300 font-black bg-sky-50/80 dark:bg-sky-950/80'
              : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60'
          }`}
        >
          <div className="flex flex-col items-center">
            {isSetlistsActive ? (
              <ListMusic className="w-5 h-5 stroke-[2.5]" />
            ) : (
              <Music2 className={`w-5 h-5 ${isSheetMusicSection ? 'stroke-[2.5]' : 'stroke-2'}`} />
            )}
            <span className="text-[10px] tracking-wider font-extrabold uppercase mt-0.5 truncate">
              {isSetlistsActive ? 'Setlists' : 'Music'}
            </span>
          </div>
        </button>

        {/* 2. Center Action: Add PDF Chart */}
        <button
          type="button"
          onClick={onAddPdf}
          className={`p-3 rounded-2xl text-white transition-all cursor-pointer active:scale-95 shadow-md flex items-center justify-center shrink-0 mx-1 ${
            isTechniqueSection
              ? 'bg-purple-900 hover:bg-purple-950 dark:bg-purple-700 dark:hover:bg-purple-600 shadow-purple-900/20'
              : 'bg-[#0c4a6e] hover:bg-[#073652] dark:bg-sky-700 dark:hover:bg-sky-600 shadow-sky-900/20'
          }`}
          title="Add PDF Chart"
        >
          <Plus className="w-6 h-6 stroke-[2.5]" />
        </button>

        {/* 3. Technique / Routines Tab Button */}
        <button
          type="button"
          onClick={handleTechClick}
          className={`flex-1 flex flex-col items-center justify-center py-2 px-3 rounded-2xl transition-all cursor-pointer ${
            isTechniqueSection
              ? 'text-purple-900 dark:text-purple-300 font-black bg-purple-50/80 dark:bg-purple-950/80'
              : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60'
          }`}
        >
          <div className="flex flex-col items-center">
            {isRoutinesActive ? (
              <Flame className="w-5 h-5 stroke-[2.5]" />
            ) : (
              <GraduationCap className={`w-5 h-5 ${isTechniqueSection ? 'stroke-[2.5]' : 'stroke-2'}`} />
            )}
            <span className="text-[10px] tracking-wider font-extrabold uppercase mt-0.5 truncate">
              {isRoutinesActive ? 'Routines' : 'Technique'}
            </span>
          </div>
        </button>
      </div>
    </nav>
  );
};
