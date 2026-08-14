import React, { useState } from 'react';
import { Tag, Plus, Edit3, Trash2, Check, X, RotateCcw, FolderEdit, Palette } from 'lucide-react';
import { Song } from '../types';
import { 
  CategoryColorKey, 
  BLUE_PALETTES, 
  PURPLE_PALETTES, 
  getCategoryPalette 
} from '../lib/categoryStorage';

interface CategoryManagerModalProps {
  section: 'sheet_music' | 'technique';
  categories: string[];
  categoryColors: Record<string, CategoryColorKey>;
  songs: Song[];
  onAddCategory: (newCategory: string, color?: CategoryColorKey) => void;
  onRenameCategory: (oldCategory: string, newCategory: string) => Promise<void> | void;
  onUpdateCategoryColor: (category: string, color: CategoryColorKey) => void;
  onDeleteCategory: (categoryToDelete: string) => Promise<void> | void;
  onResetCategories: () => void;
  onClose: () => void;
}

export const CategoryManagerModal: React.FC<CategoryManagerModalProps> = ({
  section,
  categories,
  categoryColors,
  songs,
  onAddCategory,
  onRenameCategory,
  onUpdateCategoryColor,
  onDeleteCategory,
  onResetCategories,
  onClose,
}) => {
  const isTechnique = section === 'technique';
  const sectionLabel = isTechnique ? 'Technique' : 'Sheet Music';
  const defaultColor: CategoryColorKey = isTechnique ? 'violet' : 'sky';

  const [newCategoryInput, setNewCategoryInput] = useState('');
  const [newCategoryColor, setNewCategoryColor] = useState<CategoryColorKey>(defaultColor);
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');
  const [openColorPickerCategory, setOpenColorPickerCategory] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const activePalettes = isTechnique ? PURPLE_PALETTES : BLUE_PALETTES;
  const ALL_COLOR_KEYS = Object.keys(activePalettes) as CategoryColorKey[];

  // Calculate song count per category for confirmation on delete
  const getCategoryCount = (categoryName: string) => {
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

    onAddCategory(trimmed, newCategoryColor);
    setNewCategoryInput('');
    setErrorMsg(null);
  };

  const handleStartRename = (category: string) => {
    setEditingCategory(category);
    setEditingText(category);
    setOpenColorPickerCategory(null);
    setErrorMsg(null);
  };

  const handleSaveRename = async (oldCategory: string) => {
    const trimmed = editingText.trim();
    if (!trimmed) {
      setErrorMsg('Category name cannot be empty.');
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
      console.error('Failed to rename category:', err);
      setErrorMsg('Failed to update category name across charts.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDelete = async (category: string) => {
    const count = getCategoryCount(category);
    if (count > 0) {
      const confirmMsg = `"${category}" contains ${count} ${count === 1 ? 'chart' : 'charts'}. Deleting this category will move ${count === 1 ? 'that chart' : 'those charts'} to the Trash section. Are you sure?`;
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
      console.error('Failed to delete category:', err);
      setErrorMsg('Failed to delete category.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="border-b border-slate-100 pb-2.5">
        <h2 className="text-sm font-extrabold text-slate-900 uppercase tracking-wide">
          Edit {sectionLabel} Categories
        </h2>
      </div>

      {errorMsg && (
        <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-xs font-bold text-rose-700">
          {errorMsg}
        </div>
      )}

      {/* Add New Category Form */}
      <form onSubmit={handleAdd} className="space-y-2">
        <div className="flex gap-2">
          <input
            type="text"
            value={newCategoryInput}
            onChange={(e) => setNewCategoryInput(e.target.value)}
            placeholder={`New category name...`}
            className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-900 focus:outline-none focus:bg-white focus:border-slate-400"
          />
          <button
            type="submit"
            disabled={!newCategoryInput.trim() || isProcessing}
            className={`px-3.5 py-2 text-white rounded-lg font-bold text-xs uppercase cursor-pointer flex items-center gap-1 shrink-0 active:scale-95 ${
              isTechnique ? 'bg-purple-900 hover:bg-purple-950' : 'bg-slate-900 hover:bg-slate-800'
            }`}
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Add</span>
          </button>
        </div>

        {/* Color picker for new category */}
        <div className="flex items-center gap-2 px-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase">Color:</span>
          <div className="flex items-center gap-1.5">
            {ALL_COLOR_KEYS.map((key) => {
              const pal = activePalettes[key];
              const isSelected = newCategoryColor === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setNewCategoryColor(key)}
                  className={`w-4 h-4 rounded-full cursor-pointer border ${
                    isSelected ? 'ring-2 ring-offset-1 ring-slate-900 scale-110' : ''
                  }`}
                  style={{ backgroundColor: pal.dotHex, borderColor: 'rgba(0,0,0,0.1)' }}
                  title={pal.label}
                />
              );
            })}
          </div>
        </div>
      </form>

      {/* Category List */}
      <div className="space-y-1">
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-0.5">
          Categories ({categories.length})
        </span>

        <div className="max-h-60 overflow-y-auto space-y-1.5 no-scrollbar pr-0.5">
          {categories.map((cat) => {
            const isEditing = editingCategory === cat;
            const isPickerOpen = openColorPickerCategory === cat;
            const palette = getCategoryPalette(cat, categoryColors, section);

            return (
              <div
                key={cat}
                className="bg-slate-50 border border-slate-200/80 rounded-lg overflow-hidden"
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
                        className="flex-1 px-2.5 py-1 bg-white border border-slate-400 rounded text-xs font-bold text-slate-900 outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => handleSaveRename(cat)}
                        disabled={isProcessing}
                        className="p-1 bg-emerald-600 text-white rounded cursor-pointer"
                        title="Save name"
                      >
                        <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingCategory(null)}
                        disabled={isProcessing}
                        className="p-1 bg-slate-200 text-slate-700 rounded cursor-pointer"
                        title="Cancel"
                      >
                        <X className="w-3.5 h-3.5 stroke-[2.5]" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-2 min-w-0">
                        <button
                          type="button"
                          onClick={() => setOpenColorPickerCategory(isPickerOpen ? null : cat)}
                          className="w-4 h-4 rounded-full shrink-0 border border-black/10 cursor-pointer"
                          style={{ backgroundColor: palette.dotHex }}
                          title={`Change color shade for ${cat}`}
                        />

                        <span className="text-xs font-bold text-slate-800 truncate">
                          {cat}
                        </span>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleStartRename(cat)}
                          disabled={isProcessing}
                          className="p-1 text-slate-400 hover:text-slate-800 rounded cursor-pointer"
                          title="Rename Category"
                        >
                          <Edit3 className="w-3.5 h-3.5 stroke-[2]" />
                        </button>

                        {categories.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleDelete(cat)}
                            disabled={isProcessing}
                            className="p-1 text-slate-400 hover:text-rose-600 rounded cursor-pointer"
                            title="Delete category"
                          >
                            <Trash2 className="w-3.5 h-3.5 stroke-[2]" />
                          </button>
                        )}
                      </div>
                    </>
                  )}
                </div>

                {/* Color shade picker */}
                {isPickerOpen && !isEditing && (
                  <div className="px-2 py-1.5 bg-white border-t border-slate-200 flex items-center gap-2">
                    <span className="text-[10px] font-bold text-slate-400 uppercase shrink-0">
                      Shade:
                    </span>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {ALL_COLOR_KEYS.map((key) => {
                        const pal = activePalettes[key];
                        const isCurrent = (categoryColors[cat] || (isTechnique ? 'violet' : 'sky')) === key;
                        return (
                          <button
                            key={key}
                            type="button"
                            onClick={() => {
                              onUpdateCategoryColor(cat, key);
                            }}
                            className={`w-5 h-5 rounded-full cursor-pointer border flex items-center justify-center ${
                              isCurrent ? 'ring-2 ring-offset-1 ring-slate-900 scale-105' : ''
                            }`}
                            style={{ backgroundColor: pal.dotHex, borderColor: 'rgba(0,0,0,0.1)' }}
                            title={pal.label}
                          >
                            {isCurrent && <Check className="w-2.5 h-2.5 text-white stroke-[3]" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer controls */}
      <div className="flex items-center justify-between border-t border-slate-100 pt-3">
        <button
          type="button"
          onClick={() => {
            if (window.confirm(`Reset ${sectionLabel.toLowerCase()} category list and colors to default?`)) {
              onResetCategories();
              setEditingCategory(null);
              setOpenColorPickerCategory(null);
            }
          }}
          className="text-[11px] font-bold text-slate-400 hover:text-slate-600 flex items-center gap-1 cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Reset Defaults</span>
        </button>

        <button
          type="button"
          onClick={onClose}
          className={`px-4 py-1.5 text-white rounded-lg text-xs font-bold uppercase cursor-pointer active:scale-95 ${
            isTechnique ? 'bg-purple-900 hover:bg-purple-950' : 'bg-slate-900 hover:bg-slate-800'
          }`}
        >
          Done
        </button>
      </div>
    </div>
  );
};
