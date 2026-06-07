import React, { useState } from 'react';

export function useLocalStorage<T>(key: string, initialValue: T | (() => T)): [T, React.Dispatch<React.SetStateAction<T>>] {
    const [storedValue, setStoredValue] = useState<T>(() => {
        const item = window.localStorage.getItem(key);
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
            window.localStorage.removeItem(key);
            return initialValue instanceof Function ? initialValue() : initialValue;
        }
    });

    const setStoredValueWithStorage = (value: T | ((val: T) => T)) => {
        try {
            const valueToStore = value instanceof Function ? value(storedValue) : value;
            setStoredValue(valueToStore);
            window.localStorage.setItem(key, JSON.stringify(valueToStore));
        } catch (error) {
            console.error(`Error saving to localStorage key “${key}”:`, error);
        }
    };

    return [storedValue, setStoredValueWithStorage as React.Dispatch<React.SetStateAction<T>>];
}
