import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { Resend } from "https://esm.sh/resend@4.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Email template styles matching landing page branding
const baseStyles = {
  fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  backgroundColor: "#0a0e1a",
  color: "#f8fafc",
};

const primaryColor = "#3b82f6"; // Electric Blue
const rocketOrange = "#f97316";
const cardBg = "#111827";
const mutedText = "#94a3b8";
const borderColor = "#1e293b";

// Generate unsubscribe URL
function getUnsubscribeUrl(userId: string, origin: string): string {
  return `${origin}/api/unsubscribe?user_id=${userId}`;
}

// Email 1: The Quick Win (Immediate)
function getEmail1Html(userName: string, unsubscribeUrl: string): string {
  const greeting = userName ? `Hey ${userName}` : "Hey there";
  
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to Rocket Content!</title>
</head>
<body style="margin: 0; padding: 0; background-color: ${baseStyles.backgroundColor}; font-family: ${baseStyles.fontFamily};">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: ${baseStyles.backgroundColor}; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: ${cardBg}; border-radius: 16px; border: 1px solid ${borderColor}; overflow: hidden;">
          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 20px; text-align: center; background: linear-gradient(135deg, ${primaryColor}20, ${rocketOrange}10);">
              <div style="display: inline-block; width: 60px; height: 60px; background: linear-gradient(135deg, ${primaryColor}, ${rocketOrange}); border-radius: 16px; line-height: 60px; font-size: 28px; margin-bottom: 20px;">🚀</div>
              <h1 style="color: ${baseStyles.color}; font-size: 28px; margin: 0 0 10px; font-weight: 700;">You're Cleared for Takeoff!</h1>
              <p style="color: ${mutedText}; font-size: 16px; margin: 0;">Your content creation journey starts now</p>
            </td>
          </tr>
          
          <!-- Body -->
          <tr>
            <td style="padding: 30px 40px;">
              <p style="color: ${baseStyles.color}; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">
                ${greeting}, 🎉
              </p>
              <p style="color: ${mutedText}; font-size: 16px; line-height: 1.6; margin: 0 0 25px;">
                Welcome to <strong style="color: ${baseStyles.color};">Rocket Content</strong>! You've just joined thousands of creators who are turning their videos into viral content across every platform.
              </p>
              
              <!-- Pro Tip Box -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background: linear-gradient(135deg, ${primaryColor}15, ${rocketOrange}10); border-radius: 12px; border-left: 4px solid ${primaryColor}; margin-bottom: 25px;">
                <tr>
                  <td style="padding: 20px;">
                    <p style="color: ${primaryColor}; font-size: 14px; font-weight: 600; margin: 0 0 8px; text-transform: uppercase; letter-spacing: 0.5px;">💡 Pro Tip</p>
                    <p style="color: ${baseStyles.color}; font-size: 15px; line-height: 1.6; margin: 0;">
                      <strong>Get your first X thread in under 60 seconds:</strong> Just paste any YouTube URL, hit "Generate All," and watch as we create a viral-ready thread, LinkedIn post, TikTok script, AND blog post—all at once!
                    </p>
                  </td>
                </tr>
              </table>
              
              <p style="color: ${mutedText}; font-size: 16px; line-height: 1.6; margin: 0 0 30px;">
                Ready to see the magic? Your first content transformation is just one click away.
              </p>
              
              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <a href="https://rocketcontent.app/dashboard" style="display: inline-block; background: linear-gradient(135deg, ${primaryColor}, #60a5fa); color: white; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 15px ${primaryColor}40;">
                      🚀 Launch My First Video
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 30px 40px; border-top: 1px solid ${borderColor}; text-align: center;">
              <p style="color: ${mutedText}; font-size: 13px; margin: 0 0 15px;">
                Questions? Just reply to this email—we read every message.
              </p>
              <p style="color: ${mutedText}; font-size: 12px; margin: 0;">
                Rocket Content • Transform your content, amplify your reach
              </p>
              <p style="margin: 15px 0 0;">
                <a href="${unsubscribeUrl}" style="color: ${mutedText}; font-size: 12px; text-decoration: underline;">Unsubscribe from emails</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
}

