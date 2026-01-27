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

    // Supadata (text=true)
    if (typeof data.transcript === "string") return { transcript: data.transcript, title };

    // Transcript arrays
    const asText = (arr: any[]) => arr.map((i) => i?.text ?? i?.snippet ?? "").join(" ");
    if (Array.isArray(data.transcript)) return { transcript: asText(data.transcript), title };
    if (Array.isArray(data.segments)) return { transcript: asText(data.segments), title };
    if (Array.isArray(data)) return { transcript: asText(data), title };

    // Some APIs return { content: [...] }
    if (Array.isArray(data.content)) return { transcript: asText(data.content), title };

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
    const videoIdMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/);
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
      // Supadata YouTube Transcripts API
      {
        name: "supadata_youtube_transcripts",
        host: "youtube-transcript.p.rapidapi.com",
        url: `https://youtube-transcript.p.rapidapi.com/youtube/transcript?url=${encodeURIComponent(url)}&text=true`,
        parse: extractTranscriptText,
      },
      // Some accounts subscribe to a similarly named RapidAPI API; try host alias as fallback.
      {
        name: "youtube_transcriptor_alias",
        host: "youtube-transcriptor.p.rapidapi.com",
        url: `https://youtube-transcriptor.p.rapidapi.com/youtube/transcript?url=${encodeURIComponent(url)}&text=true`,
        parse: extractTranscriptText,
      },
      // Older fallback API
      {
        name: "youtube_transcript3",
        host: "youtube-transcript3.p.rapidapi.com",
        url: `https://youtube-transcript3.p.rapidapi.com/transcript?videoId=${encodeURIComponent(videoId)}`,
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
