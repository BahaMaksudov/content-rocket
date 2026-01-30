import { useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";

const FREE_TIER_LIMIT = 5;

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

  // Use React Query to fetch and cache credits
  const { data, isLoading } = useQuery({
    queryKey: ["credits", user?.id],
    queryFn: async () => {
      if (!user?.id) return { creditsAvailable: 5, creditsUsed: 0, creditsLastReset: null };

      const { data: profile, error } = await supabase
        .from("profiles")
        .select("credits_available, credits_used, credits_last_reset")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) {
        console.error("Error fetching credits:", error);
        return { creditsAvailable: 5, creditsUsed: 0, creditsLastReset: null };
      }

      if (!profile) {
        return { creditsAvailable: 5, creditsUsed: 0, creditsLastReset: null };
      }

      let creditsAvailable = profile.credits_available ?? 5;
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
    staleTime: 0, // Always refetch when invalidated
  });

  const creditsAvailable = data?.creditsAvailable ?? FREE_TIER_LIMIT;
  const creditsUsed = data?.creditsUsed ?? 0;
  const creditsLastReset = data?.creditsLastReset ?? null;
  const canUseCredits = isUnlimited || creditsAvailable > 0;

  const refreshCredits = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ["credits", user?.id] });
  }, [queryClient, user?.id]);

  // Use one credit after a successful action
  const useCredit = useCallback(async (): Promise<boolean> => {
    if (!user?.id) return false;

    // Pro/Agency users don't need to track
    if (isUnlimited) return true;

    // Check if user has credits before using
    if (creditsAvailable <= 0) {
      return false;
    }

    const newAvailable = creditsAvailable - 1;
    const newUsed = creditsUsed + 1;
    const now = new Date().toISOString();

    const { error } = await supabase
      .from("profiles")
      .update({
        credits_available: newAvailable,
        credits_used: newUsed,
        credits_last_reset: now,
      })
      .eq("user_id", user.id);

    if (error) {
      console.error("Error updating credits:", error);
      return false;
    }

    // Invalidate the query to refresh the UI across all components
    await queryClient.invalidateQueries({ queryKey: ["credits", user?.id] });
    
    return true;
  }, [user?.id, isUnlimited, creditsAvailable, creditsUsed, queryClient]);

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

export { FREE_TIER_LIMIT };
