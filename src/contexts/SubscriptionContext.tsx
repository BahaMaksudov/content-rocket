import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react";
import { useAuth } from "./AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { SubscriptionTier, SUBSCRIPTION_TIERS, getTierFromStatus } from "@/lib/subscription-tiers";

interface SubscriptionContextType {
  isPro: boolean;
  isAgency: boolean;
  tier: SubscriptionTier;
  status: string;
  subscriptionEnd: string | null;
  loading: boolean;
  checkSubscription: () => Promise<void>;
  openCheckout: (tier?: "pro" | "agency") => Promise<void>;
  openCustomerPortal: () => Promise<void>;
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

export function SubscriptionProvider({ children }: { children: ReactNode }) {
  const { user, session } = useAuth();
  const [tier, setTier] = useState<SubscriptionTier>("free");
  const [status, setStatus] = useState("free");
  const [subscriptionEnd, setSubscriptionEnd] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const isPro = tier === "pro" || tier === "agency";
  const isAgency = tier === "agency";

  const checkSubscription = useCallback(async (retryOnAuthError = true) => {
    // Get a fresh session to ensure we have the latest token
    const { data: sessionData } = await supabase.auth.getSession();
    const currentSession = sessionData?.session;

    if (!currentSession?.access_token) {
      setTier("free");
      setStatus("free");
      setSubscriptionEnd(null);
      setLoading(false);
      return;
    }

    const invokeCheckSubscription = async (accessToken: string) => {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

      const res = await fetch(`${supabaseUrl}/functions/v1/check-subscription`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: publishableKey,
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({}),
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        const message = (json as any)?.error || `check-subscription failed (${res.status})`;
        const err = new Error(message) as Error & { status?: number };
        (err.status as number | undefined) = res.status;
        throw err;
      }

      return json as { status?: string; subscription_end?: string | null };
    };

    try {
      const data = await invokeCheckSubscription(currentSession.access_token);
      const currentTier = getTierFromStatus(data.status || "free");
      console.log("[Subscription] Status received:", { status: data.status, tier: currentTier });
      setTier(currentTier);
      setStatus(data.status || "free");
      setSubscriptionEnd(data.subscription_end ?? null);
    } catch (error) {
      const err = error as Error & { status?: number };

      // If auth error, try refreshing session once
      if (
        retryOnAuthError &&
        (err.status === 401 ||
          err.status === 403 ||
          err.message?.toLowerCase().includes("expired") ||
          err.message?.toLowerCase().includes("auth session missing"))
      ) {
        console.log("[Subscription] Auth error, refreshing session and retrying...");
        const { error: refreshError } = await supabase.auth.refreshSession();
        if (!refreshError) {
          return checkSubscription(false); // Retry with fresh token, but don't retry again
        }
      }

      console.error("Error checking subscription:", error);
      // Don't reset to free on error if we already have a tier set
      // This prevents flickering back to free on transient errors
      if (tier === "free" || !tier) {
        setTier("free");
        setStatus("free");
      }
    } finally {
      setLoading(false);
    }
  }, [tier]);

  const openCheckout = useCallback(async (checkoutTier: "pro" | "agency" = "pro") => {
    if (!session?.access_token) {
      console.error("No session found - user must be logged in to checkout");
      throw new Error("Please log in to upgrade your subscription");
    }

    try {
      const priceId = SUBSCRIPTION_TIERS[checkoutTier].priceId;
      console.log("Creating checkout session for tier:", checkoutTier, "priceId:", priceId);
      
      const { data, error } = await supabase.functions.invoke("create-checkout", {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        body: { priceId },
      });

      console.log("Checkout response:", { data, error });

      if (error) throw error;

      if (data?.url) {
        console.log("Redirecting to Stripe checkout URL:", data.url);
        // Use direct navigation for mobile compatibility (window.open is often blocked)
        window.location.href = data.url;
      } else {
        throw new Error("No checkout URL received from server");
      }
    } catch (error) {
      console.error("Error creating checkout:", error);
      throw error;
    }
  }, [session?.access_token]);

  const openCustomerPortal = useCallback(async () => {
    if (!session?.access_token) return;

    try {
      const { data, error } = await supabase.functions.invoke("customer-portal", {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) throw error;

      if (data?.url) {
        window.open(data.url, "_blank");
      }
    } catch (error) {
      console.error("Error opening customer portal:", error);
      throw error;
    }
  }, [session?.access_token]);

  // Check subscription on mount and when user changes
  useEffect(() => {
    if (user) {
      checkSubscription();
    } else {
      setTier("free");
      setStatus("free");
      setSubscriptionEnd(null);
      setLoading(false);
    }
  }, [user, checkSubscription]);

  // Re-check subscription every minute for active users
  useEffect(() => {
    if (!user) return;

    const interval = setInterval(checkSubscription, 60000);
    return () => clearInterval(interval);
  }, [user, checkSubscription]);

  // Check after returning from checkout
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get("checkout") === "success") {
      // Remove the query param
      window.history.replaceState({}, "", window.location.pathname);
      // Wait a moment for Stripe webhook to process
      setTimeout(checkSubscription, 2000);
    }
  }, [checkSubscription]);

  return (
    <SubscriptionContext.Provider
      value={{
        isPro,
        isAgency,
        tier,
        status,
        subscriptionEnd,
        loading,
        checkSubscription,
        openCheckout,
        openCustomerPortal,
      }}
    >
      {children}
    </SubscriptionContext.Provider>
  );
}

export function useSubscription() {
  const context = useContext(SubscriptionContext);
  if (context === undefined) {
    throw new Error("useSubscription must be used within a SubscriptionProvider");
  }
  return context;
}
