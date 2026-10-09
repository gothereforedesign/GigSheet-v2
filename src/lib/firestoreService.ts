import {
  collection,
  doc,
  setDoc,
  getDoc,
  deleteDoc,
  onSnapshot,
  query,
} from 'firebase/firestore';
import {
  ref,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject,
} from 'firebase/storage';
import { db, storage, handleFirestoreError, OperationType } from './firebase';
import { Song, Setlist } from '../types';

/**
 * Uploads a file (PDF, image, audio) to Firebase Storage and returns its public download URL.
 */
export async function uploadFileToFirebaseStorage(
  userId: string,
  fileId: string,
  file: File | Blob,
  fileName: string
): Promise<string> {
  const cleanName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
  const storagePath = `users/${userId}/files/${fileId}_${cleanName}`;
  const storageRef = ref(storage, storagePath);

  try {
    const uploadTask = await uploadBytesResumable(storageRef, file);
    const downloadUrl = await getDownloadURL(uploadTask.ref);
    return downloadUrl;
  } catch (error) {
    console.warn('Firebase Storage upload failed or offline. Operating in cache mode:', error);
    throw error;
  }
}

/**
 * Deletes a file from Firebase Storage
 */
export async function deleteFileFromFirebaseStorage(
  userId: string,
  fileId: string,
  fileName: string
): Promise<void> {
  try {
    const cleanName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
    const storagePath = `users/${userId}/files/${fileId}_${cleanName}`;
    const storageRef = ref(storage, storagePath);
    await deleteObject(storageRef);
  } catch (err) {
    // Ignore missing files or offline errors
  }
}

// ============================================================================
// SONGS FIRESTORE OPERATIONS
// ============================================================================

export function subscribeUserSongs(
  userId: string,
  onUpdate: (songs: Song[]) => void
): () => void {
  const songsCollectionRef = collection(db, 'users', userId, 'songs');

  return onSnapshot(
    songsCollectionRef,
    (snapshot) => {
      const songsList: Song[] = [];
      snapshot.forEach((docSnap) => {
        if (docSnap.exists()) {
          songsList.push(docSnap.data() as Song);
        }
      });
      onUpdate(songsList);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, `users/${userId}/songs`);
    }
  );
}

export async function saveSongToFirestore(
  userId: string,
  song: Song,
  fileToUpload?: File | Blob | null
): Promise<Song> {
  const path = `users/${userId}/songs/${song.id}`;
  try {
    let downloadUrl = song.fileUrl;

    // Upload to Firebase Storage if a File or Blob is provided
    if (fileToUpload && userId) {
      try {
        downloadUrl = await uploadFileToFirebaseStorage(
          userId,
          song.id,
          fileToUpload,
          song.title || 'chart'
        );
      } catch (err) {
        console.warn('Storage upload error, using local fallback:', err);
      }
    }

    const { fileBlob, ...metadata } = song;
    const songDoc: Song = {
      ...metadata,
      fileUrl: downloadUrl || metadata.fileUrl || '',
      dateModified: Date.now(),
    };

    // Sanitize undefined fields for Firestore
    const sanitized = JSON.parse(JSON.stringify(songDoc));

    await setDoc(doc(db, 'users', userId, 'songs', song.id), sanitized, {
      merge: true,
    });

    return songDoc;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteSongFromFirestore(
  userId: string,
  songId: string
): Promise<void> {
  const path = `users/${userId}/songs/${songId}`;
  try {
    await deleteDoc(doc(db, 'users', userId, 'songs', songId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// ============================================================================
// SETLISTS FIRESTORE OPERATIONS
// ============================================================================

export function subscribeUserSetlists(
  userId: string,
  onUpdate: (setlists: Setlist[]) => void
): () => void {
  const setlistsCollectionRef = collection(db, 'users', userId, 'setlists');

  return onSnapshot(
    setlistsCollectionRef,
    (snapshot) => {
      const setlistList: Setlist[] = [];
      snapshot.forEach((docSnap) => {
        if (docSnap.exists()) {
          setlistList.push(docSnap.data() as Setlist);
        }
      });
      onUpdate(setlistList);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, `users/${userId}/setlists`);
    }
  );
}

export async function saveSetlistToFirestore(
  userId: string,
  setlist: Setlist
): Promise<void> {
  const path = `users/${userId}/setlists/${setlist.id}`;
  try {
    const sanitized = JSON.parse(JSON.stringify(setlist));
    await setDoc(doc(db, 'users', userId, 'setlists', setlist.id), sanitized, {
      merge: true,
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteSetlistFromFirestore(
  userId: string,
  setlistId: string
): Promise<void> {
  const path = `users/${userId}/setlists/${setlistId}`;
  try {
    await deleteDoc(doc(db, 'users', userId, 'setlists', setlistId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// ============================================================================
// USER NOTES & SETTINGS FIRESTORE OPERATIONS
// ============================================================================

export interface UserNotesData {
  title: string;
  content: string;
  updatedAt?: number;
}

export function subscribeUserNotes(
  userId: string,
  onUpdate: (notes: UserNotesData) => void
): () => void {
  const notesDocRef = doc(db, 'users', userId, 'settings', 'notes');

  return onSnapshot(
    notesDocRef,
    (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        onUpdate({
          title: data.title || '',
          content: data.content || '',
          updatedAt: data.updatedAt,
        });
      } else {
        onUpdate({ title: '', content: '' });
      }
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, `users/${userId}/settings/notes`);
    }
  );
}

export async function saveUserNotesToFirestore(
  userId: string,
  title: string,
  content: string
): Promise<void> {
  const path = `users/${userId}/settings/notes`;
  try {
    await setDoc(
      doc(db, 'users', userId, 'settings', 'notes'),
      {
        title,
        content,
        updatedAt: Date.now(),
      },
      { merge: true }
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

// ============================================================================
// CUSTOM CATEGORIES FIRESTORE OPERATIONS
// ============================================================================

export function subscribeUserCategories(
  userId: string,
  section: 'sheet_music' | 'technique',
  onUpdate: (data: { categories: string[]; colors: Record<string, string> }) => void
): () => void {
  const docRef = doc(db, 'users', userId, 'settings', `categories_${section}`);

  return onSnapshot(
    docRef,
    (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        onUpdate({
          categories: Array.isArray(data.categories) ? data.categories : [],
          colors: data.colors && typeof data.colors === 'object' ? data.colors : {},
        });
      }
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, `users/${userId}/settings/categories_${section}`);
    }
  );
}

export async function saveCategoriesToFirestore(
  userId: string,
  section: 'sheet_music' | 'technique',
  categories: string[],
  colors: Record<string, string>
): Promise<void> {
  const path = `users/${userId}/settings/categories_${section}`;
  try {
    await setDoc(
      doc(db, 'users', userId, 'settings', `categories_${section}`),
      {
        section,
        categories: categories || [],
        colors: colors || {},
        updatedAt: Date.now(),
      },
      { merge: true }
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}
