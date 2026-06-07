import { v4 as uuidv4 } from 'uuid';
import { 
    collection, 
    doc, 
    getDocs, 
    getDoc, 
    setDoc, 
    deleteDoc, 
    writeBatch, 
    getDocFromServer 
} from 'firebase/firestore';
import { db, auth } from './firebase';

export const STORAGE_KEYS = {
    IMPORTS: 'imports',
    USERS: 'users',
    CLAIMS: 'claims',
    NCMS: 'ncms',
    TASKS: 'tasks',
    DELIVERY_SCHEDULE: 'deliverySchedule',
    CONTAINER_BUFFER: 'containerBuffer',
    PROCEDURES: 'procedures',
    CONTRACTS: 'contracts',
    PDCA_ITEMS: 'pdcaItems',
    SUPPLIERS: 'suppliers',
    PROJECTS: 'projects',
    INVOICES: 'invoices',
    PAYMENTS: 'payments',
    WAREHOUSES: 'warehouses',
    VESSEL_SCHEDULE: 'vesselSchedule',
};

// --- FIRESTORE OPERATION ERROR TYPES ---
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
  };
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// --- INITIALIZATION CONNECTION CHECK ---
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn("Please check your Firebase configuration or network status. The client appears offline.");
    }
  }
}
testConnection();

// --- CORE INTERFACE IMPLEMENTATIONS ---

/**
 * Retrieves all items in a Firestore collection. 
 * If the collection is empty, automatically populates Firestore with default mock data
 * as seed values to provide a seamless user experience.
 */
export const getData = async <T>(key: string, mockData: T): Promise<T> => {
    try {
        const querySnapshot = await getDocs(collection(db, key));
        const items: any[] = [];
        querySnapshot.forEach((document) => {
            const data = document.data();
            items.push({ ...data, id: document.id });
        });

        // Seed with mock data on initial empty collection
        if (items.length === 0 && Array.isArray(mockData) && mockData.length > 0) {
            console.log(`Seeding empty collection "${key}" in Firestore with standard ERP mock data...`);
            const batch = writeBatch(db);
            const seededItems: any[] = [];
            
            for (const item of mockData) {
                const itemId = (item && typeof item === 'object' && 'id' in item) ? (item as any).id : uuidv4();
                const itemData = (item && typeof item === 'object') ? { ...item, id: itemId } : item;
                const docRef = doc(db, key, itemId);
                batch.set(docRef, itemData);
                seededItems.push(itemData);
            }
            await batch.commit();
            return seededItems as unknown as T;
        }

        return items as unknown as T;
    } catch (error) {
        handleFirestoreError(error, OperationType.GET, key);
        return mockData;
    }
};

/**
 * Overwrites the entire collection data. Perfect for list-wide updates like vessel feed schedules.
 */
export const updateData = async <T>(key: string, data: T): Promise<T> => {
    try {
        // Fetch current documents to clear the previous ones
        const querySnapshot = await getDocs(collection(db, key));
        const batch = writeBatch(db);
        
        querySnapshot.forEach((document) => {
            batch.delete(doc(db, key, document.id));
        });

        // Set the new list
        if (Array.isArray(data)) {
            for (const item of data) {
                const itemId = (item && typeof item === 'object' && 'id' in item) ? (item as any).id : uuidv4();
                const itemData = (item && typeof item === 'object') ? { ...item, id: itemId } : item;
                batch.set(doc(db, key, itemId), itemData);
            }
        } else if (data) {
            batch.set(doc(db, key, 'index'), data);
        }

        await batch.commit();
        return data;
    } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, key);
        throw error;
    }
};

/**
 * Adds a single document to a collection, ensuring an ID is present.
 */
export const addDataItem = async <T extends { id: string }>(key: string, item: Omit<T, 'id'>): Promise<T> => {
    const id = uuidv4();
    const newItem = { ...item, id } as T;
    try {
        await setDoc(doc(db, key, id), newItem);
        return newItem;
    } catch (error) {
        handleFirestoreError(error, OperationType.CREATE, `${key}/${id}`);
        throw error;
    }
};

/**
 * Adds multiple documents in batch to a collection.
 */
export const addMultipleDataItems = async <T extends { id: string }>(key: string, items: Omit<T, 'id'>[]): Promise<T[]> => {
    try {
        const batch = writeBatch(db);
        const newItems = items.map(item => {
            const id = uuidv4();
            return { ...item, id } as T;
        });

        for (const item of newItems) {
            batch.set(doc(db, key, item.id), item);
        }

        await batch.commit();
        return newItems;
    } catch (error) {
        handleFirestoreError(error, OperationType.CREATE, key);
        throw error;
    }
};

/**
 * Updates an existing document in a collection.
 */
export const updateDataItem = async <T extends { id: string }>(key: string, updatedItem: T): Promise<T> => {
    const id = updatedItem.id;
    try {
        await setDoc(doc(db, key, id), updatedItem);
        return updatedItem;
    } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, `${key}/${id}`);
        throw error;
    }
};

/**
 * Deletes a document from a collection.
 */
export const deleteDataItem = async (key: string, id: string): Promise<void> => {
    try {
        await deleteDoc(doc(db, key, id));
    } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, `${key}/${id}`);
        throw error;
    }
};

export { uuidv4 };
