import React, { useState } from 'react';

// Memory fallback inside a global record, in case localStorage is blocked/sandboxed
const memoryStorage: Record<string, string> = {};

export function useLocalStorage<T>(key: string, initialValue: T | (() => T)): [T, React.Dispatch<React.SetStateAction<T>>] {
    const [storedValue, setStoredValue] = useState<T>(() => {
        let item: string | null = null;
        try {
            item = window.localStorage.getItem(key);
        } catch (error) {
            console.warn(`localStorage getItem failed for key "${key}" due to security or storage restrictions. Using memory fallback.`, error);
            item = memoryStorage[key] || null;
        }

        if (!item || item === 'null' || item === 'undefined') {
             return initialValue instanceof Function ? initialValue() : initialValue;
        }

        try {
            return JSON.parse(item);
        } catch (error) {
            console.error(
                `Error parsing localStorage key “${key}”:`, error,
                '\nValue was:', item,
                '\nThis key will be cleared and reset to its initial value.'
            );
            try {
                window.localStorage.removeItem(key);
            } catch (e) {
                delete memoryStorage[key];
            }
            return initialValue instanceof Function ? initialValue() : initialValue;
        }
    });

    const setStoredValueWithStorage = (value: T | ((val: T) => T)) => {
        try {
            const valueToStore = value instanceof Function ? value(storedValue) : value;
            setStoredValue(valueToStore);
            try {
                window.localStorage.setItem(key, JSON.stringify(valueToStore));
            } catch (error) {
                console.warn(`localStorage setItem failed for key "${key}". Saving to memory storage.`, error);
                memoryStorage[key] = JSON.stringify(valueToStore);
            }
        } catch (error) {
            console.error(`Error saving key “${key}”:`, error);
        }
    };

    return [storedValue, setStoredValueWithStorage as React.Dispatch<React.SetStateAction<T>>];
}
