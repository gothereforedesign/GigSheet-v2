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
  const [fileEntries, setFileEntries] = useState<FileEntry[]>([]);
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

  // Initializing PDFs progress state
  const [isInitializingFiles, setIsInitializingFiles] = useState<boolean>(false);
  const [initProgress, setInitProgress] = useState<{ current: number; total: number } | null>(null);

  // Keep targetCategory valid when availableCategories change
  useEffect(() => {
    if (availableCategories.length > 0 && !availableCategories.includes(targetCategory)) {
      setTargetCategory(availableCategories[0]);
    }
  }, [availableCategories, section]);

  // Process initialFiles when provided
  useEffect(() => {
    if (initialFiles && initialFiles.length > 0) {
      handleAddFiles(initialFiles);
    }
  }, [initialFiles]);

  const handleAddFiles = async (filesList: FileList | File[]) => {
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

    setIsInitializingFiles(true);
    setInitProgress({ current: 0, total: filesToAdd.length });

    const chunkSize = 5;
    let created: FileEntry[] = [];
    for (let i = 0; i < filesToAdd.length; i += chunkSize) {
      const chunk = filesToAdd.slice(i, i + chunkSize);
      const chunkEntries = createEntriesFromFiles(chunk);
      created = [...created, ...chunkEntries];
      const processedSoFar = Math.min(filesToAdd.length, i + chunk.length);
      setInitProgress({ current: processedSoFar, total: filesToAdd.length });
      await new Promise((r) => setTimeout(r, 15));
    }

    setFileEntries((prev) => {
      const existingKeys = new Set(prev.map((e) => `${e.file.name}_${e.file.size}`));
      const filtered = created.filter((e) => !existingKeys.has(`${e.file.name}_${e.file.size}`));
      return [...prev, ...filtered];
    });

    setIsInitializingFiles(false);
    setInitProgress(null);
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
          <div className="w-16 h-16 bg-sky-100 dark:bg-sky-950/80 rounded-xl mx-auto flex items-center justify-center text-sky-700 dark:text-sky-300 shadow-inner border border-sky-200 dark:border-sky-800">
            <Loader2 className="w-8 h-8 animate-spin" />
          </div>
          <h3 className="text-xl font-black text-slate-900 dark:text-slate-100">
            Processing & Uploading Charts ({processedCount} / {totalCount})
          </h3>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
            Please keep this window open while your PDF sheet music batch is securely saved.
          </p>
        </div>

        {/* Big Progress Bar */}
        <div className="space-y-2 bg-slate-50 dark:bg-slate-850/90 p-5 rounded-lg border border-slate-200 dark:border-slate-800">
          <div className="flex justify-between items-center text-sm font-black text-slate-800 dark:text-slate-200">
            <span>Overall Progress</span>
            <span className="text-sky-700 dark:text-sky-300 font-mono text-base">{percentComplete}%</span>
          </div>
          <div className="w-full h-3.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden p-0.5 shadow-inner">
            <div
              className="h-full bg-sky-600 dark:bg-sky-400 transition-all duration-300 rounded-full"
              style={{ width: `${percentComplete}%` }}
            />
          </div>
          <div className="flex justify-between text-xs font-bold text-slate-400 dark:text-slate-400 pt-1">
            <span>Completed: {processedCount} charts</span>
            <span>Remaining: {Math.max(0, totalCount - processedCount)} charts</span>
          </div>
        </div>

        {/* Live File Processing Status List */}
        <div className="space-y-2">
          <h4 className="text-xs font-black uppercase tracking-wider text-slate-400 dark:text-slate-400">
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
                      ? 'bg-emerald-50/60 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200'
                      : isCurrent
                      ? 'bg-sky-50 dark:bg-sky-950/40 border-sky-300 dark:border-sky-700 ring-2 ring-sky-100 dark:ring-sky-900/60 text-sky-900 dark:text-sky-200'
                      : 'bg-white dark:bg-slate-850/60 border-slate-200 dark:border-slate-800 text-slate-400 opacity-60'
                  }`}
                >
                  <div className="shrink-0">
                    {isCompleted ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                    ) : isCurrent ? (
                      <Loader2 className="w-5 h-5 text-sky-600 dark:text-sky-400 animate-spin" />
                    ) : (
                      <div className="w-5 h-5 rounded-full border-2 border-slate-300 dark:border-slate-600 flex items-center justify-center text-[10px] font-bold text-slate-400">
                        {index + 1}
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold truncate text-slate-800 dark:text-slate-200">
                      {entry.title}
                    </p>
                    <p className="text-[10px] text-slate-400 truncate">
                      {entry.file.name}
                    </p>
                  </div>
                  <div className="text-[11px] font-black shrink-0">
                    {isCompleted ? (
                      <span className="text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950 px-2 py-0.5 rounded-sm">Saved</span>
                    ) : isCurrent ? (
                      <span className="text-sky-700 dark:text-sky-300 bg-sky-100 dark:bg-sky-950 px-2 py-0.5 rounded-sm">Uploading...</span>
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
      <div className="bg-slate-50 dark:bg-slate-800/80 p-3.5 rounded-lg border border-slate-200/90 dark:border-slate-700 flex items-center gap-2 flex-wrap sm:flex-nowrap">
        <div className="flex items-center gap-2 shrink-0">
          <Folder className="w-4 h-4 text-sky-600 dark:text-sky-400" />
          <span className="text-xs font-black uppercase tracking-wider text-slate-600 dark:text-slate-300">Upload To</span>
        </div>

        {/* Section Dropdown */}
        <select
          value={section}
          onChange={(e) => setSection(e.target.value as 'sheet_music' | 'technique')}
          className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-bold text-xs px-3 py-2.5 rounded-md border border-slate-200 dark:border-slate-700 shadow-2xs focus:border-sky-500 outline-none cursor-pointer shrink-0"
        >
          <option value="sheet_music" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">Sheet Music</option>
          <option value="technique" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">Technique</option>
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
              className="w-full bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-bold text-xs px-3 py-2.5 rounded-md border border-slate-200 dark:border-slate-700 shadow-2xs focus:border-sky-500 outline-none cursor-pointer truncate"
            >
              {availableCategories.map((cat) => (
                <option key={cat} value={cat} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">
                  {cat}
                </option>
              ))}
              <option value="__NEW__" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">+ New Category...</option>
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
              className="w-full bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-bold text-xs px-3 py-2.5 rounded-md border border-sky-400 dark:border-sky-500 shadow-2xs focus:border-sky-600 outline-none"
            />
            <button
              type="button"
              onClick={() => setIsCreatingCategory(false)}
              className="px-3 py-2.5 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 text-xs font-black rounded-md cursor-pointer shrink-0"
            >
              Cancel
            </button>
          </div>
        )}
      </div>

      {/* ERROR ALERT */}
      {errorMsg && (
        <div className="p-3.5 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs font-bold rounded-md flex items-center gap-2.5">
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
            ? 'border-sky-600 bg-sky-50/80 dark:bg-sky-950/40 scale-[1.01]'
            : 'border-slate-300 dark:border-slate-700 hover:border-sky-500 bg-slate-50 dark:bg-slate-800/40 hover:bg-sky-50/50 dark:hover:bg-sky-950/20'
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
          <div className="w-14 h-14 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 group-hover:border-sky-300 flex items-center justify-center text-[#0c4a6e] dark:text-sky-300 shadow-xs">
            <Upload className="w-6 h-6" />
          </div>
          <div>
            <p className="text-base font-black text-[#0c4a6e] dark:text-sky-300 whitespace-nowrap">
              Choose up to 50 PDFs
            </p>
          </div>
        </div>
      </div>

      {/* INITIALIZATION PROGRESS BAR */}
      {isInitializingFiles && initProgress && (
        <div className="p-4 bg-sky-50 dark:bg-sky-950/60 border border-sky-200 dark:border-sky-800 rounded-lg space-y-2 animate-in fade-in duration-200 shadow-2xs">
          <div className="flex items-center justify-between text-xs font-bold text-sky-900 dark:text-sky-200">
            <div className="flex items-center gap-2">
              <Loader2 className="w-4 h-4 text-sky-600 dark:text-sky-400 animate-spin" />
              <span>Initializing PDFs for review ({initProgress.current} / {initProgress.total})...</span>
            </div>
            <span className="font-mono text-sky-700 dark:text-sky-400 font-extrabold">
              {Math.round((initProgress.current / Math.max(1, initProgress.total)) * 100)}%
            </span>
          </div>
          <div className="w-full h-2 bg-sky-200/80 dark:bg-sky-900/80 rounded-full overflow-hidden p-0.5">
            <div
              className="h-full bg-sky-600 dark:bg-sky-400 transition-all duration-200 rounded-full"
              style={{ width: `${Math.round((initProgress.current / Math.max(1, initProgress.total)) * 100)}%` }}
            />
          </div>
        </div>
      )}

      {/* 3. SELECTED FILES LIST & READINESS STATUS BAR */}
      {fileEntries.length > 0 && (
        <div className="space-y-3 pt-2">
          {/* Readiness Status Banner */}
          <div className="p-3 bg-[#0c4a6e]/5 dark:bg-sky-950/40 border border-[#0c4a6e]/20 dark:border-sky-800 rounded-lg space-y-1.5 shadow-2xs">
            <div className="flex items-center justify-between text-xs font-bold text-[#0c4a6e] dark:text-sky-300">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>{fileEntries.length} {fileEntries.length === 1 ? 'PDF' : 'PDFs'} Initialized & Ready for Review</span>
              </div>
              <span className="text-[10px] font-mono font-black text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800">100% Prepared</span>
            </div>
            <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
              <div className="h-full bg-emerald-500 rounded-full w-full animate-in fade-in duration-300" />
            </div>
          </div>

          <div className="flex items-center justify-between text-xs font-black text-[#0c4a6e] dark:text-sky-300">
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
                className="p-3 bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 rounded-md flex items-center gap-3 shadow-2xs"
              >
                <div className="w-6 h-6 rounded-sm bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-[11px] font-black text-slate-500 dark:text-slate-300 shrink-0">
                  {index + 1}
                </div>
                <FileText className="w-5 h-5 text-rose-600 shrink-0" />
                <div className="flex-1 min-w-0">
                  <input
                    type="text"
                    value={entry.title}
                    onChange={(e) => handleUpdateTitle(entry.id, e.target.value)}
                    placeholder="Chart title"
                    className="w-full px-2.5 py-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-sm text-xs font-bold text-[#0c4a6e] dark:text-sky-300 focus:bg-white dark:focus:bg-slate-850 focus:border-sky-500 outline-none"
                  />
                  <p className="text-[10px] text-slate-400 mt-0.5 truncate pl-0.5">
                    {entry.file.name} ({(entry.file.size / (1024 * 1024)).toFixed(2)} MB)
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleRemoveFile(entry.id)}
                  className="p-2 text-slate-300 hover:text-rose-600 dark:hover:text-rose-400 rounded-sm cursor-pointer transition-colors shrink-0"
                  title="Remove"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>

          <div className="pt-3 flex items-center gap-3">
            <label className="px-4 py-3.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-md font-black text-xs uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2 shrink-0 whitespace-nowrap border border-slate-200/80 dark:border-slate-700">
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
                  ? 'bg-purple-900 hover:bg-purple-950 dark:bg-purple-700 dark:hover:bg-purple-600'
                  : 'bg-[#0c4a6e] hover:bg-[#073652] dark:bg-sky-700 dark:hover:bg-sky-600'
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

