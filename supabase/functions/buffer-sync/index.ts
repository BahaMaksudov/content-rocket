import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface BufferSyncRequest {
  content: string;
  platform: "blog" | "twitter" | "linkedin" | "shorts";
  youtubeUrl?: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Get authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify user token
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      console.error("Auth error:", authError);
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[Buffer Sync] User ${user.id} requesting sync`);

    // Check if user has Agency subscription
    const { data: subscription, error: subError } = await supabase
      .from("subscriptions")
      .select("status, price_id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (subError) {
      console.error("Subscription check error:", subError);
      return new Response(
        JSON.stringify({ error: "Failed to verify subscription" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check for agency tier
    const isAgency = subscription?.status === "agency" || 
      (subscription?.price_id && subscription.price_id.includes("agency"));

    if (!isAgency) {
      return new Response(
        JSON.stringify({ error: "Buffer API sync requires Agency subscription" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get user's Buffer API key from user_integrations table
    const { data: integration, error: integrationError } = await supabase
      .from("user_integrations")
      .select("api_key")
      .eq("user_id", user.id)
      .eq("service", "buffer")
      .maybeSingle();

    if (integrationError) {
      console.error("Integration fetch error:", integrationError);
    }

    if (!integration?.api_key) {
      console.log("[Buffer Sync] No Buffer API key configured for user");
      return new Response(
        JSON.stringify({ needsApiKey: true, error: "Buffer API key not configured" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse request body
    const body: BufferSyncRequest = await req.json();
    const { content, platform, youtubeUrl } = body;

    if (!content) {
      return new Response(
        JSON.stringify({ error: "Content is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[Buffer Sync] Creating update for platform: ${platform}`);

    // Get user's Buffer profiles
    const profilesResponse = await fetch("https://api.bufferapp.com/1/profiles.json", {
      headers: {
        Authorization: `Bearer ${integration.api_key}`,
      },
    });

    if (!profilesResponse.ok) {
      const errorText = await profilesResponse.text();
      console.error("Buffer profiles error:", errorText);
      return new Response(
        JSON.stringify({ error: "Failed to fetch Buffer profiles. Check your API key." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const profiles = await profilesResponse.json();
    
    if (!profiles || profiles.length === 0) {
      return new Response(
        JSON.stringify({ error: "No Buffer profiles found. Connect social accounts in Buffer first." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Find appropriate profile based on platform
    let targetProfile = profiles[0]; // Default to first profile
    
    const platformMap: Record<string, string[]> = {
      twitter: ["twitter", "x"],
      linkedin: ["linkedin"],
      blog: ["facebook", "twitter", "linkedin"], // Blog can go to any
      shorts: ["instagram", "tiktok", "facebook"], // Video scripts for video platforms
    };

    const targetServices = platformMap[platform] || [];
    for (const profile of profiles) {
      if (targetServices.some(service => profile.service?.toLowerCase().includes(service))) {
        targetProfile = profile;
        break;
      }
    }

    console.log(`[Buffer Sync] Using profile: ${targetProfile.service} (${targetProfile.id})`);

    // Create Buffer update
    const formData = new URLSearchParams();
    formData.append("text", content);
    formData.append("profile_ids[]", targetProfile.id);
    if (youtubeUrl) {
      formData.append("media[link]", youtubeUrl);
    }

    const updateResponse = await fetch("https://api.bufferapp.com/1/updates/create.json", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${integration.api_key}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: formData.toString(),
    });

    if (!updateResponse.ok) {
      const errorText = await updateResponse.text();
      console.error("Buffer create error:", errorText);
      return new Response(
        JSON.stringify({ error: "Failed to create Buffer update" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const updateResult = await updateResponse.json();
    console.log("[Buffer Sync] Update created successfully:", updateResult.updates?.[0]?.id);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Added to Buffer queue",
        updateId: updateResult.updates?.[0]?.id,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    console.error("[Buffer Sync] Unexpected error:", error);
    const errorMessage = error instanceof Error ? error.message : "Internal server error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
