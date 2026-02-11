import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerFooter,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Crown, Check, Sparkles, Mic, Youtube, Rocket, Users, Zap } from "lucide-react";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { useState } from "react";
import { SUBSCRIPTION_TIERS } from "@/lib/subscription-tiers";
import { trackUpgradeClicked } from "@/lib/posthog";
import { toast } from "sonner";
import { useIsMobile } from "@/hooks/use-mobile";

interface PremiumModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  feature?: "youtube" | "brand-voice" | "generation-limit" | "voice-generation" | "bulk-processing" | "team-workspace" | "style-mimicking";
  description?: string;
  tier?: "starter" | "pro" | "agency";
}

const starterFeatures = [
  { icon: Zap, text: "20 AI content generations per month" },
  { icon: Check, text: "All social formats + blog posts" },
  { icon: Mic, text: "1 brand voice" },
  { icon: Sparkles, text: "Email support" },
];

const proFeatures = [
  { icon: Youtube, text: "60 AI content generations per month" },
  { icon: Mic, text: "Style Mimicking (Brand Voice training)" },
  { icon: Sparkles, text: "Priority processing & no watermarks" },
  { icon: Check, text: "3 brand voices + API access" },
];

const agencyFeatures = [
  { icon: Check, text: "250 AI content generations per month" },
  { icon: Youtube, text: "Bulk export" },
  { icon: Users, text: "Team workspace (5 members)" },
  { icon: Mic, text: "10 brand voices" },
  { icon: Sparkles, text: "Style Mimicking + Priority support" },
];

function getFeaturesForTier(tier: "starter" | "pro" | "agency") {
  if (tier === "agency") return agencyFeatures;
  if (tier === "pro") return proFeatures;
  return starterFeatures;
}

function getTierAccent(tier: "starter" | "pro" | "agency") {
  if (tier === "agency") return { bg: "bg-gradient-to-br from-amber-500/20 to-yellow-400/10", text: "text-amber-500", border: "border-amber-500/20 bg-amber-500/5", badgeBg: "bg-amber-500/20 text-amber-600" };
  if (tier === "pro") return { bg: "bg-gradient-to-br from-primary/20 to-primary/5", text: "text-primary", border: "border-primary/20 bg-primary/5", badgeBg: "bg-primary/20 text-primary" };
  return { bg: "bg-gradient-to-br from-info/20 to-info/5", text: "text-info", border: "border-info/20 bg-info/5", badgeBg: "bg-info/20 text-info" };
}

function getTierIcon(tier: "starter" | "pro" | "agency") {
  if (tier === "agency") return Rocket;
  if (tier === "pro") return Crown;
  return Zap;
}

export function PremiumModal({ open, onOpenChange, feature, description, tier: propTier = "pro" }: PremiumModalProps) {
  const { openCheckout } = useSubscription();
  const [isLoading, setIsLoading] = useState(false);
  const isMobile = useIsMobile();

  // Auto-select minimum tier for feature-gated modals
  let tier = propTier;
  if (feature === "bulk-processing" || feature === "team-workspace") tier = "agency";
  if (feature === "style-mimicking" && tier === "starter") tier = "pro";

  const features = getFeaturesForTier(tier);
  const tierConfig = SUBSCRIPTION_TIERS[tier];
  const accent = getTierAccent(tier);
  const TierIcon = getTierIcon(tier);

  const handleUpgrade = async () => {
    setIsLoading(true);
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

  const featureMessage = description 
    ? description
    : feature === "youtube" || feature === "generation-limit"
    ? "You have run out of credits. Please upgrade your plan to continue."
    : feature === "brand-voice"
    ? "Brand Voice customization"
    : feature === "voice-generation"
    ? "Voice generation lets you convert scripts to professional AI audio"
    : feature === "bulk-processing"
    ? "Bulk processing lets you process multiple videos at once"
    : feature === "team-workspace"
    ? "Team workspaces let you collaborate with your team"
    : feature === "style-mimicking"
    ? "Style Mimicking lets you train AI to write in your unique voice"
    : `${tierConfig.name} features`;

  const isLimitReached = feature === "generation-limit" || feature === "youtube";
  
  const dialogTitle = isLimitReached 
    ? "Out of Credits" 
    : `Upgrade to ${tierConfig.name}`;
    
  const dialogDescription = isLimitReached 
    ? featureMessage
    : `${featureMessage} is a premium feature. Upgrade to unlock all ${tierConfig.name} features.`;

  const buttonGradient = tier === "agency"
    ? "bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-600 hover:to-yellow-500 text-white"
    : tier === "pro"
    ? "gradient-primary text-primary-foreground"
    : "bg-gradient-to-r from-info to-info/80 hover:from-info/90 hover:to-info/70 text-white";

  const content = (
    <>
      <div className="mt-4 space-y-3">
        {features.map((f, i) => (
          <div key={i} className="flex items-center gap-3 text-sm">
            <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${accent.bg}`}>
              <f.icon className={`h-4 w-4 ${accent.text}`} />
            </div>
            <span>{f.text}</span>
          </div>
        ))}
      </div>

      <div className={`mt-6 rounded-lg border p-4 text-center ${accent.border}`}>
        <div className="flex items-center justify-center gap-2">
          <span className="text-3xl font-bold">${tierConfig.price}</span>
          <span className="text-muted-foreground">/month</span>
        </div>
        {tier === "pro" && (
          <p className="text-xs text-muted-foreground mt-1">Under $20/mo — Best Value</p>
        )}
        <Badge variant="secondary" className={`mt-2 border-0 ${accent.badgeBg}`}>
          Cancel anytime
        </Badge>
      </div>

      <div className="mt-6 flex flex-col gap-2">
        <Button
          onClick={handleUpgrade}
          disabled={isLoading}
          className={`w-full ${buttonGradient}`}
          size="lg"
        >
          {isLoading ? "Redirecting to Stripe..." : `Upgrade to ${tierConfig.name}`}
        </Button>
        <Button variant="ghost" onClick={() => onOpenChange(false)} className="w-full">
          Maybe later
        </Button>
      </div>
    </>
  );

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent>
          <DrawerHeader className="text-center">
            <div className={`mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full ${accent.bg}`}>
              <TierIcon className={`h-7 w-7 ${accent.text}`} />
            </div>
            <DrawerTitle className="text-xl">{dialogTitle}</DrawerTitle>
            <DrawerDescription className="text-base">{dialogDescription}</DrawerDescription>
          </DrawerHeader>
          <div className="px-4 pb-6">
            {content}
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="text-center">
          <div className={`mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full ${accent.bg}`}>
            <TierIcon className={`h-7 w-7 ${accent.text}`} />
          </div>
          <DialogTitle className="text-xl">{dialogTitle}</DialogTitle>
          <DialogDescription className="text-base">{dialogDescription}</DialogDescription>
        </DialogHeader>
        {content}
      </DialogContent>
    </Dialog>
  );
}
