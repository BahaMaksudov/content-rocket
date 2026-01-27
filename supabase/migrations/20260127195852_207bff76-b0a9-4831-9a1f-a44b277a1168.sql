-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Service role can manage all email tracking" ON public.welcome_email_tracking;

-- Edge functions use service role key which bypasses RLS, so we don't need this policy
-- The user-facing SELECT policy is sufficient for user access