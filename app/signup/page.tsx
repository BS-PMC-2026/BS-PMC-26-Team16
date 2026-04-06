'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function SignupPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showSuccess, setShowSuccess] = useState(false)
  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    id_number: '',
    password: '',
  })

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const supabase = createClient()

    // יצירת משתמש ב-Auth
    const { error: signUpError } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        data: {
          first_name: form.first_name,
          last_name: form.last_name,
          phone: form.phone,
          id_number: form.id_number,
        },
      },
    })

    if (signUpError) {
      setError(signUpError.message ?? 'Sign up failed')
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
            <h3 className="text-xl font-bold text-green-400 mb-2">Sign Up Successful!</h3>
            <p className="text-gray-400">Redirecting to the map...</p>
          </div>
        </div>
      )}

      <section className="flex flex-1 items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          <h2 className="text-3xl font-bold mb-8 text-center">Sign Up</h2>

          <form onSubmit={handleSignup} className="flex flex-col gap-4">
            <div className="flex gap-3">
              <input
                name="first_name"
                type="text"
                placeholder="First Name"
                value={form.first_name}
                onChange={handleChange}
                required
                className="w-1/2 bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
              />
              <input
                name="last_name"
                type="text"
                placeholder="Last Name"
                value={form.last_name}
                onChange={handleChange}
                required
                className="w-1/2 bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
              />
            </div>

            <input
              name="email"
              type="email"
              placeholder="Email"
              value={form.email}
              onChange={handleChange}
              required
              className="bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
            />

            <input
              name="phone"
              type="tel"
              placeholder="Phone Number"
              value={form.phone}
              onChange={handleChange}
              required
              className="bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
            />

            <input
              name="id_number"
              type="text"
              placeholder="ID Number"
              value={form.id_number}
              onChange={handleChange}
              required
              maxLength={9}
              className="bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
            />

            <input
              name="password"
              type="password"
              placeholder="Password"
              value={form.password}
              onChange={handleChange}
              required
              minLength={6}
              className="bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
            />

            {error && <p className="text-red-400 text-sm text-center">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 px-6 py-3 rounded-xl font-semibold transition"
            >
              {loading ? 'Signing up...' : 'Sign Up'}
            </button>
          </form>

          <p className="text-gray-400 text-sm text-center mt-6">
           ALREADY HAVE AN ACCOUNT?{' '}
            <Link href="/login" className="text-blue-400 hover:text-blue-300">
              Login
            </Link>
          </p>
        </div>
      </section>
    </main>
  )
}
