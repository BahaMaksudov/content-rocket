import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[CHECK-REFUND-ELIGIBILITY] ${step}${detailsStr}`);
};

const REFUND_WINDOW_DAYS = 7;

// Tier-specific generation limits for refund eligibility
const MAX_GENERATIONS_BY_TIER = {
  pro: 5,
  agency: 7,
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    const user = userData.user;
    if (!user?.id) throw new Error("User not authenticated");
    logStep("User authenticated", { userId: user.id });

    // Get current subscription info
    const { data: subscription, error: subError } = await supabaseClient
      .from("subscriptions")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    if (subError) throw new Error(`Error fetching subscription: ${subError.message}`);
    if (!subscription || subscription.status === "free") {
      return new Response(
        JSON.stringify({
          eligible: false,
          reason: "No active paid subscription found",
          canCancel: false,
          tier: "free",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    // Determine tier from subscription status
    const tier = subscription.status as "pro" | "agency";
    const maxGenerationsForRefund = MAX_GENERATIONS_BY_TIER[tier] ?? MAX_GENERATIONS_BY_TIER.pro;

    logStep("Subscription found", {
      status: subscription.status,
      tier,
      maxGenerationsForRefund,
      createdAt: subscription.created_at,
      stripeSubscriptionId: subscription.stripe_subscription_id,
    });

    // Check 1: Is the subscription within 7 days?
    const subscriptionCreatedAt = new Date(subscription.created_at);
    const now = new Date();
    const daysSinceCreation = Math.floor(
      (now.getTime() - subscriptionCreatedAt.getTime()) / (1000 * 60 * 60 * 24)
    );
    const withinRefundWindow = daysSinceCreation <= REFUND_WINDOW_DAYS;
    logStep("Check 1 - Refund window", { daysSinceCreation, withinRefundWindow });

    // Check 2: Has the user used fewer than the tier-specific limit of AI generations?
    const { count: generationCount, error: genError } = await supabaseClient
      .from("generations")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id);

    if (genError) {
      logStep("Error counting generations", { error: genError.message });
    }

    const totalGenerations = generationCount ?? 0;
    const underGenerationLimit = totalGenerations < maxGenerationsForRefund;
    logStep("Check 2 - Generation count", { totalGenerations, underGenerationLimit, limit: maxGenerationsForRefund });

    // Check 3: Is this the user's first subscription? 
    // Check payment_history for previous payments (more than 1 means not first subscription)
    const { count: paymentCount, error: paymentError } = await supabaseClient
      .from("payment_history")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id);

    if (paymentError) {
      logStep("Error counting payments", { error: paymentError.message });
    }

    // First subscription means only 1 payment (the current one)
    const isFirstSubscription = (paymentCount ?? 0) <= 1;
    logStep("Check 3 - First subscription", { paymentCount, isFirstSubscription });

    // Calculate eligibility
    const eligible = withinRefundWindow && underGenerationLimit && isFirstSubscription;

    // Build reason string if not eligible
    let reason = "";
    if (!withinRefundWindow) {
      reason = `Subscription is ${daysSinceCreation} days old (refund window is ${REFUND_WINDOW_DAYS} days)`;
    } else if (!underGenerationLimit) {
      reason = `Used ${totalGenerations} AI generations (${tier === "agency" ? "Agency" : "Pro"} limit is ${maxGenerationsForRefund - 1})`;
    } else if (!isFirstSubscription) {
      reason = "Refunds are only available for first-time subscribers";
    }

    logStep("Eligibility result", { eligible, reason, tier });

    return new Response(
      JSON.stringify({
        eligible,
        reason,
        canCancel: true,
        withinRefundWindow,
        daysSinceCreation,
        generationsUsed: totalGenerations,
        generationLimit: maxGenerationsForRefund,
        isFirstSubscription,
        subscriptionEnd: subscription.current_period_end,
        tier,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
