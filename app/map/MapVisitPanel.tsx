'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { markArrived, completeVisit, cancelVisit, submitRating } from '@/app/User/actions'
import { REVIEW_WORD_LIMIT, getReviewWordCount, limitReviewWords } from '@/services/reviews'
import type { CustomerVisit } from '@/app/User/CustomerActiveVisitPanel'

type Phase = 'on_the_way' | 'arrived' | 'rating' | 'done'

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

function StarRating({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hovered, setHovered] = useState(0)
  return (
    <div className="flex gap-1 justify-center">
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

function initialPhase(visit: CustomerVisit): Phase {
  if (visit.status === 'on_the_way') return 'on_the_way'
  if (visit.status === 'arrived') return 'arrived'
  if (visit.status === 'completed' && !visit.already_rated) return 'rating'
  return 'done'
}

export default function MapVisitPanel({
  visit,
  routeInfo,
  onStopNavigation,
  onClose,
}: {
  visit: CustomerVisit
  routeInfo: { duration: string; distance: string } | null
  onStopNavigation: () => void
  onClose: () => void
}) {
  const router = useRouter()
  const elapsed = useElapsed(visit.created_at)
  const { expired, formatted: countdown, remaining } = useCountdown(visit.created_at)
  const [phase, setPhase] = useState<Phase>(initialPhase(visit))
  const [score, setScore] = useState(0)
  const [comment, setComment] = useState('')
  const [error, setError] = useState('')
  const [, startTransition] = useTransition()
  const autoCancelledRef = useRef(false)
  const reviewWordCount = getReviewWordCount(comment)
  const isUrgent = remaining <= 5 * 60 && remaining > 0

  useEffect(() => {
    if (phase !== 'on_the_way' || !expired || autoCancelledRef.current) return
    autoCancelledRef.current = true
    startTransition(async () => {
      await cancelVisit(visit.id)
      setPhase('done')
    })
  }, [expired, phase, visit.id])

  function handleArrived() {
    setError('')
    startTransition(async () => {
      const result = await markArrived(visit.id)
      if (result.error) { setError(result.error); return }
      router.push('/User?tab=status')
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
      else { setPhase('done'); onClose() }
    })
  }

  function handleStopNavigation() {
    startTransition(async () => {
      await cancelVisit(visit.id)
    })
    onStopNavigation()
    onClose()
  }

  function handleRating() {
    if (score === 0) { setError('Please select a rating.'); return }
    if (reviewWordCount > REVIEW_WORD_LIMIT) {
      setError(`Written reviews can be up to ${REVIEW_WORD_LIMIT} words.`)
      return
    }
    setError('')
    startTransition(async () => {
      const result = await submitRating(visit.id, score, comment)
      if (result.error) setError(result.error)
      else { setPhase('done'); onClose() }
    })
  }

  const heroGradient =
    phase === 'arrived' || phase === 'done'
      ? 'linear-gradient(135deg,#052e16,#14532d)'
      : phase === 'rating'
      ? 'linear-gradient(135deg,#1e1b4b,#312e81)'
      : isUrgent
      ? 'linear-gradient(135deg,#3f0000,#7f1d1d)'
      : 'linear-gradient(135deg,#071f3a,#0f2d4e)'

  const heroIcon =
    phase === 'done' ? '✅'
    : phase === 'rating' ? '⭐'
    : phase === 'arrived' ? '📍'
    : isUrgent ? '⚠️'
    : '⚡'

  const badgeLabel =
    phase === 'done' ? 'Completed'
    : phase === 'rating' ? 'Rate'
    : phase === 'arrived' ? 'Arrived'
    : isUrgent ? 'Urgent'
    : 'On the way'

  const badgeColor =
    phase === 'done' ? 'bg-emerald-800 text-emerald-200'
    : phase === 'rating' ? 'bg-indigo-800 text-indigo-200'
    : phase === 'arrived' ? 'bg-emerald-800 text-emerald-200'
    : isUrgent ? 'bg-red-900 text-red-200'
    : 'bg-cyan-900 text-cyan-300'

  return (
    <div className="hidden-scrollbar absolute left-0 top-0 bottom-0 z-10 w-[300px] bg-[#111827] shadow-2xl flex flex-col overflow-hidden">
      {/* Hero */}
      <div
        className="relative h-44 shrink-0 flex items-center justify-center"
        style={{ background: heroGradient }}
      >
        <span style={{ fontSize: 72, opacity: 0.4 }}>{heroIcon}</span>
        {phase === 'done' && (
          <button
            onClick={onClose}
            className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/70 transition text-lg"
          >
            ✕
          </button>
        )}
      </div>

      {/* Scrollable content */}
      <div
        className="hidden-scrollbar flex-1 overflow-y-auto p-4 space-y-3"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {/* Status badge + address */}
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${badgeColor}`}>
              {badgeLabel}
            </span>
          </div>
          <h2 className="text-white font-bold text-lg leading-tight">
            {phase === 'on_the_way' && "You're on your way"}
            {phase === 'arrived' && "You've arrived!"}
            {phase === 'rating' && 'Rate your experience'}
            {phase === 'done' && 'All done!'}
          </h2>
          <p className="text-gray-400 text-sm mt-0.5">{visit.station_address}</p>
        </div>

        {/* On the way: route info + countdown + action buttons */}
        {phase === 'on_the_way' && (
          <>
            {/* Route info card */}
            {routeInfo && (
              <div className="bg-gray-800 rounded-xl p-3">
                <p className="text-gray-400 text-xs uppercase tracking-wide mb-2">Route to station</p>
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="text-cyan-400 font-bold text-xl leading-none">{routeInfo.duration}</p>
                    <p className="text-gray-400 text-xs mt-0.5">{routeInfo.distance}</p>
                  </div>
                  <span className="text-3xl opacity-60">🚗</span>
                </div>
                <button
                  onClick={handleStopNavigation}
                  className="w-full py-1.5 rounded-lg bg-gray-700 hover:bg-gray-600 text-gray-300 font-semibold text-xs transition"
                >
                  ✕ Stop Navigation & Cancel
                </button>
              </div>
            )}

            {/* Compact countdown + buttons */}
            <div className={`rounded-xl border p-3 ${
              isUrgent ? 'border-red-500/40 bg-red-500/10' : 'border-white/10 bg-gray-800'
            }`}>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className={`text-xs uppercase tracking-wide ${isUrgent ? 'text-red-400' : 'text-gray-500'}`}>
                    Auto-cancel in
                  </p>
                  <p className={`font-mono font-bold text-2xl leading-tight ${isUrgent ? 'text-red-300' : 'text-white'}`}>
                    {countdown}
                  </p>
                </div>
                <span className="text-2xl opacity-50">{isUrgent ? '⚠️' : '⏳'}</span>
              </div>

              {error && <p className="text-xs text-red-300 mb-2">{error}</p>}

              <div className="flex flex-col gap-2">
                <button
                  onClick={handleArrived}
                  className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm transition"
                >
                  📍 I&apos;ve arrived
                </button>
                <button
                  onClick={handleCancel}
                  className="w-full py-2 rounded-xl border border-red-500/30 bg-red-500/5 text-red-300 font-semibold text-xs transition hover:bg-red-500/15"
                >
                  Cancel — I&apos;m not coming
                </button>
              </div>
            </div>
          </>
        )}

        {/* Arrived phase */}
        {phase === 'arrived' && (
          <>
            <div className="rounded-xl border border-white/10 bg-gray-800 p-3">
              <p className="text-gray-500 text-xs uppercase tracking-wide mb-1">Total time</p>
              <p className="text-white font-mono font-bold text-2xl">{elapsed}</p>
              <p className="text-gray-500 text-xs mt-1">Press done when you finish charging</p>
            </div>
            {error && <p className="text-sm text-red-300">{error}</p>}
            <button
              onClick={handleDone}
              className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm transition"
            >
              ✅ Done charging
            </button>
          </>
        )}

        {/* Rating phase */}
        {phase === 'rating' && (
          <div className="space-y-4">
            <p className="text-gray-400 text-sm">
              How was your session at{' '}
              <span className="text-cyan-200">{visit.station_address}</span>?
            </p>
            <StarRating value={score} onChange={setScore} />
            <div>
              <div className="mb-1 flex items-center justify-between gap-3">
                <label htmlFor="mapReview" className="block text-sm text-gray-300">
                  Written review (optional)
                </label>
                <span className={`text-xs ${reviewWordCount >= REVIEW_WORD_LIMIT ? 'text-cyan-300' : 'text-gray-500'}`}>
                  {reviewWordCount}/{REVIEW_WORD_LIMIT}
                </span>
              </div>
              <textarea
                id="mapReview"
                value={comment}
                onChange={(e) => setComment(limitReviewWords(e.target.value))}
                rows={3}
                placeholder="Share a short review..."
                className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none transition focus:border-cyan-400 placeholder:text-gray-500 resize-none text-sm"
              />
            </div>
            {error && <p className="text-sm text-red-300">{error}</p>}
            <div className="flex gap-2">
              <button
                onClick={handleRating}
                className="flex-1 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm transition"
              >
                Submit rating
              </button>
              <button
                onClick={() => { setPhase('done'); onClose() }}
                className="rounded-xl border border-white/10 px-4 py-3 text-sm text-gray-400 transition hover:text-white"
              >
                Skip
              </button>
            </div>
          </div>
        )}

        {/* Done phase */}
        {phase === 'done' && (
          <>
            <p className="text-emerald-200 text-sm">Thanks for using Urban EV! Your session is complete.</p>
            <button
              onClick={onClose}
              className="w-full py-3 rounded-xl bg-gray-700 hover:bg-gray-600 text-white font-bold text-sm transition"
            >
              Close
            </button>
          </>
        )}
      </div>
    </div>
  )
}
