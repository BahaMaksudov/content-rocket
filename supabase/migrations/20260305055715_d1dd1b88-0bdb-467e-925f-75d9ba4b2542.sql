
-- 1. Store the overarching goal
CREATE TABLE public.agent_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  niche TEXT NOT NULL,
  platform TEXT NOT NULL,
  videos_per_week INT DEFAULT 5,
  tone TEXT DEFAULT 'educational',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.agent_goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own goals" ON public.agent_goals FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own goals" ON public.agent_goals FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own goals" ON public.agent_goals FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own goals" ON public.agent_goals FOR DELETE USING (auth.uid() = user_id);

-- 2. Store the planned "ideas" for the week
CREATE TABLE public.content_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id UUID REFERENCES public.agent_goals(id) ON DELETE CASCADE NOT NULL,
  user_id UUID NOT NULL,
  day_number INT NOT NULL,
  topic TEXT NOT NULL,
  hook_type TEXT,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.content_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own plans" ON public.content_plans FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own plans" ON public.content_plans FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own plans" ON public.content_plans FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own plans" ON public.content_plans FOR DELETE USING (auth.uid() = user_id);

-- 3. Store the final scripts linked to the plan
CREATE TABLE public.agent_scripts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID REFERENCES public.content_plans(id) ON DELETE CASCADE NOT NULL,
  user_id UUID NOT NULL,
  hook TEXT,
  script_body JSONB,
  caption TEXT,
  hashtags TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.agent_scripts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own scripts" ON public.agent_scripts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own scripts" ON public.agent_scripts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own scripts" ON public.agent_scripts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own scripts" ON public.agent_scripts FOR DELETE USING (auth.uid() = user_id);
