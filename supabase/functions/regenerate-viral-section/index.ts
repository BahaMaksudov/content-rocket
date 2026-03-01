import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

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

    console.log(`[regenerate-viral-section] user=${userId} tier=${tier}`);

    // --- Tier gate: regeneration requires pro+ ---
    if (tierLevel < 2) {
      console.log(`[regenerate-viral-section] Regeneration blocked for tier=${tier}`);
      return new Response(
        JSON.stringify({ error: "PLAN_UPGRADE_REQUIRED", message: "Section regeneration requires a Pro or Agency plan." }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { section, topic, tone, platform, duration, currentResult } = await req.json();

    if (!section || !topic || !currentResult) {
      return new Response(
        JSON.stringify({ error: "section, topic, and currentResult are required" }),
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

    let systemPrompt = "";
    let outputSchema = "";

    const contextBlock = `
TOPIC: "${topic}"
TONE: ${tone}
PLATFORM: ${platform}
DURATION: ${duration}`;

    if (section === "hooks") {
      outputSchema = `Return ONLY valid JSON: { "hooks": [{ "id": 1, "text": "...", "style": "..." }, ...] } with 3-5 hooks.`;
      systemPrompt = `You are a Viral Hook Specialist. Rewrite ONLY the hooks for this video.
${contextBlock}

EXISTING SCENES (for context — your new hooks must match this content):
${JSON.stringify(currentResult.scenes)}

EXISTING CAPTIONS: ${currentResult.socialCaption}

RULES:
- Generate 3-5 completely NEW hook options with DIFFERENT angles than the previous set.
- If the previous hooks were question-based, try controversial/bold-claim/pattern-interrupt styles instead.
- Each hook must have "id" (number), "text" (the hook script), and "style" (a short label).
- Write for Gen Z / millennial audiences. Use power words and emotional triggers.
- ${outputSchema}`;
    } else if (section === "scenes") {
      const timings = currentResult.scenes.map((s: any) => s.time);
      outputSchema = `Return ONLY valid JSON: { "scenes": [{ "time": "...", "script": "...", "visual": "..." }, ...] }`;
      systemPrompt = `You are a Viral Script Director. Rewrite ONLY the scene dialogue and visual cues for this video.
${contextBlock}

TIMING STRUCTURE (keep these EXACT time ranges): ${JSON.stringify(timings)}

EXISTING HOOKS (for context — your new scenes must match these):
${JSON.stringify(currentResult.hooks)}

RULES:
- Keep the EXACT same timing structure: ${timings.join(", ")}
- Rewrite the dialogue for MORE impact, better pacing, and stronger delivery.
- Provide fresh, specific visual cues that match the new dialogue.
- The total word count must fit the ${duration} duration.
- Write for Gen Z / millennial audiences.
- ${outputSchema}`;
    } else if (section === "captions") {
      outputSchema = `Return ONLY valid JSON: { "overlays": ["...", "..."], "socialCaption": "...", "hashtags": ["#...", "#..."] }`;
      systemPrompt = `You are a Social Media Caption Specialist. Rewrite ONLY the overlays, caption, and hashtags for this video.
${contextBlock}

EXISTING SCRIPT (for context — your captions must match this content):
${JSON.stringify(currentResult.scenes)}
${JSON.stringify(currentResult.hooks)}

RULES:
- Generate 2-4 punchy on-screen text overlays (1-3 words each, uppercase energy).
- Write one catchy social caption sentence.
- Generate 5-8 hashtags mixing trending and niche tags appropriate for ${platform}.
- ${outputSchema}`;
    } else {
      return new Response(
        JSON.stringify({ error: "Invalid section. Must be 'hooks', 'scenes', or 'captions'." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

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
          { role: "user", content: `Regenerate the ${section} section now.` },
        ],
        temperature: 0.95,
        max_tokens: 2000,
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
    console.error("regenerate-viral-section error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
