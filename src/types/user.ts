export interface User {
  id: string;
  username: string;
  discriminator?: string;
  avatar: string | null;
  email?: string;
}

export interface Session {
  user: User;
  token: string;
  expiresAt: string;
}
