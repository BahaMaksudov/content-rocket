
-- Add auto-pilot columns to agent_settings
ALTER TABLE public.agent_settings
  ADD COLUMN IF NOT EXISTS auto_pilot_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS confidence_threshold integer NOT NULL DEFAULT 80,
  ADD COLUMN IF NOT EXISTS remix_channel_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS youtube_channel_id text DEFAULT NULL;
