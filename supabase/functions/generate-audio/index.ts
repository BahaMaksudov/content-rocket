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

// Language → ElevenLabs language_code mapping (BCP-47 / ISO 639-1)
const LANGUAGE_CODE_MAP: Record<string, string> = {
  uzbek: "uz",
  hindi: "hi",
  mandarin: "zh",
  russian: "ru",
  spanish: "es",
  english: "en",
  french: "fr",
  german: "de",
  portuguese: "pt",
  japanese: "ja",
  korean: "ko",
};

/**
 * Returns language-specific voice settings for ElevenLabs multilingual model.
 * Uzbek gets extra-low stability + higher similarity boost for authentic vowel sounds.
 * Other non-Latin languages use slightly lower stability for native inflections.
 */
function getVoiceSettingsForLanguage(targetLanguage: string | null) {
  const lang = (targetLanguage || "english").toLowerCase();

  // Uzbek-specific tuning: lower stability for Central Asian vowel patterns
  if (lang === "uzbek") {
    return {
      stability: 0.35,
      similarity_boost: 0.80,
      style: 0.6,
      use_speaker_boost: true,
    };
  }

  // Other non-Latin languages benefit from lower stability
  if (["hindi", "mandarin", "russian"].includes(lang)) {
    return {
      stability: 0.4,
      similarity_boost: 0.75,
      style: 0.6,
      use_speaker_boost: true,
    };
  }

  // English, Spanish, and any other language get standard professional delivery
  return {
    stability: 0.5,
    similarity_boost: 0.75,
    style: 0.5,
    use_speaker_boost: true,
  };
}

/**
 * Returns the ElevenLabs language_code for the given target language, or null.
 */
function getLanguageCode(targetLanguage: string | null): string | null {
  const lang = (targetLanguage || "").toLowerCase();
  return LANGUAGE_CODE_MAP[lang] || null;
}

/**
 * For non-English languages, strip stray ASCII-only words that would cause
 * the model to fall back to an English accent. Keeps Uzbek Latin (which uses
 * ASCII) by only removing isolated common English filler words.
 */
function cleanForTargetLanguage(text: string, targetLanguage: string | null): string {
  const lang = (targetLanguage || "english").toLowerCase();
  if (lang === "english") return text;

  // Remove common English filler / placeholder words that leak into translated scripts
  const englishFillers = /\b(um|uh|like|you know|I mean|basically|actually|literally|right|okay|so yeah|check it out|let's go|hey guys|what's up|subscribe|smash that)\b/gi;
  let cleaned = text.replace(englishFillers, '');

  // Remove URLs (always English)
  cleaned = cleaned.replace(/https?:\/\/\S+/g, '');

  // Clean up resulting whitespace
  cleaned = cleaned.replace(/\s+/g, ' ').trim();

  return cleaned;
}

/**
 * Sanitize input text for TTS: remove timestamps, speaker labels, tags, JSON artifacts.
 */
