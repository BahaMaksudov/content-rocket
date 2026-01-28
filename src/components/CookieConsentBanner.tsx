import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Cookie, X } from "lucide-react";
import { hasAnalyticsConsent, setAnalyticsConsent } from "@/lib/posthog";

export function CookieConsentBanner() {
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    // Only show banner if consent hasn't been given or denied
    const consent = localStorage.getItem("analytics_consent");
    if (consent === null) {
      // Small delay to prevent flash on page load
      const timer = setTimeout(() => setShowBanner(true), 1000);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleAccept = () => {
    setAnalyticsConsent(true);
    setShowBanner(false);
  };

  const handleDecline = () => {
    setAnalyticsConsent(false);
    setShowBanner(false);
  };

  if (!showBanner) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:max-w-md z-50 animate-in slide-in-from-bottom-4 duration-300">
      <Card className="p-4 shadow-lg border-border bg-card">
        <div className="flex items-start gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Cookie className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 space-y-3">
            <div>
              <h4 className="font-medium text-sm">We value your privacy</h4>
              <p className="text-xs text-muted-foreground mt-1">
                We use analytics cookies to understand how you use our app and improve your experience. 
                No personal data is sold to third parties.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" onClick={handleAccept} className="gradient-primary text-primary-foreground">
                Accept
              </Button>
              <Button size="sm" variant="outline" onClick={handleDecline}>
                Decline
              </Button>
            </div>
          </div>
          <Button
            size="sm"
            variant="ghost"
            className="h-6 w-6 p-0 -mt-1 -mr-1"
            onClick={handleDecline}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </Card>
    </div>
  );
}
