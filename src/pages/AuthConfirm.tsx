import { useEffect, useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, CheckCircle, XCircle, Rocket } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function AuthConfirm() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");

  useEffect(() => {
    const verify = async () => {
      const tokenHash = searchParams.get("token_hash");
      const type = (searchParams.get("type") as "signup" | "email" | "recovery" | "invite") || "signup";

      if (!tokenHash) {
        setStatus("error");
        return;
      }

      try {
        const { error } = await supabase.auth.verifyOtp({
          token_hash: tokenHash,
          type,
        });

        if (error) {
          console.error("[AuthConfirm] Verification error:", error.message);
          setStatus("error");
          return;
        }

        if (type === "recovery") {
          navigate("/reset-password", { replace: true });
          return;
        }

        setStatus("success");
        setTimeout(() => navigate("/dashboard", { replace: true }), 2000);
      } catch (err) {
        console.error("[AuthConfirm] Unexpected error:", err);
        setStatus("error");
      }
    };

    verify();
  }, [navigate, searchParams]);

  return (
    <div className="min-h-screen bg-background">
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

      <main className="container mx-auto px-4 py-16 max-w-md">
        <Card className="border-border bg-card">
          <CardHeader className="text-center">
            {status === "loading" && (
              <>
                <div className="mx-auto mb-4">
                  <Loader2 className="h-12 w-12 animate-spin text-primary" />
                </div>
                <CardTitle className="text-xl">Verifying Your Email</CardTitle>
                <CardDescription>Please wait while we confirm your email address...</CardDescription>
              </>
            )}
            {status === "success" && (
              <>
                <div className="mx-auto mb-4">
                  <CheckCircle className="h-12 w-12 text-primary" />
                </div>
                <CardTitle className="text-xl text-primary">Email Successfully Verified!</CardTitle>
                <CardDescription>Redirecting you to your dashboard...</CardDescription>
              </>
            )}
            {status === "error" && (
              <>
                <div className="mx-auto mb-4">
                  <XCircle className="h-12 w-12 text-destructive" />
                </div>
                <CardTitle className="text-xl text-destructive">Verification Failed</CardTitle>
                <CardDescription>The link has expired or has already been used.</CardDescription>
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
    </div>
  );
}
