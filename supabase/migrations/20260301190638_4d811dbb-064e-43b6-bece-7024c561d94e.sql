ALTER TABLE public.profiles 
  ALTER COLUMN credits_available TYPE numeric USING credits_available::numeric,
  ALTER COLUMN credits_used TYPE numeric USING credits_used::numeric,
  ALTER COLUMN lifetime_credits_used TYPE numeric USING lifetime_credits_used::numeric;

ALTER TABLE public.profiles 
  ALTER COLUMN credits_available SET DEFAULT 5,
  ALTER COLUMN credits_used SET DEFAULT 0,
  ALTER COLUMN lifetime_credits_used SET DEFAULT 0;