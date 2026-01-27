import { useState, useCallback, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { supabase } from "@/integrations/supabase/client";

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
  const [generationsThisMonth, setGenerationsThisMonth] = useState(0);
  const [lastGenerationDate, setLastGenerationDate] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Pro and Agency users have unlimited generations
  const isUnlimited = tier === "pro" || tier === "agency";
  const creditsRemaining = isUnlimited ? Infinity : Math.max(0, FREE_TIER_LIMIT - generationsThisMonth);
  const canGenerate = isUnlimited || generationsThisMonth < FREE_TIER_LIMIT;

  const checkAndResetMonthlyCounter = useCallback(async () => {
    if (!user?.id) return;

    const { data: profile, error } = await supabase
      .from("profiles")
      .select("generations_this_month, last_generation_date")
      .eq("user_id", user.id)
      .maybeSingle();

    if (error) {
      console.error("Error fetching generation credits:", error);
      setLoading(false);
      return;
    }

    if (!profile) {
      setLoading(false);
      return;
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

    setGenerationsThisMonth(currentGenerations);
    setLastGenerationDate(lastDate);
    setLoading(false);
  }, [user?.id]);

  const refreshCredits = useCallback(async () => {
    setLoading(true);
    await checkAndResetMonthlyCounter();
  }, [checkAndResetMonthlyCounter]);

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

    setGenerationsThisMonth(newCount);
    setLastGenerationDate(now);
    return true;
  }, [user?.id, isUnlimited, generationsThisMonth]);

  // Load credits on mount and when user changes
  useEffect(() => {
    if (user) {
      checkAndResetMonthlyCounter();
    } else {
      setGenerationsThisMonth(0);
      setLastGenerationDate(null);
      setLoading(false);
    }
  }, [user, checkAndResetMonthlyCounter]);

  return {
    generationsThisMonth,
    lastGenerationDate,
    creditsRemaining,
    canGenerate,
    loading,
    incrementCredits,
    refreshCredits,
  };
}

export { FREE_TIER_LIMIT };
