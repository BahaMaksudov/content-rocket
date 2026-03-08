import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const youtubeApiKey = Deno.env.get("YOUTUBE_API_KEY")!;
    const openaiKey = Deno.env.get("OPENAI_API_KEY")!;

    if (!youtubeApiKey) throw new Error("YOUTUBE_API_KEY not configured");
    if (!openaiKey) throw new Error("OPENAI_API_KEY not configured");

    const supabase = createClient(supabaseUrl, serviceKey);

    // Check if called for a specific user (manual trigger) or all active users (cron)
    let targetUserId: string | null = null;
    try {
      const body = await req.json();
      targetUserId = body.user_id || null;
    } catch {
      // No body = cron trigger, process all active users
    }

    // Fetch active agent settings
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

    const results: Array<{ user_id: string; status: string; campaign_id?: string }> = [];

    for (const settings of activeSettings) {
      try {
        // Check credits
        const { data: profile } = await supabase
          .from("profiles")
          .select("credits_available, credits_used")
          .eq("user_id", settings.user_id)
          .maybeSingle();

        if (!profile || (profile.credits_available ?? 0) < 1) {
          results.push({ user_id: settings.user_id, status: "insufficient_credits" });
          continue;
        }

        // Step 1: Discovery — search YouTube for top videos in user's topic
        const publishedAfter = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        const ytUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(settings.topic)}&type=video&order=viewCount&maxResults=3&publishedAfter=${publishedAfter}&key=${youtubeApiKey}`;

        const ytRes = await fetch(ytUrl);
        const ytData = await ytRes.json();

        if (!ytData.items || ytData.items.length === 0) {
          results.push({ user_id: settings.user_id, status: "no_videos_found" });
          continue;
        }

        const bestVideo = ytData.items[0];
        const videoId = bestVideo.id.videoId;
        const videoTitle = bestVideo.snippet.title;
        const youtubeUrl = `https://www.youtube.com/watch?v=${videoId}`;

        // Check if we already have a campaign for this video
        const { data: existing } = await supabase
          .from("agent_campaigns")
          .select("id")
          .eq("user_id", settings.user_id)
          .eq("youtube_url", youtubeUrl)
          .maybeSingle();

        if (existing) {
          results.push({ user_id: settings.user_id, status: "already_processed" });
          continue;
        }

        // Step 2: Extraction — fetch transcript via existing edge function
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
          // Use video description as fallback
          transcript = bestVideo.snippet.description || videoTitle;
        }

        // Truncate for AI
        const truncatedTranscript = transcript.slice(0, 8000);

        // Step 3: Generation — use OpenAI to create insights + content
        const platforms = settings.platforms || ["x", "linkedin"];
        const platformInstructions = platforms.includes("x")
          ? `\n\n**X THREAD**: Write a 5-tweet thread. Return as a JSON array of strings. Each tweet must be under 280 characters. The first tweet should be a hook.`
          : "";

        const linkedinInstructions = platforms.includes("linkedin")
          ? `\n\n**LINKEDIN POST**: Write a professional LinkedIn post (800-1200 characters). Include relevant hashtags at the end.`
          : "";

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
          // Try to extract JSON from markdown code blocks
          const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
          parsed = jsonMatch ? JSON.parse(jsonMatch[1]) : { insights: [], x_thread: [], linkedin_post: "" };
        }

        // Save campaign with status 'pending'
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

        // Deduct 1 credit
        await supabase
          .from("profiles")
          .update({
            credits_available: (profile.credits_available ?? 0) - 1,
            credits_used: (profile.credits_used ?? 0) + 1,
          })
          .eq("user_id", settings.user_id);

        results.push({ user_id: settings.user_id, status: "success", campaign_id: campaign.id });
      } catch (userError: unknown) {
        console.error(`Error processing user ${settings.user_id}:`, userError);
        results.push({ user_id: settings.user_id, status: "error" });
      }
    }

    return new Response(JSON.stringify({ results }), {
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
