import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

console.log("generate-content function loaded");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function extractAndParseJSON(content: string): any {
  let jsonStr = content.trim();
  
  // Remove markdown code fences (```json ... ``` or ``` ... ```)
  if (jsonStr.startsWith("```")) {
    jsonStr = jsonStr.replace(/^```(?:json)?\s*\n?/, "");
    jsonStr = jsonStr.replace(/\n?```\s*$/, "");
  }
  
  // Also try regex match as fallback
  if (jsonStr.includes("```")) {
    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1].trim();
    }
  }
  
  // Try direct parsing first
  try {
    return JSON.parse(jsonStr);
  } catch (e) {
    console.log("Direct JSON parse failed, attempting repair...");
  }
  
  // Try to fix common JSON issues
  // 1. Fix trailing commas before closing braces/brackets
  jsonStr = jsonStr.replace(/,(\s*[}\]])/g, '$1');
  
  // 2. Try to find valid JSON object boundaries
  const firstBrace = jsonStr.indexOf('{');
  const lastBrace = jsonStr.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    jsonStr = jsonStr.substring(firstBrace, lastBrace + 1);
  }
  
  return JSON.parse(jsonStr);
}

async function translateContent(
  content: any,
  targetLanguage: string,
  brandVoice: any,
  apiKey: string
): Promise<any> {
  const languageNames: Record<string, string> = {
    spanish: "Spanish",
    hindi: "Hindi",
    mandarin: "Mandarin Chinese",
    uzbek: "Uzbek",
    russian: "Russian",
  };

  const langName = languageNames[targetLanguage] || "Spanish";
  
  const translationPrompt = `You are a professional translator. Translate the following JSON content to ${langName}.
  
CRITICAL RULES:
1. Maintain the exact same JSON structure
2. Only translate the text values, NOT the keys
3. Preserve any brand voice characteristics: ${brandVoice ? `tone: ${brandVoice.tone}, style: ${brandVoice.writingStyle}` : "professional"}
4. Keep hashtags in their original form but add translated equivalents
5. Maintain emotional impact and persuasive elements
6. Preserve formatting like line breaks

Content to translate:
${JSON.stringify(content, null, 2)}

Return ONLY valid JSON with the same structure but translated values. Do NOT include markdown code fences.`;

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        { role: "user", content: translationPrompt },
      ],
      temperature: 0.3,
      max_tokens: 6000,
    }),
  });

  if (!response.ok) {
    console.error("Translation error:", await response.text());
    throw new Error("Translation failed");
  }

  const data = await response.json();
  const translatedContent = data.choices?.[0]?.message?.content;

  return extractAndParseJSON(translatedContent);
}

