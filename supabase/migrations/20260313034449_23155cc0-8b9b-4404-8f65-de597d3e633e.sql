
-- Add OAuth token columns to agent_settings
ALTER TABLE public.agent_settings
  ADD COLUMN IF NOT EXISTS x_refresh_token text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS x_username text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS linkedin_access_token text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS linkedin_expires_at timestamp with time zone DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS linkedin_name text DEFAULT NULL;

-- Add published_to column to agent_campaigns
ALTER TABLE public.agent_campaigns
  ADD COLUMN IF NOT EXISTS published_to jsonb DEFAULT '[]'::jsonb;
