import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  // Not required for Stripe->server calls, but keeps browser tooling / local testing happy.
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Product IDs for subscription tiers - UPDATED to match new Stripe products
const PRODUCT_IDS = {
  pro: "prod_TtwRuGNynEpRHz",    // Pro product ID ($29/mo)
  agency: "prod_TtxGA6pKTbpMoM", // Agency product ID ($249/mo)
};

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[STRIPE-WEBHOOK] ${step}${detailsStr}`);
};

// Stripe timestamps are usually Unix seconds, but some objects/versions can surface strings.
// Always normalize to an ISO string for DB timestamp columns.
const toTimestamp = (v: any) => {
  try {
    if (!v) return new Date().toISOString();

    // If it's already a date-ish string (e.g., ISO), parse directly.
    if (typeof v === "string" && v.includes("-")) {
      const d = new Date(v);
      if (Number.isNaN(d.getTime())) throw new Error("Unparseable date string");
      return d.toISOString();
    }

    // Default: treat as Unix seconds.
    const n = typeof v === "number" ? v : Number(v);
    if (!Number.isFinite(n)) throw new Error("Non-numeric timestamp");

    // Heuristic: if it's already in ms, don't multiply again.
    const ms = n > 1e12 ? n : n * 1000;
    return new Date(ms).toISOString();
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logStep("Invalid timestamp encountered; defaulting to now()", { value: v, message });
    return new Date().toISOString();
  }
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
      // Use constructEventAsync for Deno's SubtleCrypto provider
      event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      logStep("Webhook signature verification failed", {
        message,
        signatureSnippet: signature?.slice(0, 40),
      });
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
          // Get product ID to determine tier
          const priceId = subscription.items.data[0]?.price.id;
          const productId = subscription.items.data[0]?.price.product as string;
          const tier = getTierFromProductId(productId);
          
          logStep("Determined subscription tier", { productId, tier });

          try {
            // CRITICAL: Use subscription.current_period_end for next billing date
            // This is a Unix timestamp (seconds) from Stripe - convert to ISO string
            const rawPeriodEnd = subscription.current_period_end;
            const currentPeriodEnd = toTimestamp(rawPeriodEnd);
            const updatedAt = toTimestamp(undefined);

            logStep("Timestamp conversion for checkout", {
              rawCurrentPeriodEnd: rawPeriodEnd,
              currentPeriodEnd,
              updatedAt,
              subscriptionId: subscription.id,
            });

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
              logStep(`Subscription updated to ${tier}`, { 
                userId, 
                nextBillingDate: currentPeriodEnd 
              });
            }
          } catch (dbError) {
            const errorMessage = dbError instanceof Error ? dbError.message : String(dbError);
            logStep("Database operation failed", {
              error: errorMessage,
              rawCurrentPeriodEnd: subscription.current_period_end,
              userId,
            });
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
        .select("user_id")
        .eq("stripe_subscription_id", subscription.id)
        .maybeSingle();

      if (subRecord) {
        let status = "free";
        if (subscription.status === "active") {
          const productId = subscription.items.data[0]?.price.product as string;
          status = getTierFromProductId(productId);
        }
        
        try {
           const currentPeriodEnd = toTimestamp(subscription.current_period_end);
           const updatedAt = toTimestamp(undefined);
           
           logStep("Timestamp conversion for update", { 
             rawCurrentPeriodEnd: subscription.current_period_end,
             currentPeriodEnd,
             updatedAt,
           });

          const { error } = await supabase
            .from("subscriptions")
            .update({
              status,
              price_id: subscription.items.data[0]?.price.id,
              current_period_end: currentPeriodEnd,
              updated_at: updatedAt,
            })
            .eq("user_id", subRecord.user_id);

          if (error) {
            logStep("Database update error", { error: error.message });
          } else {
            logStep("Subscription status updated", { userId: subRecord.user_id, status });
          }
        } catch (dbError) {
          const errorMessage = dbError instanceof Error ? dbError.message : String(dbError);
          logStep("Database update operation failed", { 
            error: errorMessage,
            timestampInputs: {
              currentPeriodEnd: subscription.current_period_end,
              eventCreated: event.created,
            },
            userId: subRecord.user_id 
          });
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
        logStep("Database cancel operation failed", {
          error: errorMessage,
          timestampInputs: { eventCreated: event.created },
          subscriptionId: subscription.id,
        });
        throw dbError;
      }
    }

    // Handle successful payments - insert into payment_history
    if (event.type === "invoice.paid" || event.type === "invoice.payment_succeeded") {
      const invoice = event.data.object as Stripe.Invoice;
      logStep("Invoice payment success", { type: event.type, invoiceId: invoice.id, customerId: invoice.customer });

      try {
        // Resolve the user_id for this invoice. Prefer customer id, but fall back to subscription id
        // since some Stripe setups can produce invoices that don't match our stored customer mapping.
        const customerId = typeof invoice.customer === 'string' ? invoice.customer : invoice.customer?.id;
        const subscriptionId = typeof invoice.subscription === 'string'
          ? invoice.subscription
          : (invoice.subscription as any)?.id;

        if (!customerId && !subscriptionId) {
          logStep("Invoice missing customer/subscription id; skipping", { invoiceId: invoice.id });
          return new Response(JSON.stringify({ received: true }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200,
          });
        }

        logStep("Invoice identifiers", { invoiceId: invoice.id, customerId, subscriptionId });

        if (customerId || subscriptionId) {
          // Idempotency: webhooks can be retried.
          const { data: existing } = await supabase
            .from("payment_history")
            .select("id")
            .eq("stripe_invoice_id", invoice.id)
            .maybeSingle();

          if (existing?.id) {
            logStep("Payment history already exists for invoice; skipping", { invoiceId: invoice.id });
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
            if (resolvedUserId) {
              logStep("Resolved invoice user via stripe_subscription_id", { subscriptionId, userId: resolvedUserId });
            }
          }

          if (resolvedUserId) {
            const paidAt = (invoice as any).status_transitions?.paid_at;
            const paymentDate = toTimestamp(paidAt ?? invoice.created);
            const amount = invoice.amount_paid || invoice.amount_due || invoice.total || 0;
            
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
                description: invoice.lines?.data?.[0]?.description || 'Subscription payment',
              });

            if (insertError) {
              logStep("Error inserting payment history", { error: insertError.message });
            } else {
              logStep("Payment history recorded", { 
                userId: resolvedUserId, 
                amount,
                invoiceId: invoice.id 
              });
            }
          } else {
            logStep("No subscription found for invoice", { customerId, subscriptionId, invoiceId: invoice.id });
          }
        }
      } catch (paymentError) {
        const errorMessage = paymentError instanceof Error ? paymentError.message : String(paymentError);
        logStep("Error processing invoice.paid", { error: errorMessage });
        // Don't throw - we still want to return 200 to Stripe
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
