const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const xClientId = Deno.env.get("X_CLIENT_ID") || "";
  const linkedinClientId = Deno.env.get("LINKEDIN_CLIENT_ID") || "";

  return new Response(
    JSON.stringify({ x_client_id: xClientId, linkedin_client_id: linkedinClientId }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});
