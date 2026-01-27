-- Create table to track welcome email series progress
CREATE TABLE public.welcome_email_tracking (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  user_email text NOT NULL,
  user_name text,
  email_1_sent_at timestamp with time zone,
  email_2_sent_at timestamp with time zone,
  email_3_sent_at timestamp with time zone,
  email_2_scheduled_for timestamp with time zone,
  email_3_scheduled_for timestamp with time zone,
  unsubscribed boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT unique_user_tracking UNIQUE (user_id)
);

-- Enable RLS
ALTER TABLE public.welcome_email_tracking ENABLE ROW LEVEL SECURITY;

-- Users can view their own tracking record
CREATE POLICY "Users can view their own email tracking"
ON public.welcome_email_tracking
FOR SELECT
USING (auth.uid() = user_id);

-- Service role can manage all records (for edge function)
CREATE POLICY "Service role can manage all email tracking"
ON public.welcome_email_tracking
FOR ALL
USING (true)
WITH CHECK (true);

-- Create trigger for updated_at
CREATE TRIGGER update_welcome_email_tracking_updated_at
BEFORE UPDATE ON public.welcome_email_tracking
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to initialize welcome email tracking on signup
CREATE OR REPLACE FUNCTION public.handle_new_user_welcome_emails()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.welcome_email_tracking (
    user_id,
    user_email,
    user_name,
    email_2_scheduled_for,
    email_3_scheduled_for
  )
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    now() + interval '24 hours',
    now() + interval '3 days'
  );
  RETURN NEW;
END;
$$;

-- Create trigger to run on new user signup
CREATE TRIGGER on_auth_user_created_welcome_emails
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user_welcome_emails();