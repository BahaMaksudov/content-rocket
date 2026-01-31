import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const json = (body: unknown, init?: ResponseInit) =>
    new Response(JSON.stringify(body), {
      ...init,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
        ...(init?.headers ?? {}),
      },
    });

  const tryParseJson = (text: string) => {
    try {
      return JSON.parse(text);
    } catch {
      return null;
    }
  };

  const extractTranscriptText = (data: any): { transcript: string; title?: string } => {
    if (!data) return { transcript: "" };

    // Common fields
    const title = typeof data.title === "string" ? data.title : undefined;

    // Transcript arrays helper (must be defined before use)
    const asText = (arr: any[]) => arr.map((i) => i?.text ?? i?.snippet ?? "").join(" ");

    // Supadata (text=true)
    if (typeof data.transcript === "string") return { transcript: data.transcript, title };

    // Some APIs nest the transcript object
    if (data.transcript && typeof data.transcript === "object") {
      if (typeof data.transcript.text === "string") return { transcript: data.transcript.text, title };
      if (Array.isArray(data.transcript.segments)) return { transcript: asText(data.transcript.segments), title };
      if (Array.isArray(data.transcript.content)) return { transcript: asText(data.transcript.content), title };
    }

    // Transcript arrays
    if (Array.isArray(data.transcript)) return { transcript: asText(data.transcript), title };
    if (Array.isArray(data.segments)) return { transcript: asText(data.segments), title };
    if (Array.isArray(data)) return { transcript: asText(data), title };

    // Some APIs return { content: "..." } or { content: [...] }
    if (typeof data.content === "string") return { transcript: data.content, title };
    if (Array.isArray(data.content)) return { transcript: asText(data.content), title };

    // Some return { transcripts: [...] }
    if (Array.isArray(data.transcripts)) return { transcript: asText(data.transcripts), title };

    // Some return { text: "..." }
    if (typeof data.text === "string") return { transcript: data.text, title };

    // Fallback
    if (typeof data === "string") return { transcript: data, title };
    return { transcript: "", title };
  };

  // Advertisement detection keywords (case-insensitive patterns)
  const AD_PATTERNS = [
    /apple\s*watch/i,
    /iphone\s*\d*/i,
    /learn\s*more\s*at\s*apple\.com/i,
    /sponsored\s*(by|content)?/i,
    /this\s*(video|content)\s*is\s*sponsored/i,
    /brought\s*to\s*you\s*by/i,
    /available\s*at\s*apple\.com/i,
    /order\s*now\s*at/i,
    /get\s*yours\s*(today|now)\s*at/i,
    /limited\s*time\s*offer/i,
    /subscribe\s*and\s*save/i,
    /use\s*code\s*[A-Z0-9]+\s*(for|to\s*get)/i,
    /promo\s*code/i,
  ];

  const detectAdvertisement = (text: string): { isAd: boolean; matchedPattern?: string } => {
    if (!text || text.length < 50) return { isAd: false };
    
    // Count how many ad patterns match
    let matchCount = 0;
    let matchedPattern: string | undefined;
    
    for (const pattern of AD_PATTERNS) {
      if (pattern.test(text)) {
        matchCount++;
        if (!matchedPattern) {
          matchedPattern = text.match(pattern)?.[0];
        }
      }
    }
    
    // Consider it an ad if:
    // 1. Multiple ad patterns match, OR
    // 2. The transcript is very short AND contains ad keywords
    const isShortAndSuspicious = text.length < 500 && matchCount >= 1;
    const hasMultipleAdPatterns = matchCount >= 2;
    
    return { 
      isAd: isShortAndSuspicious || hasMultipleAdPatterns,
      matchedPattern 
    };
  };

  try {
    const { url } = await req.json();
    
    if (!url) return json({ error: "URL is required" }, { status: 400 });

    console.log("Fetching transcript for:", url);

    // Extract video ID from YouTube URL
    const videoIdMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/live\/)([a-zA-Z0-9_-]{11})/);
    if (!videoIdMatch) {
      return json({ error: "Invalid YouTube URL" }, { status: 400 });
    }

    const videoId = videoIdMatch[1];
    console.log("Video ID:", videoId);

    const rapidApiKey = Deno.env.get("RAPIDAPI_KEY");
    if (!rapidApiKey) {
      console.error("RAPIDAPI_KEY not configured");
      return json({ error: "API key not configured. Please add your RapidAPI key." }, { status: 500 });
    }

    // Provider priority: youtube-transcripts.p.rapidapi.com has more quota remaining (47%)
    // so it should be tried FIRST before youtube-transcriptor which is at 100% usage
    const providers: Array<{
      name: string;
      host: string;
      url: string;
      parse: (data: any) => { transcript: string; title?: string };
    }> = [
      // PRIMARY: Supadata YouTube Transcripts API - has remaining quota
      {
        name: "youtube_transcripts_supadata",
        host: "youtube-transcripts.p.rapidapi.com",
        url: `https://youtube-transcripts.p.rapidapi.com/youtube/transcript?url=${encodeURIComponent(url)}&videoId=${encodeURIComponent(videoId)}&text=true&lang=en`,
        parse: extractTranscriptText,
      },

      // FALLBACK: youtube-transcriptor.p.rapidapi.com - at capacity but try as backup
      // Using updated parameters per RapidAPI docs
      {
        name: "youtube_transcriptor_videoId",
        host: "youtube-transcriptor.p.rapidapi.com",
        url: `https://youtube-transcriptor.p.rapidapi.com/transcript?video_id=${encodeURIComponent(videoId)}&lang=en`,
        parse: extractTranscriptText,
      },
      {
        name: "youtube_transcriptor_video_url",
        host: "youtube-transcriptor.p.rapidapi.com",
        url: `https://youtube-transcriptor.p.rapidapi.com/transcript?video_url=${encodeURIComponent(url)}&lang=en`,
        parse: extractTranscriptText,
      },
    ];

    let lastError:
      | { status: number; message: string; raw?: string; provider?: string; host?: string }
      | null = null;

    let transcript = "";
    let videoTitle = "YouTube Video";

    for (const p of providers) {
      console.log(`Calling RapidAPI transcript provider: ${p.name} (${p.host})`);

      const resp = await fetch(p.url, {
        method: "GET",
        headers: {
          "X-RapidAPI-Key": rapidApiKey,
          "X-RapidAPI-Host": p.host,
        },
      });

      if (!resp.ok) {
        const errorText = await resp.text();
        // Log quietly for debugging - don't expose to users
        console.warn(`[${p.name}] HTTP ${resp.status} - trying next provider`);

        const parsed = tryParseJson(errorText);
        const gatewayMessage =
          (parsed && typeof parsed.message === "string" && parsed.message) || errorText;

        lastError = {
          status: resp.status,
          message: gatewayMessage,
          raw: errorText,
          provider: p.name,
          host: p.host,
        };

        // 403 = subscription missing, 429 = rate limit - both should try next provider
        continue;
      }

      const data = await resp.json();
      console.log(`[${p.name}] Response received successfully`);

      const extracted = p.parse(data);
      transcript = extracted.transcript;
      if (extracted.title) videoTitle = extracted.title;

      transcript = transcript
        .replace(/\[.*?\]/g, "")
        .replace(/\s+/g, " ")
        .trim();

      // Validation: transcript must be at least 100 characters to be considered valid
      if (transcript && transcript.length < 100) {
        console.log(`${p.name} returned too short transcript (${transcript.length} chars), trying next provider`);
        lastError = {
          status: 200,
          message: "Transcript too short - likely a failed fetch",
          raw: transcript,
          provider: p.name,
          host: p.host,
        };
        continue;
      }

      // Advertisement detection
      const adCheck = detectAdvertisement(transcript);
      if (adCheck.isAd) {
        console.log(`${p.name} returned advertisement content: "${adCheck.matchedPattern}", trying next provider`);
        lastError = {
          status: 200,
          message: `Advertisement detected: "${adCheck.matchedPattern}"`,
          raw: transcript.slice(0, 500),
          provider: p.name,
          host: p.host,
        };
        continue;
      }

      if (transcript) {
        console.log(
          "Successfully extracted transcript, length:",
          transcript.length,
          "title:",
          videoTitle,
          "provider:",
          p.name
        );
        return json({ transcript, title: videoTitle, provider: p.name });
      }

      // If the provider returns 200 but no usable transcript, record it as the last error so
      // the UI doesn't show a misleading earlier 404 from a different provider.
      lastError = {
        status: 200,
        message: "Provider returned no transcript",
        raw: "Empty response",
        provider: p.name,
        host: p.host,
      };
    }

    const notSubscribed =
      lastError?.status === 403 &&
      typeof lastError?.message === "string" &&
      lastError.message.toLowerCase().includes("not subscribed");

    if (notSubscribed) {
      return json({
        error: "RapidAPI subscription missing",
        transcript: null,
        title: "YouTube Video",
        details: `Your RapidAPI key is not subscribed to the transcript API (last: ${lastError?.host}). Please subscribe to that API in RapidAPI, or tell me which transcript API you subscribed to so I can align the host.`,
      });
    }

    // Check if the last error was an advertisement detection
    const isAdDetection = lastError?.message?.startsWith("Advertisement detected");
    if (isAdDetection) {
      return json({
        error: "Advertisement detected",
        errorCode: "AD_DETECTED",
        transcript: null,
        title: "YouTube Video",
        details: "We detected an advertisement instead of the video transcript. Please try again or paste the transcript manually.",
      });
    }

    // All providers failed - return user-friendly message
    return json({
      error: "Service at capacity",
      errorCode: "ALL_PROVIDERS_FAILED",
      transcript: null,
      title: "YouTube Video",
      details: "Our automated service is at capacity. Please use the Manual Paste option below to continue!",
    });

  } catch (error) {
    console.error("Unexpected error in fetch-transcript:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return json({ 
      error: "Service temporarily unavailable", 
      errorCode: "UNEXPECTED_ERROR",
      details: "Our automated service is at capacity. Please use the Manual Paste option below to continue!" 
    }, { status: 500 });
  }
});
