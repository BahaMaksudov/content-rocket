import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, CheckCircle, XCircle } from "lucide-react";

export default function OAuthSocialCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("Connecting your account...");

  useEffect(() => {
    const handleCallback = async () => {
      const code = searchParams.get("code");
      const state = searchParams.get("state");
      const error = searchParams.get("error");

      if (error) {
        setStatus("error");
        setMessage(`Authorization denied: ${error}`);
        setTimeout(() => navigate("/agent/settings"), 3000);
        return;
      }

      if (!code || !state || !user) {
        setStatus("error");
        setMessage("Missing authorization data. Please try again.");
        setTimeout(() => navigate("/agent/settings"), 3000);
        return;
      }

      try {
        // Parse URL-safe base64 state to get platform and code_verifier
        const normalizedState = state.replace(/-/g, "+").replace(/_/g, "/");
        const paddedState = normalizedState + "=".repeat((4 - (normalizedState.length % 4)) % 4);
        const stateData = JSON.parse(atob(paddedState));
        const { platform, code_verifier } = stateData;
        const redirectUri = `${window.location.origin}/oauth/social/callback`;

        if (platform === "x") {
          const { data, error: fnError } = await supabase.functions.invoke("auth-callback-x", {
            body: { code, code_verifier, redirect_uri: redirectUri, user_id: user.id },
          });

          if (fnError || data?.error) {
            throw new Error(data?.error || fnError?.message || "X connection failed");
          }

          setStatus("success");
          setMessage(`✅ Connected to X as @${data.username || "your account"}`);
        } else if (platform === "linkedin") {
          const { data, error: fnError } = await supabase.functions.invoke("auth-callback-linkedin", {
            body: { code, redirect_uri: redirectUri, user_id: user.id },
          });

          if (fnError || data?.error) {
            throw new Error(data?.error || fnError?.message || "LinkedIn connection failed");
          }

          setStatus("success");
          setMessage(`✅ Connected to LinkedIn as ${data.name || "your account"}`);
        } else {
          throw new Error("Unknown platform");
        }
      } catch (e: any) {
        console.error("OAuth callback error:", e);
        setStatus("error");
        setMessage(e.message || "Connection failed. Please try again.");
      }

      setTimeout(() => navigate("/agent/settings"), 2500);
    };

    if (user) handleCallback();
  }, [user, searchParams, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-4 p-8">
        {status === "loading" && <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />}
        {status === "success" && <CheckCircle className="h-12 w-12 text-green-500 mx-auto" />}
        {status === "error" && <XCircle className="h-12 w-12 text-destructive mx-auto" />}
        <p className="text-lg font-medium">{message}</p>
        <p className="text-sm text-muted-foreground">Redirecting to Agent Settings...</p>
      </div>
    </div>
  );
}
