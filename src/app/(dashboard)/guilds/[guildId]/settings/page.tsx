import { redirect } from 'next/navigation'

interface PageProps {
  params: { guildId: string }
}

export default function GuildSettingsIndexPage({ params }: PageProps) {
  redirect(`/guilds/${params.guildId}/settings/trash`)
}
