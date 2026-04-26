import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Home, History, Mic, User, MoreHorizontal, Code, Crown, Rocket, ArrowUpRight, Zap, Inbox, Settings } from "lucide-react";
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
  { label: "History", icon: History, path: "/history" },
  { label: "Voices", icon: Mic, path: "/brand-voices" },
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
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>More</DrawerTitle>
          </DrawerHeader>
          <div className="px-4 pb-6 space-y-1">
            {/* Profile / Settings */}
            <button
              onClick={() => goTo("/settings")}
              className="flex items-center gap-3 w-full rounded-lg px-3 py-3 text-foreground hover:bg-muted transition-colors"
            >
              <User className="h-5 w-5 text-muted-foreground" />
              <span className="font-medium">Profile & Settings</span>
            </button>

            {/* Content Agent removed */}


            {/* Agent Queue */}
            <button
              onClick={() => goTo("/agent/queue")}
              className="flex items-center gap-3 w-full rounded-lg px-3 py-3 text-foreground hover:bg-muted transition-colors"
            >
              <Inbox className="h-5 w-5 text-primary" />
              <span className="font-medium">Agent Queue</span>
            </button>

            {/* Agent Settings */}
            <button
              onClick={() => goTo("/agent/settings")}
              className="flex items-center gap-3 w-full rounded-lg px-3 py-3 text-foreground hover:bg-muted transition-colors"
            >
              <Settings className="h-5 w-5 text-primary" />
              <span className="font-medium">Agent Settings</span>
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

            {/* Monthly Usage */}
            <div className="px-1 py-2">
              <CreditsRemaining />
            </div>

            {/* Divider */}
            <div className="border-t border-border my-2" />

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
          </div>
        </DrawerContent>
      </Drawer>

      {/* Upgrade Modal */}
      <PremiumModal open={showModal} onOpenChange={setShowModal} tier={modalTier} />
    </>
  );
}
