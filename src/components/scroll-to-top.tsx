'use client'

import { useState, useEffect, useCallback } from 'react'

/**
 * Floating button that appears when user scrolls down past 300px.
 * Works with both window scroll and scrollable containers (like dashboard main).
 */
export function ScrollToTop() {
    const [isVisible, setIsVisible] = useState(false)
    const [scrollContainer, setScrollContainer] = useState<Element | Window | null>(null)

    // Find the scrollable container on mount
    useEffect(() => {
        // Look for the main scrollable container (dashboard layout uses overflow-auto on main)
        const mainElement = document.querySelector('main')
        if (mainElement) {
            setScrollContainer(mainElement)
        } else {
            setScrollContainer(window)
        }
    }, [])

    useEffect(() => {
        if (!scrollContainer) return

        const toggleVisibility = () => {
            if (scrollContainer instanceof Window) {
                setIsVisible(window.scrollY > 300)
            } else {
                setIsVisible(scrollContainer.scrollTop > 300)
            }
        }

        scrollContainer.addEventListener('scroll', toggleVisibility)
        // Check initial scroll position
        toggleVisibility()

        return () => scrollContainer.removeEventListener('scroll', toggleVisibility)
    }, [scrollContainer])

    const scrollToTop = useCallback(() => {
        if (!scrollContainer) return

        if (scrollContainer instanceof Window) {
            window.scrollTo({ top: 0, behavior: 'smooth' })
        } else {
            scrollContainer.scrollTo({ top: 0, behavior: 'smooth' })
        }
    }, [scrollContainer])

    if (!isVisible) return null

    return (
        <button
            onClick={scrollToTop}
            className="fixed bottom-6 right-6 p-3 bg-surface border border-border rounded-full shadow-lg hover:bg-background transition-colors focus:outline-none focus:ring-2 focus:ring-accent-purple z-50"
            aria-label="Scroll to top"
        >
            {/* Arrow up icon */}
            <svg
                className="w-5 h-5 text-gray-300"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
            >
                <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 10l7-7m0 0l7 7m-7-7v18"
                />
            </svg>
        </button>
    )
}
