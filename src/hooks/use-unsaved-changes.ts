'use client'

import { useEffect } from 'react'

/**
 * React hook that warns users before leaving the page when they have unsaved changes.
 *
 * Triggers browser's native beforeunload dialog when hasUnsavedChanges is true.
 * Covers browser-level navigation (refresh, close tab, external navigation, back/forward).
 *
 * Note: Next.js App Router doesn't expose beforeRouteChange events for internal Link
 * navigation, so this only covers browser-level navigation. This is the recommended
 * approach per Next.js 13+ documentation.
 *
 * @param hasUnsavedChanges - Boolean indicating whether user has unsaved changes
 *
 * @example
 * const [formData, setFormData] = useState(initialData)
 * const isDirty = JSON.stringify(formData) !== JSON.stringify(initialData)
 * useUnsavedChanges(isDirty)
 */
export function useUnsavedChanges(hasUnsavedChanges: boolean): void {
    useEffect(() => {
        if (!hasUnsavedChanges) {
            return
        }

        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            // Standard way to trigger browser warning dialog
            e.preventDefault()
            // Chrome requires returnValue to be set
            e.returnValue = ''
        }

        window.addEventListener('beforeunload', handleBeforeUnload)

        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload)
        }
    }, [hasUnsavedChanges])
}
