
import { useGuild, useUpdateGuildSettings } from '@/hooks/use-guilds';
import { InlineEditField } from './inline-edit-field';
import { ChannelSelect } from '../ui/combobox';

interface GuildSettingsFormProps {
    guildId: string;
}

export function GuildSettingsForm({ guildId }: GuildSettingsFormProps) {
    const { data: guild, isLoading } = useGuild(guildId);
    const updateSettings = useUpdateGuildSettings(guildId);

    if (isLoading) {
        return <div>Loading...</div>;
    }

    if (!guild) {
        return <div>Guild not found.</div>;
    }

    return (
        <div className="space-y-4">
            <h2 className="text-xl font-semibold">Guild Settings</h2>
            <InlineEditField
                label="Logs Channel"
                value={guild.settings.logs_channel_id ?? ''}
                onSave={(value) => updateSettings.mutate({ logs_channel_id: value })}
            />
            <InlineEditField
                label="Watch Category"
                value={guild.settings.watch_category_id ?? ''}
                onSave={(value) => updateSettings.mutate({ watch_category_id: value })}
            />
            <InlineEditField
                label="Pause Category"
                value={guild.settings.pause_category_id ?? ''}
                onSave={(value) => updateSettings.mutate({ pause_category_id: value })}
            />
            <InlineEditField
                label="Updates Channel"
                value={guild.settings.updates_channel_id ?? ''}
                onSave={(value) => updateSettings.mutate({ updates_channel_id: value })}
            />
            <InlineEditField
                label="Updates Role"
                value={guild.settings.updates_role_id ?? ''}
                onSave={(value) => updateSettings.mutate({ updates_role_id: value })}
            />
        </div>
    );
}
