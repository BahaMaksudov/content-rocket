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
    const { code, redirect_uri, user_id } = await req.json();

    if (!code || !redirect_uri || !user_id) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: code, redirect_uri, user_id" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const clientId = Deno.env.get("LINKEDIN_CLIENT_ID");
    const clientSecret = Deno.env.get("LINKEDIN_CLIENT_SECRET");
    if (!clientId || !clientSecret) {
      return new Response(
        JSON.stringify({ error: "LinkedIn OAuth credentials not configured" }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Exchange authorization code for tokens
    const tokenRes = await fetch("https://www.linkedin.com/oauth/v2/accessToken", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri,
        client_id: clientId,
        client_secret: clientSecret,
      }),
    });

    const tokenData = await tokenRes.json();

    if (!tokenRes.ok || !tokenData.access_token) {
      console.error("LinkedIn token exchange failed:", tokenData);
      return new Response(
        JSON.stringify({ error: "Token exchange failed", details: tokenData }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const expiresAt = new Date(Date.now() + (tokenData.expires_in || 3600) * 1000).toISOString();

    // Get user profile info
    let linkedinName = "";
    try {
      const profileRes = await fetch("https://api.linkedin.com/v2/userinfo", {
        headers: { Authorization: `Bearer ${tokenData.access_token}` },
      });
      const profileData = await profileRes.json();
      linkedinName = profileData.name || profileData.given_name || "";
    } catch (e) {
      console.error("Failed to fetch LinkedIn profile:", e);
    }

    // Save tokens to agent_settings
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const { data: existing } = await supabase
      .from("agent_settings")
      .select("id")
      .eq("user_id", user_id)
      .maybeSingle();

    if (existing) {
      await supabase
        .from("agent_settings")
        .update({
          linkedin_access_token: tokenData.access_token,
          linkedin_expires_at: expiresAt,
          linkedin_name: linkedinName,
        })
        .eq("user_id", user_id);
    } else {
      await supabase
        .from("agent_settings")
        .insert({
          user_id,
          linkedin_access_token: tokenData.access_token,
          linkedin_expires_at: expiresAt,
          linkedin_name: linkedinName,
        });
    }

    return new Response(
      JSON.stringify({ success: true, name: linkedinName }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("auth-callback-linkedin error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
