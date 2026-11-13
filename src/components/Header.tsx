import React, { useState, useRef, useEffect } from 'react';
import { Music, Trash2, FolderEdit, Database, Sun, Moon, Plus, SlidersHorizontal, ChevronDown, LogIn, LogOut, Cloud, FileText, Upload } from 'lucide-react';
import { ActiveTab } from '../types';
import { auth, loginWithGoogle, logoutUser, subscribeToAuth } from '../lib/firebase';
import { User } from 'firebase/auth';

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
  const [isAddMenuOpen, setIsAddMenuOpen] = useState(false);
  const [user, setUser] = useState<User | null>(auth.currentUser);
  const menuRef = useRef<HTMLDivElement>(null);
  const addMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const unsub = subscribeToAuth((u) => setUser(u));
    return () => unsub();
  }, []);

  const isSetlists = activeTab === 'sheet_music_setlists';
  const isTrash = activeTab === 'trash';
  const isChordGen = activeTab === 'chord_gen';

  const subtitle = isChordGen
    ? 'Chord Chart Creator'
    : isSetlists
    ? 'Practice Setlists'
    : isTrash
    ? 'Trash Bin'
    : 'Sheet Music Directory';

  const headerBgClass = 'bg-[#FFFFFF] dark:bg-[#222226] border-slate-300 dark:border-[rgba(255,255,255,0.1)]';

  // Click Outside Listener to close menus
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
      if (addMenuRef.current && !addMenuRef.current.contains(event.target as Node)) {
        setIsAddMenuOpen(false);
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
          <div className="p-1.5 text-white rounded-xl shadow-xs transition-colors group-hover:scale-105 bg-[#2563EB] dark:bg-[#3B82F6]">
            <Music className="w-4 h-4 stroke-[2.5]" />
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-black uppercase tracking-wider leading-none text-slate-900 dark:text-[#F3F4F6]">
              GigSheet
            </h1>
            <p className="text-[9px] uppercase tracking-widest mt-0.5 font-extrabold text-[#2563EB] dark:text-[#3B82F6]">
              {subtitle}
            </p>
          </div>
        </div>

        {/* Consolidated Action Buttons */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Primary Action: Add Menu Popover (+ Button) */}
          <div className="relative" ref={addMenuRef}>
            <button
              type="button"
              onClick={() => setIsAddMenuOpen((prev) => !prev)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-black uppercase tracking-wider text-white bg-[#2563EB] hover:bg-blue-700 dark:bg-[#3B82F6] dark:hover:bg-blue-600 transition-all cursor-pointer active:scale-95 shadow-md"
              title="Add Chart or Chord Sheet"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span className="hidden sm:inline">Add</span>
              <ChevronDown className={`w-3 h-3 stroke-[2.5] transition-transform duration-200 ${isAddMenuOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Add Action Popover */}
            {isAddMenuOpen && (
              <div className="absolute right-0 mt-2 w-52 bg-white dark:bg-[#222226] border border-slate-300 dark:border-[rgba(255,255,255,0.1)] rounded-2xl shadow-xl py-1.5 z-50 animate-in fade-in zoom-in-95 duration-150">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddMenuOpen(false);
                    if (onAddPdf) onAddPdf();
                  }}
                  className="w-full px-3.5 py-2.5 text-left text-xs font-bold text-slate-800 dark:text-[#F3F4F6] hover:bg-slate-200/70 dark:hover:bg-[rgba(255,255,255,0.04)] flex items-center gap-2.5 transition-colors cursor-pointer"
                >
                  <Upload className="w-4 h-4 stroke-[2.2] text-[#2563EB] dark:text-[#3B82F6]" />
                  <span>Upload PDF / Charts</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsAddMenuOpen(false);
                    if (onSelectTab) onSelectTab('chord_gen');
                  }}
                  className="w-full px-3.5 py-2.5 text-left text-xs font-bold text-slate-800 dark:text-[#F3F4F6] hover:bg-slate-200/70 dark:hover:bg-[rgba(255,255,255,0.04)] flex items-center gap-2.5 transition-colors cursor-pointer border-t border-slate-200 dark:border-[rgba(255,255,255,0.06)]"
                >
                  <FileText className="w-4 h-4 stroke-[2.2] text-blue-500" />
                  <span>Create Chord Chart</span>
                </button>
              </div>
            )}
          </div>

          {/* Quick Action: Light / Dark Mode Toggle */}
          {onToggleDarkMode && (
            <button
              type="button"
              onClick={onToggleDarkMode}
              className="p-2 rounded-xl border border-slate-300 dark:border-[rgba(255,255,255,0.1)] transition-all cursor-pointer active:scale-95 bg-white hover:bg-slate-200/70 dark:bg-[#222226] dark:hover:bg-[rgba(255,255,255,0.04)] text-slate-700 dark:text-[#F3F4F6] shadow-xs"
              title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
              aria-label="Toggle theme"
            >
              {isDarkMode ? (
                <Sun className="w-4 h-4 stroke-[2.2] text-blue-400" />
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
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-bold transition-all cursor-pointer active:scale-95 ${
                isMenuOpen
                  ? 'bg-slate-200 dark:bg-zinc-700 border-slate-400 dark:border-slate-500 text-slate-900 dark:text-white'
                  : 'bg-white hover:bg-slate-200/70 dark:bg-[#222226] dark:hover:bg-[rgba(255,255,255,0.04)] border-slate-300 dark:border-[rgba(255,255,255,0.1)] text-slate-700 dark:text-[#F3F4F6] shadow-xs'
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
              <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-[#222226] border border-slate-300 dark:border-[rgba(255,255,255,0.1)] rounded-2xl shadow-xl py-1.5 z-50 animate-in fade-in zoom-in-95 duration-150">
                {/* Account Status Header */}
                <div className="px-3.5 py-2 border-b border-slate-200 dark:border-[rgba(255,255,255,0.08)] mb-1 space-y-0.5">
                  <div className="flex items-center gap-1.5 text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 dark:text-[#A0A0A0]">
                    <Cloud className="w-3 h-3 text-[#2563EB] dark:text-[#3B82F6]" />
                    <span>Cloud Storage Account</span>
                  </div>
                  <p className="text-xs font-bold text-slate-800 dark:text-[#F3F4F6] truncate">
                    {user?.email || (user?.isAnonymous ? 'Guest Account (Synced)' : 'Signed Out')}
                  </p>
                </div>

                {/* Google Auth Toggle Button */}
                {user && !user.isAnonymous ? (
                  <button
                    type="button"
                    onClick={async () => {
                      setIsMenuOpen(false);
                      await logoutUser();
                    }}
                    className="w-full px-3.5 py-2 text-left text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 flex items-center gap-2.5 transition-colors cursor-pointer"
                  >
                    <LogOut className="w-4 h-4 stroke-[2]" />
                    <span>Sign Out</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={async () => {
                      setIsMenuOpen(false);
                      try {
                        await loginWithGoogle();
                      } catch (err) {
                        console.warn('Google sign-in error:', err);
                      }
                    }}
                    className="w-full px-3.5 py-2 text-left text-xs font-extrabold text-[#2563EB] dark:text-[#3B82F6] hover:bg-slate-200/70 dark:hover:bg-[rgba(255,255,255,0.04)] flex items-center gap-2.5 transition-colors cursor-pointer"
                  >
                    <LogIn className="w-4 h-4 stroke-[2] text-[#2563EB] dark:text-[#3B82F6]" />
                    <span>Sign In with Google</span>
                  </button>
                )}

                <div className="my-1 border-t border-slate-200 dark:border-[rgba(255,255,255,0.08)]" />

                {onOpenCategoryManager && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsMenuOpen(false);
                      onOpenCategoryManager();
                    }}
                    className="w-full px-3.5 py-2 text-left text-xs font-bold text-slate-800 dark:text-[#F3F4F6] hover:bg-slate-200/70 dark:hover:bg-[rgba(255,255,255,0.04)] flex items-center gap-2.5 transition-colors cursor-pointer"
                  >
                    <FolderEdit className="w-4 h-4 stroke-[2] text-slate-500 dark:text-[#A0A0A0]" />
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
                    className="w-full px-3.5 py-2 text-left text-xs font-bold text-slate-800 dark:text-[#F3F4F6] hover:bg-slate-200/70 dark:hover:bg-[rgba(255,255,255,0.04)] flex items-center gap-2.5 transition-colors cursor-pointer"
                  >
                    <Database className="w-4 h-4 stroke-[2] text-slate-500 dark:text-[#A0A0A0]" />
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
                        : 'text-slate-800 dark:text-[#F3F4F6] hover:bg-slate-200/70 dark:hover:bg-[rgba(255,255,255,0.04)]'
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
