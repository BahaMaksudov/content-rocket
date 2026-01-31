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
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    if (!ELEVENLABS_API_KEY) {
      console.error("ELEVENLABS_API_KEY is not configured");
      return new Response(
        JSON.stringify({ error: "ElevenLabs API key not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      console.error("Supabase configuration missing");
      return new Response(
        JSON.stringify({ error: "Server configuration error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get the authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Authorization header required" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create Supabase client with user's token
    const supabaseClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    
    // Verify the JWT and get user
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
    
    if (authError || !user) {
      console.error("Auth error:", authError);
      return new Response(
        JSON.stringify({ error: "Invalid or expired token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`User ${user.id} requesting audio generation`);

    // CRITICAL: Verify user's subscription tier from database (do not trust frontend)
    const { data: subscription, error: subError } = await supabaseClient
      .from("subscriptions")
      .select("status")
      .eq("user_id", user.id)
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
      console.log(`Blocking free user ${user.id} from voice generation`);
      return new Response(
        JSON.stringify({ 
          error: "Voice generation is a Pro feature",
          code: "SUBSCRIPTION_REQUIRED"
        }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { text, voiceId, performancePrompt } = await req.json();
    
    if (!text || !voiceId) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: text and voiceId" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate voice ID
    if (!VALID_VOICE_IDS.includes(voiceId)) {
      return new Response(
        JSON.stringify({ error: "Invalid voice selection" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if user is trying to use agency-only voice without agency tier
    if (AGENCY_ONLY_VOICE_IDS.includes(voiceId) && tier !== "agency") {
      console.log(`Blocking pro user ${user.id} from agency-only voice`);
      return new Response(
        JSON.stringify({ 
          error: "This voice is only available to Agency users",
          code: "AGENCY_REQUIRED"
        }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Generating audio for voice: ${voiceId}, tier: ${tier}`);
    console.log(`Text length: ${text.length} characters`);

    // Prepend the performance prompt to guide the AI's delivery
    const enhancedText = performancePrompt 
      ? `[${performancePrompt}] ${text}`
      : text;

    // Call ElevenLabs TTS API
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
          model_id: "eleven_multilingual_v2",
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
            style: 0.5,
            use_speaker_boost: true,
            speed: 1.0,
          },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`ElevenLabs API error: ${response.status} - ${errorText}`);
      return new Response(
        JSON.stringify({ error: "Failed to generate audio", details: errorText }),
        { status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const audioBuffer = await response.arrayBuffer();
    console.log(`Audio generated successfully: ${audioBuffer.byteLength} bytes`);

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
