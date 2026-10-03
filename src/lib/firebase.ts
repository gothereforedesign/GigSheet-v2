import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  initializeFirestore,
  getFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  doc,
  getDoc,
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

// Initialize Firebase App
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Database ID from provisioned config
const databaseId = firebaseConfig.firestoreDatabaseId || '(default)';

// Initialize Firestore with multi-tab persistent local cache
export const db = (() => {
  try {
    return initializeFirestore(
      app,
      {
        localCache: persistentLocalCache({
          tabManager: persistentMultipleTabManager(),
        }),
      },
      databaseId
    );
  } catch (e) {
    return getFirestore(app, databaseId);
  }
})();

// Non-blocking connection check on boot
async function testConnection() {
  try {
    // Use getDoc with a short timeout so offline or slow connections don't trigger the 10s SDK warning
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Connection check timed out - operating in offline/cached mode')), 2000)
    );
    await Promise.race([getDoc(doc(db, 'test', 'connection')), timeoutPromise]);
  } catch (_error) {
    // Gracefully fallback to offline local cache without throwing unhandled exceptions
    console.log('Firestore operating with offline persistent local cache.');
  }
}
testConnection();
