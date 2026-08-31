import React, { useState } from 'react';
import { Plus, Edit3, Trash2, Check, X, ChevronUp, ChevronDown } from 'lucide-react';
import { Song, Setlist } from '../types';
import { 
  CategoryColorKey, 
  getCascadingCategoryPalette 
} from '../lib/categoryStorage';

interface CategoryManagerModalProps {
  section: 'sheet_music' | 'technique';
  isSetlistMode?: boolean;
  categories: string[];
  setlists?: Setlist[];
  categoryColors?: Record<string, CategoryColorKey>;
  songs: Song[];
  onAddCategory: (newCategory: string, color?: CategoryColorKey) => void;
  onRenameCategory: (oldCategory: string, newCategory: string) => Promise<void> | void;
  onReorderCategories?: (reordered: string[]) => void;
  onUpdateCategoryColor?: (category: string, color: CategoryColorKey) => void;
  onDeleteCategory: (categoryToDelete: string) => Promise<void> | void;
  onClose: () => void;
}

export const CategoryManagerModal: React.FC<CategoryManagerModalProps> = ({
  section,
  isSetlistMode = false,
  categories,
  setlists = [],
  songs,
  onAddCategory,
  onRenameCategory,
  onReorderCategories,
  onDeleteCategory,
  onClose,
}) => {
  const isTechnique = section === 'technique';
  const sectionLabel = isSetlistMode
    ? (isTechnique ? 'Practice Routines' : 'Performance Setlists')
    : (isTechnique ? 'Technique Categories' : 'Sheet Music Categories');
  const singularLabel = isSetlistMode
    ? (isTechnique ? 'routine' : 'setlist')
    : 'category';

  const [newCategoryInput, setNewCategoryInput] = useState('');
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Calculate chart count per category or setlist for confirmation on delete
  const getCategoryCount = (categoryName: string) => {
    if (isSetlistMode) {
      const match = setlists.find((s) => s.name === categoryName);
      return match ? match.items.length : 0;
    }
    return songs.filter((s) => {
      if (isTechnique && s.section !== 'technique') return false;
      if (!isTechnique && s.section === 'technique') return false;
      const cat = s.genre || (isTechnique ? 'Scales' : 'Hymns');
      return cat === categoryName;
    }).length;
  };

  const handleAdd = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = newCategoryInput.trim();
    if (!trimmed) return;

    // Check duplicate
    if (categories.some((g) => g.toLowerCase() === trimmed.toLowerCase())) {
      setErrorMsg(`"${trimmed}" already exists.`);
      return;
    }

    onAddCategory(trimmed);
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

    if (categories.some((g) => g.toLowerCase() === trimmed.toLowerCase() && g !== oldCategory)) {
      setErrorMsg(`"${trimmed}" already exists.`);
      return;
    }

    setIsProcessing(true);
    setErrorMsg(null);
    try {
      await onRenameCategory(oldCategory, trimmed);
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
    const reordered = [...categories];
    const temp = reordered[index - 1];
    reordered[index - 1] = reordered[index];
    reordered[index] = temp;
    onReorderCategories(reordered);
  };

  const handleMoveDown = (index: number) => {
    if (index >= categories.length - 1 || !onReorderCategories) return;
    const reordered = [...categories];
    const temp = reordered[index + 1];
    reordered[index + 1] = reordered[index];
    reordered[index] = temp;
    onReorderCategories(reordered);
  };

  const handleDelete = async (category: string) => {
    const count = getCategoryCount(category);
    if (count > 0) {
      const confirmMsg = isSetlistMode
        ? `"${category}" contains ${count} ${count === 1 ? 'chart' : 'charts'}. Deleting this ${singularLabel} will remove it. Are you sure?`
        : `"${category}" contains ${count} ${count === 1 ? 'chart' : 'charts'}. Deleting this category will move ${count === 1 ? 'that chart' : 'those charts'} to the Trash section. Are you sure?`;
      if (!window.confirm(confirmMsg)) {
        return;
      }
    }

    setIsProcessing(true);
    setErrorMsg(null);
    try {
      await onDeleteCategory(category);
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
    <div className="space-y-4">
      {/* Header */}
      <div className="border-b border-slate-100 dark:border-slate-800 pb-2.5">
        <h2 className="text-sm font-extrabold text-slate-900 dark:text-slate-100 uppercase tracking-wide">
          Edit {sectionLabel}
        </h2>
        <p className="text-[11px] text-slate-400 dark:text-slate-400 mt-0.5">
          {isSetlistMode
            ? `Manage, reorder, rename, or create new ${isTechnique ? 'practice routines' : 'performance setlists'}.`
            : `Colors cascade automatically from lightest (${isTechnique ? 'top violet' : 'top sky'}) to darkest (${isTechnique ? 'bottom plum' : 'bottom navy'}).`}
        </p>
      </div>

      {errorMsg && (
        <div className="p-2.5 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 rounded-sm text-xs font-bold text-rose-700 dark:text-rose-300">
          {errorMsg}
        </div>
      )}

      {/* Add New Category/Setlist Form */}
      <form onSubmit={handleAdd} className="space-y-2">
        <div className="flex gap-2">
          <input
            type="text"
            value={newCategoryInput}
            onChange={(e) => setNewCategoryInput(e.target.value)}
            placeholder={`New ${singularLabel} name...`}
            className="flex-1 px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-sm text-xs font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:bg-white dark:focus:bg-slate-850 focus:border-sky-500 dark:focus:border-sky-400 placeholder:text-slate-400"
          />
          <button
            type="submit"
            disabled={!newCategoryInput.trim() || isProcessing}
            className={`px-3.5 py-2 text-white rounded-sm font-bold text-xs uppercase cursor-pointer flex items-center gap-1 shrink-0 active:scale-95 whitespace-nowrap disabled:opacity-40 ${
              isTechnique ? 'bg-purple-900 hover:bg-purple-950 dark:bg-purple-700 dark:hover:bg-purple-600' : 'bg-[#0c4a6e] hover:bg-[#073652] dark:bg-sky-700 dark:hover:bg-sky-600'
            }`}
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Add</span>
          </button>
        </div>
      </form>

      {/* List */}
      <div className="space-y-1">
        <div className="flex items-center justify-between px-0.5">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-400">
            {isSetlistMode ? (isTechnique ? 'Routines' : 'Setlists') : 'Categories'} ({categories.length})
          </span>
          <span className="text-[10px] text-slate-400 dark:text-slate-400 font-medium">
            Use arrows to reorder
          </span>
        </div>

        <div className="max-h-60 overflow-y-auto space-y-1.5 no-scrollbar pr-0.5">
          {categories.map((cat, index) => {
            const isEditing = editingCategory === cat;
            const palette = getCascadingCategoryPalette(index, categories.length, section);
            const count = getCategoryCount(cat);

            return (
              <div
                key={cat}
                className="bg-slate-50 dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/80 rounded-sm overflow-hidden"
              >
                <div className="flex items-center justify-between p-2">
                  {isEditing ? (
                    <div className="flex items-center gap-1.5 w-full">
                      <input
                        type="text"
                        value={editingText}
                        onChange={(e) => setEditingText(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSaveRename(cat);
                          if (e.key === 'Escape') setEditingCategory(null);
                        }}
                        autoFocus
                        className="flex-1 px-2.5 py-1 bg-white dark:bg-slate-900 border border-sky-400 dark:border-sky-500 rounded text-xs font-bold text-slate-900 dark:text-slate-100 outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => handleSaveRename(cat)}
                        disabled={isProcessing}
                        className="p-1 bg-sky-600 dark:bg-sky-500 text-white rounded cursor-pointer"
                        title="Save name"
                      >
                        <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingCategory(null)}
                        disabled={isProcessing}
                        className="p-1 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded cursor-pointer"
                        title="Cancel"
                      >
                        <X className="w-3.5 h-3.5 stroke-[2.5]" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-2 min-w-0">
                        {/* Dynamic cascading dot indicator */}
                        <div
                          className="w-4 h-4 rounded-full shrink-0 border border-black/15 shadow-2xs"
                          style={{ backgroundColor: palette.dotHex }}
                          title={`Position #${index + 1} (${palette.label})`}
                        />

                        <span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                          {cat}
                        </span>

                        <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500 shrink-0">
                          ({count})
                        </span>
                      </div>

                      <div className="flex items-center gap-0.5">
                        {/* Reorder Buttons */}
                        {onReorderCategories && categories.length > 1 && (
                          <>
                            <button
                              type="button"
                              onClick={() => handleMoveUp(index)}
                              disabled={index === 0 || isProcessing}
                              className="p-1 text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 disabled:opacity-20 rounded cursor-pointer"
                              title="Move Up"
                            >
                              <ChevronUp className="w-3.5 h-3.5 stroke-[2.5]" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleMoveDown(index)}
                              disabled={index === categories.length - 1 || isProcessing}
                              className="p-1 text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 disabled:opacity-20 rounded cursor-pointer"
                              title="Move Down"
                            >
                              <ChevronDown className="w-3.5 h-3.5 stroke-[2.5]" />
                            </button>
                          </>
                        )}

                        <button
                          type="button"
                          onClick={() => handleStartRename(cat)}
                          disabled={isProcessing}
                          className="p-1 text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 rounded cursor-pointer ml-1"
                          title={`Rename ${singularLabel}`}
                        >
                          <Edit3 className="w-3.5 h-3.5 stroke-[2]" />
                        </button>

                        {(categories.length > 1 || isSetlistMode) && (
                          <button
                            type="button"
                            onClick={() => handleDelete(cat)}
                            disabled={isProcessing}
                            className="p-1 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded cursor-pointer"
                            title={`Delete ${singularLabel}`}
                          >
                            <Trash2 className="w-3.5 h-3.5 stroke-[2]" />
                          </button>
                        )}
                      </div>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer controls */}
      <div className="flex items-center justify-end border-t border-slate-100 dark:border-slate-800 pt-3">
        <button
          type="button"
          onClick={onClose}
          className={`px-5 py-2 text-white rounded-md text-xs font-black uppercase tracking-wider cursor-pointer active:scale-95 whitespace-nowrap shadow-2xs ${
            isTechnique ? 'bg-purple-900 hover:bg-purple-950 dark:bg-purple-700 dark:hover:bg-purple-600' : 'bg-[#0c4a6e] hover:bg-[#073652] dark:bg-sky-700 dark:hover:bg-sky-600'
          }`}
        >
          Done
        </button>
      </div>
    </div>
  );
};

