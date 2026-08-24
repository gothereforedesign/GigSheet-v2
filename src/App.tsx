/**
 * GigSheet - Sheet Music Directory & Performance Manager
 */

import React, { useState, useEffect, useRef } from 'react';
import { Plus, X, Upload, FolderEdit } from 'lucide-react';
import { 
  Song, ActiveTab, ViewFilterState, Setlist 
} from './types';
import { 
  getAllSongs, saveSong, saveSongsBatch, deleteSong, deleteSongsBatch, toggleSongFavorite,
  getAllSetlists, saveSetlist, deleteSetlist
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
import { SetlistsView } from './components/SetlistsView';
import { AddToSetlistModal } from './components/AddToSetlistModal';
import { TrashView } from './components/TrashView';
import { SongViewerModal } from './components/SongViewerModal';
import { UploadModal } from './components/UploadModal';
import { EditSongModal } from './components/EditSongModal';
import { CategoryManagerModal } from './components/CategoryManagerModal';
import { BackupModal } from './components/BackupModal';
import { BottomDrawer } from './components/BottomDrawer';
import { UploadProgressWidget } from './components/UploadProgressWidget';
import { usePDFUploadQueue } from './hooks/usePDFUploadQueue';
import { BUNDLED_SAMPLE_SONGS } from './lib/sampleSongs';

const NAV_STATE_KEY = 'gig_sheet_nav_state';

interface NavState {
  activeTab: ActiveTab;
  selectedCategory: string | null;
  activeSongId: string | null;
}

const getInitialNavState = (): NavState => {
  let navState: NavState = {
    activeTab: 'sheet_music',
    selectedCategory: null,
    activeSongId: null,
  };

  try {
    const stored = localStorage.getItem(NAV_STATE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed && typeof parsed === 'object') {
        if (['sheet_music', 'sheet_music_setlists', 'technique', 'technique_routines', 'trash'].includes(parsed.activeTab)) {
          navState.activeTab = parsed.activeTab as ActiveTab;
        }
        if (typeof parsed.selectedCategory === 'string' || parsed.selectedCategory === null) {
          navState.selectedCategory = parsed.selectedCategory;
        }
        if (typeof parsed.activeSongId === 'string' || parsed.activeSongId === null) {
          navState.activeSongId = parsed.activeSongId;
        }
      }
    }

    const hash = window.location.hash;
    if (hash && hash.length > 1) {
      const hashContent = decodeURIComponent(hash.substring(1));
      if (hashContent.startsWith('song=')) {
        navState.activeSongId = hashContent.replace('song=', '');
      } else {
        const parts = hashContent.split('/');
        const tabPart = parts[0].toLowerCase() as ActiveTab;
        if (['sheet_music', 'sheet_music_setlists', 'technique', 'technique_routines', 'trash'].includes(tabPart)) {
          navState.activeTab = tabPart;
          if (parts.length > 1 && parts[1].trim()) {
            navState.selectedCategory = parts[1].trim();
          }
        }
      }
    }
  } catch (err) {
    console.warn('Failed to parse nav state:', err);
  }

  return navState;
};

