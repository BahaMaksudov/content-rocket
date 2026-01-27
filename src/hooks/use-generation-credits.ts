import { useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";

const FREE_TIER_LIMIT = 5;

interface GenerationCredits {
  generationsThisMonth: number;
  lastGenerationDate: string | null;
  creditsRemaining: number;
  canGenerate: boolean;
  loading: boolean;
  incrementCredits: () => Promise<boolean>;
  refreshCredits: () => Promise<void>;
}

export function useGenerationCredits(): GenerationCredits {
  const { user } = useAuth();
  const { tier } = useSubscription();
  const queryClient = useQueryClient();

  // Pro and Agency users have unlimited generations
  const isUnlimited = tier === "pro" || tier === "agency";

  // Use React Query to fetch and cache credits
  const { data, isLoading } = useQuery({
    queryKey: ["generationCredits", user?.id],
    queryFn: async () => {
      if (!user?.id) return { generationsThisMonth: 0, lastGenerationDate: null };

      const { data: profile, error } = await supabase
        .from("profiles")
        .select("generations_this_month, last_generation_date")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) {
        console.error("Error fetching generation credits:", error);
        return { generationsThisMonth: 0, lastGenerationDate: null };
      }

      if (!profile) {
        return { generationsThisMonth: 0, lastGenerationDate: null };
      }

      let currentGenerations = profile.generations_this_month || 0;
      const lastDate = profile.last_generation_date;

      // Check if we need to reset the monthly counter
      if (lastDate) {
        const lastGenerationMonth = new Date(lastDate).getMonth();
        const lastGenerationYear = new Date(lastDate).getFullYear();
        const currentMonth = new Date().getMonth();
        const currentYear = new Date().getFullYear();

        // If the last generation was in a previous month, reset the counter
        if (lastGenerationYear < currentYear || 
            (lastGenerationYear === currentYear && lastGenerationMonth < currentMonth)) {
          // Reset the counter in the database
          await supabase
            .from("profiles")
            .update({ generations_this_month: 0 })
            .eq("user_id", user.id);
          
          currentGenerations = 0;
        }
      }

      return {
        generationsThisMonth: currentGenerations,
        lastGenerationDate: lastDate,
      };
    },
    enabled: !!user,
    staleTime: 0, // Always refetch when invalidated
  });

  const generationsThisMonth = data?.generationsThisMonth ?? 0;
  const lastGenerationDate = data?.lastGenerationDate ?? null;
  const creditsRemaining = isUnlimited ? Infinity : Math.max(0, FREE_TIER_LIMIT - generationsThisMonth);
  const canGenerate = isUnlimited || generationsThisMonth < FREE_TIER_LIMIT;

  const refreshCredits = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ["generationCredits", user?.id] });
  }, [queryClient, user?.id]);

  // Increment credits after a successful generation
  const incrementCredits = useCallback(async (): Promise<boolean> => {
    if (!user?.id) return false;

    // Pro/Agency users don't need to track
    if (isUnlimited) return true;

    // Check if user can generate before incrementing
    if (generationsThisMonth >= FREE_TIER_LIMIT) {
      return false;
    }

    const newCount = generationsThisMonth + 1;
    const now = new Date().toISOString();

    const { error } = await supabase
      .from("profiles")
      .update({
        generations_this_month: newCount,
        last_generation_date: now,
      })
      .eq("user_id", user.id);

    if (error) {
      console.error("Error updating generation credits:", error);
      return false;
    }

    // Invalidate the query to refresh the UI across all components
    await queryClient.invalidateQueries({ queryKey: ["generationCredits", user?.id] });
    
    return true;
  }, [user?.id, isUnlimited, generationsThisMonth, queryClient]);

  return {
    generationsThisMonth,
    lastGenerationDate,
    creditsRemaining,
    canGenerate,
    loading: isLoading,
    incrementCredits,
    refreshCredits,
  };
}

export { FREE_TIER_LIMIT };
