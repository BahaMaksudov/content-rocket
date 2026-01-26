import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { transcript, tone, audience, brandVoice } = await req.json();

    if (!transcript) {
      return new Response(
        JSON.stringify({ error: "Transcript is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      console.error("LOVABLE_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: "AI service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Generating content with tone:", tone, "audience:", audience);

    // Build brand voice context
    let brandVoiceContext = "";
    if (brandVoice) {
      brandVoiceContext = `
BRAND VOICE TO USE:
- Name: ${brandVoice.name}
- Writing Style: ${brandVoice.writingStyle || "Not specified"}
- Tone: ${brandVoice.tone || "Not specified"}
- Key Phrases to incorporate: ${brandVoice.keyPhrases?.join(", ") || "None"}
- Target Audience: ${brandVoice.targetAudience || "General"}

Apply this brand voice consistently across all content.
`;
    }

    const systemPrompt = `You are an expert content strategist and copywriter. Your task is to transform a YouTube video transcript into engaging multi-platform content.

${brandVoiceContext}

TONE: ${tone || "professional"}
TARGET AUDIENCE: ${audience || "general"}

You must generate:
1. FIVE viral X (Twitter) hooks - attention-grabbing opening lines (max 280 characters each)
2. ONE LinkedIn post using the Problem-Agitation-Solution framework (300-500 words)
3. THREE short-form video scripts for TikTok/Reels (30-60 seconds each with timestamps)
4. ONE SEO-optimized blog post (approximately 500 words)

Respond with a JSON object in exactly this format:
{
  "twitterHooks": ["hook1", "hook2", "hook3", "hook4", "hook5"],
  "linkedinPost": "full linkedin post text",
  "shortFormScripts": [
    {"title": "Script 1 Title", "script": "full script with timestamps", "duration": "30-45s"},
    {"title": "Script 2 Title", "script": "full script with timestamps", "duration": "45-60s"},
    {"title": "Script 3 Title", "script": "full script with timestamps", "duration": "30-45s"}
  ],
  "blogPost": "full blog post with headings"
}`;

    const userPrompt = `Here is the YouTube video transcript to repurpose:

---
${transcript.substring(0, 15000)}
---

Generate the multi-platform content now. Remember to respond with valid JSON only.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.7,
        max_tokens: 4000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add credits to continue." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ error: "AI generation failed" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      console.error("No content in AI response");
      return new Response(
        JSON.stringify({ error: "No content generated" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Raw AI response:", content.substring(0, 500));

    // Parse the JSON response
    // Try to extract JSON from the response (it might be wrapped in markdown code blocks)
    let jsonStr = content;
    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1].trim();
    }

    try {
      const generatedContent = JSON.parse(jsonStr);
      
      // Validate the structure
      if (!generatedContent.twitterHooks || !generatedContent.linkedinPost || 
          !generatedContent.shortFormScripts || !generatedContent.blogPost) {
        throw new Error("Missing required fields in generated content");
      }

      console.log("Successfully generated content");

      return new Response(
        JSON.stringify(generatedContent),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } catch (parseError) {
      console.error("Failed to parse AI response:", parseError);
      console.error("Content was:", jsonStr);
      
      return new Response(
        JSON.stringify({ error: "Failed to parse generated content" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

  } catch (error) {
    console.error("Error generating content:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: "Failed to generate content", details: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
