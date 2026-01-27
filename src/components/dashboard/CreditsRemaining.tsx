import { Progress } from "@/components/ui/progress";
import { useGenerationCredits, FREE_TIER_LIMIT } from "@/hooks/use-generation-credits";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { Zap, Infinity } from "lucide-react";

export function CreditsRemaining() {
  const { tier } = useSubscription();
  const { generationsThisMonth, creditsRemaining, loading } = useGenerationCredits();
  
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
            Unlimited Generations
          </span>
        </div>
        <p className="text-xs text-muted-foreground">
          {tier === "agency" ? "Agency" : "Pro"} plan active
        </p>
      </div>
    );
  }

  const progressValue = ((FREE_TIER_LIMIT - creditsRemaining) / FREE_TIER_LIMIT) * 100;
  const isLow = creditsRemaining <= 2;
  const isExhausted = creditsRemaining === 0;

  return (
    <div className={`px-4 py-3 rounded-lg border ${
      isExhausted 
        ? "bg-destructive/10 border-destructive/30" 
        : isLow 
          ? "bg-amber-500/10 border-amber-500/30" 
          : "bg-sidebar-accent/30 border-sidebar-border"
    }`}>
      <div className="flex items-center justify-between text-sm mb-2">
        <span className="flex items-center gap-1.5 font-medium text-foreground">
          <Zap className={`h-4 w-4 ${
            isExhausted ? "text-destructive" : isLow ? "text-amber-500" : "text-primary"
          }`} />
          Credits Remaining
        </span>
        <span className={`font-semibold ${
          isExhausted ? "text-destructive" : isLow ? "text-amber-500" : "text-primary"
        }`}>
          {creditsRemaining} / {FREE_TIER_LIMIT}
        </span>
      </div>
      <Progress 
        value={progressValue} 
        className={`h-2 ${
          isExhausted 
            ? "[&>div]:bg-destructive" 
            : isLow 
              ? "[&>div]:bg-amber-500" 
              : ""
        }`}
      />
      <p className="text-xs text-muted-foreground mt-2">
        {isExhausted 
          ? "Upgrade to continue creating content"
          : `${generationsThisMonth} generations used this month`
        }
      </p>
    </div>
  );
}
