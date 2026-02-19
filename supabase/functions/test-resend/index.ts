import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@4.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  console.log("[TEST-RESEND] Function started");
  
  try {
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    
    if (!resendApiKey) {
      console.error("[TEST-RESEND] RESEND_API_KEY not found in environment");
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "RESEND_API_KEY not configured",
          details: "The RESEND_API_KEY secret is missing from environment"
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("[TEST-RESEND] RESEND_API_KEY found, length:", resendApiKey.length);

    const { to, subject, message } = await req.json();
    
    if (!to || !subject) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Missing required fields",
          details: "Both 'to' and 'subject' are required"
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[TEST-RESEND] Attempting to send test email to: ${to}`);

    const resend = new Resend(resendApiKey);

    const { data, error } = await resend.emails.send({
      from: "VidLogic AI <notifications@vidlogicai.com>",
      replyTo: "support@vidlogicai.com",
      to: [to],
      subject: subject,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #3b82f6;">🧪 Resend Connection Test</h1>
          <p style="color: #333; font-size: 16px;">${message || "This is a test email to verify Resend is working correctly."}</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
          <p style="color: #666; font-size: 14px;">
            <strong>Sent at:</strong> ${new Date().toISOString()}<br>
            <strong>From domain:</strong> vidlogicai.com<br>
            <strong>Status:</strong> If you're reading this, Resend is working! ✅
          </p>
        </div>
      `,
    });

    if (error) {
      console.error("[TEST-RESEND] Resend API error:", JSON.stringify(error));
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: error.message,
          details: error,
          apiKeyPrefix: resendApiKey.substring(0, 8) + "..."
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("[TEST-RESEND] Email sent successfully:", JSON.stringify(data));

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Test email sent successfully!",
        emailId: data?.id,
        sentTo: to
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err: unknown) {
    const error = err as Error;
    console.error("[TEST-RESEND] Unexpected error:", error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error?.message || "Unknown error occurred",
        stack: error?.stack
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
