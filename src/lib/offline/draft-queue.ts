const DB_NAME = "epic-rdc-offline";
const STORE = "draft-queue";
const DB_VERSION = 1;

export interface QueuedDraft {
  reportId: string;
  payload: { activities: unknown[]; narratives: Record<string, string> };
  queuedAt: string;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onerror = () => reject(req.error);
    req.onsuccess = () => resolve(req.result);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: "reportId" });
      }
    };
  });
}

export async function queueDraft(item: QueuedDraft): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(item);
    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onerror = () => reject(tx.error);
  });
}

export async function getPendingCount(): Promise<number> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).count();
    req.onsuccess = () => { db.close(); resolve(req.result); };
    req.onerror = () => reject(req.error);
  });
}

export async function getAllQueued(): Promise<QueuedDraft[]> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).getAll();
    req.onsuccess = () => { db.close(); resolve(req.result || []); };
    req.onerror = () => reject(req.error);
  });
}

export async function removeQueued(reportId: string): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).delete(reportId);
    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onerror = () => reject(tx.error);
  });
}

export async function replayDraftQueue(
  syncFn: (item: QueuedDraft) => Promise<void>,
): Promise<number> {
  if (!navigator.onLine) return 0;
  const items = await getAllQueued();
  let synced = 0;
  for (const item of items) {
    try {
      await syncFn(item);
      await removeQueued(item.reportId);
      synced++;
    } catch {
      /* keep in queue */
    }
  }
  return synced;
}
