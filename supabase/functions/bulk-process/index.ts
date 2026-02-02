import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const logStep = (step: string, details?: Record<string, unknown>) => {
  console.log(`[BULK-PROCESS] ${step}`, details ? JSON.stringify(details) : "");
};

// Extract video IDs from various YouTube URL formats
function extractVideoIds(urls: string[]): string[] {
  const videoIds: string[] = [];
  const videoIdRegex = /(?:youtube\.com\/(?:watch\?v=|embed\/|v\/|shorts\/)|youtu\.be\/|youtube\.com\/live\/)([a-zA-Z0-9_-]{11})/;
  
  for (const url of urls) {
    const trimmed = url.trim();
    if (!trimmed) continue;
    
    const match = trimmed.match(videoIdRegex);
    if (match && match[1]) {
      videoIds.push(match[1]);
    }
  }
  
  return [...new Set(videoIds)]; // Remove duplicates
}

// Extract video IDs from a playlist URL (simplified - returns placeholder for now)
async function extractPlaylistVideos(playlistUrl: string): Promise<string[]> {
  // For now, we'll just extract any video IDs present in the URL
  // A full implementation would use YouTube Data API to fetch playlist contents
  const videoIdRegex = /(?:youtube\.com\/(?:watch\?v=|embed\/|v\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
  const match = playlistUrl.match(videoIdRegex);
  
  if (match && match[1]) {
    return [match[1]];
  }
  
  return [];
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      throw new Error("Unauthorized");
    }
    logStep("User authenticated", { userId: user.id });

    // Check if user has Agency subscription
    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { data: subscription } = await adminClient
      .from("subscriptions")
      .select("status")
      .eq("user_id", user.id)
      .single();

    if (!subscription || subscription.status !== "agency") {
      return new Response(
        JSON.stringify({ 
          error: "agency_required", 
          message: "Bulk processing is only available for Agency subscribers" 
        }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    logStep("Agency subscription verified");

    const { urls, playlistUrl, tone, audience, brandVoice, translateTo } = await req.json();

    // Extract video IDs
    let videoIds: string[] = [];
    
    if (playlistUrl) {
      const playlistVideos = await extractPlaylistVideos(playlistUrl);
      videoIds.push(...playlistVideos);
    }
    
    if (urls && Array.isArray(urls)) {
      const urlVideos = extractVideoIds(urls);
      videoIds.push(...urlVideos);
    }

    videoIds = [...new Set(videoIds)]; // Remove duplicates
    
    if (videoIds.length === 0) {
      return new Response(
        JSON.stringify({ error: "no_videos", message: "No valid YouTube video URLs found" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Limit to 10 videos per batch for now
    if (videoIds.length > 10) {
      videoIds = videoIds.slice(0, 10);
    }

    logStep("Videos to process", { count: videoIds.length, videoIds });

    // Get user's organization if any
    const { data: membership } = await adminClient
      .from("organization_members")
      .select("organization_id")
      .eq("user_id", user.id)
      .maybeSingle();

    // Create batch job record
    const videoUrls = videoIds.map(id => ({
      videoId: id,
      url: `https://youtube.com/watch?v=${id}`,
      status: "pending",
      title: null,
      error: null,
    }));

    const { data: batchJob, error: batchError } = await adminClient
      .from("batch_jobs")
      .insert({
        user_id: user.id,
        organization_id: membership?.organization_id || null,
        status: "processing",
        total_videos: videoIds.length,
        video_urls: videoUrls,
      })
      .select()
      .single();

    if (batchError) {
      logStep("Failed to create batch job", { error: batchError.message });
      throw new Error("Failed to create batch job");
    }

    logStep("Batch job created", { batchId: batchJob.id });

    // Process videos in background using waitUntil
    const processVideos = async () => {
      const results: any[] = [];
      let completed = 0;
      let failed = 0;

      for (let i = 0; i < videoIds.length; i++) {
        const videoId = videoIds[i];
        logStep(`Processing video ${i + 1}/${videoIds.length}`, { videoId });

        try {
          // Fetch transcript
          const transcriptResponse = await fetch(
            `${Deno.env.get("SUPABASE_URL")}/functions/v1/fetch-transcript`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: authHeader,
              },
              body: JSON.stringify({ videoId }),
            }
          );

          const transcriptData = await transcriptResponse.json();

          if (!transcriptResponse.ok || transcriptData.error) {
            throw new Error(transcriptData.error || "Failed to fetch transcript");
          }

          // Generate content
          const contentResponse = await fetch(
            `${Deno.env.get("SUPABASE_URL")}/functions/v1/generate-content`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: authHeader,
              },
              body: JSON.stringify({
                transcript: transcriptData.transcript,
                tone: tone || "professional",
                audience: audience || "general",
                brandVoice: brandVoice || null,
                translateTo: translateTo || null,
              }),
            }
          );

          const contentData = await contentResponse.json();

          if (!contentResponse.ok || contentData.error) {
            throw new Error(contentData.error || "Failed to generate content");
          }

          // Save to generations table
          await adminClient.from("generations").insert({
            user_id: user.id,
            organization_id: membership?.organization_id || null,
            youtube_url: `https://youtube.com/watch?v=${videoId}`,
            video_title: transcriptData.title || null,
            transcript: transcriptData.transcript || null,
            transcript_method: "auto",
            tone: tone || "professional",
            audience: audience || "general",
            twitter_hooks: contentData.twitterHooks,
            linkedin_post: contentData.linkedinPost,
            short_form_scripts: contentData.shortFormScripts,
            blog_post: contentData.blogPost,
            target_language: translateTo || null,
          });

          results.push({
            videoId,
            status: "completed",
            title: transcriptData.title || videoId,
          });

          completed++;
          videoUrls[i].status = "completed";
          videoUrls[i].title = transcriptData.title;

        } catch (error: any) {
          logStep(`Failed to process video ${videoId}`, { error: error.message });
          results.push({
            videoId,
            status: "failed",
            error: error.message,
          });
          failed++;
          videoUrls[i].status = "failed";
          videoUrls[i].error = error.message;
        }

        // Update batch job progress
        await adminClient
          .from("batch_jobs")
          .update({
            completed_videos: completed,
            failed_videos: failed,
            video_urls: videoUrls,
            results,
          })
          .eq("id", batchJob.id);
      }

      // Mark batch as completed
      await adminClient
        .from("batch_jobs")
        .update({
          status: failed === videoIds.length ? "failed" : "completed",
          completed_at: new Date().toISOString(),
        })
        .eq("id", batchJob.id);

      logStep("Batch processing completed", { completed, failed });
    };

    // Start background processing
    // @ts-ignore - EdgeRuntime is available in Supabase Edge Functions
    (globalThis as any).EdgeRuntime?.waitUntil?.(processVideos()) ?? processVideos();

    return new Response(
      JSON.stringify({
        success: true,
        batchId: batchJob.id,
        totalVideos: videoIds.length,
        message: `Processing ${videoIds.length} videos in the background`,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    logStep("Error", { error: errorMessage });
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
