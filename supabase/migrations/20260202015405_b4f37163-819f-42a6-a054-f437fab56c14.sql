-- Create organization roles enum
CREATE TYPE public.org_role AS ENUM ('admin', 'member');

-- Create organizations table
CREATE TABLE public.organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create organization_members table
CREATE TABLE public.organization_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role org_role NOT NULL DEFAULT 'member',
  invited_by UUID REFERENCES auth.users(id),
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(organization_id, user_id)
);

-- Create organization invites table
CREATE TABLE public.organization_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  invited_by UUID NOT NULL REFERENCES auth.users(id),
  token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '7 days'),
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(organization_id, email)
);

-- Add organization_id to generations table
ALTER TABLE public.generations ADD COLUMN organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL;

-- Create index for faster org-based queries
CREATE INDEX idx_generations_organization_id ON public.generations(organization_id);
CREATE INDEX idx_organization_members_user_id ON public.organization_members(user_id);
CREATE INDEX idx_organization_members_org_id ON public.organization_members(organization_id);

-- Enable RLS
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_invites ENABLE ROW LEVEL SECURITY;

-- Security definer function to check org membership
CREATE OR REPLACE FUNCTION public.is_org_member(_user_id UUID, _org_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE user_id = _user_id AND organization_id = _org_id
  )
$$;

-- Security definer function to check org admin role
CREATE OR REPLACE FUNCTION public.is_org_admin(_user_id UUID, _org_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE user_id = _user_id AND organization_id = _org_id AND role = 'admin'
  )
$$;

-- Security definer function to get user's organization id
CREATE OR REPLACE FUNCTION public.get_user_org_id(_user_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT organization_id FROM public.organization_members
  WHERE user_id = _user_id
  LIMIT 1
$$;

-- Security definer function to count org members
CREATE OR REPLACE FUNCTION public.count_org_members(_org_id UUID)
RETURNS INTEGER
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::INTEGER FROM public.organization_members
  WHERE organization_id = _org_id
$$;

-- Organizations policies
CREATE POLICY "Users can view orgs they belong to"
ON public.organizations FOR SELECT
USING (public.is_org_member(auth.uid(), id) OR owner_id = auth.uid());

CREATE POLICY "Owners can update their org"
ON public.organizations FOR UPDATE
USING (owner_id = auth.uid());

CREATE POLICY "Users can create orgs"
ON public.organizations FOR INSERT
WITH CHECK (auth.uid() = owner_id);

-- Organization members policies
CREATE POLICY "Members can view org members"
ON public.organization_members FOR SELECT
USING (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Admins can insert members"
ON public.organization_members FOR INSERT
WITH CHECK (public.is_org_admin(auth.uid(), organization_id) OR auth.uid() = user_id);

CREATE POLICY "Admins can delete members"
ON public.organization_members FOR DELETE
USING (public.is_org_admin(auth.uid(), organization_id));

-- Organization invites policies
CREATE POLICY "Admins can manage invites"
ON public.organization_invites FOR ALL
USING (public.is_org_admin(auth.uid(), organization_id));

CREATE POLICY "Invited users can view their invite"
ON public.organization_invites FOR SELECT
USING (true);

-- Update generations policy to include org access
DROP POLICY IF EXISTS "Users can view their own generations" ON public.generations;
CREATE POLICY "Users can view own or org generations"
ON public.generations FOR SELECT
USING (
  auth.uid() = user_id 
  OR (organization_id IS NOT NULL AND public.is_org_member(auth.uid(), organization_id))
);

-- Trigger to update updated_at
CREATE TRIGGER update_organizations_updated_at
BEFORE UPDATE ON public.organizations
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();