function sanitizeForTTS(rawText: string): string {
  let text = rawText
    // Remove timestamps like [0:00], [00:00], [0:00-0:03], etc.
    .replace(/\[\d{1,2}:\d{2}(?:-\d{1,2}:\d{2})?\]/g, '')
    // Remove timestamps without brackets
    .replace(/\b\d{1,2}:\d{2}\b/g, '')
    // Remove speaker labels
    .replace(/\b(?:Speaker\s*[A-Z0-9]+|Host|Guest\s*\d*|Narrator|Speaker\s*\d+):\s*/gi, '')
    // Remove section markers
    .replace(/\[(HOOK|INTRO|SETUP|MAIN|CTA|OUTRO|CONCLUSION)\]/gi, '')
    // Remove hashtags
    .replace(/#\w+/g, '')
    // Remove JSON-like artifacts
    .replace(/[{}"]/g, '')
    // Remove common JSON keys
    .replace(/\b(text|snippet|content|transcript|duration|offset|start|end):\s*/gi, '')
    // Clean up extra whitespace
    .replace(/\s+/g, ' ')
    .trim();

  // Remove visual/non-audio tags that ElevenLabs cannot perform
  text = text
    .replace(/\[(smiling|winks?|gestures?|nods?|looks?|points?|leans?|walks?|waves?|shrugs?|raises?|tilts?|crosses?|stands?|sits?|turns?|faces?|stares?|glances?|blinks?|frowns?|grins?|beams?|sneers?|pouts?|rolls eyes?|eye roll|thumbs up|thumbs down|air quotes?|finger guns?|claps?|applauds?|dances?|jumps?|spins?|bows?|curtsies?|salutes?|flexes?|gestures wildly|chuckles?|laughs|sighs|gasps|giggles|whispering|excitedly)(\s+\w+)*\]/gi, '')
    // Normalize multi-word tags to single-word versions
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
 * Attempt a TTS call to ElevenLabs with a given model and settings.
 * Returns the audio ArrayBuffer on success, or null on failure.
 */
async function tryGenerateAudio(
  apiKey: string,
  voiceId: string,
  text: string,
  modelId: string,
  voiceSettings: Record<string, unknown> | null,
  languageCode: string | null,
): Promise<{ audio: ArrayBuffer | null; status: number; error: string }> {
  const requestBody: Record<string, unknown> = {
    text,
    model_id: modelId,
  };
  if (voiceSettings) {
    requestBody.voice_settings = voiceSettings;
  }
  // Provide explicit language hint so the multilingual model doesn't default to English
  if (languageCode) {
    requestBody.language_code = languageCode;
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
        JSON.stringify({ error: "ElevenLabs API key not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
      console.error("Supabase configuration missing");
      return new Response(
        JSON.stringify({ error: "Server configuration error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // --- Authentication ---
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Authorization header required" }),
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
        JSON.stringify({ error: "Invalid or expired token" }),
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
        JSON.stringify({ error: "Failed to verify subscription" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const status = subscription?.status || "free";
    let tier: "free" | "pro" | "agency" = "free";
    if (status === "agency" || status === "active_agency") tier = "agency";
    else if (status === "pro" || status === "active" || status === "active_pro") tier = "pro";

    if (tier === "free") {
      return new Response(
        JSON.stringify({ error: "Voice generation is a Pro feature", code: "SUBSCRIPTION_REQUIRED" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // --- Parse & validate request body ---
    const { text, voiceId, performancePrompt, targetLanguage } = await req.json();

    const processedText = flattenText(text);
    if (!processedText || processedText.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: "No text content to convert. Please generate a script first.", code: "INVALID_TRANSCRIPT_DATA" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!voiceId) {
      return new Response(
        JSON.stringify({ error: "Missing required field: voiceId" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!VALID_VOICE_IDS.includes(voiceId)) {
      return new Response(
        JSON.stringify({ error: "Invalid voice selection" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (AGENCY_ONLY_VOICE_IDS.includes(voiceId) && tier !== "agency") {
      return new Response(
        JSON.stringify({ error: "This voice is only available to Agency users", code: "AGENCY_REQUIRED" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Generating audio - voice: ${voiceId}, tier: ${tier}, language: ${targetLanguage || "english"}`);

    // --- Text sanitization ---
    const sanitizedText = sanitizeForTTS(processedText);
    const speakableCore = stripAllTags(sanitizedText).replace(/^\.\.\.\s*/, '').trim();

    if (!speakableCore) {
      return new Response(
        JSON.stringify({ error: "No speakable text found.", code: "NO_SPEAKABLE_TEXT" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Clean any stray non-printable / control characters that break multilingual output
    const cleanedCore = speakableCore
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
      .replace(/\uFEFF/g, '')
      .trim();

    // Strip stray English words that cause accent fallback for non-English languages
    const lang = (targetLanguage || "english").toLowerCase();
    const languageCleaned = cleanForTargetLanguage(cleanedCore, targetLanguage);

    // Prime with a leading pause for natural delivery
    const cleanText = `... ${languageCleaned}`;
    console.log(`Final text length: ${cleanText.length} characters (language: ${lang})`);

    // --- Language-aware voice settings & language code hint ---
    const voiceSettings = getVoiceSettingsForLanguage(lang);
    const languageCode = getLanguageCode(targetLanguage);
    console.log(`Voice settings: stability=${(voiceSettings as any).stability}, similarity_boost=${(voiceSettings as any).similarity_boost}, language_code=${languageCode || "auto"}`);

    // -----------------------------------------------------------
    // Model cascade:
    //   1. eleven_multilingual_v2  (best for all languages, removes English accent)
    //   2. eleven_turbo_v2_5       (fast fallback, still decent multilingual)
    // -----------------------------------------------------------

    // Attempt 1: eleven_multilingual_v2 (ALWAYS primary – never monolingual)
    console.log(`Attempt 1: eleven_multilingual_v2 (language: ${lang}, code: ${languageCode || "auto"})`);
    const attempt1 = await tryGenerateAudio(
      ELEVENLABS_API_KEY,
      voiceId,
      cleanText,
      "eleven_multilingual_v2",
      voiceSettings,
      languageCode,
    );

    if (attempt1.audio) {
      console.log(`Audio generated with eleven_multilingual_v2: ${attempt1.audio.byteLength} bytes`);
      return new Response(attempt1.audio, {
        headers: { ...corsHeaders, "Content-Type": "audio/mpeg" },
      });
    }

    // If auth error, bail immediately
    if (attempt1.status === 401) {
      return new Response(
        JSON.stringify({
          error: "ElevenLabs Authentication Failed: Please check your API key or upgrade to a paid plan.",
          details: attempt1.error,
        }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Attempt 2: eleven_turbo_v2_5 (fallback – still multilingual, NOT monolingual)
    console.log(`Attempt 2: eleven_turbo_v2_5 (fallback, language_code: ${languageCode || "auto"})`);
    const turboSettings = {
      stability: 0.5,
      similarity_boost: 0.75,
      style: 0.5,
      use_speaker_boost: true,
    };

    const attempt2 = await tryGenerateAudio(
      ELEVENLABS_API_KEY,
      voiceId,
      cleanText,
      "eleven_turbo_v2_5",
      turboSettings,
      languageCode,
    );

    if (attempt2.audio) {
      console.log(`Audio generated with eleven_turbo_v2_5 (fallback): ${attempt2.audio.byteLength} bytes`);
      return new Response(attempt2.audio, {
        headers: { ...corsHeaders, "Content-Type": "audio/mpeg" },
      });
    }

    if (attempt2.status === 401) {
      return new Response(
        JSON.stringify({
          error: "ElevenLabs Authentication Failed: Please check your API key or upgrade to a paid plan.",
          details: attempt2.error,
        }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Both attempts failed
    console.error("Both model attempts failed");
    return new Response(
      JSON.stringify({
        error: "Failed to generate audio with both models",
        multilingual_error: attempt1.error,
        turbo_error: attempt2.error,
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in generate-audio function:", error);
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
