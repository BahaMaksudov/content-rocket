import { useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getCreditLimitForTier } from "@/lib/subscription-tiers";

// Credit limits per tier (kept in sync with SUBSCRIPTION_TIERS)
export const FREE_TIER_LIMIT = 3;
export const STARTER_TIER_LIMIT = 15;
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

function monthKey(dateIso: string) {
  const d = new Date(dateIso);
  return `${d.getFullYear()}-${d.getMonth()}`;
}

export function useCredits(): Credits {
  const { user } = useAuth();
  const { tier, loading: subscriptionLoading } = useSubscription();
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
    queryKey: ["credits", user?.id, tier],
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
      const needsMonthlyReset = !lastReset || monthKey(lastReset) !== monthKey(nowIso);

      if (needsMonthlyReset) {
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
  const canUseCredits = hasCredits;

  const refreshCredits = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ["credits", user?.id, tier] });
    await refetch();
  }, [queryClient, user?.id, tier, refetch]);

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

    queryClient.setQueryData(["credits", user.id, tier], snapshot);

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
  }, [user?.id, queryClient, creditLimit, tier]);

  const useCredit = useCallback(async (): Promise<boolean> => {
    if (!user?.id) return false;

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

    if (currentAvailable <= 0) {
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

    queryClient.setQueryData(["credits", user.id, tier], {
      creditsAvailable: newAvailable,
      creditsUsed: newUsed,
      creditsLastReset: freshProfile.credits_last_reset ?? null,
    } satisfies CreditsQueryData);
    void refreshCredits();

    return true;
  }, [user?.id, refreshCredits, queryClient, creditLimit, tier]);

  return {
    creditsAvailable,
    creditsUsed,
    creditsLastReset,
    creditLimit,
    hasCredits,
    canUseCredits,
    loading: isLoading || subscriptionLoading,
    useCredit,
    refreshCredits,
    getLatestCredits,
  };
}
