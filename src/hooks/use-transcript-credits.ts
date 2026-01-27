import { useState, useCallback, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { supabase } from "@/integrations/supabase/client";

const FREE_TIER_LIMIT = 5;

interface TranscriptCredits {
  fetchesThisMonth: number;
  lastFetchDate: string | null;
  creditsRemaining: number;
  canFetch: boolean;
  loading: boolean;
  incrementFetches: () => Promise<boolean>;
  refreshCredits: () => Promise<void>;
}

export function useTranscriptCredits(): TranscriptCredits {
  const { user } = useAuth();
  const { tier } = useSubscription();
  const [fetchesThisMonth, setFetchesThisMonth] = useState(0);
  const [lastFetchDate, setLastFetchDate] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Pro and Agency users have unlimited fetches
  const isUnlimited = tier === "pro" || tier === "agency";
  const creditsRemaining = isUnlimited ? Infinity : Math.max(0, FREE_TIER_LIMIT - fetchesThisMonth);
  const canFetch = isUnlimited || fetchesThisMonth < FREE_TIER_LIMIT;

  const checkAndResetMonthlyCounter = useCallback(async () => {
    if (!user?.id) return;

    const { data: profile, error } = await supabase
      .from("profiles")
      .select("transcript_fetches_this_month, last_fetch_date")
      .eq("user_id", user.id)
      .maybeSingle();

    if (error) {
      console.error("Error fetching transcript credits:", error);
      setLoading(false);
      return;
    }

    if (!profile) {
      setLoading(false);
      return;
    }

    let currentFetches = profile.transcript_fetches_this_month || 0;
    const lastDate = profile.last_fetch_date;

    // Check if we need to reset the monthly counter
    if (lastDate) {
      const lastFetchMonth = new Date(lastDate).getMonth();
      const lastFetchYear = new Date(lastDate).getFullYear();
      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();

      // If the last fetch was in a previous month, reset the counter
      if (lastFetchYear < currentYear || 
          (lastFetchYear === currentYear && lastFetchMonth < currentMonth)) {
        // Reset the counter in the database
        await supabase
          .from("profiles")
          .update({ transcript_fetches_this_month: 0 })
          .eq("user_id", user.id);
        
        currentFetches = 0;
      }
    }

    setFetchesThisMonth(currentFetches);
    setLastFetchDate(lastDate);
    setLoading(false);
  }, [user?.id]);

  const refreshCredits = useCallback(async () => {
    setLoading(true);
    await checkAndResetMonthlyCounter();
  }, [checkAndResetMonthlyCounter]);

  // Increment fetches after a successful transcript fetch
  const incrementFetches = useCallback(async (): Promise<boolean> => {
    if (!user?.id) return false;

    // Pro/Agency users don't need to track
    if (isUnlimited) return true;

    // Check if user can fetch before incrementing
    if (fetchesThisMonth >= FREE_TIER_LIMIT) {
      return false;
    }

    const newCount = fetchesThisMonth + 1;
    const now = new Date().toISOString();

    const { error } = await supabase
      .from("profiles")
      .update({
        transcript_fetches_this_month: newCount,
        last_fetch_date: now,
      })
      .eq("user_id", user.id);

    if (error) {
      console.error("Error updating transcript credits:", error);
      return false;
    }

    setFetchesThisMonth(newCount);
    setLastFetchDate(now);
    return true;
  }, [user?.id, isUnlimited, fetchesThisMonth]);

  // Load credits on mount and when user changes
  useEffect(() => {
    if (user) {
      checkAndResetMonthlyCounter();
    } else {
      setFetchesThisMonth(0);
      setLastFetchDate(null);
      setLoading(false);
    }
  }, [user, checkAndResetMonthlyCounter]);

  return {
    fetchesThisMonth,
    lastFetchDate,
    creditsRemaining,
    canFetch,
    loading,
    incrementFetches,
    refreshCredits,
  };
}

export { FREE_TIER_LIMIT };
