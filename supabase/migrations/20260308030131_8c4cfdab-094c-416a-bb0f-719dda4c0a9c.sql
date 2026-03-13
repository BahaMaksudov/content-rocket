
-- Agent Settings table (one per user)
CREATE TABLE public.agent_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  topic text NOT NULL DEFAULT '',
  frequency text NOT NULL DEFAULT 'every_6_hours',
  platforms text[] NOT NULL DEFAULT ARRAY['x', 'linkedin']::text[],
  is_active boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE public.agent_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own settings" ON public.agent_settings FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own settings" ON public.agent_settings FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own settings" ON public.agent_settings FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- Agent Campaigns table
CREATE TABLE public.agent_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'discovery',
  youtube_url text,
  video_title text,
  insights jsonb,
  x_thread jsonb,
  linkedin_post text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.agent_campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own campaigns" ON public.agent_campaigns FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own campaigns" ON public.agent_campaigns FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own campaigns" ON public.agent_campaigns FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own campaigns" ON public.agent_campaigns FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_agent_settings_updated_at BEFORE UPDATE ON public.agent_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_agent_campaigns_updated_at BEFORE UPDATE ON public.agent_campaigns FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
