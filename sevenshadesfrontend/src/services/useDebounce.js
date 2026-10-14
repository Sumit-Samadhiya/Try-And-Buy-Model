import { useState, useEffect } from 'react';

/**
 * Custom hook to debounce a fast-changing value.
 * @param {*} value The value to debounce
 * @param {number} delay Milliseconds to wait before updating (default 350ms)
 * @returns {*} The debounced value
 */
export function useDebounce(value, delay = 350) {
    const [debouncedValue, setDebouncedValue] = useState(value);

    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);

        return () => {
            clearTimeout(handler);
        };
    }, [value, delay]);

    return debouncedValue;
}

export default useDebounce;
