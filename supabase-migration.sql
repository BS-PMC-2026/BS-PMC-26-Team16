-- Run this in your Supabase SQL Editor (https://supabase.com/dashboard → SQL Editor)
-- Required for the Charging Points admin feature: stores user feedback responses

CREATE TABLE IF NOT EXISTS public.station_feedback (
  id         UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  rating_id  UUID        REFERENCES public.ratings(id) ON DELETE CASCADE NOT NULL,
  message    TEXT        NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE public.station_feedback ENABLE ROW LEVEL SECURITY;

-- Anyone can submit feedback (public form, link comes from admin email)
CREATE POLICY "anyone can insert station_feedback"
  ON public.station_feedback
  FOR INSERT
  WITH CHECK (true);

-- Only approved admins can read feedback responses
CREATE POLICY "admins can read station_feedback"
  ON public.station_feedback
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.user_type = 'admin'
        AND profiles.is_approved = true
    )
  );
