import { useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

export interface FetchTrackingResult {
  /** Get current fetch count for a URL (returns 0 if not tracked yet) */
  getFetchCount: (url: string) => Promise<number>;
  /** Increment fetch count and return the NEW count after increment */
  incrementFetchCount: (url: string) => Promise<number>;
  /** Reset the fetch counter for a URL when content is successfully generated */
  resetFetchCount: (url: string) => Promise<void>;
}

export function useFetchTracking(): FetchTrackingResult {
  const { user } = useAuth();

  const getFetchCount = useCallback(
    async (url: string): Promise<number> => {
      if (!user?.id || !url) return 0;

      const { data, error } = await supabase
        .from("transcript_fetch_tracking" as any)
        .select("fetch_count")
        .eq("user_id", user.id)
        .eq("youtube_url", url)
        .maybeSingle();

      if (error) {
        console.error("Error fetching count:", error);
        return 0;
      }

      return (data as any)?.fetch_count ?? 0;
    },
    [user?.id]
  );

  const incrementFetchCount = useCallback(
    async (url: string): Promise<number> => {
      if (!user?.id || !url) return 0;

      // Try to get existing record first
      const { data: existing, error: fetchError } = await supabase
        .from("transcript_fetch_tracking" as any)
        .select("fetch_count")
        .eq("user_id", user.id)
        .eq("youtube_url", url)
        .maybeSingle();

      if (fetchError) {
        console.error("Error fetching existing record:", fetchError);
        return 0;
      }

      const currentCount = (existing as any)?.fetch_count ?? 0;
      const newCount = currentCount + 1;

      if (existing) {
        // Update existing record
        const { error: updateError } = await supabase
          .from("transcript_fetch_tracking" as any)
          .update({
            fetch_count: newCount,
            last_fetched_at: new Date().toISOString(),
          })
          .eq("user_id", user.id)
          .eq("youtube_url", url);

        if (updateError) {
          console.error("Error updating fetch count:", updateError);
          return currentCount;
        }
      } else {
        // Insert new record
        const { error: insertError } = await supabase
          .from("transcript_fetch_tracking" as any)
          .insert({
            user_id: user.id,
            youtube_url: url,
            fetch_count: newCount,
            last_fetched_at: new Date().toISOString(),
          });

        if (insertError) {
          console.error("Error inserting fetch tracking:", insertError);
          return 0;
        }
      }

      return newCount;
    },
    [user?.id]
  );

  const resetFetchCount = useCallback(
    async (url: string): Promise<void> => {
      if (!user?.id || !url) return;

      const { error } = await supabase
        .from("transcript_fetch_tracking" as any)
        .update({
          fetch_count: 0,
          generated_at: new Date().toISOString(),
        })
        .eq("user_id", user.id)
        .eq("youtube_url", url);

      if (error) {
        console.error("Error resetting fetch count:", error);
      }
    },
    [user?.id]
  );

  return { getFetchCount, incrementFetchCount, resetFetchCount };
}
