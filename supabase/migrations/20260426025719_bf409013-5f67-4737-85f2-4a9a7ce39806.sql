ALTER TABLE public.agent_campaigns ADD COLUMN IF NOT EXISTS facebook_post text;
ALTER TABLE public.generations ADD COLUMN IF NOT EXISTS facebook_post text;