import { useEffect, useRef } from "react";

import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

/**
 * One-time (per session) backfill:
 * If the current user has no rows in payment_history yet, fetch the last 10 invoices
 * from Stripe and persist them so the Billing page can display real history.
 */
export function useSyncPaymentHistoryOnce() {
  const { user, session } = useAuth();
  const ranRef = useRef(false);

  useEffect(() => {
    const run = async () => {
      if (!user?.id || !session?.access_token) return;
      if (ranRef.current) return;
      ranRef.current = true;

      try {
        const { data, error } = await supabase
          .from("payment_history")
          .select("id")
          .eq("user_id", user.id)
          .limit(1);

        if (error) throw error;
        if (data && data.length > 0) return;

        await supabase.functions.invoke("sync-payment-history", {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        });
      } catch (err) {
        // Allow a retry on the next render if something transient happened.
        ranRef.current = false;
        console.error("[Billing] Failed to backfill payment history", err);
      }
    };

    run();
  }, [user?.id, session?.access_token]);
}
