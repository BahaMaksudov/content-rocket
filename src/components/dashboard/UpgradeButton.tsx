import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Crown, Settings } from "lucide-react";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { useState } from "react";
import { PremiumModal } from "@/components/PremiumModal";

export function UpgradeButton() {
  const { isPro, openCustomerPortal, loading } = useSubscription();
  const [showModal, setShowModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  if (loading) {
    return (
      <div className="h-10 w-32 animate-pulse rounded-lg bg-muted" />
    );
  }

  if (isPro) {
    return (
      <div className="flex items-center gap-2">
        <Badge className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground border-0 px-3 py-1">
          <Crown className="h-3 w-3 mr-1" />
          Pro
        </Badge>
        <Button
          variant="ghost"
          size="sm"
          onClick={async () => {
            setIsLoading(true);
            try {
              await openCustomerPortal();
            } finally {
              setIsLoading(false);
            }
          }}
          disabled={isLoading}
        >
          <Settings className="h-4 w-4 mr-1" />
          Manage
        </Button>
      </div>
    );
  }

  return (
    <>
      <Button
        onClick={() => setShowModal(true)}
        className="gradient-primary text-primary-foreground"
        size="sm"
      >
        <Crown className="h-4 w-4 mr-2" />
        Upgrade to Pro
      </Button>
      <PremiumModal open={showModal} onOpenChange={setShowModal} />
    </>
  );
}
