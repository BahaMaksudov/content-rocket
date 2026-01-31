import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

console.log("api-gateway function loaded");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Helper to create JSON response
function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// Hash the API key using SHA-256
async function hashApiKey(key: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(key);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
}

// Extract and parse JSON from AI response
function extractAndParseJSON(content: string): any {
  let jsonStr = content.trim();
  
  // Remove markdown code fences
  if (jsonStr.startsWith("```")) {
    jsonStr = jsonStr.replace(/^```(?:json)?\s*\n?/, "");
    jsonStr = jsonStr.replace(/\n?```\s*$/, "");
  }
  
  if (jsonStr.includes("```")) {
    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1].trim();
    }
  }
  
  try {
    return JSON.parse(jsonStr);
  } catch (e) {
    console.log("Direct JSON parse failed, attempting repair...");
  }
  
  // Fix common JSON issues
  jsonStr = jsonStr.replace(/,(\s*[}\]])/g, '$1');
  
  const firstBrace = jsonStr.indexOf('{');
  const lastBrace = jsonStr.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    jsonStr = jsonStr.substring(firstBrace, lastBrace + 1);
  }
  
  return JSON.parse(jsonStr);
}

serve(async (req) => {
  console.log("API Gateway triggered - method:", req.method);
  
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // Only accept POST requests
  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  try {
    // Extract Bearer token
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      console.log("Missing or invalid Authorization header");
      return json({ error: "Unauthorized - Missing or invalid API key" }, 401);
    }

    const apiKey = authHeader.replace("Bearer ", "").trim();
    if (!apiKey || !apiKey.startsWith("sk_")) {
      console.log("Invalid API key format");
      return json({ error: "Unauthorized - Invalid API key format" }, 401);
    }

    // Hash the incoming key
    const keyHash = await hashApiKey(apiKey);
    console.log("Validating API key hash...");

    // Initialize Supabase client with service role
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify the API key exists in the database
    const { data: keyData, error: keyError } = await supabase
      .from("user_api_keys")
      .select("id, user_id, name")
      .eq("key_hash", keyHash)
      .maybeSingle();

    if (keyError) {
      console.error("Database error checking API key:", keyError);
      return json({ error: "Internal server error" }, 500);
    }

    if (!keyData) {
      console.log("API key not found in database");
      return json({ error: "Unauthorized - Invalid API key" }, 401);
    }

    console.log("API key validated for user:", keyData.user_id, "key name:", keyData.name);

    // Update last_used_at timestamp
    await supabase
      .from("user_api_keys")
      .update({ last_used_at: new Date().toISOString() })
      .eq("id", keyData.id);

    // Check user's subscription status
    const { data: subData } = await supabase
      .from("subscriptions")
      .select("status")
      .eq("user_id", keyData.user_id)
      .maybeSingle();

    const isPro = subData?.status === "pro" || subData?.status === "agency";
    if (!isPro) {
      console.log("User does not have Pro subscription");
      return json({ error: "API access requires a Pro or Agency subscription" }, 403);
    }

    // Parse request body
    const body = await req.json();
    const { action, transcript, tone, audience, topic, voice } = body;

    if (action !== "generate") {
      return json({ error: "Invalid action. Supported actions: generate" }, 400);
    }

    // Use transcript if provided, or generate a simple prompt from topic
    let contentToProcess = transcript;
    if (!contentToProcess && topic) {
      contentToProcess = `Generate content about: ${topic}. Voice/Style: ${voice || "Professional"}`;
    }

    if (!contentToProcess) {
      return json({ error: "Either 'transcript' or 'topic' is required" }, 400);
    }

    // Get OpenAI API key
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_API_KEY) {
      console.error("OPENAI_API_KEY not configured");
      return json({ error: "AI service not configured" }, 500);
    }

    console.log("Generating content via API for user:", keyData.user_id);

    // Build the prompt
    const systemPrompt = `You are an elite content strategist and viral copywriter. Transform the provided content into high-engagement multi-platform content.

TONE: ${tone || voice || "professional"}
TARGET AUDIENCE: ${audience || "general"}

Generate the following:

1. **FIVE VIRAL X (TWITTER) HOOKS** - Craft irresistible opening lines under 280 characters each.

2. **ONE PROFESSIONAL LINKEDIN POST** - 300-500 words using Problem-Agitation-Solution framework.

3. **THREE TIKTOK VIDEO SCRIPTS** - Include timestamps [0:00-0:03] hook, [0:03-0:15] setup, [0:15-0:45] main content, [0:45-0:60] CTA.

4. **ONE SEO-OPTIMIZED BLOG POST** - ~500 words with H1, H2 subheadings, and actionable takeaways.

Return ONLY valid JSON:
{
  "twitterHooks": ["hook1", "hook2", "hook3", "hook4", "hook5"],
  "linkedinPost": "full linkedin post",
  "shortFormScripts": [
    {"title": "Script 1", "script": "full script", "duration": "45-60s"},
    {"title": "Script 2", "script": "full script", "duration": "30-45s"},
    {"title": "Script 3", "script": "full script", "duration": "45-60s"}
  ],
  "blogPost": "full blog post with markdown"
}`;

    const userPrompt = `Here is the content to repurpose:

---
${contentToProcess.substring(0, 15000)}
---

Generate multi-platform content following the JSON format specified.`;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.7,
        max_tokens: 6000,
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("OpenAI API error:", response.status, errorText);
      
      if (response.status === 429) {
        return json({ error: "Rate limit exceeded. Please try again later." }, 429);
      }
      
      return json({ error: "AI generation failed" }, 500);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      console.error("No content in AI response");
      return json({ error: "No content generated" }, 500);
    }

    try {
      const generatedContent = extractAndParseJSON(content);
      
      // Validate structure
      if (!generatedContent.twitterHooks || !generatedContent.linkedinPost || 
          !generatedContent.shortFormScripts || !generatedContent.blogPost) {
        throw new Error("Missing required fields");
      }

      console.log("Content generated successfully via API");
      
      return json({
        success: true,
        data: generatedContent,
      });
    } catch (parseError) {
      console.error("Failed to parse AI response:", parseError);
      return json({ error: "Failed to parse generated content" }, 500);
    }

  } catch (error) {
    console.error("API Gateway error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return json({ error: "Internal server error", details: errorMessage }, 500);
  }
});
