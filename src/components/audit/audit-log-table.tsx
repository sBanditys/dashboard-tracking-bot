
import { useAuditLog, type AuditLogEntry } from '@/hooks/use-audit-log';
import { DataTable } from '@/components/ui/data-table';

interface AuditLogTableProps {
    guildId: string;
}

export function AuditLogTable({ guildId }: AuditLogTableProps) {
    const { data, isLoading } = useAuditLog(guildId);

    const columns = [
        {
            key: 'actor',
            header: 'User',
            render: (item: AuditLogEntry) => item.actor?.name ?? '-',
        },
        {
            key: 'action',
            header: 'Action',
        },
        {
            key: 'target_type',
            header: 'Target',
        },
        {
            key: 'created_at',
            header: 'Date',
            render: (item: AuditLogEntry) => new Date(item.created_at).toLocaleString(),
        },
    ];

    return (
        <DataTable
            columns={columns}
            data={data?.entries ?? []}
            isLoading={isLoading}
            keyExtractor={(item) => item.id}
        />
    );
}
