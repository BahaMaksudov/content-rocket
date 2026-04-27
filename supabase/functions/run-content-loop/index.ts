import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Shared LinkedIn post formatting spec — keeps mobile-first structure + branding consistent
const LINKEDIN_POST_SPEC = `A professional LinkedIn post (800-1200 chars) following these STRICT rules:
   - STRUCTURE (mobile-first):
     • HOOK: First 2 lines must be a punchy statement or question that makes readers click "See more". No fluff, no preamble.
     • BODY: 3-4 short paragraphs, each MAX 2 sentences.
     • WHITE SPACE: Use a DOUBLE line break (\\n\\n) between every paragraph for readability.
     • BULLETS: When listing key takeaways, use professional symbols 🔹, ✅, or • (one per line).
   - BRANDING & HASHTAGS: The post MUST end with a hashtag line on its own at the very bottom (preceded by \\n\\n). Include EXACTLY #VidLogicAI plus 2 relevant niche hashtags (e.g. #AIAutomation #ContentStrategy). You may add more relevant tags only if they add value, but #VidLogicAI is mandatory and must be one of the first three.
   - TONE: Professional yet conversational. No corporate jargon, no buzzword soup.
   - OUTPUT: Return as a single string with explicit \\n\\n between paragraphs so spacing is preserved exactly when copied. Do NOT wrap in markdown.`;

interface CampaignResult {
  user_id: string;
  status: string;
  campaign_id?: string;
  video_title?: string;
  first_tweet?: string;
  linkedin_intro?: string;
  auto_published?: boolean;
  confidence_score?: number;
  error?: string;
}

