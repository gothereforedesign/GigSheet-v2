import React, { useState } from 'react';
import { Plus, Edit3, Trash2, Check, X, ChevronUp, ChevronDown, Music, GraduationCap, ListMusic } from 'lucide-react';
import { Song, Setlist } from '../types';

interface CategoryManagerModalProps {
  section: 'sheet_music' | 'technique';
  isSetlistMode?: boolean;
  categories: string[];
  sheetMusicCategories?: string[];
  techniqueCategories?: string[];
  setlists?: Setlist[];
  categoryColors?: Record<string, any>;
  songs: Song[];
  onAddCategory: (newCategory: string, color?: any, targetSection?: 'sheet_music' | 'technique' | 'setlists') => void;
  onRenameCategory: (oldCategory: string, newCategory: string, targetSection?: 'sheet_music' | 'technique' | 'setlists') => Promise<void> | void;
  onReorderCategories?: (reordered: string[], targetSection?: 'sheet_music' | 'technique' | 'setlists') => void;
  onUpdateCategoryColor?: (category: string, color: any) => void;
  onDeleteCategory: (categoryToDelete: string, targetSection?: 'sheet_music' | 'technique' | 'setlists') => Promise<void> | void;
  onClose: () => void;
}

export const CategoryManagerModal: React.FC<CategoryManagerModalProps> = ({
  section: initialSection,
  isSetlistMode = false,
  categories: initialCategories,
  sheetMusicCategories = [],
  techniqueCategories = [],
  setlists = [],
  songs = [],
  onAddCategory,
  onRenameCategory,
  onReorderCategories,
  onDeleteCategory,
  onClose,
}) => {
  // Modal section view tab state: 'sheet_music' | 'technique' | 'setlists'
  const [activeTabSection, setActiveTabSection] = useState<'sheet_music' | 'technique' | 'setlists'>(() => {
    if (isSetlistMode) return 'setlists';
    return initialSection === 'technique' ? 'technique' : 'sheet_music';
  });

  const isSetlistsTab = activeTabSection === 'setlists';
  const isTechniqueTab = activeTabSection === 'technique';
  const isSheetMusicTab = activeTabSection === 'sheet_music';

  // Extract unique categories from songs for the active section if not in setlists tab
  const activeCategories: string[] = React.useMemo(() => {
    if (isSetlistsTab) {
      return setlists.map((s) => s.name);
    }
    
    const baseList = isTechniqueTab
      ? (techniqueCategories.length > 0 ? techniqueCategories : initialCategories)
      : (sheetMusicCategories.length > 0 ? sheetMusicCategories : initialCategories);

    // Extract any unique categories present in NON-DELETED songs for this section
    const songsCategories = songs
      .filter((s) => {
        if (s.deletedAt) return false;
        if (isTechniqueTab) return s.section === 'technique';
        return s.section !== 'technique';
      })
      .map((s) => (s.genre || '').trim())
      .filter(Boolean) as string[];

    const normalizedMap = new Map<string, string>();
    baseList.forEach((c) => {
      const trimmed = c.trim();
      if (trimmed) normalizedMap.set(trimmed.toLowerCase(), trimmed);
    });
    songsCategories.forEach((c) => {
      if (c && !normalizedMap.has(c.toLowerCase())) {
        normalizedMap.set(c.toLowerCase(), c);
      }
    });

    return Array.from(normalizedMap.values());
  }, [isSetlistsTab, isTechniqueTab, setlists, techniqueCategories, sheetMusicCategories, initialCategories, songs]);

  const sectionLabel = isSetlistsTab
    ? 'Practice Setlists'
    : isTechniqueTab
    ? 'Technique Categories'
    : 'Sheet Music Categories';

  const singularLabel = isSetlistsTab ? 'setlist' : 'category';

  const [newCategoryInput, setNewCategoryInput] = useState('');
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Calculate chart count per category or setlist
  const getCategoryCount = (categoryName: string) => {
    if (isSetlistsTab) {
      const match = setlists.find((s) => s.name === categoryName);
      return match ? match.items.length : 0;
    }
    return songs.filter((s) => {
      if (s.deletedAt) return false;
      if (isTechniqueTab && s.section !== 'technique') return false;
      if (!isTechniqueTab && s.section === 'technique') return false;
      const cat = (s.genre || (isTechniqueTab ? 'Scales' : 'Hymns')).trim();
      return cat.toLowerCase() === categoryName.trim().toLowerCase();
    }).length;
  };

  const handleAdd = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = newCategoryInput.trim();
    if (!trimmed) return;

    if (activeCategories.some((g) => g.toLowerCase() === trimmed.toLowerCase())) {
      setErrorMsg(`"${trimmed}" already exists.`);
      return;
    }

    onAddCategory(trimmed, undefined, activeTabSection);
    setNewCategoryInput('');
    setErrorMsg(null);
  };

  const handleStartRename = (category: string) => {
    setEditingCategory(category);
    setEditingText(category);
    setErrorMsg(null);
  };

  const handleSaveRename = async (oldCategory: string) => {
    const trimmed = editingText.trim();
    if (!trimmed) {
      setErrorMsg(`${singularLabel} name cannot be empty.`);
      return;
    }

    if (trimmed === oldCategory) {
      setEditingCategory(null);
      return;
    }

    if (activeCategories.some((g) => g.toLowerCase() === trimmed.toLowerCase() && g !== oldCategory)) {
      setErrorMsg(`"${trimmed}" already exists.`);
      return;
    }

    setIsProcessing(true);
    setErrorMsg(null);
    try {
      await onRenameCategory(oldCategory, trimmed, activeTabSection);
      setEditingCategory(null);
    } catch (err: any) {
      console.error('Failed to rename:', err);
      setErrorMsg(`Failed to update ${singularLabel} name.`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleMoveUp = (index: number) => {
    if (index <= 0 || !onReorderCategories) return;
    const reordered = [...activeCategories];
    const temp = reordered[index - 1];
    reordered[index - 1] = reordered[index];
    reordered[index] = temp;
    onReorderCategories(reordered, activeTabSection);
  };

  const handleMoveDown = (index: number) => {
    if (index >= activeCategories.length - 1 || !onReorderCategories) return;
    const reordered = [...activeCategories];
    const temp = reordered[index + 1];
    reordered[index + 1] = reordered[index];
    reordered[index] = temp;
    onReorderCategories(reordered, activeTabSection);
  };

  const handleDelete = async (category: string) => {
    const count = getCategoryCount(category);
    if (count > 0) {
      const confirmMsg = isSetlistsTab
        ? `Delete "${category}"? It contains ${count} ${count === 1 ? 'chart' : 'charts'}.`
        : `Delete "${category}"? ${count} ${count === 1 ? 'chart' : 'charts'} will be moved to Trash.`;
      if (!window.confirm(confirmMsg)) {
        return;
      }
    }

    setIsProcessing(true);
    setErrorMsg(null);
    try {
      await onDeleteCategory(category, activeTabSection);
      if (editingCategory === category) {
        setEditingCategory(null);
      }
    } catch (err: any) {
      console.error('Failed to delete:', err);
      setErrorMsg(`Failed to delete ${singularLabel}.`);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-4 select-none">
      {/* SECTION TABS FOR ALL THREE SECTIONS */}
      <div className="flex items-center justify-between gap-1 p-1 bg-slate-100 dark:bg-zinc-800/90 rounded-xl border border-slate-200 dark:border-zinc-700/80">
        <button
          type="button"
          onClick={() => {
            setActiveTabSection('sheet_music');
            setErrorMsg(null);
            setEditingCategory(null);
          }}
          className={`flex-1 py-2 px-2 rounded-lg text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
            isSheetMusicTab
              ? 'bg-[#0c4a6e] dark:bg-sky-700 text-white shadow-xs'
              : 'text-slate-600 dark:text-zinc-400 hover:text-[#0c4a6e] dark:hover:text-sky-300'
          }`}
        >
          <Music className="w-3.5 h-3.5 stroke-[2.5]" />
          <span className="truncate">Sheet Music</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTabSection('technique');
            setErrorMsg(null);
            setEditingCategory(null);
          }}
          className={`flex-1 py-2 px-2 rounded-lg text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
            isTechniqueTab
              ? 'bg-purple-800 dark:bg-purple-700 text-white shadow-xs'
              : 'text-slate-600 dark:text-zinc-400 hover:text-purple-700 dark:hover:text-purple-300'
          }`}
        >
          <GraduationCap className="w-3.5 h-3.5 stroke-[2.5]" />
          <span className="truncate">Technique</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTabSection('setlists');
            setErrorMsg(null);
            setEditingCategory(null);
          }}
          className={`flex-1 py-2 px-2 rounded-lg text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
            isSetlistsTab
              ? 'bg-emerald-800 dark:bg-emerald-700 text-white shadow-xs'
              : 'text-slate-600 dark:text-zinc-400 hover:text-emerald-700 dark:hover:text-emerald-300'
          }`}
        >
          <ListMusic className="w-3.5 h-3.5 stroke-[2.5]" />
          <span className="truncate">Set Lists</span>
        </button>
      </div>

      {/* Header - Item count */}
      <div className="border-b border-slate-200 dark:border-zinc-800 pb-2.5 flex items-center justify-between">
        <h2 className="text-sm font-black text-slate-900 dark:text-zinc-100 tracking-tight">
          {sectionLabel}
        </h2>
        <span className="text-xs font-mono font-bold text-slate-500 dark:text-zinc-400">
          {activeCategories.length} {activeCategories.length === 1 ? 'Item' : 'Items'}
        </span>
      </div>

      {errorMsg && (
        <div className="p-2.5 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800/80 rounded-xl text-xs font-bold text-rose-700 dark:text-rose-300">
          {errorMsg}
        </div>
      )}

      {/* Add New Category Form */}
      <form onSubmit={handleAdd} className="flex items-center gap-2">
        <input
          type="text"
          value={newCategoryInput}
          onChange={(e) => setNewCategoryInput(e.target.value)}
          placeholder={`Add new ${singularLabel}...`}
          className="flex-1 px-3.5 py-2.5 bg-slate-100 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700/80 rounded-xl text-xs sm:text-sm font-bold text-slate-900 dark:text-zinc-100 focus:outline-none focus:border-zinc-500 placeholder:text-slate-400 dark:placeholder:text-zinc-500 shadow-2xs"
        />
        <button
          type="submit"
          disabled={!newCategoryInput.trim() || isProcessing}
          className={`px-4 py-2.5 rounded-xl font-extrabold text-xs uppercase tracking-wider cursor-pointer flex items-center gap-1.5 shrink-0 active:scale-95 disabled:opacity-40 transition-all shadow-md text-white ${
            isTechniqueTab
              ? 'bg-purple-800 hover:bg-purple-900 dark:bg-purple-700'
              : isSetlistsTab
              ? 'bg-emerald-800 hover:bg-emerald-900 dark:bg-emerald-700'
              : 'bg-[#0c4a6e] hover:bg-[#073652] dark:bg-sky-700'
          }`}
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>Add</span>
        </button>
      </form>

      {/* Reorder & Edit List */}
      <div className="max-h-[320px] overflow-y-auto space-y-2 pr-1 no-scrollbar">
        {activeCategories.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400 dark:text-zinc-500 border border-dashed border-slate-200 dark:border-zinc-800 rounded-xl font-medium">
            No {singularLabel}s added yet. Type a name above to create one.
          </div>
        ) : (
          activeCategories.map((cat, index) => {
            const isEditing = editingCategory === cat;
            const count = getCategoryCount(cat);

            return (
              <div
                key={cat}
                tabIndex={0}
                onKeyDown={(e) => {
                  if ((e.key === 'Delete' || e.key === 'Backspace') && !isEditing) {
                    e.preventDefault();
                    e.stopPropagation();
                    handleDelete(cat);
                  }
                }}
                className="p-3 sm:p-3.5 rounded-xl border border-slate-200 dark:border-zinc-800/90 bg-slate-50 dark:bg-zinc-900/90 flex items-center justify-between gap-3 shadow-2xs hover:border-slate-300 dark:hover:border-zinc-700 focus:outline-none focus:ring-2 focus:ring-zinc-400 transition-all"
              >
                {isEditing ? (
                  <div className="flex items-center gap-2 w-full">
                    <input
                      type="text"
                      value={editingText}
                      onChange={(e) => setEditingText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSaveRename(cat);
                        if (e.key === 'Escape') setEditingCategory(null);
                      }}
                      autoFocus
                      className="flex-1 px-3 py-1.5 bg-white dark:bg-zinc-950 border border-zinc-400 dark:border-zinc-500 rounded-lg text-xs sm:text-sm font-bold text-slate-900 dark:text-zinc-100 outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => handleSaveRename(cat)}
                      disabled={isProcessing}
                      className="p-2 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-lg cursor-pointer active:scale-95 transition-all shadow-xs"
                      title="Save name"
                    >
                      <Check className="w-4 h-4 stroke-[2.5]" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingCategory(null)}
                      disabled={isProcessing}
                      className="p-2 bg-slate-200 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 rounded-lg cursor-pointer active:scale-95 transition-all"
                      title="Cancel"
                    >
                      <X className="w-4 h-4 stroke-[2.5]" />
                    </button>
                  </div>
                ) : (
                  <>
                    {/* Left Side: Order Arrows + Name + Count */}
                    <div className="flex items-center gap-2.5 min-w-0">
                      {onReorderCategories && activeCategories.length > 1 && (
                        <div className="flex items-center bg-slate-200/80 dark:bg-zinc-800 rounded-lg p-0.5 border border-slate-300/60 dark:border-zinc-700/80 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleMoveUp(index)}
                            disabled={index === 0 || isProcessing}
                            className="p-1.5 text-slate-600 dark:text-zinc-300 hover:text-slate-900 dark:hover:text-white disabled:opacity-20 rounded-md cursor-pointer transition-colors"
                            title="Move Up"
                          >
                            <ChevronUp className="w-4 h-4 stroke-[2.5]" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleMoveDown(index)}
                            disabled={index === activeCategories.length - 1 || isProcessing}
                            className="p-1.5 text-slate-600 dark:text-zinc-300 hover:text-slate-900 dark:hover:text-white disabled:opacity-20 rounded-md cursor-pointer transition-colors"
                            title="Move Down"
                          >
                            <ChevronDown className="w-4 h-4 stroke-[2.5]" />
                          </button>
                        </div>
                      )}

                      <span className="text-xs sm:text-sm font-black text-slate-900 dark:text-zinc-100 truncate">
                        {cat}
                      </span>

                      <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-slate-200/80 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 border border-slate-300/60 dark:border-zinc-700/80 shrink-0">
                        {count} {count === 1 ? 'chart' : 'charts'}
                      </span>
                    </div>

                    {/* Right Side: Rename & Delete Action Buttons */}
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleStartRename(cat)}
                        disabled={isProcessing}
                        className="p-2 rounded-lg text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/70 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                        title="Rename"
                      >
                        <Edit3 className="w-4 h-4 stroke-[2]" />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDelete(cat)}
                        disabled={isProcessing}
                        className="p-2 rounded-lg text-slate-400 dark:text-zinc-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4 stroke-[2]" />
                      </button>
                    </div>
                  </>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Footer controls */}
      <div className="flex items-center justify-end border-t border-slate-200 dark:border-zinc-800 pt-3">
        <button
          type="button"
          onClick={onClose}
          className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider cursor-pointer active:scale-95 shadow-md transition-all ${
            isTechniqueTab
              ? 'bg-purple-800 hover:bg-purple-900 dark:bg-purple-700 dark:hover:bg-purple-600 text-white'
              : isSetlistsTab
              ? 'bg-emerald-800 hover:bg-emerald-900 dark:bg-emerald-700 dark:hover:bg-emerald-600 text-white'
              : 'bg-[#0c4a6e] hover:bg-[#073652] dark:bg-sky-700 dark:hover:bg-sky-600 text-white'
          }`}
        >
          Done
        </button>
      </div>
    </div>
  );
};
