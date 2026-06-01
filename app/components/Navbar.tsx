import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import LogoutButton from './LogoutButton'
import NotificationBell from './NotificationBell'

export default async function Navbar() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let greeting = 'Guest'
  let isAdmin = false
  let isProvider = false
  let navNotifications: { id: string; message: string; read: boolean; created_at: string }[] = []

  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('first_name, last_name, user_type')
      .eq('id', user.id)
      .single()

    if (profile) {
      greeting = `${profile.first_name ?? ''} ${profile.last_name ?? ''}`.trim() || user.email || 'User'
      isAdmin = profile.user_type === 'admin'
      isProvider = profile.user_type === 'provider'
    }

    if (isProvider) {
      const { data } = await supabase
        .from('notifications')
        .select('id, message, read, created_at')
        .eq('recipient_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20)
      navNotifications = data ?? []
    }
  }

  return (
    <nav className="sticky top-0 z-40 border-b border-white/10 bg-gray-950/90 text-white backdrop-blur">
      <div className="mx-auto flex min-h-16 w-full items-center justify-between gap-4 px-5">
        <Link href={user ? (isAdmin ? '/admin' : '/User') : '/'} className="flex items-center gap-3 shrink-0">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-cyan-400/30 bg-cyan-400/10 text-sm font-black text-cyan-300">
            EV
          </span>
          <span className="leading-tight">
            <span className="block text-base font-black tracking-tight">Urban EV</span>
            <span className="block text-[11px] text-gray-500">Smart charging</span>
          </span>
        </Link>

        <div className="flex min-w-0 flex-wrap items-center justify-end gap-2">

          {user ? (
            <>
              <span className="hidden max-w-52 truncate rounded-xl border border-white/8 bg-white/[0.04] px-3 py-2 text-xs text-gray-300 sm:block">
                {isAdmin ? 'Admin' : isProvider ? 'Provider' : 'Customer'} · {greeting}
              </span>

              {!isAdmin && (
                <NavLink href="/User" label="Dashboard" />
              )}

              {!isAdmin && (
                <NavLink href="/map" label="Map" />
              )}

              {isAdmin && (
                <NavLink href="/admin" label="Dashboard" emphasis />
              )}

              {isProvider && <NotificationBell initial={navNotifications} />}

              <LogoutButton />
            </>
          ) : (
            <Link
              href="/login"
              className="rounded-xl border border-cyan-400/30 bg-cyan-400/10 px-4 py-2 text-sm font-semibold text-cyan-200 transition hover:bg-cyan-400/20 hover:text-white"
            >
              Login
            </Link>
          )}
        </div>
      </div>
    </nav>
  )
}

function NavLink({ href, label, emphasis = false }: { href: string; label: string; emphasis?: boolean }) {
  return (
    <Link
      href={href}
      className={`rounded-xl border px-3 py-2 text-sm font-semibold transition ${
        emphasis
          ? 'border-cyan-400/30 bg-cyan-400/10 text-cyan-200 hover:bg-cyan-400/20 hover:text-white'
          : 'border-white/8 bg-white/[0.04] text-gray-300 hover:bg-white/[0.08] hover:text-white'
      }`}
    >
      {label}
    </Link>
  )
}
