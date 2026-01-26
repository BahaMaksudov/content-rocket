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

    // Fetch video page to get title
    const videoPageResponse = await fetch(`https://www.youtube.com/watch?v=${videoId}`);
    const videoPageHtml = await videoPageResponse.text();
    
    // Extract title from meta tag or title tag
    const titleMatch = videoPageHtml.match(/<title>([^<]+)<\/title>/);
    let videoTitle = titleMatch ? titleMatch[1].replace(" - YouTube", "").trim() : "Untitled Video";

    // Try to get captions using the timedtext API
    // First, we need to get the caption track list
    const captionListUrl = `https://www.youtube.com/api/timedtext?type=list&v=${videoId}`;
    const captionListResponse = await fetch(captionListUrl);
    const captionListXml = await captionListResponse.text();

    console.log("Caption list response:", captionListXml.substring(0, 500));

    // Check if there are any caption tracks
    if (!captionListXml.includes("track")) {
      // Try alternative method - fetch from the video page itself
      const captionMatch = videoPageHtml.match(/"captionTracks":(\[.*?\])/);
      
      if (captionMatch) {
        try {
          const captionTracks = JSON.parse(captionMatch[1]);
          if (captionTracks.length > 0) {
            // Get the first available caption track (prefer English)
            const englishTrack = captionTracks.find((t: any) => 
              t.languageCode === "en" || t.languageCode?.startsWith("en")
            ) || captionTracks[0];
            
            if (englishTrack?.baseUrl) {
              const captionResponse = await fetch(englishTrack.baseUrl);
              const captionXml = await captionResponse.text();
              
              // Parse the caption XML and extract text
              const textMatches = captionXml.matchAll(/<text[^>]*>([^<]*)<\/text>/g);
              const texts: string[] = [];
              for (const match of textMatches) {
                const decodedText = match[1]
                  .replace(/&amp;/g, "&")
                  .replace(/&lt;/g, "<")
                  .replace(/&gt;/g, ">")
                  .replace(/&quot;/g, '"')
                  .replace(/&#39;/g, "'")
                  .replace(/\n/g, " ")
                  .trim();
                if (decodedText) {
                  texts.push(decodedText);
                }
              }
              
              if (texts.length > 0) {
                const transcript = texts.join(" ");
                console.log("Successfully extracted transcript, length:", transcript.length);
                
                return new Response(
                  JSON.stringify({ transcript, title: videoTitle }),
                  { headers: { ...corsHeaders, "Content-Type": "application/json" } }
                );
              }
            }
          }
        } catch (e) {
          console.error("Error parsing caption tracks:", e);
        }
      }

      return new Response(
        JSON.stringify({ error: "No captions available for this video", transcript: null }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse caption track from XML
    const langMatch = captionListXml.match(/lang_code="([^"]+)"/);
    const langCode = langMatch ? langMatch[1] : "en";
    
    // Fetch the actual captions
    const captionUrl = `https://www.youtube.com/api/timedtext?v=${videoId}&lang=${langCode}`;
    const captionResponse = await fetch(captionUrl);
    const captionXml = await captionResponse.text();

    // Parse the caption XML and extract text
    const textMatches = captionXml.matchAll(/<text[^>]*>([^<]*)<\/text>/g);
    const texts: string[] = [];
    for (const match of textMatches) {
      const decodedText = match[1]
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/\n/g, " ")
        .trim();
      if (decodedText) {
        texts.push(decodedText);
      }
    }

    if (texts.length === 0) {
      return new Response(
        JSON.stringify({ error: "Could not extract transcript", transcript: null }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const transcript = texts.join(" ");
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
