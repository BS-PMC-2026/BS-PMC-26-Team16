'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import { markNotificationRead } from '@/app/User/actions'

export type NavNotification = {
  id: string
  message: string
  read: boolean
  created_at: string
}

export default function NotificationBell({ initial }: { initial: NavNotification[] }) {
  const [notifications, setNotifications] = useState(initial)
  const [open, setOpen] = useState(false)
  const [, startTransition] = useTransition()
  const ref = useRef<HTMLDivElement>(null)

  const unreadCount = notifications.filter((n) => !n.read).length

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  function dismiss(id: string) {
    startTransition(async () => {
      await markNotificationRead(id)
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)))
    })
  }

  function dismissAll() {
    const unread = notifications.filter((n) => !n.read)
    startTransition(async () => {
      await Promise.all(unread.map((n) => markNotificationRead(n.id)))
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
    })
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative flex items-center justify-center w-9 h-9 rounded-full hover:bg-white/10 transition"
        title="Notifications"
      >
        <span className="text-lg">🔔</span>
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white px-1 leading-none">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-11 z-50 w-80 rounded-2xl border border-white/10 bg-slate-900 shadow-2xl shadow-black/50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
            <span className="text-sm font-semibold text-white">
              Notifications
              {unreadCount > 0 && (
                <span className="ml-2 text-xs font-normal text-cyan-300">{unreadCount} new</span>
              )}
            </span>
            {unreadCount > 0 && (
              <button
                onClick={dismissAll}
                className="text-xs text-gray-400 hover:text-white transition"
              >
                Mark all as read
              </button>
            )}
          </div>

          <ul className="max-h-80 overflow-y-auto divide-y divide-white/5">
            {notifications.length === 0 && (
              <li className="px-4 py-6 text-center text-sm text-gray-400">No notifications</li>
            )}
            {notifications.map((n) => (
              <li
                key={n.id}
                className={`flex gap-3 px-4 py-3 transition ${n.read ? 'opacity-50' : 'bg-cyan-500/5'}`}
              >
                <span className="mt-0.5 text-base shrink-0">{n.read ? '📭' : '📬'}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white leading-snug break-words">{n.message}</p>
                  <p className="mt-1 text-xs text-gray-500">
                    {new Date(n.created_at).toLocaleString('en-GB', {
                      timeZone: 'Asia/Jerusalem',
                      day: '2-digit',
                      month: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
                {!n.read && (
                  <button
                    onClick={() => dismiss(n.id)}
                    className="shrink-0 text-gray-500 hover:text-white transition text-xs mt-0.5"
                    title="Mark as read"
                  >
                    ✕
                  </button>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
