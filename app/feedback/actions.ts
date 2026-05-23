'use server'

import { createClient } from '@/lib/supabase/server'

export async function submitFeedback(
  ratingId: string,
  token: string,
  message: string
): Promise<{ error?: string }> {
  const expectedToken = Buffer.from(`${ratingId}:smartev2026`).toString('base64url')
  if (token !== expectedToken) return { error: 'Invalid or expired feedback link.' }

  const trimmed = message.trim()
  if (!trimmed) return { error: 'Feedback message cannot be empty.' }
  if (trimmed.length > 2000) return { error: 'Feedback is too long (max 2000 characters).' }

  const supabase = await createClient()

  const { data: rating } = await supabase
    .from('ratings')
    .select('id')
    .eq('id', ratingId)
    .single()
  if (!rating) return { error: 'Rating not found.' }

  const { error } = await supabase.from('station_feedback').insert({
    rating_id: ratingId,
    message: trimmed,
  })

  if (error) return { error: error.message }
  return {}
}
