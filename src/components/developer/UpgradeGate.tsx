import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Lock, Crown, Rocket } from "lucide-react";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { useState } from "react";
import { PremiumModal } from "@/components/PremiumModal";
import { trackUpgradeClicked } from "@/lib/posthog";

export function UpgradeGate() {
  const { tier } = useSubscription();
  const [showModal, setShowModal] = useState(false);
  const [modalTier, setModalTier] = useState<"starter" | "pro" | "agency">("pro");

  const openUpgrade = (t: "starter" | "pro" | "agency") => {
    trackUpgradeClicked(t, "developer_api_gate");
    setModalTier(t);
    setShowModal(true);
  };

  return (
    <>
      <Card className="border-dashed border-2 border-primary/30 bg-primary/5">
        <CardContent className="flex flex-col items-center justify-center py-10 sm:py-14 text-center space-y-4">
          <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center">
            <Lock className="h-7 w-7 text-primary" />
          </div>
          <div className="space-y-2 max-w-md">
            <h3 className="text-lg sm:text-xl font-bold text-foreground">
              API Keys Require a Pro Plan
            </h3>
            <p className="text-sm text-muted-foreground">
              Upgrade to Pro or Agency to generate API keys and integrate VidLogic AI into your workflows programmatically.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 w-full max-w-xs">
            <Button
              onClick={() => openUpgrade("pro")}
              className="flex-1 gap-2 gradient-primary text-primary-foreground"
              size="lg"
            >
              <Crown className="h-4 w-4" />
              Upgrade to Pro
            </Button>
            <Button
              onClick={() => openUpgrade("agency")}
              variant="outline"
              className="flex-1 gap-2 border-primary/30 text-primary hover:bg-primary/10"
              size="lg"
            >
              <Rocket className="h-4 w-4" />
              Agency
            </Button>
          </div>
        </CardContent>
      </Card>
      <PremiumModal open={showModal} onOpenChange={setShowModal} tier={modalTier} />
    </>
  );
}
