import { useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";

// Credit limits per tier
export const FREE_TIER_LIMIT = 5;
export const PRO_TIER_LIMIT = 50;
// Agency has unlimited (we use Infinity)

interface Credits {
  creditsAvailable: number;
  creditsUsed: number;
  creditsLastReset: string | null;
  creditLimit: number;
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

function getCreditLimit(tier: string): number {
  if (tier === "agency") return Infinity;
  if (tier === "pro") return PRO_TIER_LIMIT;
  return FREE_TIER_LIMIT;
}

export function useCredits(): Credits {
  const { user } = useAuth();
  const { tier } = useSubscription();
  const queryClient = useQueryClient();

  // Only Agency users have truly unlimited credits
  const isUnlimited = tier === "agency";
  const creditLimit = getCreditLimit(tier);

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
    queryKey: ["credits", user?.id, tier],
    queryFn: async () => {
      // Agency users have unlimited - no need to track
      if (isUnlimited) {
        return { creditsAvailable: Infinity, creditsUsed: 0, creditsLastReset: null };
      }

      if (!user?.id) return { creditsAvailable: creditLimit, creditsUsed: 0, creditsLastReset: null };

      const { data: profile, error } = await supabase
        .from("profiles")
        .select(
          "credits_available, credits_used, credits_last_reset, generations_this_month, transcript_fetches_this_month"
        )
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) {
        console.error("Error fetching credits:", error);
        return { creditsAvailable: creditLimit, creditsUsed: 0, creditsLastReset: null };
      }

      if (!profile) {
        return { creditsAvailable: creditLimit, creditsUsed: 0, creditsLastReset: null };
      }

      const lastReset = profile.credits_last_reset;
      const nowIso = new Date().toISOString();
      const needsMonthlyReset = !lastReset || monthKey(lastReset) !== monthKey(nowIso);

      if (needsMonthlyReset) {
        // Reset credits to tier limit for new month
        await supabase
          .from("profiles")
          .update({
            credits_available: creditLimit,
            credits_used: 0,
            credits_last_reset: nowIso,
            generations_this_month: 0,
            transcript_fetches_this_month: 0,
          })
          .eq("user_id", user.id);

        return {
          creditsAvailable: creditLimit,
          creditsUsed: 0,
          creditsLastReset: nowIso,
        };
      }

      // Canonical UI calculation: remaining = LIMIT - USED
      const effectiveUsed = computeEffectiveUsed(profile);
      const effectiveAvailable = Math.max(0, creditLimit - effectiveUsed);

      // Self-heal if stored values drift
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
    staleTime: 0,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
  });

  // Calculate derived values from fresh data
  const creditsAvailable = data?.creditsAvailable ?? creditLimit;
  const creditsUsed = data?.creditsUsed ?? 0;
  const creditsLastReset = data?.creditsLastReset ?? null;

  // Single source of truth for hasCredits
  const hasCredits = isUnlimited || creditsAvailable > 0;
  const canUseCredits = hasCredits;

  // Force refresh credits from server
  const refreshCredits = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ["credits", user?.id, tier] });
    await refetch();
  }, [queryClient, user?.id, tier, refetch]);

  const getLatestCredits = useCallback(async () => {
    if (!user?.id) return null;

    // Agency users always have credits
    if (isUnlimited) {
      return {
        creditsAvailable: Infinity,
        creditsUsed: 0,
        creditsLastReset: null,
        hasCredits: true,
      };
    }

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
    const effectiveAvailable = Math.max(0, creditLimit - effectiveUsed);
    const snapshot: CreditsQueryData = {
      creditsAvailable: effectiveAvailable,
      creditsUsed: effectiveUsed,
      creditsLastReset: profile.credits_last_reset ?? null,
    };

    queryClient.setQueryData(["credits", user.id, tier], snapshot);
    
    // Keep the DB's derived field in sync
    await supabase
      .from("profiles")
      .update({
        credits_available: effectiveAvailable,
        credits_used: effectiveUsed,
      })
      .eq("user_id", user.id);

    return {
      ...snapshot,
      hasCredits: effectiveAvailable > 0,
    };
  }, [user?.id, queryClient, isUnlimited, creditLimit, tier]);

  // Use one credit after a successful action
  const useCredit = useCallback(async (): Promise<boolean> => {
    if (!user?.id) return false;

    // Agency users don't need to track - always allow
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
    const currentAvailable = Math.max(0, creditLimit - currentUsed);

    // Check if user has credits before using (using fresh data)
    if (currentAvailable <= 0) {
      // Refresh UI to show 0 credits
      await refreshCredits();
      return false;
    }

    const newUsed = currentUsed + 1;
    const newAvailable = Math.max(0, creditLimit - newUsed);

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
    queryClient.setQueryData(["credits", user.id, tier], {
      creditsAvailable: newAvailable,
      creditsUsed: newUsed,
      creditsLastReset: freshProfile.credits_last_reset ?? null,
    } satisfies CreditsQueryData);
    void refreshCredits();

    return true;
  }, [user?.id, isUnlimited, refreshCredits, queryClient, creditLimit, tier]);

  return {
    creditsAvailable,
    creditsUsed,
    creditsLastReset,
    creditLimit,
    hasCredits,
    canUseCredits,
    loading: isLoading,
    useCredit,
    refreshCredits,
    getLatestCredits,
  };
}
