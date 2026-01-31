import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, CheckCircle, Rocket, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function AuthCallback() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        const currentOrigin = window.location.origin;
        console.log(`[AuthCallback] Processing callback on: ${currentOrigin}`);
        
        // Get the hash fragment from the URL (Supabase sends tokens in the hash)
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const accessToken = hashParams.get("access_token");
        const refreshToken = hashParams.get("refresh_token");
        const error = hashParams.get("error");
        const errorDescription = hashParams.get("error_description");

        if (error) {
          console.error(`[AuthCallback] Error received: ${error} - ${errorDescription}`);
          setStatus("error");
          setErrorMessage(errorDescription || "Email verification failed");
          return;
        }

        if (accessToken && refreshToken) {
          console.log("[AuthCallback] Setting session from tokens");
          // Set the session with the tokens from the URL
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

          setStatus("success");
          console.log("[AuthCallback] Success - redirecting to dashboard");
          // Redirect to dashboard after showing success message
          // Using replace to ensure we stay on the current domain
          setTimeout(() => {
            navigate("/dashboard", { replace: true });
          }, 2000);
        } else {
          // Try to get existing session (user might already be verified)
          console.log("[AuthCallback] No tokens in URL, checking existing session");
          const { data: { session } } = await supabase.auth.getSession();
          
          if (session) {
            console.log("[AuthCallback] Existing session found - redirecting to dashboard");
            setStatus("success");
            setTimeout(() => {
              navigate("/dashboard", { replace: true });
            }, 2000);
          } else {
            console.error("[AuthCallback] No session found - invalid verification link");
            setStatus("error");
            setErrorMessage("Invalid or expired verification link");
          }
        }
      } catch (err) {
        console.error("[AuthCallback] Unexpected error:", err);
        setStatus("error");
        setErrorMessage("An unexpected error occurred");
      }
    };

    handleAuthCallback();
  }, [navigate]);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-lg sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center">
          <Link to="/" className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-primary to-rocket flex items-center justify-center">
              <Rocket className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="font-bold text-lg">Rocket Content</span>
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
