import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// Valid voice IDs that are allowed
const VALID_VOICE_IDS = [
  // Pro voices
  "TX3LPaxmHKxFdv7VOQHJ", // Liam - Tech Visionary
  "cgSgspJ2msm6clMCkdW9", // Jessica - Viral Storyteller
  "JBFqnCBsd6RMkjVDRZzb", // George - Sage Advisor
  "nPczCjzI2devNBz1zQrb", // Brian - Growth Coach
  "EXAVITQu4vr4xnSDxMaL", // Sarah - Friendly Guide
  // Agency-only voices
  "onwK4e9ZLuTAKqWW03F9", // Daniel - Executive Leader
  "pqHfZKP75CvOlQylNhV4", // Bill - Documentary Narrator
  "iP95p4xoKVk53GoZ742B", // Chris - Podcast Host
];

// Agency-only voice IDs
const AGENCY_ONLY_VOICE_IDS = [
  "onwK4e9ZLuTAKqWW03F9",
  "pqHfZKP75CvOlQylNhV4",
  "iP95p4xoKVk53GoZ742B",
];

// Monthly audio character limits per tier (1,000 chars ≈ 1 minute)
const AUDIO_CHAR_LIMITS: Record<string, number> = {
  free: 1_000,       // 1 min
  starter: 10_000,   // 10 mins
  pro: 30_000,       // 30 mins
  agency: 300_000,   // 5 hours
};

/**
 * Returns standard voice settings for ElevenLabs multilingual v2.
 */
function getVoiceSettings() {
  return {
    stability: 0.5,
    similarity_boost: 0.75,
    style: 0.0,
    use_speaker_boost: true,
  };
}

/**
 * For non-English languages, strip stray ASCII-only words that would cause
 * the model to fall back to an English accent.
 */
function cleanForTargetLanguage(text: string, targetLanguage: string | null): string {
  const lang = (targetLanguage || "english").toLowerCase();
  if (lang === "english") return text;

  const englishFillers = /\b(um|uh|like|you know|I mean|basically|actually|literally|right|okay|so yeah|check it out|let's go|hey guys|what's up|subscribe|smash that)\b/gi;
  let cleaned = text.replace(englishFillers, '');
  cleaned = cleaned.replace(/https?:\/\/\S+/g, '');
  cleaned = cleaned.replace(/\s+/g, ' ').trim();
  return cleaned;
}

/**
 * Normalize whitespace and preserve punctuation for natural breathing pauses.
 */
