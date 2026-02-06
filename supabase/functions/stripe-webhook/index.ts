import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Product IDs for subscription tiers - NEW 4-tier structure
const PRODUCT_IDS = {
  starter: "prod_TvmgZ0hR2LljbD",
  pro: "prod_TvmhiAvWEs9spu",
  agency: "prod_TvmiVnuynHd9pf",
};

function getPlanNameFromProductId(productId: string): string {
  if (productId === PRODUCT_IDS.agency) return "Agency Plan";
  if (productId === PRODUCT_IDS.pro) return "Pro Plan";
  if (productId === PRODUCT_IDS.starter) return "Starter Plan";
  return "Subscription";
}

function getPlanNameFromAmount(amount: number): string {
  if (amount === 9999) return "Agency Plan";
  if (amount === 1999) return "Pro Plan";
  if (amount === 999) return "Starter Plan";
  if (amount > 5000) return "Agency Plan";
  if (amount > 1500) return "Pro Plan";
  if (amount > 500) return "Starter Plan";
  return "Subscription";
}

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[STRIPE-WEBHOOK] ${step}${detailsStr}`);
};

const toTimestamp = (v: any) => {
  try {
    if (!v) return new Date().toISOString();
    if (typeof v === "string" && v.includes("-")) {
      const d = new Date(v);
      if (Number.isNaN(d.getTime())) throw new Error("Unparseable date string");
      return d.toISOString();
    }
    const n = typeof v === "number" ? v : Number(v);
    if (!Number.isFinite(n)) throw new Error("Non-numeric timestamp");
    const ms = n > 1e12 ? n : n * 1000;
    return new Date(ms).toISOString();
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logStep("Invalid timestamp encountered; defaulting to now()", { value: v, message });
    return new Date().toISOString();
  }
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

  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");

  if (!stripeKey) {
    logStep("ERROR", { message: "STRIPE_SECRET_KEY not configured" });
    return new Response("Stripe key not configured", { status: 500 });
  }

  if (!webhookSecret) {
    logStep("ERROR", { message: "STRIPE_WEBHOOK_SECRET not configured" });
    return new Response("Webhook secret not configured", { status: 500 });
  }

  const stripe = new Stripe(stripeKey, { apiVersion: "2025-12-15.clover" });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    const signature = req.headers.get("stripe-signature");
    if (!signature) {
      logStep("ERROR", { message: "Missing stripe-signature header" });
      return new Response("Missing signature", { status: 400 });
    }

    const body = await req.text();
    let event: Stripe.Event;

    try {
      event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      logStep("Webhook signature verification failed", { message });
      return new Response("Invalid signature", { status: 400 });
    }

    logStep("Event received", { type: event.type, id: event.id });

    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      logStep("Checkout session completed", { 
        sessionId: session.id, 
        customerId: session.customer,
        subscriptionId: session.subscription,
        userId: session.metadata?.user_id 
      });

      if (session.mode === "subscription" && session.subscription) {
        const subscription = await stripe.subscriptions.retrieve(session.subscription as string);
        const userId = session.metadata?.user_id;

        if (userId) {
          const priceId = subscription.items.data[0]?.price.id;
          const productId = subscription.items.data[0]?.price.product as string;
          const tier = getTierFromProductId(productId);
          
          logStep("Determined subscription tier", { productId, tier });

          try {
            const rawPeriodEnd = subscription.current_period_end;
            const currentPeriodEnd = toTimestamp(rawPeriodEnd);
            const updatedAt = toTimestamp(undefined);

            const { error } = await supabase
              .from("subscriptions")
              .upsert(
                {
                  user_id: userId,
                  stripe_customer_id: session.customer as string,
                  stripe_subscription_id: subscription.id,
                  status: tier,
                  price_id: priceId,
                  current_period_end: currentPeriodEnd,
                  updated_at: updatedAt,
                },
                { onConflict: "user_id" }
              );

            if (error) {
              logStep("Database update error", { error: error.message });
            } else {
              logStep(`Subscription updated to ${tier}`, { userId, nextBillingDate: currentPeriodEnd });

              // Accumulate lifetime usage, then reset monthly credits for new plan
              const { data: currentProfile } = await supabase
                .from("profiles")
                .select("credits_used, generations_this_month, transcript_fetches_this_month, lifetime_credits_used")
                .eq("user_id", userId)
                .maybeSingle();

              const currentUsed = currentProfile
                ? Math.max(
                    currentProfile.credits_used ?? 0,
                    (currentProfile.generations_this_month ?? 0) + (currentProfile.transcript_fetches_this_month ?? 0)
                  )
                : 0;
              const lifetimeSoFar = currentProfile?.lifetime_credits_used ?? 0;

              // Determine new credit limit based on upgraded tier
              const newCreditLimit = tier === "agency" ? 250 : tier === "pro" ? 60 : tier === "starter" ? 15 : 3;

              const { error: profileError } = await supabase
                .from("profiles")
                .update({
                  credits_used: 0,
                  credits_available: newCreditLimit,
                  generations_this_month: 0,
                  transcript_fetches_this_month: 0,
                  lifetime_credits_used: lifetimeSoFar + currentUsed,
                  credits_last_reset: updatedAt,
                  updated_at: updatedAt,
                })
                .eq("user_id", userId);

              if (profileError) {
                logStep("Error resetting credits on upgrade", { error: profileError.message });
              } else {
                logStep("Credits reset for upgrade", { userId, newCreditLimit, lifetimeAccumulated: lifetimeSoFar + currentUsed });
              }
            }
          } catch (dbError) {
            const errorMessage = dbError instanceof Error ? dbError.message : String(dbError);
            logStep("Database operation failed", { error: errorMessage, userId });
            throw dbError;
          }
        }
      }
    }

    if (event.type === "customer.subscription.updated") {
      const subscription = event.data.object as Stripe.Subscription;
      logStep("Subscription updated", { subscriptionId: subscription.id, status: subscription.status });

      const { data: subRecord } = await supabase
        .from("subscriptions")
        .select("user_id, status")
        .eq("stripe_subscription_id", subscription.id)
        .maybeSingle();

      if (subRecord) {
        let newStatus = "free";
        if (subscription.status === "active") {
          const productId = subscription.items.data[0]?.price.product as string;
          newStatus = getTierFromProductId(productId);
        }

        const previousStatus = subRecord.status || "free";
        const tierChanged = previousStatus !== newStatus;
        
        try {
          const currentPeriodEnd = toTimestamp(subscription.current_period_end);
          const updatedAt = toTimestamp(undefined);

          const { error } = await supabase
            .from("subscriptions")
            .update({
              status: newStatus,
              price_id: subscription.items.data[0]?.price.id,
              current_period_end: currentPeriodEnd,
              updated_at: updatedAt,
            })
            .eq("user_id", subRecord.user_id);

          if (error) {
            logStep("Database update error", { error: error.message });
          } else {
            logStep("Subscription status updated", { userId: subRecord.user_id, status: newStatus });

            // Reset credits when tier changes (upgrade or plan switch)
            if (tierChanged && newStatus !== "free") {
              const { data: currentProfile } = await supabase
                .from("profiles")
                .select("credits_used, generations_this_month, transcript_fetches_this_month, lifetime_credits_used")
                .eq("user_id", subRecord.user_id)
                .maybeSingle();

              const currentUsed = currentProfile
                ? Math.max(
                    currentProfile.credits_used ?? 0,
                    (currentProfile.generations_this_month ?? 0) + (currentProfile.transcript_fetches_this_month ?? 0)
                  )
                : 0;
              const lifetimeSoFar = currentProfile?.lifetime_credits_used ?? 0;
              const newCreditLimit = newStatus === "agency" ? 250 : newStatus === "pro" ? 60 : newStatus === "starter" ? 15 : 3;

              const { error: resetError } = await supabase
                .from("profiles")
                .update({
                  credits_used: 0,
                  credits_available: newCreditLimit,
                  generations_this_month: 0,
                  transcript_fetches_this_month: 0,
                  lifetime_credits_used: lifetimeSoFar + currentUsed,
                  credits_last_reset: updatedAt,
                  updated_at: updatedAt,
                })
                .eq("user_id", subRecord.user_id);

              if (resetError) {
                logStep("Error resetting credits on subscription update", { error: resetError.message });
              } else {
                logStep("Credits reset on plan change", { userId: subRecord.user_id, from: previousStatus, to: newStatus, newCreditLimit });
              }
            }
          }
        } catch (dbError) {
          const errorMessage = dbError instanceof Error ? dbError.message : String(dbError);
          logStep("Database update operation failed", { error: errorMessage });
          throw dbError;
        }
      }
    }

    if (event.type === "customer.subscription.deleted") {
      const subscription = event.data.object as Stripe.Subscription;
      logStep("Subscription canceled", { subscriptionId: subscription.id });

      try {
        const { error } = await supabase
          .from("subscriptions")
          .update({
            status: "free",
            stripe_subscription_id: null,
            current_period_end: null,
            updated_at: toTimestamp(undefined),
          })
          .eq("stripe_subscription_id", subscription.id);

        if (error) {
          logStep("Database update error (cancel)", { error: error.message });
        } else {
          logStep("Subscription set to free");
        }
      } catch (dbError) {
        const errorMessage = dbError instanceof Error ? dbError.message : String(dbError);
        logStep("Database cancel operation failed", { error: errorMessage });
        throw dbError;
      }
    }

    // Handle successful payments
    if (event.type === "invoice.paid" || event.type === "invoice.payment_succeeded") {
      const invoice = event.data.object as Stripe.Invoice;
      logStep("Invoice payment success", { type: event.type, invoiceId: invoice.id });

      try {
        const customerId = typeof invoice.customer === 'string' ? invoice.customer : invoice.customer?.id;
        const subscriptionId = typeof invoice.subscription === 'string'
          ? invoice.subscription
          : (invoice.subscription as any)?.id;

        if (!customerId && !subscriptionId) {
          return new Response(JSON.stringify({ received: true }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200,
          });
        }

        // Idempotency check
        const { data: existing } = await supabase
          .from("payment_history")
          .select("id")
          .eq("stripe_invoice_id", invoice.id)
          .maybeSingle();

        if (existing?.id) {
          return new Response(JSON.stringify({ received: true }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200,
          });
        }

        let resolvedUserId: string | null = null;
        if (customerId) {
          const { data: subByCustomer } = await supabase
            .from("subscriptions")
            .select("user_id")
            .eq("stripe_customer_id", customerId)
            .maybeSingle();
          resolvedUserId = subByCustomer?.user_id ?? null;
        }

        if (!resolvedUserId && subscriptionId) {
          const { data: subBySubscription } = await supabase
            .from("subscriptions")
            .select("user_id")
            .eq("stripe_subscription_id", subscriptionId)
            .maybeSingle();
          resolvedUserId = subBySubscription?.user_id ?? null;
        }

        if (resolvedUserId) {
          const paidAt = (invoice as any).status_transitions?.paid_at;
          const paymentDate = toTimestamp(paidAt ?? invoice.created);
          const amount = invoice.amount_paid || invoice.amount_due || invoice.total || 0;
          
          let planName = "Subscription payment";
          const lineItem = invoice.lines?.data?.[0];
          if (lineItem?.price?.product) {
            const productId = typeof lineItem.price.product === "string" 
              ? lineItem.price.product 
              : (lineItem.price.product as any)?.id;
            if (productId) {
              planName = getPlanNameFromProductId(productId);
            }
          }
          if (planName === "Subscription payment" || planName === "Subscription") {
            planName = getPlanNameFromAmount(amount);
          }
          
          const { error: insertError } = await supabase
            .from("payment_history")
            .insert({
              user_id: resolvedUserId,
              stripe_invoice_id: invoice.id,
              stripe_payment_intent_id: typeof invoice.payment_intent === 'string' 
                ? invoice.payment_intent 
                : invoice.payment_intent?.id || null,
              amount: amount,
              currency: invoice.currency || 'usd',
              status: invoice.status || 'paid',
              payment_date: paymentDate,
              invoice_pdf_url: invoice.invoice_pdf || invoice.hosted_invoice_url || null,
              description: planName,
            });

          if (insertError) {
            logStep("Error inserting payment history", { error: insertError.message });
          } else {
            logStep("Payment history recorded", { userId: resolvedUserId, amount });
          }
        }
      } catch (paymentError) {
        const errorMessage = paymentError instanceof Error ? paymentError.message : String(paymentError);
        logStep("Error processing invoice.paid", { error: errorMessage });
      }
    }

    return new Response(JSON.stringify({ received: true }), {
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
