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
  console.log(`[SYNC-PAYMENT-HISTORY] ${step}${detailsStr}`);
};

// Normalize Stripe timestamps to ISO string for DB timestamp columns.
const toTimestamp = (v: any) => {
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n)) return new Date().toISOString();
  const ms = n > 1e12 ? n : n * 1000;
  return new Date(ms).toISOString();
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");

    logStep("User authenticated", { userId: user.id, email: user.email });

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // 1) Get (or create) Stripe customer id and persist it.
    const { data: subRecord } = await supabase
      .from("subscriptions")
      .select("stripe_customer_id")
      .eq("user_id", user.id)
      .maybeSingle();

    let customerId = subRecord?.stripe_customer_id ?? null;

    if (!customerId) {
      const customers = await stripe.customers.list({ email: user.email, limit: 1 });
      if (customers.data.length > 0) {
        customerId = customers.data[0].id;
        logStep("Found Stripe customer by email", { customerId });
      } else {
        const created = await stripe.customers.create({
          email: user.email,
          metadata: { supabase_user_id: user.id },
        });
        customerId = created.id;
        logStep("Created Stripe customer", { customerId });
      }

      // IMPORTANT: Upsert (not update) so we persist even if a subscriptions row doesn't exist yet.
      const { error: upsertError } = await supabase
        .from("subscriptions")
        .upsert({ user_id: user.id, stripe_customer_id: customerId }, { onConflict: "user_id" });

      if (upsertError) {
        logStep("Failed to persist stripe_customer_id", { error: upsertError.message });
      } else {
        logStep("Persisted stripe_customer_id", { customerId });
      }
    }

    if (!customerId) throw new Error("Unable to determine Stripe customer id");

    // 2) Fetch last 10 invoices.
    const invoices = await stripe.invoices.list({ customer: customerId, limit: 10 });
    logStep("Fetched invoices", { count: invoices.data.length, customerId });

    const invoiceIds = invoices.data
      .map((i: Stripe.Invoice) => i.id)
      .filter((id: string) => Boolean(id));
    if (invoiceIds.length === 0) {
      return new Response(JSON.stringify({ inserted: 0, invoicesFetched: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // 3) Avoid duplicates.
    const { data: existing } = await supabase
      .from("payment_history")
      .select("stripe_invoice_id")
      .eq("user_id", user.id)
      .in("stripe_invoice_id", invoiceIds);

    const existingIds = new Set(
      (existing ?? []).map((r: any) => r.stripe_invoice_id).filter(Boolean)
    );

    const rows = invoices.data
      .filter((inv: Stripe.Invoice) => !existingIds.has(inv.id))
      .map((inv: Stripe.Invoice) => {
        const paidAt = (inv as any).status_transitions?.paid_at;
        const paymentDate = toTimestamp(paidAt ?? inv.created);
        const amount = inv.amount_paid ?? inv.amount_due ?? inv.total ?? 0;
        const paymentIntentId =
          typeof inv.payment_intent === "string"
            ? inv.payment_intent
            : inv.payment_intent?.id ?? null;

        return {
          user_id: user.id,
          stripe_invoice_id: inv.id,
          stripe_payment_intent_id: paymentIntentId,
          amount,
          currency: inv.currency ?? "usd",
          status: inv.status ?? "paid",
          payment_date: paymentDate,
          invoice_pdf_url: inv.invoice_pdf ?? inv.hosted_invoice_url ?? null,
          description: inv.lines?.data?.[0]?.description ?? inv.description ?? "Invoice",
        };
      });

    if (rows.length === 0) {
      return new Response(JSON.stringify({ inserted: 0, invoicesFetched: invoices.data.length }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const { error: insertError } = await supabase.from("payment_history").insert(rows);
    if (insertError) throw insertError;

    logStep("Inserted payment history rows", { inserted: rows.length });

    return new Response(
      JSON.stringify({ inserted: rows.length, invoicesFetched: invoices.data.length }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
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
