import { Progress } from "@/components/ui/progress";
import { useCredits, FREE_TIER_LIMIT, PRO_TIER_LIMIT } from "@/hooks/use-credits";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { BarChart3, Infinity, ArrowUpRight } from "lucide-react";
import { Link } from "react-router-dom";

export function CreditsRemaining() {
  const { tier } = useSubscription();
  const { creditsUsed, creditLimit, hasCredits, loading } = useCredits();
  
  const isUnlimited = tier === "agency";

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
      <div className="px-4 py-3 bg-gradient-to-r from-amber-500/10 to-orange-500/10 rounded-lg border border-amber-500/20">
        <div className="flex items-center justify-between text-sm mb-1">
          <span className="flex items-center gap-1.5 font-medium text-foreground">
            <Infinity className="h-4 w-4 text-amber-500" />
            Unlimited Credits
          </span>
        </div>
        <p className="text-xs text-muted-foreground">
          Agency plan active
        </p>
      </div>
    );
  }

  // For Free and Pro users - show usage against their limit
  const displayLimit = tier === "pro" ? PRO_TIER_LIMIT : FREE_TIER_LIMIT;
  const creditsRemaining = Math.max(0, displayLimit - creditsUsed);
  const progressValue = Math.min(100, (creditsUsed / displayLimit) * 100);
  const isLow = creditsRemaining <= (tier === "pro" ? 10 : 2) && creditsRemaining > 0;
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
          {creditsUsed} / {displayLimit} used
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
          tier === "pro" ? (
            <Link 
              to="/billing" 
              className="flex items-center gap-1 hover:underline"
            >
              0 credits left — Upgrade to Agency
              <ArrowUpRight className="h-3 w-3" />
            </Link>
          ) : (
            <Link 
              to="/billing" 
              className="flex items-center gap-1 hover:underline"
            >
              0 credits left — Upgrade to Pro
              <ArrowUpRight className="h-3 w-3" />
            </Link>
          )
        ) : (
          `${creditsRemaining} credits remaining`
        )}
      </p>
    </div>
  );
}
