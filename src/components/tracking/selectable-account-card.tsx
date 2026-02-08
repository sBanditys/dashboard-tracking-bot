'use client'

import { AccountCard } from './account-card'
import { cn } from '@/lib/utils'
import type { Account } from '@/types/tracking'

interface SelectableAccountCardProps {
  account: Account
  guildId: string
  index: number
  selected: boolean
  onSelect: (id: string, index: number, event: React.MouseEvent) => void
}

export function SelectableAccountCard({
  account,
  guildId,
  index,
  selected,
  onSelect,
}: SelectableAccountCardProps) {
  return (
    <div
      className={cn(
        'flex items-start gap-3 transition-all',
        selected && 'border-l-2 border-l-accent-purple bg-accent-purple/5 pl-3 -ml-3 rounded-l'
      )}
    >
      {/* Checkbox */}
      <div className="flex-shrink-0 pt-4">
        <label className="relative block cursor-pointer">
          <input
            type="checkbox"
            checked={selected}
            onChange={() => {/* handled by onClick for shift-click support */}}
            onClick={(e) => onSelect(account.id, index, e)}
            className={cn(
              'appearance-none w-5 h-5 border-2 border-border rounded bg-surface cursor-pointer',
              'checked:bg-accent-purple checked:border-accent-purple',
              'focus:outline-none focus:ring-2 focus:ring-accent-purple focus:ring-offset-2 focus:ring-offset-background',
              'transition-colors'
            )}
          />
          {/* Check icon overlay */}
          {selected && (
            <svg
              className="absolute top-0.5 left-0.5 w-4 h-4 text-white pointer-events-none"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={3}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          )}
        </label>
      </div>

      {/* Account Card */}
      <div className="flex-1 min-w-0">
        <AccountCard account={account} guildId={guildId} />
      </div>
    </div>
  )
}
