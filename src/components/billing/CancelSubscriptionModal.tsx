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
import { Loader2, AlertTriangle, CheckCircle, XCircle, Info } from "lucide-react";

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
  const { openCustomerPortal, subscriptionEnd, checkSubscription } = useSubscription();
  const { eligibility, loading, refundLoading, checkEligibility, processRefund } = useRefundWorkflow();
  const [portalLoading, setPortalLoading] = useState(false);

  // Check eligibility when modal opens
  useEffect(() => {
    if (open) {
      checkEligibility();
    }
  }, [open, checkEligibility]);

  const handleRefund = async () => {
    const success = await processRefund();
    if (success) {
      await checkSubscription();
      onOpenChange(false);
      onCanceled?.();
    }
  };

  const handleStandardCancel = async () => {
    setPortalLoading(true);
    try {
      await openCustomerPortal();
      onOpenChange(false);
    } catch (error) {
      console.error("Error opening portal:", error);
    } finally {
      setPortalLoading(false);
    }
  };

  const formattedEndDate = subscriptionEnd
    ? new Date(subscriptionEnd).toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-warning" />
            Cancel Subscription
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
          // Eligible for refund
          <div className="space-y-4">
            <div className="rounded-lg bg-success/10 border border-success/30 p-4">
              <div className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-success shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-success">Eligible for Full Refund</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    You qualify for our 7-Day Satisfaction Guarantee. Your subscription will be canceled 
                    immediately and you'll receive a full refund.
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
                <Badge variant="secondary">{eligibility.generationsUsed} / 3</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">First-time subscriber:</span>
                <Badge variant="secondary">{eligibility.isFirstSubscription ? "Yes" : "No"}</Badge>
              </div>
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
          // Not eligible for refund but can cancel
          <div className="space-y-4">
            <div className="rounded-lg bg-muted p-4">
              <div className="flex items-start gap-3">
                <XCircle className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium">Standard Cancellation</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Your subscription will remain active until the end of your billing period.
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
                    {eligibility.reason || "Refund not available as per our policy (over 7 days or 3+ credits used)."}
                  </p>
                </div>
              </div>
            </div>

            {formattedEndDate && (
              <p className="text-sm text-center text-muted-foreground">
                Your access will continue until <span className="font-medium">{formattedEndDate}</span>
              </p>
            )}

            <DialogFooter className="flex flex-col sm:flex-row gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Keep Subscription
              </Button>
              <Button
                variant="destructive"
                onClick={handleStandardCancel}
                disabled={portalLoading}
              >
                {portalLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Opening Portal...
                  </>
                ) : (
                  "Cancel Subscription"
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
