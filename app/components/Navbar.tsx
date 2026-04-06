import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'

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
    <nav className="flex justify-between items-center p-6 border-b border-gray-800">
      <h1 className="text-xl font-bold">Urban EV</h1>
      <div className="flex items-center gap-6">
        <Link href="/" className="text-gray-300 hover:text-white">Home</Link>
        <Link href="/map" className="text-gray-300 hover:text-white">Map</Link>
        {user ? (
          <span className="bg-blue-600 px-4 py-1.5 rounded-full text-sm font-medium">
            {greeting}
          </span>
        ) : (
          <>
            <span className="text-gray-500 text-sm">{greeting}</span>
            <Link href="/login" className="bg-blue-600 hover:bg-blue-700 px-4 py-1.5 rounded-full text-sm font-medium transition">
              Login
            </Link>
          </>
        )}
      </div>
    </nav>
  )
}
