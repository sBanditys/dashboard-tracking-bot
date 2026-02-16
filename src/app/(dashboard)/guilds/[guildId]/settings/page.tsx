import { redirect } from 'next/navigation'

interface PageProps {
  params: Promise<{ guildId: string }>
}

export default async function GuildSettingsIndexPage({ params }: PageProps) {
  const { guildId } = await params
  redirect(`/guilds/${guildId}/settings/trash`)
}
