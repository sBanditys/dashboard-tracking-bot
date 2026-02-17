'use client'

import { Users, FileText, BarChart3, TrendingUp, Shield } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ExportDataType } from '@/types/export'

interface ExportTypeOption {
  value: Exclude<ExportDataType, 'gdpr'>
  label: string
  icon: React.ElementType
  description: string
}

const EXPORT_TYPES: ExportTypeOption[] = [
  {
    value: 'accounts',
    label: 'Accounts',
    icon: Users,
    description: 'Export tracked accounts with platform and group info',
  },
  {
    value: 'posts',
    label: 'Posts',
    icon: FileText,
    description: 'Export captured posts with metrics and timestamps',
  },
  {
    value: 'metrics',
    label: 'Metrics',
    icon: BarChart3,
    description: 'Export performance metrics by account and platform',
  },
  {
    value: 'analytics',
    label: 'Analytics',
    icon: TrendingUp,
    description: 'Export analytics summaries and trend data',
  },
  {
    value: 'audit',
    label: 'Audit',
    icon: Shield,
    description: 'Export audit log entries for compliance',
  },
]

interface ExportTypeSelectorProps {
  selected: ExportDataType | null
  onSelect: (type: ExportDataType) => void
}

/**
 * Radio card grid for selecting the export data type.
 *
 * Renders 5 standard export types (GDPR is handled separately in ExportTab).
 * Keyboard accessible: each card is a <button> with role="radio" inside
 * a role="radiogroup" container.
 */
export function ExportTypeSelector({ selected, onSelect }: ExportTypeSelectorProps) {
  return (
    <div role="radiogroup" aria-label="Export data type" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {EXPORT_TYPES.map(({ value, label, icon: Icon, description }) => {
        const isSelected = selected === value
        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={isSelected}
            onClick={() => onSelect(value)}
            className={cn(
              'border rounded-lg p-4 cursor-pointer transition-colors text-left w-full',
              isSelected
                ? 'border-accent-purple bg-accent-purple/10'
                : 'border-border hover:border-gray-500'
            )}
          >
            <div className="flex items-start gap-3">
              <Icon
                className={cn(
                  'w-6 h-6 flex-shrink-0 mt-0.5',
                  isSelected ? 'text-accent-purple' : 'text-gray-400'
                )}
              />
              <div className="space-y-0.5 min-w-0">
                <p className={cn('font-semibold text-sm', isSelected ? 'text-white' : 'text-gray-200')}>
                  {label}
                </p>
                <p className="text-xs text-gray-400 leading-relaxed">{description}</p>
              </div>
            </div>
          </button>
        )
      })}
    </div>
  )
}
