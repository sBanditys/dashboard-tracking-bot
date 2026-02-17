'use client'

import { useState, useEffect } from 'react'
import { Listbox, ListboxButton, ListboxOption, ListboxOptions } from '@headlessui/react'
import { ChevronDown } from 'lucide-react'
import { useDebounce } from '@/hooks/use-debounce'
import { FilterBar } from '@/components/filters/filter-bar'
import { SearchInput } from '@/components/filters/search-input'
import { cn } from '@/lib/utils'
import type { ThresholdFilters } from '@/types/alert'

interface ThresholdFiltersProps {
  filters: ThresholdFilters
  onFiltersChange: (filters: ThresholdFilters) => void
  groups: { id: string; label: string }[]
}

const PLATFORM_OPTIONS = [
  { value: '', label: 'All platforms' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'tiktok', label: 'TikTok' },
  { value: 'youtube', label: 'YouTube' },
  { value: 'x', label: 'X' },
  { value: 'facebook', label: 'Facebook' },
]

const METRIC_OPTIONS = [
  { value: '', label: 'All metrics' },
  { value: 'views', label: 'Views' },
  { value: 'likes', label: 'Likes' },
  { value: 'comments', label: 'Comments' },
  { value: 'shares', label: 'Shares' },
  { value: 'followers', label: 'Followers' },
]

interface SimpleDropdownProps {
  value: string
  onChange: (value: string) => void
  options: { value: string; label: string }[]
  placeholder?: string
}

function SimpleDropdown({ value, onChange, options, placeholder = 'Select...' }: SimpleDropdownProps) {
  const selected = options.find((o) => o.value === value) ?? options[0]

  return (
    <Listbox value={value} onChange={onChange}>
      <div className="relative">
        <ListboxButton
          className={cn(
            'relative w-full sm:w-44 px-3 py-2.5 text-sm text-left',
            'bg-surface border border-border rounded-lg text-gray-300',
            'focus:outline-none focus:ring-2 focus:ring-accent-purple focus:border-transparent',
            'flex items-center justify-between gap-2 transition-colors'
          )}
        >
          <span className="truncate">{selected?.label ?? placeholder}</span>
          <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
        </ListboxButton>

        <ListboxOptions
          className={cn(
            'absolute z-50 mt-1 w-full rounded-lg border border-border bg-surface shadow-lg',
            'focus:outline-none overflow-auto max-h-60'
          )}
        >
          {options.map((option) => (
            <ListboxOption
              key={option.value}
              value={option.value}
              className={({ focus, selected: isSelected }) =>
                cn(
                  'px-3 py-2 text-sm cursor-pointer transition-colors',
                  focus ? 'bg-surface-hover text-white' : 'text-gray-300',
                  isSelected && 'text-white font-medium'
                )
              }
            >
              {option.label}
            </ListboxOption>
          ))}
        </ListboxOptions>
      </div>
    </Listbox>
  )
}

export function ThresholdFilters({ filters, onFiltersChange, groups }: ThresholdFiltersProps) {
  const [searchValue, setSearchValue] = useState(filters.search ?? '')
  const debouncedSearch = useDebounce(searchValue, 300)

  // Sync debounced search to parent filters
  useEffect(() => {
    if (debouncedSearch !== filters.search) {
      onFiltersChange({ ...filters, search: debouncedSearch || undefined })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch])

  const groupOptions = [
    { value: '', label: 'All groups' },
    ...groups.map((g) => ({ value: g.id, label: g.label })),
  ]

  return (
    <FilterBar>
      <SearchInput
        value={searchValue}
        onChange={setSearchValue}
        placeholder="Search groups or values..."
      />

      <SimpleDropdown
        value={filters.groupId ?? ''}
        onChange={(val) => onFiltersChange({ ...filters, groupId: val || undefined })}
        options={groupOptions}
        placeholder="All groups"
      />

      <SimpleDropdown
        value={filters.platform ?? ''}
        onChange={(val) => onFiltersChange({ ...filters, platform: val || undefined })}
        options={PLATFORM_OPTIONS}
        placeholder="All platforms"
      />

      <SimpleDropdown
        value={filters.metricType ?? ''}
        onChange={(val) => onFiltersChange({ ...filters, metricType: val || undefined })}
        options={METRIC_OPTIONS}
        placeholder="All metrics"
      />
    </FilterBar>
  )
}
