import { redirect } from 'next/navigation'

export default function Home() {
  // Redirect to dashboard home page
  redirect('/guilds')
}
