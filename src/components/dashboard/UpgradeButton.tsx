import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Crown, Settings, Rocket } from "lucide-react";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { useState } from "react";
import { PremiumModal } from "@/components/PremiumModal";
import { trackUpgradeClicked } from "@/lib/posthog";

export function UpgradeButton() {
  const { tier, isPro, isAgency, openCustomerPortal, loading } = useSubscription();
  const [showProModal, setShowProModal] = useState(false);
  const [showAgencyModal, setShowAgencyModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  if (loading) {
    return (
      <div className="h-10 w-32 animate-pulse rounded-lg bg-muted" />
    );
  }

  // Agency users - show badge and manage button
  if (isAgency) {
    return (
      <div className="flex items-center gap-2">
        <Badge className="bg-gradient-to-r from-amber-500 to-yellow-400 text-white border-0 px-3 py-1">
          <Rocket className="h-3 w-3 mr-1" />
          Agency
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

  // Pro users - show badge, manage button, and upgrade to Agency
  if (isPro) {
    return (
      <div className="flex flex-col gap-2">
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
        <Button
          onClick={() => {
            trackUpgradeClicked("agency", "sidebar_pro_user");
            setShowAgencyModal(true);
          }}
          className="w-full bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-600 hover:to-yellow-500 text-white"
          size="sm"
        >
          <Rocket className="h-4 w-4 mr-2" />
          Upgrade to Agency
        </Button>
        <PremiumModal 
          open={showAgencyModal} 
          onOpenChange={setShowAgencyModal} 
          tier="agency"
        />
      </div>
    );
  }

  // Free users - show both upgrade options
  return (
    <div className="flex flex-col gap-2 w-full">
      <Button
        onClick={() => {
          trackUpgradeClicked("pro", "sidebar_free_user");
          setShowProModal(true);
        }}
        className="w-full gradient-primary text-primary-foreground"
        size="sm"
      >
        <Crown className="h-4 w-4 mr-2" />
        Upgrade to Pro
      </Button>
      <Button
        onClick={() => {
          trackUpgradeClicked("agency", "sidebar_free_user");
          setShowAgencyModal(true);
        }}
        className="w-full bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-600 hover:to-yellow-500 text-white"
        size="sm"
      >
        <Rocket className="h-4 w-4 mr-2" />
        Upgrade to Agency
      </Button>
      <PremiumModal open={showProModal} onOpenChange={setShowProModal} tier="pro" />
      <PremiumModal open={showAgencyModal} onOpenChange={setShowAgencyModal} tier="agency" />
    </div>
  );
}
