'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError('אימייל או סיסמה שגויים')
      setLoading(false)
      return
    }

    setShowSuccess(true)
    setTimeout(() => {
      router.push('/map')
    }, 2000)
  }

  return (
    <main className="min-h-screen bg-black text-white flex flex-col">

      {showSuccess && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/60 z-50">
          <div className="bg-gray-900 border border-green-500 rounded-2xl p-8 text-center shadow-xl">
            <div className="text-4xl mb-4">✅</div>
            <h3 className="text-xl font-bold text-green-400 mb-2">Welcome Back!</h3>
            <p className="text-gray-400">Redirecting to the map...</p>
          </div>
        </div>
      )}

      <section className="flex flex-1 items-center justify-center px-6">
        <div className="w-full max-w-sm">
          <h2 className="text-3xl font-bold mb-8 text-center">Log In</h2>

          <form onSubmit={handleLogin} className="flex flex-col gap-4">
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
            />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
            />

            {error && <p className="text-red-400 text-sm text-center">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 px-6 py-3 rounded-xl font-semibold transition"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <p className="text-gray-400 text-sm text-center mt-6">
           DO NOT HAVE AN ACCOUNT?{' '}
            <Link href="/signup" className="text-blue-400 hover:text-blue-300">
              Sign Up 
            </Link>
          </p>
        </div>
      </section>
    </main>
  )
}
