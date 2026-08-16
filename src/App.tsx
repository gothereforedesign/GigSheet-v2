/**
 * GigSheet - Sheet Music Directory & Performance Manager
 */

import React, { useState, useEffect, useRef } from 'react';
import { Plus, X, Upload, FolderEdit } from 'lucide-react';
import { 
  Song, ActiveTab, ViewFilterState 
} from './types';
import { 
  getAllSongs, saveSong, saveSongsBatch, deleteSong, deleteSongsBatch, toggleSongFavorite
} from './lib/db';
import { 
  getStoredCategories, 
  saveStoredCategories, 
  getStoredCategoryColors, 
  saveStoredCategoryColors, 
  getCategoryPalette,
  DEFAULT_SHEET_MUSIC_CATEGORIES, 
  DEFAULT_SHEET_MUSIC_COLORS,
  DEFAULT_TECHNIQUE_CATEGORIES,
  DEFAULT_TECHNIQUE_COLORS,
  CategoryColorKey 
} from './lib/categoryStorage';

import { Header } from './components/Header';
import { BottomNav } from './components/BottomNav';
import { LibraryView } from './components/LibraryView';
import { TrashView } from './components/TrashView';
import { SongViewerModal } from './components/SongViewerModal';
import { UploadModal } from './components/UploadModal';
import { EditSongModal } from './components/EditSongModal';
import { CategoryManagerModal } from './components/CategoryManagerModal';
import { BottomDrawer } from './components/BottomDrawer';
import { UploadProgressWidget } from './components/UploadProgressWidget';
import { usePDFUploadQueue } from './hooks/usePDFUploadQueue';
import { BUNDLED_SAMPLE_SONGS } from './lib/sampleSongs';
import { BatchPDFUploader } from './components/BatchPDFUploader';
import { PDFLibrary } from './components/PDFLibrary';

