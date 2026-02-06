-- Add lifetime_credits_used column for historical analytics tracking
-- This column accumulates total usage across all billing periods and is never reset
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS lifetime_credits_used integer NOT NULL DEFAULT 0;

-- Backfill lifetime_credits_used with current credits_used for existing users
UPDATE public.profiles
SET lifetime_credits_used = GREATEST(credits_used, generations_this_month + transcript_fetches_this_month)
WHERE lifetime_credits_used = 0 AND (credits_used > 0 OR generations_this_month > 0 OR transcript_fetches_this_month > 0);