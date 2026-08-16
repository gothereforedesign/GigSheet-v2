import React from 'react';
import { Music2, GraduationCap, Plus } from 'lucide-react';
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
  const isSheetMusicActive = activeTab === 'sheet_music';
  const isTechniqueActive = activeTab === 'technique';

  return (
    <nav className="fixed bottom-0 inset-x-0 z-30 bg-white/95 backdrop-blur-md border-t border-slate-200/80 shadow-lg">
      <div className="max-w-md mx-auto flex items-center justify-between h-16 px-3 gap-1">
        {/* Left: Sheet Music Tab */}
        <button
          type="button"
          onClick={() => onSelectTab('sheet_music')}
          className={`flex-1 flex flex-col items-center justify-center py-1 transition-all cursor-pointer active:scale-95 ${
            isSheetMusicActive ? 'text-[#0c4a6e] font-black' : 'text-slate-400 hover:text-slate-600 font-semibold'
          }`}
        >
          <Music2 className={`w-5 h-5 ${isSheetMusicActive ? 'stroke-[2.5px]' : 'stroke-2'}`} />
          <span className="text-[10px] tracking-wider font-bold uppercase mt-1">
            Sheet Music
          </span>
        </button>

        {/* Center Action: Add PDF */}
        <button
          type="button"
          onClick={onAddPdf}
          className={`p-2.5 rounded-2xl text-white transition-all cursor-pointer active:scale-95 shadow-md flex items-center justify-center shrink-0 ${
            isTechniqueActive
              ? 'bg-purple-900 hover:bg-purple-950'
              : 'bg-[#0c4a6e] hover:bg-[#073652]'
          }`}
          title="Add PDF Chart"
        >
          <Plus className="w-5 h-5 stroke-[2.5]" />
        </button>

        {/* Right: Technique Tab */}
        <button
          type="button"
          onClick={() => onSelectTab('technique')}
          className={`flex-1 flex flex-col items-center justify-center py-1 transition-all cursor-pointer active:scale-95 ${
            isTechniqueActive ? 'text-purple-900 font-black' : 'text-slate-400 hover:text-slate-600 font-semibold'
          }`}
        >
          <GraduationCap className={`w-5 h-5 ${isTechniqueActive ? 'stroke-[2.5px]' : 'stroke-2'}`} />
          <span className="text-[10px] tracking-wider font-bold uppercase mt-1">
            Technique
          </span>
        </button>
      </div>
    </nav>
  );
};
