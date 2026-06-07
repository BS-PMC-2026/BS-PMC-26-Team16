'use server'

import { createClient } from '@/lib/supabase/server'

export async function submitContactMessage({
  name,
  email,
  subject,
  message,
}: {
  name: string
  email: string
  subject: string
  message: string
}): Promise<{ error?: string }> {
  const trimmedName = name.trim()
  const trimmedEmail = email.trim().toLowerCase()
  const trimmedSubject = subject.trim()
  const trimmedMessage = message.trim()

  if (!trimmedName) return { error: 'Name is required.' }
  if (!trimmedEmail) return { error: 'Email is required.' }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) return { error: 'Enter a valid email address.' }
  if (!trimmedSubject) return { error: 'Subject is required.' }
  if (!trimmedMessage) return { error: 'Message is required.' }
  if (trimmedName.length > 120) return { error: 'Name is too long.' }
  if (trimmedEmail.length > 255) return { error: 'Email is too long.' }
  if (trimmedSubject.length > 160) return { error: 'Subject is too long.' }
  if (trimmedMessage.length > 3000) return { error: 'Message is too long.' }

  const supabase = await createClient()
  const { error } = await supabase.from('contact_messages').insert({
    name: trimmedName,
    email: trimmedEmail,
    subject: trimmedSubject,
    message: trimmedMessage,
  })

  if (error) return { error: error.message }
  return {}
}
