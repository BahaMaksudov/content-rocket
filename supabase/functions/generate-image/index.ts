import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { textContent, platform, targetLanguage } = await req.json();

    if (!textContent) {
      return new Response(
        JSON.stringify({ error: "Text content is required" }),
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

    console.log("Generating image for platform:", platform);

    // Generate a prompt based on the content
    const platformStyles: Record<string, string> = {
      twitter: "minimalist, bold, eye-catching social media graphic with modern typography",
      linkedin: "professional, corporate, sleek business banner with subtle gradients",
      shorts: "vibrant, dynamic, energetic video thumbnail with action elements",
      blog: "clean, editorial, hero image with sophisticated composition",
    };

    const style = platformStyles[platform] || platformStyles.blog;

    // Map language codes to full names
    const languageNames: Record<string, string> = {
      spanish: "Spanish",
      hindi: "Hindi",
      mandarin: "Mandarin Chinese",
      uzbek: "Uzbek",
      russian: "Russian",
    };

    const languageInstruction = targetLanguage && languageNames[targetLanguage]
      ? `IMPORTANT: Any text or typography in the image MUST be written in ${languageNames[targetLanguage]}. Use authentic ${languageNames[targetLanguage]} script and characters.`
      : "Any text in the image should be in English.";

    // First, generate an image prompt from the text content
    const promptResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `You are an expert at creating image prompts for AI image generation. Create a detailed, visually descriptive prompt based on the given text content. The style should be: ${style}. ${languageInstruction} Keep the prompt under 150 words and focus on visual elements, colors, and composition.`
          },
          {
            role: "user",
            content: `Create an image prompt based on this content:\n\n${textContent}`
          }
        ],
        max_tokens: 300,
      }),
    });

    if (!promptResponse.ok) {
      const errorText = await promptResponse.text();
      console.error("Prompt generation error:", promptResponse.status, errorText);
      throw new Error("Failed to generate image prompt");
    }

    const promptData = await promptResponse.json();
    const imagePrompt = promptData.choices?.[0]?.message?.content || textContent.substring(0, 100);

    console.log("Generated image prompt:", imagePrompt);

    // Now generate the actual image using DALL-E 3
    const imageResponse = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "dall-e-3",
        prompt: imagePrompt,
        n: 1,
        size: "1024x1024",
        quality: "standard",
      }),
    });

    if (!imageResponse.ok) {
      const errorText = await imageResponse.text();
      console.error("Image generation error:", imageResponse.status, errorText);
      
      if (imageResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      if (imageResponse.status === 401) {
        return new Response(
          JSON.stringify({ error: "Invalid OpenAI API key. Please check your configuration." }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      throw new Error("Failed to generate image");
    }

    const imageData = await imageResponse.json();
    const imageUrl = imageData.data?.[0]?.url;

    if (!imageUrl) {
      console.error("No image in response:", JSON.stringify(imageData));
      throw new Error("No image generated");
    }

    console.log("Successfully generated image");

    return new Response(
      JSON.stringify({ imageUrl, prompt: imagePrompt }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error generating image:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: "Failed to generate image", details: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
