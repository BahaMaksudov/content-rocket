import { useEffect, useState } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, CheckCircle, Rocket, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { toast as sonnerToast } from "sonner";
export default function AuthCallback() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [errorMessage, setErrorMessage] = useState("");

  // Process invite token after successful auth
  const processInviteAfterAuth = async (token: string | null) => {
    if (!token) return;
    
    try {
      console.log("[AuthCallback] Processing team invite token");
      const response = await supabase.functions.invoke("accept-team-invite", {
        body: { token },
      });

      if (response.error) {
        console.error("[AuthCallback] Invite acceptance error:", response.error);
        sonnerToast.error("Failed to join team", {
          description: response.error.message || "Please try again or contact support",
        });
        return;
      }

      const data = response.data;
      if (data?.success) {
        sonnerToast.success(`Welcome to ${data.organizationName || "the team"}!`, {
          description: "You've successfully joined the team.",
        });
      } else if (data?.error === "email_mismatch") {
        sonnerToast.error("Email Mismatch", {
          description: data.message,
        });
      } else if (data?.error === "invalid_invite") {
        sonnerToast.error("Invalid Invite", {
          description: "This invite link is invalid or has expired.",
        });
      }
    } catch (error) {
      console.error("[AuthCallback] Invite processing error:", error);
    }
  };

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        const currentOrigin = window.location.origin;
        const currentUrl = window.location.href;
        console.log(`[AuthCallback] Processing callback on: ${currentOrigin}`);
        console.log(`[AuthCallback] Full URL: ${currentUrl}`);
        
        // Check for errors first (can be in hash or query params)
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const queryParams = new URLSearchParams(window.location.search);
        
        const error = hashParams.get("error") || queryParams.get("error");
        const errorDescription = hashParams.get("error_description") || queryParams.get("error_description");

        if (error) {
          console.error(`[AuthCallback] Error received: ${error} - ${errorDescription}`);
          setStatus("error");
          setErrorMessage(errorDescription || "Email verification failed");
          return;
        }

        // Check for invite token in URL (team invitation flow)
        const inviteToken = searchParams.get("invite");
        
        // Method 1: Check for tokens in hash (implicit flow)
        const accessToken = hashParams.get("access_token");
        const refreshToken = hashParams.get("refresh_token");
        
        // Method 2: Check for code in query params (PKCE flow - common on mobile)
        const code = queryParams.get("code");

        // Check for auth type (e.g., 'invite' for team invites)
        const authType = hashParams.get("type") || queryParams.get("type");
        console.log(`[AuthCallback] Auth type: ${authType}, Invite token: ${inviteToken ? "present" : "none"}`);

        if (accessToken && refreshToken) {
          console.log("[AuthCallback] Setting session from hash tokens (implicit flow)");
          const { error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });

          if (sessionError) {
            console.error("[AuthCallback] Session error:", sessionError.message);
            setStatus("error");
            setErrorMessage(sessionError.message);
            return;
          }

          // Handle password recovery - redirect to reset password page
          if (authType === "recovery") {
            console.log("[AuthCallback] Recovery flow detected - redirecting to reset password");
            navigate("/reset-password", { replace: true });
            return;
          }

          // Handle invite type - process team invite if present
          if (authType === "invite" || inviteToken) {
            console.log("[AuthCallback] Invite flow detected - processing team invite");
            await processInviteAfterAuth(inviteToken);
          }

          setStatus("success");
          console.log("[AuthCallback] Success via implicit flow - redirecting to dashboard");
          setTimeout(() => {
            navigate("/dashboard", { replace: true });
          }, 2000);
        } else if (code) {
          // PKCE flow: Exchange code for session
          console.log("[AuthCallback] Exchanging code for session (PKCE flow)");
          const { data: codeData, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

          if (exchangeError) {
            console.error("[AuthCallback] Code exchange error:", exchangeError.message);
            setStatus("error");
            setErrorMessage(exchangeError.message);
            return;
          }

          // Check if this is a recovery flow via PKCE
          // The type param may be in query params for PKCE recovery
          const pkceType = queryParams.get("type");
          if (pkceType === "recovery") {
            console.log("[AuthCallback] Recovery flow detected via PKCE - redirecting to reset password");
            navigate("/reset-password", { replace: true });
            return;
          }

          setStatus("success");
          console.log("[AuthCallback] Success via PKCE flow - redirecting to dashboard");
          setTimeout(() => {
            navigate("/dashboard", { replace: true });
          }, 2000);
        } else if (inviteToken) {
          // Handle invite token without session - redirect to auth page with token
          console.log("[AuthCallback] Invite token found but no session - redirecting to auth page");
          navigate(`/auth?invite=${inviteToken}`, { replace: true });
          return;
        } else {
          // No tokens or code - check if there's already an active session
          console.log("[AuthCallback] No tokens/code in URL, checking existing session");
          const { data: { session } } = await supabase.auth.getSession();
          
          if (session) {
            console.log("[AuthCallback] Existing session found - redirecting to dashboard");
            setStatus("success");
            setTimeout(() => {
              navigate("/dashboard", { replace: true });
            }, 2000);
          } else {
            console.error("[AuthCallback] No session found - retrying after sync delay");
            console.log("[AuthCallback] Hash params:", Object.fromEntries(hashParams));
            console.log("[AuthCallback] Query params:", Object.fromEntries(queryParams));

            await new Promise((resolve) => setTimeout(resolve, 500));
            const { data: { session: retrySession } } = await supabase.auth.getSession();

            if (retrySession) {
              console.log("[AuthCallback] Session appeared after delay - redirecting to dashboard");
              setStatus("success");
              setTimeout(() => {
                navigate("/dashboard", { replace: true });
              }, 2000);
            } else {
              setStatus("error");
              setErrorMessage("Invalid or expired verification link. Please try signing up again.");
            }
          }
        }
      } catch (err) {
        console.error("[AuthCallback] Unexpected error:", err);
        setStatus("error");
        setErrorMessage("An unexpected error occurred");
      }
    };

    handleAuthCallback();
  }, [navigate, searchParams, toast]);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-lg sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center">
          <Link to="/" className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-primary to-rocket flex items-center justify-center">
              <Rocket className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="font-bold text-lg">VidLogic AI</span>
          </Link>
        </div>
      </header>

      {/* Content */}
      <main className="container mx-auto px-4 py-16 max-w-md">
        <Card className="border-border bg-card">
          <CardHeader className="text-center">
            {status === "loading" && (
              <>
                <div className="mx-auto mb-4">
                  <Loader2 className="h-12 w-12 animate-spin text-primary" />
                </div>
                <CardTitle className="text-xl">Verifying Your Email</CardTitle>
                <CardDescription>
                  Please wait while we confirm your email address...
                </CardDescription>
              </>
            )}

            {status === "success" && (
              <>
                <div className="mx-auto mb-4">
                  <CheckCircle className="h-12 w-12 text-primary" />
                </div>
                <CardTitle className="text-xl text-primary">Email Successfully Verified!</CardTitle>
                <CardDescription>
                  Redirecting you to your dashboard...
                </CardDescription>
              </>
            )}

            {status === "error" && (
              <>
                <div className="mx-auto mb-4">
                  <XCircle className="h-12 w-12 text-destructive" />
                </div>
                <CardTitle className="text-xl text-destructive">Verification Failed</CardTitle>
                <CardDescription>
                  {errorMessage}
                </CardDescription>
              </>
            )}
          </CardHeader>

          {status === "error" && (
            <CardContent className="flex flex-col gap-3">
              <Button asChild className="w-full">
                <Link to="/auth">Back to Sign In</Link>
              </Button>
            </CardContent>
          )}

          {status === "success" && (
            <CardContent>
              <Button asChild variant="outline" className="w-full">
                <Link to="/dashboard">Go to Dashboard Now</Link>
              </Button>
            </CardContent>
          )}
        </Card>
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-8 mt-16">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          © {new Date().getFullYear()} Rocket Content. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
