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

    const systemPrompt = `You are an elite content strategist and viral copywriter with expertise in multi-platform content creation. Transform the provided YouTube transcript into high-engagement content.

${brandVoiceContext}

TONE: ${tone || "professional"}
TARGET AUDIENCE: ${audience || "general"}

Generate the following content with maximum engagement potential:

1. **FIVE VIRAL X (TWITTER) HOOKS** - Craft irresistible opening lines that stop the scroll. Each must:
   - Be under 280 characters
   - Use power words, curiosity gaps, or contrarian takes
   - Be standalone attention-grabbers that make people want to read more

2. **ONE PROFESSIONAL LINKEDIN POST** - Create a compelling post using the Problem-Agitation-Solution framework:
   - Hook: Start with a bold statement or question (1-2 lines)
   - Problem: Identify the pain point your audience faces
   - Agitation: Amplify the consequences of ignoring this problem
   - Solution: Present the key insights from the transcript as the answer
   - CTA: End with engagement prompt
   - Length: 300-500 words, use line breaks for readability

3. **THREE TIKTOK VIDEO SCRIPTS** - Write engaging short-form scripts with precise timestamps:
   - Include [0:00-0:03] hook, [0:03-0:15] setup, [0:15-0:45] main content, [0:45-0:60] CTA
   - Write in conversational, energetic tone
   - Include visual/action cues in brackets
   - Each script should focus on ONE key takeaway

4. **ONE SEO-OPTIMIZED BLOG POST** - Write a comprehensive article:
   - Compelling H1 title with primary keyword
   - Introduction with hook and thesis
   - 3-4 H2 subheadings organizing key points
   - Actionable takeaways
   - Conclusion with CTA
   - Approximately 500 words

Respond with a JSON object in exactly this format:
{
  "twitterHooks": ["hook1", "hook2", "hook3", "hook4", "hook5"],
  "linkedinPost": "full linkedin post text with line breaks",
  "shortFormScripts": [
    {"title": "Script 1 Title", "script": "full timestamped script with visual cues", "duration": "45-60s"},
    {"title": "Script 2 Title", "script": "full timestamped script with visual cues", "duration": "30-45s"},
    {"title": "Script 3 Title", "script": "full timestamped script with visual cues", "duration": "45-60s"}
  ],
  "blogPost": "full blog post with markdown headings"
}`;

    const userPrompt = `Here is the YouTube video transcript to repurpose into viral multi-platform content:

---
${transcript.substring(0, 15000)}
---

Analyze this transcript deeply. Extract the most compelling insights, stories, and actionable advice. Then generate the multi-platform content following the exact JSON format specified. Ensure each piece is optimized for its platform's unique audience and algorithm.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.7,
        max_tokens: 6000,
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
