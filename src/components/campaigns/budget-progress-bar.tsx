import { cn } from '@/lib/utils'
import { centsToDisplay } from '@/lib/format'

interface BudgetProgressBarProps {
  totalEarnedCents: number
  budgetCents: number
}

function getBarColor(percent: number): string {
  if (percent >= 90) return 'bg-red-500'
  if (percent >= 80) return 'bg-orange-500'
  if (percent >= 50) return 'bg-yellow-500'
  return 'bg-green-500'
}

export function BudgetProgressBar({ totalEarnedCents, budgetCents }: BudgetProgressBarProps) {
  const percent = budgetCents > 0
    ? Math.min((totalEarnedCents / budgetCents) * 100, 100)
    : 0

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm text-gray-400">Budget Used</span>
        <span className="text-sm font-medium text-white">{percent.toFixed(1)}%</span>
      </div>
      <div className="h-2 w-full rounded-full bg-surface-hover overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-all', getBarColor(percent))}
          style={{ width: `${percent}%` }}
        />
      </div>
      <div className="flex items-center justify-between mt-1">
        <span className="text-xs text-gray-500">
          {centsToDisplay(totalEarnedCents)} spent
        </span>
        <span className="text-xs text-gray-500">
          {centsToDisplay(budgetCents)} total
        </span>
      </div>
    </div>
  )
}
