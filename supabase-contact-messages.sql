-- Run this in your Supabase SQL Editor.
-- Stores messages sent from the Contact Us form and lets approved admins review/respond.

CREATE TABLE IF NOT EXISTS public.contact_messages (
  id             UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  name           TEXT        NOT NULL,
  email          TEXT        NOT NULL,
  subject        TEXT        NOT NULL,
  message        TEXT        NOT NULL,
  status         TEXT        DEFAULT 'new' NOT NULL CHECK (status IN ('new', 'resolved')),
  admin_response TEXT,
  created_at     TIMESTAMPTZ DEFAULT now() NOT NULL,
  responded_at   TIMESTAMPTZ
);

ALTER TABLE public.contact_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anyone can insert contact_messages" ON public.contact_messages;
CREATE POLICY "anyone can insert contact_messages"
  ON public.contact_messages
  FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "admins can read contact_messages" ON public.contact_messages;
CREATE POLICY "admins can read contact_messages"
  ON public.contact_messages
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.user_type = 'admin'
        AND profiles.is_approved = true
    )
  );

DROP POLICY IF EXISTS "admins can update contact_messages" ON public.contact_messages;
CREATE POLICY "admins can update contact_messages"
  ON public.contact_messages
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.user_type = 'admin'
        AND profiles.is_approved = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.user_type = 'admin'
        AND profiles.is_approved = true
    )
  );
