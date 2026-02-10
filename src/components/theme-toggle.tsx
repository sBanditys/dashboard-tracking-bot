'use client'

import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'

export function ThemeToggle() {
  const [mounted, setMounted] = useState(false)
  const { setTheme } = useTheme()

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <button
        className="w-10 h-10 flex items-center justify-center rounded-sm bg-surface/50 text-gray-400"
        aria-label="Toggle theme"
      >
        <span className="text-xl">○</span>
      </button>
    )
  }

  return (
    <button
      onClick={() => setTheme('dark')}
      className="w-10 h-10 flex items-center justify-center rounded-sm bg-surface/50 hover:bg-surface transition-colors text-white"
      aria-label="Dark mode enabled"
      title="Dark mode enabled"
    >
      <span className="text-xl">🌙</span>
    </button>
  )
}
