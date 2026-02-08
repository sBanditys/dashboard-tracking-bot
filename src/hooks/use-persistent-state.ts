'use client'

import { useEffect, useState, Dispatch, SetStateAction } from 'react'

/**
 * React hook for state that persists to sessionStorage.
 *
 * Useful for preserving filter states, search queries, and UI preferences
 * across browser back/forward navigation while remaining session-scoped.
 *
 * @param key - sessionStorage key (should be unique per component/use case)
 * @param defaultValue - Initial value if no stored value exists
 * @returns Tuple of [state, setState] matching React.useState signature
 *
 * @example
 * const [filters, setFilters] = usePersistentState('posts-filters', { platform: null })
 */
export function usePersistentState<T>(
    key: string,
    defaultValue: T
): [T, Dispatch<SetStateAction<T>>] {
    // Initialize state from sessionStorage or default value
    const [state, setState] = useState<T>(() => {
        // SSR safety check
        if (typeof window === 'undefined') {
            return defaultValue
        }

        try {
            const stored = sessionStorage.getItem(key)
            if (stored !== null) {
                return JSON.parse(stored) as T
            }
        } catch (error) {
            // Handle JSON parse errors, corrupted data, or quota exceeded errors
            console.warn(`Failed to read sessionStorage key "${key}":`, error)
        }

        return defaultValue
    })

    // Sync state to sessionStorage on change
    useEffect(() => {
        // SSR safety check
        if (typeof window === 'undefined') {
            return
        }

        try {
            sessionStorage.setItem(key, JSON.stringify(state))
        } catch (error) {
            // Handle quota exceeded or other storage errors
            console.warn(`Failed to write sessionStorage key "${key}":`, error)
        }
    }, [key, state])

    return [state, setState]
}
