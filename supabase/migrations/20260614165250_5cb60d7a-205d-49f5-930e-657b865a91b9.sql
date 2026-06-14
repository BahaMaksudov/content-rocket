
CREATE OR REPLACE FUNCTION public.is_org_member(_user_id uuid, _org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE user_id = _user_id
      AND organization_id = _org_id
      AND (
        auth.uid() = _user_id
        OR EXISTS (
          SELECT 1 FROM public.organization_members m
          WHERE m.user_id = auth.uid() AND m.organization_id = _org_id
        )
      )
  )
$$;

CREATE OR REPLACE FUNCTION public.is_org_admin(_user_id uuid, _org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE user_id = _user_id
      AND organization_id = _org_id
      AND role = 'admin'
      AND (
        auth.uid() = _user_id
        OR EXISTS (
          SELECT 1 FROM public.organization_members m
          WHERE m.user_id = auth.uid() AND m.organization_id = _org_id
        )
      )
  )
$$;

CREATE OR REPLACE FUNCTION public.count_org_members(_org_id uuid)
RETURNS integer
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN EXISTS (
      SELECT 1 FROM public.organization_members m
      WHERE m.user_id = auth.uid() AND m.organization_id = _org_id
    ) THEN (
      SELECT COUNT(*)::INTEGER FROM public.organization_members
      WHERE organization_id = _org_id
    )
    ELSE 0
  END
$$;

CREATE OR REPLACE FUNCTION public.get_user_org_id(_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT organization_id FROM public.organization_members
  WHERE user_id = _user_id
    AND auth.uid() = _user_id
  LIMIT 1
$$;
