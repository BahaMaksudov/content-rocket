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

// Product IDs for subscription tiers - NEW 4-tier structure
const PRODUCT_IDS = {
  starter: "prod_TvmgZ0hR2LljbD",
  pro: "prod_TvmhiAvWEs9spu",
  agency: "prod_TvmiVnuynHd9pf",
};

function getTierFromProductId(productId: string): "starter" | "pro" | "agency" | "free" {
  if (productId === PRODUCT_IDS.agency) return "agency";
  if (productId === PRODUCT_IDS.pro) return "pro";
  if (productId === PRODUCT_IDS.starter) return "starter";
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

    // Check if user has a profile
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

    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    
    if (customers.data.length === 0) {
      logStep("No Stripe customer found, returning free status");
      
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

    // Fetch active AND past_due subscriptions
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      limit: 10,
    });

    // Filter to relevant statuses
    const relevantSubs = subscriptions.data.filter((s: { status: string }) => 
      ["active", "past_due", "unpaid", "trialing"].includes(s.status)
    );

    logStep("Fetched subscriptions", { total: subscriptions.data.length, relevant: relevantSubs.length });

    if (relevantSubs.length === 0) {
      logStep("No relevant subscription found");
      
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
        stripe_status: "none",
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Priority: agency > pro > starter
    let activeSubscription = relevantSubs[0];
    let tier = "free" as string;
    let stripeStatus = relevantSubs[0].status;
    const tierPriority = { agency: 3, pro: 2, starter: 1, free: 0 };

    for (const sub of relevantSubs) {
      const productId = sub.items.data[0]?.price.product as string;
      const subTier = getTierFromProductId(productId);
      
      if ((tierPriority[subTier] || 0) > (tierPriority[tier as keyof typeof tierPriority] || 0)) {
        activeSubscription = sub;
        tier = subTier;
        stripeStatus = sub.status;
      }
    }

    const subscriptionItem = activeSubscription.items.data[0];
    const priceId = subscriptionItem?.price.id;
    
    let currentPeriodEnd: string;
    const rawPeriodEnd = (subscriptionItem as any)?.current_period_end;
    
    if (typeof rawPeriodEnd === 'number' && rawPeriodEnd > 0) {
      currentPeriodEnd = new Date(rawPeriodEnd * 1000).toISOString();
    } else if (typeof rawPeriodEnd === 'string' && rawPeriodEnd) {
      const parsed = new Date(rawPeriodEnd);
      if (!isNaN(parsed.getTime())) {
        currentPeriodEnd = parsed.toISOString();
      } else {
        currentPeriodEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
      }
    } else {
      currentPeriodEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    }

    logStep("Active subscription found", { 
      subscriptionId: activeSubscription.id,
      tier,
      stripeStatus,
      currentPeriodEnd,
      priceId,
    });

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
      subscribed: stripeStatus === "active" || stripeStatus === "trialing",
      status: tier,
      subscription_end: currentPeriodEnd,
      stripe_status: stripeStatus,
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
