import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

console.log("generate-viral-script function loaded");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Tier definitions matching the frontend
const TIER_PRIORITY: Record<string, number> = { agency: 3, pro: 2, starter: 1, free: 0 };

async function getUserTier(supabase: any, userId: string): Promise<string> {
  const { data } = await supabase
    .from("subscriptions")
    .select("status")
    .eq("user_id", userId)
    .maybeSingle();
  return data?.status || "free";
}

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
    // --- Auth check ---
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError || !userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = userData.user.id;
    const tier = await getUserTier(supabase, userId);
    const tierLevel = TIER_PRIORITY[tier] ?? 0;

    console.log(`[generate-viral-script] user=${userId} tier=${tier}`);

    const { topic, duration = "30s", tone = "hype", platform = "tiktok", voiceMode = false } = await req.json();

    if (!topic || topic.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: "Topic is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // All features (tone, platform, voice mode) are now available to all tiers
    const allowedVoiceMode = voiceMode;
    const allowedTone = tone;
    const allowedPlatform = platform;

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

    const toneInstruction = toneGuides[allowedTone] || toneGuides["hype"];

    const platformGuides: Record<string, string> = {
      "tiktok": `PLATFORM: TikTok
Strategy: High-speed, high-tension content optimized for the For You Page.
- Start with a massive "Pattern Interrupt" hook that stops the scroll instantly.
- Use "You" and "We" frequently to create a direct, personal connection.
- Include TikTok-specific visual cues: [Green Screen], [Quick Cut], [Reaction], [Duet Setup], [Stitch Hook].
- Pacing should feel rapid-fire with jump cuts implied in the scene transitions.
- Hashtags MUST include TikTok-native tags: #foryou, #fyp, #foryoupage, #tiktok, plus 3-4 niche tags.`,
      "youtube-shorts": `PLATFORM: YouTube Shorts
Strategy: Curiosity and Storytelling optimized for YouTube's algorithm.
- Focus on the "Curiosity Gap" — hooks MUST promise a payoff at the end (e.g., "Wait for the result...", "Watch till the end").
- Use a mini story arc even in short durations: Setup → Tension → Payoff.
- Visual cues should suggest [Text Overlays], [B-Roll Transition], [Subscribe Animation], [End Screen CTA].
- Include a subtle call-to-action for subscribing or watching a longer video.
- Hashtags MUST include YouTube-native tags: #shorts, #youtubeshorts, #subscribe, plus 3-4 niche tags.`,
      "instagram-reels": `PLATFORM: Instagram Reels
Strategy: Aesthetic and Direct, optimized for Instagram's visual-first audience.
- Keep the language cleaner, more polished, and professional.
- Focus on "Value-First" delivery — lead with the benefit, not the problem.
- Visual cues should suggest [High-Quality B-Roll], [Smooth Transitions], [Aesthetic Color Grading], [Cinematic Slow-Mo].
- The overall vibe should feel curated and visually aspirational.
- Hashtags MUST include Instagram-native tags: #reels, #reelsinstagram, #instareels, #explore, plus 3-4 niche tags.`,
    };

    const platformInstruction = platformGuides[allowedPlatform] || platformGuides["tiktok"];

    const voiceModeInstruction = allowedVoiceMode
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

PLATFORM OPTIMIZATION (CRITICAL):
${platformInstruction}
- The platform context MUST influence the visual cues, hashtags, and overall script style.
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
  } catch (error: unknown) {
    console.error("generate-viral-script error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
