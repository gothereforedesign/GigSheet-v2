import React, { useState, useEffect } from 'react';
import { Upload, FileText, Check, AlertCircle, Trash2, Plus, Folder, Loader2, CheckCircle2 } from 'lucide-react';
import { Song, SongType } from '../types';
import { DEFAULT_SHEET_MUSIC_CATEGORIES, DEFAULT_TECHNIQUE_CATEGORIES } from '../lib/categoryStorage';

interface UploadModalProps {
  genres?: string[];
  sheetMusicCategories?: string[];
  techniqueCategories?: string[];
  defaultSection?: 'sheet_music' | 'technique';
  initialCategory?: string;
  onSaveSongs: (songs: Song[], onProgress?: (processed: number, total: number) => void) => Promise<void>;
  onEnqueueEntries?: (
    entries: { file: File; title?: string }[],
    category: string,
    section: 'sheet_music' | 'technique'
  ) => void;
  onClose: () => void;
  initialFiles?: File[] | null;
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
  onEnqueueEntries,
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

    const currentCount = fileEntries.length;
    const remainingSlots = 50 - currentCount;
    if (remainingSlots <= 0) {
      setErrorMsg('You have reached the maximum limit of 50 PDFs for this upload batch.');
      return;
    }

    let filesToAdd = filesArray;
    if (filesArray.length > remainingSlots) {
      filesToAdd = filesArray.slice(0, remainingSlots);
      setErrorMsg(`You can upload up to 50 PDFs at a time. Added first ${remainingSlots} files.`);
    } else {
      setErrorMsg(null);
    }

    const newEntries = createEntriesFromFiles(filesToAdd);
    setFileEntries((prev) => {
      const existingKeys = new Set(prev.map((e) => `${e.file.name}_${e.file.size}`));
      const filtered = newEntries.filter((e) => !existingKeys.has(`${e.file.name}_${e.file.size}`));
      return [...prev, ...filtered];
    });
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

