import { Progress } from "@/components/ui/progress";
import { useCredits, FREE_TIER_LIMIT } from "@/hooks/use-credits";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { BarChart3, Infinity, ArrowUpRight } from "lucide-react";
import { Link } from "react-router-dom";

export function CreditsRemaining() {
  const { tier } = useSubscription();
  const { creditsUsed, hasCredits, loading } = useCredits();
  
  const isUnlimited = tier === "pro" || tier === "agency";

  if (loading) {
    return (
      <div className="px-4 py-3 bg-sidebar-accent/30 rounded-lg animate-pulse">
        <div className="h-4 bg-muted rounded w-24 mb-2" />
        <div className="h-2 bg-muted rounded w-full" />
      </div>
    );
  }

  if (isUnlimited) {
    return (
      <div className="px-4 py-3 bg-gradient-to-r from-primary/10 to-primary/5 rounded-lg border border-primary/20">
        <div className="flex items-center justify-between text-sm mb-1">
          <span className="flex items-center gap-1.5 font-medium text-foreground">
            <Infinity className="h-4 w-4 text-primary" />
            Unlimited Credits
          </span>
        </div>
        <p className="text-xs text-muted-foreground">
          {tier === "agency" ? "Agency" : "Pro"} plan active
        </p>
      </div>
    );
  }

  // Canonical UI calculation: remaining = total - used
  const creditsRemaining = Math.max(0, FREE_TIER_LIMIT - creditsUsed);
  const progressValue = Math.min(100, (creditsUsed / FREE_TIER_LIMIT) * 100);
  const isLow = creditsRemaining <= 2 && creditsRemaining > 0;
  const isExhausted = !hasCredits;

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
          {creditsUsed} / {FREE_TIER_LIMIT} used
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
        {isExhausted ? (
          <Link 
            to="/billing" 
            className="flex items-center gap-1 hover:underline"
          >
            0 credits left — Upgrade to Pro
            <ArrowUpRight className="h-3 w-3" />
          </Link>
        ) : (
          `${creditsRemaining} credits remaining`
        )}
      </p>
    </div>
  );
}