// Email 2: The Global Growth (Day 1)
function getEmail2Html(userName: string, unsubscribeUrl: string): string {
  const greeting = userName ? `Hey ${userName}` : "Hey";
  
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Unlock Global Reach</title>
</head>
<body style="margin: 0; padding: 0; background-color: ${baseStyles.backgroundColor}; font-family: ${baseStyles.fontFamily};">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: ${baseStyles.backgroundColor}; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: ${cardBg}; border-radius: 16px; border: 1px solid ${borderColor}; overflow: hidden;">
          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 20px; text-align: center; background: linear-gradient(135deg, #22c55e20, ${primaryColor}10);">
              <div style="display: inline-block; width: 60px; height: 60px; background: linear-gradient(135deg, #22c55e, #10b981); border-radius: 16px; line-height: 60px; font-size: 28px; margin-bottom: 20px;">🌍</div>
              <h1 style="color: ${baseStyles.color}; font-size: 28px; margin: 0 0 10px; font-weight: 700;">Did You Know You Speak 3 Languages?</h1>
              <p style="color: ${mutedText}; font-size: 16px; margin: 0;">Reach billions more with one click</p>
            </td>
          </tr>
          
          <!-- Body -->
          <tr>
            <td style="padding: 30px 40px;">
              <p style="color: ${baseStyles.color}; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">
                ${greeting} 👋
              </p>
              <p style="color: ${mutedText}; font-size: 16px; line-height: 1.6; margin: 0 0 25px;">
                Here's something most creators don't realize: <strong style="color: ${baseStyles.color};">you're already a multilingual content machine</strong>—you just don't know it yet.
              </p>
              
              <!-- Feature Box -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0f172a; border-radius: 12px; margin-bottom: 25px;">
                <tr>
                  <td style="padding: 25px;">
                    <p style="color: #22c55e; font-size: 14px; font-weight: 600; margin: 0 0 15px; text-transform: uppercase; letter-spacing: 0.5px;">🌐 Global Reach Feature</p>
                    <p style="color: ${baseStyles.color}; font-size: 15px; line-height: 1.6; margin: 0 0 15px;">
                      With Rocket Content's <strong>Global Reach</strong> toggle, you can instantly translate all your generated content into:
                    </p>
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="padding: 8px 0;">
                          <span style="display: inline-block; background: ${primaryColor}20; color: ${primaryColor}; padding: 6px 12px; border-radius: 6px; font-size: 14px; font-weight: 500;">🇪🇸 Spanish</span>
                          <span style="display: inline-block; background: ${rocketOrange}20; color: ${rocketOrange}; padding: 6px 12px; border-radius: 6px; font-size: 14px; font-weight: 500; margin-left: 8px;">🇮🇳 Hindi</span>
                          <span style="display: inline-block; background: #22c55e20; color: #22c55e; padding: 6px 12px; border-radius: 6px; font-size: 14px; font-weight: 500; margin-left: 8px;">🇨🇳 Mandarin</span>
                        </td>
                      </tr>
                    </table>
                    <p style="color: ${mutedText}; font-size: 14px; line-height: 1.6; margin: 15px 0 0;">
                      The best part? It maintains your <strong style="color: ${baseStyles.color};">Brand Voice</strong> perfectly—same tone, same style, just a different language.
                    </p>
                  </td>
                </tr>
              </table>
              
              <p style="color: ${mutedText}; font-size: 16px; line-height: 1.6; margin: 0 0 30px;">
                That's access to <strong style="color: ${baseStyles.color};">2.5+ billion potential new followers</strong> without writing a single extra word.
              </p>
              
              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <a href="https://rocketcontent.app/dashboard" style="display: inline-block; background: linear-gradient(135deg, #22c55e, #10b981); color: white; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 15px #22c55e40;">
                      🌍 Try Global Reach Now
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 30px 40px; border-top: 1px solid ${borderColor}; text-align: center;">
              <p style="color: ${mutedText}; font-size: 13px; margin: 0 0 15px;">
                Have a language request? Reply and let us know!
              </p>
              <p style="color: ${mutedText}; font-size: 12px; margin: 0;">
                Rocket Content • Transform your content, amplify your reach
              </p>
              <p style="margin: 15px 0 0;">
                <a href="${unsubscribeUrl}" style="color: ${mutedText}; font-size: 12px; text-decoration: underline;">Unsubscribe from emails</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
}

// Email 3: The Success Story (Day 3)
function getEmail3Html(userName: string, unsubscribeUrl: string): string {
  const greeting = userName ? `Hey ${userName}` : "Hey";
  
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>How Sarah Saved 20 Hours This Week</title>
</head>
<body style="margin: 0; padding: 0; background-color: ${baseStyles.backgroundColor}; font-family: ${baseStyles.fontFamily};">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: ${baseStyles.backgroundColor}; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: ${cardBg}; border-radius: 16px; border: 1px solid ${borderColor}; overflow: hidden;">
          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 20px; text-align: center; background: linear-gradient(135deg, ${rocketOrange}20, ${primaryColor}10);">
              <div style="display: inline-block; width: 60px; height: 60px; background: linear-gradient(135deg, ${rocketOrange}, #fb923c); border-radius: 16px; line-height: 60px; font-size: 28px; margin-bottom: 20px;">⭐</div>
              <h1 style="color: ${baseStyles.color}; font-size: 28px; margin: 0 0 10px; font-weight: 700;">How Sarah Saved 20 Hours This Week</h1>
              <p style="color: ${mutedText}; font-size: 16px; margin: 0;">A real creator's story with Rocket Content</p>
            </td>
          </tr>
          
          <!-- Body -->
          <tr>
            <td style="padding: 30px 40px;">
              <p style="color: ${baseStyles.color}; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">
                ${greeting} 👋
              </p>
              <p style="color: ${mutedText}; font-size: 16px; line-height: 1.6; margin: 0 0 25px;">
                I wanted to share something inspiring with you...
              </p>
              
              <!-- Case Study Box -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0f172a; border-radius: 12px; margin-bottom: 25px; border-left: 4px solid ${rocketOrange};">
                <tr>
                  <td style="padding: 25px;">
                    <p style="color: ${rocketOrange}; font-size: 14px; font-weight: 600; margin: 0 0 15px; text-transform: uppercase; letter-spacing: 0.5px;">📖 Success Story</p>
                    <p style="color: ${baseStyles.color}; font-size: 15px; line-height: 1.6; margin: 0 0 15px;">
                      <strong>Sarah Chen</strong>, a tech educator with 150K YouTube subscribers, used to spend <strong style="color: #ef4444;">25+ hours per week</strong> manually repurposing her video content.
                    </p>
                    <p style="color: ${mutedText}; font-size: 15px; line-height: 1.6; margin: 0 0 15px;">
                      Now? She uploads one video, clicks "Generate All," and in 60 seconds has:
                    </p>
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr><td style="padding: 4px 0; color: ${baseStyles.color}; font-size: 14px;">✅ 5 viral X thread hooks</td></tr>
                      <tr><td style="padding: 4px 0; color: ${baseStyles.color}; font-size: 14px;">✅ 1 LinkedIn post (PAS framework)</td></tr>
                      <tr><td style="padding: 4px 0; color: ${baseStyles.color}; font-size: 14px;">✅ 3 TikTok/Reels scripts with timestamps</td></tr>
                      <tr><td style="padding: 4px 0; color: ${baseStyles.color}; font-size: 14px;">✅ 1 SEO-optimized blog post</td></tr>
                    </table>
                    <p style="color: #22c55e; font-size: 16px; font-weight: 600; margin: 20px 0 0;">
                      "I got my Sundays back. Rocket Content literally changed my life." — Sarah
                    </p>
                  </td>
                </tr>
              </table>
              
              <!-- Feature Highlight -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background: linear-gradient(135deg, ${primaryColor}15, ${rocketOrange}10); border-radius: 12px; margin-bottom: 25px;">
                <tr>
                  <td style="padding: 20px;">
                    <p style="color: ${primaryColor}; font-size: 14px; font-weight: 600; margin: 0 0 8px;">⚡ Her Secret Weapon: Multi-Platform Batching</p>
                    <p style="color: ${mutedText}; font-size: 14px; line-height: 1.6; margin: 0;">
                      Instead of writing for each platform separately, Sarah generates ALL content at once—and with unlimited exports on Pro, she never hits a wall.
                    </p>
                  </td>
                </tr>
              </table>
              
              <p style="color: ${mutedText}; font-size: 16px; line-height: 1.6; margin: 0 0 30px;">
                Ready to get your time back? <strong style="color: ${baseStyles.color};">Upgrade to Pro</strong> for unlimited exports, AI visuals, and global translation.
              </p>
              
              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <a href="https://rocketcontent.app/auth" style="display: inline-block; background: linear-gradient(135deg, ${rocketOrange}, #fb923c); color: white; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 15px ${rocketOrange}40;">
                      ⭐ Upgrade to Pro
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 30px 40px; border-top: 1px solid ${borderColor}; text-align: center;">
              <p style="color: ${mutedText}; font-size: 13px; margin: 0 0 15px;">
                Thanks for being part of the Rocket Content community!
              </p>
              <p style="color: ${mutedText}; font-size: 12px; margin: 0;">
                Rocket Content • Transform your content, amplify your reach
              </p>
              <p style="margin: 15px 0 0;">
                <a href="${unsubscribeUrl}" style="color: ${mutedText}; font-size: 12px; text-decoration: underline;">Unsubscribe from emails</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
}

// Logging helper
const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[WELCOME-EMAILS] ${step}${detailsStr}`);
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const resendKey = Deno.env.get("RESEND_API_KEY");
    if (!resendKey) {
      throw new Error("RESEND_API_KEY is not configured");
    }

    const resend = new Resend(resendKey);
    
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false }
    });

    const { action, user_id, user_email, user_name } = await req.json();
    logStep("Request received", { action, user_id, user_email });

    const origin = req.headers.get("origin") || "https://rocketcontent.app";

    // Handle different actions
    if (action === "send_immediate") {
      // Send Email 1 immediately for new signup
      logStep("Sending immediate welcome email");

      // Check if user is unsubscribed
      const { data: tracking } = await supabase
        .from("welcome_email_tracking")
        .select("unsubscribed, email_1_sent_at")
        .eq("user_id", user_id)
        .maybeSingle();

      if (tracking?.unsubscribed) {
        logStep("User is unsubscribed, skipping email");
        return new Response(JSON.stringify({ success: true, skipped: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (tracking?.email_1_sent_at) {
        logStep("Email 1 already sent, skipping");
        return new Response(JSON.stringify({ success: true, skipped: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const unsubscribeUrl = getUnsubscribeUrl(user_id, origin);
      const htmlContent = getEmail1Html(user_name || "", unsubscribeUrl);

      const { error: emailError } = await resend.emails.send({
        from: "Rocket Content <notifications@rocketcontentpro.io>",
        replyTo: "notifications@rocketcontentpro.io",
        to: [user_email],
        subject: "🚀 You're cleared for takeoff! (Plus a gift inside)",
        html: htmlContent,
      });

      if (emailError) {
        throw new Error(`Failed to send email: ${emailError.message}`);
      }

      // Update tracking
      await supabase
        .from("welcome_email_tracking")
        .update({ email_1_sent_at: new Date().toISOString() })
        .eq("user_id", user_id);

      logStep("Email 1 sent successfully");

    } else if (action === "process_scheduled") {
      // Process scheduled emails (called by cron)
      logStep("Processing scheduled emails");

      const now = new Date().toISOString();

      // Get users who need Email 2 (24h after signup)
      const { data: needEmail2 } = await supabase
        .from("welcome_email_tracking")
        .select("*")
        .is("email_2_sent_at", null)
        .not("email_1_sent_at", "is", null)
        .lte("email_2_scheduled_for", now)
        .eq("unsubscribed", false)
        .limit(50);

      logStep("Users needing Email 2", { count: needEmail2?.length || 0 });

      for (const user of needEmail2 || []) {
        try {
          const unsubscribeUrl = getUnsubscribeUrl(user.user_id, origin);
          const htmlContent = getEmail2Html(user.user_name || "", unsubscribeUrl);

          await resend.emails.send({
            from: "Rocket Content <notifications@rocketcontentpro.io>",
            replyTo: "notifications@rocketcontentpro.io",
            to: [user.user_email],
            subject: "Did you know you speak 3 languages? 🌍",
            html: htmlContent,
          });

          await supabase
            .from("welcome_email_tracking")
            .update({ email_2_sent_at: new Date().toISOString() })
            .eq("user_id", user.user_id);

          logStep("Email 2 sent", { userId: user.user_id });
        } catch (err) {
          logStep("Error sending Email 2", { userId: user.user_id, error: String(err) });
        }
      }

      // Get users who need Email 3 (3 days after signup)
      const { data: needEmail3 } = await supabase
        .from("welcome_email_tracking")
        .select("*")
        .is("email_3_sent_at", null)
        .not("email_2_sent_at", "is", null)
        .lte("email_3_scheduled_for", now)
        .eq("unsubscribed", false)
        .limit(50);

      logStep("Users needing Email 3", { count: needEmail3?.length || 0 });

      for (const user of needEmail3 || []) {
        try {
          const unsubscribeUrl = getUnsubscribeUrl(user.user_id, origin);
          const htmlContent = getEmail3Html(user.user_name || "", unsubscribeUrl);

          await resend.emails.send({
            from: "Rocket Content <notifications@rocketcontentpro.io>",
            replyTo: "notifications@rocketcontentpro.io",
            to: [user.user_email],
            subject: "How Sarah saved 20 hours this week ⭐",
            html: htmlContent,
          });

          await supabase
            .from("welcome_email_tracking")
            .update({ email_3_sent_at: new Date().toISOString() })
            .eq("user_id", user.user_id);

          logStep("Email 3 sent", { userId: user.user_id });
        } catch (err) {
          logStep("Error sending Email 3", { userId: user.user_id, error: String(err) });
        }
      }

      logStep("Scheduled email processing complete");

    } else if (action === "unsubscribe") {
      // Handle unsubscribe
      logStep("Processing unsubscribe", { userId: user_id });

      await supabase
        .from("welcome_email_tracking")
        .update({ unsubscribed: true })
        .eq("user_id", user_id);

      logStep("User unsubscribed successfully");
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
