import React from 'react';
import { Music2, GraduationCap, ListMusic, Shuffle, FileEdit } from 'lucide-react';
import { ActiveTab } from '../types';

interface BottomNavProps {
  activeTab: ActiveTab;
  selectedCategory?: string | null;
  hasActiveViewer?: boolean;
  onSelectTab: (tab: ActiveTab) => void;
  onOpenCategoryManager?: () => void;
  onAddPdf?: () => void;
  onRandomizePdf?: () => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  onSelectTab,
  onRandomizePdf,
}) => {
  const isSheetMusicActive = activeTab === 'sheet_music';
  const isTechniqueActive = activeTab === 'technique';
  const isChordGenActive = activeTab === 'chord_gen';
  const isSetlistsActive = activeTab === 'sheet_music_setlists' || activeTab === 'technique_routines';

  return (
    <nav className="fixed bottom-0 inset-x-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200/80 dark:border-slate-800 shadow-lg select-none">
      <div className="max-w-xl mx-auto flex items-center justify-between h-16 px-2 sm:px-4 gap-1.5 sm:gap-2">
        {/* Slot 1: Sheet Music */}
        <button
          type="button"
          onClick={() => onSelectTab('sheet_music')}
          className={`flex-1 h-12 flex flex-col items-center justify-center rounded-xl transition-all cursor-pointer ${
            isSheetMusicActive
              ? 'bg-[#0c4a6e] dark:bg-sky-700 text-white font-black shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-[#0c4a6e] dark:hover:text-sky-300 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
          title="Sheet Music Directory"
          aria-label="Sheet Music"
        >
          <Music2 className={`w-4 h-4 sm:w-5 sm:h-5 ${isSheetMusicActive ? 'stroke-[2.5]' : 'stroke-2'}`} />
          <span className="text-[9px] font-bold uppercase tracking-wider mt-0.5 hidden sm:block">Charts</span>
        </button>

        {/* Slot 2: Technique */}
        <button
          type="button"
          onClick={() => onSelectTab('technique')}
          className={`flex-1 h-12 flex flex-col items-center justify-center rounded-xl transition-all cursor-pointer ${
            isTechniqueActive
              ? 'bg-purple-800 dark:bg-purple-700 text-white font-black shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-purple-700 dark:hover:text-purple-300 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
          title="Technique Directory"
          aria-label="Technique"
        >
          <GraduationCap className={`w-4 h-4 sm:w-5 sm:h-5 ${isTechniqueActive ? 'stroke-[2.5]' : 'stroke-2'}`} />
          <span className="text-[9px] font-bold uppercase tracking-wider mt-0.5 hidden sm:block">Tech</span>
        </button>

        {/* Slot 3: Randomize Button */}
        <button
          type="button"
          onClick={onRandomizePdf}
          className="flex-1 h-12 flex flex-col items-center justify-center rounded-xl transition-all cursor-pointer bg-sky-600 hover:bg-sky-700 dark:bg-sky-700 dark:hover:bg-sky-600 text-white shadow-xs active:scale-95"
          title="Pick Random Chart"
          aria-label="Pick Random Chart"
        >
          <Shuffle className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2.5]" />
          <span className="text-[9px] font-bold uppercase tracking-wider mt-0.5 hidden sm:block">Random</span>
        </button>

        {/* Slot 4: Chord Generator View */}
        <button
          type="button"
          onClick={() => onSelectTab('chord_gen')}
          className={`flex-1 h-12 flex flex-col items-center justify-center rounded-xl transition-all cursor-pointer ${
            isChordGenActive
              ? 'bg-amber-700 dark:bg-amber-600 text-white font-black shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-amber-700 dark:hover:text-amber-300 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
          title="Chord Chart Generator"
          aria-label="Chord Generator"
        >
          <FileEdit className={`w-4 h-4 sm:w-5 sm:h-5 ${isChordGenActive ? 'stroke-[2.5]' : 'stroke-2'}`} />
          <span className="text-[9px] font-bold uppercase tracking-wider mt-0.5 hidden sm:block">Chord Gen</span>
        </button>

        {/* Slot 5: Setlists */}
        <button
          type="button"
          onClick={() => onSelectTab('sheet_music_setlists')}
          className={`flex-1 h-12 flex flex-col items-center justify-center rounded-xl transition-all cursor-pointer ${
            isSetlistsActive
              ? 'bg-emerald-800 dark:bg-emerald-700 text-white font-black shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-emerald-800 dark:hover:text-emerald-300 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
          title="Practice Setlists"
          aria-label="Practice Setlists"
        >
          <ListMusic className={`w-4 h-4 sm:w-5 sm:h-5 ${isSetlistsActive ? 'stroke-[2.5]' : 'stroke-2'}`} />
          <span className="text-[9px] font-bold uppercase tracking-wider mt-0.5 hidden sm:block">Sets</span>
        </button>
      </div>
    </nav>
  );
};
