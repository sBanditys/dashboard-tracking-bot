import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ returnTo?: string }>;
}) {
  const cookieStore = await cookies();
  const hasAuth = cookieStore.has('auth_token') || cookieStore.has('refresh_token');

  if (hasAuth) {
    redirect('/guilds');
  }

  // Unauthenticated: redirect to login, preserving returnTo as callbackUrl
  const params = await searchParams;
  const returnTo = params.returnTo;

  if (returnTo) {
    redirect(`/login?callbackUrl=${encodeURIComponent(returnTo)}`);
  }

  redirect('/login');
}
