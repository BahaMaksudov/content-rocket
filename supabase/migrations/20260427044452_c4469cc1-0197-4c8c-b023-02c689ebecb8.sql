ALTER TABLE public.agent_settings 
ADD COLUMN IF NOT EXISTS facebook_page_id text,
ADD COLUMN IF NOT EXISTS facebook_page_name text,
ADD COLUMN IF NOT EXISTS facebook_page_access_token text;