'use client'

import { useEffect, useState, useTransition } from 'react'
import { cancelVisit } from './actions'

export type ActiveVisit = {
  id: string
  visitor_name: string | null
  visitor_phone: string | null
  created_at: string
  status: 'on_the_way' | 'arrived'
}

function useElapsed(since: string) {
  const [elapsed, setElapsed] = useState('')
  useEffect(() => {
    function update() {
      const diff = Math.floor((Date.now() - new Date(since).getTime()) / 1000)
      const h = Math.floor(diff / 3600)
      const m = Math.floor((diff % 3600) / 60)
      const s = diff % 60
      setElapsed(h > 0 ? `${h}h ${m}m` : m > 0 ? `${m}m ${s}s` : `${s}s`)
    }
    update()
    const id = setInterval(update, 1000)
    return () => clearInterval(id)
  }, [since])
  return elapsed
}

export default function ProviderActiveVisitPanel({ visit }: { visit: ActiveVisit }) {
  const elapsed = useElapsed(visit.created_at)
  const [cancelled, setCancelled] = useState(false)
  const [error, setError] = useState('')
  const [, startTransition] = useTransition()

  function handleCancel() {
    startTransition(async () => {
      const result = await cancelVisit(visit.id)
      if (result.error) setError(result.error)
      else setCancelled(true)
    })
  }

  if (cancelled) {
    return (
      <section className="mt-8 rounded-[2rem] border border-emerald-500/30 bg-emerald-500/10 p-6">
        <p className="text-emerald-200 font-medium">✅ Visit cancelled. Your station is now available again.</p>
      </section>
    )
  }

  const hasArrived = visit.status === 'arrived'

  return (
    <section className={`mt-8 rounded-[2rem] border p-6 shadow-2xl backdrop-blur ${
      hasArrived
        ? 'border-emerald-500/40 bg-emerald-500/10'
        : 'border-amber-500/30 bg-amber-500/10'
    }`}>
      <div className="mb-4">
        <h2 className="text-xl font-semibold text-white flex items-center gap-2">
          {hasArrived ? '📍 Customer has arrived!' : '🔒 Someone is on the way'}
        </h2>
        <p className="mt-1 text-sm text-gray-400">
          {hasArrived
            ? 'The customer is at your station and charging.'
            : 'Your station is reserved until the visitor marks "Done charging".'}
        </p>
      </div>

      <div className="space-y-3 mb-6">
        <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
          <span className="text-2xl">👤</span>
          <div>
            <p className="text-xs text-gray-400">Visitor</p>
            <p className="text-white font-medium">{visit.visitor_name ?? 'Unknown'}</p>
          </div>
          <span className={`ml-auto text-xs font-semibold px-2 py-1 rounded-full ${
            hasArrived
              ? 'bg-emerald-500/20 text-emerald-300'
              : 'bg-amber-500/20 text-amber-300'
          }`}>
            {hasArrived ? '📍 Arrived' : '🚗 On the way'}
          </span>
        </div>

        {visit.visitor_phone && (
          <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
            <span className="text-2xl">📞</span>
            <div>
              <p className="text-xs text-gray-400">Phone</p>
              <a
                href={`tel:${visit.visitor_phone}`}
                className="text-cyan-300 font-medium hover:text-cyan-200 transition"
              >
                {visit.visitor_phone}
              </a>
            </div>
          </div>
        )}

        <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
          <span className="text-2xl">⏱️</span>
          <div>
            <p className="text-xs text-gray-400">{hasArrived ? 'Time since arrival' : 'Time since departure'}</p>
            <p className="text-white font-medium font-mono">{elapsed}</p>
          </div>
        </div>
      </div>

      {error && <p className="mb-3 text-sm text-red-300">{error}</p>}

      <button
        onClick={handleCancel}
        className="w-full rounded-2xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm font-semibold text-red-300 transition hover:bg-red-500/20"
      >
        🔓 Cancel visit & unlock station
      </button>
    </section>
  )
}
