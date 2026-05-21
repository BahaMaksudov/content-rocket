import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Home, History, User, MoreHorizontal, Code, Crown, Rocket, ArrowUpRight, Zap, Inbox, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { Badge } from "@/components/ui/badge";
import { PremiumModal } from "@/components/PremiumModal";
import { CreditsRemaining } from "@/components/dashboard/CreditsRemaining";
import { trackUpgradeClicked } from "@/lib/posthog";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";

const tabs = [
  { label: "Home", icon: Home, path: "/dashboard" },
  { label: "Agent", icon: Settings, path: "/agent/settings" },
  { label: "Queue", icon: Inbox, path: "/agent/queue" },
  { label: "More", icon: MoreHorizontal, path: "__more__" },
];

export function MobileBottomNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const { tier } = useSubscription();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [modalTier, setModalTier] = useState<"starter" | "pro" | "agency">("pro");

  const openUpgrade = (t: "starter" | "pro" | "agency") => {
    trackUpgradeClicked(t, `mobile_bottom_nav_${tier}_user`);
    setDrawerOpen(false);
    setModalTier(t);
    setShowModal(true);
  };

  const goTo = (path: string) => {
    setDrawerOpen(false);
    navigate(path);
  };

  return (
    <>
      <nav className="fixed bottom-0 inset-x-0 z-50 md:hidden border-t border-border bg-background/95 backdrop-blur-xl pb-[env(safe-area-inset-bottom)]">
        <div className="flex items-center justify-around h-16">
          {tabs.map((tab) => {
            const isMore = tab.path === "__more__";
            const isActive = isMore ? drawerOpen : location.pathname === tab.path;
            return (
              <button
                key={tab.path}
                onClick={() => {
                  if (isMore) {
                    setDrawerOpen(true);
                  } else {
                    navigate(tab.path);
                  }
                }}
                className={cn(
                  "flex flex-col items-center justify-center gap-0.5 flex-1 h-full relative tap-highlight-none active:scale-95 transition-transform duration-100",
                  isActive ? "text-primary" : "text-muted-foreground"
                )}
              >
                {isActive && !isMore && (
                  <motion.div
                    layoutId="bottomNavIndicator"
                    className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full bg-primary"
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  />
                )}
                <tab.icon className="h-5 w-5" strokeWidth={isActive ? 2.5 : 2} />
                <span className="text-[10px] font-medium">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* More Drawer */}
      <Drawer open={drawerOpen} onOpenChange={setDrawerOpen}>
        <DrawerContent className="max-h-[85dvh]">
          <DrawerHeader>
            <DrawerTitle>More</DrawerTitle>
          </DrawerHeader>
          <div className="px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] space-y-1 overflow-y-auto" style={{ WebkitOverflowScrolling: 'touch' }}>
            {/* Profile / Settings */}
            <button
              onClick={() => goTo("/settings")}
              className="flex items-center gap-3 w-full rounded-lg px-3 py-3 text-foreground hover:bg-muted transition-colors"
            >
              <User className="h-5 w-5 text-muted-foreground" />
              <span className="font-medium">Profile & Settings</span>
            </button>

            {/* Developer API */}
            <button
              onClick={() => goTo("/developer")}
              className="flex items-center gap-3 w-full rounded-lg px-3 py-3 text-foreground hover:bg-muted transition-colors"
            >
              <Code className="h-5 w-5 text-primary" />
              <span className="font-medium">Developer API</span>
              <Badge variant="secondary" className="ml-auto text-xs bg-primary/20 text-primary border-0">Pro</Badge>
            </button>

            {/* History (moved from bottom nav) */}
            <button
              onClick={() => goTo("/history")}
              className="flex items-center gap-3 w-full rounded-lg px-3 py-3 text-foreground hover:bg-muted transition-colors"
            >
              <History className="h-5 w-5 text-muted-foreground" />
              <span className="font-medium">History</span>
            </button>

            {/* Team — agency only */}
            {tier === "agency" && (
              <button
                onClick={() => goTo("/team")}
                className="flex items-center gap-3 w-full rounded-lg px-3 py-3 text-foreground hover:bg-muted transition-colors"
              >
                <Rocket className="h-5 w-5 text-primary" />
                <span className="font-medium">Team Workspace</span>
                <Badge variant="secondary" className="ml-auto text-xs bg-primary/20 text-primary border-0">Agency</Badge>
              </button>
            )}

            {/* Section divider */}
            <div className="border-t border-border my-2" />

            {/* Monthly Usage */}
            <div className="px-1 py-2">
              <CreditsRemaining />
            </div>

            {/* Upgrade options */}
            {tier !== "agency" && (
              <button
                onClick={() => openUpgrade("agency")}
                className="flex items-center gap-3 w-full rounded-lg px-3 py-3 text-accent-foreground hover:bg-accent/10 transition-colors"
              >
                <Rocket className="h-5 w-5" />
                <span className="font-medium">Upgrade to Agency</span>
                <ArrowUpRight className="h-4 w-4 ml-auto opacity-60" />
              </button>
            )}

            {(tier === "free" || tier === "starter") && (
              <button
                onClick={() => openUpgrade("pro")}
                className="flex items-center gap-3 w-full rounded-lg px-3 py-3 text-primary hover:bg-primary/10 transition-colors"
              >
                <Crown className="h-5 w-5" />
                <span className="font-medium">Upgrade to Pro</span>
                <ArrowUpRight className="h-4 w-4 ml-auto opacity-60" />
              </button>
            )}

            {tier === "free" && (
              <button
                onClick={() => {
                  trackUpgradeClicked("starter", "mobile_bottom_nav_free_user");
                  setDrawerOpen(false);
                  navigate("/?plan=starter");
                }}
                className="flex items-center gap-3 w-full rounded-lg px-3 py-3 text-muted-foreground hover:bg-muted transition-colors"
              >
                <Zap className="h-5 w-5" />
                <span className="font-medium">Upgrade to Starter</span>
                <ArrowUpRight className="h-4 w-4 ml-auto opacity-60" />
              </button>
            )}

            {/* Footer links */}
            <div className="border-t border-border mt-3 pt-3">
              <div className="flex flex-col items-center gap-y-2 text-xs text-muted-foreground">
                {/* Row 1 */}
                <div className="grid grid-cols-3 w-full gap-x-2 text-center">
                  <button
                    onClick={() => goTo("/privacy")}
                    className="hover:text-foreground transition-colors whitespace-nowrap"
                  >
                    Privacy Policy
                  </button>
                  <button
                    onClick={() => goTo("/terms")}
                    className="hover:text-foreground transition-colors whitespace-nowrap"
                  >
                    Terms of Service
                  </button>
                  <a
                    href="/blog"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-foreground transition-colors whitespace-nowrap"
                  >
                    Public Blog
                  </a>
                </div>
                {/* Row 2 */}
                <div className="grid grid-cols-2 w-full gap-x-2 text-center">
                  <button
                    onClick={() => goTo("/refund-policy")}
                    className="hover:text-foreground transition-colors whitespace-nowrap"
                  >
                    Refund Policy
                  </button>
                  <a
                    href="mailto:support@vidlogicai.com"
                    className="hover:text-foreground transition-colors whitespace-nowrap"
                  >
                    Contact Support
                  </a>
                </div>
              </div>
              <p className="text-center text-[10px] text-muted-foreground/60 mt-2">
                © {new Date().getFullYear()} VidLogic AI
              </p>
            </div>
          </div>
        </DrawerContent>
      </Drawer>

      {/* Upgrade Modal */}
      <PremiumModal open={showModal} onOpenChange={setShowModal} tier={modalTier} />
    </>
  );
}
