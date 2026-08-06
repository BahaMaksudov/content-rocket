import { auth, defineMcp } from "@lovable.dev/mcp-js";
import listGenerations from "./tools/list-generations";
import getGeneration from "./tools/get-generation";
import listAgentCampaigns from "./tools/list-agent-campaigns";
import listBlogPosts from "./tools/list-blog-posts";
import getAccountSummary from "./tools/get-account-summary";

// Issuer must be the direct Supabase host, built from the inlined project ref.
const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "content-rocket",
  title: "Content Rocket",
  version: "0.1.0",
  instructions:
    "Tools for VidLogic AI (Content Rocket). Read the signed-in user's YouTube content generations, autonomous agent campaigns with key insights, published blog posts, and account/plan details.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [
    listGenerations,
    getGeneration,
    listAgentCampaigns,
    listBlogPosts,
    getAccountSummary,
  ],
});
