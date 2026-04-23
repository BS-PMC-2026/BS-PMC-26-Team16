import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import LogoutButton from './LogoutButton'

export default async function Navbar() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let greeting = 'Hello Guest'
  let isAdmin = false
  let isProvider = false

  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('first_name, last_name, user_type')
      .eq('id', user.id)
      .single()

    if (profile) {
      greeting = `Hello ${profile.first_name} ${profile.last_name}`
      isAdmin = profile.user_type === 'admin'
      isProvider = profile.user_type === 'provider'
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

            <Link href="/User" className="text-gray-300 hover:text-white text-sm">
              Dashboard
            </Link>

            {isProvider && (
              <Link
                href="/add-point"
                className="text-green-400 hover:text-green-300 text-sm font-semibold"
              >
                + Add Point
              </Link>
            )}

            {isAdmin && (
              <Link
                href="/admin/approvals"
                className="text-yellow-400 hover:text-yellow-300 text-sm font-semibold"
              >
                Approvals
              </Link>
            )}

            <LogoutButton />
          </>
        ) : (
          <Link href="/login" className="text-gray-300 hover:text-white text-sm">
            Login
          </Link>
        )}
      </div>
    </nav>
  )
}