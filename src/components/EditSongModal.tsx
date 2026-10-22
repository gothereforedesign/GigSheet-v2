import React, { useState, useEffect } from 'react';
import { Song } from '../types';
import { Save, Link as LinkIcon } from 'lucide-react';
import { DEFAULT_SHEET_MUSIC_CATEGORIES, DEFAULT_TECHNIQUE_CATEGORIES } from '../lib/categoryStorage';

interface EditSongModalProps {
  song: Song;
  genres?: string[];
  sheetMusicCategories?: string[];
  techniqueCategories?: string[];
  onSave: (updatedSong: Song) => void;
  onClose: () => void;
}

export const EditSongModal: React.FC<EditSongModalProps> = ({
  song,
  genres = DEFAULT_SHEET_MUSIC_CATEGORIES,
  sheetMusicCategories,
  techniqueCategories,
  onSave,
}) => {
  const [title, setTitle] = useState(song.title);
  const [artist, setArtist] = useState(song.artist || '');
  const [fileUrl, setFileUrl] = useState(song.fileUrl || '');
  const [section, setSection] = useState<'sheet_music' | 'technique'>(song.section || 'sheet_music');
  const [category, setCategory] = useState(
    song.genre || (song.section === 'technique' ? 'Scales' : 'Hymns')
  );
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');

  const categoryOptions = React.useMemo(() => {
    const baseList =
      section === 'technique'
        ? techniqueCategories && techniqueCategories.length > 0
          ? techniqueCategories
          : DEFAULT_TECHNIQUE_CATEGORIES
        : sheetMusicCategories && sheetMusicCategories.length > 0
        ? sheetMusicCategories
        : genres && genres.length > 0
        ? genres
        : DEFAULT_SHEET_MUSIC_CATEGORIES;

    const list = [...baseList];
    const fallback = section === 'technique' ? 'Scales' : 'Hymns';
    if (list.length === 0) {
      list.push(fallback);
    }
    if (category && !list.includes(category) && section === (song.section || 'sheet_music')) {
      list.push(category);
    }
    return list;
  }, [section, sheetMusicCategories, techniqueCategories, genres, category, song.section]);

  useEffect(() => {
    if (!categoryOptions.includes(category)) {
      setCategory(categoryOptions[0] || (section === 'technique' ? 'Scales' : 'Hymns'));
    }
  }, [section, categoryOptions]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalCategory =
      isCreatingCategory && newCategoryName.trim()
        ? newCategoryName.trim()
        : category || (section === 'technique' ? 'Scales' : 'Hymns');

    onSave({
      ...song,
      title: title.trim() || song.title,
      artist: artist.trim(),
      fileUrl: fileUrl.trim() || undefined,
      genre: finalCategory,
      section: section,
      dateModified: Date.now(),
    });
  };

  const isTechnique = section === 'technique';

  return (
    <div className="space-y-4">
      <div className="border-b border-slate-100 dark:border-slate-800 pb-2.5">
        <h2 className="text-sm font-extrabold text-slate-900 dark:text-slate-100 uppercase tracking-wide">
          Edit Chart & External PDF Link
        </h2>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        {/* Title */}
        <div className="space-y-1">
          <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Title
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-sm text-xs font-bold text-slate-900 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-850 focus:border-sky-500 dark:focus:border-sky-400 outline-none"
            placeholder="Chart title..."
            required
          />
        </div>

        {/* Artist / Composer */}
        <div className="space-y-1">
          <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Composer / Artist
          </label>
          <input
            type="text"
            value={artist}
            onChange={(e) => setArtist(e.target.value)}
            className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-sm text-xs font-bold text-slate-900 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-850 focus:border-sky-500 dark:focus:border-sky-400 outline-none"
            placeholder="Composer or artist..."
          />
        </div>

        {/* External PDF URL (Google Drive / Web link) */}
        <div className="space-y-1">
          <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1">
            <LinkIcon className="w-3 h-3 text-sky-500" />
            <span>External PDF URL (Google Drive / Web Link)</span>
          </label>
          <input
            type="url"
            value={fileUrl}
            onChange={(e) => setFileUrl(e.target.value)}
            className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-sm text-xs font-medium text-slate-900 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-850 focus:border-sky-500 dark:focus:border-sky-400 outline-none"
            placeholder="https://drive.google.com/file/d/... or direct PDF URL"
          />
        </div>

        {/* Section Selector */}
        <div className="space-y-1">
          <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Section
          </label>
          <div className="grid grid-cols-2 gap-2 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-sm border border-slate-200/60 dark:border-slate-700">
            <button
              type="button"
              onClick={() => {
                setSection('sheet_music');
                setIsCreatingCategory(false);
              }}
              className={`py-1.5 px-2 rounded-xs text-xs font-bold uppercase cursor-pointer whitespace-nowrap transition-all ${
                section === 'sheet_music'
                  ? 'bg-[#0c4a6e] dark:bg-sky-700 text-white shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              Sheet Music
            </button>
            <button
              type="button"
              onClick={() => {
                setSection('technique');
                setIsCreatingCategory(false);
              }}
              className={`py-1.5 px-2 rounded-xs text-xs font-bold uppercase cursor-pointer whitespace-nowrap transition-all ${
                section === 'technique'
                  ? 'bg-purple-800 dark:bg-purple-700 text-white shadow-2xs font-black'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              Technique
            </button>
          </div>
        </div>

        {/* Category Dropdown or New Category Input */}
        <div className="space-y-1">
          <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Category
          </label>
          {!isCreatingCategory ? (
            <select
              value={category}
              onChange={(e) => {
                if (e.target.value === '__NEW__') {
                  setIsCreatingCategory(true);
                  setNewCategoryName('');
                } else {
                  setCategory(e.target.value);
                }
              }}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-sm text-xs font-bold text-slate-900 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-850 focus:border-sky-500 dark:focus:border-sky-400 outline-none cursor-pointer"
            >
              {categoryOptions.map((cat) => (
                <option key={cat} value={cat} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">
                  {cat}
                </option>
              ))}
              <option value="__NEW__" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">
                + New Category...
              </option>
            </select>
          ) : (
            <div className="flex items-center gap-2">
              <input
                type="text"
                autoFocus
                required
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder="New category name..."
                className="flex-1 px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-sky-500 dark:border-sky-400 rounded-sm text-xs font-bold text-slate-900 dark:text-slate-100 outline-none"
              />
              <button
                type="button"
                onClick={() => setIsCreatingCategory(false)}
                className="px-2.5 py-2 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-sm text-xs font-bold cursor-pointer"
              >
                Cancel
              </button>
            </div>
          )}
        </div>

        <button
          type="submit"
          className={`w-full py-2.5 rounded-sm font-bold text-xs uppercase tracking-wider cursor-pointer active:scale-98 shadow-2xs flex items-center justify-center gap-1.5 mt-4 whitespace-nowrap transition-all ${
            isTechnique
              ? 'bg-purple-800 hover:bg-purple-900 dark:bg-purple-700 dark:hover:bg-purple-600 text-white'
              : 'bg-[#0c4a6e] hover:bg-[#073652] dark:bg-sky-700 dark:hover:bg-sky-600 text-white'
          }`}
        >
          <Save className="w-3.5 h-3.5" />
          <span>Save Changes</span>
        </button>
      </form>
    </div>
  );
};