export default function App() {
  // Theme state
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem('gig_sheet_theme');
      if (stored) return stored === 'dark';
      return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      if (isDarkMode) {
        document.documentElement.classList.add('dark');
        localStorage.setItem('gig_sheet_theme', 'dark');
      } else {
        document.documentElement.classList.remove('dark');
        localStorage.setItem('gig_sheet_theme', 'light');
      }
    } catch (err) {
      console.warn('Failed to persist theme state:', err);
    }
  }, [isDarkMode]);

  const handleToggleDarkMode = () => {
    setIsDarkMode((prev) => !prev);
  };

  // Navigation Route State (restored on refresh)
  const initialNavStateRef = useRef<NavState>(getInitialNavState());
  const [activeTab, setActiveTab] = useState<ActiveTab>(initialNavStateRef.current.activeTab);
  const section: 'sheet_music' | 'technique' = (activeTab === 'technique' || activeTab === 'technique_routines') ? 'technique' : 'sheet_music';

  // Data State
  const [songs, setSongs] = useState<Song[]>([]);
  const [setlists, setSetlists] = useState<Setlist[]>([]);
  const [songForAddToSetlist, setSongForAddToSetlist] = useState<Song | null>(null);
  const [activeSetlistContext, setActiveSetlistContext] = useState<{ setlist: Setlist; startIndex: number } | null>(null);
  
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
  const [selectedCategory, setSelectedCategory] = useState<string | null>(initialNavStateRef.current.selectedCategory);
  const [activeSongForViewer, setActiveSongForViewer] = useState<Song | null>(null);
  const savedSongIdRef = useRef<string | null>(initialNavStateRef.current.activeSongId);

  const [isUploadOpen, setIsUploadOpen] = useState<boolean>(false);
  const [isCategoryManagerOpen, setIsCategoryManagerOpen] = useState<boolean>(false);
  const [isBackupOpen, setIsBackupOpen] = useState<boolean>(false);
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

  const loadSetlists = async () => {
    try {
      const loadedSetlists = await getAllSetlists();
      setSetlists(loadedSetlists);
    } catch (err) {
      console.error('Failed to load setlists:', err);
    }
  };

  const handleCreateSetlist = async (name: string, description?: string, targetSection?: 'sheet_music' | 'technique'): Promise<Setlist | undefined> => {
    const newSetlist: Setlist = {
      id: `set_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      name,
      description,
      dateCreated: Date.now(),
      dateModified: Date.now(),
      items: [],
      type: targetSection || (section === 'technique' ? 'technique' : 'sheet_music'),
    };
    await saveSetlist(newSetlist);
    await loadSetlists();
    return newSetlist;
  };

  const handleUpdateSetlist = async (updatedSetlist: Setlist) => {
    await saveSetlist(updatedSetlist);
    await loadSetlists();
  };

  const handleDeleteSetlist = async (id: string) => {
    await deleteSetlist(id);
    await loadSetlists();
  };

  const handleOpenSetlistPerformance = (setlist: Setlist, startIndex = 0) => {
    const item = setlist.items[startIndex];
    if (!item) return;
    const song = songs.find((s) => s.id === item.songId);
    if (song) {
      setActiveSetlistContext({ setlist, startIndex });
      setActiveSongForViewer(song);
    }
  };

  const handleSaveSetlistsForSong = async (songId: string, updatedSetlistIds: string[]) => {
    const targetSec = songForAddToSetlist?.section || section;
    const relevantSetlists = setlists.filter((s) => (s.type || 'sheet_music') === targetSec);

    for (const setlist of relevantSetlists) {
      const belongs = updatedSetlistIds.includes(setlist.id);
      const hasSong = setlist.items.some((item) => item.songId === songId);

      if (belongs && !hasSong) {
        const newItems = [...setlist.items, { songId }];
        await saveSetlist({ ...setlist, items: newItems, dateModified: Date.now() });
      } else if (!belongs && hasSong) {
        const newItems = setlist.items.filter((item) => item.songId !== songId);
        await saveSetlist({ ...setlist, items: newItems, dateModified: Date.now() });
      }
    }
    await loadSetlists();
    setSongForAddToSetlist(null);
  };

  const handleOpenBackupModal = () => setIsBackupOpen(true);
  const handleCloseBackupModal = () => setIsBackupOpen(false);
  const handleLibraryReload = async () => {
    await loadSongs();
    await loadSetlists();
    setSheetMusicCategories(getStoredCategories('sheet_music'));
    setSheetMusicColors(getStoredCategoryColors('sheet_music'));
    setTechniqueCategories(getStoredCategories('technique'));
    setTechniqueColors(getStoredCategoryColors('technique'));
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
        await loadSetlists();

        // Restore active song viewer if saved across refresh
        if (savedSongIdRef.current) {
          const matchingSong = loadedSongs.find((s) => s.id === savedSongIdRef.current);
          if (matchingSong) {
            setActiveSongForViewer(matchingSong);
          }
        }
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
        handleOpenUploadModal(droppedFiles);
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

  // Track songs ref for popstate event listener
  const songsRef = useRef<Song[]>(songs);
  useEffect(() => {
    songsRef.current = songs;
  }, [songs]);

  // Navigation History State Interface
  interface NavHistoryState {
    depth: number;
    activeTab: ActiveTab;
    selectedCategory: string | null;
    activeSongId: string | null;
    isUploadOpen: boolean;
    isCategoryManagerOpen: boolean;
    songToEditId: string | null;
  }

  // Helper to push a new breadcrumb navigation step onto HTML5 history
  const pushNavState = (overrides: Partial<NavHistoryState>) => {
    const currentDepth = typeof window.history.state?.depth === 'number' ? window.history.state.depth : 0;
    const newDepth = currentDepth + 1;

    const nextTab = overrides.activeTab ?? activeTab;
    const nextCategory = overrides.selectedCategory !== undefined ? overrides.selectedCategory : selectedCategory;
    const nextSongId = overrides.activeSongId !== undefined ? overrides.activeSongId : (activeSongForViewer ? activeSongForViewer.id : null);
    const nextUploadOpen = overrides.isUploadOpen !== undefined ? overrides.isUploadOpen : isUploadOpen;
    const nextCategoryManagerOpen = overrides.isCategoryManagerOpen !== undefined ? overrides.isCategoryManagerOpen : isCategoryManagerOpen;
    const nextSongToEditId = overrides.songToEditId !== undefined ? overrides.songToEditId : (songToEdit ? songToEdit.id : null);

    const newState: NavHistoryState = {
      depth: newDepth,
      activeTab: nextTab,
      selectedCategory: nextCategory,
      activeSongId: nextSongId,
      isUploadOpen: nextUploadOpen,
      isCategoryManagerOpen: nextCategoryManagerOpen,
      songToEditId: nextSongToEditId,
    };

    let newHash = `#${nextTab}`;
    if (nextSongId) {
      newHash = `#song=${encodeURIComponent(nextSongId)}`;
    } else if (nextCategory) {
      newHash = `#${nextTab}/${encodeURIComponent(nextCategory)}`;
    } else if (nextUploadOpen) {
      newHash = `#${nextTab}/upload`;
    }

    window.history.pushState(newState, '', newHash);
  };

  // Helper to step back one breadcrumb (or reset state if history depth is 0)
  const goBackOrReset = (resetState: Partial<NavHistoryState>) => {
    if (typeof window.history.state?.depth === 'number' && window.history.state.depth > 0) {
      window.history.back();
    } else {
      if (resetState.selectedCategory !== undefined) setSelectedCategory(resetState.selectedCategory);
      if (resetState.activeSongId !== undefined) setActiveSongForViewer(null);
      if (resetState.isUploadOpen !== undefined) setIsUploadOpen(false);
      if (resetState.isCategoryManagerOpen !== undefined) setIsCategoryManagerOpen(false);
      if (resetState.songToEditId !== undefined) setSongToEdit(null);
    }
  };

  // Explicit Navigation Handlers
  const handleSelectCategory = (cat: string | null) => {
    if (cat === selectedCategory) return;
    if (cat !== null) {
      setSelectedCategory(cat);
      pushNavState({ selectedCategory: cat });
    } else {
      goBackOrReset({ selectedCategory: null });
    }
  };

  const handleOpenSongViewer = (song: Song) => {
    setActiveSongForViewer(song);
    pushNavState({ activeSongId: song.id });
  };

  const handleCloseSongViewer = () => {
    setActiveSetlistContext(null);
    goBackOrReset({ activeSongId: null });
  };

  const handleOpenUploadModal = (files?: File[]) => {
    if (files) setInitialFilesForUpload(files);
    setIsUploadOpen(true);
    pushNavState({ isUploadOpen: true });
  };

  const handleCloseUploadModal = () => {
    setIsUploadOpen(false);
    setInitialFilesForUpload(null);
    goBackOrReset({ isUploadOpen: false });
  };

  const handleOpenCategoryManager = () => {
    setIsCategoryManagerOpen(true);
    pushNavState({ isCategoryManagerOpen: true });
  };

  const handleCloseCategoryManager = () => {
    setIsCategoryManagerOpen(false);
    goBackOrReset({ isCategoryManagerOpen: false });
  };

  const handleOpenEditSong = (song: Song | null) => {
    setSongToEdit(song);
    if (song) {
      pushNavState({ songToEditId: song.id });
    } else {
      goBackOrReset({ songToEditId: null });
    }
  };

  const handleCloseEditSong = () => {
    setSongToEdit(null);
    goBackOrReset({ songToEditId: null });
  };

  const handleEnqueueUploads = (
    entries: { file: File; title?: string }[],
    category: string,
    targetSection: 'sheet_music' | 'technique'
  ) => {
    if (category) {
      handleAddCategory(category, undefined, targetSection);
    }
    if (activeTab !== targetSection) {
      setActiveTab(targetSection);
    }
    if (category) {
      handleSelectCategory(category);
    }
    uploadQueue.enqueueEntries(entries, category, targetSection);
  };

  // Initialize History baseline on mount
  useEffect(() => {
    const nav = initialNavStateRef.current;
    const isSubLevel = !!(nav.selectedCategory || nav.activeSongId || nav.activeTab === 'trash');

    const rootTab = nav.activeTab === 'trash' ? 'sheet_music' : nav.activeTab;
    const rootState: NavHistoryState = {
      depth: 0,
      activeTab: rootTab,
      selectedCategory: null,
      activeSongId: null,
      isUploadOpen: false,
      isCategoryManagerOpen: false,
      songToEditId: null,
    };

    window.history.replaceState(rootState, '', `#${rootTab}`);

    if (isSubLevel) {
      let subHash = `#${nav.activeTab}`;
      if (nav.activeSongId) {
        subHash = `#song=${encodeURIComponent(nav.activeSongId)}`;
      } else if (nav.selectedCategory) {
        subHash = `#${nav.activeTab}/${encodeURIComponent(nav.selectedCategory)}`;
      }

      const subState: NavHistoryState = {
        depth: 1,
        activeTab: nav.activeTab,
        selectedCategory: nav.selectedCategory,
        activeSongId: nav.activeSongId,
        isUploadOpen: false,
        isCategoryManagerOpen: false,
        songToEditId: null,
      };

      window.history.pushState(subState, '', subHash);
    }
  }, []);

  // Handle Browser / Phone Physical Back & Forward Navigation
  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      const state = event.state as NavHistoryState | null;

      if (state) {
        setActiveTab(state.activeTab || 'sheet_music');
        setSelectedCategory(state.selectedCategory ?? null);
        setIsUploadOpen(!!state.isUploadOpen);
        setIsCategoryManagerOpen(!!state.isCategoryManagerOpen);

        if (state.activeSongId) {
          const found = songsRef.current.find((s) => s.id === state.activeSongId);
          setActiveSongForViewer(found || null);
        } else {
          setActiveSongForViewer(null);
        }

        if (state.songToEditId) {
          const found = songsRef.current.find((s) => s.id === state.songToEditId);
          setSongToEdit(found || null);
        } else {
          setSongToEdit(null);
        }
      } else {
        // Popped to root baseline
        setSelectedCategory(null);
        setActiveSongForViewer(null);
        setIsUploadOpen(false);
        setIsCategoryManagerOpen(false);
        setSongToEdit(null);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  // Persist Navigation State to localStorage for tab refreshes
  useEffect(() => {
    if (isLoading) return;

    const navState: NavState = {
      activeTab,
      selectedCategory,
      activeSongId: activeSongForViewer ? activeSongForViewer.id : null,
    };

    try {
      localStorage.setItem(NAV_STATE_KEY, JSON.stringify(navState));
    } catch (e) {
      console.warn('Failed to save nav state to localStorage:', e);
    }
  }, [activeTab, selectedCategory, activeSongForViewer, isLoading]);

  // Bottom Tab Select Handler
  const handleSelectTab = (tab: ActiveTab) => {
    if (tab === activeTab && !selectedCategory && !activeSongForViewer && !isUploadOpen && !isCategoryManagerOpen && !songToEdit) return;

    setSelectedCategory(null);
    setActiveSongForViewer(null);
    setIsUploadOpen(false);
    setIsCategoryManagerOpen(false);
    setSongToEdit(null);
    setActiveTab(tab);
    setFilterState((prev) => ({ ...prev, searchQuery: '' }));

    if (tab === 'trash') {
      pushNavState({
        activeTab: 'trash',
        selectedCategory: null,
        activeSongId: null,
        isUploadOpen: false,
        isCategoryManagerOpen: false,
        songToEditId: null,
      });
    } else {
      const rootState: NavHistoryState = {
        depth: 0,
        activeTab: tab,
        selectedCategory: null,
        activeSongId: null,
        isUploadOpen: false,
        isCategoryManagerOpen: false,
        songToEditId: null,
      };
      window.history.replaceState(rootState, '', `#${tab}`);
    }
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

  // Active vs Trashed songs
  const activeSongs = songs.filter((s) => !s.deletedAt);
  const sectionSongs = activeSongs.filter((s) => {
    if (activeTab === 'technique') {
      return s.section === 'technique';
    }
    return s.section !== 'technique';
  });
  const trashedSongs = songs.filter((s) => !!s.deletedAt);

  // Filter Logic for Viewer Navigation Context (Restricted to active category)
  const getFilteredSongsForViewer = (activeSong: Song) => {
    const isTech = section === 'technique';
    const defaultCat = isTech ? 'Scales' : 'Hymns';

    // Determine target category
    let targetCat: string | null = selectedCategory;
    if (!targetCat) {
      targetCat = activeSong.genre || defaultCat;
    }

    if (targetCat === 'ALL_SECTION_CHARTS') {
      return {
        categoryName: isTech ? 'All Technique Charts' : 'All Sheet Music Charts',
        songsList: [...sectionSongs].sort((a, b) =>
          a.title.localeCompare(b.title, undefined, { numeric: true, sensitivity: 'base' })
        ),
      };
    }

    // Filter sectionSongs by target category
    const categorySongs = sectionSongs.filter((s) => {
      const sCat = s.genre || defaultCat;
      return sCat === targetCat;
    });

    // Ensure activeSong is present in the list
    let songsList = categorySongs;
    if (!songsList.some((s) => s.id === activeSong.id)) {
      songsList = [...songsList, activeSong];
    }

    songsList.sort((a, b) =>
      a.title.localeCompare(b.title, undefined, { numeric: true, sensitivity: 'base' })
    );

    return {
      categoryName: targetCat,
      songsList,
    };
  };

  // Fullscreen Sheet Music Viewer Modal
  const renderViewerModal = () => {
    if (!activeSongForViewer) return null;

    let navigationContext;
    if (activeSetlistContext) {
      const { setlist } = activeSetlistContext;
      const setlistSongs = setlist.items
        .map((item) => songs.find((s) => s.id === item.songId))
        .filter((s): s is Song => Boolean(s));

      const currentIndex = setlistSongs.findIndex((s) => s.id === activeSongForViewer.id);
      if (currentIndex !== -1) {
        navigationContext = {
          currentIndex,
          totalCount: setlistSongs.length,
          listName: setlist.name,
          onNavigate: (newIdx: number) => {
            const nextSong = setlistSongs[newIdx];
            if (nextSong) {
              setActiveSongForViewer(nextSong);
            }
          },
        };
      }
    } else {
      const { categoryName, songsList } = getFilteredSongsForViewer(activeSongForViewer);
      const currentIndex = songsList.findIndex((s) => s.id === activeSongForViewer.id);

      if (currentIndex !== -1) {
        navigationContext = {
          currentIndex,
          totalCount: songsList.length,
          listName: categoryName,
          onNavigate: (newIdx: number) => {
            const nextSong = songsList[newIdx];
            if (nextSong) {
              setActiveSongForViewer(nextSong);
            }
          },
        };
      }
    }

    return (
      <SongViewerModal
        song={activeSongForViewer}
        onClose={handleCloseSongViewer}
        onAddToSetlist={(s) => setSongForAddToSetlist(s)}
        navigation={navigationContext}
      />
    );
  };

  const activeCategoryPalette = selectedCategory ? getCategoryPalette(selectedCategory, currentCategoryColors, section) : null;

  const getTabBgClass = () => {
    if (activeCategoryPalette) {
      return `${activeCategoryPalette.cardBg} text-white`;
    }

    if (isDarkMode) {
      switch (activeTab) {
        case 'sheet_music':
          return 'bg-slate-950 text-slate-100';
        case 'sheet_music_setlists':
          return 'bg-[#071d2c] text-slate-100';
        case 'technique':
          return 'bg-[#130d1d] text-slate-100';
        case 'technique_routines':
          return 'bg-[#1d0e2c] text-slate-100';
        case 'trash':
          return 'bg-[#1c0d11] text-slate-100';
        default:
          return 'bg-slate-950 text-slate-100';
      }
    } else {
      switch (activeTab) {
        case 'sheet_music':
          return 'bg-slate-50 text-slate-900';
        case 'sheet_music_setlists':
          return 'bg-[#f0f7fc] text-slate-900';
        case 'technique':
          return 'bg-[#fbf7fd] text-slate-900';
        case 'technique_routines':
          return 'bg-[#f5ecfc] text-slate-900';
        case 'trash':
          return 'bg-rose-50/50 text-slate-900';
        default:
          return 'bg-slate-50 text-slate-900';
      }
    }
  };

  return (
    <div className={`min-h-screen font-sans selection:bg-sky-200 transition-colors duration-200 ${getTabBgClass()}`}>
      {/* Fullscreen Global Drag & Drop Target Overlay */}
      {isGlobalDragging && (
        <div className={`fixed inset-0 z-50 backdrop-blur-md flex flex-col items-center justify-center text-white p-6 animate-in fade-in duration-200 ${
          section === 'technique' ? 'bg-purple-950/90' : 'bg-[#0c4a6e]/90'
        }`}>
          <div className="p-6 bg-white/10 rounded-xl border-2 border-dashed border-white/40 flex flex-col items-center space-y-3 max-w-sm w-full text-center shadow-2xl">
            <div className={`w-16 h-16 rounded-lg bg-white flex items-center justify-center shadow-lg animate-bounce ${
              section === 'technique' ? 'text-purple-900' : 'text-[#0c4a6e]'
            }`}>
              <Upload className="w-8 h-8 stroke-[2.5]" />
            </div>
            <div>
              <p className="text-base font-black uppercase tracking-wider whitespace-nowrap">Drop PDFs</p>
              <p className={`text-xs font-medium mt-1 whitespace-nowrap ${section === 'technique' ? 'text-purple-100' : 'text-sky-100'}`}>
                Release to import
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
            handleOpenUploadModal(Array.from(e.target.files));
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
          isDarkMode={isDarkMode}
          onToggleDarkMode={handleToggleDarkMode}
          onSelectTab={handleSelectTab}
          onOpenCategoryManager={handleOpenCategoryManager}
          onOpenBackupModal={handleOpenBackupModal}
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
                onSelectCategory={handleSelectCategory}
                onFilterChange={(f) => setFilterState((prev) => ({ ...prev, ...f }))}
                onSelectSong={handleOpenSongViewer}
                onToggleFavorite={handleToggleFavorite}
                onDeleteSong={handleSoftDeleteSong}
                onEditSong={handleOpenEditSong}
                onAddToSetlist={(song) => setSongForAddToSetlist(song)}
                onOpenGenreManager={handleOpenCategoryManager}
                trashCount={trashedSongs.length}
                onOpenTrash={() => handleSelectTab('trash')}
              />
            )}

            {(activeTab === 'sheet_music_setlists' || activeTab === 'technique_routines') && (
              <SetlistsView
                section={section}
                setlists={setlists}
                allSongs={songs.filter((s) => !s.deletedAt)}
                genreColors={currentCategoryColors}
                onCreateSetlist={handleCreateSetlist}
                onUpdateSetlist={handleUpdateSetlist}
                onDeleteSetlist={handleDeleteSetlist}
                onOpenSetlistPerformance={handleOpenSetlistPerformance}
                onSelectSong={handleOpenSongViewer}
                onEditSong={handleOpenEditSong}
                onOpenGenreManager={handleOpenCategoryManager}
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
          </>
        )}
      </main>

      {renderViewerModal()}

      {isUploadOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-3xl max-h-[90vh] rounded-xl shadow-2xl flex flex-col overflow-hidden border border-slate-200">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
              <div>
                <h2 className="text-base font-black text-slate-900">Upload PDFs</h2>
              </div>
              <button
                type="button"
                onClick={handleCloseUploadModal}
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
                onEnqueueEntries={handleEnqueueUploads}
                onClose={handleCloseUploadModal}
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
        onClose={handleCloseEditSong}
        title="Edit Chart Info"
      >
        {songToEdit && (
          <EditSongModal
            song={songToEdit}
            genres={currentCategories}
            onSave={handleUpdateSong}
            onClose={handleCloseEditSong}
          />
        )}
      </BottomDrawer>

      <BottomDrawer
        isOpen={isCategoryManagerOpen}
        onClose={handleCloseCategoryManager}
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
          onClose={handleCloseCategoryManager}
        />
      </BottomDrawer>

      {isBackupOpen && (
        <BackupModal
          onClose={handleCloseBackupModal}
          onLibraryReload={handleLibraryReload}
        />
      )}

      {songForAddToSetlist && (
        <AddToSetlistModal
          song={songForAddToSetlist}
          setlists={setlists.filter((s) => (s.type || 'sheet_music') === (songForAddToSetlist.section || 'sheet_music'))}
          onCreateSetlist={handleCreateSetlist}
          onSaveSetlistsForSong={handleSaveSetlistsForSong}
          onClose={() => setSongForAddToSetlist(null)}
        />
      )}

      {/* Fixed Bottom Navigation Bar */}
      <BottomNav
        activeTab={activeTab}
        onSelectTab={handleSelectTab}
        onOpenCategoryManager={handleOpenCategoryManager}
        onAddPdf={() => handleOpenUploadModal()}
      />
    </div>
  );
}
