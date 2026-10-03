import React, { useEffect } from 'react';
import { X } from 'lucide-react';

interface BottomDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  section?: 'sheet_music' | 'technique' | 'trash' | 'setlist';
  maxWidthClass?: string;
  closeDisabled?: boolean;
}

export const BottomDrawer: React.FC<BottomDrawerProps> = ({
  isOpen,
  onClose,
  title,
  children,
  section = 'sheet_music',
  maxWidthClass = 'max-w-md',
  closeDisabled = false,
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !closeDisabled) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, closeDisabled]);

  if (!isOpen) return null;

  const handleClose = () => {
    if (!closeDisabled) {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-slate-950/50 backdrop-blur-xs p-3 sm:p-4 pt-4 sm:pt-8 md:pt-12 transition-all">
      {/* Backdrop Click */}
      <div 
        className="absolute inset-0" 
        onClick={handleClose} 
        aria-hidden="true"
      />

      {/* Drawer Container */}
      <div 
        className={`relative w-full ${maxWidthClass} bg-white dark:bg-slate-900 rounded-2xl p-5 pb-6 sm:p-6 shadow-2xl border border-slate-200/90 dark:border-slate-800 max-h-[85vh] overflow-y-auto z-10 animate-in fade-in zoom-in-95 duration-150`}
      >
        {/* Drawer Header */}
        <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-100 dark:border-slate-800">
          <h3 className={`text-sm font-black uppercase tracking-wider ${
            section === 'technique'
              ? 'text-purple-900 dark:text-purple-300'
              : section === 'setlist'
              ? 'text-zinc-900 dark:text-zinc-100'
              : section === 'trash'
              ? 'text-rose-900 dark:text-rose-300'
              : 'text-[#0c4a6e] dark:text-sky-300'
          }`}>
            {title}
          </h3>
          {!closeDisabled && (
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 active:scale-95 cursor-pointer transition-all"
              aria-label="Close drawer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Drawer Body */}
        <div className="space-y-4 text-slate-900 dark:text-slate-100">
          {children}
        </div>
      </div>
    </div>
  );
};
