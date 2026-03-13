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

    const clientId = Deno.env.get("X_CLIENT_ID");
    const clientSecret = Deno.env.get("X_CLIENT_SECRET");
    if (!clientId || !clientSecret) {
      return new Response(
        JSON.stringify({ error: "X OAuth credentials not configured" }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Get user's refresh token
    const { data: settings } = await supabase
      .from("agent_settings")
      .select("x_refresh_token")
      .eq("user_id", user_id)
      .maybeSingle();

    if (!settings?.x_refresh_token) {
      return new Response(
        JSON.stringify({ error: "X not connected. Please connect your X account in Agent Settings.", reconnect: true }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Refresh the access token
    const tokenRes = await fetch("https://api.x.com/2/oauth2/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${btoa(`${clientId}:${clientSecret}`)}`,
      },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: settings.x_refresh_token,
      }),
    });

    const tokenData = await tokenRes.json();

    if (!tokenRes.ok || !tokenData.access_token) {
      console.error("X token refresh failed:", tokenData);
      // Save null to invalidate
      await supabase
        .from("agent_settings")
        .update({ x_refresh_token: null, x_username: null })
        .eq("user_id", user_id);

      return new Response(
        JSON.stringify({ error: "X token expired. Please reconnect your X account.", reconnect: true }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Save new refresh token
    if (tokenData.refresh_token) {
      await supabase
        .from("agent_settings")
        .update({ x_refresh_token: tokenData.refresh_token })
        .eq("user_id", user_id);
    }

    // Get campaign content
    const { data: campaign } = await supabase
      .from("agent_campaigns")
      .select("x_thread, published_to")
      .eq("id", campaign_id)
      .eq("user_id", user_id)
      .single();

    if (!campaign?.x_thread) {
      return new Response(
        JSON.stringify({ error: "No X thread content found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const tweets = Array.isArray(campaign.x_thread) ? campaign.x_thread : [];
    const publishedTweetIds: string[] = [];
    let lastTweetId: string | null = null;

    // Post thread
    for (const tweet of tweets) {
      const body: Record<string, unknown> = { text: String(tweet) };
      if (lastTweetId) {
        body.reply = { in_reply_to_tweet_id: lastTweetId };
      }

      const postRes = await fetch("https://api.x.com/2/tweets", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${tokenData.access_token}`,
        },
        body: JSON.stringify(body),
      });

      const postData = await postRes.json();

      if (!postRes.ok) {
        console.error("X post failed:", postData);
        // Log partial publish
        const publishedTo = Array.isArray(campaign.published_to) ? campaign.published_to : [];
        publishedTo.push({
          platform: "x",
          status: "partial_failure",
          error: postData.detail || "Post failed",
          tweet_ids: publishedTweetIds,
          attempted_at: new Date().toISOString(),
        });
        await supabase
          .from("agent_campaigns")
          .update({ published_to: publishedTo })
          .eq("id", campaign_id);

        return new Response(
          JSON.stringify({ error: `Failed to post tweet ${publishedTweetIds.length + 1}: ${postData.detail || "Unknown error"}`, partial: true }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      lastTweetId = postData.data?.id;
      if (lastTweetId) publishedTweetIds.push(lastTweetId);
    }

    // Log success
    const publishedTo = Array.isArray(campaign.published_to) ? campaign.published_to : [];
    publishedTo.push({
      platform: "x",
      status: "success",
      tweet_ids: publishedTweetIds,
      published_at: new Date().toISOString(),
    });
    await supabase
      .from("agent_campaigns")
      .update({ published_to: publishedTo, status: "published" })
      .eq("id", campaign_id);

    return new Response(
      JSON.stringify({ success: true, tweet_ids: publishedTweetIds }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("publish-to-x error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
