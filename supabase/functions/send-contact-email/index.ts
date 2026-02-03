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

// Rate limiting store (in-memory, resets on function restart)
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(ip: string, maxRequests = 5, windowMs = 3600000): boolean {
  const now = Date.now();
  const limit = rateLimitStore.get(ip);
  
  // Clean up old entries periodically
  if (rateLimitStore.size > 1000) {
    for (const [key, val] of rateLimitStore) {
      if (val.resetAt < now) rateLimitStore.delete(key);
    }
  }
  
  if (!limit || limit.resetAt < now) {
    rateLimitStore.set(ip, { count: 1, resetAt: now + windowMs });
    return true;
  }
  
  if (limit.count >= maxRequests) {
    return false;
  }
  
  limit.count++;
  return true;
}

// Input validation
function validateContactInput(input: unknown, fieldName: string, minLength: number, maxLength: number): string {
  if (typeof input !== "string") {
    throw new Error(`${fieldName} must be a string`);
  }
  
  const sanitized = input.trim().replace(/\0/g, "");
  
  if (sanitized.length < minLength) {
    throw new Error(`${fieldName} must be at least ${minLength} characters`);
  }
  
  if (sanitized.length > maxLength) {
    throw new Error(`${fieldName} must be less than ${maxLength} characters`);
  }
  
  return sanitized;
}

function validateEmail(email: string): string {
  const sanitized = email.trim().toLowerCase();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  
  if (!emailRegex.test(sanitized)) {
    throw new Error("Please enter a valid email address");
  }
  
  if (sanitized.length > 255) {
    throw new Error("Email must be less than 255 characters");
  }
  
  return sanitized;
}

// Sanitize HTML content to prevent XSS in email
function sanitizeForHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    console.log("[SEND-CONTACT-EMAIL] Function started");

    // Rate limiting by IP
    const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || 
                     req.headers.get("x-real-ip") || 
                     "unknown";
    
    if (!checkRateLimit(clientIp, 5, 3600000)) { // 5 emails per hour
      console.log("[SEND-CONTACT-EMAIL] Rate limit exceeded for IP:", clientIp);
      return new Response(
        JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
        { status: 429, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    let body;
    try {
      body = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ error: "Invalid request body" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Validate all inputs
    let name: string;
    let email: string;
    let message: string;

    try {
      name = validateContactInput(body.name, "Name", 1, 100);
      email = validateEmail(body.email);
      message = validateContactInput(body.message, "Message", 10, 2000);
    } catch (validationError) {
      const errorMessage = validationError instanceof Error ? validationError.message : "Invalid input";
      console.log("[SEND-CONTACT-EMAIL] Validation error:", errorMessage);
      return new Response(
        JSON.stringify({ error: errorMessage }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Sanitize for HTML output
    const safeName = sanitizeForHtml(name);
    const safeEmail = sanitizeForHtml(email);
    const safeMessage = sanitizeForHtml(message);

    console.log("[SEND-CONTACT-EMAIL] Sending email for:", { name: safeName, email: safeEmail });

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "Rocket Content <notifications@rocketcontentpro.io>",
        to: ["bmaksudov@gmail.com"],
        subject: `New Rocket Content Inquiry from ${safeName}`,
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #3B82F6, #8B5CF6); padding: 20px; border-radius: 12px 12px 0 0;">
              <h1 style="color: white; margin: 0; font-size: 24px;">🚀 New Contact Form Submission</h1>
            </div>
            <div style="background: #1a1a2e; padding: 30px; border-radius: 0 0 12px 12px; color: #e0e0e0;">
              <h2 style="color: #3B82F6; margin-top: 0;">Contact Details</h2>
              <p style="margin: 10px 0;"><strong style="color: #a0a0a0;">Name:</strong> ${safeName}</p>
              <p style="margin: 10px 0;"><strong style="color: #a0a0a0;">Email:</strong> <a href="mailto:${safeEmail}" style="color: #3B82F6;">${safeEmail}</a></p>
              <h2 style="color: #3B82F6; margin-top: 30px;">Message</h2>
              <div style="background: #252547; padding: 20px; border-radius: 8px; border-left: 4px solid #3B82F6;">
                <p style="margin: 0; white-space: pre-wrap; line-height: 1.6;">${safeMessage}</p>
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
