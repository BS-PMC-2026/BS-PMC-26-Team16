'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import { cancelVisit, completeVisitAsProvider } from './actions'

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

function useCountdown(since: string, limitMinutes = 30) {
  const deadline = new Date(since).getTime() + limitMinutes * 60 * 1000
  const [remaining, setRemaining] = useState(() => Math.max(0, Math.floor((deadline - Date.now()) / 1000)))

  useEffect(() => {
    const id = setInterval(() => {
      setRemaining(Math.max(0, Math.floor((deadline - Date.now()) / 1000)))
    }, 1000)
    return () => clearInterval(id)
  }, [deadline])

  const m = Math.floor(remaining / 60)
  const s = remaining % 60
  return { remaining, expired: remaining === 0, formatted: `${m}:${s.toString().padStart(2, '0')}` }
}

export default function ProviderActiveVisitPanel({ visit }: { visit: ActiveVisit }) {
  const elapsed = useElapsed(visit.created_at)
  const { expired, formatted: countdown, remaining } = useCountdown(visit.created_at)
  const [cancelled, setCancelled] = useState(false)
  const [completed, setCompleted] = useState(false)
  const [error, setError] = useState('')
  const [, startTransition] = useTransition()
  const autoCancelledRef = useRef(false)

  const hasArrived = visit.status === 'arrived'

  useEffect(() => {
    if (hasArrived || cancelled || !expired || autoCancelledRef.current) return
    autoCancelledRef.current = true
    startTransition(async () => {
      await cancelVisit(visit.id)
      setCancelled(true)
    })
  }, [expired, hasArrived, cancelled, visit.id])

  function handleCancel() {
    setError('')
    startTransition(async () => {
      const result = await cancelVisit(visit.id)
      if (result.error) setError(result.error)
      else setCancelled(true)
    })
  }

  function handleDoneCharging() {
    setError('')
    startTransition(async () => {
      const result = await completeVisitAsProvider(visit.id)
      if (result.error) setError(result.error)
      else setCompleted(true)
    })
  }

  if (cancelled) {
    return (
      <section className="mt-8 rounded-[2rem] border border-emerald-500/30 bg-emerald-500/10 p-6">
        <p className="text-emerald-200 font-medium">✅ Visit cancelled. Your station is now available again.</p>
      </section>
    )
  }

  if (completed) {
    return (
      <section className="mt-8 rounded-[2rem] border border-emerald-500/30 bg-emerald-500/10 p-6">
        <p className="text-emerald-200 font-medium">✅ Charging session completed. Your station is available again.</p>
      </section>
    )
  }

  const isUrgent = !hasArrived && remaining <= 5 * 60 && remaining > 0

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

        <div className={`flex items-center gap-3 rounded-2xl border px-4 py-3 ${
          isUrgent ? 'border-red-500/40 bg-red-500/10' : 'border-white/10 bg-white/5'
        }`}>
          <span className="text-2xl">{hasArrived ? '⏱️' : isUrgent ? '⚠️' : '⏳'}</span>
          <div>
            <p className={`text-xs ${isUrgent ? 'text-red-400' : 'text-gray-400'}`}>
              {hasArrived ? 'Time since arrival' : 'Auto-cancel in'}
            </p>
            <p className={`font-medium font-mono text-lg ${isUrgent ? 'text-red-300' : 'text-white'}`}>
              {hasArrived ? elapsed : countdown}
            </p>
          </div>
        </div>
      </div>

      {error && <p className="mb-3 text-sm text-red-300">{error}</p>}

      <div className="flex flex-col gap-3">
        {hasArrived && (
          <button
            onClick={handleDoneCharging}
            className="w-full rounded-full bg-cyan-400 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300"
          >
            ✅ Finish charging session
          </button>
        )}

        <button
          onClick={handleCancel}
          className="w-full rounded-2xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm font-semibold text-red-300 transition hover:bg-red-500/20"
        >
          🔓 Cancel visit & unlock station
        </button>
      </div>
    </section>
  )
}
