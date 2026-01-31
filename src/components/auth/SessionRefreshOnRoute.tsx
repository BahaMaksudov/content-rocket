import { useEffect } from "react";
import { useLocation } from "react-router-dom";

import { supabase } from "@/integrations/supabase/client";

// Keeps auth tokens fresh across navigation.
// - Calls getSession() on every route mount/change.
// - Proactively refreshes if the session is near expiry.
export function SessionRefreshOnRoute() {
  const location = useLocation();

  useEffect(() => {
    let cancelled = false;

    const sync = async () => {
      const { data, error } = await supabase.auth.getSession();
      if (cancelled || error) return;

      const expiresAt = data.session?.expires_at;
      if (!expiresAt) return;

      // If token expires soon, refresh so subsequent function calls use a fresh JWT.
      const expiresInMs = expiresAt * 1000 - Date.now();
      const refreshThresholdMs = 2 * 60 * 1000; // 2 minutes

      if (expiresInMs > 0 && expiresInMs < refreshThresholdMs) {
        await supabase.auth.refreshSession();
      }
    };

    sync();

    return () => {
      cancelled = true;
    };
  }, [location.key]);

  return null;
}
