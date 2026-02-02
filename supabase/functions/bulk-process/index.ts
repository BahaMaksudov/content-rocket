import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@4.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const MAX_URLS_PER_BATCH = 10;

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

// Send completion email notification
async function sendBatchCompletionEmail(
  userEmail: string,
  userName: string | null,
  batchId: string,
  totalVideos: number,
  completedCount: number,
  failedCount: number
) {
  const resendApiKey = Deno.env.get("RESEND_API_KEY");
  if (!resendApiKey) {
    logStep("Resend API key not configured, skipping email notification");
    return;
  }

  const resend = new Resend(resendApiKey);

  const successRate = Math.round((completedCount / totalVideos) * 100);
  const greeting = userName ? `Hi ${userName.split(" ")[0]}` : "Hi there";

  try {
    await resend.emails.send({
      from: "Rocket Content Pro <notifications@rocketcontentpro.io>",
      to: [userEmail],
      subject: `🚀 Your bulk processing is complete! (${completedCount}/${totalVideos} videos)`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #6366f1; margin: 0;">🚀 Rocket Content Pro</h1>
          </div>
          
          <div style="background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); border-radius: 12px; padding: 30px; color: white; text-align: center; margin-bottom: 30px;">
            <h2 style="margin: 0 0 10px 0; font-size: 24px;">${greeting}!</h2>
            <p style="margin: 0; font-size: 16px; opacity: 0.9;">Your bulk processing batch is complete.</p>
          </div>
          
          <div style="background: #f8fafc; border-radius: 12px; padding: 25px; margin-bottom: 25px;">
            <h3 style="margin: 0 0 20px 0; color: #1e293b;">📊 Batch Summary</h3>
            
            <div style="display: flex; justify-content: space-between; margin-bottom: 15px;">
              <div style="text-align: center; flex: 1;">
                <div style="font-size: 32px; font-weight: bold; color: #6366f1;">${totalVideos}</div>
                <div style="font-size: 14px; color: #64748b;">Total Videos</div>
              </div>
              <div style="text-align: center; flex: 1;">
                <div style="font-size: 32px; font-weight: bold; color: #22c55e;">${completedCount}</div>
                <div style="font-size: 14px; color: #64748b;">Completed</div>
              </div>
              ${failedCount > 0 ? `
              <div style="text-align: center; flex: 1;">
                <div style="font-size: 32px; font-weight: bold; color: #ef4444;">${failedCount}</div>
                <div style="font-size: 14px; color: #64748b;">Failed</div>
              </div>
              ` : ''}
            </div>
            
            <div style="background: #e2e8f0; border-radius: 8px; height: 8px; overflow: hidden;">
              <div style="background: linear-gradient(90deg, #22c55e 0%, #6366f1 100%); height: 100%; width: ${successRate}%;"></div>
            </div>
            <p style="text-align: center; margin: 10px 0 0 0; font-size: 14px; color: #64748b;">${successRate}% success rate</p>
          </div>
          
          <div style="text-align: center; margin-bottom: 30px;">
            <a href="https://rocketcontentpro.io/history" style="display: inline-block; background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: white; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: 600; font-size: 16px;">View Your Generated Content</a>
          </div>
          
          ${failedCount > 0 ? `
          <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 15px; margin-bottom: 25px;">
            <p style="margin: 0; color: #991b1b; font-size: 14px;">
              <strong>Note:</strong> ${failedCount} video(s) failed to process. This usually happens when captions are disabled or unavailable. You can try these videos individually with manual transcript input.
            </p>
          </div>
          ` : ''}
          
          <div style="text-align: center; padding-top: 20px; border-top: 1px solid #e2e8f0;">
            <p style="margin: 0; font-size: 14px; color: #64748b;">
              Happy creating! 🎉<br>
              The Rocket Content Pro Team
            </p>
          </div>
        </body>
        </html>
      `,
    });
    
    logStep("Batch completion email sent", { userEmail, batchId });
  } catch (error: any) {
    logStep("Failed to send completion email", { error: error.message });
  }
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

    // Admin client for database operations
    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // OPTIMIZED: Single subscription check at the beginning with try/catch
    let isAgencyUser = false;
    try {
      logStep("Starting subscription check");
      
      const { data: subscription, error: subError } = await adminClient
        .from("subscriptions")
        .select("status")
        .eq("user_id", user.id)
        .single();

      if (subError) {
        logStep("Subscription query failed", { error: subError.message });
        return new Response(
          JSON.stringify({ 
            error: "subscription_check_failed", 
            message: "Failed to verify subscription status. Please try again." 
          }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      logStep("Subscription check result", { status: subscription?.status });
      isAgencyUser = subscription?.status === "agency";
      
    } catch (subCheckError: any) {
      logStep("Subscription check exception", { error: subCheckError.message });
      return new Response(
        JSON.stringify({ 
          error: "subscription_check_failed", 
          message: "Subscription verification failed. Please refresh and try again." 
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!isAgencyUser) {
      logStep("User is not Agency tier", { userId: user.id });
      return new Response(
        JSON.stringify({ 
          error: "agency_required", 
          message: "Bulk processing is only available for Agency subscribers" 
        }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    logStep("Agency subscription verified - proceeding with batch");

    // Get user profile for email notification
    const { data: profile } = await adminClient
      .from("profiles")
      .select("email, full_name")
      .eq("user_id", user.id)
      .single();

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

    // Enforce strict 10 URL limit per batch
    if (videoIds.length > MAX_URLS_PER_BATCH) {
      return new Response(
        JSON.stringify({ 
          error: "batch_limit_exceeded", 
          message: `Maximum ${MAX_URLS_PER_BATCH} videos allowed per batch. You provided ${videoIds.length} videos.` 
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    logStep("Videos to process", { count: videoIds.length, videoIds });

    // Get user's organization if any
    const { data: membership } = await adminClient
      .from("organization_members")
      .select("organization_id")
      .eq("user_id", user.id)
      .maybeSingle();

    // Create batch job record with individual video statuses
    const videoUrls = videoIds.map(id => ({
      videoId: id,
      url: `https://youtube.com/watch?v=${id}`,
      status: "pending",
      title: null,
      error: null,
      generationId: null,
    }));

    const { data: batchJob, error: batchError } = await adminClient
      .from("batch_jobs")
      .insert({
        user_id: user.id,
        organization_id: membership?.organization_id || null,
        status: "processing",
        total_videos: videoIds.length,
        video_urls: videoUrls,
        results: [],
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

        // Update status to "processing" for current video
        videoUrls[i].status = "processing";
        await adminClient
          .from("batch_jobs")
          .update({ video_urls: videoUrls })
          .eq("id", batchJob.id);

        try {
          // Build the YouTube URL from the video ID
          const youtubeUrl = `https://www.youtube.com/watch?v=${videoId}`;
          logStep(`Fetching transcript for video ${videoId}`, { url: youtubeUrl });

          // Fetch transcript - NOTE: fetch-transcript expects { url: "..." } not { videoId: "..." }
          const transcriptResponse = await fetch(
            `${Deno.env.get("SUPABASE_URL")}/functions/v1/fetch-transcript`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: authHeader,
              },
              body: JSON.stringify({ url: youtubeUrl }),
            }
          );

          const transcriptData = await transcriptResponse.json();
          logStep(`Transcript response for ${videoId}`, { 
            ok: transcriptResponse.ok, 
            hasTranscript: !!transcriptData.transcript,
            transcriptLength: transcriptData.transcript?.length || 0,
            error: transcriptData.error || null
          });

          if (!transcriptResponse.ok || transcriptData.error) {
            throw new Error(transcriptData.error || transcriptData.message || transcriptData.details || "Failed to fetch transcript");
          }

          if (!transcriptData.transcript || transcriptData.transcript.length < 100) {
            throw new Error("No valid transcript available for this video. Captions may be disabled.");
          }

          logStep(`Generating content for ${videoId}`, { transcriptLength: transcriptData.transcript.length });

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
                videoTitle: transcriptData.title || null,
                tone: tone || "professional",
                audience: audience || "general",
                brandVoice: brandVoice || null,
                translateTo: translateTo || null,
              }),
            }
          );

          const contentData = await contentResponse.json();
          logStep(`Content generation response for ${videoId}`, { 
            ok: contentResponse.ok, 
            error: contentData.error || null 
          });

          if (!contentResponse.ok || contentData.error) {
            throw new Error(contentData.error || contentData.message || "Failed to generate content");
          }

          // Save to generations table and get the generation ID
          const { data: generation, error: genError } = await adminClient
            .from("generations")
            .insert({
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
            })
            .select("id")
            .single();

          if (genError) {
            logStep("Failed to save generation", { error: genError.message });
          }

          // Update video status to completed
          videoUrls[i].status = "completed";
          videoUrls[i].title = transcriptData.title || videoId;
          videoUrls[i].generationId = generation?.id || null;

          results.push({
            videoId,
            status: "completed",
            title: transcriptData.title || videoId,
            generationId: generation?.id || null,
          });

          completed++;
          logStep(`Video ${videoId} completed successfully`, { title: transcriptData.title });

        } catch (error: any) {
          logStep(`Failed to process video ${videoId}`, { error: error.message });
          
          // Update video status to failed but CONTINUE processing others
          videoUrls[i].status = "failed";
          videoUrls[i].error = error.message;

          results.push({
            videoId,
            status: "failed",
            error: error.message,
          });

          failed++;
        }

        // Update batch job progress after each video
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
      const finalStatus = failed === videoIds.length ? "failed" : "completed";
      await adminClient
        .from("batch_jobs")
        .update({
          status: finalStatus,
          completed_at: new Date().toISOString(),
        })
        .eq("id", batchJob.id);

      logStep("Batch processing completed", { completed, failed, status: finalStatus });

      // Send email notification
      if (profile?.email) {
        await sendBatchCompletionEmail(
          profile.email,
          profile.full_name,
          batchJob.id,
          videoIds.length,
          completed,
          failed
        );
      }
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
