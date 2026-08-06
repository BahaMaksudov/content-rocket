import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_agent_campaigns",
  title: "List agent campaigns",
  description:
    "List campaigns produced by the autonomous content agent, including key insights and drafted social posts.",
  inputSchema: {
    limit: z.number().int().min(1).max(25).default(5).describe("Max campaigns to return."),
    status: z
      .string()
      .optional()
      .describe("Optional status filter, e.g. 'pending' or 'published'."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ limit, status }, ctx) => {
    if (!ctx.isAuthenticated())
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    const supabase = supabaseForUser(ctx);
    let query = supabase
      .from("agent_campaigns")
      .select(
        "id, video_title, youtube_url, insights, x_thread, linkedin_post, facebook_post, status, created_at",
      )
      .order("created_at", { ascending: false })
      .limit(limit ?? 5);

    if (status) query = query.eq("status", status);

    const { data, error } = await query;
    if (error)
      return { content: [{ type: "text", text: error.message }], isError: true };

    return {
      content: [{ type: "text", text: JSON.stringify(data ?? [], null, 2) }],
      structuredContent: { campaigns: data ?? [] },
    };
  },
});
