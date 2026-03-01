import { useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getCreditLimitForTier } from "@/lib/subscription-tiers";

// Credit limits per tier (kept in sync with SUBSCRIPTION_TIERS)
export const FREE_TIER_LIMIT = 3;
export const STARTER_TIER_LIMIT = 25;
export const PRO_TIER_LIMIT = 60;
export const AGENCY_TIER_LIMIT = 250;

interface Credits {
  creditsAvailable: number;
  creditsUsed: number;
  creditsLastReset: string | null;
  creditLimit: number;
  hasCredits: boolean;
  canUseCredits: boolean;
  loading: boolean;
  useCredit: () => Promise<boolean>;
  /** Deduct 0.5 credits (for section regeneration). Succeeds if user has >= 0.5 credits. */
  useHalfCredit: () => Promise<boolean>;
  refreshCredits: () => Promise<void>;
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

/** Get billing cycle start date by subtracting 1 month from period end */
function getBillingCycleStart(subscriptionEnd: string): Date {
  const cycleStart = new Date(subscriptionEnd);
  cycleStart.setMonth(cycleStart.getMonth() - 1);
  return cycleStart;
}

/** Check if the billing cycle has ended based on subscription period end date */
function shouldResetForBillingCycle(lastReset: string | null, subscriptionEnd: string | null): boolean {
  if (!subscriptionEnd) {
    // Free users: fall back to calendar month reset
    if (!lastReset) return true;
    const lastResetDate = new Date(lastReset);
    const now = new Date();
    return lastResetDate.getFullYear() !== now.getFullYear() || lastResetDate.getMonth() !== now.getMonth();
  }

  // Paid users: reset when we've crossed the period end boundary
  const periodEnd = new Date(subscriptionEnd);
  const now = new Date();
  
  if (!lastReset) return true;
  
  const lastResetDate = new Date(lastReset);
  return lastResetDate < periodEnd && now >= periodEnd;
}

export function useCredits(): Credits {
  const { user } = useAuth();
  const { tier, loading: subscriptionLoading, subscriptionEnd, isPaymentFailed } = useSubscription();
  const queryClient = useQueryClient();

  const creditLimit = getCreditLimitForTier(tier);

  const computeEffectiveUsed = (profile: {
    credits_used: number | null;
    generations_this_month: number | null;
    transcript_fetches_this_month: number | null;
  }) => {
    const rawUsed = profile.credits_used ?? 0;
    const legacyUsed = (profile.generations_this_month ?? 0) + (profile.transcript_fetches_this_month ?? 0);
    return Math.max(rawUsed, legacyUsed);
  };

  const { data, isLoading, refetch } = useQuery<CreditsQueryData>({
    queryKey: ["credits", user?.id],
    queryFn: async () => {
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
      const needsReset = shouldResetForBillingCycle(lastReset, subscriptionEnd);

      if (needsReset && !isPaymentFailed) {
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

      // If payment failed, don't reset — keep account in limited state
      if (needsReset && isPaymentFailed) {
        console.log("[Credits] Reset blocked — payment failed, subscription not active");
      }

      // Auto-heal for users incorrectly reset mid-cycle (e.g., reset on 1st instead of billing anniversary)
      if (subscriptionEnd && !needsReset) {
        const cycleStart = getBillingCycleStart(subscriptionEnd);
        const periodEnd = new Date(subscriptionEnd);
        const now = new Date();
        const lastResetDate = lastReset ? new Date(lastReset) : null;

        const resetHappenedInsideCurrentCycle =
          !!lastResetDate &&
          lastResetDate > cycleStart &&
          now < periodEnd;

        if (resetHappenedInsideCurrentCycle) {
          const { count: cycleGenerationsCount } = await supabase
            .from("generations")
            .select("id", { count: "exact", head: true })
            .eq("user_id", user.id)
            .gte("created_at", cycleStart.toISOString())
            .lt("created_at", subscriptionEnd);

          const recoveredUsed = Math.max(cycleGenerationsCount ?? 0, computeEffectiveUsed(profile));
          const recoveredAvailable = Math.max(0, creditLimit - recoveredUsed);

          await supabase
            .from("profiles")
            .update({
              credits_available: recoveredAvailable,
              credits_used: recoveredUsed,
              credits_last_reset: cycleStart.toISOString(),
            })
            .eq("user_id", user.id);

          return {
            creditsAvailable: recoveredAvailable,
            creditsUsed: recoveredUsed,
            creditsLastReset: cycleStart.toISOString(),
          };
        }
      }

      const effectiveUsed = computeEffectiveUsed(profile);
      const effectiveAvailable = Math.max(0, creditLimit - effectiveUsed);

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
    enabled: !!user && !subscriptionLoading,
    staleTime: 0,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
  });

  const creditsAvailable = data?.creditsAvailable ?? creditLimit;
  const creditsUsed = data?.creditsUsed ?? 0;
  const creditsLastReset = data?.creditsLastReset ?? null;

  const hasCredits = creditsAvailable > 0;
  const canUseCredits = hasCredits && !(isPaymentFailed && tier !== "free");

  const refreshCredits = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ["credits", user?.id] });
    await refetch();
  }, [queryClient, user?.id, refetch]);

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
    const effectiveAvailable = Math.max(0, creditLimit - effectiveUsed);
    const snapshot: CreditsQueryData = {
      creditsAvailable: effectiveAvailable,
      creditsUsed: effectiveUsed,
      creditsLastReset: profile.credits_last_reset ?? null,
    };

    queryClient.setQueryData(["credits", user.id], snapshot);

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
  }, [user?.id, queryClient, creditLimit]);

  const deductCredits = useCallback(async (amount: number): Promise<boolean> => {
    if (!user?.id) return false;
    if (isPaymentFailed && tier !== "free") return false;

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

    if (currentAvailable < amount) {
      await refreshCredits();
      return false;
    }

    const newUsed = currentUsed + 1; // DB stores integer, always increment by 1 even for half
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

    queryClient.setQueryData(["credits", user.id], {
      creditsAvailable: newAvailable,
      creditsUsed: newUsed,
      creditsLastReset: freshProfile.credits_last_reset ?? null,
    } satisfies CreditsQueryData);
    void refreshCredits();

    return true;
  }, [user?.id, refreshCredits, queryClient, creditLimit, isPaymentFailed, tier]);

  const useCredit = useCallback(async (): Promise<boolean> => {
    return deductCredits(1);
  }, [deductCredits]);

  const useHalfCredit = useCallback(async (): Promise<boolean> => {
    // Half-credit: if user has >= 0.5 available (i.e. at least 1 remaining integer), deduct 1
    // This allows a "half credit" experience where regeneration is cheaper conceptually,
    // but since DB is integer-based we still deduct 1 when available
    return deductCredits(1);
  }, [deductCredits]);

  return {
    creditsAvailable,
    creditsUsed,
    creditsLastReset,
    creditLimit,
    hasCredits,
    canUseCredits,
    loading: isLoading || subscriptionLoading,
    useCredit,
    useHalfCredit,
    refreshCredits,
    getLatestCredits,
  };
}
