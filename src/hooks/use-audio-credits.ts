import { useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { SubscriptionTier } from "@/lib/subscription-tiers";

/** Monthly audio character limits per tier (1,000 chars ≈ 1 minute) */
export const AUDIO_CHAR_LIMITS: Record<SubscriptionTier, number> = {
  free: 1_000,       // 1 min
  starter: 10_000,   // 10 mins
  pro: 30_000,       // 30 mins
  agency: 300_000,   // 5 hours (300 mins)
};

function monthKey(dateIso: string) {
  const d = new Date(dateIso);
  return `${d.getFullYear()}-${d.getMonth()}`;
}

interface AudioCreditsData {
  charsUsed: number;
  charLimit: number;
  charsRemaining: number;
  minutesRemaining: number;
  totalMinutes: number;
  hasMinutes: boolean;
}

export function useAudioCredits() {
  const { user } = useAuth();
  const { tier, loading: subscriptionLoading } = useSubscription();
  const queryClient = useQueryClient();

  const charLimit = AUDIO_CHAR_LIMITS[tier];

  const { data, isLoading, refetch } = useQuery<AudioCreditsData>({
    queryKey: ["audioCredits", user?.id, tier],
    queryFn: async (): Promise<AudioCreditsData> => {
      if (!user?.id) {
        return {
          charsUsed: 0,
          charLimit,
          charsRemaining: charLimit,
          minutesRemaining: charLimit / 1000,
          totalMinutes: charLimit / 1000,
          hasMinutes: true,
        };
      }

      const { data: profile, error } = await supabase
        .from("profiles")
        .select("audio_chars_used, audio_chars_last_reset")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error || !profile) {
        console.error("Error fetching audio credits:", error);
        return {
          charsUsed: 0,
          charLimit,
          charsRemaining: charLimit,
          minutesRemaining: charLimit / 1000,
          totalMinutes: charLimit / 1000,
          hasMinutes: true,
        };
      }

      let charsUsed = profile.audio_chars_used ?? 0;
      const lastReset = profile.audio_chars_last_reset;
      const nowIso = new Date().toISOString();

      // Monthly reset check (client-side for display; server also enforces)
      if (!lastReset || monthKey(lastReset) !== monthKey(nowIso)) {
        charsUsed = 0;
      }

      const charsRemaining = Math.max(0, charLimit - charsUsed);
      const minutesRemaining = Math.round((charsRemaining / 1000) * 10) / 10;
      const totalMinutes = charLimit / 1000;

      return {
        charsUsed,
        charLimit,
        charsRemaining,
        minutesRemaining,
        totalMinutes,
        hasMinutes: charsRemaining > 0,
      };
    },
    enabled: !!user && !subscriptionLoading,
    staleTime: 0,
    refetchOnWindowFocus: true,
  });

  const refreshAudioCredits = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ["audioCredits", user?.id, tier] });
    await refetch();
  }, [queryClient, user?.id, tier, refetch]);

  return {
    charsUsed: data?.charsUsed ?? 0,
    charLimit: data?.charLimit ?? charLimit,
    charsRemaining: data?.charsRemaining ?? charLimit,
    minutesRemaining: data?.minutesRemaining ?? charLimit / 1000,
    totalMinutes: data?.totalMinutes ?? charLimit / 1000,
    hasMinutes: data?.hasMinutes ?? true,
    loading: isLoading || subscriptionLoading,
    refreshAudioCredits,
  };
}
