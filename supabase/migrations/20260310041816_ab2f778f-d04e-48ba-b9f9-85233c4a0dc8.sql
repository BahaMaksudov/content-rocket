
ALTER TABLE public.agent_settings 
  ADD COLUMN IF NOT EXISTS frequency_hours integer NOT NULL DEFAULT 12,
  ADD COLUMN IF NOT EXISTS last_run_at timestamp with time zone;