function normalizeText(text: string): string {
  return text
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Sanitize input text for TTS: remove timestamps, speaker labels, tags, JSON artifacts.
 */
function sanitizeForTTS(rawText: string): string {
  let text = rawText
    .replace(/\[\d{1,2}:\d{2}(?:-\d{1,2}:\d{2})?\]/g, '')
    .replace(/\b\d{1,2}:\d{2}\b/g, '')
    .replace(/\b(?:Speaker\s*[A-Z0-9]+|Host|Guest\s*\d*|Narrator|Speaker\s*\d+):\s*/gi, '')
    .replace(/\[(HOOK|INTRO|SETUP|MAIN|CTA|OUTRO|CONCLUSION)\]/gi, '')
    .replace(/#\w+/g, '')
    .replace(/[{}"]/g, '')
    .replace(/\b(text|snippet|content|transcript|duration|offset|start|end):\s*/gi, '')
    .replace(/\s+/g, ' ')
    .trim();

  text = text
    .replace(/\[(smiling|winks?|gestures?|nods?|looks?|points?|leans?|walks?|waves?|shrugs?|raises?|tilts?|crosses?|stands?|sits?|turns?|faces?|stares?|glances?|blinks?|frowns?|grins?|beams?|sneers?|pouts?|rolls eyes?|eye roll|thumbs up|thumbs down|air quotes?|finger guns?|claps?|applauds?|dances?|jumps?|spins?|bows?|curtsies?|salutes?|flexes?|gestures wildly|chuckles?|laughs|sighs|gasps|giggles|whispering|excitedly)(\s+\w+)*\]/gi, '')
    .replace(/\[chuckles?\]/gi, '[giggle]')
    .replace(/\[laughs\]/gi, '[laugh]')
    .replace(/\[sighs\]/gi, '[sigh]')
    .replace(/\[gasps\]/gi, '[gasp]')
    .replace(/\[giggles\]/gi, '[giggle]')
    .replace(/\[whispering\]/gi, '[whisper]')
    .replace(/\[excitedly?\]/gi, '[excited]')
    .replace(/\s+/g, ' ')
    .trim();

  return text;
}

/**
 * Strip ALL bracketed tags from text so the model doesn't read them aloud.
 */
function stripAllTags(text: string): string {
  return text.replace(/\[.*?\]/g, '').replace(/\s+/g, ' ').trim();
}

/**
 * Flatten incoming text from various formats into a plain string.
 */
function flattenText(text: unknown): string {
  if (Array.isArray(text)) {
    return text
      .map((item: unknown) => {
        if (typeof item === 'string') return item;
        if (item && typeof item === 'object') {
          const obj = item as Record<string, unknown>;
          return obj.text || obj.snippet || obj.content || obj.transcript || '';
        }
        return '';
      })
      .filter(Boolean)
      .join(' ');
  }
  if (typeof text === 'string') return text;
  if (text && typeof text === 'object') {
    const obj = text as Record<string, unknown>;
    return String(obj.text || obj.snippet || obj.content || obj.transcript || '');
  }
  return '';
}

/**
 * Check if the month needs resetting and return current usage.
 */
function monthKey(dateIso: string) {
  const d = new Date(dateIso);
  return `${d.getFullYear()}-${d.getMonth()}`;
}

/**
 * Attempt a TTS call to ElevenLabs with a given model and settings.
 */
async function tryGenerateAudio(
  apiKey: string,
  voiceId: string,
  text: string,
  modelId: string,
  voiceSettings: Record<string, unknown> | null,
): Promise<{ audio: ArrayBuffer | null; status: number; error: string }> {
  const requestBody: Record<string, unknown> = {
    text,
    model_id: modelId,
  };
  if (voiceSettings) {
    requestBody.voice_settings = voiceSettings;
  }

  try {
    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`,
      {
        method: "POST",
        headers: {
          "xi-api-key": apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      }
    );

    if (response.ok) {
      const audio = await response.arrayBuffer();
      return { audio, status: 200, error: "" };
    }

    const errorText = await response.text();
    console.error(`ElevenLabs ${modelId} error: ${response.status} - ${errorText}`);
    return { audio: null, status: response.status, error: errorText };
  } catch (fetchError) {
    const msg = fetchError instanceof Error ? fetchError.message : "Unknown fetch error";
    console.error(`Fetch error with ${modelId}:`, msg);
    return { audio: null, status: 500, error: msg };
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const ELEVENLABS_API_KEY = Deno.env.get("ELEVENLABS_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!ELEVENLABS_API_KEY) {
      console.error("ELEVENLABS_API_KEY is not configured");
      return new Response(
        JSON.stringify({ error: "ElevenLabs API key not configured", code: "MISSING_API_KEY" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
      console.error("Supabase configuration missing");
      return new Response(
        JSON.stringify({ error: "Server configuration error", code: "MISSING_SUPABASE_CONFIG" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // --- Authentication ---
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Authorization header required", code: "AUTH_MISSING" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseAuth = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } }
    });
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser(token);

    if (authError || !user) {
      console.error("Auth error:", authError);
      return new Response(
        JSON.stringify({ error: "Invalid or expired token", code: "AUTH_INVALID" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = user.id;
    console.log(`User ${userId} requesting audio generation`);

    // --- Subscription check ---
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { data: subscription, error: subError } = await supabaseAdmin
      .from("subscriptions")
      .select("status")
      .eq("user_id", userId)
      .single();

    if (subError) {
      console.error("Error fetching subscription:", subError);
      return new Response(
        JSON.stringify({ error: "Failed to verify subscription", code: "SUBSCRIPTION_CHECK_FAILED" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const status = subscription?.status || "free";
    let tier: "free" | "starter" | "pro" | "agency" = "free";
    if (status === "agency" || status === "active_agency") tier = "agency";
    else if (status === "pro" || status === "active" || status === "active_pro") tier = "pro";
    else if (status === "starter" || status === "active_starter") tier = "starter";

    if (tier === "free") {
      return new Response(
        JSON.stringify({ error: "Voice generation requires a paid plan. Upgrade to get started!", code: "SUBSCRIPTION_REQUIRED" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // --- Parse & validate request body ---
    const { text, voiceId, performancePrompt, targetLanguage } = await req.json();

    // --- Language restriction: English only ---
    const lang = (targetLanguage || "english").toLowerCase();
    if (lang !== "english") {
      return new Response(
        JSON.stringify({
          error: "Voice generation is currently only available for English",
          code: "LANGUAGE_NOT_SUPPORTED",
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const processedText = flattenText(text);
    if (!processedText || processedText.trim().length === 0) {
      console.error("Empty text received", { text, processedTextLength: processedText?.length });
      return new Response(
        JSON.stringify({ error: "No text content to convert. Please generate a script first.", code: "EMPTY_TEXT" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!voiceId) {
      console.error("Missing voiceId in request body");
      return new Response(
        JSON.stringify({ error: "Missing required field: voiceId", code: "MISSING_VOICE_ID" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!VALID_VOICE_IDS.includes(voiceId)) {
      console.error(`Invalid voice ID: ${voiceId}`);
      return new Response(
        JSON.stringify({ error: "Invalid voice selection", code: "INVALID_VOICE_ID", receivedVoiceId: voiceId }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (AGENCY_ONLY_VOICE_IDS.includes(voiceId) && tier !== "agency") {
      return new Response(
        JSON.stringify({ error: "This voice is only available to Agency users", code: "AGENCY_REQUIRED" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Generating audio - voice: ${voiceId}, tier: ${tier}, language: ${lang}, textLength: ${processedText.length}`);

    // --- Text sanitization ---
    const sanitizedText = sanitizeForTTS(processedText);
    const speakableCore = stripAllTags(sanitizedText).replace(/^\.\.\.s*/, '').trim();

    if (!speakableCore) {
      console.error("No speakable text after sanitization", { originalLength: processedText.length });
      return new Response(
        JSON.stringify({ error: "No speakable text found after cleaning.", code: "NO_SPEAKABLE_TEXT" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Clean any stray non-printable / control characters
    const cleanedCore = speakableCore
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
      .replace(/\uFEFF/g, '')
      .trim();

    const languageCleaned = cleanForTargetLanguage(cleanedCore, targetLanguage);
    const normalized = normalizeText(languageCleaned);
    const cleanText = `... ${normalized}`;
    const charCount = cleanText.length;
    console.log(`Final text length: ${charCount} characters`);

    // --- Audio character limit check ---
    const charLimit = AUDIO_CHAR_LIMITS[tier] || AUDIO_CHAR_LIMITS.free;

    // Fetch current audio usage from profile
    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("audio_chars_used, audio_chars_last_reset")
      .eq("user_id", userId)
      .single();

    if (profileError) {
      console.error("Error fetching profile for audio usage:", profileError);
      return new Response(
        JSON.stringify({ error: "Failed to check audio usage", code: "PROFILE_FETCH_FAILED" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let currentUsed = profile?.audio_chars_used ?? 0;
    const lastReset = profile?.audio_chars_last_reset;
    const nowIso = new Date().toISOString();

    // Monthly reset check
    if (!lastReset || monthKey(lastReset) !== monthKey(nowIso)) {
      console.log(`Monthly audio reset for user ${userId}`);
      currentUsed = 0;
      await supabaseAdmin
        .from("profiles")
        .update({ audio_chars_used: 0, audio_chars_last_reset: nowIso })
        .eq("user_id", userId);
    }

    // Check if this request would exceed the limit
    if (currentUsed + charCount > charLimit) {
      const remainingChars = Math.max(0, charLimit - currentUsed);
      const remainingMins = (remainingChars / 1000).toFixed(1);
      console.log(`Audio limit exceeded for user ${userId}: used=${currentUsed}, request=${charCount}, limit=${charLimit}`);
      return new Response(
        JSON.stringify({
          error: "Monthly audio limit reached. Upgrade your plan for more minutes.",
          code: "AUDIO_LIMIT_EXCEEDED",
          details: {
            used: currentUsed,
            limit: charLimit,
            remaining_chars: remainingChars,
            remaining_minutes: remainingMins,
            requested_chars: charCount,
          },
        }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // --- Voice settings (consistent English output) ---
    const voiceSettings = getVoiceSettings();

    // -----------------------------------------------------------
    // DEBUG: Log the exact payload being sent to ElevenLabs
    // -----------------------------------------------------------
    const debugPayload = {
      model_id: "eleven_multilingual_v2",
      voice_id: voiceId,
      voice_settings: voiceSettings,
      text_length: charCount,
      text_preview: cleanText.substring(0, 120) + (charCount > 120 ? "..." : ""),
      audio_chars_used: currentUsed,
      audio_char_limit: charLimit,
    };
    console.log(`[ElevenLabs Payload] ${JSON.stringify(debugPayload, null, 2)}`);

    // -----------------------------------------------------------
    // Single model: eleven_multilingual_v2 (proven, reliable)
    // -----------------------------------------------------------
    console.log(`Generating with eleven_multilingual_v2`);
    const result = await tryGenerateAudio(
      ELEVENLABS_API_KEY,
      voiceId,
      cleanText,
      "eleven_multilingual_v2",
      voiceSettings,
    );

    if (result.audio) {
      console.log(`Audio generated: ${result.audio.byteLength} bytes`);

      // Increment audio character usage
      const newUsed = currentUsed + charCount;
      const { error: updateError } = await supabaseAdmin
        .from("profiles")
        .update({ audio_chars_used: newUsed })
        .eq("user_id", userId);

      if (updateError) {
        console.error("Failed to update audio usage (non-fatal):", updateError);
      } else {
        console.log(`Audio usage updated: ${currentUsed} → ${newUsed} / ${charLimit}`);
      }

      return new Response(result.audio, {
        headers: { ...corsHeaders, "Content-Type": "audio/mpeg" },
      });
    }

    // Auth error — bail with specific message
    if (result.status === 401) {
      return new Response(
        JSON.stringify({
          error: "ElevenLabs API key is invalid or lacks permission. Please check your API key.",
          code: "ELEVENLABS_AUTH_FAILED",
          details: result.error,
        }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Generation failed
    console.error("Audio generation failed", {
      status: result.status,
      error: result.error,
      textLength: charCount,
    });

    return new Response(
      JSON.stringify({
        error: "Failed to generate audio. Please try again.",
        code: "GENERATION_FAILED",
        details: {
          status: result.status,
          error: result.error,
        },
      }),
      { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in generate-audio function:", error);
    const message = error instanceof Error ? error.message : "Unknown error";

    if (message.includes("JSON")) {
      return new Response(
        JSON.stringify({
          error: "Invalid request body. Could not parse JSON payload.",
          code: "INVALID_JSON",
          message,
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        error: "Internal server error in audio generation",
        code: "INTERNAL_ERROR",
        message,
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
