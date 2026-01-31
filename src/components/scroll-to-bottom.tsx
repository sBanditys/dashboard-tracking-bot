'use client'

import { useState, useEffect, useCallback } from 'react'

/**
 * Floating button that appears when user is not near the bottom of the page.
 * Works with both window scroll and scrollable containers (like dashboard main).
 */
export function ScrollToBottom() {
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
                const scrollHeight = document.documentElement.scrollHeight
                const scrollTop = window.scrollY
                const clientHeight = window.innerHeight
                // Show button if more than 300px from bottom
                setIsVisible(scrollHeight - scrollTop - clientHeight > 300)
            } else {
                const { scrollHeight, scrollTop, clientHeight } = scrollContainer
                // Show button if more than 300px from bottom
                setIsVisible(scrollHeight - scrollTop - clientHeight > 300)
            }
        }

        scrollContainer.addEventListener('scroll', toggleVisibility)
        // Check initial scroll position
        toggleVisibility()

        return () => scrollContainer.removeEventListener('scroll', toggleVisibility)
    }, [scrollContainer])

    const scrollToBottom = useCallback(() => {
        if (!scrollContainer) return

        if (scrollContainer instanceof Window) {
            window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'smooth' })
        } else {
            scrollContainer.scrollTo({ top: scrollContainer.scrollHeight, behavior: 'smooth' })
        }
    }, [scrollContainer])

    if (!isVisible) return null

    return (
        <button
            onClick={scrollToBottom}
            className="fixed bottom-6 right-20 p-3 bg-surface border border-border rounded-full shadow-lg hover:bg-background transition-colors focus:outline-none focus:ring-2 focus:ring-accent-purple z-50"
            aria-label="Scroll to bottom"
        >
            {/* Arrow down icon */}
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
                    d="M19 14l-7 7m0 0l-7-7m7 7V3"
                />
            </svg>
        </button>
    )
}
