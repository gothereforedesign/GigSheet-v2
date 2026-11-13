import React from 'react';
import { Music2, ListMusic, Shuffle } from 'lucide-react';
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
  const isSetlistsActive = activeTab === 'sheet_music_setlists';

  return (
    <nav className="fixed bottom-0 inset-x-0 z-30 bg-white/95 dark:bg-[#222226]/95 backdrop-blur-md border-t border-slate-300 dark:border-[rgba(255,255,255,0.1)] shadow-lg select-none">
      <div className="max-w-md mx-auto flex items-center justify-between h-16 px-4 gap-3">
        {/* Left Toggle: Sheet Music */}
        <button
          type="button"
          onClick={() => onSelectTab('sheet_music')}
          className={`flex-1 h-12 flex items-center justify-center gap-2 rounded-2xl transition-all cursor-pointer font-black text-xs uppercase tracking-wider ${
            isSheetMusicActive
              ? 'bg-[#2563EB] dark:bg-[#3B82F6] text-white shadow-md'
              : 'text-slate-600 dark:text-[#A0A0A0] hover:bg-slate-200/70 dark:hover:bg-[rgba(255,255,255,0.04)]'
          }`}
          title="Sheet Music Directory"
          aria-label="Sheet Music"
        >
          <Music2 className="w-4 h-4 stroke-[2.5]" />
          <span>Sheet Music</span>
        </button>

        {/* Center Standalone Action: Randomize */}
        <button
          type="button"
          onClick={onRandomizePdf}
          className="w-12 h-12 flex items-center justify-center rounded-2xl bg-[#2563EB] hover:bg-blue-700 dark:bg-[#3B82F6] dark:hover:bg-blue-600 text-white shadow-lg transition-all cursor-pointer active:scale-95 shrink-0"
          title="Pick Random Chart"
          aria-label="Pick Random Chart"
        >
          <Shuffle className="w-5 h-5 stroke-[2.5]" />
        </button>

        {/* Right Toggle: Setlists */}
        <button
          type="button"
          onClick={() => onSelectTab('sheet_music_setlists')}
          className={`flex-1 h-12 flex items-center justify-center gap-2 rounded-2xl transition-all cursor-pointer font-black text-xs uppercase tracking-wider ${
            isSetlistsActive
              ? 'bg-[#2563EB] dark:bg-[#3B82F6] text-white shadow-md'
              : 'text-slate-600 dark:text-[#A0A0A0] hover:bg-slate-200/70 dark:hover:bg-[rgba(255,255,255,0.04)]'
          }`}
          title="Practice Setlists"
          aria-label="Practice Setlists"
        >
          <ListMusic className="w-4 h-4 stroke-[2.5]" />
          <span>Setlists</span>
        </button>
      </div>
    </nav>
  );
};
