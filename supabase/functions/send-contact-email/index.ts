import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform",
};

interface ContactRequest {
  name: string;
  email: string;
  message: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    console.log("[SEND-CONTACT-EMAIL] Function started");

    const { name, email, message }: ContactRequest = await req.json();

    // Validate required fields
    if (!name || !email || !message) {
      console.error("[SEND-CONTACT-EMAIL] Missing required fields");
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log("[SEND-CONTACT-EMAIL] Sending email for:", { name, email });

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "Rocket Content <notifications@rocketcontentpro.io>",
        to: ["bmaksudov@gmail.com"],
        subject: `New Rocket Content Inquiry from ${name}`,
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #3B82F6, #8B5CF6); padding: 20px; border-radius: 12px 12px 0 0;">
              <h1 style="color: white; margin: 0; font-size: 24px;">🚀 New Contact Form Submission</h1>
            </div>
            <div style="background: #1a1a2e; padding: 30px; border-radius: 0 0 12px 12px; color: #e0e0e0;">
              <h2 style="color: #3B82F6; margin-top: 0;">Contact Details</h2>
              <p style="margin: 10px 0;"><strong style="color: #a0a0a0;">Name:</strong> ${name}</p>
              <p style="margin: 10px 0;"><strong style="color: #a0a0a0;">Email:</strong> <a href="mailto:${email}" style="color: #3B82F6;">${email}</a></p>
              <h2 style="color: #3B82F6; margin-top: 30px;">Message</h2>
              <div style="background: #252547; padding: 20px; border-radius: 8px; border-left: 4px solid #3B82F6;">
                <p style="margin: 0; white-space: pre-wrap; line-height: 1.6;">${message}</p>
              </div>
              <hr style="border: none; border-top: 1px solid #333; margin: 30px 0;" />
              <p style="color: #888; font-size: 12px; margin: 0;">
                This email was sent from the Rocket Content contact form.
              </p>
            </div>
          </div>
        `,
        reply_to: email,
      }),
    });

    if (!res.ok) {
      const errorData = await res.text();
      console.error("[SEND-CONTACT-EMAIL] Resend API error:", errorData);
      throw new Error(`Failed to send email: ${errorData}`);
    }

    const data = await res.json();
    console.log("[SEND-CONTACT-EMAIL] Email sent successfully:", data);

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("[SEND-CONTACT-EMAIL] Error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Failed to send email" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
