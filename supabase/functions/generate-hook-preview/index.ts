import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { youtubeUrl } = await req.json();
    if (!youtubeUrl || typeof youtubeUrl !== "string" || youtubeUrl.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: "YouTube URL is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Basic YouTube URL validation
    const urlPattern = /(?:youtube\.com\/(?:watch\?v=|shorts\/)|youtu\.be\/)([\w-]+)/;
    if (!urlPattern.test(youtubeUrl)) {
      return new Response(
        JSON.stringify({ error: "Please enter a valid YouTube URL" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const apiKey = Deno.env.get("OPENAI_API_KEY");
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "AI service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Extract video ID for context
    const match = youtubeUrl.match(urlPattern);
    const videoId = match ? match[1] : "unknown";

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `You are a viral content hook expert. Given a YouTube video URL, generate 3 compelling, scroll-stopping hooks that could be used to create viral short-form content from this video. Each hook should be a different style: one "Curiosity Gap", one "Bold Claim", and one "Pattern Interrupt". Return ONLY valid JSON: { "hooks": [{ "text": "...", "style": "..." }], "videoContext": "brief 1-sentence guess about the video topic based on the URL" }. Keep hooks under 15 words each. Make them punchy and Gen Z/millennial friendly.`
          },
          {
            role: "user",
            content: `Generate viral hooks for this YouTube video: ${youtubeUrl}`
          }
        ],
        temperature: 0.9,
        max_tokens: 500,
      }),
    });

    if (!response.ok) {
      console.error("OpenAI error:", response.status);
      return new Response(
        JSON.stringify({ error: "AI generation failed" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const raw = data.choices?.[0]?.message?.content;
    if (!raw) throw new Error("Empty AI response");

    let parsed;
    try {
      let jsonStr = raw.trim();
      if (jsonStr.startsWith("```")) {
        jsonStr = jsonStr.replace(/^```(?:json)?\s*\n?/, "").replace(/\n?```\s*$/, "");
      }
      parsed = JSON.parse(jsonStr);
    } catch {
      // Fallback extraction
      const firstBrace = raw.indexOf('{');
      const lastBrace = raw.lastIndexOf('}');
      if (firstBrace !== -1 && lastBrace > firstBrace) {
        parsed = JSON.parse(raw.substring(firstBrace, lastBrace + 1));
      } else {
        throw new Error("Failed to parse AI response");
      }
    }

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("generate-hook-preview error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
