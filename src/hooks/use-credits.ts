import { useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";

export const FREE_TIER_LIMIT = 5;

interface Credits {
  creditsAvailable: number;
  creditsUsed: number;
  creditsLastReset: string | null;
  canUseCredits: boolean;
  loading: boolean;
  useCredit: () => Promise<boolean>;
  refreshCredits: () => Promise<void>;
}

export function useCredits(): Credits {
  const { user } = useAuth();
  const { tier } = useSubscription();
  const queryClient = useQueryClient();

  // Pro and Agency users have unlimited credits
  const isUnlimited = tier === "pro" || tier === "agency";

  // Use React Query to fetch and cache credits with refetchOnWindowFocus for real-time sync
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["credits", user?.id],
    queryFn: async () => {
      if (!user?.id) return { creditsAvailable: FREE_TIER_LIMIT, creditsUsed: 0, creditsLastReset: null };

      const { data: profile, error } = await supabase
        .from("profiles")
        .select("credits_available, credits_used, credits_last_reset")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) {
        console.error("Error fetching credits:", error);
        return { creditsAvailable: FREE_TIER_LIMIT, creditsUsed: 0, creditsLastReset: null };
      }

      if (!profile) {
        return { creditsAvailable: FREE_TIER_LIMIT, creditsUsed: 0, creditsLastReset: null };
      }

      let creditsAvailable = profile.credits_available ?? FREE_TIER_LIMIT;
      let creditsUsed = profile.credits_used ?? 0;
      const lastReset = profile.credits_last_reset;

      // Check if we need to reset the monthly counter
      if (lastReset) {
        const lastResetMonth = new Date(lastReset).getMonth();
        const lastResetYear = new Date(lastReset).getFullYear();
        const currentMonth = new Date().getMonth();
        const currentYear = new Date().getFullYear();

        // If the last reset was in a previous month, reset the credits
        if (lastResetYear < currentYear || 
            (lastResetYear === currentYear && lastResetMonth < currentMonth)) {
          // Reset the credits in the database
          const now = new Date().toISOString();
          await supabase
            .from("profiles")
            .update({ 
              credits_available: FREE_TIER_LIMIT, 
              credits_used: 0,
              credits_last_reset: now
            })
            .eq("user_id", user.id);
          
          creditsAvailable = FREE_TIER_LIMIT;
          creditsUsed = 0;
        }
      }

      return {
        creditsAvailable,
        creditsUsed,
        creditsLastReset: lastReset,
      };
    },
    enabled: !!user,
    staleTime: 0, // Always consider data stale - refetch when needed
    refetchOnWindowFocus: true, // Refetch when window is focused
    refetchOnMount: true, // Refetch when component mounts
  });

  // Calculate derived values from fresh data
  const creditsAvailable = data?.creditsAvailable ?? FREE_TIER_LIMIT;
  const creditsUsed = data?.creditsUsed ?? 0;
  const creditsLastReset = data?.creditsLastReset ?? null;
  
  // Single source of truth for hasCredits
  const canUseCredits = isUnlimited || creditsAvailable > 0;

  // Force refresh credits from server
  const refreshCredits = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ["credits", user?.id] });
    await refetch();
  }, [queryClient, user?.id, refetch]);

  // Use one credit after a successful action
  // IMPORTANT: Fetches fresh data from DB to avoid stale closure issues
  const useCredit = useCallback(async (): Promise<boolean> => {
    if (!user?.id) return false;

    // Pro/Agency users don't need to track
    if (isUnlimited) return true;

    // Fetch the LATEST credits from the database to avoid stale data
    const { data: freshProfile, error: fetchError } = await supabase
      .from("profiles")
      .select("credits_available, credits_used")
      .eq("user_id", user.id)
      .maybeSingle();

    if (fetchError || !freshProfile) {
      console.error("Error fetching fresh credits:", fetchError);
      return false;
    }

    const currentAvailable = freshProfile.credits_available ?? 0;
    const currentUsed = freshProfile.credits_used ?? 0;

    // Check if user has credits before using (using fresh data)
    if (currentAvailable <= 0) {
      // Refresh UI to show 0 credits
      await refreshCredits();
      return false;
    }

    const newAvailable = currentAvailable - 1;
    const newUsed = currentUsed + 1;

    const { error } = await supabase
      .from("profiles")
      .update({
        credits_available: newAvailable,
        credits_used: newUsed,
      })
      .eq("user_id", user.id);

    if (error) {
      console.error("Error updating credits:", error);
      return false;
    }

    // Immediately invalidate and refetch to update UI across all components
    await refreshCredits();
    
    return true;
  }, [user?.id, isUnlimited, refreshCredits]);

  return {
    creditsAvailable,
    creditsUsed,
    creditsLastReset,
    canUseCredits,
    loading: isLoading,
    useCredit,
    refreshCredits,
  };
}
