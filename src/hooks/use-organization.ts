import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

export interface Organization {
  id: string;
  name: string;
  owner_id: string;
  created_at: string;
}

export interface OrganizationMember {
  id: string;
  organization_id: string;
  user_id: string;
  role: "admin" | "member";
  joined_at: string;
  profiles?: {
    full_name: string | null;
    email: string | null;
    avatar_url: string | null;
  };
}

export interface OrganizationInvite {
  id: string;
  organization_id: string;
  email: string;
  invited_by: string;
  expires_at: string;
  accepted_at: string | null;
  created_at: string;
}

export function useOrganization() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get user's organization membership
  const { data: membership, isLoading: membershipLoading } = useQuery({
    queryKey: ["organization-membership", user?.id],
    queryFn: async () => {
      if (!user) return null;
      
      const { data, error } = await supabase
        .from("organization_members")
        .select("*, organizations(*)")
        .eq("user_id", user.id)
        .maybeSingle();
      
      if (error) throw error;
      return data as (OrganizationMember & { organizations: Organization }) | null;
    },
    enabled: !!user,
  });

  const organization = membership?.organizations;
  const isAdmin = membership?.role === "admin";

  // Get organization members
  const { data: members, isLoading: membersLoading } = useQuery({
    queryKey: ["organization-members", organization?.id],
    queryFn: async () => {
      if (!organization) return [];
      
      // First get members
      const { data: membersData, error: membersError } = await supabase
        .from("organization_members")
        .select("*")
        .eq("organization_id", organization.id)
        .order("joined_at", { ascending: true });
      
      if (membersError) throw membersError;
      
      // Then get profiles for each member
      const memberUserIds = membersData.map(m => m.user_id);
      const { data: profilesData, error: profilesError } = await supabase
        .from("profiles")
        .select("user_id, full_name, email, avatar_url")
        .in("user_id", memberUserIds);
      
      if (profilesError) throw profilesError;
      
      // Combine the data
      const profilesMap = new Map(profilesData?.map(p => [p.user_id, p]) || []);
      
      return membersData.map(member => ({
        ...member,
        profiles: profilesMap.get(member.user_id) || null,
      })) as OrganizationMember[];
    },
    enabled: !!organization,
  });

  // Get pending invites
  const { data: invites, isLoading: invitesLoading } = useQuery({
    queryKey: ["organization-invites", organization?.id],
    queryFn: async () => {
      if (!organization || !isAdmin) return [];
      
      const { data, error } = await supabase
        .from("organization_invites")
        .select("*")
        .eq("organization_id", organization.id)
        .is("accepted_at", null)
        .gt("expires_at", new Date().toISOString())
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data as OrganizationInvite[];
    },
    enabled: !!organization && isAdmin,
  });

  // Create organization
  const createOrganization = useMutation({
    mutationFn: async (name: string) => {
      if (!user) throw new Error("Not authenticated");

      // Create organization
      const { data: org, error: orgError } = await supabase
        .from("organizations")
        .insert({ name, owner_id: user.id })
        .select()
        .single();

      if (orgError) throw orgError;

      // Add creator as admin
      const { error: memberError } = await supabase
        .from("organization_members")
        .insert({
          organization_id: org.id,
          user_id: user.id,
          role: "admin",
        });

      if (memberError) throw memberError;

      return org;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["organization-membership"] });
      toast({ title: "Team workspace created!" });
    },
    onError: (error: Error) => {
      toast({ variant: "destructive", title: "Failed to create team", description: error.message });
    },
  });

  // Send invite
  const sendInvite = useMutation({
    mutationFn: async (email: string) => {
      if (!organization) throw new Error("No organization");

      const { data, error } = await supabase.functions.invoke("send-team-invite", {
        body: { email, organizationId: organization.id },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.message || data.error);

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["organization-invites"] });
      toast({ title: "Invite sent!" });
    },
    onError: (error: Error) => {
      toast({ variant: "destructive", title: "Failed to send invite", description: error.message });
    },
  });

  // Remove member
  const removeMember = useMutation({
    mutationFn: async (memberId: string) => {
      const { error } = await supabase
        .from("organization_members")
        .delete()
        .eq("id", memberId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["organization-members"] });
      toast({ title: "Member removed" });
    },
    onError: (error: Error) => {
      toast({ variant: "destructive", title: "Failed to remove member", description: error.message });
    },
  });

  // Cancel invite
  const cancelInvite = useMutation({
    mutationFn: async (inviteId: string) => {
      const { error } = await supabase
        .from("organization_invites")
        .delete()
        .eq("id", inviteId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["organization-invites"] });
      toast({ title: "Invite cancelled" });
    },
    onError: (error: Error) => {
      toast({ variant: "destructive", title: "Failed to cancel invite", description: error.message });
    },
  });

  return {
    organization,
    membership,
    members,
    invites,
    isAdmin,
    isLoading: membershipLoading || membersLoading || invitesLoading,
    createOrganization,
    sendInvite,
    removeMember,
    cancelInvite,
    seatLimit: 5,
    seatsUsed: (members?.length || 0) + (invites?.length || 0),
  };
}
