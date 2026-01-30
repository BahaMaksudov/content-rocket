import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Crown, Check, Sparkles, Mic, Youtube, Rocket, Users, Building } from "lucide-react";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { useState } from "react";
import { SUBSCRIPTION_TIERS } from "@/lib/subscription-tiers";
import { trackUpgradeClicked } from "@/lib/posthog";
import { toast } from "sonner";

interface PremiumModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  feature?: "youtube" | "brand-voice" | "generation-limit";
  tier?: "pro" | "agency";
}

const proFeatures = [
  { icon: Youtube, text: "50 AI content generations per month" },
  { icon: Mic, text: "3 custom Brand Voice presets" },
  { icon: Sparkles, text: "AI-powered visuals & translations" },
  { icon: Check, text: "All 4 platform outputs" },
];

const agencyFeatures = [
  { icon: Check, text: "Unlimited AI content generations" },
  { icon: Youtube, text: "Bulk video processing (playlists)" },
  { icon: Users, text: "Team workspace (5 members)" },
  { icon: Mic, text: "Unlimited brand voices" },
  { icon: Building, text: "White-label previews" },
  { icon: Sparkles, text: "Dedicated account manager" },
];

export function PremiumModal({ open, onOpenChange, feature, tier = "pro" }: PremiumModalProps) {
  const { openCheckout } = useSubscription();
  const [isLoading, setIsLoading] = useState(false);

  const isAgencyTier = tier === "agency";
  const features = isAgencyTier ? agencyFeatures : proFeatures;
  const tierConfig = SUBSCRIPTION_TIERS[tier];

  const handleUpgrade = async () => {
    setIsLoading(true);
    
    // Track upgrade clicked from modal
    trackUpgradeClicked(tier, feature ? `modal_${feature}` : "modal_direct");
    
    try {
      await openCheckout(tier);
      onOpenChange(false);
    } catch (error) {
      console.error("Checkout error:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to start checkout";
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const featureMessage = feature === "youtube" 
    ? "You've used all 5 free transcript fetches this month"
    : feature === "brand-voice"
    ? "Brand Voice customization"
    : feature === "generation-limit"
    ? "You've reached your limit! Upgrade to Pro or Agency to keep generating high-quality content"
    : isAgencyTier
    ? "Agency features"
    : "this feature";

  const isLimitReached = feature === "generation-limit" || feature === "youtube";
  
  const dialogTitle = isLimitReached 
    ? "You've Reached Your Limit!" 
    : `Upgrade to ${tierConfig.name}`;
    
  const dialogDescription = isLimitReached 
    ? featureMessage
    : `${featureMessage} is a premium feature. Upgrade to unlock all ${tierConfig.name} features.`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="text-center">
          <div className={`mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full ${
            isAgencyTier 
              ? "bg-gradient-to-br from-amber-500/20 to-yellow-400/10" 
              : "bg-gradient-to-br from-primary/20 to-primary/5"
          }`}>
            {isAgencyTier ? (
              <Rocket className="h-7 w-7 text-amber-500" />
            ) : (
              <Crown className="h-7 w-7 text-primary" />
            )}
          </div>
          <DialogTitle className="text-xl">
            {dialogTitle}
          </DialogTitle>
          <DialogDescription className="text-base">
            {dialogDescription}
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4 space-y-3">
          {features.map((f, i) => (
            <div key={i} className="flex items-center gap-3 text-sm">
              <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                isAgencyTier ? "bg-amber-500/10" : "bg-primary/10"
              }`}>
                <f.icon className={`h-4 w-4 ${isAgencyTier ? "text-amber-500" : "text-primary"}`} />
              </div>
              <span>{f.text}</span>
            </div>
          ))}
        </div>

        <div className={`mt-6 rounded-lg border p-4 text-center ${
          isAgencyTier 
            ? "border-amber-500/20 bg-amber-500/5" 
            : "border-primary/20 bg-primary/5"
        }`}>
          <div className="flex items-center justify-center gap-2">
            <span className="text-3xl font-bold">${tierConfig.price}</span>
            <span className="text-muted-foreground">/month</span>
          </div>
          <Badge variant="secondary" className={`mt-2 border-0 ${
            isAgencyTier 
              ? "bg-amber-500/20 text-amber-600" 
              : "bg-primary/20 text-primary"
          }`}>
            Cancel anytime
          </Badge>
        </div>

        <div className="mt-6 flex flex-col gap-2">
          <Button
            onClick={handleUpgrade}
            disabled={isLoading}
            className={`w-full ${
              isAgencyTier 
                ? "bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-600 hover:to-yellow-500 text-white" 
                : "gradient-primary text-primary-foreground"
            }`}
            size="lg"
          >
            {isLoading ? "Redirecting to Stripe..." : `Upgrade to ${tierConfig.name}`}
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