serve(async (req) => {
  console.log("Function triggered - method:", req.method);
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { transcript, tone, audience, brandVoice, translateTo, videoTitle, userId } = await req.json();

    if (!transcript) {
      return new Response(
        JSON.stringify({ error: "Transcript is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Advertisement detection patterns
    const AD_PATTERNS = [
      /apple\s*watch/i,
      /iphone\s*\d*/i,
      /learn\s*more\s*at\s*apple\.com/i,
      /sponsored\s*(by|content)?/i,
      /this\s*(video|content)\s*is\s*sponsored/i,
      /brought\s*to\s*you\s*by/i,
      /available\s*at\s*apple\.com/i,
    ];

    // Pre-check for obvious advertisement content
    const transcriptLower = transcript.toLowerCase();
    let adMatchCount = 0;
    for (const pattern of AD_PATTERNS) {
      if (pattern.test(transcript)) {
        adMatchCount++;
      }
    }

    // If the transcript is very short and contains ad patterns, reject it
    if (transcript.length < 500 && adMatchCount >= 2) {
      console.error("Transcript appears to be advertisement content");
      return new Response(
        JSON.stringify({ 
          error: "Invalid transcript data",
          errorCode: "INVALID_TRANSCRIPT_DATA",
          details: "The transcript appears to contain advertisement content rather than the video's actual content. Please paste the transcript manually."
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_API_KEY) {
      console.error("OPENAI_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: "OpenAI API key not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch top testimonials for social proof across ALL content
    let socialProofContext = "";
    if (userId) {
      try {
        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
        const adminClient = createClient(supabaseUrl, supabaseServiceKey);

        // Fetch featured first, then fall back to top-rated if none featured
        let { data: testimonials } = await adminClient
          .from("testimonials")
          .select("author_name, author_title, content, rating")
          .eq("user_id", userId)
          .eq("is_featured", true)
          .order("rating", { ascending: false })
          .limit(3);

        // Fallback: if no featured testimonials, grab top-rated ones
        if (!testimonials || testimonials.length === 0) {
          const { data: topRated } = await adminClient
            .from("testimonials")
            .select("author_name, author_title, content, rating")
            .eq("user_id", userId)
            .order("rating", { ascending: false })
            .limit(3);
          testimonials = topRated;
        }

        console.log("Testimonials for AI:", JSON.stringify(testimonials));

        if (testimonials && testimonials.length > 0) {
          const quotes = testimonials.map((t: any, i: number) =>
            `  ${i + 1}. "${t.content}" — ${t.author_name}${t.author_title ? `, ${t.author_title}` : ""} (${t.rating}/5 stars)`
          ).join("\n");

          socialProofContext = `
## ⚠️ MANDATORY: REAL CUSTOMER TESTIMONIALS — YOU MUST USE THESE ⚠️

CRITICAL: You MUST include at least one of the provided real customer testimonials in EVERY content type below. Do NOT skip this. The user has explicitly requested social proof integration.

Available customer testimonials:
${quotes}

MANDATORY RULES (failure to follow = invalid output):
- For TWITTER HOOKS: At least 1 of the 5 hooks MUST reference or quote a testimonial (e.g., "One user said it best: '...'"). Keep within 280 chars.
- For LINKEDIN POST: You MUST weave at least 1-2 testimonial quotes naturally into the post body. Add a "What our users say" section if needed. Attribute each quote with exact name and title.
- For BLOG POST: You MUST integrate at least 2 of these exact quotes as supporting evidence. Use formats like "As [Name] puts it: '...'" or dedicated testimonial callout sections.
- For TIKTOK SCRIPTS: At least 1 script MUST reference a customer success point or quote.
- Do NOT modify, paraphrase, or fabricate any quotes — use ONLY the exact words above.
- Do NOT invent new testimonials or customer stories.
- Attribute each quote accurately using the exact name and title provided.

`;
        } else {
          console.log("No testimonials found for user:", userId);
        }
      } catch (err) {
        console.error("Failed to fetch testimonials for social proof:", err);
        // Non-blocking — continue without social proof
      }
    }

    console.log("Generating content with tone:", tone, "audience:", audience, "translate:", translateTo, "brandVoice:", brandVoice?.name);

    // Build comprehensive brand voice context
    let brandVoiceContext = "";
    if (brandVoice) {
      brandVoiceContext = `
## CRITICAL: BRAND VOICE REQUIREMENTS (MUST FOLLOW)

You are a professional content creator. You MUST write ALL content using this specific Brand Voice. This is non-negotiable.

### Brand Identity: "${brandVoice.name}"

### Writing Style & Voice Description:
${brandVoice.writingStyle ? `You MUST follow these exact writing style instructions throughout ALL content you generate:

"${brandVoice.writingStyle}"

Apply this voice consistently to every hook, post, script, and blog you create. The output MUST match this tone strictly.` : "Use a clear, engaging writing style."}
${brandVoice.tone ? `
### Tone of Voice:
Maintain this tone consistently: "${brandVoice.tone}"` : ""}
${brandVoice.keyPhrases?.length > 0 ? `
### Key Phrases to Incorporate:
You MUST naturally weave these signature phrases into the content:
${brandVoice.keyPhrases.map((phrase: string, i: number) => `  ${i + 1}. "${phrase}"`).join("\n")}

Incorporate at least 2-3 of these phrases across the generated content where they fit naturally.` : ""}
${brandVoice.targetAudience ? `
### Target Audience:
Write specifically for: "${brandVoice.targetAudience}". Tailor vocabulary, examples, and references to resonate with this audience.` : ""}

### Brand Voice Consistency Checklist:
- Every piece of content must reflect the specified writing style
- The tone must remain consistent across all platforms
- Key phrases should appear naturally, not forced
- Language complexity should match the target audience
- Maintain the brand personality in hooks, posts, and scripts

`;
    }

    const systemPrompt = `You are a content repurposing assistant. Your ONLY job is to transform the provided YouTube transcript into multi-platform content.

CRITICAL RULES - MUST FOLLOW:
1. You must ONLY use information from the provided transcript text below
2. Do NOT invent facts, statistics, quotes, or claims not in the transcript
3. Do NOT add generic marketing language about unrelated products (like iPhones, watches, apps, etc.)
4. If the transcript is empty, unclear, or doesn't provide enough content, respond with an error
5. Every hook, post, script, and blog must be directly derived from the transcript content
6. Stay true to the speaker's actual words, ideas, and message
7. SUBJECT MATCH CHECK: Before generating, verify the transcript relates to the expected topic.${videoTitle ? ` The video title is: "${videoTitle}".` : ""} If the transcript appears to be an advertisement for an unrelated product (like Apple Watch, iPhone, etc.) or doesn't match the expected topic, return ONLY this JSON: {"error": "INVALID_TRANSCRIPT_DATA", "message": "The transcript appears to be advertisement content and does not match the video topic."}
8. Do NOT use outside knowledge or generate generic marketing text about products not mentioned in the transcript

${brandVoiceContext}
${socialProofContext}

TONE: ${tone || "professional"}
TARGET AUDIENCE: ${audience || "general"}

Generate the following content based STRICTLY on the transcript:

1. **FIVE VIRAL X (TWITTER) HOOKS** - Craft opening lines using actual insights from the transcript:
   - Be under 280 characters
   - Use power words, curiosity gaps, or contrarian takes FROM THE TRANSCRIPT
   - Must reflect the actual topic discussed
   - Do NOT prefix hooks with labels like "Hook 1:", "Hook 2:", etc. — write them as clean, natural standalone tweets
   - IMPORTANT: After generating all 5 hooks, score each one for viral potential based on: curiosity gap strength, bold claim power, emotional trigger, and shareability. Return the 0-based index of the strongest hook as "primaryHookIndex"

2. **ONE PROFESSIONAL LINKEDIN POST** - Create a post using the Problem-Agitation-Solution framework:
   - Hook: Start with a bold statement or question FROM THE TRANSCRIPT (1-2 lines)
   - Problem: Identify the pain point discussed in the video
   - Agitation: Amplify the consequences mentioned by the speaker
   - Solution: Present the key insights from the transcript as the answer
   - CTA: End with engagement prompt
   - Length: 300-500 words, use line breaks for readability
   - HASHTAGS (MANDATORY): After the final sentence, add TWO line breaks (\\n\\n), then include 3-5 relevant hashtags based on the transcript topic (e.g., #Nvidia #GTC2026 #AIChips #TechNews). Choose hashtags that reflect the key subjects, technologies, people, or events discussed. ALWAYS end with #VidLogicAI as the final hashtag. Format: each hashtag separated by a space on a single line.

3. **THREE TIKTOK VIDEO SCRIPTS** - Write scripts based on transcript content:
   - Do NOT include timestamps like [0:00-0:03] or time markers
   - Do NOT include speaker labels like "Speaker A:", "Speaker 1:", "Host:", or any name followed by colon
   - Do NOT include hashtags in the script text
   - CRITICAL AUDIO PERFORMANCE RULES (You are an Audio Performance Director for ElevenLabs v3):
     * ONLY USE these EXACT single-word audio tags (the voice AI performs these as sounds):
       - [laugh] - for laughter
       - [giggle] - for light laughter
       - [sigh] - for sighing
       - [gasp] - for surprise/shock
       - [excited] - for energetic delivery
       - [whisper] - for quiet/intimate delivery
     * NEVER use plural forms like [laughs], [chuckles], [sighs] - ONLY use: [laugh], [giggle], [sigh], [gasp], [excited], [whisper]
     * NEVER USE visual action tags - the AI will literally READ these words aloud:
       - FORBIDDEN: [gestures], [smiling], [winks], [nods], [points], [leans], [walks], [waves], [looks], [stares], [grins], [frowns], [shrugs], [gestures wildly], [chuckles], [laughs], [sighs]
     * Use ellipses (...) for natural pauses and dashes (—) for abrupt breaks
     * Use ALL CAPS for words needing extra emphasis
     * Place tags AFTER the line: "I can't believe I did that! [laugh]"
   - Start every script with ... to prime the v3 model for better first-word delivery
   - Write in conversational, energetic tone
   - Each script should focus on ONE key takeaway FROM THE TRANSCRIPT
   - The script should read naturally as spoken dialogue, optimized for text-to-speech conversion

4. **ONE SEO-OPTIMIZED BLOG POST** - Write an article based on transcript content:
   - Compelling H1 title with primary keyword from the topic
   - Introduction with hook and thesis FROM THE TRANSCRIPT
   - 3-4 H2 subheadings organizing key points discussed
   - Actionable takeaways mentioned by the speaker
   - CRITICAL: If REAL CUSTOMER TESTIMONIALS were provided above, you MUST integrate at least 2 of those exact quotes into the blog. This is MANDATORY, not optional. Attribute them accurately. Do NOT fabricate any quotes.
   - Conclusion with CTA
   - Approximately 500 words

CRITICAL: Return ONLY a valid JSON object with NO markdown code fences. The response must be parseable JSON.
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

    // Smart transcript truncation for long videos
    // If transcript > 10,000 chars, take first 5,000 + last 5,000 to capture intro and conclusion
    let processedTranscript = transcript;
    const MAX_TOTAL_LENGTH = 10000;
    const CHUNK_SIZE = 5000;
    
    if (transcript.length > MAX_TOTAL_LENGTH) {
      const firstPart = transcript.substring(0, CHUNK_SIZE);
      const lastPart = transcript.substring(transcript.length - CHUNK_SIZE);
      processedTranscript = `${firstPart}\n\n[... middle portion omitted for length - this is a ${Math.round(transcript.length / 1000)}k character transcript ...]\n\n${lastPart}`;
      console.log(`Transcript truncated: ${transcript.length} -> ${processedTranscript.length} chars`);
    }

    const userPrompt = `Here is the YouTube video transcript to repurpose. Generate content ONLY from this text - do not add external information:

---
${processedTranscript}
---

Extract the most compelling insights, stories, and actionable advice FROM THIS TRANSCRIPT ONLY. Generate the multi-platform content following the exact JSON format specified. Return ONLY valid JSON, no code fences.`;

    console.log("Calling OpenAI API with gpt-4o-mini...");

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

    console.log("OpenAI API response status:", response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
       // NOTE: 402 is used by the AI gateway for project-level credit exhaustion.
       // We purposely map it to 503 so the client doesn't confuse it with *user* credit exhaustion.
       if (response.status === 402) {
         return new Response(
           JSON.stringify({
             code: "AI_CREDITS_EXHAUSTED",
             error: "AI service credits are exhausted for this project. Please add more credits to continue.",
           }),
           { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
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

    try {
      let generatedContent = extractAndParseJSON(content);
      
      // Validate the structure
      if (!generatedContent.twitterHooks || !generatedContent.linkedinPost || 
          !generatedContent.shortFormScripts || !generatedContent.blogPost) {
        throw new Error("Missing required fields in generated content");
      }

      console.log("Successfully generated content");

      // If translation is requested, translate the content
      if (translateTo && translateTo !== "none") {
        console.log("Translating content to:", translateTo);
        try {
          generatedContent = await translateContent(generatedContent, translateTo, brandVoice, OPENAI_API_KEY);
          console.log("Translation successful");
        } catch (translateError) {
          console.error("Translation failed:", translateError);
          // Return original content with a warning
          return new Response(
            JSON.stringify({ 
              ...generatedContent, 
              translationWarning: "Translation failed, returning original content" 
            }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }

      return new Response(
        JSON.stringify(generatedContent),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } catch (parseError) {
      console.error("Failed to parse AI response:", parseError);
      console.error("Content was:", content);
      
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
