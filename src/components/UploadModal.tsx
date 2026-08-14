import React, { useState, useEffect } from 'react';
import { Upload, FileText, Check, AlertCircle, Trash2, Plus, Folder, Loader2 } from 'lucide-react';
import { Song, SongType } from '../types';
import { DEFAULT_SHEET_MUSIC_CATEGORIES, DEFAULT_TECHNIQUE_CATEGORIES } from '../lib/categoryStorage';

interface UploadModalProps {
  genres?: string[];
  sheetMusicCategories?: string[];
  techniqueCategories?: string[];
  defaultSection?: 'sheet_music' | 'technique';
  initialCategory?: string;
  onSaveSongs: (songs: Song[], onProgress?: (processed: number, total: number) => void) => Promise<void>;
  onClose: () => void;
  initialFiles?: File[] | null;
  onClearInitialFiles?: () => void;
}

interface FileEntry {
  id: string;
  file: File;
  title: string;
  type: SongType;
}

const cleanFileName = (filename: string): string => {
  return filename
    .replace(/\.[^/.]+$/, '')
    .replace(/[-_]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (l) => l.toUpperCase());
};

const createEntriesFromFiles = (files: File[]): FileEntry[] => {
  return files.map((f) => {
    let fileType: SongType = 'pdf';
    if (f.type.includes('pdf') || f.name.toLowerCase().endsWith('.pdf')) {
      fileType = 'pdf';
    } else if (f.type.includes('image')) {
      fileType = 'image';
    } else if (f.name.toLowerCase().endsWith('.xml') || f.name.toLowerCase().endsWith('.mxl')) {
      fileType = 'musicxml';
    }
    return {
      id: `file_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      file: f,
      title: cleanFileName(f.name),
      type: fileType,
    };
  });
};

export const UploadModal: React.FC<UploadModalProps> = ({
  genres = DEFAULT_SHEET_MUSIC_CATEGORIES,
  sheetMusicCategories,
  techniqueCategories,
  defaultSection = 'sheet_music',
  initialCategory,
  onSaveSongs,
  onClose,
  initialFiles,
}) => {
  const [fileEntries, setFileEntries] = useState<FileEntry[]>(() => {
    if (initialFiles && initialFiles.length > 0) {
      return createEntriesFromFiles(initialFiles);
    }
    return [];
  });
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveProgress, setSaveProgress] = useState<{ processed: number; total: number } | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [section, setSection] = useState<'sheet_music' | 'technique'>(defaultSection);
  const [isDraggingOver, setIsDraggingOver] = useState<boolean>(false);

  // Unified available categories list
  const availableCategories = React.useMemo(() => {
    if (section === 'technique') {
      return techniqueCategories && techniqueCategories.length > 0
        ? techniqueCategories
        : DEFAULT_TECHNIQUE_CATEGORIES;
    }
    return sheetMusicCategories && sheetMusicCategories.length > 0
      ? sheetMusicCategories
      : genres && genres.length > 0
      ? genres
      : DEFAULT_SHEET_MUSIC_CATEGORIES;
  }, [section, sheetMusicCategories, techniqueCategories, genres]);

  // Single chosen target category for all files
  const [targetCategory, setTargetCategory] = useState<string>(() => {
    if (initialCategory && availableCategories.includes(initialCategory)) {
      return initialCategory;
    }
    return availableCategories[0] || (defaultSection === 'technique' ? 'Scales' : 'Hymns');
  });

  // Custom new category input state
  const [isCreatingCategory, setIsCreatingCategory] = useState<boolean>(false);
  const [newCategoryName, setNewCategoryName] = useState<string>('');

  // Keep targetCategory valid when availableCategories change
  useEffect(() => {
    if (availableCategories.length > 0 && !availableCategories.includes(targetCategory)) {
      setTargetCategory(availableCategories[0]);
    }
  }, [availableCategories, section]);

  // Append new files if initialFiles prop changes while already mounted
  useEffect(() => {
    if (initialFiles && initialFiles.length > 0) {
      const newEntries = createEntriesFromFiles(initialFiles);
      setFileEntries((prev) => {
        const existingKeys = new Set(prev.map((e) => `${e.file.name}_${e.file.size}`));
        const filtered = newEntries.filter((e) => !existingKeys.has(`${e.file.name}_${e.file.size}`));
        return [...prev, ...filtered];
      });
    }
  }, [initialFiles]);

  const handleAddFiles = (filesList: FileList | File[]) => {
    const filesArray = Array.from(filesList);
    if (filesArray.length === 0) return;

    const newEntries = createEntriesFromFiles(filesArray);
    setFileEntries((prev) => {
      const existingKeys = new Set(prev.map((e) => `${e.file.name}_${e.file.size}`));
      const filtered = newEntries.filter((e) => !existingKeys.has(`${e.file.name}_${e.file.size}`));
      return [...prev, ...filtered];
    });
    setErrorMsg(null);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleAddFiles(e.target.files);
      e.target.value = '';
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleAddFiles(e.dataTransfer.files);
    }
  };

  const handleUpdateTitle = (id: string, newTitle: string) => {
    setFileEntries((prev) =>
      prev.map((entry) => (entry.id === id ? { ...entry, title: newTitle } : entry))
    );
  };

  const handleRemoveFile = (id: string) => {
    setFileEntries((prev) => prev.filter((entry) => entry.id !== id));
  };

  const handleSaveAll = async () => {
    if (fileEntries.length === 0) {
      setErrorMsg('Please select at least one PDF chart to upload.');
      return;
    }

    const effectiveCategory = isCreatingCategory && newCategoryName.trim()
      ? newCategoryName.trim()
      : targetCategory;

    if (!effectiveCategory) {
      setErrorMsg('Please select or specify a category for this upload.');
      return;
    }

    setIsSaving(true);
    setErrorMsg(null);
    setSaveProgress({ processed: 0, total: fileEntries.length });

    try {
      const newSongs: Song[] = [];

      for (let i = 0; i < fileEntries.length; i++) {
        const entry = fileEntries[i];
        const uniqueId = `chart_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        const song: Song = {
          id: uniqueId,
          title: entry.title.trim() || cleanFileName(entry.file.name),
          artist: '',
          key: 'Cmaj',
          originalKey: 'Cmaj',
          tempo: 120,
          timeSignature: '4/4',
          genre: effectiveCategory,
          type: entry.type,
          section: section,
          favorite: false,
          dateAdded: Date.now(),
          fileBlob: entry.file,
        };

        newSongs.push(song);
      }

      await onSaveSongs(newSongs, (processed, total) => {
        setSaveProgress({ processed, total });
      });

      onClose();
    } catch (err: any) {
      console.error('Error during upload batch:', err);
      setErrorMsg(err.message || 'Failed to upload files. Please try again.');
      setIsSaving(false);
      setSaveProgress(null);
    }
  };

  const totalSizeMB = (
    fileEntries.reduce((acc, entry) => acc + entry.file.size, 0) /
    (1024 * 1024)
  ).toFixed(1);

  return (
    <div className="space-y-4 p-1">
      {/* 1. SINGLE UNIFIED CATEGORY SELECTOR */}
      <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200/90 space-y-2.5">
        <div className="flex items-center justify-between gap-2">
          <label className="text-[11px] font-black uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
            <Folder className="w-3.5 h-3.5 text-sky-600" />
            <span>Upload To Category</span>
          </label>

          {/* Section Selector Pill */}
          <div className="flex items-center gap-1 bg-slate-200/80 p-0.5 rounded-lg text-[10px] font-black">
            <button
              type="button"
              onClick={() => setSection('sheet_music')}
              className={`px-2 py-0.5 rounded-md transition-all cursor-pointer uppercase ${
                section === 'sheet_music'
                  ? 'bg-white text-[#0c4a6e] shadow-2xs font-extrabold'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Sheet Music
            </button>
            <button
              type="button"
              onClick={() => setSection('technique')}
              className={`px-2 py-0.5 rounded-md transition-all cursor-pointer uppercase ${
                section === 'technique'
                  ? 'bg-purple-900 text-white shadow-2xs font-extrabold'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Technique
            </button>
          </div>
        </div>

        {/* Category Dropdown or New Category Input */}
        {!isCreatingCategory ? (
          <div className="flex items-center gap-2">
            <select
              value={targetCategory}
              onChange={(e) => {
                if (e.target.value === '__NEW__') {
                  setIsCreatingCategory(true);
                  setNewCategoryName('');
                } else {
                  setTargetCategory(e.target.value);
                }
              }}
              className="flex-1 bg-white text-slate-900 font-bold text-sm px-3 py-2 rounded-xl border border-slate-200 shadow-2xs focus:border-sky-500 outline-none cursor-pointer"
            >
              {availableCategories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
              <option value="__NEW__">+ New Category...</option>
            </select>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <input
              type="text"
              autoFocus
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              placeholder="Enter new category name..."
              className="flex-1 bg-white text-slate-900 font-bold text-sm px-3 py-2 rounded-xl border border-sky-400 shadow-2xs focus:border-sky-600 outline-none"
            />
            <button
              type="button"
              onClick={() => setIsCreatingCategory(false)}
              className="px-3 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-black rounded-xl cursor-pointer"
            >
              Cancel
            </button>
          </div>
        )}
      </div>

      {/* ERROR ALERT */}
      {errorMsg && (
        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold rounded-xl flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* 2. SIMPLE DROP ZONE */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setIsDraggingOver(true);
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setIsDraggingOver(false);
        }}
        onDrop={handleDrop}
        className={`border-2 border-dashed ${
          isDraggingOver
            ? 'border-sky-600 bg-sky-50/80 scale-[1.01]'
            : 'border-slate-300 hover:border-sky-500 bg-slate-50 hover:bg-sky-50/50'
        } rounded-2xl p-6 transition-all text-center relative cursor-pointer group`}
      >
        <input
          type="file"
          multiple
          accept="application/pdf,.pdf"
          onChange={handleFileInputChange}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
        />
        <div className="flex flex-col items-center justify-center space-y-2 pointer-events-none">
          <div className="w-11 h-11 rounded-2xl bg-white border border-slate-200 group-hover:border-sky-300 flex items-center justify-center text-[#0c4a6e] shadow-2xs">
            <Upload className="w-5 h-5" />
          </div>
          <div>
            <p className="text-sm font-black text-[#0c4a6e]">
              Choose PDF Charts or Drag & Drop
            </p>
            <p className="text-xs text-slate-400 mt-0.5 font-medium">
              Select one or multiple PDF sheet music files
            </p>
          </div>
        </div>
      </div>

      {/* 3. SELECTED FILES LIST */}
      {fileEntries.length > 0 && (
        <div className="space-y-2.5 pt-1">
          <div className="flex items-center justify-between text-xs font-black text-[#0c4a6e]">
            <span>
              {fileEntries.length} {fileEntries.length === 1 ? 'Chart' : 'Charts'} Selected ({totalSizeMB} MB)
            </span>
            <button
              type="button"
              onClick={() => setFileEntries([])}
              className="text-[11px] text-slate-400 hover:text-rose-600 font-bold cursor-pointer transition-colors"
            >
              Clear All
            </button>
          </div>

          <div className="max-h-56 overflow-y-auto space-y-2 pr-1">
            {fileEntries.map((entry) => (
              <div
                key={entry.id}
                className="p-2.5 bg-white border border-slate-200 rounded-xl flex items-center gap-2.5 shadow-2xs"
              >
                <FileText className="w-5 h-5 text-rose-600 shrink-0" />
                <div className="flex-1 min-w-0">
                  <input
                    type="text"
                    value={entry.title}
                    onChange={(e) => handleUpdateTitle(entry.id, e.target.value)}
                    placeholder="Chart title"
                    className="w-full px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-[#0c4a6e] focus:bg-white focus:border-sky-500 outline-none"
                  />
                  <p className="text-[10px] text-slate-400 mt-0.5 truncate pl-0.5">
                    {entry.file.name} ({(entry.file.size / (1024 * 1024)).toFixed(2)} MB)
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleRemoveFile(entry.id)}
                  className="p-1.5 text-slate-300 hover:text-rose-600 rounded-lg cursor-pointer transition-colors shrink-0"
                  title="Remove"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>

          {/* 4. ACTIONS & PROGRESS */}
          {saveProgress && (
            <div className="p-3 bg-sky-50 border border-sky-200 rounded-xl space-y-1.5">
              <div className="flex items-center justify-between text-xs font-black text-sky-900">
                <span className="flex items-center gap-1.5">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-sky-600" />
                  <span>Importing Charts...</span>
                </span>
                <span>{saveProgress.processed} / {saveProgress.total}</span>
              </div>
              <div className="w-full h-2 bg-sky-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-sky-600 transition-all duration-200 rounded-full"
                  style={{
                    width: `${Math.round((saveProgress.processed / saveProgress.total) * 100)}%`,
                  }}
                />
              </div>
            </div>
          )}

          <div className="pt-2 flex items-center gap-2">
            <label className="px-3 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-black text-xs uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1.5 shrink-0">
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>Add More</span>
              <input
                type="file"
                multiple
                accept="application/pdf,.pdf"
                onChange={handleFileInputChange}
                className="sr-only"
              />
            </label>

            <button
              type="button"
              onClick={handleSaveAll}
              disabled={isSaving}
              className={`flex-1 py-3 text-white rounded-xl font-black text-xs uppercase tracking-wider transition-all cursor-pointer shadow-md flex items-center justify-center gap-2 ${
                section === 'technique'
                  ? 'bg-purple-900 hover:bg-purple-950'
                  : 'bg-[#0c4a6e] hover:bg-[#073652]'
              } disabled:opacity-50`}
            >
              <Check className="w-4 h-4 stroke-[2.5]" />
              <span>
                {isSaving
                  ? 'Importing...'
                  : `Upload ${fileEntries.length} ${
                      fileEntries.length === 1 ? 'Chart' : 'Charts'
                    } to ${isCreatingCategory && newCategoryName.trim() ? newCategoryName.trim() : targetCategory}`}
              </span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
