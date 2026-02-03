import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { encodeBase64 } from "https://deno.land/std@0.224.0/encoding/base64.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Get the encryption key from environment (32 bytes for AES-256)
async function getEncryptionKey(): Promise<CryptoKey> {
  const keyString = Deno.env.get("INTEGRATION_ENCRYPTION_KEY");
  if (!keyString || keyString.length < 32) {
    throw new Error("Encryption key not configured or too short");
  }
  
  // Use first 32 bytes of the key string
  const keyMaterial = new TextEncoder().encode(keyString.slice(0, 32));
  
  return crypto.subtle.importKey(
    "raw",
    keyMaterial,
    { name: "AES-GCM" },
    false,
    ["encrypt", "decrypt"]
  );
}

// Encrypt a value using AES-256-GCM
async function encryptValue(plaintext: string): Promise<string> {
  const key = await getEncryptionKey();
  const iv = crypto.getRandomValues(new Uint8Array(12)); // 96-bit IV for GCM
  const encodedText = new TextEncoder().encode(plaintext);
  
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    encodedText
  );
  
  // Combine IV + ciphertext and encode as base64
  const combined = new Uint8Array(iv.length + new Uint8Array(ciphertext).length);
  combined.set(iv);
  combined.set(new Uint8Array(ciphertext), iv.length);
  
  return "enc:" + encodeBase64(combined);
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

    // Parse request body
    const body = await req.json();
    const { service, apiKey } = body;

    if (!service || !apiKey) {
      return new Response(
        JSON.stringify({ error: "Service and apiKey are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate service name
    const allowedServices = ["buffer"];
    if (!allowedServices.includes(service)) {
      return new Response(
        JSON.stringify({ error: "Invalid service" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate API key format (basic sanity check)
    if (typeof apiKey !== "string" || apiKey.length < 10 || apiKey.length > 500) {
      return new Response(
        JSON.stringify({ error: "Invalid API key format" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[Encrypt Integration] Encrypting ${service} key for user ${user.id}`);

    // Encrypt the API key
    const encryptedKey = await encryptValue(apiKey);

    // Check if integration already exists
    const { data: existing } = await supabase
      .from("user_integrations")
      .select("id")
      .eq("user_id", user.id)
      .eq("service", service)
      .maybeSingle();

    if (existing) {
      // Update existing
      const { error: updateError } = await supabase
        .from("user_integrations")
        .update({ 
          api_key: encryptedKey, 
          is_active: true, 
          updated_at: new Date().toISOString() 
        })
        .eq("id", existing.id);
      
      if (updateError) {
        console.error("Update error:", updateError);
        throw updateError;
      }
    } else {
      // Insert new
      const { error: insertError } = await supabase
        .from("user_integrations")
        .insert({
          user_id: user.id,
          service: service,
          api_key: encryptedKey,
          is_active: true,
        });
      
      if (insertError) {
        console.error("Insert error:", insertError);
        throw insertError;
      }
    }

    console.log(`[Encrypt Integration] Successfully saved encrypted ${service} key`);

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    console.error("[Encrypt Integration] Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Internal server error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
