'use client'

import { useState, useTransition } from 'react'
import { markNotificationRead } from './actions'

export type Notification = {
  id: string
  message: string
  read: boolean
  created_at: string
}

export default function ProviderNotificationsPanel({ notifications: initial }: { notifications: Notification[] }) {
  const [notifications, setNotifications] = useState(initial)
  const [, startTransition] = useTransition()

  const unread = notifications.filter((n) => !n.read)

  function dismiss(id: string) {
    startTransition(async () => {
      await markNotificationRead(id)
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n))
      )
    })
  }

  function dismissAll() {
    startTransition(async () => {
      await Promise.all(unread.map((n) => markNotificationRead(n.id)))
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
    })
  }

  if (notifications.length === 0) return null

  return (
    <section className="mt-8 rounded-[2rem] border border-cyan-500/20 bg-slate-950/70 p-6 shadow-2xl shadow-cyan-950/20 backdrop-blur">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-white">
            🔔 התראות
            {unread.length > 0 && (
              <span className="ml-2 inline-flex items-center rounded-full bg-cyan-500/20 border border-cyan-400/30 px-2.5 py-0.5 text-xs font-medium text-cyan-200">
                {unread.length} חדשות
              </span>
            )}
          </h2>
          <p className="mt-1 text-sm text-gray-400">לקוחות שהודיעו שהם בדרך אליך</p>
        </div>
        {unread.length > 1 && (
          <button
            onClick={dismissAll}
            className="text-xs text-gray-400 hover:text-cyan-300 transition"
          >
            סמן הכל כנקרא
          </button>
        )}
      </div>

      <ul className="space-y-3">
        {notifications.map((n) => (
          <li
            key={n.id}
            className={`flex items-start gap-3 rounded-2xl border px-4 py-3 transition ${
              n.read
                ? 'border-white/5 bg-white/3 opacity-50'
                : 'border-cyan-500/20 bg-cyan-500/5'
            }`}
          >
            <span className="mt-0.5 text-lg">{n.read ? '📭' : '📬'}</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-white leading-snug">{n.message}</p>
              <p className="mt-1 text-xs text-gray-500">
                {new Date(n.created_at).toLocaleString('he-IL', {
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
                className="shrink-0 text-xs text-gray-400 hover:text-white transition mt-0.5"
                title="סמן כנקרא"
              >
                ✕
              </button>
            )}
          </li>
        ))}
      </ul>
    </section>
  )
}
