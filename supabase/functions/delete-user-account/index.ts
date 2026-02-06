import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    console.log("[delete-user-account] Starting account deletion process");

    // Get the authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      console.error("[delete-user-account] No authorization header provided");
      return new Response(
        JSON.stringify({ error: "No authorization header provided" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create a client with the user's JWT to verify their identity
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Verify the user's identity using their JWT
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: { Authorization: authHeader },
      },
    });

    const { data: { user }, error: userError } = await userClient.auth.getUser();

    if (userError || !user) {
      console.error("[delete-user-account] Failed to verify user:", userError?.message);
      return new Response(
        JSON.stringify({ error: "Unauthorized - invalid token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = user.id;
    console.log(`[delete-user-account] Verified user: ${userId}`);

    // Create admin client with service role key
    const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Delete all user data from tables (in order to handle foreign key constraints)
    console.log(`[delete-user-account] Cleaning up user data for user: ${userId}`);

    // 1. Delete organization invites where user is the inviter
    const { error: invitesError } = await adminClient
      .from("organization_invites")
      .delete()
      .eq("invited_by", userId);
    if (invitesError) {
      console.error("[delete-user-account] Error deleting organization_invites:", invitesError.message);
    }

    // 2. Delete organization members
    const { error: membersError } = await adminClient
      .from("organization_members")
      .delete()
      .eq("user_id", userId);
    if (membersError) {
      console.error("[delete-user-account] Error deleting organization_members:", membersError.message);
    }

    // 3. Delete organizations owned by the user
    const { error: orgsError } = await adminClient
      .from("organizations")
      .delete()
      .eq("owner_id", userId);
    if (orgsError) {
      console.error("[delete-user-account] Error deleting organizations:", orgsError.message);
    }

    // 4. Delete batch jobs
    const { error: batchError } = await adminClient
      .from("batch_jobs")
      .delete()
      .eq("user_id", userId);
    if (batchError) {
      console.error("[delete-user-account] Error deleting batch_jobs:", batchError.message);
    }

    // 5. Delete generations
    const { error: generationsError } = await adminClient
      .from("generations")
      .delete()
      .eq("user_id", userId);
    if (generationsError) {
      console.error("[delete-user-account] Error deleting generations:", generationsError.message);
    }

    // 6. Delete brand voices
    const { error: brandVoicesError } = await adminClient
      .from("brand_voices")
      .delete()
      .eq("user_id", userId);
    if (brandVoicesError) {
      console.error("[delete-user-account] Error deleting brand_voices:", brandVoicesError.message);
    }

    // 7. Delete user API keys
    const { error: apiKeysError } = await adminClient
      .from("user_api_keys")
      .delete()
      .eq("user_id", userId);
    if (apiKeysError) {
      console.error("[delete-user-account] Error deleting user_api_keys:", apiKeysError.message);
    }

    // 8. Delete user integrations
    const { error: integrationsError } = await adminClient
      .from("user_integrations")
      .delete()
      .eq("user_id", userId);
    if (integrationsError) {
      console.error("[delete-user-account] Error deleting user_integrations:", integrationsError.message);
    }

    // 9. Delete payment history
    const { error: paymentError } = await adminClient
      .from("payment_history")
      .delete()
      .eq("user_id", userId);
    if (paymentError) {
      console.error("[delete-user-account] Error deleting payment_history:", paymentError.message);
    }

    // 10. Delete welcome email tracking
    const { error: emailTrackingError } = await adminClient
      .from("welcome_email_tracking")
      .delete()
      .eq("user_id", userId);
    if (emailTrackingError) {
      console.error("[delete-user-account] Error deleting welcome_email_tracking:", emailTrackingError.message);
    }

    // 11. Delete subscriptions (must be before profiles due to FK constraint)
    const { error: subscriptionsError } = await adminClient
      .from("subscriptions")
      .delete()
      .eq("user_id", userId);
    if (subscriptionsError) {
      console.error("[delete-user-account] Error deleting subscriptions:", subscriptionsError.message);
    }

    // 12. Delete profile (last before auth deletion)
    const { error: profileError } = await adminClient
      .from("profiles")
      .delete()
      .eq("user_id", userId);
    if (profileError) {
      console.error("[delete-user-account] Error deleting profile:", profileError.message);
    }

    console.log(`[delete-user-account] User data cleanup complete for: ${userId}`);

    // Finally, delete the user from auth
    console.log(`[delete-user-account] Deleting user from auth: ${userId}`);
    const { error: deleteError } = await adminClient.auth.admin.deleteUser(userId);

    if (deleteError) {
      console.error("[delete-user-account] Failed to delete user from auth:", deleteError.message);
      return new Response(
        JSON.stringify({ error: `Failed to delete user: ${deleteError.message}` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[delete-user-account] Successfully deleted user: ${userId}`);

    return new Response(
      JSON.stringify({ success: true, message: "Account deleted successfully" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("[delete-user-account] Unexpected error:", error.message);
    return new Response(
      JSON.stringify({ error: error.message || "An unexpected error occurred" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
