'use client'

import { useState, useRef, useEffect } from 'react'
import { useUser, useLogout } from '@/hooks/use-user'
import { Skeleton } from '@/components/ui/skeleton'

export function UserMenu() {
  const [open, setOpen] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const { user, isLoading } = useUser()
  const { logout } = useLogout()
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpen(false)
        setShowConfirm(false)
      }
    }

    if (open) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [open])

  const handleLogoutClick = () => {
    setShowConfirm(true)
  }

  const handleConfirmLogout = () => {
    logout()
  }

  const handleCancelLogout = () => {
    setShowConfirm(false)
  }

  if (isLoading) {
    return <Skeleton shape="circle" className="w-10 h-10" />
  }

  if (!user) {
    return null
  }

  // Build Discord avatar URL
  const avatarUrl = user.avatar
    ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=80`
    : null

  return (
    <div className="relative" ref={menuRef}>
      {/* User Avatar Button */}
      <button
        onClick={() => setOpen(!open)}
        className="w-10 h-10 rounded-full bg-accent-purple flex items-center justify-center text-white font-semibold hover:ring-2 hover:ring-accent-purple/50 transition-all overflow-hidden"
        aria-label="User menu"
        aria-expanded={open}
      >
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt={user.username}
            className="w-full h-full object-cover"
          />
        ) : (
          user.username.charAt(0).toUpperCase()
        )}
      </button>

      {/* Dropdown Menu */}
      {open && (
        <div className="absolute right-0 mt-2 w-64 bg-surface border border-border rounded-sm shadow-lg py-2 z-50">
          {/* User Info */}
          <div className="px-4 py-2 border-b border-border">
            <p className="text-sm font-medium text-white">{user.username}</p>
            <p className="text-xs text-gray-400">{user.id}</p>
          </div>

          {/* Logout Section */}
          <div className="px-2 py-2">
            {!showConfirm ? (
              <button
                onClick={handleLogoutClick}
                className="w-full text-left px-3 py-2 text-sm text-red-400 hover:bg-surface/50 rounded-sm transition-colors"
              >
                Sign out
              </button>
            ) : (
              <div className="px-3 py-2">
                <p className="text-xs text-gray-300 mb-3">Are you sure you want to sign out?</p>
                <div className="flex gap-2">
                  <button
                    onClick={handleConfirmLogout}
                    className="flex-1 px-3 py-1.5 text-xs bg-red-600 text-white rounded-sm hover:bg-red-700 transition-colors"
                  >
                    Sign out
                  </button>
                  <button
                    onClick={handleCancelLogout}
                    className="flex-1 px-3 py-1.5 text-xs bg-surface/50 text-gray-300 rounded-sm hover:bg-surface transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
