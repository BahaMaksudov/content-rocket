-- Add columns to track transcript fetches for free tier limit
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS transcript_fetches_this_month integer NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_fetch_date timestamp with time zone;