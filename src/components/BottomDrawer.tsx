import React, { useEffect } from 'react';
import { X } from 'lucide-react';

interface BottomDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  maxWidthClass?: string;
  closeDisabled?: boolean;
}

export const BottomDrawer: React.FC<BottomDrawerProps> = ({
  isOpen,
  onClose,
  title,
  children,
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
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/40 backdrop-blur-xs p-0 sm:p-4 transition-all">
      {/* Backdrop Click */}
      <div 
        className="absolute inset-0" 
        onClick={handleClose} 
        aria-hidden="true"
      />

      {/* Drawer Container */}
      <div 
        className={`relative w-full ${maxWidthClass} bg-white rounded-t-3xl sm:rounded-3xl p-5 pb-8 sm:p-6 shadow-2xl border-t sm:border border-slate-100 max-h-[88vh] overflow-y-auto z-10 transition-transform duration-300 animate-in slide-in-from-bottom`}
      >
        {/* Drawer Header */}
        <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-100">
          <h3 className="text-sm font-black uppercase tracking-wider text-[#0c4a6e]">
            {title}
          </h3>
          {!closeDisabled && (
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-slate-50 border border-slate-150 flex items-center justify-center text-slate-500 hover:text-slate-800 active:scale-95 cursor-pointer transition-all"
              aria-label="Close drawer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Drawer Body */}
        <div className="space-y-4">
          {children}
        </div>
      </div>
    </div>
  );
};
