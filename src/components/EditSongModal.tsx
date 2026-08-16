import React, { useState } from 'react';
import { Song } from '../types';
import { Save } from 'lucide-react';
import { DEFAULT_SHEET_MUSIC_CATEGORIES } from '../lib/categoryStorage';

interface EditSongModalProps {
  song: Song;
  genres?: string[];
  onSave: (updatedSong: Song) => void;
  onClose: () => void;
}

export const EditSongModal: React.FC<EditSongModalProps> = ({ song, genres = DEFAULT_SHEET_MUSIC_CATEGORIES, onSave }) => {
  const [title, setTitle] = useState(song.title);
  const [category, setCategory] = useState(song.genre || 'Hymns');
  const [section, setSection] = useState<'sheet_music' | 'technique'>(song.section || 'sheet_music');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      ...song,
      title: title.trim() || song.title,
      genre: category,
      section: section,
      dateModified: Date.now(),
    });
  };

  const categoryOptions = React.useMemo(() => {
    const list = [...genres];
    if (category && !list.includes(category)) {
      list.push(category);
    }
    return list;
  }, [genres, category]);

  const isTechnique = section === 'technique';

  return (
    <div className="space-y-4">
      <div className="border-b border-slate-100 pb-2.5">
        <h2 className="text-sm font-extrabold text-slate-900 uppercase tracking-wide">
          Edit Chart
        </h2>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        {/* Title */}
        <div className="space-y-1">
          <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
            Title
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-sm text-xs font-bold text-slate-900 focus:bg-white focus:border-slate-400 outline-none"
            placeholder="Chart title..."
            required
          />
        </div>

        {/* Category Dropdown */}
        <div className="space-y-1">
          <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
            Category
          </label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-sm text-xs font-bold text-slate-900 focus:bg-white focus:border-slate-400 outline-none cursor-pointer"
          >
            {categoryOptions.map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>

        {/* Section Selector */}
        <div className="space-y-1">
          <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
            Section
          </label>
          <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1 rounded-sm">
            <button
              type="button"
              onClick={() => setSection('sheet_music')}
              className={`py-1.5 px-2 rounded-xs text-xs font-bold uppercase cursor-pointer whitespace-nowrap ${
                section === 'sheet_music'
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Sheet Music
            </button>
            <button
              type="button"
              onClick={() => setSection('technique')}
              className={`py-1.5 px-2 rounded-xs text-xs font-bold uppercase cursor-pointer whitespace-nowrap ${
                section === 'technique'
                  ? 'bg-purple-900 text-white'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Technique
            </button>
          </div>
        </div>

        <button
          type="submit"
          className={`w-full py-2.5 text-white rounded-sm font-bold text-xs uppercase tracking-wider cursor-pointer active:scale-98 shadow-2xs flex items-center justify-center gap-1.5 mt-4 whitespace-nowrap ${
            isTechnique ? 'bg-purple-900 hover:bg-purple-950' : 'bg-slate-900 hover:bg-slate-800'
          }`}
        >
          <Save className="w-3.5 h-3.5" />
          <span>Save Changes</span>
        </button>
      </form>
    </div>
  );
};
