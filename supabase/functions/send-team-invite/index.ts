import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const AGENCY_SEAT_LIMIT = 5;

interface InviteRequest {
  email: string;
  organizationId: string;
}

const logStep = (step: string, details?: Record<string, unknown>) => {
  console.log(`[TEAM-INVITE] ${step}`, details ? JSON.stringify(details) : "");
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
    logStep("User authenticated", { userId: user.id });

    const { email, organizationId }: InviteRequest = await req.json();
    
    if (!email || !organizationId) {
      throw new Error("Email and organizationId are required");
    }

    // Verify user is an admin of this organization
    const { data: membership, error: membershipError } = await supabaseClient
      .from("organization_members")
      .select("role")
      .eq("organization_id", organizationId)
      .eq("user_id", user.id)
      .single();

    if (membershipError || !membership || membership.role !== "admin") {
      throw new Error("Only organization admins can invite members");
    }
    logStep("Admin verified");

    // Check seat limit
    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { count: memberCount } = await adminClient
      .from("organization_members")
      .select("*", { count: "exact", head: true })
      .eq("organization_id", organizationId);

    const { count: pendingInviteCount } = await adminClient
      .from("organization_invites")
      .select("*", { count: "exact", head: true })
      .eq("organization_id", organizationId)
      .is("accepted_at", null)
      .gt("expires_at", new Date().toISOString());

    const totalSeats = (memberCount || 0) + (pendingInviteCount || 0);
    logStep("Seat count", { memberCount, pendingInviteCount, totalSeats });

    if (totalSeats >= AGENCY_SEAT_LIMIT) {
      return new Response(
        JSON.stringify({
          error: "seat_limit_reached",
          message: `Your Agency plan is limited to ${AGENCY_SEAT_LIMIT} team members. Contact sales for Enterprise plans with unlimited seats.`,
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if email is already a member
    const { data: existingMember } = await adminClient
      .from("profiles")
      .select("user_id")
      .eq("email", email)
      .single();

    if (existingMember) {
      const { data: alreadyMember } = await adminClient
        .from("organization_members")
        .select("id")
        .eq("organization_id", organizationId)
        .eq("user_id", existingMember.user_id)
        .single();

      if (alreadyMember) {
        return new Response(
          JSON.stringify({ error: "already_member", message: "This user is already a team member" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Check for existing pending invite
    const { data: existingInvite } = await adminClient
      .from("organization_invites")
      .select("id")
      .eq("organization_id", organizationId)
      .eq("email", email)
      .is("accepted_at", null)
      .gt("expires_at", new Date().toISOString())
      .single();

    if (existingInvite) {
      return new Response(
        JSON.stringify({ error: "invite_pending", message: "An invite has already been sent to this email" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get organization name
    const { data: org } = await adminClient
      .from("organizations")
      .select("name")
      .eq("id", organizationId)
      .single();

    // Get inviter's name
    const { data: inviterProfile } = await adminClient
      .from("profiles")
      .select("full_name, email")
      .eq("user_id", user.id)
      .single();

    // Create invite
    const { data: invite, error: inviteError } = await adminClient
      .from("organization_invites")
      .insert({
        organization_id: organizationId,
        email,
        invited_by: user.id,
      })
      .select()
      .single();

    if (inviteError) {
      logStep("Failed to create invite", { error: inviteError.message });
      throw new Error("Failed to create invite");
    }
    logStep("Invite created", { inviteId: invite.id });

    // Send invite email
    const inviteUrl = `${Deno.env.get("SUPABASE_URL")?.replace(".supabase.co", ".lovable.app")}/auth?invite=${invite.token}`;
    const inviterName = inviterProfile?.full_name || inviterProfile?.email || "A teammate";
    const orgName = org?.name || "a team";

    const { error: emailError } = await resend.emails.send({
      from: "RocketContent <notifications@rocketcontentpro.io>",
      to: [email],
      subject: `${inviterName} invited you to join ${orgName} on RocketContent`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background-color: #f5f5f5;">
          <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
            <div style="background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); border-radius: 16px 16px 0 0; padding: 40px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 28px;">🚀 You're Invited!</h1>
            </div>
            <div style="background: #ffffff; border-radius: 0 0 16px 16px; padding: 40px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
              <p style="font-size: 16px; color: #374151; line-height: 1.6;">
                <strong>${inviterName}</strong> has invited you to join <strong>${orgName}</strong> on RocketContent Pro.
              </p>
              <p style="font-size: 16px; color: #374151; line-height: 1.6;">
                RocketContent Pro helps teams transform YouTube videos into multi-platform content with AI-powered generation.
              </p>
              <div style="text-align: center; margin: 32px 0;">
                <a href="${inviteUrl}" style="display: inline-block; background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">
                  Accept Invitation
                </a>
              </div>
              <p style="font-size: 14px; color: #6b7280; text-align: center;">
                This invitation expires in 7 days.
              </p>
            </div>
            <p style="text-align: center; margin-top: 24px; font-size: 12px; color: #9ca3af;">
              © 2026 RocketContent Pro. All rights reserved.
            </p>
          </div>
        </body>
        </html>
      `,
    });

    if (emailError) {
      logStep("Failed to send email", { error: emailError });
      // Don't fail the request, invite is still created
    } else {
      logStep("Invite email sent");
    }

    return new Response(
      JSON.stringify({ success: true, inviteId: invite.id }),
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
