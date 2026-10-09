import React, { useEffect, useRef, useState } from 'react';
import { ArrowLeft, Bold, Check, Copy, Highlighter, Cloud } from 'lucide-react';
import { auth } from '../lib/firebase';
import { subscribeUserNotes, saveUserNotesToFirestore } from '../lib/firestoreService';

interface NotesModalProps {
  isOpen: boolean;
  onClose: () => void;
  isDarkMode?: boolean;
}

export const NotesModal: React.FC<NotesModalProps> = ({
  isOpen,
  onClose,
}) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const [title, setTitle] = useState('');
  const [isSaved, setIsSaved] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [isBoldActive, setIsBoldActive] = useState(false);
  const [isHighlightActive, setIsHighlightActive] = useState(false);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Subscribe to real-time Cloud Firestore Notes when modal opens
  useEffect(() => {
    if (!isOpen) return;

    const userId = auth.currentUser?.uid;
    if (!userId) return;

    const unsubscribe = subscribeUserNotes(userId, (notes) => {
      setTitle(notes.title || '');
      if (editorRef.current && editorRef.current.innerHTML !== notes.content) {
        editorRef.current.innerHTML = notes.content || '';
      }
    });

    return () => unsubscribe();
  }, [isOpen]);

  if (!isOpen) return null;

  const persistNotesToCloud = (newTitle: string, newContent: string) => {
    const userId = auth.currentUser?.uid;
    if (!userId) return;

    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(async () => {
      try {
        await saveUserNotesToFirestore(userId, newTitle, newContent);
        triggerSaved();
      } catch (err) {
        console.warn('Failed to save notes to Firestore:', err);
      }
    }, 400);
  };

  // Handle Title Change
  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setTitle(val);
    const content = editorRef.current?.innerHTML || '';
    persistNotesToCloud(val, content);
  };

  // Handle Content Input
  const handleInput = () => {
    if (editorRef.current) {
      const html = editorRef.current.innerHTML;
      persistNotesToCloud(title, html);
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

      const sel = window.getSelection();
      let hasHighlight = false;

      // Check queryCommandValue for hiliteColor / backColor
      try {
        const hiliteVal = document.queryCommandValue('hiliteColor');
        const backVal = document.queryCommandValue('backColor');
        const val = hiliteVal || backVal;
        if (val && val !== 'transparent' && val !== 'rgba(0, 0, 0, 0)' && val !== 'initial' && val !== 'inherit') {
          hasHighlight = true;
        }
      } catch {}

      if (!hasHighlight && sel && sel.rangeCount > 0 && editorRef.current) {
        let node: Node | null = sel.anchorNode;
        if (node && node.nodeType === Node.TEXT_NODE) {
          node = node.parentNode;
        }
        while (node && node instanceof HTMLElement && editorRef.current.contains(node) && node !== editorRef.current) {
          const isMarkTag = node.tagName.toLowerCase() === 'mark';
          const inlineBg = node.style.backgroundColor;
          if (isMarkTag || (inlineBg && inlineBg !== 'transparent' && inlineBg !== 'rgba(0, 0, 0, 0)')) {
            hasHighlight = true;
            break;
          }
          node = node.parentNode;
        }
      }
      setIsHighlightActive(hasHighlight);
    } catch {
      setIsBoldActive(false);
      setIsHighlightActive(false);
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

  const applyHighlightColor = (color: string) => {
    let ok = false;
    try {
      ok = document.execCommand('hiliteColor', false, color);
    } catch {}
    if (!ok) {
      try {
        ok = document.execCommand('backColor', false, color);
      } catch {}
    }
    return ok;
  };

  const handleToggleHighlight = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!editorRef.current) return;
    editorRef.current.focus();

    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;

    const lightGray = '#e2e8f0';

    // Find if current selection or cursor is inside an existing highlight element
    let highlightedNode: HTMLElement | null = null;
    let node: Node | null = sel.anchorNode;
    if (node && node.nodeType === Node.TEXT_NODE) {
      node = node.parentNode;
    }
    while (node && node instanceof HTMLElement && editorRef.current.contains(node) && node !== editorRef.current) {
      const isMarkTag = node.tagName.toLowerCase() === 'mark';
      const inlineBg = node.style.backgroundColor;
      if (isMarkTag || (inlineBg && inlineBg !== 'transparent' && inlineBg !== 'rgba(0, 0, 0, 0)')) {
        highlightedNode = node;
        break;
      }
      node = node.parentNode;
    }

    if (isHighlightActive || highlightedNode) {
      // Remove highlight
      applyHighlightColor('transparent');
      if (highlightedNode) {
        if (highlightedNode.tagName.toLowerCase() === 'mark') {
          const parent = highlightedNode.parentNode;
          while (highlightedNode.firstChild) {
            parent?.insertBefore(highlightedNode.firstChild, highlightedNode);
          }
          parent?.removeChild(highlightedNode);
        } else {
          highlightedNode.style.backgroundColor = 'transparent';
        }
      }
    } else {
      // Apply light gray highlight
      const applied = applyHighlightColor(lightGray);
      if (!applied && !sel.isCollapsed) {
        const range = sel.getRangeAt(0);
        const mark = document.createElement('mark');
        mark.style.backgroundColor = '#e2e8f0';
        mark.style.color = '#0f172a';
        mark.style.borderRadius = '3px';
        mark.style.padding = '0 3px';
        try {
          range.surroundContents(mark);
        } catch {
          const contents = range.extractContents();
          mark.appendChild(contents);
          range.insertNode(mark);
        }
      }
    }

    checkSelectionState();
    handleInput();
  };

  const handleCopyAllText = async (e: React.MouseEvent) => {
    e.preventDefault();
    try {
      const rawContent = editorRef.current?.innerText || editorRef.current?.textContent || '';
      const fullText = [title.trim(), rawContent.trim()].filter(Boolean).join('\n\n');
      await navigator.clipboard.writeText(fullText);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy notes text:', err);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'b') {
      e.preventDefault();
      document.execCommand('bold', false);
      checkSelectionState();
    }
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'h') {
      e.preventDefault();
      handleToggleHighlight(e as any);
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
        {/* Top Header Bar (Google Keep Style: Back Arrow + Save Status) */}
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

          <div className="w-9" />
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
          <div className="flex items-center gap-2">
            {/* Bold Toggle Button */}
            <button
              type="button"
              onMouseDown={handleToggleBold}
              className={`p-2 rounded-lg text-xs font-black transition-all cursor-pointer active:scale-95 flex items-center justify-center ${
                isBoldActive
                  ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 shadow-xs'
                  : 'bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-slate-700 dark:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-700'
              }`}
              title="Toggle Bold (Cmd+B / Ctrl+B)"
            >
              <Bold className="w-4 h-4 stroke-[3]" />
            </button>

            {/* Highlight Toggle Button */}
            <button
              type="button"
              onMouseDown={(e) => handleToggleHighlight(e)}
              className={`p-2 rounded-lg text-xs font-black transition-all cursor-pointer active:scale-95 flex items-center justify-center ${
                isHighlightActive
                  ? 'bg-slate-300 text-slate-900 dark:bg-zinc-600 dark:text-zinc-100 shadow-xs border border-slate-400 dark:border-zinc-500'
                  : 'bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-slate-700 dark:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-700'
              }`}
              title="Toggle Light Gray Highlight (Cmd+H / Ctrl+H)"
            >
              <Highlighter className={`w-4 h-4 ${isHighlightActive ? 'stroke-[2.5] text-slate-900 dark:text-zinc-100' : 'stroke-[2]'}`} />
            </button>

            {/* Copy Entire Notes Text Button */}
            <button
              type="button"
              onClick={handleCopyAllText}
              className="p-2 rounded-lg text-xs font-bold transition-all cursor-pointer active:scale-95 flex items-center justify-center bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-slate-700 dark:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-700"
              title="Copy entire text from notes"
            >
              {isCopied ? (
                <Check className="w-4 h-4 stroke-[2.5] text-emerald-600 dark:text-emerald-400" />
              ) : (
                <Copy className="w-4 h-4 stroke-[2]" />
              )}
            </button>
          </div>

          <div className="text-[10px] font-mono text-slate-400 dark:text-zinc-500 font-medium hidden sm:block">
            GigSheet Notes
          </div>
        </div>
      </div>
    </div>
  );
};
