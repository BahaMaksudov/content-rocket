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
    const { topic, duration = "30s", tone = "hype", voiceMode = false } = await req.json();

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
      "15s": "The user has selected a 15-SECOND duration. This is a 'One-Tip Wonder' or 'Quick Hack' format. The SCRIPT must be strictly 40-50 words total across all scenes. Keep it ultra-punchy — one core idea, no fluff. Generate 2-3 scenes and 3 hook options.",
      "30s": "The user has selected a 30-SECOND duration. This is a 'Problem/Solution' format with moderate detail. The SCRIPT must be strictly 80-90 words total across all scenes. Use the Problem-Agitate-Solution framework. Generate 3-4 scenes and 4 hook options.",
      "60s": "The user has selected a 60-SECOND duration. This is a 'Storytelling' or 'Top 3 List' format. The SCRIPT must be strictly 160-180 words total across all scenes. Use the Hero's Journey or a ranked list structure. Generate 5-7 scenes and 5 hook options.",
    };

    const durationInstruction = durationGuides[duration] || durationGuides["30s"];

    const toneGuides: Record<string, string> = {
      "hype": "TONE: 🔥 HYPE — High energy and LOUD. Use ALL CAPS for emphasis on key words. Short, punchy sentences. Exclamation points! The script should feel like the creator is FIRED UP and shouting at the camera. Suggest visual effects like Fast Cuts, Shake Effects, Bass Drops, and Flash Transitions.",
      "educational": "TONE: 🧠 EDUCATIONAL — Authoritative and clear. Use phrases like 'Did you know…', 'Here's the breakdown', 'Let me explain.' Focus on clarity, credibility, and delivering value. The voice should feel like a trusted expert. Suggest visual effects like Clean Text Pops, Diagrams, Step-by-step Annotations, and Smooth Transitions.",
      "funny": "TONE: 🤣 FUNNY — Witty and relatable. Incorporate self-deprecating humor, exaggeration, or relatable 'POV' scenarios. Use comedic timing with pauses and punchlines. The script should make someone smile or laugh out loud. Suggest visual effects like Meme Overlays, Reaction Cuts, Sound Effects (Record Scratch, Sad Trombone), and Zoom-ins on facial expressions.",
      "mysterious": "TONE: 🤫 MYSTERIOUS — Curiosity-gap and quiet energy. Start with a whisper-style hook. Use pauses (…) to build tension. The script should feel like you're revealing a secret. Keep the energy low but gripping. Suggest visual effects like Slow Zooms, Dark Overlays, Eerie Sound Effects, Vignette Filters, and Cinematic Letterboxing.",
    };

    const toneInstruction = toneGuides[tone] || toneGuides["hype"];

    const voiceModeInstruction = voiceMode
      ? `\n\nVOICE-OPTIMIZED MODE (ACTIVE):
The user has enabled Voice-Optimized Mode for AI text-to-speech generation (e.g., ElevenLabs). You MUST apply ALL of the following rules to EVERY scene's "script" field:

1. PACING & BREATH:
   - Insert "..." (ellipses) or "[pause]" between ideas for natural breathing transitions.
   - Keep every sentence to a maximum of 10–12 words. Break longer thoughts into two sentences.

2. PHONETIC CLARITY:
   - For complex technical terms, brand names, or acronyms, provide the phonetic spelling in brackets the FIRST time it appears. Example: "VidLogic [Vid-Loj-Ik]".
   - Spell out all numbers (e.g., "three" not "3") and acronyms (e.g., "artificial intelligence" not "AI").

3. EMPHASIS & TONE:
   - Wrap words the AI voice should stress in *italics* (e.g., "This is *everything* you need.").
   - Use Sentence Case only — NEVER use All Caps for any word in the script. TTS engines spell out capitalized words letter-by-letter.

4. CONTRACTIONS (MANDATORY):
   - Always use contractions: "don't" not "do not", "you're" not "you are", "it's" not "it is", "can't" not "cannot", "won't" not "will not".
   - This makes the script sound natural and conversational, not robotic.

5. THE HOOK PUNCH:
   - The first 5 words of every hook and the first scene's script MUST be punchy, single-syllable words spoken fast. Example: "Stop. Look. This. Changes. All."
   - Avoid multi-syllable words in the opening line.

6. GENERAL:
   - Avoid tongue twisters, complex compound words, or ambiguous pronunciations.
   - Write exactly as someone would *say* it — conversational, warm, human.
   - Example scene script: "Here's the thing... [pause] most people *don't* know this. But it's so simple. [pause] Let me show you."`
      : "";

    const systemPrompt = `You are an expert Viral Content Strategist for TikTok, Instagram Reels, and YouTube Shorts. Your goal is to turn a simple topic into a high-retention video script.

DURATION CONSTRAINT (CRITICAL):
${durationInstruction}
You must strictly adhere to the word count limits for this duration to ensure the script fits the timeframe when spoken at a fast, energetic pace.

TONE & VOICE (CRITICAL):
${toneInstruction}
- Avoid corporate jargon.
- The tone MUST permeate every section: the hooks, the scene scripts, the visual/effect ideas, AND the captions.
${voiceModeInstruction}

You must return the response as valid JSON with exactly these keys:

{
  "hooks": [
    { "id": 1, "text": "Hook text here", "style": "Curiosity Gap" }
  ],
  "scenes": [
    { "time": "0:00–0:03", "script": "The spoken dialogue for this scene segment", "visual": "Specific visual/effect cue for this segment" }
  ],
  "overlays": ["INSANE RESULTS", "GAME CHANGER", "WATCH THIS"],
  "socialCaption": "A catchy caption sentence here",
  "hashtags": ["#trending", "#viral", "#fyp"]
}

FIELD DETAILS:
- "hooks": An array of 3-5 distinct hook options. Each must have an "id" (number), "text" (the hook script), and "style" (a short label like "Curiosity Gap", "Bold Claim", "Pattern Interrupt", "Contrarian Take", "Social Proof").
- "scenes": A scene-by-scene breakdown of the video. Each scene has "time" (timestamp range), "script" (the spoken dialogue for that segment), and "visual" (the specific visual cue, effect, or B-roll for that segment). The total dialogue across all scenes must match the duration word count.
- "overlays": An array of 2-4 punchy 1-3 word on-screen text overlays for video editors.
- "socialCaption": A single catchy caption sentence for posting.
- "hashtags": An array of 5-8 hashtags mixing trending and niche tags.

RULES:
- Write for Gen Z / millennial audiences
- Use power words, emotional triggers, and urgency
- The hooks MUST create curiosity gaps or pattern interrupts
- The script should feel like a real person talking, NOT corporate
- Visual cues must be specific, actionable, and timed to each scene
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
        max_tokens: 3000,
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
