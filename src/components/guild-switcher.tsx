'use client'

import { Menu } from '@headlessui/react'
import { useGuilds } from '@/hooks/use-guilds'
import { useParams, useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'

export function GuildSwitcher() {
  const { data, isLoading } = useGuilds()
  const params = useParams()
  const router = useRouter()
  const currentGuildId = params.guildId as string | undefined

  const currentGuild = data?.guilds.find(g => g.id === currentGuildId)

  // Don't render if no guilds or still loading
  if (isLoading || !data || data.guilds.length === 0) {
    return null
  }

  return (
    <Menu as="div" className="relative">
      <Menu.Button className="flex items-center gap-2 px-3 py-2 bg-surface border border-border rounded-sm hover:border-accent-purple/50 transition-colors max-w-[200px]">
        <span className="text-sm font-medium text-white truncate">
          {currentGuild?.name || 'Select Guild'}
        </span>
        <svg
          className="w-4 h-4 text-gray-400 flex-shrink-0"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </Menu.Button>

      <Menu.Items className="absolute left-0 mt-2 w-64 bg-surface border border-border rounded-sm shadow-lg overflow-hidden z-50 max-h-80 overflow-y-auto">
        <div className="py-1">
          {data.guilds.map((guild) => (
            <Menu.Item key={guild.id}>
              {({ active }) => (
                <button
                  onClick={() => router.push(`/guilds/${guild.id}`)}
                  className={cn(
                    'w-full px-4 py-3 text-left flex items-center justify-between transition-colors',
                    active ? 'bg-accent-purple/10' : '',
                    guild.id === currentGuildId ? 'bg-accent-purple/20' : ''
                  )}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">
                      {guild.name}
                    </p>
                    <p className="text-xs text-gray-400 truncate">
                      {guild.client_name}
                    </p>
                  </div>
                  {guild.id === currentGuildId && (
                    <svg
                      className="w-4 h-4 text-accent-purple ml-2 flex-shrink-0"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  )}
                </button>
              )}
            </Menu.Item>
          ))}
        </div>
      </Menu.Items>
    </Menu>
  )
}
