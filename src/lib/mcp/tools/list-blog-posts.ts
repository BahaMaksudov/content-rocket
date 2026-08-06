import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_blog_posts",
  title: "List published blog posts",
  description:
    "List blog posts published by the content engine, with slug, TL;DR and key insights.",
  inputSchema: {
    limit: z.number().int().min(1).max(50).default(10).describe("Max posts to return."),
    search: z.string().trim().min(1).optional().describe("Optional title keyword filter."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ limit, search }, ctx) => {
    if (!ctx.isAuthenticated())
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    const supabase = supabaseForUser(ctx);
    let query = supabase
      .from("public_blog_posts")
      .select(
        "id, slug, title, tl_dr, insights, meta_description, youtube_url, author_name, published, created_at",
      )
      .eq("published", true)
      .order("created_at", { ascending: false })
      .limit(limit ?? 10);

    if (search) query = query.ilike("title", `%${search}%`);

    const { data, error } = await query;
    if (error)
      return { content: [{ type: "text", text: error.message }], isError: true };

    return {
      content: [{ type: "text", text: JSON.stringify(data ?? [], null, 2) }],
      structuredContent: { posts: data ?? [] },
    };
  },
});
