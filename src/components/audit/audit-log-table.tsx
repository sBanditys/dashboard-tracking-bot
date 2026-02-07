'use client'

import { useState } from 'react'
import { Listbox, ListboxButton, ListboxOptions, ListboxOption } from '@headlessui/react'
import { formatDistanceToNow } from 'date-fns'
import { useAuditLog } from '@/hooks/use-audit-log'
import { cn } from '@/lib/utils'
import type { AuditLogEntry } from '@/types/audit'

function safeFormatDate(dateString: string | null | undefined): string {
  if (!dateString) return 'Unknown'
  try {
    const date = new Date(dateString)
    if (isNaN(date.getTime())) return 'Unknown'
    return formatDistanceToNow(date, { addSuffix: true })
  } catch {
    return 'Unknown'
  }
}

interface AuditLogTableProps {
  guildId: string
}

export function AuditLogTable({ guildId }: AuditLogTableProps) {
  const [userFilter, setUserFilter] = useState('')
  const [actionFilter, setActionFilter] = useState('')
  const [page, setPage] = useState(1)

  const { data, isLoading, isError } = useAuditLog(guildId, {
    user: userFilter || undefined,
    action: actionFilter || undefined,
    page,
    limit: 25,
  })

  const users = data?.filters.users ?? []
  const actions = data?.filters.actions ?? []
  const entries = data?.entries ?? []
  const pagination = data?.pagination

  const humanizeAction = (action: string) => {
    // Transform 'account.create' -> 'Created account'
    const parts = action.split('.')
    if (parts.length === 2) {
      const [resource, verb] = parts
      const verbMap: Record<string, string> = {
        create: 'Created',
        update: 'Updated',
        delete: 'Deleted',
        enable: 'Enabled',
        disable: 'Disabled',
      }
      return `${verbMap[verb] || verb} ${resource}`
    }
    return action
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-400">Loading audit log...</div>
      </div>
    )
  }

  if (isError) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-red-400">Failed to load audit log</div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex gap-3">
        {/* User Filter */}
        <Listbox value={userFilter} onChange={setUserFilter}>
          <div className="relative">
            <ListboxButton
              className={cn(
                'relative w-48 py-3 pl-3 pr-10 text-left',
                'bg-surface border border-border rounded-lg',
                'cursor-pointer text-sm text-gray-300',
                'focus:outline-none focus:ring-2 focus:ring-accent-purple focus:border-transparent',
                'transition-colors'
              )}
            >
              <span className="block truncate">
                {userFilter ? users.find(u => u.id === userFilter)?.name ?? 'All Users' : 'All Users'}
              </span>
              <span className="absolute inset-y-0 right-0 flex items-center pr-3">
                <svg
                  className="w-4 h-4 text-gray-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </span>
            </ListboxButton>

            <ListboxOptions
              anchor="bottom start"
              className={cn(
                'absolute z-20 mt-1 w-48',
                'bg-surface border border-border rounded-lg shadow-lg',
                'focus:outline-none overflow-hidden max-h-60 overflow-y-auto'
              )}
            >
              <ListboxOption
                value=""
                className={cn(
                  'relative cursor-pointer select-none py-3 pl-10 pr-4',
                  'text-sm text-gray-300',
                  'data-[focus]:bg-background data-[selected]:text-white',
                  'transition-colors'
                )}
              >
                {({ selected }) => (
                  <>
                    <span className={cn('block truncate', selected ? 'font-medium' : 'font-normal')}>
                      All Users
                    </span>
                    {selected && (
                      <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-accent-purple">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path
                            fillRule="evenodd"
                            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </span>
                    )}
                  </>
                )}
              </ListboxOption>
              {users.map((user) => (
                <ListboxOption
                  key={user.id}
                  value={user.id}
                  className={cn(
                    'relative cursor-pointer select-none py-3 pl-10 pr-4',
                    'text-sm text-gray-300',
                    'data-[focus]:bg-background data-[selected]:text-white',
                    'transition-colors'
                  )}
                >
                  {({ selected }) => (
                    <>
                      <span className={cn('block truncate', selected ? 'font-medium' : 'font-normal')}>
                        {user.name}
                      </span>
                      {selected && (
                        <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-accent-purple">
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path
                              fillRule="evenodd"
                              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                              clipRule="evenodd"
                            />
                          </svg>
                        </span>
                      )}
                    </>
                  )}
                </ListboxOption>
              ))}
            </ListboxOptions>
          </div>
        </Listbox>

        {/* Action Filter */}
        <Listbox value={actionFilter} onChange={setActionFilter}>
          <div className="relative">
            <ListboxButton
              className={cn(
                'relative w-48 py-3 pl-3 pr-10 text-left',
                'bg-surface border border-border rounded-lg',
                'cursor-pointer text-sm text-gray-300',
                'focus:outline-none focus:ring-2 focus:ring-accent-purple focus:border-transparent',
                'transition-colors'
              )}
            >
              <span className="block truncate">
                {actionFilter ? humanizeAction(actionFilter) : 'All Actions'}
              </span>
              <span className="absolute inset-y-0 right-0 flex items-center pr-3">
                <svg
                  className="w-4 h-4 text-gray-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </span>
            </ListboxButton>

            <ListboxOptions
              anchor="bottom start"
              className={cn(
                'absolute z-20 mt-1 w-48',
                'bg-surface border border-border rounded-lg shadow-lg',
                'focus:outline-none overflow-hidden max-h-60 overflow-y-auto'
              )}
            >
              <ListboxOption
                value=""
                className={cn(
                  'relative cursor-pointer select-none py-3 pl-10 pr-4',
                  'text-sm text-gray-300',
                  'data-[focus]:bg-background data-[selected]:text-white',
                  'transition-colors'
                )}
              >
                {({ selected }) => (
                  <>
                    <span className={cn('block truncate', selected ? 'font-medium' : 'font-normal')}>
                      All Actions
                    </span>
                    {selected && (
                      <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-accent-purple">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path
                            fillRule="evenodd"
                            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </span>
                    )}
                  </>
                )}
              </ListboxOption>
              {actions.map((action) => (
                <ListboxOption
                  key={action}
                  value={action}
                  className={cn(
                    'relative cursor-pointer select-none py-3 pl-10 pr-4',
                    'text-sm text-gray-300',
                    'data-[focus]:bg-background data-[selected]:text-white',
                    'transition-colors'
                  )}
                >
                  {({ selected }) => (
                    <>
                      <span className={cn('block truncate', selected ? 'font-medium' : 'font-normal')}>
                        {humanizeAction(action)}
                      </span>
                      {selected && (
                        <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-accent-purple">
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path
                              fillRule="evenodd"
                              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                              clipRule="evenodd"
                            />
                          </svg>
                        </span>
                      )}
                    </>
                  )}
                </ListboxOption>
              ))}
            </ListboxOptions>
          </div>
        </Listbox>
      </div>

      {/* Table */}
      <div className="bg-surface rounded-lg border border-border overflow-hidden">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">Time</th>
              <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">User</th>
              <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">Action</th>
              <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">Details</th>
            </tr>
          </thead>
          <tbody>
            {entries.length === 0 ? (
              <tr>
                <td colSpan={4} className="py-8 px-4 text-center text-gray-400">
                  No audit log entries found
                </td>
              </tr>
            ) : (
              entries.map((entry: AuditLogEntry) => (
                <tr key={entry.id} className="border-b border-border hover:bg-background/50 transition-colors">
                  <td className="py-3 px-4 text-sm text-gray-300">
                    {safeFormatDate(entry.created_at)}
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-300">
                    {entry.actor.name || entry.actor.id}
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-300">
                    {humanizeAction(entry.action)}
                  </td>
                  <td className="py-3 px-4">
                    <div className="space-y-1">
                      {entry.target_name && (
                        <div className="text-sm text-gray-300">{entry.target_name}</div>
                      )}
                      {entry.changes && Object.entries(entry.changes).map(([key, change]) => (
                        <div key={key} className="text-sm">
                          <span className="text-gray-400">{key}:</span>
                          <span className="text-red-400 line-through ml-2">{String(change.old)}</span>
                          <span className="text-gray-400 mx-1">→</span>
                          <span className="text-green-400">{String(change.new)}</span>
                        </div>
                      ))}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pagination && pagination.total_pages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-400">
            Page {pagination.page} of {pagination.total_pages}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={pagination.page === 1}
              className={cn(
                'px-4 py-2 text-sm font-medium rounded-lg transition-colors',
                pagination.page === 1
                  ? 'bg-surface/50 text-gray-500 cursor-not-allowed'
                  : 'bg-surface text-gray-300 hover:bg-background hover:text-white'
              )}
            >
              Previous
            </button>
            <button
              onClick={() => setPage(p => Math.min(pagination.total_pages, p + 1))}
              disabled={pagination.page === pagination.total_pages}
              className={cn(
                'px-4 py-2 text-sm font-medium rounded-lg transition-colors',
                pagination.page === pagination.total_pages
                  ? 'bg-surface/50 text-gray-500 cursor-not-allowed'
                  : 'bg-surface text-gray-300 hover:bg-background hover:text-white'
              )}
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
