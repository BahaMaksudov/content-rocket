import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform",
};

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CHECK-SUBSCRIPTION] ${step}${detailsStr}`);
};

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

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    const user = userData.user;
    if (!user) throw new Error("User not authenticated");
    
    logStep("User authenticated", { userId: user.id });

    // Check subscription status from database
    const { data: subscription, error: subError } = await supabase
      .from("subscriptions")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    if (subError) {
      logStep("Database error", { error: subError.message });
      throw new Error(subError.message);
    }

    // If no subscription record exists, only create one if user has a profile
    // This prevents auto-creating subscriptions for deleted users
    if (!subscription) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!profile) {
        logStep("No profile found - user may have been deleted, skipping subscription creation");
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

      logStep("No subscription found but profile exists, creating free record");
      await supabase
        .from("subscriptions")
        .insert({ user_id: user.id, status: "free" });

      return new Response(JSON.stringify({
        subscribed: false,
        status: "free",
        subscription_end: null,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Determine tier from status: "pro", "agency", or "free"
    const status = subscription.status || "free";
    const isPro = status === "pro";
    const isAgency = status === "agency";
    const subscribed = isPro || isAgency;
    
    logStep("Subscription found", { 
      status, 
      isPro,
      isAgency,
      subscribed,
      subscriptionEnd: subscription.current_period_end 
    });

    return new Response(JSON.stringify({
      subscribed,
      status,
      subscription_end: subscription.current_period_end,
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
