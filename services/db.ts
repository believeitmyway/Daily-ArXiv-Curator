
import { Paper, Topic } from "../types";

const DB_NAME = 'DailyArXivCuratorDB';
const DB_VERSION = 1;

const STORE_PAPERS = 'papers';
const STORE_TOPICS = 'topics';

/**
 * Opens the IndexedDB database.
 * Designed to be generic and easily extensible.
 */
const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = (event) => {
      console.error("IndexedDB error:", request.error);
      reject(request.error);
    };

    request.onsuccess = (event) => {
      resolve(request.result);
    };

    request.onupgradeneeded = (event) => {
      const db = request.result;
      
      // Create Papers Store
      if (!db.objectStoreNames.contains(STORE_PAPERS)) {
        const paperStore = db.createObjectStore(STORE_PAPERS, { keyPath: 'id' });
        paperStore.createIndex('topicId', 'topicId', { unique: false });
        paperStore.createIndex('publishedDate', 'publishedDate', { unique: false });
      }

      // Create Topics Store
      if (!db.objectStoreNames.contains(STORE_TOPICS)) {
        db.createObjectStore(STORE_TOPICS, { keyPath: 'id' });
      }
    };
  });
};

// --- Generic CRUD Operations ---

export const getAllItems = async <T>(storeName: string): Promise<T[]> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([storeName], 'readonly');
    const store = transaction.objectStore(storeName);
    const request = store.getAll();

    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
};

export const putItem = async <T>(storeName: string, item: T): Promise<T> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([storeName], 'readwrite');
    const store = transaction.objectStore(storeName);
    const request = store.put(item);

    request.onsuccess = () => resolve(item);
    request.onerror = () => reject(request.error);
  });
};

export const putBulkItems = async <T>(storeName: string, items: T[]): Promise<void> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([storeName], 'readwrite');
    const store = transaction.objectStore(storeName);
    
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);

    items.forEach(item => store.put(item));
  });
};

export const deleteItem = async (storeName: string, id: string): Promise<void> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([storeName], 'readwrite');
    const store = transaction.objectStore(storeName);
    const request = store.delete(id);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

// --- Specific Repository Accessors (for cleaner usage) ---

export const dbRepository = {
  topics: {
    getAll: () => getAllItems<Topic>(STORE_TOPICS),
    save: (topic: Topic) => putItem(STORE_TOPICS, topic),
    saveAll: (topics: Topic[]) => putBulkItems(STORE_TOPICS, topics),
    delete: (id: string) => deleteItem(STORE_TOPICS, id),
  },
  papers: {
    getAll: () => getAllItems<Paper>(STORE_PAPERS),
    save: (paper: Paper) => putItem(STORE_PAPERS, paper),
    saveAll: (papers: Paper[]) => putBulkItems(STORE_PAPERS, papers),
    delete: (id: string) => deleteItem(STORE_PAPERS, id),
  }
};
