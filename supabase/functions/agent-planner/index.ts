import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // --- Auth ---
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = claimsData.claims.sub as string;

    // --- Parse input ---
    const { niche, platform, videos_per_week = 5, tone = "educational" } = await req.json();

    if (!niche || !platform) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: niche, platform" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // --- 1. Create the agent_goal ---
    const { data: goal, error: goalError } = await supabase
      .from("agent_goals")
      .insert({ user_id: userId, niche, platform, videos_per_week, tone })
      .select("id")
      .single();

    if (goalError) {
      console.error("Goal insert error:", goalError);
      return new Response(JSON.stringify({ error: "Failed to save goal", details: goalError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // --- 2. Fetch previous topics for memory ---
    const { data: previousPlans } = await supabase
      .from("content_plans")
      .select("topic")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(20);

    const previousTopics = (previousPlans || []).map((p: { topic: string }) => p.topic);
    const memoryClause = previousTopics.length > 0
      ? `\n\nIMPORTANT — TOPIC MEMORY: The user has already covered these topics. Do NOT repeat or closely duplicate any of them. Provide fresh angles and entirely new ideas:\n${previousTopics.map((t, i) => `${i + 1}. ${t}`).join("\n")}`
      : "";

    // --- 2b. Fetch positive feedback for preference learning ---
    const { data: positiveFeedback } = await supabase
      .from("content_feedback")
      .select("comment, plan_id")
      .eq("user_id", userId)
      .eq("rating", "👍")
      .order("created_at", { ascending: false })
      .limit(10);

    // Enrich feedback with the plan topics they liked
    let feedbackClause = "";
    if (positiveFeedback && positiveFeedback.length > 0) {
      const planIds = positiveFeedback.map((f: any) => f.plan_id);
      const { data: likedPlans } = await supabase
        .from("content_plans")
        .select("id, topic, hook_type")
        .in("id", planIds);

      const likedPlanMap: Record<string, { topic: string; hook_type: string | null }> = {};
      (likedPlans || []).forEach((p: any) => { likedPlanMap[p.id] = { topic: p.topic, hook_type: p.hook_type }; });

      const feedbackSummaries = positiveFeedback.map((f: any) => {
        const plan = likedPlanMap[f.plan_id];
        const topicInfo = plan ? `Topic: "${plan.topic}" (hook: ${plan.hook_type || "unknown"})` : "Unknown topic";
        const reason = f.comment ? ` — Reason: ${f.comment}` : "";
        return `- ${topicInfo}${reason}`;
      }).join("\n");

      feedbackClause = `\n\nUSER PREFERENCE SIGNAL — The user gave positive feedback (👍) to these previous content pieces. Analyze the patterns (hook styles, topic angles, formats) and strongly prioritize similar approaches in the new plan:\n${feedbackSummaries}`;
    }

    // --- 3. Call AI to generate content plan ---
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "AI service not configured" }), {
        status: 503,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const systemPrompt = `You are a Viral Content Strategist. Create a ${videos_per_week}-day content calendar for a ${niche} creator on ${platform}. Focus on high-retention topics. The tone should be ${tone}.${memoryClause}${feedbackClause}`;

    const userPrompt = `Generate exactly ${videos_per_week} viral video topics. Each topic must be specific, actionable, and optimized for ${platform}'s algorithm.${previousTopics.length > 0 ? " Confirm you have reviewed the previous topic history and ensure zero overlap." : ""}`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
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
        tools: [
          {
            type: "function",
            function: {
              name: "return_content_plan",
              description: "Return the content plan as a structured JSON array of topics.",
              parameters: {
                type: "object",
                properties: {
                  topics: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        day_number: { type: "integer", description: "Day number (1-based)" },
                        topic: { type: "string", description: "The video topic / title" },
                        hook_type: {
                          type: "string",
                          enum: ["question", "statistic", "story", "contrarian", "challenge"],
                          description: "The hook style to use",
                        },
                      },
                      required: ["day_number", "topic", "hook_type"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["topics"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "return_content_plan" } },
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error("AI gateway error:", aiResponse.status, errText);

      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again shortly." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add funds." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ error: "AI generation failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      console.error("No tool call in AI response:", JSON.stringify(aiData));
      return new Response(JSON.stringify({ error: "AI returned unexpected format" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { topics } = JSON.parse(toolCall.function.arguments);

    // --- 4. Save topics into content_plans ---
    const planRows = topics.map((t: { day_number: number; topic: string; hook_type: string }) => ({
      goal_id: goal.id,
      user_id: userId,
      day_number: t.day_number,
      topic: t.topic,
      hook_type: t.hook_type,
      status: "pending",
    }));

    const { data: plans, error: planError } = await supabase
      .from("content_plans")
      .insert(planRows)
      .select();

    if (planError) {
      console.error("Plan insert error:", planError);
      return new Response(JSON.stringify({ error: "Failed to save content plan", details: planError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({ goal_id: goal.id, plans }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("agent-planner error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
