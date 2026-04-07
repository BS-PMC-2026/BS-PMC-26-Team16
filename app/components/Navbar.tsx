import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import LogoutButton from './LogoutButton'

export default async function Navbar() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let greeting = 'Hello Guest'

  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('first_name, last_name')
      .eq('id', user.id)
      .single()

    if (profile) {
      greeting = `Hello ${profile.first_name} ${profile.last_name}`
    }
  }

  return (
    <nav className="flex flex-wrap justify-between items-center px-4 py-3 gap-y-2 border-b border-gray-800">
      <h1 className="text-xl font-bold">Urban EV</h1>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <Link href="/" className="text-gray-300 hover:text-white text-sm">Home</Link>
        <Link href="/map" className="text-gray-300 hover:text-white text-sm">Map</Link>

        {user ? (
          <>
            <span className="text-gray-300 text-sm">{greeting}</span>
            <Link href="/User" className="text-gray-300 hover:text-white text-sm">Dashboard</Link>
            <LogoutButton />
          </>
        ) : (
          <Link href="/login" className="text-gray-300 hover:text-white text-sm">Login</Link>
        )}
      </div>
    </nav>
  )
}