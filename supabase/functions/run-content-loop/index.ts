import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface CampaignResult {
  user_id: string;
  status: string;
  campaign_id?: string;
  video_title?: string;
  first_tweet?: string;
  linkedin_intro?: string;
}

async function sendDigestEmail(
  resendKey: string,
  email: string,
  userName: string,
  topic: string,
  campaigns: CampaignResult[],
  siteUrl: string
) {
  const successCampaigns = campaigns.filter((c) => c.status === "success");
  if (successCampaigns.length === 0) return;

  const isMultiple = successCampaigns.length > 1;
  const firstTitle = successCampaigns[0].video_title || "a trending video";

  const subject = isMultiple
    ? `🤖 Your AI Agent found ${successCampaigns.length} trending videos`
    : `🤖 Your AI Agent found a trending video: ${firstTitle}`;

  const campaignCards = successCampaigns
    .map(
      (c) => `
      <div style="background:#f8f9fa;border-radius:12px;padding:20px;margin-bottom:16px;border-left:4px solid #6366f1;">
        <h3 style="margin:0 0 8px;color:#111;font-size:16px;">${c.video_title || "Untitled"}</h3>
        ${c.first_tweet ? `<p style="margin:0 0 8px;color:#555;font-size:14px;"><strong>Tweet preview:</strong> "${c.first_tweet}"</p>` : ""}
        ${c.linkedin_intro ? `<p style="margin:0;color:#555;font-size:14px;"><strong>LinkedIn intro:</strong> "${c.linkedin_intro}"</p>` : ""}
      </div>`
    )
    .join("");

  const html = `
  <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#ffffff;padding:40px 24px;">
    <div style="text-align:center;margin-bottom:32px;">
      <img src="${siteUrl}/vidlogic-logo.png" alt="VidLogic AI" style="height:40px;" />
    </div>
    <h1 style="color:#111;font-size:22px;margin:0 0 8px;">Hey ${userName || "there"},</h1>
    <p style="color:#555;font-size:16px;line-height:1.6;margin:0 0 24px;">
      Your Content Agent just discovered ${isMultiple ? `${successCampaigns.length} trending videos` : "a trending video"} in your <strong>${topic}</strong> topic.
    </p>
    ${campaignCards}
    <div style="text-align:center;margin:32px 0;">
      <a href="${siteUrl}/agent/queue" style="display:inline-block;background:#6366f1;color:#ffffff;font-size:16px;font-weight:600;text-decoration:none;padding:14px 40px;border-radius:10px;">
        Review & Approve on VidLogic
      </a>
    </div>
    <p style="color:#999;font-size:12px;text-align:center;margin-top:32px;">
      You can turn off these notifications in your Agent Settings.
    </p>
  </div>`;

  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${resendKey}`,
    },
    body: JSON.stringify({
      from: "notifications@vidlogicai.com",
      to: email,
      subject,
      html,
    }),
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const youtubeApiKey = Deno.env.get("YOUTUBE_API_KEY");
    const openaiKey = Deno.env.get("OPENAI_API_KEY");
    const resendKey = Deno.env.get("RESEND_API_KEY") || "";
    const siteUrl = Deno.env.get("VITE_SITE_URL") || "https://vidlogicai.com";

    if (!supabaseUrl || !serviceKey) throw new Error("Supabase configuration missing");
    if (!youtubeApiKey) throw new Error("YOUTUBE_API_KEY not configured – add it in your backend secrets");
    if (!openaiKey) throw new Error("OPENAI_API_KEY not configured – add it in your backend secrets");

    const supabase = createClient(supabaseUrl, serviceKey);

    let targetUserId: string | null = null;
    try {
      const body = await req.json();
      targetUserId = body.user_id || null;
    } catch {
      // No body = cron trigger
    }

    let settingsQuery = supabase
      .from("agent_settings")
      .select("*")
      .eq("is_active", true);

    if (targetUserId) {
      settingsQuery = settingsQuery.eq("user_id", targetUserId);
    }

    const { data: activeSettings, error: settingsError } = await settingsQuery;
    if (settingsError) throw settingsError;

    if (!activeSettings || activeSettings.length === 0) {
      return new Response(JSON.stringify({ message: "No active agents" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Group results by user for digest emails
    const userResults = new Map<string, { settings: typeof activeSettings[0]; campaigns: CampaignResult[] }>();

    for (const settings of activeSettings) {
      if (!userResults.has(settings.user_id)) {
        userResults.set(settings.user_id, { settings, campaigns: [] });
      }
      const userEntry = userResults.get(settings.user_id)!;

      try {
        const { data: profile } = await supabase
          .from("profiles")
          .select("credits_available, credits_used, email, full_name")
          .eq("user_id", settings.user_id)
          .maybeSingle();

        if (!profile || (profile.credits_available ?? 0) < 1) {
          userEntry.campaigns.push({ user_id: settings.user_id, status: "insufficient_credits" });
          continue;
        }

        const publishedAfter = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        const ytUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(settings.topic)}&type=video&order=viewCount&maxResults=3&publishedAfter=${publishedAfter}&key=${youtubeApiKey}`;

        let ytData: any;
        try {
          const ytRes = await fetch(ytUrl);
          ytData = await ytRes.json();
          if (ytData.error) {
            const ytErrMsg = ytData.error.message || "YouTube API error";
            console.error("YouTube API error:", ytErrMsg);
            userEntry.campaigns.push({ user_id: settings.user_id, status: "youtube_api_error", error: ytErrMsg });
            continue;
          }
        } catch (ytFetchErr) {
          console.error("YouTube fetch failed:", ytFetchErr);
          userEntry.campaigns.push({ user_id: settings.user_id, status: "youtube_api_error", error: String(ytFetchErr) });
          continue;
        }

        if (!ytData.items || ytData.items.length === 0) {
          userEntry.campaigns.push({ user_id: settings.user_id, status: "no_videos_found" });
          continue;
        }

        const bestVideo = ytData.items[0];
        const videoId = bestVideo.id.videoId;
        const videoTitle = bestVideo.snippet.title;
        const youtubeUrl = `https://www.youtube.com/watch?v=${videoId}`;

        const { data: existing } = await supabase
          .from("agent_campaigns")
          .select("id")
          .eq("user_id", settings.user_id)
          .eq("youtube_url", youtubeUrl)
          .maybeSingle();

        if (existing) {
          userEntry.campaigns.push({ user_id: settings.user_id, status: "already_processed" });
          continue;
        }

        let transcript = "";
        try {
          const transcriptRes = await fetch(`${supabaseUrl}/functions/v1/fetch-transcript`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${serviceKey}` },
            body: JSON.stringify({ url: youtubeUrl }),
          });
          const transcriptData = await transcriptRes.json();
          transcript = transcriptData.transcript || transcriptData.text || "";
        } catch (e) {
          console.error("Transcript fetch failed:", e);
        }

        if (!transcript || transcript.length < 100) {
          transcript = bestVideo.snippet.description || videoTitle;
        }

        const truncatedTranscript = transcript.slice(0, 8000);
        const platforms = settings.platforms || ["x", "linkedin"];

        const aiPrompt = `You are a content strategist. Analyze this video transcript and create repurposed content.

VIDEO TITLE: ${videoTitle}
TRANSCRIPT: ${truncatedTranscript}

Return a JSON object with:
1. "insights": An array of exactly 5 key insight strings summarizing the video's main points.
2. "x_thread": A JSON array of 5 tweet strings for an X/Twitter thread (each under 280 chars). First tweet is a hook.
3. "linkedin_post": A professional LinkedIn post (800-1200 chars) with hashtags.

Respond ONLY with valid JSON, no markdown.`;

        const aiRes = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${openaiKey}`,
          },
          body: JSON.stringify({
            model: "gpt-4o-mini",
            messages: [{ role: "user", content: aiPrompt }],
            temperature: 0.7,
            max_tokens: 2000,
          }),
        });

        const aiData = await aiRes.json();
        const content = aiData.choices?.[0]?.message?.content || "";

        let parsed: { insights: string[]; x_thread: string[]; linkedin_post: string };
        try {
          parsed = JSON.parse(content);
        } catch {
          const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
          parsed = jsonMatch ? JSON.parse(jsonMatch[1]) : { insights: [], x_thread: [], linkedin_post: "" };
        }

        const { data: campaign, error: insertError } = await supabase
          .from("agent_campaigns")
          .insert({
            user_id: settings.user_id,
            status: "pending",
            youtube_url: youtubeUrl,
            video_title: videoTitle,
            insights: parsed.insights || [],
            x_thread: parsed.x_thread || [],
            linkedin_post: parsed.linkedin_post || "",
          })
          .select("id")
          .single();

        if (insertError) throw insertError;

        await supabase
          .from("profiles")
          .update({
            credits_available: (profile.credits_available ?? 0) - 1,
            credits_used: (profile.credits_used ?? 0) + 1,
          })
          .eq("user_id", settings.user_id);

        userEntry.campaigns.push({
          user_id: settings.user_id,
          status: "success",
          campaign_id: campaign.id,
          video_title: videoTitle,
          first_tweet: parsed.x_thread?.[0] || "",
          linkedin_intro: (parsed.linkedin_post || "").slice(0, 150),
        });
      } catch (userError: unknown) {
        console.error(`Error processing user ${settings.user_id}:`, userError);
        userEntry.campaigns.push({ user_id: settings.user_id, status: "error" });
      }
    }

    // Send digest emails (one per user, batched)
    const allResults: CampaignResult[] = [];

    for (const [userId, entry] of userResults) {
      allResults.push(...entry.campaigns);

      const hasSuccess = entry.campaigns.some((c) => c.status === "success");
      const emailEnabled = entry.settings.email_notifications !== false;

      if (hasSuccess && emailEnabled && resendKey) {
        try {
          const { data: profile } = await supabase
            .from("profiles")
            .select("email, full_name")
            .eq("user_id", userId)
            .maybeSingle();

          if (profile?.email) {
            await sendDigestEmail(
              resendKey,
              profile.email,
              profile.full_name || "",
              entry.settings.topic || "your niche",
              entry.campaigns,
              siteUrl
            );
          }
        } catch (emailErr) {
          console.error(`Failed to send digest email for user ${userId}:`, emailErr);
        }
      }
    }

    return new Response(JSON.stringify({ results: allResults }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("run-content-loop error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
