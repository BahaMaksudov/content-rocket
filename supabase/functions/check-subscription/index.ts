import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CHECK-SUBSCRIPTION] ${step}${detailsStr}`);
};

// Product IDs for subscription tiers
const PRODUCT_IDS = {
  pro: "prod_TtwRuGNynEpRHz",
  agency: "prod_TtxGA6pKTbpMoM",
};

function getTierFromProductId(productId: string): "pro" | "agency" | "free" {
  if (productId === PRODUCT_IDS.agency) return "agency";
  if (productId === PRODUCT_IDS.pro) return "pro";
  return "free";
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");
    
    logStep("User authenticated", { userId: user.id, email: user.email });

    // Check if user has a profile (prevents subscription creation for deleted users)
    const { data: profile } = await supabase
      .from("profiles")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!profile) {
      logStep("No profile found - user may have been deleted");
      return new Response(JSON.stringify({
        subscribed: false,
        status: "free",
        subscription_end: null,
        error: "User profile not found"
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-12-15.clover" });

    // Look up Stripe customer by email
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    
    if (customers.data.length === 0) {
      logStep("No Stripe customer found, returning free status");
      
      // Ensure we have a subscription record
      await supabase
        .from("subscriptions")
        .upsert({ user_id: user.id, status: "free" }, { onConflict: "user_id" });

      return new Response(JSON.stringify({
        subscribed: false,
        status: "free",
        subscription_end: null,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const customerId = customers.data[0].id;
    logStep("Found Stripe customer", { customerId });

    // Fetch ACTIVE subscriptions from Stripe - prioritize active over canceled
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: "active",
      limit: 10,
    });

    logStep("Fetched subscriptions", { count: subscriptions.data.length });

    if (subscriptions.data.length === 0) {
      logStep("No active subscription found");
      
      // Update database to reflect free status
      await supabase
        .from("subscriptions")
        .upsert({ 
          user_id: user.id, 
          status: "free",
          stripe_customer_id: customerId,
        }, { onConflict: "user_id" });

      return new Response(JSON.stringify({
        subscribed: false,
        status: "free",
        subscription_end: null,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Get the most recent active subscription (prioritize agency over pro if multiple)
    let activeSubscription = subscriptions.data[0];
    let tier = "free" as string;

    // Check all active subscriptions and prioritize agency
    for (const sub of subscriptions.data) {
      const productId = sub.items.data[0]?.price.product as string;
      const subTier = getTierFromProductId(productId);
      
      if (subTier === "agency") {
        activeSubscription = sub;
        tier = "agency";
        break;
      } else if (subTier === "pro" && tier !== "agency") {
        activeSubscription = sub;
        tier = "pro";
      }
    }

    // Get real-time data from Stripe
    const currentPeriodEnd = new Date(activeSubscription.current_period_end * 1000).toISOString();
    const priceId = activeSubscription.items.data[0]?.price.id;

    logStep("Active subscription found", { 
      subscriptionId: activeSubscription.id,
      tier,
      currentPeriodEnd,
      priceId,
    });

    // Update database with real-time Stripe data
    const { error: updateError } = await supabase
      .from("subscriptions")
      .upsert({
        user_id: user.id,
        stripe_customer_id: customerId,
        stripe_subscription_id: activeSubscription.id,
        status: tier,
        price_id: priceId,
        current_period_end: currentPeriodEnd,
        updated_at: new Date().toISOString(),
      }, { onConflict: "user_id" });

    if (updateError) {
      logStep("Database update error", { error: updateError.message });
    } else {
      logStep("Database synced with Stripe data");
    }

    return new Response(JSON.stringify({
      subscribed: true,
      status: tier,
      subscription_end: currentPeriodEnd,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
