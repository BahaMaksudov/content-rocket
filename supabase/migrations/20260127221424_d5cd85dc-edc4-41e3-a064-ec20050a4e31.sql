-- Add generation tracking columns to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS generations_this_month integer NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_generation_date timestamp with time zone;

-- Create index for efficient querying
CREATE INDEX IF NOT EXISTS idx_profiles_last_generation_date ON public.profiles(last_generation_date);