import { createClient } from '@/lib/supabase/server'
import SubmitFeedbackForm from './SubmitFeedbackForm'

type SearchParams = Promise<{ r?: string; t?: string }>

export default async function FeedbackPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams
  const ratingId = params.r ?? ''
  const token = params.t ?? ''

  const invalid = !ratingId || !token

  let ratingExists = false
  if (!invalid) {
    const expectedToken = Buffer.from(`${ratingId}:smartev2026`).toString('base64url')
    if (token === expectedToken) {
      const supabase = await createClient()
      const { data } = await supabase
        .from('ratings')
        .select('id')
        .eq('id', ratingId)
        .single()
      ratingExists = !!data
    }
  }

  return (
    <main className="min-h-screen bg-gray-950 text-white flex items-center justify-center p-6">
      <div className="w-full max-w-lg space-y-6">
        {/* Logo / Brand */}
        <div className="text-center space-y-1">
          <h1 className="text-2xl font-bold text-cyan-400">SmartEv</h1>
          <p className="text-gray-400 text-sm">Charging Point Feedback</p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-8 space-y-6">
          {invalid || !ratingExists ? (
            <div className="text-center space-y-3">
              <div className="text-4xl">🔗</div>
              <h2 className="text-lg font-bold text-white">Invalid or Expired Link</h2>
              <p className="text-gray-400 text-sm">
                This feedback link is not valid. Please use the link from the email you received.
              </p>
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <h2 className="text-lg font-bold text-white">Hey,</h2>
                <p className="text-gray-300 text-sm leading-relaxed">
                  We were disappointed to see that you didn&apos;t like one of the charging points from our service.
                </p>
                <p className="text-gray-300 text-sm leading-relaxed">
                  We would love to hear from you what you didn&apos;t like, and what we can improve going forward!
                </p>
              </div>
              <SubmitFeedbackForm ratingId={ratingId} token={token} />
              <p className="text-xs text-gray-500 text-center">
                Many thanks, <strong className="text-gray-400">SmartEv Team.</strong>
              </p>
            </>
          )}
        </div>
      </div>
    </main>
  )
}
