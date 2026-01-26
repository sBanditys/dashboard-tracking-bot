import { cn } from '@/lib/utils'
import { Skeleton } from './skeleton'

interface Column<T> {
    key: string
    header: string
    render?: (item: T) => React.ReactNode
    className?: string
}

interface DataTableProps<T> {
    columns: Column<T>[]
    data: T[]
    isLoading?: boolean
    emptyMessage?: string
    keyExtractor: (item: T) => string
    className?: string
}

export function DataTable<T>({
    columns,
    data,
    isLoading,
    emptyMessage = 'No data found',
    keyExtractor,
    className,
}: DataTableProps<T>) {
    if (isLoading) {
        return (
            <div className={cn('bg-surface border border-border rounded-sm overflow-hidden', className)}>
                <table className="w-full">
                    <thead className="bg-background/50">
                        <tr>
                            {columns.map((col) => (
                                <th
                                    key={col.key}
                                    className={cn(
                                        'px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider',
                                        col.className
                                    )}
                                >
                                    {col.header}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                        {[1, 2, 3, 4, 5].map((i) => (
                            <tr key={i}>
                                {columns.map((col) => (
                                    <td key={col.key} className="px-4 py-3">
                                        <Skeleton className="h-5 w-full" />
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        )
    }

    if (data.length === 0) {
        return (
            <div className={cn('bg-surface border border-border rounded-sm p-8 text-center', className)}>
                <p className="text-gray-400">{emptyMessage}</p>
            </div>
        )
    }

    return (
        <div className={cn('bg-surface border border-border rounded-sm overflow-hidden', className)}>
            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead className="bg-background/50">
                        <tr>
                            {columns.map((col) => (
                                <th
                                    key={col.key}
                                    className={cn(
                                        'px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider',
                                        col.className
                                    )}
                                >
                                    {col.header}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                        {data.map((item) => (
                            <tr key={keyExtractor(item)} className="hover:bg-background/30 transition-colors">
                                {columns.map((col) => (
                                    <td key={col.key} className={cn('px-4 py-3 text-sm text-gray-300', col.className)}>
                                        {col.render
                                            ? col.render(item)
                                            : (item as Record<string, unknown>)[col.key]?.toString() ?? '-'}
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    )
}
