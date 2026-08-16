/**
 * Storage Persistence Utility
 * Requests persistent client storage from the browser to safeguard IndexedDB data.
 */
export async function requestPersistentStorage(): Promise<boolean> {
  if (typeof navigator !== 'undefined' && navigator.storage && navigator.storage.persist) {
    try {
      const isPersisted = await navigator.storage.persisted();
      if (isPersisted) {
        return true;
      }
      const granted = await navigator.storage.persist();
      console.log(`[Storage] Persistent storage granted: ${granted}`);
      return granted;
    } catch (error) {
      console.warn('[Storage] Failed to request persistent storage:', error);
      return false;
    }
  }
  return false;
}

export async function getStorageEstimate(): Promise<{ usage: number; quota: number; percentUsed: number } | null> {
  if (typeof navigator !== 'undefined' && navigator.storage && navigator.storage.estimate) {
    try {
      const estimate = await navigator.storage.estimate();
      const usage = estimate.usage || 0;
      const quota = estimate.quota || 0;
      const percentUsed = quota > 0 ? (usage / quota) * 100 : 0;
      return { usage, quota, percentUsed };
    } catch (error) {
      console.warn('[Storage] Failed to get storage estimate:', error);
    }
  }
  return null;
}
