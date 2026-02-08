-- Create a SECURITY DEFINER function to check if an email has an account
-- This safely bypasses RLS for this specific check
CREATE OR REPLACE FUNCTION public.check_email_exists(check_email text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE email = check_email
  );
$$;