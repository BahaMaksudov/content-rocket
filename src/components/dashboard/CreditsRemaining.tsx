import { Progress } from "@/components/ui/progress";
import { useCredits } from "@/hooks/use-credits";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { BarChart3, ArrowUpRight } from "lucide-react";
import { Link } from "react-router-dom";

export function CreditsRemaining() {
  const { tier, loading: subscriptionLoading } = useSubscription();
  const { creditsUsed, creditLimit, hasCredits, loading: creditsLoading } = useCredits();

  // Wait for BOTH subscription and credits to load before rendering
  if (subscriptionLoading || creditsLoading) {
    return (
      <div className="px-4 py-3 bg-sidebar-accent/30 rounded-lg animate-pulse">
        <div className="h-4 bg-muted rounded w-24 mb-2" />
        <div className="h-2 bg-muted rounded w-full" />
      </div>
    );
  }

  const creditsRemaining = Math.max(0, creditLimit - creditsUsed);
  const progressValue = Math.min(100, (creditsUsed / creditLimit) * 100);

  /** Format credit numbers: show decimal only when not whole */
  const fmt = (n: number) => Number.isInteger(n) ? String(n) : n.toFixed(1);
  const lowThreshold = tier === "agency" ? 50 : tier === "pro" ? 10 : tier === "starter" ? 3 : 1;
  const isLow = creditsRemaining <= lowThreshold && creditsRemaining > 0;
  const isExhausted = !hasCredits;

  const getNextTier = () => {
    if (tier === "free") return { name: "Starter", path: "/billing" };
    if (tier === "starter") return { name: "Pro", path: "/billing" };
    // Agency tier upgrade is coming soon — no next tier for Pro users
    if (tier === "pro") return null;
    return null;
  };

  const nextTier = getNextTier();

  return (
    <div className={`px-4 py-3 rounded-lg border ${
      isExhausted 
        ? "bg-destructive/10 border-destructive/30" 
        : isLow 
          ? "bg-warning/10 border-warning/30" 
          : "bg-sidebar-accent/30 border-sidebar-border"
    }`}>
      <div className="flex items-center justify-between text-sm mb-2">
        <span className="flex items-center gap-1.5 font-medium text-foreground">
          <BarChart3 className={`h-4 w-4 ${
            isExhausted ? "text-destructive" : isLow ? "text-warning" : "text-primary"
          }`} />
          Monthly Usage
        </span>
        <span className={`text-xs ${
          isExhausted ? "text-destructive" : isLow ? "text-warning" : "text-muted-foreground"
        }`}>
          {fmt(creditsUsed)} / {fmt(creditLimit)} used
        </span>
      </div>
      <Progress 
        value={progressValue} 
        className={`h-2 ${
          isExhausted 
            ? "[&>div]:bg-destructive" 
            : isLow 
              ? "[&>div]:bg-warning" 
              : ""
        }`}
      />
      <p className={`text-xs mt-2 ${isExhausted ? "text-destructive font-medium" : "text-muted-foreground"}`}>
        {isExhausted && nextTier ? (
          <Link 
            to={nextTier.path} 
            className="flex items-center gap-1 hover:underline"
          >
            0 credits left — Upgrade to {nextTier.name}
            <ArrowUpRight className="h-3 w-3" />
          </Link>
        ) : isExhausted ? (
          "0 credits remaining"
        ) : (
          `${fmt(creditsRemaining)} credits remaining`
        )}
      </p>
    </div>
  );
}
