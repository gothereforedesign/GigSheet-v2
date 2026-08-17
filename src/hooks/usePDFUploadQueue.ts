import { useState, useEffect, useRef, useCallback } from 'react';
import { Song, SongType } from '../types';
import { checkStorageQuota, saveSongDirectDirectBlob } from '../lib/dbStorage';

export type UploadStatus = 'queued' | 'processing' | 'saving' | 'completed' | 'error';

export interface UploadQueueItem {
  id: string;
  file: File;
  name: string;
  size: number;
  progress: number; // 0 to 100
  status: UploadStatus;
  errorMessage?: string;
  category: string;
  section: 'sheet_music' | 'technique';
}

export interface UploadEntryInput {
  file: File;
  title?: string;
}

const cleanFileName = (filename: string): string => {
  return filename
    .replace(/\.[^/.]+$/, '')
    .replace(/[-_]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (l) => l.toUpperCase());
};

export function usePDFUploadQueue(onSongsUpdated?: () => void) {
  const [items, setItems] = useState<UploadQueueItem[]>([]);
  const [isMinimized, setIsMinimized] = useState<boolean>(false);
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [quotaError, setQuotaError] = useState<string | null>(null);

  const processingRef = useRef<boolean>(false);
  const cancelledRef = useRef<Set<string>>(new Set());

  // Enqueue entries with optional custom titles & Storage Quota Guard
  const enqueueEntries = useCallback(async (
    entries: UploadEntryInput[],
    category: string,
    section: 'sheet_music' | 'technique'
  ) => {
    setQuotaError(null);
    const totalBatchSize = entries.reduce((acc, e) => acc + e.file.size, 0);

    // Quota Guard Check
    const quotaCheck = await checkStorageQuota(totalBatchSize);
    if (!quotaCheck.allowed) {
      setQuotaError(quotaCheck.message || 'Storage quota exceeded.');
      setIsOpen(true);
      return;
    }

    const newItems: UploadQueueItem[] = entries.map((entry) => ({
      id: `queue_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      file: entry.file,
      name: entry.title?.trim() || cleanFileName(entry.file.name),
      size: entry.file.size,
      progress: 0,
      status: 'queued',
      category,
      section,
    }));

    setItems((prev) => [...prev, ...newItems]);
    setIsOpen(true);
    setIsMinimized(false);
  }, []);

  const cancelItem = useCallback((id: string) => {
    cancelledRef.current.add(id);
    setItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, status: 'error', errorMessage: 'Cancelled' } : item
      )
    );
  }, []);

  const retryItem = useCallback((id: string) => {
    cancelledRef.current.delete(id);
    setItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, status: 'queued', progress: 0, errorMessage: undefined } : item
      )
    );
    setIsOpen(true);
  }, []);

  const clearCompleted = useCallback(() => {
    setItems((prev) => prev.filter((item) => item.status !== 'completed' && item.status !== 'error'));
    setIsOpen(false);
  }, []);

  const dismissWidget = useCallback(() => {
    setIsOpen(false);
  }, []);

  // Strict Serial Concurrency Worker Loop (concurrency: 1) with GC yielding & isolated transactions
  useEffect(() => {
    const processQueue = async () => {
      if (processingRef.current) return;

      const nextItem = items.find((item) => item.status === 'queued');
      if (!nextItem) return;

      processingRef.current = true;

      try {
        if (cancelledRef.current.has(nextItem.id)) {
          processingRef.current = false;
          return;
        }

        // 1. Mark processing
        setItems((prev) =>
          prev.map((i) => (i.id === nextItem.id ? { ...i, status: 'processing', progress: 25 } : i))
        );

        let fileType: SongType = 'pdf';
        if (nextItem.file.type.includes('pdf') || nextItem.file.name.toLowerCase().endsWith('.pdf')) {
          fileType = 'pdf';
        } else if (nextItem.file.type.includes('image')) {
          fileType = 'image';
        } else if (nextItem.file.name.toLowerCase().endsWith('.xml')) {
          fileType = 'musicxml';
        }

        const songId = `song_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const newSong: Song = {
          id: songId,
          title: nextItem.name,
          artist: '',
          genre: nextItem.category,
          section: nextItem.section,
          type: fileType,
          key: 'Cmaj',
          originalKey: 'Cmaj',
          tempo: 120,
          timeSignature: '4/4',
          favorite: false,
          dateAdded: Date.now(),
        };

        if (cancelledRef.current.has(nextItem.id)) {
          processingRef.current = false;
          return;
        }

        // 2. Mark saving
        setItems((prev) =>
          prev.map((i) => (i.id === nextItem.id ? { ...i, status: 'saving', progress: 70 } : i))
        );

        // 3. Save raw File directly into IDB with zero-memory direct blob piping (isolated transaction block)
        await saveSongDirectDirectBlob(newSong, nextItem.file);

        if (cancelledRef.current.has(nextItem.id)) {
          processingRef.current = false;
          return;
        }

        // 4. Mark completed
        setItems((prev) =>
          prev.map((i) => (i.id === nextItem.id ? { ...i, status: 'completed', progress: 100 } : i))
        );

        if (onSongsUpdated) {
          onSongsUpdated();
        }
      } catch (err: any) {
        console.error(`Error uploading item ${nextItem.name}:`, err);
        setItems((prev) =>
          prev.map((i) =>
            i.id === nextItem.id
              ? { ...i, status: 'error', errorMessage: err?.message || 'Failed to save' }
              : i
          )
        );
      } finally {
        processingRef.current = false;

        // Yield event loop for garbage collection breathing room between files
        if (typeof window !== 'undefined') {
          if ('scheduler' in window && typeof (window as any).scheduler.yield === 'function') {
            await (window as any).scheduler.yield();
          } else {
            await new Promise((resolve) => setTimeout(resolve, 20));
          }
        }
      }
    };

    processQueue();
  }, [items, onSongsUpdated]);

  // Handle visibility change (tab background/foreground) and beforeunload warnings
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // Reset processing lock if stalled and re-trigger queue processing
        if (items.some((i) => i.status === 'queued')) {
          processingRef.current = false;
          // Force state update to re-run effect loop
          setItems((prev) => [...prev]);
        }
      }
    };

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      const isUploading = items.some(
        (i) => i.status === 'queued' || i.status === 'processing' || i.status === 'saving'
      );
      if (isUploading) {
        e.preventDefault();
        e.returnValue = 'PDF uploads are currently processing in the background.';
        return e.returnValue;
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [items]);

  return {
    items,
    isOpen,
    isMinimized,
    setIsMinimized,
    quotaError,
    enqueueEntries,
    cancelItem,
    retryItem,
    clearCompleted,
    dismissWidget,
  };
}
