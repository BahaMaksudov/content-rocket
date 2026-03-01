import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSubscription } from "@/contexts/SubscriptionContext";

export function PaymentFailedBanner() {
  const { isPaymentFailed, isPaid, openCustomerPortal } = useSubscription();

  if (!isPaymentFailed || !isPaid) return null;

  return (
    <div className="w-full bg-destructive/15 border border-destructive/30 rounded-lg px-4 py-3 flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-4">
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <AlertTriangle className="h-5 w-5 text-destructive shrink-0" />
        <p className="text-sm text-destructive font-medium">
          ⚠️ Payment Unsuccessful: Your subscription is currently on hold. Please update your payment method to continue generating assets.
        </p>
      </div>
      <Button
        size="sm"
        variant="destructive"
        onClick={() => openCustomerPortal()}
        className="shrink-0"
      >
        Update Payment Method
      </Button>
    </div>
  );
}
