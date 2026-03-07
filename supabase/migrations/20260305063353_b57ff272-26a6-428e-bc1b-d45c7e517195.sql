ALTER TABLE public.agent_goals ADD COLUMN batch_status TEXT NOT NULL DEFAULT 'idle';
ALTER TABLE public.agent_goals ADD COLUMN batch_progress INTEGER NOT NULL DEFAULT 0;