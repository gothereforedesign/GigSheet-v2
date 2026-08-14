import React, { useState } from 'react';
import { Music, Trash2, Download, Smartphone, Share, X } from 'lucide-react';
import { ActiveTab } from '../types';
import { usePWAInstall } from '../hooks/usePWAInstall';

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
  const { isInstallable, isIOS, isStandalone, triggerInstall } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  const handleInstallClick = () => {
    if (isInstallable) {
      triggerInstall();
    } else if (isIOS && !isStandalone) {
      setShowIOSGuide(true);
    }
  };

  return (
    <header className="sticky top-0 z-20 bg-white/95 backdrop-blur-md border-b border-slate-200/80 px-4 py-3">
      <div className="max-w-4xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className={`p-1.5 text-white rounded-xl shadow-2xs transition-colors ${
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
          {/* PWA Install Button */}
          {!isStandalone && (isInstallable || isIOS) && (
            <button
              type="button"
              onClick={handleInstallClick}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-700 active:scale-95 text-white text-xs font-black shadow-2xs transition-all cursor-pointer"
              title="Install GigSheet as Standalone Mobile App"
            >
              <Download className="w-3.5 h-3.5 stroke-[2.5]" />
              <span className="uppercase text-[10px] tracking-wider">
                Install App
              </span>
            </button>
          )}

          {onSelectTab && (
            <button
              type="button"
              onClick={() => onSelectTab(activeTab === 'trash' ? 'sheet_music' : 'trash')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer active:scale-95 ${
                activeTab === 'trash'
                  ? 'bg-rose-50 border-rose-300 text-rose-700 shadow-2xs'
                  : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-600 hover:text-slate-900'
              }`}
              title="Open Trash Bin"
            >
              <Trash2 className="w-4 h-4 stroke-[2.2]" />
              <span className="hidden sm:inline uppercase text-[10px] tracking-wider">
                Trash
              </span>
            </button>
          )}
        </div>
      </div>

      {/* iOS Installation Instruction Modal */}
      {showIOSGuide && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-slate-100 space-y-4 text-slate-800">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Smartphone className="w-5 h-5 text-sky-700" />
                <h3 className="font-extrabold text-sm uppercase text-sky-950">Install GigSheet</h3>
              </div>
              <button
                onClick={() => setShowIOSGuide(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-600 font-medium leading-relaxed">
              To install GigSheet as a standalone app on your iPhone or iPad home screen:
            </p>

            <ol className="text-xs space-y-2.5 font-bold text-slate-700 bg-slate-50 p-3 rounded-xl border border-slate-200/80">
              <li className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-sky-100 text-sky-800 flex items-center justify-center text-[10px] shrink-0 font-extrabold">1</span>
                <span>Tap the <Share className="w-3.5 h-3.5 inline text-sky-600 mx-0.5" /> <strong>Share</strong> button in Safari toolbar</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-sky-100 text-sky-800 flex items-center justify-center text-[10px] shrink-0 font-extrabold">2</span>
                <span>Scroll down and tap <strong>Add to Home Screen</strong></span>
              </li>
              <li className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-sky-100 text-sky-800 flex items-center justify-center text-[10px] shrink-0 font-extrabold">3</span>
                <span>Tap <strong>Add</strong> in the top right corner</span>
              </li>
            </ol>

            <button
              onClick={() => setShowIOSGuide(false)}
              className="w-full py-2.5 bg-[#0c4a6e] hover:bg-sky-900 text-white rounded-xl text-xs font-black uppercase tracking-wider cursor-pointer"
            >
              Got It
            </button>
          </div>
        </div>
      )}
    </header>
  );
};

