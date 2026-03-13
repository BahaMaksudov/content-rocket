import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { code, code_verifier, redirect_uri, user_id } = await req.json();

    if (!code || !code_verifier || !redirect_uri || !user_id) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: code, code_verifier, redirect_uri, user_id" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const clientId = Deno.env.get("X_CLIENT_ID");
    const clientSecret = Deno.env.get("X_CLIENT_SECRET");
    if (!clientId || !clientSecret) {
      return new Response(
        JSON.stringify({ error: "X OAuth credentials not configured" }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Exchange authorization code for tokens
    const tokenRes = await fetch("https://api.x.com/2/oauth2/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${btoa(`${clientId}:${clientSecret}`)}`,
      },
      body: new URLSearchParams({
        code,
        grant_type: "authorization_code",
        redirect_uri,
        code_verifier,
      }),
    });

    const tokenData = await tokenRes.json();

    if (!tokenRes.ok || !tokenData.access_token) {
      console.error("X token exchange failed:", tokenData);
      return new Response(
        JSON.stringify({ error: "Token exchange failed", details: tokenData }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get user info
    let xUsername = "";
    try {
      const userRes = await fetch("https://api.x.com/2/users/me", {
        headers: { Authorization: `Bearer ${tokenData.access_token}` },
      });
      const userData = await userRes.json();
      xUsername = userData.data?.username || "";
    } catch (e) {
      console.error("Failed to fetch X user info:", e);
    }

    // Save refresh token to agent_settings
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Upsert: update if exists, insert if not
    const { data: existing } = await supabase
      .from("agent_settings")
      .select("id")
      .eq("user_id", user_id)
      .maybeSingle();

    if (existing) {
      await supabase
        .from("agent_settings")
        .update({
          x_refresh_token: tokenData.refresh_token,
          x_username: xUsername,
        })
        .eq("user_id", user_id);
    } else {
      await supabase
        .from("agent_settings")
        .insert({
          user_id,
          x_refresh_token: tokenData.refresh_token,
          x_username: xUsername,
        });
    }

    return new Response(
      JSON.stringify({ success: true, username: xUsername }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("auth-callback-x error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
