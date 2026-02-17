'use client'

import { useRef, useState, useCallback } from 'react'
import { Upload } from 'lucide-react'
import { cn } from '@/lib/utils'

interface UploadZoneProps {
  onFileSelected: (file: File) => void
  disabled?: boolean
  error?: string | null
}

const MAX_FILE_SIZE = 1024 * 1024 // 1MB

/**
 * Drag-and-drop CSV upload zone with client-side file validation.
 *
 * Validates:
 * - File type: must be .csv or text/csv
 * - File size: must be under 1MB
 * - Basic CSV structure: first line must have at least 2 comma-separated values
 */
export function UploadZone({ onFileSelected, disabled = false, error }: UploadZoneProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isDragOver, setIsDragOver] = useState(false)
  const [localError, setLocalError] = useState<string | null>(null)

  const displayError = error ?? localError

  const validateAndSelect = useCallback(
    async (file: File) => {
      setLocalError(null)

      // File type check
      const isCSV =
        file.name.toLowerCase().endsWith('.csv') ||
        file.type === 'text/csv' ||
        file.type === 'application/vnd.ms-excel'
      if (!isCSV) {
        setLocalError('Only CSV files are supported')
        return
      }

      // File size check (1MB limit)
      if (file.size > MAX_FILE_SIZE) {
        setLocalError('File must be under 1MB')
        return
      }

      // Basic CSV structure check: read first line
      try {
        const text = await file.text()
        const firstLine = text.split('\n')[0] ?? ''
        const columns = firstLine.split(',')
        if (columns.length < 2) {
          setLocalError('File does not appear to be a valid CSV')
          return
        }
      } catch {
        setLocalError('Failed to read file')
        return
      }

      onFileSelected(file)
    },
    [onFileSelected]
  )

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    if (!disabled) setIsDragOver(true)
  }, [disabled])

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault()
      e.stopPropagation()
      setIsDragOver(false)
      if (disabled) return

      const file = e.dataTransfer.files[0]
      if (file) {
        validateAndSelect(file)
      }
    },
    [disabled, validateAndSelect]
  )

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file) {
        validateAndSelect(file)
      }
      // Reset so re-selecting same file triggers onChange
      e.target.value = ''
    },
    [validateAndSelect]
  )

  const handleBrowseClick = useCallback(() => {
    if (!disabled) {
      fileInputRef.current?.click()
    }
  }, [disabled])

  return (
    <div className="space-y-2">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv"
        className="sr-only"
        onChange={handleInputChange}
        disabled={disabled}
        aria-label="Upload CSV file"
      />

      {/* Drop zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={cn(
          'border-2 border-dashed rounded-lg p-8 flex flex-col items-center justify-center gap-4 text-center transition-colors',
          isDragOver && !disabled && 'border-accent-purple bg-accent-purple/5',
          displayError && !isDragOver && 'border-red-500 bg-red-500/5',
          !isDragOver && !displayError && 'border-border',
          disabled && 'opacity-50 pointer-events-none',
          !disabled && !isDragOver && !displayError && 'hover:border-gray-500 cursor-pointer'
        )}
        onClick={handleBrowseClick}
        role="button"
        tabIndex={disabled ? -1 : 0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            handleBrowseClick()
          }
        }}
        aria-label="Drop zone for CSV file upload"
        aria-disabled={disabled}
      >
        <Upload
          className={cn(
            'w-10 h-10',
            isDragOver ? 'text-accent-purple' : 'text-gray-500'
          )}
        />

        {/* Desktop: drag & drop text */}
        <div className="pointer-coarse:hidden">
          <p className="text-gray-300 font-medium">
            Drag &amp; drop your CSV file here
          </p>
          <p className="text-gray-500 text-sm mt-1">or</p>
        </div>

        {/* Browse button — always visible, accessible */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            handleBrowseClick()
          }}
          disabled={disabled}
          className={cn(
            'px-4 py-2 text-sm font-medium rounded-md transition-colors',
            'bg-accent-purple/10 hover:bg-accent-purple/20 text-accent-purple border border-accent-purple/30',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            'focus:outline-none focus:ring-2 focus:ring-accent-purple focus:ring-offset-2 focus:ring-offset-surface'
          )}
        >
          {/* Mobile: tap-to-upload */}
          <span className="hidden pointer-coarse:inline">Tap to upload</span>
          {/* Desktop: browse text */}
          <span className="pointer-coarse:hidden">Browse file</span>
        </button>

        {/* Error message */}
        {displayError && (
          <p className="text-red-400 text-sm font-medium" role="alert">
            {displayError}
          </p>
        )}
      </div>

      {/* Limits display */}
      <p className="text-xs text-gray-500 text-center">
        500 rows max, 1MB file size limit
      </p>
    </div>
  )
}
