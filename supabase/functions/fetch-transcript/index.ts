import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { url } = await req.json();
    
    if (!url) {
      return new Response(
        JSON.stringify({ error: "URL is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Fetching transcript for:", url);

    // Extract video ID from YouTube URL
    const videoIdMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/);
    if (!videoIdMatch) {
      return new Response(
        JSON.stringify({ error: "Invalid YouTube URL" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const videoId = videoIdMatch[1];
    console.log("Video ID:", videoId);

    const rapidApiKey = Deno.env.get("RAPIDAPI_KEY");
    if (!rapidApiKey) {
      console.error("RAPIDAPI_KEY not configured");
      return new Response(
        JSON.stringify({ error: "API key not configured. Please add your RapidAPI key." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Use Supadata YouTube Transcripts API (most reliable, free tier available)
    // API: https://rapidapi.com/8v2FWW4H6AmKw89/api/youtube-transcripts
    const transcriptUrl = `https://youtube-transcript.p.rapidapi.com/youtube/transcript?url=${encodeURIComponent(url)}&text=true`;
    
    console.log("Calling Supadata YouTube Transcript API...");
    
    const transcriptResponse = await fetch(transcriptUrl, {
      method: "GET",
      headers: {
        "X-RapidAPI-Key": rapidApiKey,
        "X-RapidAPI-Host": "youtube-transcript.p.rapidapi.com",
      },
    });

    if (!transcriptResponse.ok) {
      const errorText = await transcriptResponse.text();
      console.error("Supadata Transcript API error:", transcriptResponse.status, errorText);
      
      // Return helpful error message
      return new Response(
        JSON.stringify({ 
          error: "No captions available for this video", 
          transcript: null,
          title: "YouTube Video",
          details: `API returned ${transcriptResponse.status}`
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await transcriptResponse.json();
    console.log("Supadata API response received, type:", typeof data);

    // Parse the response - Supadata returns { title, transcript } when text=true
    let transcript = "";
    let videoTitle = "YouTube Video";

    if (data.title) {
      videoTitle = data.title;
    }

    if (typeof data.transcript === "string") {
      transcript = data.transcript;
    } else if (Array.isArray(data.transcript)) {
      transcript = data.transcript.map((item: any) => item.text || "").join(" ");
    } else if (typeof data === "string") {
      transcript = data;
    } else if (data.content) {
      transcript = typeof data.content === "string" 
        ? data.content 
        : JSON.stringify(data.content);
    }

    // Clean up transcript
    transcript = transcript
      .replace(/\[.*?\]/g, "") // Remove [Music], [Applause], etc.
      .replace(/\s+/g, " ")
      .trim();

    if (!transcript) {
      console.log("Could not extract transcript from response:", JSON.stringify(data).substring(0, 200));
      return new Response(
        JSON.stringify({ 
          error: "No captions available for this video", 
          transcript: null,
          title: videoTitle 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Successfully extracted transcript, length:", transcript.length, "title:", videoTitle);

    return new Response(
      JSON.stringify({ transcript, title: videoTitle }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error fetching transcript:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: "Failed to fetch transcript", details: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
