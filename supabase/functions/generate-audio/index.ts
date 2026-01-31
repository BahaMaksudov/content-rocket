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

serve(async (req) => {
  // Handle CORS preflight requests
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

    // Get the authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Authorization header required" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create Supabase client with user's token for JWT validation
    const supabaseAuth = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } }
    });
    
    // Verify the JWT (Edge Functions don't have persisted sessions, so pass the JWT explicitly)
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
    
    // Create admin client for database queries
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // CRITICAL: Verify user's subscription tier from database (do not trust frontend)
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
    console.log(`User subscription status: ${status}`);

    // Determine tier from status
    let tier: "free" | "pro" | "agency" = "free";
    if (status === "agency" || status === "active_agency") {
      tier = "agency";
    } else if (status === "pro" || status === "active" || status === "active_pro") {
      tier = "pro";
    }

    // Block free users
    if (tier === "free") {
      console.log(`Blocking free user ${userId} from voice generation`);
      return new Response(
        JSON.stringify({ 
          error: "Voice generation is a Pro feature",
          code: "SUBSCRIPTION_REQUIRED"
        }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { text, voiceId, performancePrompt } = await req.json();
    
    // Flatten text if it's an array (handle various transcript formats)
    let processedText: string;
    if (Array.isArray(text)) {
      console.log(`Received array input with ${text.length} items, flattening...`);
      processedText = text
        .map((item: unknown) => {
          if (typeof item === 'string') return item;
          if (item && typeof item === 'object') {
            // Handle common transcript object formats
            const obj = item as Record<string, unknown>;
            return obj.text || obj.snippet || obj.content || obj.transcript || '';
          }
          return '';
        })
        .filter(Boolean)
        .join(' ');
    } else if (typeof text === 'string') {
      processedText = text;
    } else if (text && typeof text === 'object') {
      // Handle single object with text property
      const obj = text as Record<string, unknown>;
      processedText = String(obj.text || obj.snippet || obj.content || obj.transcript || '');
    } else {
      processedText = '';
    }

    // Validate that we have actual text content
    if (!processedText || processedText.trim().length === 0) {
      console.error("No valid text content found in input");
      return new Response(
        JSON.stringify({ 
          error: "No text content to convert. Please generate a script first.",
          code: "INVALID_TRANSCRIPT_DATA"
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    if (!voiceId) {
      return new Response(
        JSON.stringify({ error: "Missing required field: voiceId" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Processed text length: ${processedText.length} characters`);

    // Validate voice ID
    if (!VALID_VOICE_IDS.includes(voiceId)) {
      return new Response(
        JSON.stringify({ error: "Invalid voice selection" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if user is trying to use agency-only voice without agency tier
    if (AGENCY_ONLY_VOICE_IDS.includes(voiceId) && tier !== "agency") {
      console.log(`Blocking pro user ${userId} from agency-only voice`);
      return new Response(
        JSON.stringify({ 
          error: "This voice is only available to Agency users",
          code: "AGENCY_REQUIRED"
        }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Generating audio for voice: ${voiceId}, tier: ${tier}`);

    // Sanitize text: remove timestamps, speaker labels, and JSON artifacts for cleaner TTS output
    let sanitizedText = processedText
      // Remove timestamps like [0:00], [00:00], [0:00-0:03], etc.
      .replace(/\[\d{1,2}:\d{2}(?:-\d{1,2}:\d{2})?\]/g, '')
      // Remove timestamps without brackets like 0:00, 00:00
      .replace(/\b\d{1,2}:\d{2}\b/g, '')
      // Remove speaker labels like "Speaker A:", "Host:", "Guest 1:"
      .replace(/\b(?:Speaker\s*[A-Z0-9]+|Host|Guest\s*\d*|Narrator):\s*/gi, '')
      // Remove section markers like "[HOOK]", "[INTRO]", "[CTA]"
      .replace(/\[(HOOK|INTRO|SETUP|MAIN|CTA|OUTRO|CONCLUSION)\]/gi, '')
      // Remove JSON-like artifacts that might leak through
      .replace(/[{}"\[\]]/g, '')
      // Remove common JSON keys that might appear
      .replace(/\b(text|snippet|content|transcript|duration|offset|start|end):\s*/gi, '')
      // Clean up extra whitespace
      .replace(/\s+/g, ' ')
      .trim();
    
    console.log(`Text after sanitization: ${sanitizedText.length} characters`);

    // Safety net: Remove any visual/non-audio tags that ElevenLabs cannot perform
    // These would be read aloud instead of performed
    sanitizedText = sanitizedText
      .replace(/\[(smiling|winks?|gestures?|nods?|looks?|points?|leans?|walks?|waves?|shrugs?|raises?|tilts?|crosses?|stands?|sits?|turns?|faces?|stares?|glances?|blinks?|frowns?|grins?|beams?|sneers?|pouts?|rolls eyes?|eye roll|thumbs up|thumbs down|air quotes?|finger guns?|claps?|applauds?|dances?|jumps?|spins?|bows?|curtsies?|salutes?|flexes?)(\s+\w+)*\]/gi, '')
      // Clean up any resulting double spaces
      .replace(/\s+/g, ' ')
      .trim();
    
    console.log(`Text after visual tag removal: ${sanitizedText.length} characters`);

    // Final validation after sanitization - use fallback if empty
    if (sanitizedText.length < 10) {
      console.warn("Text too short after sanitization, using fallback");
      sanitizedText = "Hello, welcome to the show.";
    }

    // Prepend the performance prompt to guide the AI's delivery
    const enhancedText = performancePrompt 
      ? `[${performancePrompt}] ${sanitizedText}`
      : sanitizedText;

    // ElevenLabs v3 Alpha requires stability to be exactly 0.0, 0.5, or 1.0
    // 0.0 = Creative (most emotional freedom for laughter/expressions)
    // 0.5 = Natural (balanced)
    // 1.0 = Robust (most consistent)
    const v3AlphaSettings = {
      stability: 0.0,  // Creative mode for maximum emotional performance
      similarity_boost: 0.75,
      style: 0.80,
      use_speaker_boost: true,
    };

    // Fallback settings for turbo model
    const turboSettings = {
      stability: 0.5,
      similarity_boost: 0.75,
      style: 0.5,
      use_speaker_boost: true,
    };

    // Try v3 Alpha first, fallback to turbo if it fails
    let audioBuffer: ArrayBuffer | null = null;
    let lastError: string = "";

    // Attempt 1: eleven_v3_alpha
    console.log(`Attempting audio generation with eleven_v3_alpha...`);
    try {
      const response = await fetch(
        `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`,
        {
          method: "POST",
          headers: {
            "xi-api-key": ELEVENLABS_API_KEY,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            text: enhancedText,
            model_id: "eleven_v3_alpha",
            voice_settings: v3AlphaSettings,
          }),
        }
      );

      if (response.ok) {
        audioBuffer = await response.arrayBuffer();
        console.log(`Audio generated successfully with v3_alpha: ${audioBuffer.byteLength} bytes`);
      } else {
        const errorText = await response.text();
        lastError = errorText;
        console.error(`ElevenLabs v3_alpha error: ${response.status} - ${errorText}`);
        
        // Check for auth errors
        if (response.status === 401) {
          return new Response(
            JSON.stringify({ 
              error: "ElevenLabs Authentication Failed: Please check your API key or upgrade to a paid plan.",
              details: errorText
            }),
            { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }
    } catch (fetchError) {
      console.error("Fetch error with v3_alpha:", fetchError);
      lastError = fetchError instanceof Error ? fetchError.message : "Unknown fetch error";
    }

    // Attempt 2: Fallback to eleven_turbo_v2_5 if v3_alpha failed
    if (!audioBuffer) {
      console.log(`Falling back to eleven_turbo_v2_5...`);
      try {
        const response = await fetch(
          `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`,
          {
            method: "POST",
            headers: {
              "xi-api-key": ELEVENLABS_API_KEY,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              text: enhancedText,
              model_id: "eleven_turbo_v2_5",
              voice_settings: turboSettings,
            }),
          }
        );

        if (response.ok) {
          audioBuffer = await response.arrayBuffer();
          console.log(`Audio generated successfully with turbo_v2_5 (fallback): ${audioBuffer.byteLength} bytes`);
        } else {
          const errorText = await response.text();
          console.error(`ElevenLabs turbo fallback error: ${response.status} - ${errorText}`);
          
          if (response.status === 401) {
            return new Response(
              JSON.stringify({ 
                error: "ElevenLabs Authentication Failed: Please check your API key or upgrade to a paid plan.",
                details: errorText
              }),
              { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }
          
          return new Response(
            JSON.stringify({ 
              error: "Failed to generate audio with both models", 
              v3_error: lastError,
              turbo_error: errorText 
            }),
            { status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      } catch (fetchError) {
        console.error("Fetch error with turbo fallback:", fetchError);
        return new Response(
          JSON.stringify({ 
            error: "Failed to generate audio", 
            v3_error: lastError,
            turbo_error: fetchError instanceof Error ? fetchError.message : "Unknown error"
          }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    return new Response(audioBuffer, {
      headers: {
        ...corsHeaders,
        "Content-Type": "audio/mpeg",
      },
    });

  } catch (error) {
    console.error("Error in generate-audio function:", error);
    return new Response(
      JSON.stringify({ 
        error: "Internal server error", 
        message: error instanceof Error ? error.message : "Unknown error" 
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});