    // If non-blocking queue enqueue function is provided, enqueue and close instantly
    if (onEnqueueEntries) {
      onEnqueueEntries(
        fileEntries.map((e) => ({ file: e.file, title: e.title })),
        effectiveCategory,
        section
      );
      onClose();
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

  const processedCount = saveProgress?.processed || 0;
  const totalCount = saveProgress?.total || fileEntries.length;
  const percentComplete = totalCount > 0 ? Math.round((processedCount / totalCount) * 100) : 0;

  // IF SAVING, SHOW LARGE COMPREHENSIVE PROCESSING DASHBOARD
  if (isSaving) {
    return (
      <div className="space-y-6 py-4">
        <div className="text-center space-y-2">
          <div className="w-16 h-16 bg-sky-100 rounded-xl mx-auto flex items-center justify-center text-sky-700 shadow-inner">
            <Loader2 className="w-8 h-8 animate-spin" />
          </div>
          <h3 className="text-xl font-black text-slate-900">
            Processing & Uploading Charts ({processedCount} / {totalCount})
          </h3>
          <p className="text-sm font-medium text-slate-500">
            Please keep this window open while your PDF sheet music batch is securely saved.
          </p>
        </div>

        {/* Big Progress Bar */}
        <div className="space-y-2 bg-slate-50 p-5 rounded-lg border border-slate-200">
          <div className="flex justify-between items-center text-sm font-black text-slate-800">
            <span>Overall Progress</span>
            <span className="text-sky-700 font-mono text-base">{percentComplete}%</span>
          </div>
          <div className="w-full h-3.5 bg-slate-200 rounded-full overflow-hidden p-0.5 shadow-inner">
            <div
              className="h-full bg-sky-600 transition-all duration-300 rounded-full"
              style={{ width: `${percentComplete}%` }}
            />
          </div>
          <div className="flex justify-between text-xs font-bold text-slate-400 pt-1">
            <span>Completed: {processedCount} charts</span>
            <span>Remaining: {Math.max(0, totalCount - processedCount)} charts</span>
          </div>
        </div>

        {/* Live File Processing Status List */}
        <div className="space-y-2">
          <h4 className="text-xs font-black uppercase tracking-wider text-slate-400">
            Batch Item Status
          </h4>
          <div className="max-h-72 overflow-y-auto space-y-2 pr-1">
            {fileEntries.map((entry, index) => {
              const isCompleted = index < processedCount;
              const isCurrent = index === processedCount;
              return (
                <div
                  key={entry.id}
                  className={`p-3 rounded-md border flex items-center gap-3 transition-all ${
                    isCompleted
                      ? 'bg-emerald-50/60 border-emerald-200 text-emerald-900'
                      : isCurrent
                      ? 'bg-sky-50 border-sky-300 ring-2 ring-sky-100 text-sky-900'
                      : 'bg-white border-slate-200 text-slate-400 opacity-60'
                  }`}
                >
                  <div className="shrink-0">
                    {isCompleted ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    ) : isCurrent ? (
                      <Loader2 className="w-5 h-5 text-sky-600 animate-spin" />
                    ) : (
                      <div className="w-5 h-5 rounded-full border-2 border-slate-300 flex items-center justify-center text-[10px] font-bold text-slate-400">
                        {index + 1}
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold truncate text-slate-800">
                      {entry.title}
                    </p>
                    <p className="text-[10px] text-slate-400 truncate">
                      {entry.file.name}
                    </p>
                  </div>
                  <div className="text-[11px] font-black shrink-0">
                    {isCompleted ? (
                      <span className="text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-sm">Saved</span>
                    ) : isCurrent ? (
                      <span className="text-sky-700 bg-sky-100 px-2 py-0.5 rounded-sm">Uploading...</span>
                    ) : (
                      <span className="text-slate-400">Queued</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // REVIEW & SETUP STATE
  return (
    <div className="space-y-5 py-2">
      {/* 1. SINGLE UNIFIED CATEGORY SELECTOR */}
      <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-200/90 flex items-center gap-2 flex-wrap sm:flex-nowrap">
        <div className="flex items-center gap-2 shrink-0">
          <Folder className="w-4 h-4 text-sky-600" />
          <span className="text-xs font-black uppercase tracking-wider text-slate-600">Upload To</span>
        </div>

        {/* Section Dropdown */}
        <select
          value={section}
          onChange={(e) => setSection(e.target.value as 'sheet_music' | 'technique')}
          className="bg-white text-slate-900 font-bold text-xs px-3 py-2.5 rounded-md border border-slate-200 shadow-2xs focus:border-sky-500 outline-none cursor-pointer shrink-0"
        >
          <option value="sheet_music">Sheet Music</option>
          <option value="technique">Technique</option>
        </select>

        {/* Category Dropdown or New Category Input */}
        {!isCreatingCategory ? (
          <div className="flex items-center gap-2 flex-1 min-w-[160px]">
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
              className="w-full bg-white text-slate-900 font-bold text-xs px-3 py-2.5 rounded-md border border-slate-200 shadow-2xs focus:border-sky-500 outline-none cursor-pointer truncate"
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
          <div className="flex items-center gap-2 flex-1 min-w-[160px]">
            <input
              type="text"
              autoFocus
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              placeholder="New category name..."
              className="w-full bg-white text-slate-900 font-bold text-xs px-3 py-2.5 rounded-md border border-sky-400 shadow-2xs focus:border-sky-600 outline-none"
            />
            <button
              type="button"
              onClick={() => setIsCreatingCategory(false)}
              className="px-3 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-black rounded-md cursor-pointer shrink-0"
            >
              Cancel
            </button>
          </div>
        )}
      </div>

      {/* ERROR ALERT */}
      {errorMsg && (
        <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold rounded-md flex items-center gap-2.5">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* 2. DROP ZONE */}
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
        } rounded-lg p-8 transition-all text-center relative cursor-pointer group`}
      >
        <input
          type="file"
          multiple
          accept="application/pdf,.pdf"
          onChange={handleFileInputChange}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
        />
        <div className="flex flex-col items-center justify-center space-y-3 pointer-events-none">
          <div className="w-14 h-14 rounded-lg bg-white border border-slate-200 group-hover:border-sky-300 flex items-center justify-center text-[#0c4a6e] shadow-xs">
            <Upload className="w-6 h-6" />
          </div>
          <div>
            <p className="text-base font-black text-[#0c4a6e] whitespace-nowrap">
              Choose up to 50 PDF Charts or Drag & Drop
            </p>
            <p className="text-xs text-slate-400 mt-1 font-medium whitespace-nowrap">
              Select multiple PDF sheet music files (Batch import up to 50 at once) ({fileEntries.length}/50 selected)
            </p>
          </div>
        </div>
      </div>

      {/* 3. SELECTED FILES LIST */}
      {fileEntries.length > 0 && (
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between text-xs font-black text-[#0c4a6e]">
            <span>
              {fileEntries.length} {fileEntries.length === 1 ? 'Chart' : 'Charts'} Selected ({totalSizeMB} MB)
            </span>
            <button
              type="button"
              onClick={() => setFileEntries([])}
              className="text-xs text-slate-400 hover:text-rose-600 font-bold cursor-pointer transition-colors"
            >
              Clear All
            </button>
          </div>

          <div className="max-h-64 overflow-y-auto space-y-2 pr-1">
            {fileEntries.map((entry, index) => (
              <div
                key={entry.id}
                className="p-3 bg-white border border-slate-200 rounded-md flex items-center gap-3 shadow-2xs"
              >
                <div className="w-6 h-6 rounded-sm bg-slate-100 flex items-center justify-center text-[11px] font-black text-slate-500 shrink-0">
                  {index + 1}
                </div>
                <FileText className="w-5 h-5 text-rose-600 shrink-0" />
                <div className="flex-1 min-w-0">
                  <input
                    type="text"
                    value={entry.title}
                    onChange={(e) => handleUpdateTitle(entry.id, e.target.value)}
                    placeholder="Chart title"
                    className="w-full px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-sm text-xs font-bold text-[#0c4a6e] focus:bg-white focus:border-sky-500 outline-none"
                  />
                  <p className="text-[10px] text-slate-400 mt-0.5 truncate pl-0.5">
                    {entry.file.name} ({(entry.file.size / (1024 * 1024)).toFixed(2)} MB)
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleRemoveFile(entry.id)}
                  className="p-2 text-slate-300 hover:text-rose-600 rounded-sm cursor-pointer transition-colors shrink-0"
                  title="Remove"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>

          <div className="pt-3 flex items-center gap-3">
            <label className="px-4 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md font-black text-xs uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2 shrink-0 whitespace-nowrap">
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
              className={`flex-1 py-3.5 text-white rounded-md font-black text-xs uppercase tracking-wider transition-all cursor-pointer shadow-md flex items-center justify-center gap-2 whitespace-nowrap ${
                section === 'technique'
                  ? 'bg-purple-900 hover:bg-purple-950'
                  : 'bg-[#0c4a6e] hover:bg-[#073652]'
              }`}
            >
              <Check className="w-4 h-4 stroke-[2.5]" />
              <span>
                {`Upload ${fileEntries.length} ${
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

