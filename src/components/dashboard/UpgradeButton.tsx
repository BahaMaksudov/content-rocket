import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Crown, Rocket } from "lucide-react";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { useState } from "react";
import { PremiumModal } from "@/components/PremiumModal";
import { trackUpgradeClicked } from "@/lib/posthog";

export function UpgradeButton() {
  const { isPro, isAgency, loading } = useSubscription();
  const [showProModal, setShowProModal] = useState(false);
  const [showAgencyModal, setShowAgencyModal] = useState(false);

  if (loading) {
    return (
      <div className="h-10 w-32 animate-pulse rounded-lg bg-muted" />
    );
  }

  // Agency users - show badge only
  if (isAgency) {
    return (
      <Badge className="bg-gradient-to-r from-amber-500 to-yellow-400 text-white border-0 px-3 py-1">
        <Rocket className="h-3 w-3 mr-1" />
        Agency
      </Badge>
    );
  }

  // Pro users - show badge and upgrade to Agency option
  if (isPro) {
    return (
      <div className="flex flex-col gap-2">
        <Badge className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground border-0 px-3 py-1">
          <Crown className="h-3 w-3 mr-1" />
          Pro
        </Badge>
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
