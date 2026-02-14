import { useState, useEffect } from "react";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { useRefundWorkflow } from "@/hooks/use-refund-workflow";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, AlertTriangle, CheckCircle, XCircle, Info, Calendar } from "lucide-react";

interface CancelSubscriptionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCanceled?: () => void;
}

export function CancelSubscriptionModal({
  open,
  onOpenChange,
  onCanceled,
}: CancelSubscriptionModalProps) {
  const { subscriptionEnd, checkSubscription } = useSubscription();
  const { 
    eligibility, 
    loading, 
    refundLoading, 
    cancelLoading,
    checkEligibility, 
    processRefund,
    cancelAtPeriodEnd 
  } = useRefundWorkflow();
  
  const [cancellationResult, setCancellationResult] = useState<{
    success: boolean;
    immediate: boolean;
    periodEnd?: string;
    tierLabel?: string;
  } | null>(null);

  // Determine tier label for display
  const tierLabel = eligibility?.tier === "agency" ? "Agency" : eligibility?.tier === "pro" ? "Pro" : "Starter";

  // Check eligibility when modal opens
  useEffect(() => {
    if (open) {
      checkEligibility();
      setCancellationResult(null);
    }
  }, [open, checkEligibility]);

  const handleRefund = async () => {
    const result = await processRefund();
    if (result.success) {
      setCancellationResult({ success: true, immediate: true, tierLabel });
      await checkSubscription();
      onCanceled?.();
    }
  };

  const handleStandardCancel = async () => {
    const result = await cancelAtPeriodEnd();
    if (result.success) {
      setCancellationResult({ 
        success: true, 
        immediate: false, 
        periodEnd: result.periodEnd,
        tierLabel,
      });
      await checkSubscription();
      onCanceled?.();
    }
  };

  const formattedEndDate = (date?: string | null) => {
    if (!date) return null;
    return new Date(date).toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  };

  // Show success state after cancellation
  if (cancellationResult?.success) {
    const displayTier = cancellationResult.tierLabel || tierLabel;
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-success" />
              Subscription Canceled
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {cancellationResult.immediate ? (
              <div className="rounded-lg bg-success/10 border border-success/30 p-4">
                <div className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-success shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-success">Access Removed Immediately</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Your {displayTier} subscription has been canceled and you've received a full refund.
                      Your account has been downgraded to the free tier.
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-lg bg-primary/10 border border-primary/30 p-4">
                <div className="flex items-start gap-3">
                  <Calendar className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-primary">{displayTier} Access Until Period End</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      You'll continue to have {displayTier} access until{" "}
                      <span className="font-semibold">
                        {formattedEndDate(cancellationResult.periodEnd)}
                      </span>
                      . After that, your account will be downgraded to the free tier.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-warning" />
            Cancel {tierLabel} Subscription
          </DialogTitle>
          <DialogDescription>
            We're sorry to see you go. Please review your cancellation options below.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : eligibility?.eligible ? (
          // Eligible for refund - immediate cancellation
          <div className="space-y-4">
            <div className="rounded-lg bg-success/10 border border-success/30 p-4">
              <div className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-success shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-success">Eligible for Full Refund</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    You qualify for our 7-Day Satisfaction Guarantee. Your {tierLabel} subscription will be canceled 
                    <span className="font-semibold"> immediately</span> and you'll receive a full refund.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Days since subscription:</span>
                <Badge variant="secondary">{eligibility.daysSinceCreation} days</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">AI generations used:</span>
                <Badge variant="secondary">
                  {eligibility.generationsUsed} / {eligibility.generationLimit || (eligibility.tier === "agency" ? 7 : 3)}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">First-time subscriber:</span>
                <Badge variant="secondary">{eligibility.isFirstSubscription ? "Yes" : "No"}</Badge>
              </div>
            </div>

            <div className="rounded-lg bg-warning/10 border border-warning/30 p-3">
              <p className="text-sm text-warning font-medium">
                ⚠️ Access will be removed immediately upon refund
              </p>
            </div>

            <DialogFooter className="flex flex-col sm:flex-row gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Keep Subscription
              </Button>
              <Button
                variant="destructive"
                onClick={handleRefund}
                disabled={refundLoading}
              >
                {refundLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Processing Refund...
                  </>
                ) : (
                  "Cancel & Request Full Refund"
                )}
              </Button>
            </DialogFooter>
          </div>
        ) : eligibility?.canCancel ? (
          // Not eligible for refund - cancel at period end
          <div className="space-y-4">
            <div className="rounded-lg bg-muted p-4">
              <div className="flex items-start gap-3">
                <XCircle className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium">Standard Cancellation</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Your {tierLabel} subscription will remain active until the end of your billing period.
                    No refund is available.
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-lg bg-warning/10 border border-warning/30 p-4">
              <div className="flex items-start gap-3">
                <Info className="h-5 w-5 text-warning shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-warning">Non-refundable</p>
                  <p className="text-muted-foreground mt-1">
                    {eligibility.reason || `Refund not available as per our policy (over 7 days or ${eligibility.generationLimit || (eligibility.tier === "agency" ? 7 : 3)}+ credits used).`}
                  </p>
                </div>
              </div>
            </div>

            {(subscriptionEnd || eligibility.subscriptionEnd) && (
              <div className="rounded-lg bg-primary/10 border border-primary/30 p-4">
                <div className="flex items-center gap-3">
                  <Calendar className="h-5 w-5 text-primary shrink-0" />
                  <p className="text-sm">
                    <span className="font-medium text-primary">You'll have {tierLabel} access until </span>
                    <span className="font-semibold">{formattedEndDate(subscriptionEnd || eligibility.subscriptionEnd)}</span>
                  </p>
                </div>
              </div>
            )}

            <DialogFooter className="flex flex-col sm:flex-row gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Keep Subscription
              </Button>
              <Button
                variant="destructive"
                onClick={handleStandardCancel}
                disabled={cancelLoading}
              >
                {cancelLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Canceling...
                  </>
                ) : (
                  `Cancel ${tierLabel} Subscription`
                )}
              </Button>
            </DialogFooter>
          </div>
        ) : (
          // No active subscription or error
          <div className="text-center py-8 text-muted-foreground">
            <p>No active paid subscription found.</p>
            <Button variant="outline" onClick={() => onOpenChange(false)} className="mt-4">
              Close
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
