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
  /** Single source of truth for "out of credits" state */
  hasCredits: boolean;
  /** Back-compat alias for hasCredits */
  canUseCredits: boolean;
  loading: boolean;
  useCredit: () => Promise<boolean>;
  refreshCredits: () => Promise<void>;
  /** Pulls the latest values from the DB and updates the React Query cache immediately */
  getLatestCredits: () => Promise<{
    creditsAvailable: number;
    creditsUsed: number;
    creditsLastReset: string | null;
    hasCredits: boolean;
  } | null>;
}

type CreditsQueryData = {
  creditsAvailable: number;
  creditsUsed: number;
  creditsLastReset: string | null;
};

function monthKey(dateIso: string) {
  const d = new Date(dateIso);
  return `${d.getFullYear()}-${d.getMonth()}`;
}

export function useCredits(): Credits {
  const { user } = useAuth();
  const { tier } = useSubscription();
  const queryClient = useQueryClient();

  // Pro and Agency users have unlimited credits
  const isUnlimited = tier === "pro" || tier === "agency";

  const computeEffectiveUsed = (profile: {
    credits_used: number | null;
    generations_this_month: number | null;
    transcript_fetches_this_month: number | null;
  }) => {
    const rawUsed = profile.credits_used ?? 0;
    const legacyUsed = (profile.generations_this_month ?? 0) + (profile.transcript_fetches_this_month ?? 0);
    return Math.max(rawUsed, legacyUsed);
  };

  // Use React Query to fetch and cache credits with refetchOnWindowFocus for real-time sync
  const { data, isLoading, refetch } = useQuery<CreditsQueryData>({
    queryKey: ["credits", user?.id],
    queryFn: async () => {
      if (!user?.id) return { creditsAvailable: FREE_TIER_LIMIT, creditsUsed: 0, creditsLastReset: null };

      const { data: profile, error } = await supabase
        .from("profiles")
        .select(
          "credits_available, credits_used, credits_last_reset, generations_this_month, transcript_fetches_this_month"
        )
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) {
        console.error("Error fetching credits:", error);
        return { creditsAvailable: FREE_TIER_LIMIT, creditsUsed: 0, creditsLastReset: null };
      }

      if (!profile) {
        return { creditsAvailable: FREE_TIER_LIMIT, creditsUsed: 0, creditsLastReset: null };
      }

      const lastReset = profile.credits_last_reset;
      const nowIso = new Date().toISOString();
      const needsMonthlyReset =
        !lastReset || monthKey(lastReset) !== monthKey(nowIso);

      if (needsMonthlyReset) {
        // Reset *all* relevant counters to keep legacy + unified fields aligned
        await supabase
          .from("profiles")
          .update({
            credits_available: FREE_TIER_LIMIT,
            credits_used: 0,
            credits_last_reset: nowIso,
            generations_this_month: 0,
            transcript_fetches_this_month: 0,
          })
          .eq("user_id", user.id);

        return {
          creditsAvailable: FREE_TIER_LIMIT,
          creditsUsed: 0,
          creditsLastReset: nowIso,
        };
      }

      // Canonical UI calculation: remaining = TOTAL - USED
      const effectiveUsed = computeEffectiveUsed(profile);
      const effectiveAvailable = Math.max(0, FREE_TIER_LIMIT - effectiveUsed);

      // Self-heal if stored values drift (prevents UI showing credits when actions block)
      const storedAvailable = profile.credits_available ?? effectiveAvailable;
      const storedUsed = profile.credits_used ?? effectiveUsed;
      const shouldHeal = storedAvailable !== effectiveAvailable || storedUsed !== effectiveUsed;

      if (shouldHeal) {
        await supabase
          .from("profiles")
          .update({
            credits_available: effectiveAvailable,
            credits_used: effectiveUsed,
          })
          .eq("user_id", user.id);
      }

      return {
        creditsAvailable: effectiveAvailable,
        creditsUsed: effectiveUsed,
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
  const hasCredits = isUnlimited || creditsAvailable > 0;
  const canUseCredits = hasCredits;

  const getLatestCredits = useCallback(async () => {
    if (!user?.id) return null;

    const { data: profile, error } = await supabase
      .from("profiles")
      .select(
        "credits_used, credits_last_reset, generations_this_month, transcript_fetches_this_month"
      )
      .eq("user_id", user.id)
      .maybeSingle();

    if (error || !profile) {
      console.error("Error fetching latest credits:", error);
      return null;
    }

    const effectiveUsed = computeEffectiveUsed(profile);
    const effectiveAvailable = Math.max(0, FREE_TIER_LIMIT - effectiveUsed);
    const snapshot: CreditsQueryData = {
      creditsAvailable: effectiveAvailable,
      creditsUsed: effectiveUsed,
      creditsLastReset: profile.credits_last_reset ?? null,
    };

    queryClient.setQueryData(["credits", user.id], snapshot);
    // Keep the DB's derived field in sync (best-effort)
    await supabase
      .from("profiles")
      .update({
        credits_available: effectiveAvailable,
        credits_used: effectiveUsed,
      })
      .eq("user_id", user.id);

    return {
      ...snapshot,
      hasCredits: isUnlimited || snapshot.creditsAvailable > 0,
    };
  }, [user?.id, queryClient, isUnlimited]);

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
      .select(
        "credits_used, credits_last_reset, generations_this_month, transcript_fetches_this_month"
      )
      .eq("user_id", user.id)
      .maybeSingle();

    if (fetchError || !freshProfile) {
      console.error("Error fetching fresh credits:", fetchError);
      return false;
    }

    const currentUsed = computeEffectiveUsed(freshProfile);
    const currentAvailable = Math.max(0, FREE_TIER_LIMIT - currentUsed);

    // Check if user has credits before using (using fresh data)
    if (currentAvailable <= 0) {
      // Refresh UI to show 0 credits
      await refreshCredits();
      return false;
    }

    const newUsed = currentUsed + 1;
    const newAvailable = Math.max(0, FREE_TIER_LIMIT - newUsed);

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

    // Update cache immediately (instant UI), then refetch in background
    queryClient.setQueryData(["credits", user.id], {
      creditsAvailable: newAvailable,
      creditsUsed: newUsed,
      creditsLastReset: freshProfile.credits_last_reset ?? null,
    } satisfies CreditsQueryData);
    void refreshCredits();
    
    return true;
  }, [user?.id, isUnlimited, refreshCredits, queryClient]);

  return {
    creditsAvailable,
    creditsUsed,
    creditsLastReset,
    hasCredits,
    canUseCredits,
    loading: isLoading,
    useCredit,
    refreshCredits,
    getLatestCredits,
  };
}
