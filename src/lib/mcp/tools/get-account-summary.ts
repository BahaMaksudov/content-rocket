import { defineTool } from "@lovable.dev/mcp-js";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "get_account_summary",
  title: "Get account summary",
  description:
    "Return the signed-in user's plan, remaining credits and agent configuration summary.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_input, ctx) => {
    if (!ctx.isAuthenticated())
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    const supabase = supabaseForUser(ctx);

    const [profile, subscription, agent] = await Promise.all([
      supabase.from("profiles").select("*").maybeSingle(),
      supabase.from("subscriptions").select("*").maybeSingle(),
      supabase.from("agent_settings").select("*").maybeSingle(),
    ]);

    const firstError = profile.error ?? subscription.error ?? agent.error;
    if (firstError)
      return { content: [{ type: "text", text: firstError.message }], isError: true };

    const summary = {
      email: ctx.getUserEmail() ?? null,
      profile: profile.data ?? null,
      subscription: subscription.data ?? null,
      agent_settings: agent.data ?? null,
    };

    return {
      content: [{ type: "text", text: JSON.stringify(summary, null, 2) }],
      structuredContent: summary,
    };
  },
});
