
-- Add auto_post_enabled column to agent_settings
ALTER TABLE public.agent_settings ADD COLUMN IF NOT EXISTS auto_post_enabled boolean NOT NULL DEFAULT false;

-- Create agent_logs table for tracking autonomous actions
CREATE TABLE public.agent_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  action text NOT NULL,
  details jsonb DEFAULT '{}'::jsonb,
  campaign_id uuid REFERENCES public.agent_campaigns(id) ON DELETE SET NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.agent_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own logs" ON public.agent_logs
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Service can insert logs" ON public.agent_logs
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
