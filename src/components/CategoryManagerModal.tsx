import React, { useState } from 'react';
import { Plus, Edit3, Trash2, Check, X, ChevronUp, ChevronDown, Music, ListMusic } from 'lucide-react';
import { Song, Setlist } from '../types';

interface CategoryManagerModalProps {
  section: 'sheet_music';
  isSetlistMode?: boolean;
  categories: string[];
  sheetMusicCategories?: string[];
  setlists?: Setlist[];
  categoryColors?: Record<string, any>;
  songs: Song[];
  onAddCategory: (newCategory: string, color?: any, targetSection?: 'sheet_music' | 'setlists') => void;
  onRenameCategory: (oldCategory: string, newCategory: string, targetSection?: 'sheet_music' | 'setlists') => Promise<void> | void;
  onReorderCategories?: (reordered: string[], targetSection?: 'sheet_music' | 'setlists') => void;
  onUpdateCategoryColor?: (category: string, color: any) => void;
  onDeleteCategory: (categoryToDelete: string, targetSection?: 'sheet_music' | 'setlists') => Promise<void> | void;
  onClose: () => void;
}

export const CategoryManagerModal: React.FC<CategoryManagerModalProps> = ({
  isSetlistMode = false,
  categories: initialCategories,
  sheetMusicCategories = [],
  setlists = [],
  songs = [],
  onAddCategory,
  onRenameCategory,
  onReorderCategories,
  onDeleteCategory,
  onClose,
}) => {
  const [activeTabSection, setActiveTabSection] = useState<'sheet_music' | 'setlists'>(() => {
    if (isSetlistMode) return 'setlists';
    return 'sheet_music';
  });

  const isSetlistsTab = activeTabSection === 'setlists';
  const isSheetMusicTab = activeTabSection === 'sheet_music';

  const activeCategories: string[] = React.useMemo(() => {
    if (isSetlistsTab) {
      return setlists.map((s) => s.name);
    }
    
    const baseList = sheetMusicCategories.length > 0 ? sheetMusicCategories : initialCategories;

    const songsCategories = songs
      .filter((s) => !s.deletedAt)
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
  }, [isSetlistsTab, setlists, sheetMusicCategories, initialCategories, songs]);

  const sectionLabel = isSetlistsTab ? 'Practice Setlists' : 'Sheet Music Categories';
  const singularLabel = isSetlistsTab ? 'setlist' : 'category';

  const [newCategoryInput, setNewCategoryInput] = useState('');
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');
  const [confirmDeleteCat, setConfirmDeleteCat] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const getCategoryCount = (categoryName: string) => {
    if (isSetlistsTab) {
      const match = setlists.find((s) => s.name === categoryName);
      if (!match) return 0;
      return match.items.filter((item) => {
        const found = songs.find((s) => s.id === item.songId);
        return found && !found.deletedAt;
      }).length;
    }
    const defaultCat = 'Hymns';
    return songs.filter((s) => {
      if (s.deletedAt || s.isSetlistDuplicate || s.setlistId) return false;
      const sCat = (s.genre || defaultCat).trim().toLowerCase();
      return sCat === categoryName.trim().toLowerCase();
    }).length;
  };

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newCategoryInput.trim();
    if (!trimmed) return;

    if (activeCategories.some((c) => c.toLowerCase() === trimmed.toLowerCase())) {
      setErrorMsg(`A ${singularLabel} named "${trimmed}" already exists.`);
      return;
    }

    setErrorMsg(null);
    onAddCategory(trimmed, undefined, activeTabSection);
    setNewCategoryInput('');
  };

  const handleStartEdit = (cat: string) => {
    setEditingCategory(cat);
    setEditingText(cat);
    setErrorMsg(null);
  };

  const handleSaveEdit = async (oldCat: string) => {
    const trimmed = editingText.trim();
    if (!trimmed) return;

    if (trimmed.toLowerCase() !== oldCat.toLowerCase() && activeCategories.some((c) => c.toLowerCase() === trimmed.toLowerCase())) {
      setErrorMsg(`A ${singularLabel} named "${trimmed}" already exists.`);
      return;
    }

    setIsProcessing(true);
    setErrorMsg(null);
    try {
      await onRenameCategory(oldCat, trimmed, activeTabSection);
      setEditingCategory(null);
      setEditingText('');
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to rename.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDelete = async (cat: string) => {
    setIsProcessing(true);
    setErrorMsg(null);
    try {
      await onDeleteCategory(cat, activeTabSection);
      setConfirmDeleteCat(null);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to delete.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleMove = (index: number, direction: 'up' | 'down') => {
    if (onReorderCategories) {
      const newIndex = direction === 'up' ? index - 1 : index + 1;
      if (newIndex < 0 || newIndex >= activeCategories.length) return;
      const copy = [...activeCategories];
      const [removed] = copy.splice(index, 1);
      copy.splice(newIndex, 0, removed);
      onReorderCategories(copy, activeTabSection);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white dark:bg-[#222226] border border-slate-300 dark:border-[rgba(255,255,255,0.1)] rounded-3xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 dark:border-[rgba(255,255,255,0.08)] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-[#2563EB] dark:bg-[#3B82F6] text-white rounded-xl shadow-xs">
              {isSetlistsTab ? <ListMusic className="w-4 h-4 stroke-[2.2]" /> : <Music className="w-4 h-4 stroke-[2.2]" />}
            </div>
            <h2 className="text-sm font-black uppercase tracking-wider text-slate-900 dark:text-[#F3F4F6]">
              {sectionLabel}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="grid grid-cols-2 p-2 bg-slate-100 dark:bg-black border-b border-slate-200 dark:border-[rgba(255,255,255,0.08)] gap-1">
          <button
            type="button"
            onClick={() => { setActiveTabSection('sheet_music'); setEditingCategory(null); setErrorMsg(null); }}
            className={`py-2 px-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              isSheetMusicTab
                ? 'bg-white dark:bg-[#222226] text-[#2563EB] dark:text-[#3B82F6] shadow-xs'
                : 'text-slate-600 dark:text-[#A0A0A0] hover:text-slate-900'
            }`}
          >
            <Music className="w-3.5 h-3.5 stroke-[2.2]" />
            <span>Categories</span>
          </button>

          <button
            type="button"
            onClick={() => { setActiveTabSection('setlists'); setEditingCategory(null); setErrorMsg(null); }}
            className={`py-2 px-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              isSetlistsTab
                ? 'bg-white dark:bg-[#222226] text-[#2563EB] dark:text-[#3B82F6] shadow-xs'
                : 'text-slate-600 dark:text-[#A0A0A0] hover:text-slate-900'
            }`}
          >
            <ListMusic className="w-3.5 h-3.5 stroke-[2.2]" />
            <span>Setlists</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 space-y-4 overflow-y-auto flex-1">
          {errorMsg && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200 text-xs font-bold rounded-xl">
              {errorMsg}
            </div>
          )}

          {/* Add Form */}
          <form onSubmit={handleAdd} className="flex gap-2">
            <input
              type="text"
              value={newCategoryInput}
              onChange={(e) => setNewCategoryInput(e.target.value)}
              placeholder={`New ${singularLabel} name...`}
              className="flex-1 px-3.5 py-2.5 bg-slate-50 dark:bg-black border border-slate-300 dark:border-[rgba(255,255,255,0.1)] rounded-xl text-xs font-semibold text-slate-900 dark:text-[#F3F4F6] outline-none focus:border-[#2563EB] dark:focus:border-[#3B82F6]"
            />
            <button
              type="submit"
              disabled={!newCategoryInput.trim()}
              className="px-4 py-2.5 bg-[#2563EB] hover:bg-blue-700 dark:bg-[#3B82F6] dark:hover:bg-blue-600 text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shadow-xs disabled:opacity-50 shrink-0"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>Add</span>
            </button>
          </form>

          {/* List */}
          <div className="space-y-2">
            {activeCategories.map((cat, idx) => {
              const count = getCategoryCount(cat);
              const isEditing = editingCategory === cat;
              const isConfirmingDelete = confirmDeleteCat === cat;

              return (
                <div
                  key={cat}
                  className="flex items-center justify-between p-3 bg-slate-50 dark:bg-black border border-slate-200 dark:border-[rgba(255,255,255,0.08)] rounded-xl transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1 mr-2">
                    <div className="flex flex-col gap-0.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleMove(idx, 'up')}
                        disabled={idx === 0}
                        className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 disabled:opacity-20 cursor-pointer"
                        title="Move Up"
                      >
                        <ChevronUp className="w-3.5 h-3.5 stroke-[2.5]" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleMove(idx, 'down')}
                        disabled={idx === activeCategories.length - 1}
                        className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 disabled:opacity-20 cursor-pointer"
                        title="Move Down"
                      >
                        <ChevronDown className="w-3.5 h-3.5 stroke-[2.5]" />
                      </button>
                    </div>

                    {isEditing ? (
                      <div className="flex items-center gap-1.5 flex-1 min-w-0">
                        <input
                          type="text"
                          value={editingText}
                          onChange={(e) => setEditingText(e.target.value)}
                          className="w-full px-2.5 py-1.5 bg-white dark:bg-[#222226] border border-[#2563EB] dark:border-[#3B82F6] rounded-lg text-xs font-bold text-slate-900 dark:text-white outline-none"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveEdit(cat);
                            if (e.key === 'Escape') setEditingCategory(null);
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => handleSaveEdit(cat)}
                          disabled={isProcessing}
                          className="p-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg cursor-pointer"
                          title="Save"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingCategory(null)}
                          className="p-1.5 bg-slate-200 dark:bg-zinc-800 text-slate-700 dark:text-slate-300 rounded-lg cursor-pointer"
                          title="Cancel"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between flex-1 min-w-0">
                        <span className="text-xs font-bold text-slate-900 dark:text-[#F3F4F6] truncate">
                          {cat}
                        </span>
                        <span className="px-2 py-0.5 bg-slate-200/70 dark:bg-[#222226] text-slate-600 dark:text-[#A0A0A0] text-[10px] font-mono font-bold rounded-md shrink-0 ml-2">
                          {count} {count === 1 ? 'chart' : 'charts'}
                        </span>
                      </div>
                    )}
                  </div>

                  {!isEditing && (
                    <div className="flex items-center gap-1 shrink-0">
                      {isConfirmingDelete ? (
                        <div className="flex items-center gap-1 bg-rose-50 dark:bg-rose-950/80 p-1 rounded-xl border border-rose-200 dark:border-rose-800">
                          <button
                            type="button"
                            onClick={() => handleDelete(cat)}
                            disabled={isProcessing}
                            className="px-2 py-1 bg-rose-600 hover:bg-rose-700 text-white text-[10px] font-bold rounded-lg cursor-pointer"
                          >
                            Delete
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteCat(null)}
                            className="px-2 py-1 bg-slate-200 dark:bg-zinc-800 text-slate-700 dark:text-slate-300 text-[10px] font-bold rounded-lg cursor-pointer"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() => handleStartEdit(cat)}
                            className="p-1.5 text-slate-400 hover:text-[#2563EB] dark:hover:text-[#3B82F6] rounded-lg transition-colors cursor-pointer"
                            title="Rename"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteCat(cat)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg transition-colors cursor-pointer"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </div>
              );
            })}

            {activeCategories.length === 0 && (
              <p className="text-xs text-slate-400 dark:text-slate-500 text-center py-6">
                No {singularLabel}s found. Add one above.
              </p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-slate-50 dark:bg-black border-t border-slate-200 dark:border-[rgba(255,255,255,0.08)] flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-[#2563EB] hover:bg-blue-700 dark:bg-[#3B82F6] dark:hover:bg-blue-600 text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer shadow-xs"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
