
import { useState } from 'react';

// Inline edit field pattern
interface InlineEditProps {
  value: string
  onSave: (value: string) => void
  label: string
  isLoading?: boolean
}

export function InlineEditField({ value, onSave, label, isLoading }: InlineEditProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState(value)

  const handleSave = () => {
    onSave(editValue)
    setIsEditing(false)
  }

  const handleCancel = () => {
    setEditValue(value)
    setIsEditing(false)
  }

  if (!isEditing) {
    return (
      <button
        onClick={() => setIsEditing(true)}
        className="text-left w-full group"
      >
        <span className="text-gray-400 text-sm">{label}</span>
        <div className="flex items-center gap-2">
          <span className="text-white">{value || 'Not set'}</span>
          <span className="opacity-0 group-hover:opacity-100 text-gray-500 text-sm">Edit</span>
        </div>
      </button>
    )
  }

  return (
    <div>
      <label className="text-gray-400 text-sm">{label}</label>
      <div className="flex gap-2 mt-1">
        <input
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          className="flex-1 bg-surface border border-border rounded px-3 py-2 text-white"
          autoFocus
        />
        <button onClick={handleSave} disabled={isLoading} className="text-accent-purple">Save</button>
        <button onClick={handleCancel} className="text-gray-400">Cancel</button>
      </div>
    </div>
  )
}
