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
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendKey = Deno.env.get("RESEND_API_KEY") || "";
    const siteUrl = Deno.env.get("VITE_SITE_URL") || "https://vidlogicai.com";

    const supabase = createClient(supabaseUrl, serviceKey);

    // Find all campaigns queued for auto-publish
    const { data: queuedCampaigns, error: fetchError } = await supabase
      .from("agent_campaigns")
      .select("*")
      .eq("status", "queued_for_publish");

    if (fetchError) throw fetchError;

    if (!queuedCampaigns || queuedCampaigns.length === 0) {
      return new Response(JSON.stringify({ message: "No campaigns queued for publish" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const results: Array<{ campaign_id: string; status: string; platforms: string[]; error?: string }> = [];

    for (const campaign of queuedCampaigns) {
      const publishedPlatforms: string[] = [];
      const existingPublishedTo = (campaign.published_to as string[]) || [];

      // Get user's agent settings for tokens
      const { data: settings } = await supabase
        .from("agent_settings")
        .select("*")
        .eq("user_id", campaign.user_id)
        .maybeSingle();

      if (!settings) {
        results.push({ campaign_id: campaign.id, status: "skipped", platforms: [], error: "No agent settings found" });
        continue;
      }

      const autoPostEnabled = (settings as any).auto_post_enabled === true;
      if (!autoPostEnabled) {
        // User disabled auto-post after queuing, move back to pending
        await supabase
          .from("agent_campaigns")
          .update({ status: "pending" })
          .eq("id", campaign.id);
        results.push({ campaign_id: campaign.id, status: "reverted_to_pending", platforms: [] });
        continue;
      }

      // Publish to X if token exists
      if ((settings as any).x_refresh_token && !existingPublishedTo.includes("x")) {
        try {
          const xRes = await fetch(`${supabaseUrl}/functions/v1/publish-to-x`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${serviceKey}`,
            },
            body: JSON.stringify({ campaign_id: campaign.id, user_id: campaign.user_id }),
          });
          const xData = await xRes.json();
          if (xRes.ok && !xData.error) {
            publishedPlatforms.push("x");
          } else {
            console.error("X publish error:", xData.error);
          }
        } catch (e) {
          console.error("X publish failed:", e);
        }
      }

      // Publish to LinkedIn if token exists
      if ((settings as any).linkedin_access_token && !existingPublishedTo.includes("linkedin")) {
        try {
          const liRes = await fetch(`${supabaseUrl}/functions/v1/publish-to-linkedin`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${serviceKey}`,
            },
            body: JSON.stringify({ campaign_id: campaign.id, user_id: campaign.user_id }),
          });
          const liData = await liRes.json();
          if (liRes.ok && !liData.error) {
            publishedPlatforms.push("linkedin");
          } else {
            console.error("LinkedIn publish error:", liData.error);
          }
        } catch (e) {
          console.error("LinkedIn publish failed:", e);
        }
      }

      // Update campaign status
      const allPublished = [...existingPublishedTo, ...publishedPlatforms];
      const newStatus = publishedPlatforms.length > 0 ? "published" : "approved";

      await supabase
        .from("agent_campaigns")
        .update({
          status: newStatus,
          published_to: allPublished,
        })
        .eq("id", campaign.id);

      // Log the autonomous action
      if (publishedPlatforms.length > 0) {
        await supabase.from("agent_logs").insert({
          user_id: campaign.user_id,
          action: "auto_published",
          campaign_id: campaign.id,
          details: {
            video_title: campaign.video_title,
            platforms: publishedPlatforms,
            published_at: new Date().toISOString(),
          },
        });

        // Send success notification email
        if (resendKey) {
          try {
            const { data: profile } = await supabase
              .from("profiles")
              .select("email, full_name")
              .eq("user_id", campaign.user_id)
              .maybeSingle();

            if (profile?.email) {
              await fetch("https://api.resend.com/emails", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${resendKey}`,
                },
                body: JSON.stringify({
                  from: "notifications@vidlogicai.com",
                  to: profile.email,
                  subject: `🚀 Auto-Published: ${campaign.video_title || "New content"}`,
                  html: `
                  <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:40px 24px;">
                    <img src="${siteUrl}/vidlogic-logo.png" alt="VidLogic AI" style="height:40px;margin-bottom:24px;" />
                    <h1 style="color:#111;font-size:20px;">✨ Auto-Pilot Published Content</h1>
                    <p style="color:#555;font-size:15px;">Hey ${profile.full_name || "there"},</p>
                    <p style="color:#555;font-size:15px;">Your Content Agent auto-published "<strong>${campaign.video_title || "Untitled"}</strong>" to <strong>${publishedPlatforms.join(" & ")}</strong>.</p>
                    <div style="text-align:center;margin:28px 0;">
                      <a href="${siteUrl}/agent/queue" style="display:inline-block;background:#6366f1;color:#fff;padding:12px 32px;border-radius:8px;text-decoration:none;font-weight:600;">View in Agent Queue</a>
                    </div>
                  </div>`,
                }),
              });
            }
          } catch (emailErr) {
            console.error("Failed to send auto-publish email:", emailErr);
          }
        }
      }

      results.push({ campaign_id: campaign.id, status: newStatus, platforms: publishedPlatforms });
    }

    return new Response(JSON.stringify({ results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("execute-auto-publish error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
