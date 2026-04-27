// Facebook Page connection edge function.
// Securely exchanges a short-lived user access token for a long-lived Page Access Token,
// then stores the selected Page in agent_settings. The Facebook App Secret never leaves the server.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const FB_GRAPH = "https://graph.facebook.com/v21.0";

type Action = "connect" | "disconnect";

interface ConnectBody {
  action: "connect";
  short_lived_user_token: string;
  page_id: string;
}

interface DisconnectBody {
  action: "disconnect";
}

type RequestBody = ConnectBody | DisconnectBody;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return json({ error: "Unauthorized" }, 401);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claims, error: authError } = await supabase.auth.getClaims(token);
    if (authError || !claims?.claims) {
      return json({ error: "Unauthorized" }, 401);
    }
    const userId = claims.claims.sub as string;

    const body = (await req.json()) as RequestBody;

    if (body.action === "disconnect") {
      const { error } = await supabase
        .from("agent_settings")
        .update({
          facebook_page_id: null,
          facebook_page_name: null,
          facebook_page_access_token: null,
        })
        .eq("user_id", userId);
      if (error) throw new Error(error.message);
      return json({ success: true });
    }

    if (body.action !== "connect") {
      return json({ error: "Invalid action" }, 400);
    }

    const { short_lived_user_token, page_id } = body;
    if (!short_lived_user_token || !page_id) {
      return json({ error: "Missing short_lived_user_token or page_id" }, 400);
    }

    const appId = Deno.env.get("FACEBOOK_APP_ID");
    const appSecret = Deno.env.get("FACEBOOK_APP_SECRET");
    if (!appId || !appSecret) {
      return json({ error: "Facebook app credentials not configured on the server." }, 500);
    }

    // Step 1: exchange short-lived user token for a long-lived user token (~60 days).
    const llUrl = new URL(`${FB_GRAPH}/oauth/access_token`);
    llUrl.searchParams.set("grant_type", "fb_exchange_token");
    llUrl.searchParams.set("client_id", appId);
    llUrl.searchParams.set("client_secret", appSecret);
    llUrl.searchParams.set("fb_exchange_token", short_lived_user_token);

    const llRes = await fetch(llUrl.toString());
    const llData = await llRes.json();
    if (!llRes.ok || !llData.access_token) {
      return json(
        { error: llData?.error?.message || "Failed to exchange long-lived user token" },
        400,
      );
    }
    const longLivedUserToken = llData.access_token as string;

    // Step 2: fetch the user's pages with that long-lived user token.
    // Page Access Tokens derived from a long-lived user token do not expire ("never" tokens).
    const pagesUrl = new URL(`${FB_GRAPH}/me/accounts`);
    pagesUrl.searchParams.set("access_token", longLivedUserToken);
    pagesUrl.searchParams.set("fields", "id,name,access_token");

    const pagesRes = await fetch(pagesUrl.toString());
    const pagesData = await pagesRes.json();
    if (!pagesRes.ok || !Array.isArray(pagesData.data)) {
      return json(
        { error: pagesData?.error?.message || "Failed to load Facebook pages" },
        400,
      );
    }

    const page = pagesData.data.find((p: { id: string }) => p.id === page_id);
    if (!page) {
      return json({ error: "Selected page is not managed by this account." }, 400);
    }

    const pageAccessToken = page.access_token as string;
    const pageName = page.name as string;

    // Step 3: persist on agent_settings (upsert by user_id).
    const { data: existing } = await supabase
      .from("agent_settings")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();

    if (existing) {
      const { error } = await supabase
        .from("agent_settings")
        .update({
          facebook_page_id: page_id,
          facebook_page_name: pageName,
          facebook_page_access_token: pageAccessToken,
        })
        .eq("user_id", userId);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await supabase.from("agent_settings").insert({
        user_id: userId,
        facebook_page_id: page_id,
        facebook_page_name: pageName,
        facebook_page_access_token: pageAccessToken,
      });
      if (error) throw new Error(error.message);
    }

    return json({ success: true, page_id, page_name: pageName });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    console.error("[facebook-connect] error", message);
    return json({ error: message }, 500);
  }
});

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
