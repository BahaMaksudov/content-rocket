import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Crown, Rocket, Zap } from "lucide-react";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { useState } from "react";
import { PremiumModal } from "@/components/PremiumModal";
import { trackUpgradeClicked } from "@/lib/posthog";

export function UpgradeButton() {
  const { tier, loading } = useSubscription();
  const [modalTier, setModalTier] = useState<"starter" | "pro" | "agency">("pro");
  const [showModal, setShowModal] = useState(false);

  if (loading) {
    return <div className="h-10 w-32 animate-pulse rounded-lg bg-muted" />;
  }

  const openUpgrade = (t: "starter" | "pro" | "agency", source: string) => {
    trackUpgradeClicked(t, source);
    setModalTier(t);
    setShowModal(true);
  };

  // Agency users - badge only
  if (tier === "agency") {
    return (
      <Badge className="bg-gradient-to-r from-amber-500 to-yellow-400 text-white border-0 px-3 py-1">
        <Rocket className="h-3 w-3 mr-1" />
        Agency
      </Badge>
    );
  }

  // Pro users - show badge + upgrade to Agency
  if (tier === "pro") {
    return (
      <div className="flex flex-col gap-2">
        <Badge className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground border-0 px-3 py-1">
          <Crown className="h-3 w-3 mr-1" />
          Pro
        </Badge>
        <Button
          onClick={() => openUpgrade("agency", "sidebar_pro_user")}
          className="w-full bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-600 hover:to-yellow-500 text-white"
          size="sm"
        >
          <Rocket className="h-4 w-4 mr-2" />
          Upgrade to Agency
        </Button>
        <PremiumModal open={showModal} onOpenChange={setShowModal} tier={modalTier} />
      </div>
    );
  }

  // Starter users - show badge + upgrade to Pro
  if (tier === "starter") {
    return (
      <div className="flex flex-col gap-2">
        <Badge className="bg-gradient-to-r from-info to-info/80 text-white border-0 px-3 py-1">
          <Zap className="h-3 w-3 mr-1" />
          Starter
        </Badge>
        <Button
          onClick={() => openUpgrade("pro", "sidebar_starter_user")}
          className="w-full gradient-primary text-primary-foreground"
          size="sm"
        >
          <Crown className="h-4 w-4 mr-2" />
          Upgrade to Pro
        </Button>
        <PremiumModal open={showModal} onOpenChange={setShowModal} tier={modalTier} />
      </div>
    );
  }

  // Free users - show upgrade to Starter and Pro
  return (
    <div className="flex flex-col gap-2 w-full">
      <Button
        onClick={() => openUpgrade("starter", "sidebar_free_user")}
        className="w-full bg-gradient-to-r from-info to-info/80 hover:from-info/90 hover:to-info/70 text-white"
        size="sm"
      >
        <Zap className="h-4 w-4 mr-2" />
        Get Starter — $9.99
      </Button>
      <Button
        onClick={() => openUpgrade("pro", "sidebar_free_user")}
        className="w-full gradient-primary text-primary-foreground"
        size="sm"
      >
        <Crown className="h-4 w-4 mr-2" />
        Go Pro — $19.99
      </Button>
      <PremiumModal open={showModal} onOpenChange={setShowModal} tier={modalTier} />
    </div>
  );
}
