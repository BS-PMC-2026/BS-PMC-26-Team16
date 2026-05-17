'use client'

import { useEffect, useState, useTransition } from 'react'
import { markArrived, completeVisit, cancelVisit, submitRating } from './actions'

export type CustomerVisit = {
  id: string
  station_address: string
  created_at: string
  status: 'on_the_way' | 'arrived' | 'completed'
  already_rated: boolean
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

function StarRating({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hovered, setHovered] = useState(0)
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onMouseEnter={() => setHovered(star)}
          onMouseLeave={() => setHovered(0)}
          onClick={() => onChange(star)}
          className="text-3xl transition-transform hover:scale-110"
        >
          {star <= (hovered || value) ? '⭐' : '☆'}
        </button>
      ))}
    </div>
  )
}

type Phase = 'on_the_way' | 'arrived' | 'rating' | 'done'

function initialPhase(visit: CustomerVisit): Phase {
  if (visit.status === 'on_the_way') return 'on_the_way'
  if (visit.status === 'arrived') return 'arrived'
  if (visit.status === 'completed' && !visit.already_rated) return 'rating'
  return 'done'
}

export default function CustomerActiveVisitPanel({ visit }: { visit: CustomerVisit }) {
  const elapsed = useElapsed(visit.created_at)
  const [phase, setPhase] = useState<Phase>(initialPhase(visit))
  const [score, setScore] = useState(0)
  const [comment, setComment] = useState('')
  const [error, setError] = useState('')
  const [, startTransition] = useTransition()

  function handleArrived() {
    setError('')
    startTransition(async () => {
      const result = await markArrived(visit.id)
      if (result.error) setError(result.error)
      else setPhase('arrived')
    })
  }

  function handleDone() {
    setError('')
    startTransition(async () => {
      const result = await completeVisit(visit.id)
      if (result.error) setError(result.error)
      else setPhase('rating')
    })
  }

  function handleCancel() {
    setError('')
    startTransition(async () => {
      const result = await cancelVisit(visit.id)
      if (result.error) setError(result.error)
      else setPhase('done')
    })
  }

  function handleRating() {
    if (score === 0) { setError('Please select a rating.'); return }
    setError('')
    startTransition(async () => {
      const result = await submitRating(visit.id, score, comment)
      if (result.error) setError(result.error)
      else setPhase('done')
    })
  }

  if (phase === 'done') {
    return (
      <section className="mt-8 rounded-[2rem] border border-emerald-500/30 bg-emerald-500/10 p-6">
        <p className="text-emerald-200 font-medium">✅ All done! Thanks for using Urban EV.</p>
      </section>
    )
  }

  if (phase === 'rating') {
    return (
      <section className="mt-8 rounded-[2rem] border border-cyan-500/20 bg-slate-950/70 p-6 shadow-2xl shadow-cyan-950/20 backdrop-blur">
        <h2 className="text-xl font-semibold text-white mb-1">Rate your experience</h2>
        <p className="text-sm text-gray-400 mb-6">
          How was the charging session at <span className="text-cyan-200">{visit.station_address}</span>?
        </p>
        <div className="space-y-4">
          <div>
            <StarRating value={score} onChange={setScore} />
          </div>
          <div>
            <label className="block text-sm text-gray-300 mb-1">Comment (optional)</label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={3}
              placeholder="Anything you'd like to share..."
              className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none transition focus:border-cyan-400 placeholder:text-gray-500 resize-none"
            />
          </div>
          {error && <p className="text-sm text-red-300">{error}</p>}
          <div className="flex gap-3">
            <button
              onClick={handleRating}
              className="flex-1 rounded-full bg-cyan-400 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300"
            >
              Submit rating
            </button>
            <button
              onClick={() => setPhase('done')}
              className="rounded-full border border-white/10 px-5 py-3 text-sm text-gray-400 transition hover:text-white"
            >
              Skip
            </button>
          </div>
        </div>
      </section>
    )
  }

  if (phase === 'arrived') {
    return (
      <section className="mt-8 rounded-[2rem] border border-emerald-500/30 bg-emerald-500/10 p-6 shadow-2xl backdrop-blur">
        <div className="mb-4">
          <h2 className="text-xl font-semibold text-white">📍 You&apos;ve arrived!</h2>
          <p className="mt-1 text-sm text-gray-400">
            Charging at <span className="text-emerald-200">{visit.station_address}</span>. Click when done.
          </p>
        </div>

        <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 mb-6">
          <span className="text-2xl">⏱️</span>
          <div>
            <p className="text-xs text-gray-400">Total time</p>
            <p className="text-white font-medium font-mono">{elapsed}</p>
          </div>
        </div>

        {error && <p className="mb-3 text-sm text-red-300">{error}</p>}

        <button
          onClick={handleDone}
          className="w-full rounded-full bg-cyan-400 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300"
        >
          ✅ Done charging — rate my experience
        </button>
      </section>
    )
  }

  // phase === 'on_the_way'
  return (
    <section className="mt-8 rounded-[2rem] border border-cyan-500/20 bg-slate-950/70 p-6 shadow-2xl shadow-cyan-950/20 backdrop-blur">
      <div className="mb-4">
        <h2 className="text-xl font-semibold text-white">🚗 You&apos;re on your way</h2>
        <p className="mt-1 text-sm text-gray-400">
          Heading to <span className="text-cyan-200">{visit.station_address}</span>
        </p>
      </div>

      <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 mb-6">
        <span className="text-2xl">⏱️</span>
        <div>
          <p className="text-xs text-gray-400">Time since departure</p>
          <p className="text-white font-medium font-mono">{elapsed}</p>
        </div>
      </div>

      {error && <p className="mb-3 text-sm text-red-300">{error}</p>}

      <div className="flex flex-col gap-3">
        <button
          onClick={handleArrived}
          className="w-full rounded-full bg-cyan-400 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300"
        >
          📍 I&apos;ve arrived
        </button>
        <button
          onClick={handleCancel}
          className="w-full rounded-2xl border border-red-500/30 bg-red-500/5 px-5 py-3 text-sm text-red-300 transition hover:bg-red-500/15"
        >
          Cancel — I&apos;m not coming
        </button>
      </div>
    </section>
  )
}
