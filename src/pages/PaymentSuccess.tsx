import { useEffect, useState, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Rocket, CheckCircle, Mic2, Youtube, LayoutDashboard, Loader2 } from "lucide-react";
import confetti from "canvas-confetti";

type VerificationStatus = "verifying" | "success" | "pending" | "error";

export default function PaymentSuccess() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, loading: authLoading } = useAuth();
  const { checkSubscription, isPro, isAgency } = useSubscription();
  
  const [verificationStatus, setVerificationStatus] = useState<VerificationStatus>("verifying");
  const [displayName, setDisplayName] = useState<string>("");
  const [isRedirecting, setIsRedirecting] = useState(false);
  
  const sessionId = searchParams.get("session_id");

  // Check if user has an active paid subscription
  const hasPaidSubscription = isPro || isAgency;

  // Redirect to dashboard
  const redirectToDashboard = useCallback(() => {
    if (isRedirecting) return;
    setIsRedirecting(true);
    console.log("[PaymentSuccess] Redirecting to dashboard...");
    navigate("/dashboard", { replace: true });
  }, [navigate, isRedirecting]);

  // Fire confetti on mount
  useEffect(() => {
    const duration = 3000;
    const end = Date.now() + duration;

    const fireConfetti = () => {
      confetti({
        particleCount: 100,
        spread: 100,
        origin: { y: 0.6 },
        colors: ["#3b82f6", "#8b5cf6", "#06b6d4", "#10b981"],
      });

      if (Date.now() < end) {
        requestAnimationFrame(fireConfetti);
      }
    };

    setTimeout(fireConfetti, 300);
  }, []);

  // Redirect if not logged in or no session_id
  useEffect(() => {
    if (authLoading) return;

    if (!user || !sessionId) {
      navigate("/", { replace: true });
    }
  }, [user, sessionId, authLoading, navigate]);

  // Fetch user profile for personalization
  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) return;

      const { data } = await supabase
        .from("profiles")
        .select("full_name, email")
        .eq("user_id", user.id)
        .maybeSingle();

      if (data) {
        setDisplayName(data.full_name || data.email?.split("@")[0] || "Creator");
      } else {
        setDisplayName(user.email?.split("@")[0] || "Creator");
      }
    };

    fetchProfile();
  }, [user]);

  // If already pro/agency on mount, show success immediately
  useEffect(() => {
    if (hasPaidSubscription) {
      console.log("[PaymentSuccess] Already has paid subscription, showing success");
      setVerificationStatus("success");
    }
  }, [hasPaidSubscription]);

  // Set up Realtime subscription to detect when subscription status changes
  useEffect(() => {
    if (!user) return;

    console.log("[PaymentSuccess] Setting up Realtime subscription for user:", user.id);

    const channel = supabase
      .channel(`subscription-changes-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "subscriptions",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          console.log("[PaymentSuccess] Subscription update received:", payload);
          const newStatus = payload.new?.status;
          
          if (newStatus === "pro" || newStatus === "agency") {
            console.log("[PaymentSuccess] Subscription upgraded to:", newStatus);
            setVerificationStatus("success");
            // Refresh subscription context
            checkSubscription();
          }
        }
      )
      .subscribe((status) => {
        console.log("[PaymentSuccess] Realtime channel status:", status);
      });

    return () => {
      console.log("[PaymentSuccess] Cleaning up Realtime subscription");
      supabase.removeChannel(channel);
    };
  }, [user, checkSubscription]);

  // Polling fallback with longer timeout (webhook may take a few seconds)
  useEffect(() => {
    if (!user || !sessionId) return;
    if (hasPaidSubscription) return; // Already paid, skip polling

    let attempts = 0;
    const maxAttempts = 20; // 10 seconds total (500ms intervals)
    let timeoutId: NodeJS.Timeout;

    const verifySubscription = async () => {
      attempts++;
      console.log(`[PaymentSuccess] Polling attempt ${attempts}/${maxAttempts}`);
      
      try {
        await checkSubscription();
        
        const { data } = await supabase
          .from("subscriptions")
          .select("status")
          .eq("user_id", user.id)
          .maybeSingle();

        console.log("[PaymentSuccess] Current subscription status:", data?.status);

        if (data?.status === "pro" || data?.status === "agency") {
          setVerificationStatus("success");
          return;
        }

        if (attempts >= maxAttempts) {
          console.log("[PaymentSuccess] Max attempts reached, showing pending state");
          setVerificationStatus("pending");
          return;
        }

        timeoutId = setTimeout(verifySubscription, 500);
      } catch (error) {
        console.error("[PaymentSuccess] Error verifying subscription:", error);
        if (attempts >= maxAttempts) {
          setVerificationStatus("error");
        } else {
          timeoutId = setTimeout(verifySubscription, 500);
        }
      }
    };

    verifySubscription();

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [user, sessionId, hasPaidSubscription, checkSubscription]);

  const handleLaunchDashboard = () => {
    navigate("/dashboard");
  };

  const handleRefresh = () => {
    window.location.reload();
  };

  // Loading state
  if (authLoading || verificationStatus === "verifying") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="max-w-md w-full space-y-6 text-center">
          <Skeleton className="h-24 w-24 rounded-full mx-auto" />
          <Skeleton className="h-8 w-64 mx-auto" />
          <Skeleton className="h-4 w-48 mx-auto" />
          <p className="text-muted-foreground animate-pulse">
            Verifying your subscription...
          </p>
        </div>
      </div>
    );
  }

  // Pending state - webhook hasn't processed yet, but show dashboard button if already pro
  if (verificationStatus === "pending") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="max-w-md w-full space-y-6 text-center">
          <div className="h-24 w-24 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
            {hasPaidSubscription ? (
              <CheckCircle className="h-12 w-12 text-primary" />
            ) : (
              <Loader2 className="h-12 w-12 text-primary animate-spin" />
            )}
          </div>
          <h1 className="text-2xl font-bold text-foreground">
            {hasPaidSubscription ? "Upgrade Complete!" : "Processing Payment..."}
          </h1>
          <p className="text-muted-foreground">
            {hasPaidSubscription 
              ? "Your account has been upgraded. Click below to access your dashboard."
              : "Your payment is being processed. This usually takes a few seconds."
            }
          </p>
          <div className="flex flex-col gap-3">
            {hasPaidSubscription ? (
              <Button onClick={redirectToDashboard} className="w-full">
                <Rocket className="mr-2 h-4 w-4" />
                Go to Dashboard
              </Button>
            ) : (
              <>
                <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Waiting for confirmation...
                </div>
                <Button onClick={handleRefresh} variant="outline" className="w-full">
                  Refresh Page
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (verificationStatus === "error") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="max-w-md w-full space-y-6 text-center">
          <div className="h-24 w-24 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
            <Rocket className="h-12 w-12 text-destructive" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Something Went Wrong</h1>
          <p className="text-muted-foreground">
            We couldn't verify your subscription. Please try refreshing or contact support.
          </p>
          <div className="flex gap-3 justify-center">
            <Button onClick={handleRefresh} variant="outline">
              Refresh
            </Button>
            <Button onClick={() => navigate("/")}>
              Go Home
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Success state
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <div className="max-w-4xl w-full space-y-8">
        {/* Hero Section */}
        <div className="text-center space-y-6">
          <div className="relative inline-block">
            <div className="h-28 w-28 rounded-full bg-gradient-to-br from-primary via-primary/80 to-accent flex items-center justify-center mx-auto shadow-2xl shadow-primary/30 animate-scale-in">
              <CheckCircle className="h-14 w-14 text-primary-foreground" />
            </div>
            <div className="absolute -top-2 -right-2 h-10 w-10 rounded-full bg-accent flex items-center justify-center animate-bounce">
              <Rocket className="h-5 w-5 text-accent-foreground" />
            </div>
          </div>
          
          <div className="space-y-3 animate-fade-in">
            <h1 className="text-4xl md:text-5xl font-bold text-foreground">
              Payment Successful!
            </h1>
            <p className="text-xl text-muted-foreground max-w-lg mx-auto">
              Welcome to the inner circle, <span className="text-primary font-semibold">{displayName}</span>! 
              Your Content Rocket is now fully fueled. 🚀
            </p>
          </div>
        </div>

        {/* Next Steps Section */}
        <div className="space-y-4 animate-fade-in" style={{ animationDelay: "0.2s" }}>
          <h2 className="text-2xl font-semibold text-center text-foreground">
            Next Steps
          </h2>
          
          <div className="grid md:grid-cols-3 gap-4">
            <Card className="bg-card border-border hover:border-primary/50 transition-colors group">
              <CardHeader className="pb-3">
                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-2 group-hover:bg-primary/20 transition-colors">
                  <Mic2 className="h-6 w-6 text-primary" />
                </div>
                <CardTitle className="text-lg">1. Set Your Brand Voice</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Define your unique tone, style, and audience to make every piece of content unmistakably yours.
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="bg-card border-border hover:border-primary/50 transition-colors group">
              <CardHeader className="pb-3">
                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-2 group-hover:bg-primary/20 transition-colors">
                  <Youtube className="h-6 w-6 text-primary" />
                </div>
                <CardTitle className="text-lg">2. Paste Your First Link</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Drop in a YouTube URL and watch as we transform it into engaging multi-platform content.
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="bg-card border-border hover:border-primary/50 transition-colors group">
              <CardHeader className="pb-3">
                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-2 group-hover:bg-primary/20 transition-colors">
                  <LayoutDashboard className="h-6 w-6 text-primary" />
                </div>
                <CardTitle className="text-lg">3. View Your Dashboard</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Access all your tools, history, and premium features from your personalized command center.
                </CardDescription>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* CTA Button */}
        <div className="text-center animate-fade-in" style={{ animationDelay: "0.4s" }}>
          <Button 
            onClick={handleLaunchDashboard} 
            size="lg" 
            className="text-lg px-8 py-6 shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 transition-all"
          >
            <Rocket className="mr-2 h-5 w-5" />
            Launch Dashboard
          </Button>
        </div>
      </div>
    </div>
  );
}

