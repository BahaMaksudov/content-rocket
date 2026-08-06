import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "get_generation",
  title: "Get generated content",
  description:
    "Fetch the full generated content for one generation: LinkedIn post, X hooks, short-form scripts, blog post.",
  inputSchema: {
    generation_id: z.string().uuid().describe("The generation's UUID."),
    include_transcript: z
      .boolean()
      .default(false)
      .describe("Include the source video transcript (can be long)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ generation_id, include_transcript }, ctx) => {
    if (!ctx.isAuthenticated())
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    const supabase = supabaseForUser(ctx);
    const columns =
      "id, video_title, youtube_url, linkedin_post, facebook_post, twitter_hooks, short_form_scripts, blog_post, tone, audience, target_language, created_at" +
      (include_transcript ? ", transcript" : "");

    const { data, error } = await supabase
      .from("generations")
      .select(columns)
      .eq("id", generation_id)
      .maybeSingle();

    if (error)
      return { content: [{ type: "text", text: error.message }], isError: true };
    if (!data)
      return {
        content: [{ type: "text", text: "No generation found with that id." }],
        isError: true,
      };

    return {
      content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      structuredContent: { generation: data },
    };
  },
});
