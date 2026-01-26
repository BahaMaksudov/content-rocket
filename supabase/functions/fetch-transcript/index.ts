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

    // Fetch video details first to get the title
    const videoDetailsUrl = `https://youtube-v31.p.rapidapi.com/videos?part=snippet&id=${videoId}`;
    const videoDetailsResponse = await fetch(videoDetailsUrl, {
      method: "GET",
      headers: {
        "X-RapidAPI-Key": rapidApiKey,
        "X-RapidAPI-Host": "youtube-v31.p.rapidapi.com",
      },
    });

    let videoTitle = "Untitled Video";
    if (videoDetailsResponse.ok) {
      const videoData = await videoDetailsResponse.json();
      if (videoData.items && videoData.items.length > 0) {
        videoTitle = videoData.items[0].snippet?.title || "Untitled Video";
      }
    }

    console.log("Video title:", videoTitle);

    // Fetch transcript using RapidAPI YouTube Transcript API
    const transcriptUrl = `https://youtube-transcriptor.p.rapidapi.com/transcript?video_id=${videoId}&lang=en`;
    const transcriptResponse = await fetch(transcriptUrl, {
      method: "GET",
      headers: {
        "X-RapidAPI-Key": rapidApiKey,
        "X-RapidAPI-Host": "youtube-transcriptor.p.rapidapi.com",
      },
    });

    if (!transcriptResponse.ok) {
      const errorText = await transcriptResponse.text();
      console.error("Transcript API error:", transcriptResponse.status, errorText);
      
      // Try alternative transcript API
      const altTranscriptUrl = `https://youtube-transcript3.p.rapidapi.com/api/transcript?videoId=${videoId}`;
      const altTranscriptResponse = await fetch(altTranscriptUrl, {
        method: "GET",
        headers: {
          "X-RapidAPI-Key": rapidApiKey,
          "X-RapidAPI-Host": "youtube-transcript3.p.rapidapi.com",
        },
      });

      if (!altTranscriptResponse.ok) {
        const altErrorText = await altTranscriptResponse.text();
        console.error("Alternative transcript API error:", altTranscriptResponse.status, altErrorText);
        return new Response(
          JSON.stringify({ 
            error: "No captions available for this video", 
            transcript: null,
            title: videoTitle 
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const altData = await altTranscriptResponse.json();
      console.log("Alternative API response received");

      // Parse alternative API response
      let transcript = "";
      if (Array.isArray(altData)) {
        transcript = altData.map((item: any) => item.text || item.content || "").join(" ");
      } else if (altData.transcript) {
        transcript = Array.isArray(altData.transcript) 
          ? altData.transcript.map((item: any) => item.text || "").join(" ")
          : altData.transcript;
      } else if (typeof altData === "string") {
        transcript = altData;
      }

      if (!transcript) {
        return new Response(
          JSON.stringify({ 
            error: "Could not extract transcript", 
            transcript: null,
            title: videoTitle 
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      console.log("Successfully extracted transcript, length:", transcript.length);
      return new Response(
        JSON.stringify({ transcript, title: videoTitle }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await transcriptResponse.json();
    console.log("Transcript API response received");

    // Parse transcript response - handle various response formats
    let transcript = "";
    
    if (Array.isArray(data)) {
      // Format: [{ text: "...", start: 0, duration: 1.5 }, ...]
      transcript = data.map((item: any) => {
        if (typeof item === "string") return item;
        return item.text || item.content || item.subtitle || "";
      }).filter(Boolean).join(" ");
    } else if (data.transcription) {
      // Format: { transcription: [{ text: "..." }, ...] }
      transcript = Array.isArray(data.transcription)
        ? data.transcription.map((item: any) => item.text || "").join(" ")
        : data.transcription;
    } else if (data.transcript) {
      // Format: { transcript: "..." } or { transcript: [...] }
      transcript = Array.isArray(data.transcript)
        ? data.transcript.map((item: any) => item.text || "").join(" ")
        : data.transcript;
    } else if (data.subtitles) {
      // Format: { subtitles: [...] }
      transcript = Array.isArray(data.subtitles)
        ? data.subtitles.map((item: any) => item.text || "").join(" ")
        : data.subtitles;
    } else if (typeof data === "string") {
      transcript = data;
    }

    // Clean up transcript
    transcript = transcript
      .replace(/\[.*?\]/g, "") // Remove [Music], [Applause], etc.
      .replace(/\s+/g, " ")
      .trim();

    if (!transcript) {
      return new Response(
        JSON.stringify({ 
          error: "Could not extract transcript from response", 
          transcript: null,
          title: videoTitle 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Successfully extracted transcript, length:", transcript.length);

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