async function sendDigestEmail(
  resendKey: string,
  email: string,
  userName: string,
  topic: string,
  campaigns: CampaignResult[],
  siteUrl: string
) {
  const successCampaigns = campaigns.filter((c) => c.status === "success" || c.status === "auto_published");
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
        <h3 style="margin:0 0 8px;color:#111;font-size:16px;">${c.video_title || "Untitled"}${c.auto_published ? ' <span style="color:#22c55e;font-size:12px;">✅ Auto-Published</span>' : ""}</h3>
        ${c.confidence_score ? `<p style="margin:0 0 8px;color:#888;font-size:12px;">Confidence: ${c.confidence_score}%</p>` : ""}
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

async function discoverChannelRemixVideos(
  youtubeApiKey: string,
  channelId: string
) {
  // Get top videos from the user's own channel in the last 90 days
  const publishedAfter = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
  const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${encodeURIComponent(channelId)}&type=video&order=viewCount&maxResults=3&publishedAfter=${publishedAfter}&key=${youtubeApiKey}`;

  const res = await fetch(searchUrl);
  const data = await res.json();

  if (data.error || !data.items?.length) return [];

  return data.items.map((item: any) => ({
    videoId: item.id.videoId,
    title: item.snippet.title,
    url: `https://www.youtube.com/watch?v=${item.id.videoId}`,
  }));
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

    const userResults = new Map<string, { settings: typeof activeSettings[0]; campaigns: CampaignResult[] }>();

    for (const settings of activeSettings) {
      if (!userResults.has(settings.user_id)) {
        userResults.set(settings.user_id, { settings, campaigns: [] });
      }
      const userEntry = userResults.get(settings.user_id)!;

      const frequencyHours = (settings as any).frequency_hours ?? 12;
      const lastRunAt = (settings as any).last_run_at ? new Date((settings as any).last_run_at).getTime() : 0;
      const hoursSinceLastRun = (Date.now() - lastRunAt) / (1000 * 60 * 60);

      if (lastRunAt > 0 && hoursSinceLastRun < frequencyHours) {
        console.log(`Skipping run: Only ${hoursSinceLastRun.toFixed(1)}h since last run for user ${settings.user_id} (frequency: ${frequencyHours}h)`);
        userEntry.campaigns.push({ user_id: settings.user_id, status: "skipped_frequency" });
        continue;
      }

      try {
        const { data: profile } = await supabase
          .from("profiles")
          .select("credits_available, credits_used, email, full_name")
          .eq("user_id", settings.user_id)
          .maybeSingle();

        if (!profile || (profile.credits_available ?? 0) < 1) {
          console.log(`Skipping run: Insufficient credits for user ${settings.user_id}`);
          userEntry.campaigns.push({ user_id: settings.user_id, status: "insufficient_credits" });
          continue;
        }

        const autoPilotEnabled = (settings as any).auto_pilot_enabled === true;
        const autoPostEnabled = (settings as any).auto_post_enabled === true;
        const confidenceThreshold = (settings as any).confidence_threshold ?? 80;
        const remixChannelEnabled = (settings as any).remix_channel_enabled === true;
        const youtubeChannelId = (settings as any).youtube_channel_id || "";

        // --- Channel Remixer: discover top videos from user's own channel ---
        if (remixChannelEnabled && youtubeChannelId) {
          try {
            const topVideos = await discoverChannelRemixVideos(youtubeApiKey, youtubeChannelId);
            for (const video of topVideos) {
              // Check if already remixed
              const { data: existing } = await supabase
                .from("agent_campaigns")
                .select("id")
                .eq("user_id", settings.user_id)
                .eq("youtube_url", video.url)
                .maybeSingle();

              if (existing) continue;

              // Fetch transcript
              let transcript = "";
              try {
                const tRes = await fetch(`${supabaseUrl}/functions/v1/fetch-transcript`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json", Authorization: `Bearer ${serviceKey}` },
                  body: JSON.stringify({ url: video.url }),
                });
                const tData = await tRes.json();
                transcript = (tData.transcript || tData.text || "").slice(0, 8000);
              } catch { /* use title */ }

              if (!transcript || transcript.length < 50) transcript = video.title;

              const remixPrompt = `You are a content remixer. This is the user's OWN high-performing YouTube video. Create fresh "Refresh" content for X/Twitter, LinkedIn, and Facebook that gives the same topic a NEW angle.

VIDEO TITLE: ${video.title}
TRANSCRIPT: ${transcript}

Return JSON:
{
  "insights": ["5 key points"],
  "x_thread": ["5 tweets under 280 chars each, first is a hook"],
  "linkedin_post": ${JSON.stringify(LINKEDIN_POST_SPEC)},
  "facebook_post": "Community-focused Facebook post: a scroll-stopping headline, 2-3 emoji bullet points, an engagement question on its own line, then a new line with EXACTLY 2 hashtags (one MUST be #VidLogicAI), then a final line: [Link in First Comment]. The body (headline + bullets + question) MUST be under 250 characters total.",
  "confidence_score": <0-100 quality score>
}
Respond ONLY with valid JSON.`;

              const aiRes = await fetch("https://api.openai.com/v1/chat/completions", {
                method: "POST",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${openaiKey}` },
                body: JSON.stringify({ model: "gpt-4o-mini", messages: [{ role: "user", content: remixPrompt }], temperature: 0.7, max_tokens: 2000 }),
              });
              const aiData = await aiRes.json();
              const rawContent = aiData.choices?.[0]?.message?.content || "";
              let parsed: any;
              try { parsed = JSON.parse(rawContent); } catch { const m = rawContent.match(/```(?:json)?\s*([\s\S]*?)```/); parsed = m ? JSON.parse(m[1]) : { insights: [], x_thread: [], linkedin_post: "", facebook_post: "", confidence_score: 50 }; }

              const score = parsed.confidence_score ?? 50;
              const shouldAutoPublish = autoPilotEnabled && score >= confidenceThreshold;
              const campaignStatus = shouldAutoPublish && autoPostEnabled ? "queued_for_publish" : (shouldAutoPublish ? "approved" : "pending");
              const { data: campaign } = await supabase
                .from("agent_campaigns")
                .insert({
                  user_id: settings.user_id,
                  status: campaignStatus,
                  youtube_url: video.url,
                  video_title: `🔄 Remix: ${video.title}`,
                  insights: parsed.insights || [],
                  x_thread: parsed.x_thread || [],
                  linkedin_post: parsed.linkedin_post || "",
                  facebook_post: parsed.facebook_post || "",
                })
                .select("id")
                .single();

              if (campaign) {
                await supabase.from("profiles").update({
                  credits_available: (profile.credits_available ?? 0) - 1,
                  credits_used: (profile.credits_used ?? 0) + 1,
                }).eq("user_id", settings.user_id);

                userEntry.campaigns.push({
                  user_id: settings.user_id,
                  status: shouldAutoPublish ? "auto_published" : "success",
                  campaign_id: campaign.id,
                  video_title: `🔄 Remix: ${video.title}`,
                  first_tweet: parsed.x_thread?.[0] || "",
                  linkedin_intro: (parsed.linkedin_post || "").slice(0, 150),
                  auto_published: shouldAutoPublish,
                  confidence_score: score,
                });
              }
            }
          } catch (remixErr) {
            console.error("Channel remix error:", remixErr);
          }
        }

        // --- Standard Discovery ---
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
          console.log(`Skipping run: No videos found for user ${settings.user_id}`);
          userEntry.campaigns.push({ user_id: settings.user_id, status: "no_videos_found" });
          continue;
        }

        let bestVideo: any = null;
        for (const item of ytData.items) {
          const candidateUrl = `https://www.youtube.com/watch?v=${item.id.videoId}`;
          const { data: existing } = await supabase
            .from("agent_campaigns")
            .select("id")
            .eq("user_id", settings.user_id)
            .eq("youtube_url", candidateUrl)
            .maybeSingle();

          if (!existing) {
            bestVideo = item;
            break;
          }
        }

        if (!bestVideo) {
          userEntry.campaigns.push({ user_id: settings.user_id, status: "already_processed" });
          continue;
        }

        const videoId = bestVideo.id.videoId;
        const videoTitle = bestVideo.snippet.title;
        const youtubeUrl = `https://www.youtube.com/watch?v=${videoId}`;

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

        // Enhanced AI prompt with confidence score
        const aiPrompt = `You are a content strategist. Analyze this video transcript and create repurposed content.

VIDEO TITLE: ${videoTitle}
TRANSCRIPT: ${truncatedTranscript}

Return a JSON object with:
1. "insights": An array of exactly 5 key insight strings summarizing the video's main points.
2. "x_thread": A JSON array of 5 tweet strings for an X/Twitter thread (each under 280 chars). First tweet is a hook.
3. "linkedin_post": A professional LinkedIn post (800-1200 chars) with hashtags.
4. "facebook_post": A community-focused, conversational Facebook post. Structure: a scroll-stopping headline, then 2-3 emoji-led value bullet points (✅, 💡, 🔥, 👉), then ONE engagement question on its own line. The body (headline + bullets + question) MUST be under 250 characters total. After that, add a new line with EXACTLY 2 hashtags (one MUST be #VidLogicAI). Final line: [Link in First Comment]. Tone: warm, conversational, encouraging.
5. "confidence_score": An integer from 0-100 rating your confidence in the overall quality and virality potential of the generated content. 90+ means exceptional, 70-89 is good, below 70 needs human review.

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

        let parsed: { insights: string[]; x_thread: string[]; linkedin_post: string; facebook_post?: string; confidence_score?: number };
        try {
          parsed = JSON.parse(content);
        } catch {
          const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
          parsed = jsonMatch ? JSON.parse(jsonMatch[1]) : { insights: [], x_thread: [], linkedin_post: "", facebook_post: "", confidence_score: 50 };
        }

        const confidenceScore = parsed.confidence_score ?? 50;
        const shouldAutoPublish = autoPilotEnabled && confidenceScore >= confidenceThreshold;
        const campaignStatus = shouldAutoPublish && autoPostEnabled ? "queued_for_publish" : (shouldAutoPublish ? "approved" : "pending");

        const { data: campaign, error: insertError } = await supabase
          .from("agent_campaigns")
          .insert({
            user_id: settings.user_id,
            status: campaignStatus,
            youtube_url: youtubeUrl,
            video_title: videoTitle,
            insights: parsed.insights || [],
            x_thread: parsed.x_thread || [],
            linkedin_post: parsed.linkedin_post || "",
            facebook_post: parsed.facebook_post || "",
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

        await supabase
          .from("agent_settings")
          .update({ last_run_at: new Date().toISOString() })
          .eq("user_id", settings.user_id);

        userEntry.campaigns.push({
          user_id: settings.user_id,
          status: shouldAutoPublish ? "auto_published" : "success",
          campaign_id: campaign.id,
          video_title: videoTitle,
          first_tweet: parsed.x_thread?.[0] || "",
          linkedin_intro: (parsed.linkedin_post || "").slice(0, 150),
          auto_published: shouldAutoPublish,
          confidence_score: confidenceScore,
        });

        // Send low-confidence email if auto-pilot is on but score was too low
        if (autoPilotEnabled && !shouldAutoPublish && resendKey) {
          try {
            const { data: userProfile } = await supabase
              .from("profiles")
              .select("email, full_name")
              .eq("user_id", settings.user_id)
              .maybeSingle();

            if (userProfile?.email) {
              await fetch("https://api.resend.com/emails", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${resendKey}`,
                },
                body: JSON.stringify({
                  from: "notifications@vidlogicai.com",
                  to: userProfile.email,
                  subject: `⚠️ Draft needs review: ${videoTitle}`,
                  html: `
                  <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:40px 24px;">
                    <img src="${siteUrl}/vidlogic-logo.png" alt="VidLogic AI" style="height:40px;margin-bottom:24px;" />
                    <h1 style="color:#111;font-size:20px;">Manual Approval Required</h1>
                    <p style="color:#555;">Hey ${userProfile.full_name || "there"},</p>
                    <p style="color:#555;">The Agent created a new draft for "<strong>${videoTitle}</strong>", but it requires your manual approval due to a low confidence score (${confidenceScore}% — threshold: ${confidenceThreshold}%).</p>
                    <div style="text-align:center;margin:28px 0;">
                      <a href="${siteUrl}/agent/queue" style="display:inline-block;background:#6366f1;color:#fff;padding:12px 32px;border-radius:8px;text-decoration:none;font-weight:600;">Review Draft</a>
                    </div>
                  </div>`,
                }),
              });
            }
          } catch (lowConfEmailErr) {
            console.error("Low-confidence email error:", lowConfEmailErr);
          }
        }
      } catch (userError: unknown) {
        console.error(`Error processing user ${settings.user_id}:`, userError);
        userEntry.campaigns.push({ user_id: settings.user_id, status: "error" });
      }
    }

    // Send digest emails
    const allResults: CampaignResult[] = [];

    for (const [userId, entry] of userResults) {
      allResults.push(...entry.campaigns);

      const hasSuccess = entry.campaigns.some((c) => c.status === "success" || c.status === "auto_published");
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

    // Trigger auto-publish for any queued campaigns
    const hasQueued = allResults.some((r) => r.status === "auto_published");
    if (hasQueued) {
      try {
        await fetch(`${supabaseUrl}/functions/v1/execute-auto-publish`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${serviceKey}`,
          },
          body: JSON.stringify({}),
        });
      } catch (pubErr) {
        console.error("execute-auto-publish trigger error:", pubErr);
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
