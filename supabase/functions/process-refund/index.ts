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
const MAX_GENERATIONS_FOR_REFUND = 3;

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

    if ((generationCount ?? 0) >= MAX_GENERATIONS_FOR_REFUND) {
      throw new Error("Too many AI generations used for refund eligibility");
    }

    const { count: paymentCount } = await supabaseClient
      .from("payment_history")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id);

    if ((paymentCount ?? 0) > 1) {
      throw new Error("Refunds only available for first-time subscribers");
    }

    logStep("Eligibility verified");

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

    // Get the latest invoice/charge for this subscription
    const invoices = await stripe.invoices.list({
      customer: customerId,
      subscription: subscription.stripe_subscription_id || undefined,
      limit: 1,
    });

    if (invoices.data.length === 0) {
      throw new Error("No invoices found for this subscription");
    }

    const latestInvoice = invoices.data[0];
    const chargeId = latestInvoice.charge as string;

    if (!chargeId) {
      throw new Error("No charge found on the latest invoice");
    }

    logStep("Found charge to refund", { chargeId, amount: latestInvoice.amount_paid });

    // Process the refund
    const refund = await stripe.refunds.create({
      charge: chargeId,
      reason: "requested_by_customer",
    });

    logStep("Refund created", { refundId: refund.id, status: refund.status });

    // Cancel the subscription immediately
    if (subscription.stripe_subscription_id) {
      await stripe.subscriptions.cancel(subscription.stripe_subscription_id);
      logStep("Subscription canceled in Stripe");
    }

    // Update subscription status in Supabase
    const { error: updateError } = await supabaseClient
      .from("subscriptions")
      .update({
        status: "canceled",
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", user.id);

    if (updateError) {
      logStep("Error updating subscription status", { error: updateError.message });
    } else {
      logStep("Subscription status updated to canceled");
    }

    // Update payment history to show refund
    await supabaseClient
      .from("payment_history")
      .update({
        status: "refunded",
        description: "Full refund - 7-day satisfaction guarantee",
      })
      .eq("stripe_invoice_id", latestInvoice.id);

    return new Response(
      JSON.stringify({
        success: true,
        refundId: refund.id,
        refundAmount: refund.amount,
        message: "Your subscription has been canceled and refunded successfully.",
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
