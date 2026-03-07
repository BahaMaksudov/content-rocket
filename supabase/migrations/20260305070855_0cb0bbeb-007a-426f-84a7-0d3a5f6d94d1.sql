ALTER TABLE public.agent_goals 
  ADD COLUMN IF NOT EXISTS goal_status text NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS start_date timestamp with time zone DEFAULT now(),
  ADD COLUMN IF NOT EXISTS end_date timestamp with time zone;