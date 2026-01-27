import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Crown, Check, Sparkles, Mic, Youtube } from "lucide-react";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { useState } from "react";

interface PremiumModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  feature?: "youtube" | "brand-voice";
}

const features = [
  { icon: Youtube, text: "Unlimited YouTube transcript fetching" },
  { icon: Mic, text: "Custom Brand Voice presets" },
  { icon: Sparkles, text: "Priority AI generation" },
  { icon: Check, text: "Full history access" },
];

export function PremiumModal({ open, onOpenChange, feature }: PremiumModalProps) {
  const { openCheckout } = useSubscription();
  const [isLoading, setIsLoading] = useState(false);

  const handleUpgrade = async () => {
    setIsLoading(true);
    try {
      await openCheckout();
      onOpenChange(false);
    } catch (error) {
      console.error("Checkout error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const featureMessage = feature === "youtube" 
    ? "YouTube transcript fetching"
    : feature === "brand-voice"
    ? "Brand Voice customization"
    : "this feature";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-primary/20 to-primary/5">
            <Crown className="h-7 w-7 text-primary" />
          </div>
          <DialogTitle className="text-xl">Upgrade to Pro</DialogTitle>
          <DialogDescription className="text-base">
            {featureMessage} is a premium feature. Upgrade to unlock all Pro features.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4 space-y-3">
          {features.map((f, i) => (
            <div key={i} className="flex items-center gap-3 text-sm">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                <f.icon className="h-4 w-4 text-primary" />
              </div>
              <span>{f.text}</span>
            </div>
          ))}
        </div>

        <div className="mt-6 rounded-lg border border-primary/20 bg-primary/5 p-4 text-center">
          <div className="flex items-center justify-center gap-2">
            <span className="text-3xl font-bold">$29</span>
            <span className="text-muted-foreground">/month</span>
          </div>
          <Badge variant="secondary" className="mt-2 bg-primary/20 text-primary border-0">
            Cancel anytime
          </Badge>
        </div>

        <div className="mt-6 flex flex-col gap-2">
          <Button
            onClick={handleUpgrade}
            disabled={isLoading}
            className="w-full gradient-primary text-primary-foreground"
            size="lg"
          >
            {isLoading ? "Loading..." : "Upgrade to Pro"}
          </Button>
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            className="w-full"
          >
            Maybe later
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
