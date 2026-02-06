import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // --- Auth ---
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = claimsData.claims.sub;
    console.log("analyze-voice called by user:", userId);

    // --- Parse body ---
    const { samples, voiceName } = await req.json();

    if (!samples || !Array.isArray(samples) || samples.length < 3 || samples.length > 5) {
      return new Response(
        JSON.stringify({ error: "Please provide between 3 and 5 writing samples." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate each sample has reasonable length
    for (let i = 0; i < samples.length; i++) {
      const sample = samples[i]?.trim();
      if (!sample || sample.length < 50) {
        return new Response(
          JSON.stringify({ error: `Sample ${i + 1} is too short. Each sample should be at least 50 characters.` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (sample.length > 5000) {
        return new Response(
          JSON.stringify({ error: `Sample ${i + 1} is too long. Max 5,000 characters per sample.` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    if (!voiceName || typeof voiceName !== "string" || voiceName.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: "Voice name is required." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // --- Call OpenAI to analyze the writing samples ---
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_API_KEY) {
      console.error("OPENAI_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: "AI service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const numberedSamples = samples
      .map((s: string, i: number) => `--- Sample ${i + 1} ---\n${s.trim()}\n`)
      .join("\n");

    const analysisPrompt = `You are an expert writing analyst and brand voice consultant. Analyze the following ${samples.length} writing samples from the same author and create a concise "Style Profile" that captures their unique voice.

Analyze these dimensions:
1. **Tone**: Is it formal, casual, witty, authoritative, warm, edgy?
2. **Sentence Structure**: Are sentences short and punchy, long and flowing, or mixed? Do they use fragments?
3. **Vocabulary Level**: Simple, technical, conversational, academic?
4. **Emoji & Formatting**: Do they use emojis? Bullet points? Line breaks for emphasis?
5. **Rhetorical Devices**: Questions, exclamations, analogies, storytelling, data-driven?
6. **Personality Markers**: Catchphrases, humor style, how they address the reader?

${numberedSamples}

Now write a single, concise paragraph (4-6 sentences) that describes this author's writing style so precisely that an AI content generator could replicate it. Start with "Write in a..." or "Adopt a...". Be specific and actionable — avoid vague terms like "engaging" without qualifying how.

Also extract:
- A one-word tone label (e.g., "conversational", "authoritative", "playful")
- 3-5 key phrases or patterns the author frequently uses
- The primary target audience this style appeals to

Return ONLY valid JSON in this format:
{
  "styleProfile": "The full style description paragraph",
  "tone": "one-word tone label",
  "keyPhrases": ["phrase1", "phrase2", "phrase3"],
  "targetAudience": "description of target audience"
}`;

    console.log("Calling OpenAI for voice analysis...");

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "user", content: analysisPrompt },
        ],
        temperature: 0.5,
        max_tokens: 1000,
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("OpenAI API error:", response.status, errorText);

      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ error: "AI analysis failed. Please try again." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiData = await response.json();
    const content = aiData.choices?.[0]?.message?.content;

    if (!content) {
      console.error("No content in AI response");
      return new Response(
        JSON.stringify({ error: "No analysis generated" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("AI analysis result:", content.substring(0, 200));

    let analysisResult;
    try {
      analysisResult = JSON.parse(content);
    } catch (parseErr) {
      console.error("Failed to parse AI response:", parseErr);
      return new Response(
        JSON.stringify({ error: "Failed to parse analysis. Please try again." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // --- Save to brand_voices table ---
    const { data: savedVoice, error: insertError } = await supabase
      .from("brand_voices")
      .insert({
        user_id: userId,
        name: voiceName.trim(),
        description: `AI-trained voice from ${samples.length} writing samples`,
        writing_style: analysisResult.styleProfile,
        tone: analysisResult.tone,
        key_phrases: analysisResult.keyPhrases || [],
        target_audience: analysisResult.targetAudience,
      })
      .select()
      .single();

    if (insertError) {
      console.error("DB insert error:", insertError);
      return new Response(
        JSON.stringify({ error: "Failed to save voice profile. " + insertError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Voice profile saved:", savedVoice.id);

    return new Response(
      JSON.stringify({
        voice: savedVoice,
        analysis: analysisResult,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("analyze-voice error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
