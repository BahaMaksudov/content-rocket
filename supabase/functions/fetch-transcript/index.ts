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

    const providers: Array<{
      name: string;
      host: string;
      url: string;
      parse: (data: any) => { transcript: string; title?: string };
    }> = [
      // Supadata YouTube Transcripts API (with 's')
      // RapidAPI playground commonly includes both url + videoId; include both for compatibility.
      {
        name: "youtube_transcripts_supadata",
        host: "youtube-transcripts.p.rapidapi.com",
        url: `https://youtube-transcripts.p.rapidapi.com/youtube/transcript?url=${encodeURIComponent(url)}&videoId=${encodeURIComponent(videoId)}&text=true&lang=en`,
        parse: extractTranscriptText,
      },

      // youtube-transcriptor.p.rapidapi.com (try common parameter conventions; avoid guessing endpoints like /get)
      {
        name: "youtube_transcriptor_videoId",
        host: "youtube-transcriptor.p.rapidapi.com",
        url: `https://youtube-transcriptor.p.rapidapi.com/transcript?videoId=${encodeURIComponent(videoId)}&lang=en`,
        parse: extractTranscriptText,
      },
      {
        name: "youtube_transcriptor_url",
        host: "youtube-transcriptor.p.rapidapi.com",
        url: `https://youtube-transcriptor.p.rapidapi.com/transcript?url=${encodeURIComponent(url)}&lang=en`,
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
        console.error(`${p.name} error:`, resp.status, errorText);

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

        // 403 often means subscription missing; try next provider.
        // 429 means rate limit; try next provider as well.
        continue;
      }

      const data = await resp.json();
      console.log(`${p.name} response received`);
      // Log a small preview to understand provider payload shapes (avoid logging full transcripts)
      try {
        console.log(`${p.name} response preview:`, JSON.stringify(data).slice(0, 500));
      } catch {
        // ignore
      }

      const extracted = p.parse(data);
      transcript = extracted.transcript;
      if (extracted.title) videoTitle = extracted.title;

      transcript = transcript
        .replace(/\[.*?\]/g, "")
        .replace(/\s+/g, " ")
        .trim();

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
        raw: JSON.stringify(data).slice(0, 5000),
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

    return json({
      error: "No captions available for this video",
      transcript: null,
      title: "YouTube Video",
      details: lastError
        ? `Provider ${lastError.provider} returned ${lastError.status}: ${String(lastError.message).slice(0, 160)}`
        : "No transcript returned",
    });

  } catch (error) {
    console.error("Error fetching transcript:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return json({ error: "Failed to fetch transcript", details: errorMessage }, { status: 500 });
  }
});
