import { useEffect, useRef, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, CheckCircle, XCircle } from "lucide-react";

type OAuthPlatform = "x" | "linkedin";

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const clearPendingOAuth = () => {
  localStorage.removeItem("oauth_pending_platform");
  localStorage.removeItem("oauth_pending_state");
  localStorage.removeItem("oauth_pending_started_at");
};

const normalizePlatform = (value: string | null): OAuthPlatform | null => {
  if (value === "x" || value === "linkedin") return value;
  return null;
};

export default function OAuthSocialCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const handledRef = useRef(false);
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("Connecting your account...");

  useEffect(() => {
    if (!user || handledRef.current) return;
    handledRef.current = true;

    const completeWithDelay = (nextStatus: "success" | "error", nextMessage: string, ms = 2500) => {
      setStatus(nextStatus);
      setMessage(nextMessage);
      setTimeout(() => navigate("/agent/settings"), ms);
    };

    const checkExistingConnection = async (platformHint: OAuthPlatform | null) => {
      const { data, error } = await supabase
        .from("agent_settings")
        .select("x_refresh_token, x_username, linkedin_access_token, linkedin_name")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error || !data) return null;

      if (platformHint === "x" && data.x_refresh_token) {
        return `✅ Connected to X as @${data.x_username || "your account"}`;
      }

      if (platformHint === "linkedin" && data.linkedin_access_token) {
        return `✅ Connected to LinkedIn as ${data.linkedin_name || "your account"}`;
      }

      return null;
    };

    const trySilentRecovery = async (platformHint: OAuthPlatform | null) => {
      await wait(500);
      const recoveredMessage = await checkExistingConnection(platformHint);
      if (!recoveredMessage) return false;

      clearPendingOAuth();
      completeWithDelay("success", recoveredMessage, 2500);
      return true;
    };

    const handleCallback = async () => {
      const code = searchParams.get("code");
      const state = searchParams.get("state");
      const error = searchParams.get("error");
      const pendingPlatform = normalizePlatform(localStorage.getItem("oauth_pending_platform"));

      if (error) {
        clearPendingOAuth();
        completeWithDelay("error", `Authorization denied: ${error}`, 3000);
        return;
      }

      if (!code || !state) {
        if (await trySilentRecovery(pendingPlatform)) return;
        clearPendingOAuth();
        completeWithDelay("error", "Missing authorization data. Please try again.", 3000);
        return;
      }

      try {
        let platform: OAuthPlatform | null = pendingPlatform;

        const stored = localStorage.getItem(`oauth_state_${state}`);
        if (stored) {
          localStorage.removeItem(`oauth_state_${state}`);
          const parsed = JSON.parse(stored) as { platform?: OAuthPlatform };
          platform = normalizePlatform(parsed.platform ?? null);
        }

        if (!platform) {
          if (await trySilentRecovery(pendingPlatform)) return;
          throw new Error("OAuth session expired. Please try connecting again.");
        }

        const redirectUri = `${window.location.origin}/oauth/social/callback`;

        if (platform === "x") {
          const verifierKey = `oauth_x_verifier_${state}`;
          const code_verifier = localStorage.getItem(verifierKey) || localStorage.getItem("x_code_verifier");

          localStorage.removeItem(verifierKey);
          localStorage.removeItem("x_code_verifier");

          if (!code_verifier) {
            if (await trySilentRecovery("x")) return;
            throw new Error("PKCE session expired. Please try connecting again.");
          }

          const { data, error: fnError } = await supabase.functions.invoke("auth-callback-x", {
            body: { code, code_verifier, redirect_uri: redirectUri, user_id: user.id },
          });

          if (fnError || data?.error) {
            throw new Error(data?.error || fnError?.message || "X connection failed");
          }

          clearPendingOAuth();
          completeWithDelay("success", `✅ Connected to X as @${data.username || "your account"}`, 2500);
          return;
        }

        const { data, error: fnError } = await supabase.functions.invoke("auth-callback-linkedin", {
          body: { code, redirect_uri: redirectUri, user_id: user.id },
        });

        if (fnError || data?.error) {
          throw new Error(data?.error || fnError?.message || "LinkedIn connection failed");
        }

        clearPendingOAuth();
        completeWithDelay("success", `✅ Connected to LinkedIn as ${data.name || "your account"}`, 2500);
      } catch (e: any) {
        console.error("OAuth callback error:", e);

        const syncIssue = /expired|Missing authorization/i.test(e?.message || "");
        if (syncIssue && (await trySilentRecovery(pendingPlatform))) return;

        clearPendingOAuth();
        completeWithDelay("error", e.message || "Connection failed. Please try again.", 3000);
      }
    };

    handleCallback();
  }, [user, searchParams, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-4 p-8">
        {status === "loading" && <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />}
        {status === "success" && <CheckCircle className="h-12 w-12 text-primary mx-auto" />}
        {status === "error" && <XCircle className="h-12 w-12 text-destructive mx-auto" />}
        <p className="text-lg font-medium">{message}</p>
        <p className="text-sm text-muted-foreground">Redirecting to Agent Settings...</p>
      </div>
    </div>
  );
}
