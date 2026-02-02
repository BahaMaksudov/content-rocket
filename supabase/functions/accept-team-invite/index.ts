import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const logStep = (step: string, details?: Record<string, unknown>) => {
  console.log(`[ACCEPT-INVITE] ${step}`, details ? JSON.stringify(details) : "");
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      throw new Error("Unauthorized");
    }
    logStep("User authenticated", { userId: user.id, email: user.email });

    const { token } = await req.json();
    
    if (!token) {
      throw new Error("Invite token is required");
    }

    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Find the invite
    const { data: invite, error: inviteError } = await adminClient
      .from("organization_invites")
      .select("*, organizations(name)")
      .eq("token", token)
      .is("accepted_at", null)
      .gt("expires_at", new Date().toISOString())
      .single();

    if (inviteError || !invite) {
      logStep("Invalid or expired invite", { error: inviteError?.message });
      return new Response(
        JSON.stringify({ error: "invalid_invite", message: "This invite is invalid or has expired" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify email matches
    if (invite.email.toLowerCase() !== user.email?.toLowerCase()) {
      logStep("Email mismatch", { inviteEmail: invite.email, userEmail: user.email });
      return new Response(
        JSON.stringify({ 
          error: "email_mismatch", 
          message: `This invite was sent to ${invite.email}. Please sign in with that email address.` 
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if already a member
    const { data: existingMember } = await adminClient
      .from("organization_members")
      .select("id")
      .eq("organization_id", invite.organization_id)
      .eq("user_id", user.id)
      .single();

    if (existingMember) {
      // Mark invite as accepted anyway
      await adminClient
        .from("organization_invites")
        .update({ accepted_at: new Date().toISOString() })
        .eq("id", invite.id);

      return new Response(
        JSON.stringify({ success: true, message: "You are already a member of this team" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Add user as member
    const { error: memberError } = await adminClient
      .from("organization_members")
      .insert({
        organization_id: invite.organization_id,
        user_id: user.id,
        role: "member",
        invited_by: invite.invited_by,
      });

    if (memberError) {
      logStep("Failed to add member", { error: memberError.message });
      throw new Error("Failed to join team");
    }

    // Mark invite as accepted
    await adminClient
      .from("organization_invites")
      .update({ accepted_at: new Date().toISOString() })
      .eq("id", invite.id);

    logStep("Member added successfully", { 
      organizationId: invite.organization_id,
      userId: user.id 
    });

    return new Response(
      JSON.stringify({ 
        success: true, 
        organizationId: invite.organization_id,
        organizationName: invite.organizations?.name || "Team"
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    logStep("Error", { error: errorMessage });
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
