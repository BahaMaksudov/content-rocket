-- Create batch_jobs table for tracking bulk processing
CREATE TABLE public.batch_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
  total_videos INTEGER NOT NULL DEFAULT 0,
  completed_videos INTEGER NOT NULL DEFAULT 0,
  failed_videos INTEGER NOT NULL DEFAULT 0,
  video_urls JSONB NOT NULL DEFAULT '[]'::jsonb,
  results JSONB DEFAULT '[]'::jsonb,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);

-- Create index for faster user queries
CREATE INDEX idx_batch_jobs_user_id ON public.batch_jobs(user_id);
CREATE INDEX idx_batch_jobs_status ON public.batch_jobs(status);
CREATE INDEX idx_batch_jobs_created_at ON public.batch_jobs(created_at DESC);

-- Enable RLS
ALTER TABLE public.batch_jobs ENABLE ROW LEVEL SECURITY;

-- RLS policies for batch_jobs
CREATE POLICY "Users can view their own batch jobs"
ON public.batch_jobs FOR SELECT
USING (
  auth.uid() = user_id 
  OR (organization_id IS NOT NULL AND public.is_org_member(auth.uid(), organization_id))
);

CREATE POLICY "Users can insert their own batch jobs"
ON public.batch_jobs FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own batch jobs"
ON public.batch_jobs FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own batch jobs"
ON public.batch_jobs FOR DELETE
USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_batch_jobs_updated_at
BEFORE UPDATE ON public.batch_jobs
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();