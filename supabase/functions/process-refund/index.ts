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
  console.log(`[PROCESS-REFUND] ${step}${detailsStr}`);
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
    if (!user?.id || !user?.email) throw new Error("User not authenticated");
    logStep("User authenticated", { userId: user.id });

    // Get subscription
    const { data: subscription, error: subError } = await supabaseClient
      .from("subscriptions")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    if (subError) throw new Error(`Error fetching subscription: ${subError.message}`);
    if (!subscription || subscription.status === "free") {
      throw new Error("No active paid subscription found");
    }

    // Determine tier from subscription status
    const tier = subscription.status as "pro" | "agency";
    const maxGenerationsForRefund = MAX_GENERATIONS_BY_TIER[tier] ?? MAX_GENERATIONS_BY_TIER.pro;

    logStep("Subscription found", { tier, maxGenerationsForRefund });

    // Re-verify eligibility (security check)
    const subscriptionCreatedAt = new Date(subscription.created_at);
    const now = new Date();
    const daysSinceCreation = Math.floor(
      (now.getTime() - subscriptionCreatedAt.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysSinceCreation > REFUND_WINDOW_DAYS) {
      throw new Error("Subscription is outside the 7-day refund window");
    }

    const { count: generationCount } = await supabaseClient
      .from("generations")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id);

    if ((generationCount ?? 0) >= maxGenerationsForRefund) {
      throw new Error(`Too many AI generations used for ${tier === "agency" ? "Agency" : "Pro"} refund eligibility (limit: ${maxGenerationsForRefund - 1})`);
    }

    const { count: paymentCount } = await supabaseClient
      .from("payment_history")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id);

    if ((paymentCount ?? 0) > 1) {
      throw new Error("Refunds only available for first-time subscribers");
    }

    logStep("Eligibility verified", { tier, daysSinceCreation, generationCount });

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Get customer ID
    let customerId = subscription.stripe_customer_id;
    if (!customerId) {
      const customers = await stripe.customers.list({ email: user.email, limit: 1 });
      if (customers.data.length > 0) {
        customerId = customers.data[0].id;
      } else {
        throw new Error("No Stripe customer found");
      }
    }

    logStep("Found Stripe customer", { customerId });

    // Get the latest successful payment intent for this customer
    const paymentIntents = await stripe.paymentIntents.list({
      customer: customerId,
      limit: 5,
    });

    // Find a succeeded payment intent
    const succeededPI = paymentIntents.data.find((pi: { status: string }) => pi.status === "succeeded");

    if (!succeededPI) {
      // Fallback: try to find via invoice charge
      const invoices = await stripe.invoices.list({
        customer: customerId,
        subscription: subscription.stripe_subscription_id || undefined,
        limit: 1,
        expand: ["data.charge", "data.payment_intent"],
      });

      if (invoices.data.length === 0) {
        throw new Error("No invoices or payments found for this subscription");
      }

      const latestInvoice = invoices.data[0];
      const chargeId = typeof latestInvoice.charge === "string" ? latestInvoice.charge : latestInvoice.charge?.id;
      const piId = typeof latestInvoice.payment_intent === "string" ? latestInvoice.payment_intent : latestInvoice.payment_intent?.id;

      logStep("Invoice fallback", { chargeId, piId });

      if (chargeId) {
        const refund = await stripe.refunds.create({ charge: chargeId, reason: "requested_by_customer" });
        logStep("Refund created via charge", { refundId: refund.id });
        var refundResult = refund;
      } else if (piId) {
        const refund = await stripe.refunds.create({ payment_intent: piId, reason: "requested_by_customer" });
        logStep("Refund created via PI from invoice", { refundId: refund.id });
        var refundResult = refund;
      } else {
        throw new Error("No charge or payment intent found on the latest invoice");
      }
    } else {
      logStep("Found succeeded payment intent", { piId: succeededPI.id, amount: succeededPI.amount });
      const refund = await stripe.refunds.create({
        payment_intent: succeededPI.id,
        reason: "requested_by_customer",
      });
      logStep("Refund created", { refundId: refund.id, status: refund.status });
      var refundResult = refund;
    }

    const refund = refundResult!;

    logStep("Refund created", { refundId: refund.id, status: refund.status });

    // Cancel the subscription immediately
    if (subscription.stripe_subscription_id) {
      await stripe.subscriptions.cancel(subscription.stripe_subscription_id);
      logStep("Subscription canceled in Stripe");
    }

    // Update subscription status to 'free' in Supabase - immediate downgrade
    const { error: updateError } = await supabaseClient
      .from("subscriptions")
      .update({
        status: "free",
        stripe_subscription_id: null,
        current_period_end: null,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", user.id);

    if (updateError) {
      logStep("Error updating subscription status", { error: updateError.message });
    } else {
      logStep("Subscription downgraded to free tier immediately");
    }

    // Update payment history to show refund
    await supabaseClient
      .from("payment_history")
      .update({
        status: "refunded",
        description: `Full refund - 7-day satisfaction guarantee (${tier === "agency" ? "Agency" : tier === "pro" ? "Pro" : "Starter"})`,
      })
      .eq("user_id", user.id)
      .eq("status", "paid");

    return new Response(
      JSON.stringify({
        success: true,
        refundId: refund.id,
        refundAmount: refund.amount,
        tier,
        message: `Your ${tier === "agency" ? "Agency" : "Pro"} subscription has been canceled and refunded successfully.`,
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
