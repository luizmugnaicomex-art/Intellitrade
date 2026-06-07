import { v4 as uuidv4 } from 'uuid';
import type { ImportProcess, User, Claim, NCMEntry, Task, DeliverySlot, ContainerBufferItem, Procedure, Contract, PDCAItem, Supplier, Project, Invoice, Payment, Warehouse, VesselScheduleEntry } from '../types';

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

const FAKE_API_DELAY = 200;

// Simulates an async fetch from a backend (using localStorage as the DB)
const fakeFetch = <T>(key: string, mockData: T): Promise<T> => {
    return new Promise((resolve) => {
        setTimeout(() => {
            try {
                const item = localStorage.getItem(key);
                if (item && item !== 'null' && item !== 'undefined') {
                    resolve(JSON.parse(item));
                } else {
                    localStorage.setItem(key, JSON.stringify(mockData));
                    resolve(mockData);
                }
            } catch (error) {
                console.error(`Error fetching from localStorage key "${key}":`, error);
                resolve(mockData); // Resolve with mock data on error
            }
        }, FAKE_API_DELAY);
    });
};

// Simulates an async update to a backend
const fakeUpdate = <T>(key: string, data: T): Promise<T> => {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            try {
                localStorage.setItem(key, JSON.stringify(data));
                resolve(data);
            } catch (error) {
                console.error(`Error updating localStorage key "${key}":`, error);
                reject(error);
            }
        }, FAKE_API_DELAY);
    });
};

// Generic getter
export const getData = <T>(key: string, mockData: T): Promise<T> => fakeFetch(key, mockData);

// Generic updater for overwriting the whole dataset
export const updateData = <T>(key: string, data: T): Promise<T> => fakeUpdate(key, data);

// Add a single item, generating a UUID
export const addDataItem = async <T extends { id: string }>(key: string, item: Omit<T, 'id'>): Promise<T> => {
    const currentData = await fakeFetch<T[]>(key, []);
    const newItem = { ...item, id: uuidv4() } as T;
    const updatedData = [...currentData, newItem];
    await fakeUpdate(key, updatedData);
    return newItem;
};

// Add multiple items
export const addMultipleDataItems = async <T extends { id: string }>(key: string, items: Omit<T, 'id'>[]): Promise<T[]> => {
    const currentData = await fakeFetch<T[]>(key, []);
    const newItems = items.map(item => ({ ...item, id: uuidv4() } as T));
    const updatedData = [...currentData, ...newItems];
    await fakeUpdate(key, updatedData);
    return newItems;
};


// Update a single item
export const updateDataItem = async <T extends { id: string }>(key: string, updatedItem: T): Promise<T> => {
    const currentData = await fakeFetch<T[]>(key, []);
    const updatedData = currentData.map(item => (item.id === updatedItem.id ? updatedItem : item));
    await fakeUpdate(key, updatedData);
    return updatedItem;
};

// Delete a single item by ID
export const deleteDataItem = async (key: string, id: string): Promise<void> => {
    const currentData = await fakeFetch<{ id: string }[]>(key, []);
    const updatedData = currentData.filter(item => item.id !== id);
    await fakeUpdate(key, updatedData);
};

// Export uuidv4 for use elsewhere if needed
export { uuidv4 };
