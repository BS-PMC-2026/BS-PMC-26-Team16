'use client'

import { useState, useTransition } from 'react'
import { submitFeedback } from './actions'

export default function SubmitFeedbackForm({
  ratingId,
  token,
}: {
  ratingId: string
  token: string
}) {
  const [message, setMessage] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    startTransition(async () => {
      const result = await submitFeedback(ratingId, token, message)
      if (result.error) {
        setError(result.error)
      } else {
        setSubmitted(true)
      }
    })
  }

  if (submitted) {
    return (
      <div className="text-center space-y-3">
        <div className="text-5xl">🙏</div>
        <h2 className="text-xl font-bold text-white">Thank you for your feedback!</h2>
        <p className="text-gray-400 text-sm">Your response has been received and will help us improve.</p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm text-gray-300 mb-2">
          What didn't you like? What can we improve?
        </label>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={6}
          maxLength={2000}
          placeholder="Share your thoughts…"
          required
          className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none focus:border-cyan-400 placeholder:text-gray-500 resize-none"
        />
        <p className="text-xs text-gray-500 mt-1 text-right">{message.length}/2000</p>
      </div>
      {error && <p className="text-sm text-red-400">{error}</p>}
      <button
        type="submit"
        disabled={isPending || !message.trim()}
        className="w-full py-3 rounded-xl bg-cyan-600 text-sm font-semibold text-white hover:bg-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed transition"
      >
        {isPending ? 'Submitting…' : 'Submit Feedback'}
      </button>
    </form>
  )
}
