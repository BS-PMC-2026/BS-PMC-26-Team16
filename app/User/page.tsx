import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function DashboardPage() {
  // Create a server-side Supabase client and get the logged-in user
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // If no user is logged in, send them to the login page
  if (!user) redirect('/login')

  // Fetch the user's profile row from the 'profiles' table using their auth ID
  const { data: profile } = await supabase
    .from('profiles')
    .select('first_name, last_name, email, phone, user_type, is_approved')
    .eq('id', user.id)
    .single()

  // Derived display values from the profile
  const fullName = profile ? `${profile.first_name} ${profile.last_name}` : 'User'
  const userType = profile?.user_type === 'provider' ? 'Service Provider' : 'Customer'
  const isApproved = profile?.is_approved

  return (
    <main className="min-h-screen bg-black text-white flex flex-col">
      <section className="flex-1 px-6 py-12 max-w-4xl mx-auto w-full">

        {/* Greeting header — shows the user's full name */}
        <div className="mb-10">
          <h2 className="text-4xl font-bold">
            Welcome back, <span className="text-blue-500">{fullName}</span>
          </h2>
          <p className="text-gray-400 mt-2">Here&apos;s your account overview.</p>
        </div>

        {/* Warning banner — only shown if the account hasn't been approved yet */}
        {!isApproved && (
          <div className="mb-8 bg-yellow-900/40 border border-yellow-600 text-yellow-300 rounded-xl px-5 py-4 text-sm">
            ⏳ Your account is pending approval. Some features may be limited.
          </div>
        )}

        {/* Info cards — each card displays one field from the user's profile */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-10">

          {/* Full name card */}
          <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800">
            <p className="text-gray-400 text-sm mb-1">Full Name</p>
            <p className="text-lg font-semibold">{fullName}</p>
          </div>

          {/* Email — falls back to the auth email if not in the profile */}
          <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800">
            <p className="text-gray-400 text-sm mb-1">Email</p>
            <p className="text-lg font-semibold">{profile?.email ?? user.email}</p>
          </div>

          {/* Phone — shows a dash if not set */}
          <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800">
            <p className="text-gray-400 text-sm mb-1">Phone</p>
            <p className="text-lg font-semibold">{profile?.phone ?? '—'}</p>
          </div>

          {/* Account type — either Customer or Service Provider */}
          <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800">
            <p className="text-gray-400 text-sm mb-1">Account Type</p>
            <p className="text-lg font-semibold">{userType}</p>
          </div>

          {/* Approval status — green badge if approved, yellow if pending */}
          <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800">
            <p className="text-gray-400 text-sm mb-1">Status</p>
            <span className={`inline-block mt-1 px-3 py-1 rounded-full text-sm font-medium ${isApproved ? 'bg-green-800 text-green-300' : 'bg-yellow-800 text-yellow-300'}`}>
              {isApproved ? 'Approved' : 'Pending Approval'}
            </span>
          </div>

        </div>

        {/* Action buttons — quick links to app features */}
        <div className="flex flex-wrap gap-4">
          <Link
            href=""
            className="bg-blue-600 hover:bg-blue-700 px-6 py-3 rounded-xl font-semibold transition"
          >
            Add your Own Station 🔋⚡
          </Link>
        </div>

      </section>

      {/* Page footer */}
      <footer className="text-center text-gray-500 text-sm p-4 border-t border-gray-800">
        Urban EV © 2026
      </footer>
    </main>
  )
}
