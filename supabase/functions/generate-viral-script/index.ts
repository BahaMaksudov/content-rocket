import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

console.log("generate-viral-script function loaded");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function extractAndParseJSON(content: string): any {
  let jsonStr = content.trim();
  if (jsonStr.startsWith("```")) {
    jsonStr = jsonStr.replace(/^```(?:json)?\s*\n?/, "");
    jsonStr = jsonStr.replace(/\n?```\s*$/, "");
  }
  if (jsonStr.includes("```")) {
    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) jsonStr = jsonMatch[1].trim();
  }
  try { return JSON.parse(jsonStr); } catch {}
  jsonStr = jsonStr.replace(/,(\s*[}\]])/g, '$1');
  const firstBrace = jsonStr.indexOf('{');
  const lastBrace = jsonStr.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    jsonStr = jsonStr.substring(firstBrace, lastBrace + 1);
  }
  return JSON.parse(jsonStr);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { topic, duration = "30s", tone = "hype" } = await req.json();

    if (!topic || topic.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: "Topic is required" }),
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

    const durationGuides: Record<string, string> = {
      "15s": "The user has selected a 15-SECOND duration. This is a 'One-Tip Wonder' or 'Quick Hack' format. The SCRIPT must be strictly 40-50 words. Keep it ultra-punchy — one core idea, no fluff. Only 1 hook option needed.",
      "30s": "The user has selected a 30-SECOND duration. This is a 'Problem/Solution' format with moderate detail. The SCRIPT must be strictly 80-90 words. Use the Problem-Agitate-Solution framework.",
      "60s": "The user has selected a 60-SECOND duration. This is a 'Storytelling' or 'Top 3 List' format. The SCRIPT must be strictly 160-180 words. Use the Hero's Journey or a ranked list structure.",
    };

    const durationInstruction = durationGuides[duration] || durationGuides["30s"];

    const toneGuides: Record<string, string> = {
      "hype": "TONE: 🔥 HYPE — High energy and LOUD. Use ALL CAPS for emphasis on key words. Short, punchy sentences. Exclamation points! The script should feel like the creator is FIRED UP and shouting at the camera. Suggest visual effects like Fast Cuts, Shake Effects, Bass Drops, and Flash Transitions.",
      "educational": "TONE: 🧠 EDUCATIONAL — Authoritative and clear. Use phrases like 'Did you know…', 'Here's the breakdown', 'Let me explain.' Focus on clarity, credibility, and delivering value. The voice should feel like a trusted expert. Suggest visual effects like Clean Text Pops, Diagrams, Step-by-step Annotations, and Smooth Transitions.",
      "funny": "TONE: 🤣 FUNNY — Witty and relatable. Incorporate self-deprecating humor, exaggeration, or relatable 'POV' scenarios. Use comedic timing with pauses and punchlines. The script should make someone smile or laugh out loud. Suggest visual effects like Meme Overlays, Reaction Cuts, Sound Effects (Record Scratch, Sad Trombone), and Zoom-ins on facial expressions.",
      "mysterious": "TONE: 🤫 MYSTERIOUS — Curiosity-gap and quiet energy. Start with a whisper-style hook. Use pauses (…) to build tension. The script should feel like you're revealing a secret. Keep the energy low but gripping. Suggest visual effects like Slow Zooms, Dark Overlays, Eerie Sound Effects, Vignette Filters, and Cinematic Letterboxing.",
    };

    const toneInstruction = toneGuides[tone] || toneGuides["hype"];

    const systemPrompt = `You are an expert Viral Content Strategist for TikTok, Instagram Reels, and YouTube Shorts. Your goal is to turn a simple topic into a high-retention video script.

DURATION CONSTRAINT (CRITICAL):
${durationInstruction}
You must strictly adhere to the word count limits for this duration to ensure the script fits the timeframe when spoken at a fast, energetic pace.

TONE & VOICE (CRITICAL):
${toneInstruction}
- Avoid corporate jargon.
- The tone MUST permeate every section: the hooks, the script body, the visual/effect ideas, AND the captions.

You must return the response as valid JSON with exactly these four keys:

{
  "hook": "Provide 3 hook options for the first 3 seconds, separated by line breaks. Use 'Internal Cliffhangers' (e.g., 'Nobody is talking about...', 'I found a secret...', 'Stop doing [X] if you want [Y]'). Each hook should stop the scroll using curiosity gaps, bold claims, or pattern interrupts.",
  "script": "A fast-paced, high-energy spoken script for a 30-60 second video. Use short sentences. Remove ALL fluff. Focus on 'Value per Second.' Write it exactly as someone would SAY it on camera — conversational, energetic, with natural pauses. No stage directions. Just the spoken words.",
  "visualIdeas": "For every ~5 seconds of the script, suggest a specific visual cue. Format each on its own line. Examples: [Text Pop], [Fast Zoom], [Stock Footage of X], [Sound Effect: Whoosh], [B-roll: typing on laptop], [Transition: Jump Cut]. Be specific and actionable.",
  "captions": "A catchy headline (1 sentence) followed by 5-8 trending hashtags. Mix trending and niche hashtags."
}

RULES:
- Write for Gen Z / millennial audiences
- Use power words, emotional triggers, and urgency
- The hooks MUST create curiosity gaps or pattern interrupts
- The script should feel like a real person talking, NOT corporate
- Visual ideas must be specific and timed to the script
- Return ONLY valid JSON, no markdown fences`;

    const userPrompt = `Generate a viral video script about this topic: "${topic}"`;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.9,
        max_tokens: 2500,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("OpenAI error:", response.status, errorText);

      if (response.status === 429 || response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI_CREDITS_EXHAUSTED", code: "AI_CREDITS_EXHAUSTED" }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ error: "AI generation failed" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const raw = data.choices?.[0]?.message?.content;
    if (!raw) throw new Error("Empty AI response");

    const parsed = extractAndParseJSON(raw);

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("generate-viral-script error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
