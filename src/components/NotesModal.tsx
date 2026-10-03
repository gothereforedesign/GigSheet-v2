import React, { useEffect, useRef, useState } from 'react';
import { ArrowLeft, Bold, Check, X } from 'lucide-react';

interface NotesModalProps {
  isOpen: boolean;
  onClose: () => void;
  isDarkMode?: boolean;
}

const TITLE_STORAGE_KEY = 'gigsheet_user_notes_title';
const CONTENT_STORAGE_KEY = 'gigsheet_user_notes_content';

export const NotesModal: React.FC<NotesModalProps> = ({
  isOpen,
  onClose,
}) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const [title, setTitle] = useState('');
  const [isSaved, setIsSaved] = useState(false);
  const [isBoldActive, setIsBoldActive] = useState(false);

  // Load initial title and content when modal opens
  useEffect(() => {
    if (isOpen) {
      const savedTitle = localStorage.getItem(TITLE_STORAGE_KEY) || '';
      const savedHtml = localStorage.getItem(CONTENT_STORAGE_KEY) || '';
      setTitle(savedTitle);

      if (editorRef.current) {
        editorRef.current.innerHTML = savedHtml;
      }
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Handle Title Change
  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setTitle(val);
    localStorage.setItem(TITLE_STORAGE_KEY, val);
    triggerSaved();
  };

  // Handle Content Input
  const handleInput = () => {
    if (editorRef.current) {
      const html = editorRef.current.innerHTML;
      localStorage.setItem(CONTENT_STORAGE_KEY, html);
      triggerSaved();
    }
    checkSelectionState();
  };

  const triggerSaved = () => {
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 1500);
  };

  const checkSelectionState = () => {
    try {
      const isBold = document.queryCommandState('bold');
      setIsBoldActive(isBold);
    } catch {
      setIsBoldActive(false);
    }
  };

  const handleToggleBold = (e: React.MouseEvent) => {
    e.preventDefault();
    document.execCommand('bold', false);
    checkSelectionState();
    if (editorRef.current) {
      editorRef.current.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'b') {
      e.preventDefault();
      document.execCommand('bold', false);
      checkSelectionState();
    }
    if (e.key === 'Escape') {
      onClose();
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div 
        className="w-full sm:max-w-xl h-[85vh] sm:h-[620px] bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden transition-colors"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header Bar (Google Keep Style: Back Arrow + Save Status + Close) */}
        <div className="flex items-center justify-between px-3 py-2.5 border-b border-slate-100 dark:border-zinc-800/80 bg-white dark:bg-zinc-900 shrink-0 select-none">
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-700 dark:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer active:scale-95 flex items-center gap-1"
            title="Go Back & Save"
          >
            <ArrowLeft className="w-5 h-5 stroke-[2.2]" />
          </button>

          <div className="flex items-center gap-2">
            {isSaved ? (
              <span className="text-[10px] uppercase tracking-wider font-extrabold text-emerald-600 dark:text-emerald-400 flex items-center gap-1 animate-in fade-in duration-150">
                <Check className="w-3.5 h-3.5 stroke-[3]" />
                <span>Saved</span>
              </span>
            ) : (
              <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400 dark:text-zinc-500">
                Notes
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-500 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-zinc-100 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer active:scale-95"
            title="Close Notes"
          >
            <X className="w-5 h-5 stroke-[2.2]" />
          </button>
        </div>

        {/* Note Body Section */}
        <div className="flex-1 flex flex-col p-4 sm:p-5 overflow-y-auto">
          {/* Note Title Input - Slightly transparent so bold text in body stands out clearly */}
          <input
            type="text"
            value={title}
            onChange={handleTitleChange}
            placeholder="Title"
            className="w-full text-lg sm:text-xl font-medium text-slate-900/60 dark:text-zinc-100/65 focus:text-slate-900/80 focus:dark:text-zinc-100/80 placeholder:text-slate-400/70 dark:placeholder:text-zinc-600/70 bg-transparent border-none outline-none mb-3 transition-opacity"
          />

          {/* Note Content Area */}
          <div
            ref={editorRef}
            contentEditable
            onInput={handleInput}
            onKeyDown={handleKeyDown}
            onKeyUp={checkSelectionState}
            onMouseUp={checkSelectionState}
            className="w-full flex-1 outline-none text-sm sm:text-base text-slate-800 dark:text-zinc-200 leading-relaxed font-sans cursor-text select-text empty:before:content-[attr(data-placeholder)] empty:before:text-slate-400 empty:before:dark:text-zinc-600 empty:before:pointer-events-none min-h-[220px]"
            data-placeholder="Note"
            spellCheck="false"
          />
        </div>

        {/* Bottom Toolbar */}
        <div className="flex items-center justify-between px-3.5 py-2.5 border-t border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-950 shrink-0 select-none">
          <div className="flex items-center gap-1.5">
            {/* Bold Toggle Button */}
            <button
              type="button"
              onMouseDown={handleToggleBold}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer active:scale-95 flex items-center gap-1.5 ${
                isBoldActive
                  ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 shadow-xs'
                  : 'bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-slate-700 dark:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-700'
              }`}
              title="Toggle Bold (Cmd+B / Ctrl+B)"
            >
              <Bold className="w-4 h-4 stroke-[3]" />
              <span>Bold</span>
            </button>
          </div>

          <div className="text-[10px] font-mono text-slate-400 dark:text-zinc-500 font-medium">
            GigSheet Notes
          </div>
        </div>
      </div>
    </div>
  );
};
