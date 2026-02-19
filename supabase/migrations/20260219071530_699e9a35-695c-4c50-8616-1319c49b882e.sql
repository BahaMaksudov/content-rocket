
-- Create table to track transcript fetch counts per user per URL
CREATE TABLE IF NOT EXISTS public.transcript_fetch_tracking (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  youtube_url text NOT NULL,
  fetch_count integer NOT NULL DEFAULT 0,
  last_fetched_at timestamp with time zone NOT NULL DEFAULT now(),
  generated_at timestamp with time zone NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, youtube_url)
);

-- Enable RLS
ALTER TABLE public.transcript_fetch_tracking ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own fetch tracking"
  ON public.transcript_fetch_tracking FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own fetch tracking"
  ON public.transcript_fetch_tracking FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own fetch tracking"
  ON public.transcript_fetch_tracking FOR UPDATE
  USING (auth.uid() = user_id);

-- Trigger to update updated_at
CREATE TRIGGER update_transcript_fetch_tracking_updated_at
  BEFORE UPDATE ON public.transcript_fetch_tracking
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
