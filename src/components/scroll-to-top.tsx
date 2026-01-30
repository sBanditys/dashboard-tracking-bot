'use client'

import { useState, useEffect } from 'react'

/**
 * Floating button that appears when user scrolls down past 300px.
 * Clicking it smoothly scrolls back to the top of the page.
 */
export function ScrollToTop() {
    const [isVisible, setIsVisible] = useState(false)

    useEffect(() => {
        const toggleVisibility = () => {
            setIsVisible(window.scrollY > 300)
        }

        window.addEventListener('scroll', toggleVisibility)
        return () => window.removeEventListener('scroll', toggleVisibility)
    }, [])

    const scrollToTop = () => {
        window.scrollTo({ top: 0, behavior: 'smooth' })
    }

    if (!isVisible) return null

    return (
        <button
            onClick={scrollToTop}
            className="fixed bottom-6 right-6 p-3 bg-surface border border-border rounded-full shadow-lg hover:bg-background transition-colors focus:outline-none focus:ring-2 focus:ring-accent-purple"
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
