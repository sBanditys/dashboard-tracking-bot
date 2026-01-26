export interface UserGuild {
  id: string
  permissions: number
}

export interface User {
  id: string
  username: string
  avatar: string | null
  guilds: UserGuild[]
  active_sessions: number
}

export interface Session {
  user: User
  token: string
  expiresAt: string
}
