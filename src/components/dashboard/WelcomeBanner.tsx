import { useState, useEffect } from "react";
import { X, Rocket, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

interface WelcomeBannerProps {
  onScrollToInput?: () => void;
}

export function WelcomeBanner({ onScrollToInput }: WelcomeBannerProps) {
  const { tier, isPro, isAgency } = useSubscription();
  const { user } = useAuth();
  const [isVisible, setIsVisible] = useState(false);
  const [userName, setUserName] = useState<string>("");

  useEffect(() => {
    // Only show for pro or agency users
    if (!isPro && !isAgency) {
      setIsVisible(false);
      return;
    }

    // Check if user has dismissed the banner
    const dismissKey = `pro_welcome_dismissed_${user?.id}`;
    const hasDismissed = localStorage.getItem(dismissKey) === "true";
    
    if (hasDismissed) {
      setIsVisible(false);
      return;
    }

    setIsVisible(true);

    // Fetch user name
    if (user) {
      supabase
        .from("profiles")
        .select("full_name")
        .eq("user_id", user.id)
        .maybeSingle()
        .then(({ data }) => {
          if (data?.full_name) {
            setUserName(data.full_name.split(" ")[0]); // First name only
          }
        });
    }
  }, [user, isPro, isAgency]);

  const handleDismiss = () => {
    if (user) {
      const dismissKey = `pro_welcome_dismissed_${user.id}`;
      localStorage.setItem(dismissKey, "true");
    }
    setIsVisible(false);
  };

  const handleCTA = () => {
    onScrollToInput?.();
  };

  if (!isVisible) return null;

  const isAgencyTier = tier === "agency";

  return (
    <Card className="relative overflow-hidden border-0 mb-6">
      {/* Gradient background */}
      <div className="absolute inset-0 bg-gradient-to-r from-primary via-primary/80 to-accent opacity-95" />
      
      {/* Content */}
      <div className="relative p-6 md:p-8">
        {/* Dismiss button */}
        <button
          onClick={handleDismiss}
          className="absolute top-4 right-4 p-1.5 rounded-full bg-white/10 hover:bg-white/20 transition-colors text-white/80 hover:text-white"
          aria-label="Dismiss banner"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          {/* Text content */}
          <div className="flex-1 pr-8 md:pr-0">
            <div className="flex items-center gap-2 mb-2">
              {isAgencyTier ? (
                <Users className="h-5 w-5 text-white" />
              ) : (
                <Rocket className="h-5 w-5 text-white" />
              )}
              <h2 className="text-xl md:text-2xl font-semibold text-white">
                {isAgencyTier
                  ? `Welcome, Agency Partner${userName ? ` ${userName}` : ""}! 🏢`
                  : `Welcome to VidLogic AI Pro${userName ? `, ${userName}` : ""}! ✨`}
              </h2>
            </div>
            <p className="text-white/90 text-sm md:text-base max-w-xl">
              {isAgencyTier
                ? "Invite your team members in Settings to start scaling your content production."
                : "You now have unlimited AI generations and custom brand voices. Let's create some content!"}
            </p>
          </div>

          {/* CTA Button */}
          <div className="flex-shrink-0">
            <Button
              onClick={handleCTA}
              size="lg"
              className="w-full md:w-auto bg-white text-primary hover:bg-white/90 font-semibold shadow-lg"
            >
              {isAgencyTier ? "Invite Team Members" : "Generate Your First Insights"}
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}
