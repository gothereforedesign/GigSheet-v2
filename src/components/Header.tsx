import React from 'react';
import { Music, Trash2 } from 'lucide-react';
import { ActiveTab } from '../types';

interface HeaderProps {
  trashCount?: number;
  activeTab?: ActiveTab;
  onSelectTab?: (tab: ActiveTab) => void;
}

export const Header: React.FC<HeaderProps> = ({
  trashCount = 0,
  activeTab,
  onSelectTab,
}) => {
  const isTechnique = activeTab === 'technique';

  return (
    <header className="sticky top-0 z-20 bg-white/95 backdrop-blur-md border-b border-slate-200/80 px-4 py-3">
      <div className="max-w-4xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className={`p-1.5 text-white rounded-md shadow-2xs transition-colors ${
            isTechnique ? 'bg-purple-900' : 'bg-[#0c4a6e]'
          }`}>
            <Music className="w-4 h-4 stroke-[2.5]" />
          </div>
          <div>
            <h1 className={`text-base sm:text-lg font-black uppercase tracking-wider leading-none transition-colors ${
              isTechnique ? 'text-purple-900' : 'text-[#0c4a6e]'
            }`}>
              GigSheet
            </h1>
            <p className={`text-[9px] uppercase tracking-widest mt-0.5 transition-colors ${
              isTechnique ? 'text-purple-600 font-extrabold' : 'text-slate-400 font-bold'
            }`}>
              {isTechnique ? 'Technique Directory' : 'Sheet Music Directory'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onSelectTab && (
            <button
              type="button"
              onClick={() => onSelectTab(activeTab === 'trash' ? 'sheet_music' : 'trash')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md border text-xs font-bold transition-all cursor-pointer active:scale-95 ${
                activeTab === 'trash'
                  ? 'bg-rose-50 border-rose-300 text-rose-700 shadow-2xs'
                  : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-600 hover:text-slate-900'
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

