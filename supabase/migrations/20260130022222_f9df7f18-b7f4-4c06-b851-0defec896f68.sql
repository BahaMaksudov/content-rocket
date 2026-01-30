-- Add unified credit tracking columns to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS credits_available INTEGER NOT NULL DEFAULT 5,
ADD COLUMN IF NOT EXISTS credits_used INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS credits_last_reset TIMESTAMP WITH TIME ZONE DEFAULT now();

-- Update existing users: set credits_available based on current usage
-- For existing users, calculate remaining credits from their current usage
UPDATE public.profiles 
SET credits_available = GREATEST(0, 5 - COALESCE(generations_this_month, 0) - COALESCE(transcript_fetches_this_month, 0)),
    credits_used = COALESCE(generations_this_month, 0) + COALESCE(transcript_fetches_this_month, 0);

-- Create a function to reset credits monthly
CREATE OR REPLACE FUNCTION public.reset_monthly_credits()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if we need to reset based on last reset date
  IF NEW.credits_last_reset IS NULL OR 
     date_trunc('month', NEW.credits_last_reset) < date_trunc('month', now()) THEN
    NEW.credits_available := 5;
    NEW.credits_used := 0;
    NEW.credits_last_reset := now();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;