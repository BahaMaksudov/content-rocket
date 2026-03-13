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
    const { campaign_id, user_id } = await req.json();

    if (!campaign_id || !user_id) {
      return new Response(
        JSON.stringify({ error: "Missing campaign_id or user_id" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Get user's LinkedIn token
    const { data: settings } = await supabase
      .from("agent_settings")
      .select("linkedin_access_token, linkedin_expires_at")
      .eq("user_id", user_id)
      .maybeSingle();

    if (!settings?.linkedin_access_token) {
      return new Response(
        JSON.stringify({ error: "LinkedIn not connected. Please connect your LinkedIn account in Agent Settings.", reconnect: true }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if token is expired
    if (settings.linkedin_expires_at && new Date(settings.linkedin_expires_at) < new Date()) {
      await supabase
        .from("agent_settings")
        .update({ linkedin_access_token: null, linkedin_expires_at: null, linkedin_name: null })
        .eq("user_id", user_id);

      return new Response(
        JSON.stringify({ error: "LinkedIn token expired. Please reconnect your LinkedIn account.", reconnect: true }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get campaign content
    const { data: campaign } = await supabase
      .from("agent_campaigns")
      .select("linkedin_post, published_to")
      .eq("id", campaign_id)
      .eq("user_id", user_id)
      .single();

    if (!campaign?.linkedin_post) {
      return new Response(
        JSON.stringify({ error: "No LinkedIn post content found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get LinkedIn user ID (sub) from userinfo
    const userInfoRes = await fetch("https://api.linkedin.com/v2/userinfo", {
      headers: { Authorization: `Bearer ${settings.linkedin_access_token}` },
    });
    const userInfo = await userInfoRes.json();

    if (!userInfoRes.ok || !userInfo.sub) {
      console.error("LinkedIn userinfo failed:", userInfo);
      return new Response(
        JSON.stringify({ error: "Failed to get LinkedIn profile. Token may be invalid.", reconnect: true }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Post to LinkedIn
    const postRes = await fetch("https://api.linkedin.com/v2/posts", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${settings.linkedin_access_token}`,
        "LinkedIn-Version": "202401",
        "X-Restli-Protocol-Version": "2.0.0",
      },
      body: JSON.stringify({
        author: `urn:li:person:${userInfo.sub}`,
        lifecycleState: "PUBLISHED",
        visibility: "PUBLIC",
        commentary: campaign.linkedin_post,
        distribution: {
          feedDistribution: "MAIN_FEED",
          targetEntities: [],
          thirdPartyDistributionChannels: [],
        },
      }),
    });

    if (!postRes.ok) {
      const errData = await postRes.text();
      console.error("LinkedIn post failed:", postRes.status, errData);

      const publishedTo = Array.isArray(campaign.published_to) ? campaign.published_to : [];
      publishedTo.push({
        platform: "linkedin",
        status: "failed",
        error: `HTTP ${postRes.status}: ${errData}`,
        attempted_at: new Date().toISOString(),
      });
      await supabase
        .from("agent_campaigns")
        .update({ published_to: publishedTo })
        .eq("id", campaign_id);

      return new Response(
        JSON.stringify({ error: `LinkedIn post failed: ${errData}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const postId = postRes.headers.get("x-restli-id") || "unknown";

    // Log success
    const publishedTo = Array.isArray(campaign.published_to) ? campaign.published_to : [];
    publishedTo.push({
      platform: "linkedin",
      status: "success",
      post_id: postId,
      published_at: new Date().toISOString(),
    });

    // Update status to published if X was also published, otherwise mark as published
    await supabase
      .from("agent_campaigns")
      .update({ published_to: publishedTo, status: "published" })
      .eq("id", campaign_id);

    return new Response(
      JSON.stringify({ success: true, post_id: postId }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("publish-to-linkedin error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
