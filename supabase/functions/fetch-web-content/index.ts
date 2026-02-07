import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const json = (body: unknown, init?: ResponseInit) =>
    new Response(JSON.stringify(body), {
      ...init,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
        ...(init?.headers ?? {}),
      },
    });

  try {
    const { url } = await req.json();

    if (!url || typeof url !== "string") {
      return json({ error: "URL is required" }, { status: 400 });
    }

    // Normalize URL
    let normalizedUrl = url.trim();
    if (!/^https?:\/\//i.test(normalizedUrl)) {
      normalizedUrl = `https://${normalizedUrl}`;
    }

    console.log("Fetching web content for:", normalizedUrl);

    const jinaApiKey = Deno.env.get("JINA_API_KEY");

    const headers: Record<string, string> = {
      Accept: "application/json",
    };

    if (jinaApiKey) {
      headers["Authorization"] = `Bearer ${jinaApiKey}`;
      headers["X-Return-Format"] = "markdown";
    }

    const response = await fetch(`https://r.jina.ai/${normalizedUrl}`, {
      method: "GET",
      headers,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Jina Reader error: ${response.status} - ${errorText}`);
      return json(
        {
          error: "Could not fetch page content",
          transcript: null,
          title: null,
          details: `Jina Reader returned status ${response.status}`,
        },
        { status: 502 }
      );
    }

    const data = await response.json();

    const content = data?.data?.content || data?.content || "";
    const title = data?.data?.title || data?.title || "Web Page";

    if (!content || content.length < 50) {
      console.log("Page content too short or empty:", content.length);
      return json({
        error: "Page content too short or empty. The page may require JavaScript or authentication.",
        transcript: null,
        title,
      });
    }

    // Truncate very long content (web pages can be huge)
    const MAX_CONTENT_LENGTH = 30000;
    const truncatedContent =
      content.length > MAX_CONTENT_LENGTH
        ? content.substring(0, MAX_CONTENT_LENGTH) + "\n\n[Content truncated...]"
        : content;

    console.log(
      `Web content fetched — title: "${title}", length: ${truncatedContent.length} chars`
    );

    return json({
      transcript: truncatedContent,
      title,
    });
  } catch (error) {
    console.error("Fetch web content error:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    return json(
      { error: "Failed to fetch web page content", details: errorMessage },
      { status: 500 }
    );
  }
});
