
-- Add audio character usage tracking columns to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS audio_chars_used integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS audio_chars_last_reset timestamp with time zone DEFAULT now();