export default function App() {
  // Navigation Route State
  const [activeTab, setActiveTab] = useState<ActiveTab>('sheet_music');
  const section: 'sheet_music' | 'technique' = activeTab === 'technique' ? 'technique' : 'sheet_music';

  // Data State
  const [songs, setSongs] = useState<Song[]>([]);
  
  // Categories per section
  const [sheetMusicCategories, setSheetMusicCategories] = useState<string[]>(() => getStoredCategories('sheet_music'));
  const [sheetMusicColors, setSheetMusicColors] = useState<Record<string, CategoryColorKey>>(() => getStoredCategoryColors('sheet_music'));
  
  const [techniqueCategories, setTechniqueCategories] = useState<string[]>(() => getStoredCategories('technique'));
  const [techniqueColors, setTechniqueColors] = useState<Record<string, CategoryColorKey>>(() => getStoredCategoryColors('technique'));

  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Active section categories
  const currentCategories = section === 'technique' ? techniqueCategories : sheetMusicCategories;
  const currentCategoryColors = section === 'technique' ? techniqueColors : sheetMusicColors;

  // Filter & Search State
  const [filterState, setFilterState] = useState<ViewFilterState>({
    searchQuery: '',
    genreFilter: '',
    keyFilter: '',
    typeFilter: '',
    favoriteOnly: false,
    sortBy: 'title',
    sortOrder: 'asc',
  });

  // Modal / Viewer Overlay State
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [activeSongForViewer, setActiveSongForViewer] = useState<Song | null>(null);

  const [isUploadOpen, setIsUploadOpen] = useState<boolean>(false);
  const [isCategoryManagerOpen, setIsCategoryManagerOpen] = useState<boolean>(false);
  const [initialFilesForUpload, setInitialFilesForUpload] = useState<File[] | null>(null);
  const [songToEdit, setSongToEdit] = useState<Song | null>(null);
  const [isSavingSongs, setIsSavingSongs] = useState<boolean>(false);
  const [isGlobalDragging, setIsGlobalDragging] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragCounterRef = useRef<number>(0);

  // Load IndexedDB Data on Mount
  const loadSongs = async () => {
    try {
      const loadedSongs = await getAllSongs();
      setSongs(loadedSongs);
    } catch (err) {
      console.error('Failed to reload songs:', err);
    }
  };

  const uploadQueue = usePDFUploadQueue(loadSongs);

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        if (typeof navigator !== 'undefined' && navigator.storage && navigator.storage.persist) {
          navigator.storage.persist().catch(() => {});
        }
        const loadedSongs = await getAllSongs();
        setSongs(loadedSongs);
      } catch (err) {
        console.error('Failed to load DB:', err);
        setSongs(BUNDLED_SAMPLE_SONGS);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  // Global Drag and Drop Interceptor to PREVENT browser page navigation/resets
  useEffect(() => {
    const handleDragEnter = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      dragCounterRef.current += 1;
      if (e.dataTransfer && e.dataTransfer.types && (e.dataTransfer.types.includes('Files') || Array.from(e.dataTransfer.types).includes('Files'))) {
        setIsGlobalDragging(true);
      }
    };

    const handleDragOver = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (e.dataTransfer) {
        e.dataTransfer.dropEffect = 'copy';
      }
    };

    const handleDragLeave = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      dragCounterRef.current -= 1;
      if (dragCounterRef.current <= 0) {
        dragCounterRef.current = 0;
        setIsGlobalDragging(false);
      }
    };

    const handleDrop = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      dragCounterRef.current = 0;
      setIsGlobalDragging(false);

      if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        const droppedFiles = Array.from(e.dataTransfer.files);
        setInitialFilesForUpload(droppedFiles);
        setIsUploadOpen(true);
      }
    };

    window.addEventListener('dragenter', handleDragEnter);
    window.addEventListener('dragover', handleDragOver);
    window.addEventListener('dragleave', handleDragLeave);
    window.addEventListener('drop', handleDrop);

    document.addEventListener('dragenter', handleDragEnter);
    document.addEventListener('dragover', handleDragOver);
    document.addEventListener('dragleave', handleDragLeave);
    document.addEventListener('drop', handleDrop);

    return () => {
      window.removeEventListener('dragenter', handleDragEnter);
      window.removeEventListener('dragover', handleDragOver);
      window.removeEventListener('dragleave', handleDragLeave);
      window.removeEventListener('drop', handleDrop);

      document.removeEventListener('dragenter', handleDragEnter);
      document.removeEventListener('dragover', handleDragOver);
      document.removeEventListener('dragleave', handleDragLeave);
      document.removeEventListener('drop', handleDrop);
    };
  }, []);

  // Sync Hash Route with Navigation
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.toLowerCase();
      if (hash.startsWith('#trash')) {
        setActiveTab('trash');
      } else if (hash.startsWith('#technique')) {
        setActiveTab('technique');
      } else if (hash.startsWith('#sheet_music') || hash.startsWith('#library') || hash === '') {
        setActiveTab('sheet_music');
      }
    };

    handleHashChange();
    window.addEventListener('popstate', handleHashChange);
    return () => window.removeEventListener('popstate', handleHashChange);
  }, []);

  // Bottom Tab Select Handler
  const handleSelectTab = (tab: ActiveTab) => {
    setActiveTab(tab);
    setSelectedCategory(null);
    setFilterState((prev) => ({ ...prev, searchQuery: '' }));
    window.history.replaceState(null, '', `#${tab}`);
  };

  // Song Batch Save
  const handleSaveSongs = async (
    newSongs: Song[],
    onProgress?: (processed: number, total: number) => void
  ) => {
    setIsSavingSongs(true);
    try {
      await saveSongsBatch(newSongs, onProgress);
      const updated = await getAllSongs();
      setSongs(updated);

      if (newSongs.length > 0) {
        const firstSong = newSongs[0];
        const uploadedSection = firstSong.section || 'sheet_music';
        const uploadedCategory = firstSong.genre;

        if (uploadedCategory) {
          handleAddCategory(uploadedCategory, undefined, uploadedSection);
        }

        if (uploadedSection !== section) {
          setActiveTab(uploadedSection);
        }

        if (uploadedCategory) {
          setSelectedCategory(uploadedCategory);
        }
      }
    } catch (err) {
      console.error('Batch save failed:', err);
      throw err;
    } finally {
      setIsSavingSongs(false);
    }
  };

  // Soft Delete Song (Move to Trash)
  const handleSoftDeleteSong = async (id: string) => {
    const target = songs.find((s) => s.id === id);
    if (target) {
      const updatedSong: Song = { ...target, deletedAt: Date.now() };
      await saveSong(updatedSong);
      const updated = await getAllSongs();
      setSongs(updated);
    }
  };

  // Restore Song from Trash
  const handleRestoreSong = async (id: string) => {
    const target = songs.find((s) => s.id === id);
    if (target) {
      const updatedSong: Song = { ...target };
      delete updatedSong.deletedAt;
      await saveSong(updatedSong);
      const updated = await getAllSongs();
      setSongs(updated);
    }
  };

  // Permanently Delete Song from DB
  const handlePermanentDeleteSong = async (id: string) => {
    await deleteSong(id);
    const updated = await getAllSongs();
    setSongs(updated);
  };

  // Permanently Empty All Trash
  const handleEmptyTrash = async () => {
    const trashed = songs.filter((s) => !!s.deletedAt);
    if (trashed.length === 0) return;
    try {
      await deleteSongsBatch(trashed.map((s) => s.id));
      const updated = await getAllSongs();
      setSongs(updated);
    } catch (err) {
      console.error('Error emptying trash:', err);
      const updated = await getAllSongs();
      setSongs(updated);
    }
  };

  const handleToggleFavorite = async (id: string) => {
    await toggleSongFavorite(id);
    const updated = await getAllSongs();
    setSongs(updated);
  };

  const handleUpdateSong = async (updatedSong: Song) => {
    await saveSong(updatedSong);
    const updated = await getAllSongs();
    setSongs(updated);
    setSongToEdit(null);
  };

  // Category Management Handlers
  const handleAddCategory = (
    newCategoryName: string, 
    color?: CategoryColorKey,
    targetSection?: 'sheet_music' | 'technique'
  ) => {
    const trimmed = newCategoryName.trim();
    if (!trimmed) return;
    const activeSection = targetSection || section;
    const list = activeSection === 'technique' ? techniqueCategories : sheetMusicCategories;
    const colorList = activeSection === 'technique' ? techniqueColors : sheetMusicColors;

    if (list.some((g) => g.toLowerCase() === trimmed.toLowerCase())) return;

    const updated = [...list, trimmed];
    const defaultPalette: CategoryColorKey = activeSection === 'technique' ? 'violet' : 'sky';
    const updatedColors = { ...colorList, [trimmed]: color || defaultPalette };

    if (activeSection === 'technique') {
      setTechniqueCategories(updated);
      setTechniqueColors(updatedColors);
      saveStoredCategories('technique', updated);
      saveStoredCategoryColors('technique', updatedColors);
    } else {
      setSheetMusicCategories(updated);
      setSheetMusicColors(updatedColors);
      saveStoredCategories('sheet_music', updated);
      saveStoredCategoryColors('sheet_music', updatedColors);
    }
  };

  const handleUpdateCategoryColor = (category: string, color: CategoryColorKey) => {
    const updatedColors = { ...currentCategoryColors, [category]: color };
    if (section === 'technique') {
      setTechniqueColors(updatedColors);
      saveStoredCategoryColors('technique', updatedColors);
    } else {
      setSheetMusicColors(updatedColors);
      saveStoredCategoryColors('sheet_music', updatedColors);
    }
  };

  const handleRenameCategory = async (oldCategoryName: string, newCategoryName: string) => {
    const trimmed = newCategoryName.trim();
    if (!trimmed) return;

    const updatedCategories = currentCategories.map((g) => (g === oldCategoryName ? trimmed : g));
    const uniqueCategories = Array.from(new Set<string>(updatedCategories));

    const updatedColors = { ...currentCategoryColors };
    if (updatedColors[oldCategoryName]) {
      updatedColors[trimmed] = updatedColors[oldCategoryName];
      delete updatedColors[oldCategoryName];
    }

    if (section === 'technique') {
      setTechniqueCategories(uniqueCategories);
      setTechniqueColors(updatedColors);
      saveStoredCategories('technique', uniqueCategories);
      saveStoredCategoryColors('technique', updatedColors);
    } else {
      setSheetMusicCategories(uniqueCategories);
      setSheetMusicColors(updatedColors);
      saveStoredCategories('sheet_music', uniqueCategories);
      saveStoredCategoryColors('sheet_music', updatedColors);
    }

    // Update songs matching old category spelling
    const defaultCat = section === 'technique' ? 'Scales' : 'Hymns';
    const affected = songs.filter((s) => {
      if (section === 'technique' && s.section !== 'technique') return false;
      if (section === 'sheet_music' && s.section === 'technique') return false;
      return (s.genre || defaultCat) === oldCategoryName;
    });

    if (affected.length > 0) {
      const updatedSongs = affected.map((s) => ({
        ...s,
        genre: trimmed,
        dateModified: Date.now(),
      }));
      await saveSongsBatch(updatedSongs);
      const reloaded = await getAllSongs();
      setSongs(reloaded);
    }
  };

  const handleDeleteCategory = async (categoryToDelete: string) => {
    if (selectedCategory === categoryToDelete) {
      setSelectedCategory(null);
    }
    const updatedCategories = currentCategories.filter((g) => g !== categoryToDelete);

    const updatedColors = { ...currentCategoryColors };
    delete updatedColors[categoryToDelete];

    if (section === 'technique') {
      setTechniqueCategories(updatedCategories);
      setTechniqueColors(updatedColors);
      saveStoredCategories('technique', updatedCategories);
      saveStoredCategoryColors('technique', updatedColors);
    } else {
      setSheetMusicCategories(updatedCategories);
      setSheetMusicColors(updatedColors);
      saveStoredCategories('sheet_music', updatedCategories);
      saveStoredCategoryColors('sheet_music', updatedColors);
    }

    // Move any active songs in this deleted category directly to Trash
    const now = Date.now();
    const defaultCat = section === 'technique' ? 'Scales' : 'Hymns';
    const affected = songs.filter((s) => {
      if (s.deletedAt) return false;
      if (section === 'technique' && s.section !== 'technique') return false;
      if (section === 'sheet_music' && s.section === 'technique') return false;
      return (s.genre || defaultCat) === categoryToDelete;
    });

    if (affected.length > 0) {
      const updatedSongs = affected.map((s) => ({
        ...s,
        deletedAt: now,
        dateModified: now,
      }));
      await saveSongsBatch(updatedSongs);
      const reloaded = await getAllSongs();
      setSongs(reloaded);
    }
  };

  const handleResetCategories = () => {
    if (section === 'technique') {
      setTechniqueCategories(DEFAULT_TECHNIQUE_CATEGORIES);
      setTechniqueColors(DEFAULT_TECHNIQUE_COLORS);
      saveStoredCategories('technique', DEFAULT_TECHNIQUE_CATEGORIES);
      saveStoredCategoryColors('technique', DEFAULT_TECHNIQUE_COLORS);
    } else {
      setSheetMusicCategories(DEFAULT_SHEET_MUSIC_CATEGORIES);
      setSheetMusicColors(DEFAULT_SHEET_MUSIC_COLORS);
      saveStoredCategories('sheet_music', DEFAULT_SHEET_MUSIC_CATEGORIES);
      saveStoredCategoryColors('sheet_music', DEFAULT_SHEET_MUSIC_COLORS);
    }
  };

  // Open Viewer for single song
  const handleOpenSongViewer = (song: Song) => {
    setActiveSongForViewer(song);
  };

  // Active vs Trashed songs
  const activeSongs = songs.filter((s) => !s.deletedAt);
  const sectionSongs = activeSongs.filter((s) => {
    if (activeTab === 'technique') {
      return s.section === 'technique';
    }
    return s.section !== 'technique';
  });
  const trashedSongs = songs.filter((s) => !!s.deletedAt);

  // Filter Logic for Viewer Navigation Context
  const getFilteredSongs = () => {
    return sectionSongs.sort((a, b) => a.title.localeCompare(b.title));
  };

  // Fullscreen Sheet Music Viewer Modal
  const renderViewerModal = () => {
    if (!activeSongForViewer) return null;

    const currentList = getFilteredSongs();
    const currentIndex = currentList.findIndex(s => s.id === activeSongForViewer.id);
    
    let navigationContext;
    if (currentIndex !== -1) {
      navigationContext = {
        currentIndex,
        totalCount: currentList.length,
        listName: section === 'technique' ? 'Technique Directory' : 'Sheet Music Directory',
        onNavigate: (newIdx: number) => {
          const nextSong = currentList[newIdx];
          if (nextSong) {
            setActiveSongForViewer(nextSong);
          }
        }
      };
    }

    return (
      <SongViewerModal
        song={activeSongForViewer}
        onClose={() => {
          setActiveSongForViewer(null);
          if (window.location.hash.includes('song')) {
            window.history.replaceState(null, '', `#${activeTab}`);
          }
        }}
        navigation={navigationContext}
      />
    );
  };

  const activeCategoryPalette = selectedCategory ? getCategoryPalette(selectedCategory, currentCategoryColors, section) : null;

  return (
    <div className={`min-h-screen font-sans selection:bg-sky-200 ${
      activeCategoryPalette ? `${activeCategoryPalette.cardBg} text-white` : 'bg-slate-50 text-slate-900'
    }`}>
      {/* Fullscreen Global Drag & Drop Target Overlay */}
      {isGlobalDragging && (
        <div className={`fixed inset-0 z-50 backdrop-blur-md flex flex-col items-center justify-center text-white p-6 animate-in fade-in duration-200 ${
          section === 'technique' ? 'bg-purple-950/90' : 'bg-[#0c4a6e]/90'
        }`}>
          <div className="p-6 bg-white/10 rounded-3xl border-2 border-dashed border-white/40 flex flex-col items-center space-y-3 max-w-sm w-full text-center shadow-2xl">
            <div className={`w-16 h-16 rounded-2xl bg-white flex items-center justify-center shadow-lg animate-bounce ${
              section === 'technique' ? 'text-purple-900' : 'text-[#0c4a6e]'
            }`}>
              <Upload className="w-8 h-8 stroke-[2.5]" />
            </div>
            <div>
              <p className="text-base font-black uppercase tracking-wider">Drop PDF Charts Anywhere</p>
              <p className={`text-xs font-medium mt-1 ${section === 'technique' ? 'text-purple-100' : 'text-sky-100'}`}>
                Release to import all dropped music charts into directory
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Hidden File Input for Direct Upload */}
      <input
        type="file"
        multiple
        accept="application/pdf,.pdf,image/*,.xml,.mxl"
        ref={fileInputRef}
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) {
            setInitialFilesForUpload(Array.from(e.target.files));
            setIsUploadOpen(true);
            e.target.value = '';
          }
        }}
        className="sr-only"
      />

      {/* Top Header - Hidden when viewing inside a specific category or when viewing a PDF sheet */}
      {!selectedCategory && !activeSongForViewer && (
        <Header
          trashCount={trashedSongs.length}
          activeTab={activeTab}
          onSelectTab={handleSelectTab}
        />
      )}

      {/* Main View Area */}
      <main className="max-w-4xl mx-auto px-4 pt-3 pb-20">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center p-16 space-y-3">
            <div className={`w-8 h-8 border-3 border-t-transparent rounded-full animate-spin ${
              section === 'technique' ? 'border-purple-900' : 'border-[#0c4a6e]'
            }`} />
            <p className={`text-xs font-black uppercase tracking-wider ${
              section === 'technique' ? 'text-purple-900' : 'text-[#0c4a6e]'
            }`}>
              Loading Directory...
            </p>
          </div>
        ) : (
          <>
            {(activeTab === 'sheet_music' || activeTab === 'technique') && (
              <LibraryView
                songs={sectionSongs}
                genres={currentCategories}
                genreColors={currentCategoryColors}
                filterState={filterState}
                activeTab={activeTab}
                selectedCategory={selectedCategory}
                onSelectCategory={setSelectedCategory}
                onFilterChange={(f) => setFilterState((prev) => ({ ...prev, ...f }))}
                onSelectSong={handleOpenSongViewer}
                onToggleFavorite={handleToggleFavorite}
                onDeleteSong={handleSoftDeleteSong}
                onEditSong={setSongToEdit}
                onOpenGenreManager={() => setIsCategoryManagerOpen(true)}
              />
            )}

            {activeTab === 'trash' && (
              <TrashView
                trashedSongs={trashedSongs}
                onRestoreSong={handleRestoreSong}
                onPermanentDeleteSong={handlePermanentDeleteSong}
                onEmptyTrash={handleEmptyTrash}
              />
            )}

            {activeTab === 'dexie' && (
              <div className="space-y-6">
                <BatchPDFUploader />
                <PDFLibrary />
              </div>
            )}
          </>
        )}
      </main>

      {renderViewerModal()}

      {isUploadOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-3xl max-h-[90vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-slate-200">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
              <div>
                <h2 className="text-base font-black text-slate-900">Upload PDF Charts Batch</h2>
                <p className="text-xs text-slate-500 font-medium">Select or drop up to 50 PDF sheet music files at once</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsUploadOpen(false);
                  setInitialFilesForUpload(null);
                  if (window.location.hash.includes('upload')) {
                    window.history.replaceState(null, '', `#${activeTab}`);
                  }
                }}
                className="w-8 h-8 rounded-full bg-slate-200/80 hover:bg-slate-300 flex items-center justify-center text-slate-700 font-bold transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto flex-1">
              <UploadModal
                genres={currentCategories}
                sheetMusicCategories={sheetMusicCategories}
                techniqueCategories={techniqueCategories}
                defaultSection={activeTab === 'technique' ? 'technique' : 'sheet_music'}
                initialCategory={selectedCategory || undefined}
                initialFiles={initialFilesForUpload}
                onSaveSongs={handleSaveSongs}
                onEnqueueEntries={uploadQueue.enqueueEntries}
                onClose={() => {
                  setIsUploadOpen(false);
                  setInitialFilesForUpload(null);
                  if (window.location.hash.includes('upload')) {
                    window.history.replaceState(null, '', `#${activeTab}`);
                  }
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Floating Google Drive-Style Upload Progress Widget */}
      <UploadProgressWidget
        items={uploadQueue.items}
        isOpen={uploadQueue.isOpen}
        isMinimized={uploadQueue.isMinimized}
        setIsMinimized={uploadQueue.setIsMinimized}
        quotaError={uploadQueue.quotaError}
        onCancel={uploadQueue.cancelItem}
        onRetry={uploadQueue.retryItem}
        onClearCompleted={uploadQueue.clearCompleted}
        onDismiss={uploadQueue.dismissWidget}
      />

      <BottomDrawer
        isOpen={!!songToEdit}
        onClose={() => setSongToEdit(null)}
        title="Edit Chart Info"
      >
        {songToEdit && (
          <EditSongModal
            song={songToEdit}
            genres={currentCategories}
            onSave={handleUpdateSong}
            onClose={() => setSongToEdit(null)}
          />
        )}
      </BottomDrawer>

      <BottomDrawer
        isOpen={isCategoryManagerOpen}
        onClose={() => setIsCategoryManagerOpen(false)}
        title={`Edit ${section === 'technique' ? 'Technique' : 'Sheet Music'} Categories`}
      >
        <CategoryManagerModal
          section={section}
          categories={currentCategories}
          categoryColors={currentCategoryColors}
          songs={songs}
          onAddCategory={handleAddCategory}
          onRenameCategory={handleRenameCategory}
          onUpdateCategoryColor={handleUpdateCategoryColor}
          onDeleteCategory={handleDeleteCategory}
          onResetCategories={handleResetCategories}
          onClose={() => setIsCategoryManagerOpen(false)}
        />
      </BottomDrawer>

      {/* Fixed Bottom Navigation Bar */}
      <BottomNav
        activeTab={activeTab}
        onSelectTab={handleSelectTab}
        onOpenCategoryManager={() => setIsCategoryManagerOpen(true)}
        onAddPdf={() => {
          setIsUploadOpen(true);
        }}
      />
    </div>
  );
}
