
import { useAuditLog } from '@/hooks/use-audit-log';
import { DataTable } from '@/components/ui/data-table';

interface AuditLogTableProps {
    guildId: string;
}

export function AuditLogTable({ guildId }: AuditLogTableProps) {
    const { data, isLoading } = useAuditLog(guildId);

    const columns = [
        {
            header: 'User',
            accessorKey: 'actor.name',
        },
        {
            header: 'Action',
            accessorKey: 'action',
        },
        {
            header: 'Target',
            accessorKey: 'target_type',
        },
        {
            header: 'Date',
            accessorKey: 'created_at',
        },
    ];

    return (
        <DataTable
            columns={columns}
            data={data?.entries ?? []}
            isLoading={isLoading}
        />
    );
}
