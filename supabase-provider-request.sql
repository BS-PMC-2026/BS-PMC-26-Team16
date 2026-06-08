-- Run this in your Supabase SQL Editor (https://supabase.com/dashboard → SQL Editor)
-- Adds a column to track pending service-provider upgrade requests from existing customers.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS provider_request_reason TEXT;
