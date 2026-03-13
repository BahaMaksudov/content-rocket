import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface StreakData {
  current_streak: number;
  longest_streak: number;
  last_approval_date: string | null;
  bonus_credits_awarded: number;
}

export function useStreak() {
  const { user } = useAuth();
  const [streak, setStreak] = useState<StreakData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStreak = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("user_streaks")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    if (data) {
      setStreak(data as StreakData);
    } else {
      setStreak({ current_streak: 0, longest_streak: 0, last_approval_date: null, bonus_credits_awarded: 0 });
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchStreak();
  }, [fetchStreak]);

  const recordApproval = useCallback(async () => {
    if (!user) return;

    const today = new Date().toISOString().split("T")[0];
    const { data: existing } = await supabase
      .from("user_streaks")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!existing) {
      // Create new streak record
      await supabase.from("user_streaks").insert({
        user_id: user.id,
        current_streak: 1,
        longest_streak: 1,
        last_approval_date: today,
      } as any);
    } else {
      const lastDate = (existing as any).last_approval_date;
      
      // Already approved today
      if (lastDate === today) return;

      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split("T")[0];

      let newStreak: number;
      if (lastDate === yesterdayStr) {
        // Continue streak
        newStreak = ((existing as any).current_streak || 0) + 1;
      } else {
        // Reset streak
        newStreak = 1;
      }

      const newLongest = Math.max(newStreak, (existing as any).longest_streak || 0);
      
      const updatePayload: any = {
        current_streak: newStreak,
        longest_streak: newLongest,
        last_approval_date: today,
        updated_at: new Date().toISOString(),
      };

      // Award 5 bonus credits at every 7-day milestone
      if (newStreak > 0 && newStreak % 7 === 0) {
        updatePayload.bonus_credits_awarded = ((existing as any).bonus_credits_awarded || 0) + 5;
        
        // Grant bonus credits to profile
        const { data: profile } = await supabase
          .from("profiles")
          .select("credits_available")
          .eq("user_id", user.id)
          .single();

        if (profile) {
          await supabase
            .from("profiles")
            .update({ credits_available: (profile.credits_available || 0) + 5 })
            .eq("user_id", user.id);
        }
      }

      await supabase
        .from("user_streaks")
        .update(updatePayload)
        .eq("user_id", user.id);
    }

    await fetchStreak();
  }, [user, fetchStreak]);

  return { streak, loading, recordApproval, refreshStreak: fetchStreak };
}
